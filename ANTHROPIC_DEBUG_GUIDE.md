# Anthropic API Debug Guide

## Changes Made

### 1. Updated max_tokens to 32000
All Anthropic API calls now use `max_tokens=32000` instead of `64000`:

- **llm_extractor_tool.py**: 3 instances updated
- **codeact_verifier.py**: 3 instances updated
- **llm_claim_extractor.py**: 1 instance updated

### 2. Added Debug Logging
Enhanced logging for all Anthropic API calls to help diagnose issues:

#### Initialization Logging
- Reports when Anthropic client is being initialized
- Warns if `ANTHROPIC_API_KEY` is not set
- Shows which model is being used

#### API Call Logging
Each Anthropic API call now logs:
- `[DEBUG] Making Anthropic API call (model: ...)` - Before the call
- `[DEBUG] Anthropic API call successful. Response ID: ...` - On success
- `[DEBUG] Response length: X chars` - Response size
- `[ERROR] Anthropic extraction error: ...` - On failure with full traceback

### 3. Added Error Handling
- Check if client is initialized before making calls
- Detailed error messages with exception types
- Full traceback on errors

## How to Debug Anthropic API Issues

### Step 1: Check API Key
```bash
echo $ANTHROPIC_API_KEY
```
If empty, set it:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

### Step 2: Run the Test Script
```bash
cd /Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/services/codeact_cardcheck
python test_anthropic_debug.py
```

This will:
1. Verify the API key is set
2. Test importing the anthropic package
3. Make a test API call with max_tokens=32000
4. Test the actual tool classes

### Step 3: Check the Logs
When running your application, look for these log patterns:

**Successful Call:**
```
[INFO] Anthropic client initialized successfully (model: claude-3-haiku-20240307)
[DEBUG] Making Anthropic API call (model: claude-3-haiku-20240307)...
[DEBUG] Anthropic API call successful. Response ID: msg_abc123
[DEBUG] Response length: 250 chars
```

**Failed Call - No API Key:**
```
[ERROR] ANTHROPIC_API_KEY environment variable not set!
```

**Failed Call - Client Not Initialized:**
```
[ERROR] Anthropic client not initialized!
```

**Failed Call - API Error:**
```
[ERROR] Anthropic extraction error: AuthenticationError: Invalid API key
[ERROR] Traceback: ...
```

### Step 4: Common Issues

#### Issue: "ANTHROPIC_API_KEY not set"
**Solution:** Set the environment variable before starting the server:
```bash
export ANTHROPIC_API_KEY='your-key-here'
# Then start your server
```

#### Issue: "anthropic package required"
**Solution:** Install the package:
```bash
pip install anthropic
# or
uv pip install anthropic
```

#### Issue: "Invalid API key" or "Authentication error"
**Solution:** 
- Check your API key is correct
- Verify it hasn't expired
- Get a new key from https://console.anthropic.com/

#### Issue: "max_tokens_exceeded" or similar
**Solution:** The max_tokens is now set to 32000, which is within Claude's limits. If you still see this error, you may need to reduce it further based on the model's context window.

### Step 5: Monitor API Usage
When your application runs, you should now see detailed logs like:

```
[INFO] Initializing Anthropic client for CodeActVerifier...
[INFO] Anthropic client initialized successfully (model: claude-3-5-sonnet-20241022)
[DEBUG] Making Anthropic verification API call (model: claude-3-5-sonnet-20241022)...
[DEBUG] Anthropic verification successful. Response ID: msg_xyz789
[DEBUG] Verification result length: 1524 chars
```

If you don't see these logs, the Anthropic code path may not be executing. Check:
- Is `llm_provider` set to "anthropic" in your configuration?
- Is the application actually reaching the Anthropic code paths?

## Files Modified

1. `/services/codeact_cardcheck/tools/llm_extractor_tool.py`
   - Updated max_tokens: 3 locations
   - Added initialization logging
   - Added API call logging
   - Added client availability check

2. `/services/codeact_cardcheck/tools/codeact_verifier.py`
   - Updated max_tokens: 3 locations
   - Added initialization logging
   - Added API call logging

3. `/services/codeact_cardcheck/tools/llm_claim_extractor.py`
   - Updated max_tokens: 1 location
   - (Already had good logging)

## Quick Test Command

To quickly test if Anthropic is working:

```bash
cd services/codeact_cardcheck
export ANTHROPIC_API_KEY='your-key-here'
python test_anthropic_debug.py
```

Expected output if working:
```
======================================================================
Testing Anthropic API Connection
======================================================================
[OK] ANTHROPIC_API_KEY is set (length: 108 chars)
[OK] anthropic package imported successfully (version: 0.x.x)
[INFO] Creating Anthropic client...
[OK] Anthropic client created successfully

[INFO] Making test API call with max_tokens=32000...
[INFO] Using model: claude-3-haiku-20240307
[OK] API call successful!
[INFO] Response ID: msg_...
[INFO] Response: 4
[SUCCESS] Anthropic API is working correctly!
======================================================================
```

