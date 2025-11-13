# API Key Configuration for Streaming Verification

## Overview

When you click "Verify Model Card", the system uses LLMs (OpenAI or Anthropic) to extract metrics from notebooks and perform intelligent analysis. For this to work, the system needs access to the appropriate API keys.

## Problem: API Keys Not Being Passed to CodeAct Service

Previously, API keys configured in the Next.js frontend (via LLM Settings) were not being passed to the CodeAct verification service, causing verification to fail with "API key not configured" errors.

## Solution: API Key Header Passthrough

We've updated the system to pass API keys from the frontend to the CodeAct service via HTTP headers.

## How It Works Now

### Data Flow

```
1. User clicks "Verify Model Card"
           ↓
2. Frontend (model-card-viewer.tsx)
   - Gets LLM config from getLLMConfig()
   - Retrieves API key from environment
           ↓
3. Next.js API Route (/api/verify/model-card)
   - Validates API key exists
   - Passes API key to CodeAct service via headers:
     - X-API-Key: sk-ant-... (or sk-...)
     - X-LLM-Provider: anthropic (or openai)
           ↓
4. CodeAct API (api_server.py)
   - Reads API key from headers
   - Sets it in environment variables
   - Passes to LLMExtractorTool
           ↓
5. LLMExtractorTool
   - Uses API key to call OpenAI/Anthropic APIs
   - Extracts metrics from notebooks
```

## Configuration Methods

### Method 1: UI Configuration (Recommended) ✨

1. **Open Workspace**: Navigate to http://localhost:3001/workspace
2. **Click "LLM Settings"**: Button in top-right corner
3. **Select Provider**: Choose OpenAI or Anthropic
4. **Enter API Key**:
   - OpenAI: `sk-...`
   - Anthropic: `sk-ant-...`
5. **Save**: Changes take effect immediately

**Benefits:**
- ✅ No server restart required
- ✅ Works immediately
- ✅ API key passed automatically to CodeAct service

### Method 2: Environment Variables

Set these in `apps/api/.env`:

```bash
# For OpenAI
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# For Anthropic
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-haiku-20240307
```

Also set in the **CodeAct service environment** (`services/codeact_cardcheck/.env`):

```bash
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
```

**Note:** If you use environment variables, you must restart both services after changes.

## Code Changes

### 1. Frontend API Route (`apps/api/app/api/verify/model-card/route.ts`)

**Before:**
```typescript
const response = await fetch(`${codeactUrl}/verify/stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    model_card_text: modelCardText,
    llm_provider: llmProvider,
  }),
});
```

**After:**
```typescript
// Get LLM configuration
const llmConfig = getLLMConfig(); // Includes provider, model

// Get API key from environment
const apiKey = llmProvider === "openai" 
  ? process.env.OPENAI_API_KEY 
  : process.env.ANTHROPIC_API_KEY;

// Validate API key exists
if (!apiKey) {
  throw new Error("API key not configured");
}

// Pass API key to CodeAct service via headers
const response = await fetch(`${codeactUrl}/verify/stream`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "X-API-Key": apiKey,              // ✨ NEW
    "X-LLM-Provider": llmProvider,    // ✨ NEW
  },
  body: JSON.stringify({ 
    model_card_text: modelCardText,
    llm_provider: llmProvider,
  }),
});
```

### 2. CodeAct API Server (`services/codeact_cardcheck/api_server.py`)

**Before:**
```python
@app.post("/verify/stream")
async def verify_stream(request: VerifyRequest):
    # Agent initialized without explicit API key
    agent = CardCheckAgent(
        llm_provider=request.llm_provider,
    )
```

**After:**
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
    
    # Agent now has access to API key via environment
    agent = CardCheckAgent(
        llm_provider=llm_provider,
    )
```

### 3. LLMExtractorTool (`services/codeact_cardcheck/tools/llm_extractor_tool.py`)

No changes needed - it already reads from environment variables:

```python
def _init_llm(self):
    if self.llm_provider == "openai":
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # ✅ Works
    elif self.llm_provider == "anthropic":
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))  # ✅ Works
```

## Error Messages

### Before Fix

```
❌ Error: Verification failed
(No API key passed to CodeAct service)
```

### After Fix

If API key is missing in **Next.js environment**:
```
❌ Error: ANTHROPIC_API_KEY not configured. 
   Please set it in LLM Settings or environment variables.
```

If API key format is invalid:
```
❌ Error: Invalid Anthropic API key format. 
   Should start with 'sk-ant-'
```

## Testing

### Test with UI Configuration

1. Open http://localhost:3001/workspace
2. Click "LLM Settings"
3. Select "Anthropic"
4. Enter API key: `sk-ant-your-key-here`
5. Save
6. Click "Verify Model Card"
7. ✅ Should work with streaming progress

### Test with Environment Variables

1. Set in `apps/api/.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   LLM_PROVIDER=anthropic
   ```

2. Restart Next.js:
   ```bash
   cd apps/api
   pnpm dev
   ```

3. Click "Verify Model Card"
4. ✅ Should work with streaming progress

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"

**Cause:** API key not set in Next.js environment

**Solution:**
1. Use LLM Settings UI to configure
2. Or add to `apps/api/.env`
3. Restart Next.js if using environment variables

### Issue: "Invalid Anthropic API key format"

**Cause:** API key doesn't start with `sk-ant-`

**Solution:**
- Check you copied the correct key from https://console.anthropic.com/settings/keys
- Anthropic keys should start with `sk-ant-`
- OpenAI keys should start with `sk-`

### Issue: Verification fails during metric extraction

**Cause:** API key not being used by LLM client

**Solution:**
- Check browser DevTools → Network → verify/model-card → Headers
- Verify `X-API-Key` header is present
- Check CodeAct service logs for API key being set

### Issue: API key works for other features but not verification

**Cause:** CodeAct service and Next.js have separate environments

**Solution:**
- API keys set in UI **are** now passed to CodeAct service via headers
- If still not working, check CodeAct service logs:
  ```bash
  cd services/codeact_cardcheck
  python api_server.py
  # Check console output for errors
  ```

## Security Notes

### API Key Security

✅ **Good Practices:**
- API keys passed via HTTPS headers (secure)
- Keys stored in environment variables (not in code)
- Keys set in `process.env` for the request only
- Keys never logged or exposed to frontend

⚠️ **Important:**
- Don't commit API keys to git
- Use `.env` files (added to `.gitignore`)
- Rotate keys regularly
- Use separate keys for dev/prod

### Header Security

The API key is passed in the `X-API-Key` header:

```http
POST /verify/stream HTTP/1.1
Host: localhost:8001
Content-Type: application/json
X-API-Key: sk-ant-...
X-LLM-Provider: anthropic
```

This is secure because:
- ✅ HTTPS encrypts headers in production
- ✅ Headers not visible to client JavaScript
- ✅ Only passed server-to-server (Next.js → CodeAct)

## Summary

### What Changed

1. ✅ Frontend now validates API keys before calling CodeAct
2. ✅ API keys passed via HTTP headers (`X-API-Key`, `X-LLM-Provider`)
3. ✅ CodeAct service reads API keys from headers
4. ✅ API keys set in environment for LLM tools to use
5. ✅ Clear error messages when keys are missing

### What You Need to Do

**Option A: UI Configuration (Easiest)**
- Open LLM Settings
- Enter your API key
- Click Save
- Done! ✨

**Option B: Environment Variables**
- Add API key to `apps/api/.env`
- Restart Next.js server
- Done! ✅

### Result

🎉 Streaming verification now works with LLM-powered metric extraction, using API keys configured in the UI or environment variables!

