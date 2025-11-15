"""LLM-based tool for extracting metrics from notebook outputs."""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import nbformat
except ImportError:
    nbformat = None


class LLMExtractorTool:
    """Tool that uses LLM to extract metrics from notebook outputs intelligently."""

    def __init__(self, workdir: Optional[str] = None, llm_provider: str = "openai", model: str = None):
        """
        Initialize LLM extractor tool.
        
        Args:
            workdir: Working directory
            llm_provider: LLM provider to use (openai, anthropic, openrouter)
            model: Optional model override
        """
        self.workdir = Path(workdir) if workdir else Path.cwd()
        self.llm_provider = llm_provider
        self.model_override = model
        self._init_llm()

    def _init_llm(self):
        """Initialize LLM client based on provider."""
        if self.llm_provider == "openai":
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                self.model = self.model_override or "gpt-4o-mini"  # Fast and cheap for extraction
            except ImportError:
                self.client = None
                print("Warning: OpenAI not available. Install with: pip install openai")
        
        elif self.llm_provider == "anthropic":
            try:
                from anthropic import Anthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if not api_key:
                    self.client = None
                    print("[ERROR] ANTHROPIC_API_KEY environment variable not set!")
                else:
                    self.client = Anthropic(api_key=api_key)
                    self.model = self.model_override or "claude-3-haiku-20240307"  # Fast and cheap
                    print(f"[INFO] Anthropic client initialized successfully (model: {self.model})")
            except ImportError:
                self.client = None
                print("[ERROR] Anthropic not available. Install with: pip install anthropic")
            except Exception as e:
                self.client = None
                print(f"[ERROR] Failed to initialize Anthropic client: {e}")
        
        elif self.llm_provider == "openrouter":
            try:
                from openai import OpenAI
                api_key = os.getenv("OPENROUTER_API_KEY")
                if not api_key:
                    self.client = None
                    print("Warning: OPENROUTER_API_KEY not set")
                else:
                    # Add optional app attribution headers (see https://openrouter.ai/docs/quickstart)
                    default_headers = {}
                    http_referer = os.getenv("OPENROUTER_HTTP_REFERER")
                    x_title = os.getenv("OPENROUTER_X_TITLE")
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
                    self.model = self.model_override or "openai/gpt-4o-mini"
            except ImportError:
                self.client = None
                print("Warning: OpenAI package not available. Install with: pip install openai")
        
        else:
            self.client = None
            print(f"Warning: Unknown LLM provider: {self.llm_provider}")
    
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

    def extract_metrics_from_notebooks(
        self, 
        notebook_paths: List[str],
        claimed_metrics: Dict[str, Any],
        max_workers: int = 1
    ) -> Dict[str, Any]:
        """
        Extract metrics from notebook outputs using LLM with parallel processing.
        
        Args:
            notebook_paths: List of notebook file paths
            claimed_metrics: Metrics claimed in model card (for context)
            max_workers: Maximum number of parallel workers (default: 5)
            
        Returns:
            Dictionary of extracted metrics with metadata
        """
        if not self.client:
            return {"error": "LLM client not initialized"}
        
        all_metrics = {}
        
        def process_notebook(nb_path: str) -> tuple[str, Dict[str, Any]]:
            """Process a single notebook and return its metrics."""
            try:
                # Read notebook outputs
                outputs_text = self._read_notebook_outputs(nb_path)
                
                if not outputs_text:
                    return nb_path, {}
                
                # Use LLM to extract metrics
                extracted = self._llm_extract_metrics(
                    outputs_text=outputs_text,
                    claimed_metrics=claimed_metrics,
                    notebook_name=Path(nb_path).name
                )
                
                return nb_path, extracted
                    
            except Exception as e:
                print(f"Error extracting from {nb_path}: {e}")
                return nb_path, {}
        
        # Process notebooks sequentially
        print(f"Processing {len(notebook_paths)} notebooks sequentially...")
            completed = 0
        total = len(notebook_paths)
        for nb_path in notebook_paths:
                completed += 1
                try:
                nb_path, extracted = process_notebook(nb_path)
                    for metric, value in extracted.items():
                    if metric.startswith("_"):
                            continue
                        all_metrics[metric] = value
                        all_metrics[f"_{metric}_file"] = Path(nb_path).name
                print(f"  [{completed}/{total}] Processed {Path(nb_path).name}")
                except Exception as e:
                print(f"  [{completed}/{total}] Failed {Path(nb_path).name}: {e}")
        
        print(f"Completed sequential processing of {len(notebook_paths)} notebooks")
        return all_metrics

    def _read_notebook_outputs(self, notebook_path: str) -> str:
        """
        Read all output cells from a notebook.
        
        Args:
            notebook_path: Path to notebook file
            
        Returns:
            Combined text of all outputs
        """
        if nbformat is None:
            raise ImportError("nbformat is required")
        
        nb_path_obj = Path(notebook_path)
        if not nb_path_obj.exists():
            return ""
        
        nb = nbformat.read(str(nb_path_obj), as_version=4)
        
        # Early cap combined outputs to avoid building huge strings
        max_chars = 8000
        total_len = 0
        chunks: List[str] = []
        
        for cell_idx, cell in enumerate(nb.cells):
            if total_len >= max_chars:
                break
            if cell.cell_type != "code" or not cell.outputs:
                continue
            
            cell_chunks: List[str] = []
            for output in cell.outputs:
                if total_len >= max_chars:
                    break
                # Stream output (print statements)
                if output.output_type == "stream":
                    text = output.text if isinstance(output.text, str) else "".join(output.text)
                    if text:
                        remaining = max_chars - total_len
                        snippet = text[:remaining]
                        cell_chunks.append(snippet)
                        total_len += len(snippet)
                
                # Execute result (returned values)
                elif output.output_type == "execute_result":
                    data = output.get("data", {})
                    if "text/plain" in data and total_len < max_chars:
                        text = data["text/plain"]
                        remaining = max_chars - total_len
                        snippet = text[:remaining]
                        cell_chunks.append(snippet)
                        total_len += len(snippet)
                    if "text/html" in data and total_len < max_chars:
                        # Include small teaser for HTML
                        html_snip = f"[HTML Output]: {data['text/html'][:200]}"
                        remaining = max_chars - total_len
                        snippet = html_snip[:remaining]
                        cell_chunks.append(snippet)
                        total_len += len(snippet)
                
                # Display data
                elif output.output_type == "display_data":
                    data = output.get("data", {})
                    if "text/plain" in data and total_len < max_chars:
                        text = data["text/plain"]
                        remaining = max_chars - total_len
                        snippet = text[:remaining]
                        cell_chunks.append(snippet)
                        total_len += len(snippet)
            
            if cell_chunks and total_len < max_chars:
                header = f"--- Cell {cell_idx} Output ---\n"
                remaining = max_chars - total_len
                header_snip = header[:remaining]
                chunks.append(header_snip)
                total_len += len(header_snip)
                body = "\n".join(cell_chunks)
                remaining = max_chars - total_len
                body_snip = body[:remaining]
                chunks.append(body_snip)
                total_len += len(body_snip)
        
        return "\n\n".join(chunks)

    def _llm_extract_metrics(
        self,
        outputs_text: str,
        claimed_metrics: Dict[str, Any],
        notebook_name: str
    ) -> Dict[str, Any]:
        """
        Use LLM to extract metrics from notebook outputs.
        
        Args:
            outputs_text: Combined output text from notebook
            claimed_metrics: Metrics claimed in model card
            notebook_name: Name of the notebook
            
        Returns:
            Extracted metrics dictionary
        """
        # Build prompt
        prompt = self._build_extraction_prompt(outputs_text, claimed_metrics, notebook_name)
        
        # Call LLM
        if self.llm_provider in ["openai", "openrouter"]:
            return self._extract_with_openai(prompt)
        elif self.llm_provider == "anthropic":
            return self._extract_with_anthropic(prompt)
        else:
            return {}

    def _build_extraction_prompt(
        self,
        outputs_text: str,
        claimed_metrics: Dict[str, Any],
        notebook_name: str
    ) -> str:
        """Build prompt for metric extraction."""
        
        # Format claimed metrics for context
        claimed_str = json.dumps(claimed_metrics, indent=2) if claimed_metrics else "None"
        
        # Truncate outputs if too long
        max_length = 8000
        if len(outputs_text) > max_length:
            outputs_text = outputs_text[:max_length] + "\n... [truncated]"
        
        prompt = f"""You are analyzing output cells from a Jupyter notebook to extract machine learning metrics.

**Notebook:** {notebook_name}

**Claimed Metrics (from model card):**
```json
{claimed_str}
```

**Notebook Output Cells:**
```
{outputs_text}
```

**Task:**
Extract all machine learning metrics and performance indicators from the notebook outputs.

**Look for:**
- Model performance metrics (AUC, ROC-AUC, accuracy, precision, recall, F1, etc.)
- Statistical measures (KS statistic, Gini coefficient, R², RMSE, MAE, etc.)
- Dataset information (training set size, test set size, split ratios, etc.)
- Any other quantitative metrics related to model performance

**Output Format:**
Return ONLY a valid JSON object with extracted metrics. Use lowercase keys with underscores.

Example:
```json
{{
  "auc": 0.8542,
  "ks_statistic": 0.45,
  "gini": 0.7084,
  "accuracy": 0.89,
  "train_size": 150000,
  "test_size": 50000,
  "precision": 0.87,
  "recall": 0.82
}}
```

If a metric appears multiple times, use the most recent or final value.
If no metrics are found, return an empty object: {{}}.

Extract the metrics now:"""

        return prompt

    def _extract_with_openai(self, prompt: str) -> Dict[str, Any]:
        """Extract metrics using OpenAI/OpenRouter."""
        try:
            content = self._call_openai_api(
                messages=[
                    {"role": "system", "content": "You are a precise metric extraction assistant. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500,
                use_json_format=True
            )
            
            # Parse JSON
            metrics = json.loads(content)
            return metrics
            
        except Exception as e:
            error_msg = str(e)
            print(f"OpenAI/OpenRouter extraction error: {error_msg}")
            # Log more details for OpenRouter errors
            if self.llm_provider == "openrouter":
                print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return {}

    def _extract_with_anthropic(self, prompt: str) -> Dict[str, Any]:
        """Extract metrics using Anthropic."""
        if not self.client:
            print("[ERROR] Anthropic client not initialized!")
            return {}
        
        try:
            print(f"[DEBUG] Making Anthropic API call (model: {self.model})...")
            # Request preview logging (env: CLAIM_EXTRACT_LOG_REQUEST or LOG_REQUEST = off|truncated|full)
            import os as _os
            log_mode = (_os.environ.get("CLAIM_EXTRACT_LOG_REQUEST") or _os.environ.get("LOG_REQUEST") or "truncated").lower()
            if log_mode in ("truncated", "full"):
                def _trim(text: str) -> str:
                    return text if log_mode == "full" else (text[:500] + ("..." if len(text) > 500 else ""))
                req_preview = {
                    "provider": self.llm_provider,
                    "model": self.model,
                    "temperature": 0.1,
                    "max_tokens": 8000,
                    "messages": [{"role": "user", "content": _trim(prompt)}]
                }
                print(f"[DEBUG] Anthropic request preview: {req_preview}")
            response = self.client.messages.create(
                model=self.model,
                max_tokens=8000,
                temperature=0.1,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            print(f"[DEBUG] Anthropic API call successful. Response ID: {response.id}")
            content = response.content[0].text
            print(f"[DEBUG] Response length: {len(content)} chars")
            
            # Extract JSON from response
            # Anthropic might wrap it in markdown
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                content = content[start:end].strip()
            
            # Parse JSON
            metrics = json.loads(content)
            print(f"[DEBUG] Successfully parsed JSON response with {len(metrics)} keys")
            return metrics
            
        except Exception as e:
            print(f"[ERROR] Anthropic extraction error: {type(e).__name__}: {e}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return {}

    def search_in_outputs(
        self,
        notebook_paths: List[str],
        search_query: str
    ) -> List[Dict[str, Any]]:
        """
        Full-text search in notebook outputs using LLM for context-aware results.
        
        Args:
            notebook_paths: List of notebook file paths
            search_query: Natural language search query
            
        Returns:
            List of relevant findings with context
        """
        if not self.client:
            return [{"error": "LLM client not initialized"}]
        
        results = []
        
        for nb_path in notebook_paths:
            try:
                outputs_text = self._read_notebook_outputs(nb_path)
                
                if not outputs_text:
                    continue
                
                # Use LLM for semantic search
                findings = self._llm_search(
                    outputs_text=outputs_text,
                    query=search_query,
                    notebook_name=Path(nb_path).name
                )
                
                if findings:
                    results.extend(findings)
                    
            except Exception as e:
                print(f"Error searching {nb_path}: {e}")
                continue
        
        return results

    def _llm_search(
        self,
        outputs_text: str,
        query: str,
        notebook_name: str
    ) -> List[Dict[str, Any]]:
        """Use LLM for semantic search in outputs."""
        
        # Truncate if too long
        max_length = 8000
        if len(outputs_text) > max_length:
            outputs_text = outputs_text[:max_length] + "\n... [truncated]"
        
        prompt = f"""You are searching through Jupyter notebook outputs for specific information.

**Notebook:** {notebook_name}

**Search Query:** {query}

**Notebook Outputs:**
```
{outputs_text}
```

**Task:**
Find all relevant information related to the search query. Return findings as JSON.

**Output Format:**
```json
[
  {{
    "cell": "Cell 5",
    "finding": "Description of what was found",
    "relevance": "high|medium|low",
    "quote": "Direct quote from output"
  }}
]
```

If nothing relevant is found, return an empty array: []

Search now:"""

        try:
            if self.llm_provider in ["openai", "openrouter"]:
                content = self._call_openai_api(
                    messages=[
                    {"role": "system", "content": "You are a search assistant. Return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500,
                use_json_format=True
            )
                result = json.loads(content)
                
                # Handle if wrapped in object
                if isinstance(result, dict) and "results" in result:
                    return result["results"]
                elif isinstance(result, list):
                    return result
                else:
                    return []
                    
            elif self.llm_provider == "anthropic":
                print(f"[DEBUG] Making Anthropic search API call (model: {self.model})...")
                # Request preview logging (env: CLAIM_EXTRACT_LOG_REQUEST or LOG_REQUEST = off|truncated|full)
                import os as _os
                log_mode = (_os.environ.get("CLAIM_EXTRACT_LOG_REQUEST") or _os.environ.get("LOG_REQUEST") or "truncated").lower()
                if log_mode in ("truncated", "full"):
                    def _trim(text: str) -> str:
                        return text if log_mode == "full" else (text[:500] + ("..." if len(text) > 500 else ""))
                    req_preview = {
                        "provider": self.llm_provider,
                        "model": self.model,
                        "temperature": 0.3,
                        "max_tokens": 8000,
                        "messages": [{"role": "user", "content": _trim(prompt)}]
                    }
                    print(f"[DEBUG] Anthropic search request preview: {req_preview}")
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    temperature=0.3,
                    messages=[{"role": "user", "content": prompt}]
                )
                print(f"[DEBUG] Anthropic search API call successful. Response ID: {response.id}")
                content = response.content[0].text
                print(f"[DEBUG] Search response length: {len(content)} chars")
                
                # Extract JSON
                if "```json" in content:
                    start = content.find("```json") + 7
                    end = content.find("```", start)
                    content = content[start:end].strip()
                elif "```" in content:
                    start = content.find("```") + 3
                    end = content.find("```", start)
                    content = content[start:end].strip()
                
                return json.loads(content)
                
        except Exception as e:
            error_msg = str(e)
            print(f"LLM search error: {error_msg}")
            # Log more details for OpenRouter errors
            if self.llm_provider == "openrouter":
                print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return []

    def validate_claim_with_outputs(
        self,
        claim: str,
        notebook_paths: List[str]
    ) -> Dict[str, Any]:
        """
        Validate a specific claim against notebook outputs using LLM.
        
        Args:
            claim: Claim from model card to validate
            notebook_paths: Notebooks to check
            
        Returns:
            Validation result with evidence
        """
        if not self.client:
            return {"error": "LLM client not initialized"}
        
        evidence = []
        
        for nb_path in notebook_paths:
            try:
                outputs_text = self._read_notebook_outputs(nb_path)
                
                if not outputs_text:
                    continue
                
                # Truncate
                max_length = 8000
                if len(outputs_text) > max_length:
                    outputs_text = outputs_text[:max_length] + "\n... [truncated]"
                
                prompt = f"""Validate a claim from a model card against notebook outputs.

**Claim:** {claim}

**Notebook Outputs:**
```
{outputs_text}
```

**Task:**
Determine if the claim is supported, contradicted, or unverifiable from the outputs.

**Output Format:**
```json
{{
  "status": "supported|contradicted|unverifiable",
  "confidence": 0.0-1.0,
  "evidence": "Quote from outputs that supports or contradicts",
  "explanation": "Brief explanation of reasoning"
}}
```

Validate now:"""

                if self.llm_provider in ["openai", "openrouter"]:
                    content = self._call_openai_api(
                        messages=[
                            {"role": "system", "content": "You are a fact-checking assistant. Return valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=1200,
                        use_json_format=True
                    )
                    result = json.loads(content)
                    result["notebook"] = Path(nb_path).name
                    evidence.append(result)
                    
            except Exception as e:
                error_msg = str(e)
                print(f"Error validating against {nb_path}: {error_msg}")
                # Log more details for OpenRouter errors
                if self.llm_provider == "openrouter":
                    print(f"OpenRouter API error details - Model: {self.model}, Error: {error_msg}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                continue
        
        # Aggregate results
        if not evidence:
            return {"status": "unverifiable", "confidence": 0.0, "evidence": []}
        
        # Return strongest evidence
        evidence.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        return {
            "claim": claim,
            "validation": evidence[0],
            "all_evidence": evidence
        }

