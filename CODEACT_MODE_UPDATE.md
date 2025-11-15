# CodeAct Mode Update - Purely Model-Card-Based Verification

## What Changed

The UI has been switched from **rule-based verification** to **CodeAct mode** - a purely model-card-driven verification approach.

### Before (Rule-Based Mode)
- Used pre-defined YAML rulepacks (algorithms.yaml, preprocessing.yaml, leakage.yaml, etc.)
- Only searched for patterns defined in advance
- Limited to specific, hard-coded checks
- Could not adapt to novel claims or different terminology

### After (CodeAct Mode) ✅
- **Purely model-card-driven**: LLM reads the model card and extracts ALL verifiable claims
- No pre-defined patterns or categories
- Dynamically generates Python code to verify each claim
- Adapts to any model card format or content
- Handles novel claims and terminology
- Provides detailed explanations with generated verification code

## Technical Changes

**File:** `apps/api/app/api/verify/model-card/route.ts`
- **Line 65:** Changed endpoint from `/verify/stream` → `/verify/codeact/stream`

**Files Modified:**
1. `/services/codeact_cardcheck/tools/llm_claim_extractor.py`
   - Removed prescriptive category hints
   - Now extracts claims purely based on model card content
   - More flexible categorization based on verification strategy

## How It Works

### Step 1: Claim Extraction
```
Model Card → LLM Extractor → Structured Claims
```
The LLM reads the model card and extracts ALL verifiable claims with:
- Category (descriptive, not pre-defined)
- Claim type (specific to what was stated)
- Description
- Verification strategy
- Search queries
- Expected evidence

### Step 2: Code Generation
```
Claim → LLM Code Generator → Python Glue Code
```
For each claim, the LLM generates Python code that:
- Uses available search tools (text, AST, notebook, artifact)
- Includes conditional logic
- Chains multiple searches together
- Returns structured results

### Step 3: Execution
```
Python Code → Safe Sandbox → Evidence
```
Generated code executes with access to:
- `code_search`: Text/AST/semantic search in code
- `notebook_search`: Search code cells and outputs
- `artifact_search`: Find and check artifacts

### Step 4: Evaluation
```
Claim + Evidence → LLM Evaluator → Verification Result
```
The LLM evaluates if the claim is verified:
- Verified (true/false)
- Confidence score (0.0-1.0)
- Reasoning
- Discrepancies

### Step 5: Risk Assessment
```
All Results → LLM Assessor → Risk Report
```
Generates overall risk assessment:
- Overall risk level (LOW/MEDIUM/HIGH/CRITICAL)
- Per-claim risk assessment
- Actionable recommendations

## Example Claim Extraction

### Model Card States:
> "The PD model uses logistic regression with a scorecard approach, trained on data from 2015-2020."

### Extracted Claims:
```json
[
  {
    "id": "claim_1",
    "category": "algorithm",
    "claim_type": "model_family",
    "description": "PD model uses logistic regression",
    "verification_strategy": "Search for LogisticRegression import and instantiation",
    "search_queries": ["LogisticRegression", "from sklearn.linear_model import"],
    "expected_evidence": "sklearn.linear_model.LogisticRegression import and usage"
  },
  {
    "id": "claim_2",
    "category": "algorithm",
    "claim_type": "modeling_approach",
    "description": "PD model uses scorecard approach",
    "verification_strategy": "Search for scorecard-related code or transformations",
    "search_queries": ["scorecard", "points", "woe", "weight of evidence"],
    "expected_evidence": "Scorecard calculation or WoE transformation code"
  },
  {
    "id": "claim_3",
    "category": "data",
    "claim_type": "time_period",
    "description": "Model trained on data from 2015-2020",
    "verification_strategy": "Search for date filters or year ranges in data loading",
    "search_queries": ["2015", "2020", "year", "date"],
    "expected_evidence": "Date filters or year columns showing 2015-2020 range"
  }
]
```

## Benefits

### 1. Flexibility
- Works with any model card format
- Adapts to domain-specific terminology
- No maintenance of rulepack files

### 2. Completeness
- Finds ALL claims in the model card
- Not limited to pre-defined categories
- Discovers unexpected or novel claims

### 3. Explainability
- Shows generated verification code
- Provides detailed reasoning
- Confidence scores for each claim

### 4. Performance
- Parallel verification (up to 5 concurrent claims)
- Efficient search tools
- Streaming progress updates

## Verification Report Structure

The new report includes:

```json
{
  "verification_method": "codeact_parallel",
  "claims_count": 15,
  "verified_count": 12,
  "consistency_score": 0.80,
  "weighted_score": 0.85,
  "overall_risk": "LOW",
  "claims": [...],
  "verification_results": [
    {
      "claim_id": "claim_1",
      "verified": true,
      "confidence": 0.95,
      "evidence": {...},
      "reasoning": "Found multiple instances confirming the claim",
      "code": "# Generated Python verification code\n..."
    }
  ],
  "risk_assessment": {
    "overall_risk": "LOW",
    "summary": "12/15 claims verified",
    "assessments": [...]
  },
  "summary_by_category": {...}
}
```

## Testing

To test the new mode:

1. Start the CodeAct service:
```bash
cd services/codeact_cardcheck
python api_server.py
```

2. Start the Next.js app:
```bash
cd apps/api
npm run dev
```

3. Open a model card and click "Verify Model Card"
4. Watch the streaming progress updates
5. Review the verification results showing:
   - Extracted claims
   - Generated verification code
   - Evidence found
   - Risk assessment

## Comparison: Rule-Based vs CodeAct

| Feature | Rule-Based | CodeAct |
|---------|-----------|---------|
| **Claim Source** | Pre-defined rules | Model card content |
| **Adaptability** | Fixed patterns | Fully adaptive |
| **Coverage** | Only defined rules | All claims in card |
| **Terminology** | Must match rules | Flexible |
| **Maintenance** | Update YAML files | No maintenance |
| **Explainability** | Rule matches | Generated code + reasoning |
| **Risk Assessment** | Basic scoring | LLM-generated analysis |
| **Novel Claims** | ❌ Missed | ✅ Detected |

## Rollback (if needed)

To revert to rule-based mode, change line 65 in `apps/api/app/api/verify/model-card/route.ts`:

```typescript
// Change this:
const response = await fetch(`${codeactUrl}/verify/codeact/stream`, {

// Back to this:
const response = await fetch(`${codeactUrl}/verify/stream`, {
```

## Documentation

- See `services/codeact_cardcheck/CODEACT_VS_RULES.md` for detailed comparison
- See `services/codeact_cardcheck/CODEACT_VERIFICATION.md` for technical details
- See API documentation at `http://localhost:8001/docs` when service is running

