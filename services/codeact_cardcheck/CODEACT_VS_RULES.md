# CodeAct Mode vs Rule-Based Mode

The agent supports two verification modes:

## 1. Rule-Based Mode (Pre-defined Search)

**Endpoint:** `/verify/stream`

**How it works:**
- Uses pre-defined YAML rulepacks (algorithms.yaml, preprocessing.yaml, leakage.yaml, etc.)
- Searches for specific patterns defined in advance
- Compares findings against a parsed ClaimsSpec structure
- Good for standardized model cards with known structure

**Limitations:**
- Only finds what the rules are looking for
- Cannot adapt to novel claims or different terminology
- Requires maintaining rulepack YAML files
- Not purely model-card-driven

## 2. CodeAct Mode (Dynamic, Model-Card-Driven) ✅ Recommended

**Endpoint:** `/verify/codeact/stream`

**How it works:**
1. **Claim Extraction:** LLM reads the entire model card and extracts ALL verifiable claims
   - No pre-defined categories or patterns
   - Extracts ONLY what's mentioned in the model card
   - Creates structured claims with search strategies

2. **Code Generation:** For each claim, LLM generates Python "glue code"
   - Uses available search tools (text search, AST search, notebook search, artifact search)
   - Includes conditional logic based on findings
   - Chains multiple searches together if needed

3. **Execution:** Generated code executes in a safe sandbox
   - Uses real search tools to find evidence
   - Returns structured results

4. **Evaluation:** LLM evaluates the evidence
   - Determines if claim is verified
   - Assigns confidence score
   - Identifies discrepancies

5. **Risk Assessment:** Generates overall risk analysis
   - Compares all claims vs evidence
   - Provides actionable recommendations

**Advantages:**
- ✅ **Purely model-card-driven** - no pre-defined rules needed
- ✅ Adapts to any model card format or content
- ✅ Handles novel claims and terminology
- ✅ Parallel processing (up to 5 concurrent verifications)
- ✅ Explainable (shows generated code and reasoning)
- ✅ Flexible (can search code, notebooks, outputs, and artifacts)

## Usage Examples

### Rule-Based Mode
```python
import requests

response = requests.post(
    "http://localhost:8001/verify/stream",
    json={
        "model_card_text": "...",
        "repo_path": "/path/to/repo",
        "llm_provider": "openai"
    },
    headers={"X-API-Key": "your-api-key"},
    stream=True
)
```

### CodeAct Mode (Recommended)
```python
import requests

response = requests.post(
    "http://localhost:8001/verify/codeact/stream",  # Note: /codeact/stream
    json={
        "model_card_text": "...",
        "repo_path": "/path/to/repo",
        "llm_provider": "openai"
    },
    headers={"X-API-Key": "your-api-key"},
    stream=True
)
```

### JavaScript/TypeScript (Frontend)
```typescript
const response = await fetch('http://localhost:8001/verify/codeact/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-LLM-Provider': 'openai'
  },
  body: JSON.stringify({
    model_card_text: modelCardContent,
    repo_path: repoPath,
    llm_provider: 'openai'
  })
});

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
        console.log(data.message);
      } else if (data.type === 'complete') {
        console.log('Verification complete:', data.report);
      }
    }
  }
}
```

## Report Structure

### CodeAct Mode Report
```json
{
  "model_card": "path/to/card.md",
  "repository": "path/to/repo",
  "verification_method": "codeact_parallel",
  "claims_count": 15,
  "verified_count": 12,
  "consistency_score": 0.80,
  "weighted_score": 0.85,
  "overall_risk": "LOW",
  "risk_assessment": {
    "overall_risk": "LOW",
    "summary": "12/15 claims verified with high confidence",
    "assessments": [
      {
        "claim_id": "claim_1",
        "claim_description": "PD model uses logistic regression",
        "match_status": "VERIFIED",
        "risk_level": "LOW",
        "confidence": 0.95,
        "evidence_summary": "Found LogisticRegression import and usage",
        "discrepancies": [],
        "impact": "None - claim verified",
        "recommendation": "No action needed"
      }
    ]
  },
  "claims": [...],
  "verification_results": [
    {
      "claim_id": "claim_1",
      "claim": {...},
      "verified": true,
      "confidence": 0.95,
      "evidence": {
        "found": true,
        "evidence_count": 3,
        "evidence_details": [...]
      },
      "reasoning": "Found multiple instances confirming the claim",
      "discrepancies": [],
      "code": "# Generated Python code used for verification\n..."
    }
  ],
  "summary_by_category": {
    "algorithm": {
      "total": 5,
      "verified": 5,
      "failed": 0,
      "avg_confidence": 0.92,
      "verification_rate": 1.0
    }
  }
}
```

## LLM Provider Support

Both modes support:
- **OpenAI** (gpt-4o-mini for extraction, gpt-4o for code generation)
- **Anthropic** (claude-3-5-sonnet-20241022)

Set via:
- Request body: `"llm_provider": "openai"` or `"llm_provider": "anthropic"`
- Header: `X-LLM-Provider: openai`
- API key via: `X-API-Key: your-key` or environment variable

## When to Use Each Mode

### Use Rule-Based Mode when:
- You have standardized model card templates
- You need specific pattern matching for compliance
- You want deterministic, repeatable checks
- You're checking for known anti-patterns (like data leakage)

### Use CodeAct Mode when:
- ✅ You want **purely model-card-driven verification**
- ✅ Your model cards have varied formats and content
- ✅ You need to verify novel or unique claims
- ✅ You want detailed explanations of verification results
- ✅ You need flexible, adaptive verification

## Switching from Rule-Based to CodeAct

Simply change your endpoint from `/verify/stream` to `/verify/codeact/stream`. The API interface is identical, but the verification logic is completely different.

The CodeAct mode is more powerful and flexible, but requires LLM API access and takes slightly longer due to the claim extraction and code generation steps.

