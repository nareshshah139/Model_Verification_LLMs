# Claim Extraction Debug Guide

## Issue: 0 Claims Extracted

If you're seeing "Extracted 0 verifiable claims", here's how to debug:

### Step 1: Check the CodeAct Service Logs

The service should be printing debug information now:

```bash
# In the terminal running the CodeAct service, look for:
LLM Response (first 500 chars): ...
Parsed X claims from LLM response
```

If you see:
- **"WARNING: No claims extracted"** - The LLM returned JSON but with an empty claims array
- **"Error extracting claims"** - There's an exception (API error, JSON parsing error, etc.)

### Step 2: Restart the CodeAct Service

The code has been updated with better logging. Restart the service:

```bash
cd services/codeact_cardcheck
python api_server.py
```

### Step 3: Check Your API Keys

Make sure your API keys are configured:

```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Or check the UI settings
# Go to LLM Settings in the UI
```

### Step 4: Test the Extraction Directly

You can test claim extraction directly:

```python
cd services/codeact_cardcheck
python -c "
from tools.llm_claim_extractor import LLMClaimExtractor
from pathlib import Path

# Read the model card
card_text = Path('/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/apps/api/public/model-cards/example_model_card.md').read_text()

# Extract claims
extractor = LLMClaimExtractor(llm_provider='openai')  # or 'anthropic'
claims = extractor.extract_claims(card_text)

print(f'Extracted {len(claims)} claims:')
for claim in claims:
    print(f'  - {claim[\"description\"]}')
"
```

### Step 5: Common Issues

#### Issue: API Key Not Set
**Symptom:** Error about API key not found
**Solution:** Set environment variable or configure in UI:
```bash
export OPENAI_API_KEY="your-key-here"
# or
export ANTHROPIC_API_KEY="your-key-here"
```

#### Issue: Rate Limit
**Symptom:** Error about rate limit exceeded
**Solution:** Wait a moment and try again, or switch providers

#### Issue: Model Not Available
**Symptom:** Error about model access
**Solution:** Check which model is configured:
- OpenAI: `gpt-4o-mini` (for extraction)
- Anthropic: `claude-3-5-sonnet-20241022`

#### Issue: JSON Parsing Error
**Symptom:** "Error extracting claims" with JSON error
**Solution:** Check the logs for the full LLM response - the LLM might not be returning valid JSON

### Step 6: Check Model Card Format

The example model card should have plenty of claims:

```markdown
# Model Card: Lending Club Credit Scoring Model

## Model Family
### Probability of Default (PD)
- **Method:** Logistic Regression scorecard  # <- Claim!

## Data Splits
- **Training:** 2007-2013  # <- Claim!
- **Test:** 2014  # <- Claim!

## Performance Metrics
### PD Model
- **AUC (Test):** > 0.65  # <- Claim!
```

This should extract at least 10-15 claims.

### Step 7: Enable Debug Mode

Edit `services/codeact_cardcheck/api_server.py` to run with debug mode:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="debug")
```

### Step 8: Check the API Response

Test the API directly:

```bash
curl -X POST http://localhost:8001/verify/codeact/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -H "X-LLM-Provider: openai" \
  -d '{
    "model_card_text": "# Model Card\n\n## Algorithm\n- PD Model: Logistic Regression\n\n## Metrics\n- AUC: 0.85",
    "repo_path": "/path/to/repo"
  }'
```

You should see streaming SSE events with claim extraction progress.

### Expected Output

With the example model card, you should see something like:

```
Step 2: Extracting verifiable claims from model card using LLM...
Extracted 15 verifiable claims

  Claim 1: [algorithm] PD model uses Logistic Regression scorecard
  Claim 2: [algorithm] LGD model uses two-stage hurdle model
  Claim 3: [algorithm] LGD stage 1 uses logistic regression
  Claim 4: [algorithm] LGD stage 2 uses linear regression
  Claim 5: [algorithm] EAD model uses linear regression on CCF
  Claim 6: [data] Training data from 2007-2013
  Claim 7: [data] Test data from 2014
  Claim 8: [data] Monitoring data from 2015
  Claim 9: [feature] Excluded column: out_prncp
  Claim 10: [feature] Excluded column: total_pymnt
  ...
```

### What Changed

The prompt has been updated to be clearer about extracting claims:

**Before:**
```
Extract ONLY what is explicitly stated or implied in the model card.
Do NOT add assumptions or standard practices not mentioned.
```

**After:**
```
Be exhaustive - extract EVERY verifiable factual claim from the model card including:
- Algorithm/model families and methods used
- Data splits
- Feature engineering steps
- Excluded features
- Performance metrics
- etc.

If the model card states a fact that could be verified in code, extract it as a claim.
```

### Need More Help?

Share the output from:
1. The CodeAct service terminal
2. The browser console (F12 → Console tab)
3. The full error message if any

This will help diagnose the exact issue.

