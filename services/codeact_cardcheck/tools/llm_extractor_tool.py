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

    def __init__(self, workdir: Optional[str] = None, llm_provider: str = "openai"):
        """
        Initialize LLM extractor tool.
        
        Args:
            workdir: Working directory
            llm_provider: LLM provider to use (openai, anthropic, etc.)
        """
        self.workdir = Path(workdir) if workdir else Path.cwd()
        self.llm_provider = llm_provider
        self._init_llm()

    def _init_llm(self):
        """Initialize LLM client based on provider."""
        if self.llm_provider == "openai":
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                self.model = "gpt-4o-mini"  # Fast and cheap for extraction
            except ImportError:
                self.client = None
                print("Warning: OpenAI not available. Install with: pip install openai")
        
        elif self.llm_provider == "anthropic":
            try:
                from anthropic import Anthropic
                self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
                self.model = "claude-3-haiku-20240307"  # Fast and cheap
            except ImportError:
                self.client = None
                print("Warning: Anthropic not available. Install with: pip install anthropic")
        
        else:
            self.client = None
            print(f"Warning: Unknown LLM provider: {self.llm_provider}")

    def extract_metrics_from_notebooks(
        self, 
        notebook_paths: List[str],
        claimed_metrics: Dict[str, Any],
        max_workers: int = 5
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
        
        # Process notebooks in parallel
        print(f"Processing {len(notebook_paths)} notebooks with {max_workers} parallel workers...")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all notebooks for processing
            future_to_notebook = {
                executor.submit(process_notebook, nb_path): nb_path 
                for nb_path in notebook_paths
            }
            
            # Collect results as they complete
            completed = 0
            for future in as_completed(future_to_notebook):
                nb_path = future_to_notebook[future]
                completed += 1
                
                try:
                    nb_path, extracted = future.result()
                    
                    # Merge with all metrics
                    for metric, value in extracted.items():
                        if metric.startswith("_"):  # Skip metadata
                            continue
                        all_metrics[metric] = value
                        all_metrics[f"_{metric}_file"] = Path(nb_path).name
                    
                    print(f"  [{completed}/{len(notebook_paths)}] Processed {Path(nb_path).name}")
                    
                except Exception as e:
                    print(f"  [{completed}/{len(notebook_paths)}] Failed {Path(nb_path).name}: {e}")
        
        print(f"Completed parallel processing of {len(notebook_paths)} notebooks")
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
        
        outputs = []
        for cell_idx, cell in enumerate(nb.cells):
            if cell.cell_type != "code" or not cell.outputs:
                continue
            
            cell_outputs = []
            for output in cell.outputs:
                # Stream output (print statements)
                if output.output_type == "stream":
                    text = output.text if isinstance(output.text, str) else "".join(output.text)
                    cell_outputs.append(text)
                
                # Execute result (returned values)
                elif output.output_type == "execute_result":
                    data = output.get("data", {})
                    if "text/plain" in data:
                        cell_outputs.append(data["text/plain"])
                    if "text/html" in data:
                        # Include HTML for DataFrames
                        cell_outputs.append(f"[HTML Output]: {data['text/html'][:500]}")
                
                # Display data
                elif output.output_type == "display_data":
                    data = output.get("data", {})
                    if "text/plain" in data:
                        cell_outputs.append(data["text/plain"])
            
            if cell_outputs:
                outputs.append(f"--- Cell {cell_idx} Output ---\n" + "\n".join(cell_outputs))
        
        return "\n\n".join(outputs)

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
        if self.llm_provider == "openai":
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
        """Extract metrics using OpenAI."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a precise metric extraction assistant. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                response_format={"type": "json_object"}  # Force JSON output
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON
            metrics = json.loads(content)
            return metrics
            
        except Exception as e:
            print(f"OpenAI extraction error: {e}")
            return {}

    def _extract_with_anthropic(self, prompt: str) -> Dict[str, Any]:
        """Extract metrics using Anthropic."""
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.1,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text
            
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
            return metrics
            
        except Exception as e:
            print(f"Anthropic extraction error: {e}")
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
            if self.llm_provider == "openai":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a search assistant. Return valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
                result = json.loads(content)
                
                # Handle if wrapped in object
                if isinstance(result, dict) and "results" in result:
                    return result["results"]
                elif isinstance(result, list):
                    return result
                else:
                    return []
                    
            elif self.llm_provider == "anthropic":
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2048,
                    temperature=0.3,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
                
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
            print(f"LLM search error: {e}")
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

                if self.llm_provider == "openai":
                    response = self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {"role": "system", "content": "You are a fact-checking assistant. Return valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        response_format={"type": "json_object"}
                    )
                    result = json.loads(response.choices[0].message.content)
                    result["notebook"] = Path(nb_path).name
                    evidence.append(result)
                    
            except Exception as e:
                print(f"Error validating against {nb_path}: {e}")
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

