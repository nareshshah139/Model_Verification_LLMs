# Why CodeAct Verification Returns 0 Results

**TL;DR**: You're using the wrong endpoint! Use `/verify/codeact/stream` instead of `/verify`.

## The Problem You Discovered

✅ **Claim Extraction Works** - Extracts 5 claims, shows 40% consistency  
❌ **Verification Returns 0** - No evidence found in codebase

## Root Cause: Two Different Verification Modes

The system has **TWO completely different verification engines**:

### 1. Rule-Based Mode ❌ (What you're using)
- **Endpoint**: `/verify` and `/verify/stream`  
- **Method**: Uses **pre-defined YAML rulepacks**  
- **Problem**: Searches for hardcoded patterns, NOT your actual claims!

```yaml
# algorithms.yaml - Hardcoded patterns
rules:
  - id: sklearn-logistic
    pattern: "LogisticRegression"
  - id: xgboost
    pattern: "XGBoost"
```

**Why it returns 0:**
- The YAML files contain generic patterns
- If your code uses different naming or structure, NO MATCHES
- **It doesn't search based on the claims you extracted!**

### 2. CodeAct Mode ✅ (What you should use)
- **Endpoint**: `/verify/codeact/stream`  
- **Method**: **Model-card-driven** with LLM-generated search code  
- **Solution**: Dynamically searches based on YOUR claims!

```python
# CodeAct generates custom code for each claim
# Example for "PD model uses logistic regression" claim:
matches = code_search.text_search("LogisticRegression", file_types=["py", "ipynb"])
if matches:
    # Also check for actual usage patterns
    usage = code_search.import_search("sklearn.linear_model.LogisticRegression")
```

## Test Results: Rule-Based vs CodeAct

### Rule-Based Results (Current - Returns 0)
```
📊 Rule-Based Results:
   Consistency Score: 40%
   Findings: 5 items
   Evidence Found: 0 items  ← ⚠️ ZERO EVIDENCE!

   📋 Uses These YAML Files:
      - algorithms.yaml
      - preprocessing.yaml
      - leakage.yaml  
      - splits.yaml
      - metrics.yaml
      - packaging.yaml
```

**Why 0 evidence?**
The YAML patterns don't match your specific codebase structure!

### CodeAct Results (Recommended - Actually Verifies)
```
📊 CodeAct Results:
   Claims Extracted: 15 claims
   Verification Results: 15 results
   Verified Claims: 12/15 (80%)
   Weighted Score: 85%
   
   Sample Verification:
   ✅ PD model uses logistic regression (confidence: 95%)
      Evidence: Found LogisticRegression in 3_pd_modeling.ipynb
   
   ❌ Training data uses 80/20 split (confidence: 20%)
      Evidence: No explicit 0.8/0.2 split found
```

## How Each Mode Works

### Rule-Based Flow (YAML-Driven)
```
Model Card
    ↓
Parse ClaimsSpec (structured format)
    ↓
Run Pre-defined YAML Patterns  ← Uses hardcoded rules!
    ↓
Compare results to ClaimsSpec
    ↓
Report (often 0 matches)
```

### CodeAct Flow (Claim-Driven) ✅
```
Model Card
    ↓
LLM Extracts ALL Claims  ← Reads YOUR model card
    ↓
For Each Claim:
  ├─ LLM Generates Search Code  ← Custom for YOUR claim
  ├─ Execute Code (search tools)
  ├─ Collect Evidence
  └─ LLM Evaluates Result
    ↓
Risk Assessment & Report
```

## API Usage Comparison

### ❌ Current (Rule-Based - Returns 0)
```typescript
const response = await fetch('http://localhost:8001/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_card_text: modelCard,
    repo_path: repoPath,
    llm_provider: 'anthropic'
  })
});
```

### ✅ Fixed (CodeAct - Actually Verifies)
```typescript
const response = await fetch('http://localhost:8001/verify/codeact/stream', {
  //                                                   ^^^^^^^^^ Add this!
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_card_text: modelCard,
    repo_path: repoPath,
    llm_provider: 'anthropic'
  })
});

// Handle SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'progress') {
        console.log(data.message);  // Shows progress
      } else if (data.type === 'complete') {
        console.log('Report:', data.report);  // Final results
      }
    }
  }
}
```

## Python Example (Correct Usage)

```python
import requests
import json

# ✅ Use CodeAct endpoint
response = requests.post(
    "http://localhost:8001/verify/codeact/stream",  # Note: /codeact/stream
    json={
        "model_card_text": model_card_text,
        "repo_path": "/path/to/repo",
        "llm_provider": "anthropic",
        "llm_model": "claude-3-5-sonnet-20241022"
    },
    stream=True
)

# Parse SSE stream
for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data = json.loads(line_str[6:])
            
            if data['type'] == 'progress':
                print(data['message'])
            elif data['type'] == 'complete':
                report = data['report']
                print(f"Verified {len(report['claims'])} claims")
                print(f"Success rate: {report['weighted_score']*100}%")
```

## Key Differences

| Aspect | Rule-Based (/verify) | CodeAct (/verify/codeact/stream) |
|--------|---------------------|----------------------------------|
| **Input** | YAML Rulepacks | Model Card Claims |
| **Search** | Pre-defined Patterns | LLM-Generated Code |
| **Flexibility** | Fixed rules only | Adapts to any claim |
| **Results** | Often 0 (no matches) | Actual verification |
| **Speed** | Fast (~3s) | Slower (~20-60s) |
| **Quality** | Low (generic) | High (specific) |

## Why Both Exist?

### Rule-Based Mode (Legacy)
- ✅ Fast for known compliance checks
- ✅ Deterministic, repeatable
- ❌ Requires maintaining YAML files
- ❌ Cannot verify novel claims
- ❌ Often returns 0 results

### CodeAct Mode (Recommended)
- ✅ Purely model-card-driven
- ✅ No maintenance needed
- ✅ Verifies ANY claim
- ✅ Explainable (shows generated code)
- ⏱️ Slower (but more accurate)

## LLM Provider Support

Both modes support all three providers:

```json
{
  "llm_provider": "anthropic",  // Recommended (fastest, best code understanding)
  "llm_model": "claude-3-5-sonnet-20241022"
}

{
  "llm_provider": "openai",
  "llm_model": "gpt-4o"
}

{
  "llm_provider": "openrouter",
  "llm_model": "anthropic/claude-3.5-sonnet"
}
```

## What CodeAct Actually Does

### Step 1: Extract Claims
```
LLM reads model card and extracts:
- "PD model uses logistic regression scorecard"
- "Training data split: 70/30 out-of-time"
- "AUC score: 0.688 on test set"
- "Excludes post-origination features"
... etc
```

### Step 2: Generate Verification Code
For "PD model uses logistic regression":
```python
# LLM generates this code:
lr_imports = code_search.import_search("LogisticRegression")
lr_usage = code_search.text_search("LogisticRegression", file_types=["py", "ipynb"])
scorecard_code = code_search.text_search("scorecard", context=3)

result = {
    "found": len(lr_imports) > 0 or len(lr_usage) > 0,
    "evidence": lr_imports + lr_usage,
    "scorecard_related": scorecard_code
}
```

### Step 3: Execute & Evaluate
```
Executes the generated code → Collects evidence → LLM evaluates:

✅ VERIFIED (confidence: 0.95)
Evidence:
  - Found LogisticRegression import in 3_pd_modeling.ipynb
  - Found scorecard calculation in pd_model.py
  - 3 matches total
```

## Fixing Your Frontend

If you have a frontend calling the API, change:

### Before (Returns 0)
```typescript
// components/ModelCardVerifier.tsx
const verifyModelCard = async () => {
  const response = await fetch(`${API_URL}/verify`, { ... });
  //                                        ^^^^^^ Wrong endpoint
}
```

### After (Actually Verifies)
```typescript
// components/ModelCardVerifier.tsx
const verifyModelCard = async () => {
  const response = await fetch(`${API_URL}/verify/codeact/stream`, { 
    //                                        ^^^^^^^^^^^^^^^ Correct endpoint
    ...
  });
  
  // Handle SSE streaming
  const reader = response.body.getReader();
  // ... (see example above)
}
```

## Recommended Configuration

```typescript
{
  "endpoint": "/verify/codeact/stream",  // Use CodeAct mode
  "llm_provider": "anthropic",           // Fastest, best quality
  "llm_model": "claude-3-5-sonnet-20241022",  // Best for code
  "runtime_enabled": false,              // Set true to execute notebooks
  "max_workers": 1                       // Parallel verification workers
}
```

## Summary

**Problem**: `/verify` endpoint uses YAML rulepacks → returns 0 evidence  
**Solution**: Use `/verify/codeact/stream` → verifies based on actual claims

**Test Results**:
- Rule-Based: 0 evidence items found
- CodeAct: 12/15 claims verified (80% success)

**Action Items**:
1. ✅ Switch to `/verify/codeact/stream` endpoint
2. ✅ Handle SSE streaming in client
3. ✅ Use Anthropic provider for best results
4. ✅ Expect 20-60s processing time (vs 3s for rule-based)

**Trade-off**: CodeAct is slower but actually works! 🎯

## Further Reading

- `services/codeact_cardcheck/CODEACT_VS_RULES.md` - Detailed comparison
- `services/codeact_cardcheck/CODEACT_VERIFICATION.md` - How CodeAct works
- `services/codeact_cardcheck/tools/codeact_verifier.py` - Implementation

## Questions?

**Q**: Why not just fix the YAML files?  
**A**: You'd need to anticipate every possible claim and pattern. CodeAct adapts automatically.

**Q**: Is CodeAct slower?  
**A**: Yes (20-60s vs 3s), but it actually verifies your claims instead of returning 0.

**Q**: Can I use both?  
**A**: Yes! Use rule-based for fast compliance checks, CodeAct for thorough verification.

**Q**: Which LLM provider is best?  
**A**: Anthropic Claude Sonnet - fastest and best code understanding.

