"""CodeAct agent for dynamic claim verification using LLM-generated Python glue code."""

import json
import os
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback

from .search_tools import CodeSearchTool, NotebookSearchTool, ArtifactSearchTool


class CodeActVerifier:
    """
    CodeAct agent that verifies model card claims by generating Python glue code
    that orchestrates pre-defined search tools.
    """

    def __init__(
        self,
        repo_path: str,
        llm_provider: str = "openai",
        ast_grep_binary: str = "sg",
        model: str = None
    ):
        """
        Initialize CodeAct verifier.
        
        Args:
            repo_path: Path to code repository
            llm_provider: LLM provider (openai, anthropic, openrouter)
            ast_grep_binary: Path to ast-grep binary
            model: Optional model override
        """
        self.repo_path = Path(repo_path)
        self.llm_provider = llm_provider
        
        # Initialize LLM client
        if llm_provider == "openai":
            try:
                from openai import OpenAI
                api_key = os.environ.get("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY not set")
                self.client = OpenAI(api_key=api_key)
                self.model = model or "gpt-4o"  # Use more capable model for code generation
            except ImportError:
                raise ImportError("openai package required for OpenAI provider")
        elif llm_provider == "anthropic":
            try:
                from anthropic import Anthropic
                api_key = os.environ.get("ANTHROPIC_API_KEY")
                if not api_key:
                    raise ValueError("ANTHROPIC_API_KEY not set")
                print(f"[INFO] Initializing Anthropic client for CodeActVerifier...")
                self.client = Anthropic(api_key=api_key)
                # Use Claude Sonnet 4.5 (latest as of Nov 2025)
                self.model = model or "claude-sonnet-4-5"
                print(f"[INFO] Anthropic client initialized successfully (model: {self.model})")
            except ImportError:
                raise ImportError("anthropic package required for Anthropic provider")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Anthropic client: {e}")
                raise
        elif llm_provider == "openrouter":
            try:
                from openai import OpenAI
                api_key = os.environ.get("OPENROUTER_API_KEY")
                if not api_key:
                    raise ValueError("OPENROUTER_API_KEY not set")
                # OpenRouter uses OpenAI-compatible API
                # Add optional app attribution headers (see https://openrouter.ai/docs/quickstart)
                default_headers = {}
                http_referer = os.environ.get("OPENROUTER_HTTP_REFERER")
                x_title = os.environ.get("OPENROUTER_X_TITLE")
                if http_referer:
                    default_headers["HTTP-Referer"] = http_referer
                if x_title:
                    default_headers["X-Title"] = x_title
                
                client_kwargs = {
                    "api_key": api_key,
                    "base_url": "https://openrouter.ai/api/v1"
                }
                if default_headers:
                    client_kwargs["default_headers"] = default_headers
                
                self.client = OpenAI(**client_kwargs)
                self.model = model or "openai/gpt-4o"
            except ImportError:
                raise ImportError("openai package required for OpenRouter provider")
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}")
        
        # Initialize search tools (will be available in exec namespace)
        self.code_search = CodeSearchTool(str(repo_path), ast_grep_binary)
        self.notebook_search = NotebookSearchTool(str(repo_path))
        self.artifact_search = ArtifactSearchTool(str(repo_path))
    
    def _get_max_tokens(self) -> int:
        """Get max_tokens based on model (Haiku: 4096, Sonnet: 16K+)"""
        if self.llm_provider == "anthropic":
            # Claude Haiku has 4096 max output tokens
            # Claude Sonnet 4 (new) has 16384 max output tokens
            if "haiku" in self.model.lower():
                return 4000
            elif "sonnet-4" in self.model.lower() or "claude-sonnet-4" in self.model.lower():
                return 16000  # Use 16K for Sonnet 4
            else:
                return 8000  # Older Sonnet models
        # For OpenAI/OpenRouter, use 8000 as safe default
        return 8000
    
    def _get_batch_size_for_code_generation(self) -> int:
        """Get optimal batch size for code generation based on model's max_tokens."""
        max_tokens = self._get_max_tokens()
        # Estimate ~150 tokens per code snippet on average
        # Use conservative estimate to avoid hitting limits
        if max_tokens >= 16000:
            return 20  # For Sonnet 4 with 16K tokens
        elif max_tokens >= 8000:
            return 10  # For older Sonnet with 8K tokens
        else:
            return 5   # For Haiku with 4K tokens
    
    def _should_skip_response_format(self) -> bool:
        """Check if current model should skip response_format parameter."""
        if self.llm_provider == "openrouter":
            # Models that are known to have issues with response_format
            problematic_models = ["gpt-4o-mini", "gpt-3.5", "claude-haiku"]
            model_lower = self.model.lower()
            return any(problem_model in model_lower for problem_model in problematic_models)
        return False
    
    def _call_openai_api(self, messages: List[Dict[str, Any]], temperature: float = 0.1, 
                         max_tokens: Optional[int] = None, use_json_format: bool = False) -> str:
        """
        Make OpenAI/OpenRouter API call with proper error handling and fallback.
        
        Args:
            messages: List of message dicts
            temperature: Temperature setting
            max_tokens: Optional max tokens
            use_json_format: Whether to request JSON format (with fallback)
            
        Returns:
            Response content string
            
        Raises:
            Exception: If API call fails after all fallbacks
        """
        skip_response_format = self._should_skip_response_format() if use_json_format else False
        
        # Try with response_format if requested and supported
        if use_json_format and not skip_response_format:
            try:
                params = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "response_format": {"type": "json_object"}
                }
                if max_tokens:
                    params["max_tokens"] = max_tokens
                
                response = self.client.chat.completions.create(**params)
                return response.choices[0].message.content or ""
            except Exception as e:
                error_str = str(e).lower()
                # Check if it's a response_format error
                if "response_format" in error_str or "unsupported" in error_str or "invalid" in error_str:
                    print(f"Warning: Model {self.model} doesn't support response_format, retrying without it...")
                    # Fall through to retry without response_format
                else:
                    # Re-raise if it's not a response_format issue
                    raise
        
        # Try without response_format (either skipped or as fallback)
        params = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }
        if max_tokens:
            params["max_tokens"] = max_tokens
        
        try:
            response = self.client.chat.completions.create(**params)
            content = response.choices[0].message.content or ""
            
            # If JSON was requested but not supported, try to extract JSON from response
            if use_json_format and content:
                import re
                # Try to extract JSON from markdown code blocks
                json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', content, re.DOTALL)
                if json_match:
                    content = json_match.group(1).strip()
                else:
                    # Try to find JSON object in text
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(0)
            
            return content
        except Exception as e:
            error_msg = str(e)
            # Provide more detailed error information for OpenRouter
            if self.llm_provider == "openrouter":
                if "401" in error_msg or "unauthorized" in error_msg.lower():
                    raise Exception(f"OpenRouter API authentication failed. Check your OPENROUTER_API_KEY. Error: {error_msg}")
                elif "404" in error_msg or "not found" in error_msg.lower():
                    raise Exception(f"OpenRouter model '{self.model}' not found. Check model name format (should be 'provider/model-name'). Error: {error_msg}")
                elif "429" in error_msg or "rate limit" in error_msg.lower():
                    raise Exception(f"OpenRouter rate limit exceeded. Please wait and try again. Error: {error_msg}")
                elif "insufficient" in error_msg.lower() or "balance" in error_msg.lower():
                    raise Exception(f"OpenRouter account balance insufficient. Please add credits. Error: {error_msg}")
            raise Exception(f"API call failed: {error_msg}")

    def verify_claim(
        self,
        claim: Dict[str, Any],
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Verify a single claim by generating and executing Python glue code.
        
        Args:
            claim: Claim dictionary from LLM extractor
            progress_callback: Optional callback for progress updates
            
        Returns:
            Verification result with evidence
        """
        def log(message: str):
            if progress_callback:
                progress_callback(message)
            else:
                print(message)
        
        claim_id = claim.get("id", "unknown")
        description = claim.get("description", "")
        
        log(f"Verifying claim {claim_id}: {description}")
        
        # Step 1: Generate Python glue code for this claim
        log(f"  Generating verification code...")
        python_code = self._generate_verification_code(claim)
        
        if not python_code:
            log(f"  Failed to generate verification code")
            return {
                "claim_id": claim_id,
                "claim": claim,
                "verified": False,
                "confidence": 0.0,
                "evidence": [],
                "reasoning": "Failed to generate verification code",
                "discrepancies": [],
                "code": None
            }
        
        log(f"  Generated {len(python_code)} chars of Python code")
        
        # Step 2: Execute the generated code
        log(f"  Executing verification code...")
        execution_result = self._execute_verification_code(python_code)
        
        if not execution_result["success"]:
            log(f"  Execution failed: {execution_result.get('error', 'unknown error')}")
            return {
                "claim_id": claim_id,
                "claim": claim,
                "verified": False,
                "confidence": 0.0,
                "evidence": [],
                "reasoning": f"Code execution failed: {execution_result.get('error', 'unknown')}",
                "discrepancies": [],
                "code": python_code
            }
        
        evidence = execution_result.get("result", {})
        log(f"  Execution successful, analyzing results...")
        
        # Step 3: Use LLM to evaluate execution results
        evaluation = self._evaluate_execution_result(claim, evidence, python_code)
        
        return {
            "claim_id": claim_id,
            "claim": claim,
            "verified": evaluation.get("verified", False),
            "confidence": evaluation.get("confidence", 0.0),
            "evidence": evidence,
            "reasoning": evaluation.get("reasoning", ""),
            "discrepancies": evaluation.get("discrepancies", []),
            "code": python_code
        }

    def _generate_verification_code(self, claim: Dict[str, Any]) -> Optional[str]:
        """
        Generate Python glue code to verify a claim.
        
        Returns:
            Python code string that uses search tools
        """
        system_prompt = """You are an expert Python code generator. Generate Python code to verify claims from model cards against codebases.

You have access to these pre-defined tools:
- code_search.text_search(query, file_pattern="*.py", context_lines=3, case_sensitive=False)
- code_search.import_search(module_or_class)
- code_search.function_search(function_name)
- code_search.semantic_search(description, top_k=5)
- notebook_search.search_outputs(query, case_sensitive=False)
- notebook_search.search_code_cells(query, case_sensitive=False)
- artifact_search.find_artifacts(pattern)
- artifact_search.check_artifact_usage(artifact_name)

Generate Python glue code that:
1. Uses these tools to search for evidence
2. Has conditional logic (if/else) based on findings
3. Chains multiple tool calls together when needed
4. Stores results in a 'result' dictionary
5. Is safe to execute (no file writes, no imports, no network calls)

The result dictionary should include:
- found: bool (whether evidence was found)
- evidence_count: int
- evidence_details: list of dicts with findings
- summary: str (brief summary of findings)

Output ONLY the Python code, no explanations:"""

        claim_text = json.dumps(claim, indent=2)
        user_prompt = f"""Generate Python verification code for this claim:

{claim_text}

Remember:
- Use the available tools (code_search, notebook_search, artifact_search)
- Store results in 'result' dictionary
- Include conditional logic
- No imports, no file writes, no dangerous operations
- Be specific to what the claim states"""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                code = self._call_openai_api(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2
                )
            else:  # anthropic
                print(f"[DEBUG] Making Anthropic code generation API call (model: {self.model})...")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=self._get_max_tokens(),
                    temperature=0.2,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print(f"[DEBUG] Anthropic code generation successful. Response ID: {response.id}")
                code = response.content[0].text
                print(f"[DEBUG] Generated code length: {len(code)} chars")
            
            # Clean up code (remove markdown formatting if present)
            code = code.strip()
            if code.startswith("```python"):
                code = code[9:]
            if code.startswith("```"):
                code = code[3:]
            if code.endswith("```"):
                code = code[:-3]
            code = code.strip()
            
            return code
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error generating verification code: {error_msg}")
            # Log more details for OpenRouter errors
            if self.llm_provider == "openrouter":
                print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return None

    def _execute_verification_code(self, python_code: str) -> Dict[str, Any]:
        """
        Execute the generated Python glue code in a safe namespace.
        
        Returns:
            Execution result with success status and result/error
        """
        # Create safe builtins - allow common safe functions but restrict dangerous ones
        import builtins
        safe_builtins = {
            # Type conversions
            'str': str, 'int': int, 'float': float, 'bool': bool,
            'list': list, 'dict': dict, 'set': set, 'tuple': tuple,
            # Type checking
            'isinstance': isinstance, 'issubclass': issubclass,
            'type': type, 'hasattr': hasattr, 'getattr': getattr,
            # Iteration and sequences
            'len': len, 'range': range, 'enumerate': enumerate,
            'zip': zip, 'map': map, 'filter': filter,
            'any': any, 'all': all, 'sum': sum, 'min': min, 'max': max,
            'sorted': sorted, 'reversed': reversed,
            # String operations
            'ord': ord, 'chr': chr, 'repr': repr, 'format': format,
            # Other safe functions
            'abs': abs, 'round': round, 'pow': pow,
            'print': print,  # Allow print for debugging
            # Exceptions (needed for try/except)
            'Exception': Exception, 'ValueError': ValueError,
            'KeyError': KeyError, 'TypeError': TypeError,
            'AttributeError': AttributeError, 'IndexError': IndexError,
            # Constants
            'True': True, 'False': False, 'None': None,
        }
        
        try:
            # Build a single sandbox dict used for both globals and locals so that:
            # - Builtins are reliably available inside all scopes (including functions,
            #   comprehensions, lambdas, etc.)
            # - Tools are directly accessible as global names
            sandbox: Dict[str, Any] = {
                "__builtins__": safe_builtins,
                "code_search": self.code_search,
                "notebook_search": self.notebook_search,
                "artifact_search": self.artifact_search,
                "result": None,  # Will be set by the generated code
            }
            
            # Execute the generated code in the sandboxed environment
            exec(python_code, sandbox, sandbox)
            
            # Extract result populated by the code
            result = sandbox.get("result")
            
            return {
                "success": True,
                "result": result
            }
            
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            traceback_str = traceback.format_exc()
            
            return {
                "success": False,
                "error": error_msg,
                "traceback": traceback_str
            }

    def _evaluate_execution_result(
        self,
        claim: Dict[str, Any],
        evidence: Dict[str, Any],
        code: str
    ) -> Dict[str, Any]:
        """
        Use LLM to evaluate execution results and determine if claim is verified.
        
        Returns:
            Evaluation with verified status, confidence, reasoning, discrepancies
        """
        system_prompt = """You are an expert code analyst. Given a claim from a model card and execution results from verification code, determine if the claim is verified.

Analyze:
- Does the evidence support the claim?
- Is the evidence strong enough?
- Are there discrepancies?
- What's the confidence level?

Output ONLY valid JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "discrepancies": ["list of issues found"]
}"""

        claim_text = json.dumps(claim, indent=2)
        evidence_text = json.dumps(evidence, indent=2)
        
        user_prompt = f"""Evaluate if this claim is verified:

CLAIM:
{claim_text}

VERIFICATION CODE EXECUTED:
{code[:500]}...

EXECUTION RESULTS:
{evidence_text}

Is the claim verified by the evidence?"""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                result_text = self._call_openai_api(
                    messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=self._get_max_tokens(),
                use_json_format=True
            )
            else:  # anthropic
                print(f"[DEBUG] Making Anthropic verification API call (model: {self.model})...")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=self._get_max_tokens(),
                    temperature=0.1,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print(f"[DEBUG] Anthropic verification successful. Response ID: {response.id}")
                result_text = response.content[0].text
                print(f"[DEBUG] Verification result length: {len(result_text)} chars")
            
            # Parse JSON response
            result = json.loads(result_text)
            return result
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error evaluating execution result: {error_msg}")
            # Log more details for OpenRouter errors
            if self.llm_provider == "openrouter":
                print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Fallback: simple heuristic
            found = evidence.get("found", False) if isinstance(evidence, dict) else bool(evidence)
            return {
                "verified": found,
                "confidence": 0.5 if found else 0.1,
                "reasoning": f"Basic evaluation: evidence {'found' if found else 'not found'}",
                "discrepancies": []
            }

    def _generate_verification_code_batch(self, claims: List[Dict[str, Any]]) -> List[str]:
        """
        Generate Python verification code for ALL claims in a SINGLE LLM call.
        
        This dramatically reduces API calls from N to 1 for code generation.
        
        Args:
            claims: List of all claims to generate code for
            
        Returns:
            List of Python code strings (one per claim, in same order)
        """
        system_prompt = """You are an expert Python code generator. Generate Python verification code for MULTIPLE claims at once.

You have access to these pre-defined tools:
- code_search.text_search(query, file_pattern="*.py", context_lines=3, case_sensitive=False)
- code_search.import_search(module_or_class)
- code_search.function_search(function_name)
- code_search.semantic_search(description, top_k=5)
- notebook_search.search_outputs(query, case_sensitive=False)
- notebook_search.search_code_cells(query, case_sensitive=False)
- artifact_search.find_artifacts(pattern)
- artifact_search.check_artifact_usage(artifact_name)

For EACH claim, generate Python code that:
1. Uses these tools to search for evidence
2. Has conditional logic (if/else) based on findings
3. Chains multiple tool calls together when needed
4. Stores results in a 'result' dictionary
5. Is safe to execute (no file writes, no imports, no network calls)

The result dictionary should include:
- found: bool (whether evidence was found)
- evidence_count: int
- evidence_details: list of dicts with findings
- summary: str (brief summary of findings)

Output ONLY a JSON array of code strings, one for each claim, in the SAME ORDER.
Format: ["code1", "code2", "code3", ...]

Each code string should be a complete Python snippet that can be executed independently."""

        # Format all claims with IDs for reference
        claims_text = json.dumps([
            {
                "id": claim.get("id"),
                "category": claim.get("category"),
                "subcategory": claim.get("subcategory"),
                "description": claim.get("description"),
                "expected_evidence": claim.get("expected_evidence", [])
            }
            for claim in claims
        ], indent=2)
        
        user_prompt = f"""Generate Python verification code for these {len(claims)} claims:

{claims_text}

Output a JSON array with {len(claims)} code strings (one per claim, in order):
["code_for_claim_1", "code_for_claim_2", ...]

Remember:
- Use the available tools (code_search, notebook_search, artifact_search)
- Store results in 'result' dictionary
- Include conditional logic
- No imports, no file writes, no dangerous operations
- Be specific to what each claim states"""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                response_text = self._call_openai_api(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=self._get_max_tokens(),
                    use_json_format=True
                )
            else:  # anthropic
                print(f"[DEBUG] Making BATCH Anthropic code generation API call for {len(claims)} claims (model: {self.model})...")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=self._get_max_tokens(),
                    temperature=0.2,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print(f"[DEBUG] BATCH Anthropic code generation successful. Response ID: {response.id}")
                response_text = response.content[0].text
                print(f"[DEBUG] Generated batch code length: {len(response_text)} chars for {len(claims)} claims")
                print(f"[DEBUG] Response text (first 500 chars): {response_text[:500]}")
                print(f"[DEBUG] Response text (last 200 chars): {response_text[-200:]}")
            
            # Parse JSON array of code strings
            # Strip markdown code blocks if present
            response_text_cleaned = response_text.strip()
            if response_text_cleaned.startswith("```json"):
                response_text_cleaned = response_text_cleaned[7:]
            elif response_text_cleaned.startswith("```"):
                response_text_cleaned = response_text_cleaned[3:]
            if response_text_cleaned.endswith("```"):
                response_text_cleaned = response_text_cleaned[:-3]
            response_text_cleaned = response_text_cleaned.strip()
            
            code_array = json.loads(response_text_cleaned)
            
            # Clean up each code string
            cleaned_codes = []
            for code in code_array:
                code = code.strip()
                if code.startswith("```python"):
                    code = code[9:]
                if code.startswith("```"):
                    code = code[3:]
                if code.endswith("```"):
                    code = code[:-3]
                cleaned_codes.append(code.strip())
            
            # Ensure we have the right number of codes
            if len(cleaned_codes) != len(claims):
                print(f"[WARNING] Expected {len(claims)} codes but got {len(cleaned_codes)}. Padding with empty codes.")
                while len(cleaned_codes) < len(claims):
                    cleaned_codes.append("result = {'found': False, 'evidence_count': 0, 'evidence_details': [], 'summary': 'Code generation failed'}")
            
            return cleaned_codes
            
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Batch code generation failed: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Fallback: return empty codes for all claims
            return ["result = {'found': False, 'evidence_count': 0, 'evidence_details': [], 'summary': 'Code generation failed'}" for _ in claims]

    def _evaluate_execution_results_batch(
        self,
        claims: List[Dict[str, Any]],
        evidences: List[Dict[str, Any]],
        codes: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Evaluate ALL execution results in a SINGLE LLM call.
        
        This dramatically reduces API calls from N to 1 for evaluation.
        
        Args:
            claims: List of all claims
            evidences: List of execution results (one per claim)
            codes: List of generated codes (one per claim)
            
        Returns:
            List of evaluation results (one per claim, in same order)
        """
        system_prompt = """You are an expert code analyst. Given MULTIPLE claims and their verification results, evaluate ALL of them at once.

For EACH claim-evidence pair, determine:
- Does the evidence support the claim?
- Is the evidence strong enough?
- Are there discrepancies?
- What's the confidence level?

Output ONLY a JSON array with one evaluation per claim, in the SAME ORDER:
[
  {
    "verified": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "discrepancies": ["list of issues found"]
  },
  ...
]"""

        # Combine all claims, codes, and evidences
        combined = []
        for i, (claim, evidence, code) in enumerate(zip(claims, evidences, codes)):
            combined.append({
                "index": i,
                "claim_id": claim.get("id"),
                "claim": {
                    "category": claim.get("category"),
                    "description": claim.get("description")
                },
                "code_snippet": code[:300] + "..." if len(code) > 300 else code,
                "evidence": evidence
            })
        
        combined_text = json.dumps(combined, indent=2)
        
        user_prompt = f"""Evaluate these {len(claims)} claim verification results:

{combined_text}

Output a JSON array with {len(claims)} evaluation objects (one per claim, in order):
[
  {{"verified": bool, "confidence": float, "reasoning": str, "discrepancies": []}},
  ...
]"""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                result_text = self._call_openai_api(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=self._get_max_tokens(),
                    use_json_format=True
                )
            else:  # anthropic
                print(f"[DEBUG] Making BATCH Anthropic evaluation API call for {len(claims)} claims (model: {self.model})...")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=self._get_max_tokens(),
                    temperature=0.1,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print(f"[DEBUG] BATCH Anthropic evaluation successful. Response ID: {response.id}")
                result_text = response.content[0].text
                print(f"[DEBUG] Batch evaluation result length: {len(result_text)} chars")
            
            # Parse JSON array of evaluations
            evaluations = json.loads(result_text)
            
            # Ensure we have the right number of evaluations
            if len(evaluations) != len(claims):
                print(f"[WARNING] Expected {len(claims)} evaluations but got {len(evaluations)}. Padding with defaults.")
                while len(evaluations) < len(claims):
                    evaluations.append({
                        "verified": False,
                        "confidence": 0.1,
                        "reasoning": "Evaluation failed",
                        "discrepancies": []
                    })
            
            return evaluations
            
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Batch evaluation failed: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Fallback: basic heuristic evaluation for all
            evaluations = []
            for evidence in evidences:
                found = evidence.get("found", False) if isinstance(evidence, dict) else bool(evidence)
                evaluations.append({
                    "verified": found,
                    "confidence": 0.5 if found else 0.1,
                    "reasoning": f"Basic evaluation: evidence {'found' if found else 'not found'}",
                    "discrepancies": []
                })
            return evaluations

    def verify_claims_batch_optimized(
        self,
        claims: List[Dict[str, Any]],
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Verify multiple claims using CHUNKED BATCH CODE GENERATION (OPTIMIZED).
        
        Splits large batches into smaller chunks to avoid token limits:
        - For each chunk: Generate codes (1 LLM call), Execute (0 LLM), Evaluate (1 LLM call)
        - Batch size is automatically determined based on model's max_tokens
        - For 244 claims with batch_size=20: Uses 12 batches = 24 LLM calls (vs 489 for individual)
        
        This is still 95% faster and cheaper than individual verification!
        
        Args:
            claims: List of claims to verify
            progress_callback: Optional callback(message, current, total)
            
        Returns:
            List of verification results
        """
        total = len(claims)
        batch_size = self._get_batch_size_for_code_generation()
        num_batches = (total + batch_size - 1) // batch_size  # Ceiling division
        
        if progress_callback:
            progress_callback(f"🚀 Starting OPTIMIZED batch verification of {total} claims in {num_batches} batches (batch_size={batch_size})...", 0, total)
        
        # Step 1: Generate codes in CHUNKS to avoid token limits
        all_codes = []
        for batch_idx in range(num_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, total)
            batch_claims = claims[start_idx:end_idx]
            
            if progress_callback:
                progress_callback(f"📝 Generating code for batch {batch_idx + 1}/{num_batches} ({len(batch_claims)} claims)...", start_idx, total)
            
            batch_codes = self._generate_verification_code_batch(batch_claims)
            all_codes.extend(batch_codes)
        
        codes = all_codes
        
        if progress_callback:
            progress_callback(f"✅ Generated {len(codes)} code snippets across {num_batches} batches", 0, total)
        
        # Step 2: Execute all codes (NO LLM calls)
        if progress_callback:
            progress_callback(f"⚙️ Executing {total} verification codes...", 0, total)
        
        evidences = []
        for idx, (claim, code) in enumerate(zip(claims, codes), 1):
            execution_result = self._execute_verification_code(code)
            evidences.append(execution_result.get("result", {}))
            
            if progress_callback and idx % 5 == 0:
                progress_callback(f"⚙️ Executed {idx}/{total} codes...", idx, total)
        
        # Step 3: Evaluate results in CHUNKS to avoid token limits
        all_evaluations = []
        for batch_idx in range(num_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, total)
            batch_claims = claims[start_idx:end_idx]
            batch_evidences = evidences[start_idx:end_idx]
            batch_codes = codes[start_idx:end_idx]
            
            if progress_callback:
                progress_callback(f"🔍 Evaluating batch {batch_idx + 1}/{num_batches} ({len(batch_claims)} results)...", end_idx, total)
            
            batch_evaluations = self._evaluate_execution_results_batch(batch_claims, batch_evidences, batch_codes)
            all_evaluations.extend(batch_evaluations)
        
        evaluations = all_evaluations
        
        # Step 4: Combine into final results
        results = []
        for claim, evidence, evaluation, code in zip(claims, evidences, evaluations, codes):
            results.append({
                "claim_id": claim.get("id", "unknown"),
                "claim": claim,
                "verified": evaluation.get("verified", False),
                "confidence": evaluation.get("confidence", 0.0),
                "evidence": evidence,
                "reasoning": evaluation.get("reasoning", ""),
                "discrepancies": evaluation.get("discrepancies", []),
                "code": code
            })
        
        if progress_callback:
            verified_count = sum(1 for r in results if r["verified"])
            progress_callback(
                f"✅ Completed! {verified_count}/{total} claims verified (3 API calls total)",
                total,
                total
            )
        
        return results

    def verify_claims_batch(
        self,
        claims: List[Dict[str, Any]],
        max_workers: int = 1,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Verify multiple claims sequentially (no parallel execution).
        
        Args:
            claims: List of claims to verify
            max_workers: Ignored; kept for API compatibility
            progress_callback: Optional callback(message, current, total)
            
        Returns:
            List of verification results
        """
        results = []
        total = len(claims)
        completed = 0
        
        if progress_callback:
            progress_callback(f"Starting sequential verification of {total} claims...", 0, total)
        
        for idx, claim in enumerate(claims, 1):
            try:
                result = self._verify_claim_wrapper(claim, idx, total, progress_callback)
                results.append(result)
                completed += 1
                if progress_callback:
                    progress_callback(
                        f"Completed {completed}/{total}: {claim.get('description', 'unknown')[:60]}...",
                        completed,
                        total
                    )
            except Exception as e:
                print(f"Error verifying claim {claim.get('id', 'unknown')}: {e}")
                results.append({
                    "claim_id": claim.get("id", "unknown"),
                    "claim": claim,
                    "verified": False,
                    "confidence": 0.0,
                    "evidence": {},
                    "reasoning": f"Verification failed: {str(e)}",
                    "discrepancies": [],
                    "code": None
                })
                completed += 1
        
        return results

    def _verify_claim_wrapper(
        self,
        claim: Dict[str, Any],
        idx: int,
        total: int,
        progress_callback: Optional[Callable[[str, int, int], None]]
    ) -> Dict[str, Any]:
        """
        Wrapper for verify_claim to work with ThreadPoolExecutor.
        """
        def claim_progress(msg: str):
            if progress_callback:
                progress_callback(f"[{idx}/{total}] {msg}", idx, total)
        
        return self.verify_claim(claim, progress_callback=claim_progress)

    def generate_risk_assessment_table(
        self,
        claims: List[Dict[str, Any]],
        verification_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate a risk assessment table comparing claims vs verification results.
        
        Args:
            claims: Original claims from model card
            verification_results: Results from verification
            
        Returns:
            Risk assessment table with detailed comparison
        """
        system_prompt = """You are an expert ML auditor. Generate a risk assessment table comparing model card claims against code verification results.

For each claim, assess:
- Match Status: VERIFIED, PARTIAL, NOT_VERIFIED, FAILED
- Risk Level: LOW, MEDIUM, HIGH, CRITICAL
- Impact: What's the impact if this claim is wrong?
- Recommendation: What action should be taken?

Output JSON with this structure:
{
  "overall_risk": "LOW/MEDIUM/HIGH/CRITICAL",
  "summary": "brief overall summary",
  "assessments": [
    {
      "claim_id": "claim_1",
      "claim_description": "...",
      "match_status": "VERIFIED",
      "risk_level": "LOW",
      "confidence": 0.95,
      "evidence_summary": "...",
      "discrepancies": [],
      "impact": "...",
      "recommendation": "..."
    }
  ]
}"""

        # Combine claims and results for context
        combined = []
        for claim, result in zip(claims, verification_results):
            combined.append({
                "claim": claim,
                "verification": {
                    "verified": result.get("verified"),
                    "confidence": result.get("confidence"),
                    "reasoning": result.get("reasoning"),
                    "discrepancies": result.get("discrepancies", [])
                }
            })
        
        combined_text = json.dumps(combined, indent=2)
        
        user_prompt = f"""Generate risk assessment table for these verification results:

{combined_text}

Assess risk and provide actionable recommendations."""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                result_text = self._call_openai_api(
                    messages=[
                        {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=self._get_max_tokens(),
                use_json_format=True
            )
            else:  # anthropic
                print(f"[DEBUG] Making Anthropic verification API call (model: {self.model})...")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=self._get_max_tokens(),
                    temperature=0.1,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                print(f"[DEBUG] Anthropic verification successful. Response ID: {response.id}")
                result_text = response.content[0].text
                print(f"[DEBUG] Verification result length: {len(result_text)} chars")
            
            return json.loads(result_text)
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error generating risk assessment: {error_msg}")
            # Log more details for OpenRouter errors
            if self.llm_provider == "openrouter":
                print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Fallback: basic assessment
            verified_count = sum(1 for r in verification_results if r.get("verified", False))
            total_count = len(verification_results)
            
            return {
                "overall_risk": "HIGH" if verified_count < total_count * 0.5 else "MEDIUM" if verified_count < total_count * 0.8 else "LOW",
                "summary": f"{verified_count}/{total_count} claims verified",
                "assessments": [
                    {
                        "claim_id": r.get("claim_id"),
                        "claim_description": r.get("claim", {}).get("description", ""),
                        "match_status": "VERIFIED" if r.get("verified") else "NOT_VERIFIED",
                        "risk_level": "LOW" if r.get("verified") else "HIGH",
                        "confidence": r.get("confidence", 0.0),
                        "evidence_summary": r.get("reasoning", ""),
                        "discrepancies": r.get("discrepancies", []),
                        "impact": "Unknown",
                        "recommendation": "Review manually"
                    }
                    for r in verification_results
                ]
            }
