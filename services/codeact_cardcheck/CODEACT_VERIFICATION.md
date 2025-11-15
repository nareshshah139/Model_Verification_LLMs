# CodeAct-Based Model Card Verification

## Overview

This system uses a **CodeAct agent** to dynamically verify model card claims by:

1. **Extracting structured claims** from model cards using LLM
2. **Generating Python glue code** for each claim using LLM
3. **Executing code in parallel** using ThreadPoolExecutor
4. **Evaluating results** with LLM to determine verification status
5. **Generating risk assessment table** comparing claims vs. evidence

## Architecture

```
Model Card (DOCX/MD)
    ↓
[LLM Claim Extractor]
    ↓
Structured Claims (JSON)
    ↓
[LLM Code Generator] → Python Glue Code (per claim)
    ↓
[Parallel Executor] → ThreadPoolExecutor (5 workers)
    ↓
Search Tools: code_search, notebook_search, artifact_search
    ↓
Execution Results
    ↓
[LLM Evaluator] → Verification Status + Confidence
    ↓
[LLM Risk Assessor] → Risk Table with Recommendations
```

## How It Works

### Step 1: Claim Extraction

The LLM reads the entire model card and extracts **verifiable claims**:

```json
{
  "id": "claim_1",
  "category": "algorithm",
  "claim_type": "model_family",
  "description": "PD model uses XGBoost classifier",
  "verification_strategy": "Search for XGBoost imports and usage",
  "search_queries": ["XGBoost", "xgboost", "XGBClassifier"],
  "expected_evidence": "from xgboost import XGBClassifier"
}
```

**Categories extracted:**
- `algorithm` - Model families, algorithms used
- `data` - Data splits, dataset sizes
- `metric` - Performance metrics (AUC, KS, accuracy)
- `feature` - Feature engineering, excluded features
- `preprocessing` - Scaling, encoding, transformations
- `artifact` - Saved models, pickle files
- `infrastructure` - Training environment, libraries

### Step 2: Python Glue Code Generation

For each claim, the LLM generates **executable Python code** that orchestrates pre-defined search tools:

**Example generated code:**
```python
# Verify: "PD model uses XGBoost"

# First check for XGBoost imports
xgb_imports = code_search.import_search("xgboost")

if xgb_imports:
    # Found imports, now check actual usage
    xgb_usage = code_search.text_search("XGBClassifier", file_pattern="*.py")
    
    # Also check in notebooks
    nb_usage = notebook_search.search_code_cells("XGBClassifier")
    
    # Check for saved XGBoost models
    models = artifact_search.find_artifacts("*.pkl")
    xgb_models = [m for m in models if "xgb" in m["name"].lower()]
    
    result = {
        "found": True,
        "evidence_count": len(xgb_imports) + len(xgb_usage) + len(nb_usage),
        "evidence_details": {
            "imports": xgb_imports[:5],
            "code_usage": xgb_usage[:3],
            "notebook_usage": nb_usage[:3],
            "artifacts": xgb_models
        },
        "summary": f"Found {len(xgb_imports)} imports, {len(xgb_usage)} code usages, {len(nb_usage)} notebook cells"
    }
else:
    result = {
        "found": False,
        "evidence_count": 0,
        "evidence_details": [],
        "summary": "No XGBoost imports found"
    }
```

**Key features:**
- ✅ Uses pre-defined search tools (safe, no file writes)
- ✅ Conditional logic based on findings
- ✅ Chains multiple searches together
- ✅ Aggregates and structures results
- ✅ No imports, no network calls (security)

### Step 3: Parallel Execution

All glue codes execute **in parallel** using ThreadPoolExecutor:

```python
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {
        executor.submit(execute_code, claim_code): claim
        for claim, claim_code in claim_code_pairs
    }
    
    for future in as_completed(futures):
        result = future.result()  # Execution results
        verification_results.append(result)
```

**Benefits:**
- 🚀 **5x faster** - verify 20 claims in ~same time as 4 claims
- 🔄 **Non-blocking** - progress updates in real-time
- 📊 **Independent** - each claim verified separately

### Step 4: LLM Evaluation

For each claim's execution results, the LLM evaluates:

```json
{
  "verified": true,
  "confidence": 0.95,
  "reasoning": "Found 3 XGBoost imports in pd_modeling.py and usage in 2 notebooks",
  "discrepancies": []
}
```

### Step 5: Risk Assessment Table

Finally, the LLM generates a comprehensive risk assessment:

```json
{
  "overall_risk": "LOW",
  "summary": "18/20 claims verified with high confidence",
  "assessments": [
    {
      "claim_id": "claim_1",
      "claim_description": "PD model uses XGBoost",
      "match_status": "VERIFIED",
      "risk_level": "LOW",
      "confidence": 0.95,
      "evidence_summary": "Found XGBoost imports and usage",
      "discrepancies": [],
      "impact": "Model implementation matches documentation",
      "recommendation": "No action required"
    },
    {
      "claim_id": "claim_7",
      "claim_description": "AUC score is 0.85",
      "match_status": "PARTIAL",
      "risk_level": "MEDIUM",
      "confidence": 0.60,
      "evidence_summary": "Found AUC=0.83 in notebook outputs",
      "discrepancies": ["Claimed: 0.85, Found: 0.83"],
      "impact": "Minor performance discrepancy",
      "recommendation": "Update model card with actual value or retrain model"
    }
  ]
}
```

## Pre-Defined Search Tools

### CodeSearchTool
```python
# Text search in code
code_search.text_search(query, file_pattern="*.py", context_lines=3)

# Import search
code_search.import_search("LogisticRegression")

# Function search
code_search.function_search("train_model")

# Semantic search
code_search.semantic_search("logistic regression training", top_k=5)
```

### NotebookSearchTool
```python
# Search in notebook outputs
notebook_search.search_outputs("AUC", case_sensitive=False)

# Search in code cells
notebook_search.search_code_cells("train_test_split")
```

### ArtifactSearchTool
```python
# Find artifacts
artifact_search.find_artifacts("*.pkl")
artifact_search.find_artifacts("*.joblib")

# Check artifact usage in code
artifact_search.check_artifact_usage("model.pkl")
```

## API Endpoints

### CodeAct Verification (Parallel)

**Endpoint:** `POST /verify/codeact/stream`

**Request:**
```json
{
  "model_card_text": "# Model Card...",
  "repo_path": "/path/to/repo",
  "llm_provider": "openai"
}
```

**Response:** SSE stream with progress updates

```
data: {"type": "progress", "message": "Step 2: Extracting claims...", "data": {"step": 2}}
data: {"type": "progress", "message": "Extracted 15 claims", "data": {"step": 2, "claim_count": 15}}
data: {"type": "progress", "message": "Step 5: Verifying claims in parallel...", "data": {"step": 5}}
data: {"type": "progress", "message": "Completed 5/15: ...", "data": {"step": 5, "current": 5, "total": 15}}
...
data: {"type": "complete", "report": {...}}
```

### Legacy Verification (Sequential)

**Endpoint:** `POST /verify/stream`

Uses fixed ast-grep rulepacks (slower, less flexible)

## Usage Example

### Frontend Integration

```typescript
const response = await fetch("/api/verify/model-card", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    modelCardPath: "/path/to/card.docx",
    repoPath: "/path/to/repo"
  })
});

// Read SSE stream
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'progress') {
        console.log(data.message);
        updateProgress(data.data);
      } else if (data.type === 'complete') {
        displayRiskAssessment(data.report.risk_assessment);
      }
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# LLM Provider
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."

# Service
export CODEACT_API_URL="http://localhost:8001"
```

### Parallel Workers

Adjust in `agent_main.py`:

```python
verification_results = verifier.verify_claims_batch(
    claims,
    max_workers=5,  # Increase for faster verification
    progress_callback=verification_progress
)
```

## Performance

### Benchmarks (20 claims)

| Method | Time | Parallelization |
|--------|------|-----------------|
| **CodeAct (parallel)** | **~45s** | ✅ 5 workers |
| Legacy (sequential) | ~3min | ❌ Sequential |

**Breakdown:**
- Claim extraction: ~8s (one LLM call)
- Code generation: ~15s (parallel, batched)
- Code execution: ~10s (parallel, I/O bound)
- Evaluation: ~10s (parallel, batched)
- Risk assessment: ~2s (one LLM call)

## Error Handling

### Code Generation Failure
If LLM fails to generate valid code:
- Falls back to simple search queries
- Logs error and continues with other claims

### Code Execution Failure
If generated code throws exception:
- Captures traceback
- Marks claim as "FAILED" in results
- Continues with other claims

### Tool Errors
If search tools fail:
- Returns empty results
- Logs warning
- Doesn't crash entire verification

## Security

### Sandbox Execution
- ✅ No imports allowed
- ✅ No file writes
- ✅ No network access
- ✅ No subprocess execution
- ✅ Only pre-defined tools available

### Example Safe Code
```python
# ✅ ALLOWED
results = code_search.import_search("sklearn")
if results:
    usage = notebook_search.search_outputs("accuracy")

# ❌ BLOCKED (no __builtins__)
import os  # ImportError
open("file.txt", "w")  # NameError
__import__("subprocess")  # NameError
```

## Future Enhancements

1. **Caching** - Cache LLM responses for repeated claims
2. **Batch LLM calls** - Generate code for multiple claims in one call
3. **Custom tools** - Allow repo-specific search tools
4. **Fuzzy matching** - Better tolerance for near-matches
5. **Metric recomputation** - Execute notebooks to verify metrics
6. **Interactive refinement** - Let users refine verification code

## Troubleshooting

### High token usage
- Reduce `max_workers` to batch LLM calls better
- Use cheaper model for code generation (gpt-4o-mini)
- Cache claim extraction results

### Slow verification
- Increase `max_workers` (up to 10)
- Use faster LLM model
- Reduce number of search results returned

### False negatives
- Claims too vague → improve claim extraction prompt
- Search tools not finding evidence → add more tool types
- LLM evaluation too strict → adjust evaluation prompt

## Comparison: Old vs. New

| Aspect | Old (Regex) | New (CodeAct) |
|--------|-------------|---------------|
| Claim extraction | Hardcoded patterns | LLM-based, exhaustive |
| Search strategy | Fixed rulepacks | Dynamic, claim-specific |
| Code execution | None | Generated Python glue code |
| Parallelization | Sequential | Parallel (5 workers) |
| Flexibility | Limited to 15 patterns | Unlimited, adapts to any claim |
| Risk assessment | Simple scoring | Comprehensive LLM analysis |
| Speed (20 claims) | ~3 minutes | ~45 seconds |

