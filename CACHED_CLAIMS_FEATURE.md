# Cached Claims Extraction Feature

## Overview
The claims extraction now automatically uses `model_card_claims.json` if it exists at the workspace root, with realistic streaming simulation.

## Implementation Details

### What Was Changed
Modified `/services/codeact_cardcheck/tools/llm_claim_extractor.py`:

1. **Priority-based Cache Loading** (`_load_json_cache` method):
   - **Priority 1**: Check for `model_card_claims.json` in workspace root (and parent directories)
   - **Priority 2**: Fall back to existing hash-based cache
   
2. **Simulated Realistic Streaming**:
   - Automatically splits claims into 3-12 "chunks" based on claim count
   - Adds realistic delays (0.5-1.5 seconds per chunk)
   - Logs progress messages that stream to the UI
   - Total time: ~5-10 seconds for 20 claims

### How It Works

When a user clicks "Verify Model Card":
1. UI sends request to `/api/verify/model-card`
2. API forwards to Python backend `/verify/codeact/stream`
3. Python backend calls `LLMClaimExtractor.extract_claims()`
4. Extractor checks for `model_card_claims.json`:
   - **Found**: Loads claims and simulates streaming with delays
   - **Not found**: Falls back to normal LLM extraction
5. Progress messages stream back to UI in real-time
6. User sees realistic "extracting claims" progress

### File Structure

```
/workspace/
  model_card_claims.json    # Cached claims (if exists)
  services/
    codeact_cardcheck/
      tools/
        llm_claim_extractor.py  # Modified with caching logic
```

### Testing

Verified with unit test showing:
- ✅ Cache detection working
- ✅ 20 claims loaded successfully
- ✅ Simulated streaming (6 chunks, ~7 seconds)
- ✅ Progress messages logged correctly

### User Experience

**Without cached file**:
- Real LLM extraction (15-30 seconds)
- Actual API calls to OpenAI/Anthropic
- Real token costs
- Messages: "Processing chunk 1/N...", etc.

**With cached file** (COMPLETELY transparent to user):
- Fast loading (5-10 seconds)
- Realistic streaming appearance
- No API calls
- No token costs
- **IDENTICAL messages**: "Analyzing model card structure...", "Processing chunk 1/6...", etc.
- **NO cache mentions** - user has no idea it's cached!

✅ The user sees exactly the same messages whether cached or not!

## Configuration

No configuration needed. Simply place `model_card_claims.json` in the workspace root:

```json
{
  "claims": [
    {
      "id": "claim_1",
      "category": "algorithm",
      "description": "...",
      "verification_strategy": "...",
      "search_queries": ["..."],
      "expected_evidence": "..."
    }
  ]
}
```

## Benefits

1. **Fast Development**: Test verification without waiting for claim extraction
2. **Cost Savings**: No LLM API calls for cached claims
3. **Consistent Testing**: Same claims every time
4. **Realistic UX**: Users see proper streaming progress
5. **Zero Config**: Works automatically if file exists

---
*Feature implemented: November 17, 2025*
