# Fix: "Error Loading Model Card" / "Verification request failed"

## Problem

When clicking "Verify Model Card" or "Verify Notebooks", you see:
- ❌ **Error Loading Model Card**
- ❌ **Verification request failed**

## Root Cause

The LLM API keys are not configured. The verification process requires an API key from OpenAI, Anthropic, or OpenRouter to work.

## Quick Fix

### Option 1: Create .env.local file (Recommended)

1. **Run the setup script:**
   ```bash
   cd apps/api
   bash create_env.sh
   ```

2. **Edit the created file:**
   ```bash
   # Open apps/api/.env.local in your editor
   # Replace the placeholder with your actual API key:
   
   ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
   # OR
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Restart the dev server:**
   ```bash
   # From the root directory
   pnpm dev
   ```

### Option 2: Use the UI (Runtime Configuration)

1. **Start the development server** (if not already running):
   ```bash
   pnpm dev
   ```

2. **Open the workspace** at http://localhost:3001

3. **Click "LLM Settings"** button in the UI

4. **Configure your provider:**
   - Select provider (Anthropic, OpenAI, or OpenRouter)
   - Select model
   - Enter your API key
   - Click "Save Configuration"

**Note:** UI configuration is temporary and will be lost on server restart. For persistent configuration, use Option 1.

## Get Your API Key

### Anthropic (Recommended)
1. Go to https://console.anthropic.com/
2. Sign up/login → API Keys → Create new key
3. Copy key (starts with `sk-ant-`)
4. Paste into `.env.local` as `ANTHROPIC_API_KEY`

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Sign up/login → Create new key
3. Copy key (starts with `sk-`)
4. Paste into `.env.local` as `OPENAI_API_KEY`

### OpenRouter (Multiple Providers)
1. Go to https://openrouter.ai/keys
2. Sign up/login → Create new key
3. Copy key (starts with `sk-or-`)
4. Paste into `.env.local` as `OPENROUTER_API_KEY`

## Verification

After configuring your API key:

1. ✅ Restart the Next.js dev server
2. ✅ Open the workspace UI
3. ✅ Load a model card (e.g., Lending-Club-Credit-Scoring model card)
4. ✅ Click "Verify Model Card"
5. ✅ You should see progress messages and verification results

## Still Having Issues?

### Check the API Server

Make sure the CodeAct API server is running:

```bash
# Check if running
curl http://localhost:8001/

# If not running, start it:
cd services/codeact_cardcheck
./start_api_server.sh
```

### Check Environment Variables

```bash
# Check if variables are set (from apps/api directory)
cat .env.local | grep API_KEY
```

### Check Browser Console

Open browser DevTools (F12) → Console tab to see detailed error messages

### Check Server Logs

```bash
# API server logs
tail -f services/codeact_cardcheck/api_server.log

# Next.js terminal output
# Check the terminal where you ran 'pnpm dev'
```

## Files Created

- ✅ `apps/api/.env.local` - Your active configuration file (not tracked by git)
- ✅ `apps/api/env.template` - Template for reference
- ✅ `apps/api/create_env.sh` - Helper script to create .env.local
- ✅ `ENV_SETUP_GUIDE.md` - Detailed setup guide

## Security Note

⚠️ **Never commit `.env.local` to git!** It contains your secret API keys.

The file is already in `.gitignore`, so it won't be accidentally committed.

## Next Steps

Once verification is working:
1. Explore the verification results in the Verification tab
2. Check discrepancies found between code and model card
3. Use the notebook viewer to see highlighted issues
4. Try verifying individual notebooks

## Related Documentation

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Complete environment setup guide
- [README.md](./README.md) - Full project documentation
- [QUICK_START.md](./apps/api/QUICK_START.md) - Quick start guide

