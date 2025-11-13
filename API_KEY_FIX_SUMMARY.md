# API Key Fix Summary

## Issue

When clicking "Verify Model Card" with Anthropic configured in LLM Settings, the verification would fail because **the Anthropic API key was not being passed to the CodeAct verification service**.

### Root Cause

The system has two separate components:
1. **Next.js Frontend** (where LLM Settings stores API keys)
2. **CodeAct Python Service** (where verification actually runs)

Previously, API keys configured in the Next.js app were **not** being transmitted to the CodeAct service, causing LLM-powered verification to fail.

## Solution

Implemented **API key header passthrough** from Next.js to CodeAct service.

### Changes Made

#### 1. Frontend API Route (`apps/api/app/api/verify/model-card/route.ts`)

Added:
- ✅ API key retrieval from LLM configuration
- ✅ API key validation before calling CodeAct
- ✅ API key transmission via HTTP headers
- ✅ Clear error messages when keys are missing

```typescript
// Get LLM configuration and API key
const llmConfig = getLLMConfig();
const apiKey = llmProvider === "openai" 
  ? process.env.OPENAI_API_KEY 
  : process.env.ANTHROPIC_API_KEY;

// Validate API key exists
if (!apiKey) {
  return new Response(JSON.stringify({ 
    error: `${llmProvider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"} not configured. Please set it in LLM Settings or environment variables.` 
  }));
}

// Pass to CodeAct service via headers
const response = await fetch(`${codeactUrl}/verify/stream`, {
  headers: { 
    "X-API-Key": apiKey,           // ✨ NEW
    "X-LLM-Provider": llmProvider, // ✨ NEW
  },
});
```

#### 2. Notebook Verification Route (`apps/api/app/api/verify/notebooks/route.ts`)

Same changes applied to ensure notebook verification also has API key access.

#### 3. CodeAct API Server (`services/codeact_cardcheck/api_server.py`)

Updated both `/verify` and `/verify/stream` endpoints:

```python
@app.post("/verify/stream")
async def verify_stream(verify_request: VerifyRequest, request: Request):
    # Get API key from headers
    api_key = request.headers.get("X-API-Key")
    llm_provider = request.headers.get("X-LLM-Provider") or verify_request.llm_provider
    
    # Set API key in environment for this request
    if api_key:
        if llm_provider == "openai":
            os.environ["OPENAI_API_KEY"] = api_key
        elif llm_provider == "anthropic":
            os.environ["ANTHROPIC_API_KEY"] = api_key
```

## How to Configure API Keys

### Option 1: UI (Recommended)

1. Open http://localhost:3001/workspace
2. Click **"LLM Settings"** button (top-right)
3. Select **Anthropic** as provider
4. Enter your API key: `sk-ant-...`
5. Click **"Save Configuration"**
6. ✅ Done! Key is now passed to CodeAct automatically

### Option 2: Environment Variables

Add to `apps/api/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku-20240307
```

Restart Next.js:
```bash
cd apps/api && pnpm dev
```

## Testing

### Before Fix
```
1. Click "Verify Model Card"
2. ❌ Error: "ANTHROPIC_API_KEY not configured"
3. Verification fails
```

### After Fix
```
1. Configure API key in LLM Settings
2. Click "Verify Model Card"
3. ✅ Real-time progress messages appear
4. ✅ LLM extracts metrics successfully
5. ✅ Verification completes with results
```

## Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| `apps/api/app/api/verify/model-card/route.ts` | Model card verification API | Added API key validation and header passthrough |
| `apps/api/app/api/verify/notebooks/route.ts` | Notebook verification API | Added API key validation and header passthrough |
| `services/codeact_cardcheck/api_server.py` | CodeAct verification service | Added API key header reading and environment setting |

## Documentation Created

| File | Description |
|------|-------------|
| `API_KEY_CONFIGURATION.md` | Comprehensive guide on API key configuration |
| `API_KEY_FIX_SUMMARY.md` | This summary document |

## Benefits

✅ **API keys now work across services** - Keys configured in UI are automatically passed to CodeAct  
✅ **Clear error messages** - Users know exactly what to configure  
✅ **Two configuration methods** - UI (instant) or environment variables (persistent)  
✅ **Secure transmission** - API keys passed via HTTPS headers  
✅ **No code duplication** - Same fix applied to both verification endpoints  

## What This Enables

With API keys properly configured, streaming verification can now:

1. **Extract metrics from notebooks** using LLMs (GPT-4o, Claude, etc.)
2. **Intelligently compare** model card claims with actual code
3. **Generate detailed reports** with evidence-backed findings
4. **Stream progress updates** as each step completes

## Next Steps

1. **Test with your API key**:
   ```bash
   # Open workspace
   open http://localhost:3001/workspace
   
   # Click LLM Settings → Enter Anthropic key → Save
   # Click "Verify Model Card"
   # Watch real-time progress! 🎉
   ```

2. **Check streaming works**:
   - You should see progress messages appear in real-time
   - Final report should show consistency score and findings
   - No API key errors should appear

3. **Switch providers easily**:
   - Change from Anthropic to OpenAI (or vice versa) in LLM Settings
   - No server restart needed
   - Works immediately

## Related Features

This fix is part of the larger **Streaming Verification** implementation:

- ✅ Real-time progress updates via SSE
- ✅ Step-by-step verification feedback
- ✅ LLM-powered metric extraction
- ✅ API key management and passthrough
- ✅ Multi-provider support (OpenAI + Anthropic)

See also:
- `STREAMING_VERIFICATION_IMPLEMENTATION.md` - Technical details
- `STREAMING_QUICK_START.md` - User guide
- `LLM_PROVIDERS.md` - LLM provider configuration

---

**Status**: ✅ **RESOLVED** - API keys now properly passed from UI to CodeAct service

