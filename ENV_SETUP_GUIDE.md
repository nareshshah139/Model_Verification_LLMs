# Environment Setup Guide

## Quick Start

The "Error Loading Model Card" and "Verification request failed" errors occur when LLM API keys are not configured. This guide will help you set up the environment variables properly.

## Configuration Files

We've created two environment variable files:

1. **`apps/api/.env.local`** - Active configuration file (Next.js will load this)
2. **`.env.example`** - Template file for reference

## Setup Instructions

### Step 1: Add Your API Keys

Edit the `apps/api/.env.local` file and replace the placeholder values with your actual API keys:

```bash
# For Anthropic (Recommended for CodeAct agent)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# For OpenAI (Alternative)
OPENAI_API_KEY=sk-your-actual-key-here

# For OpenRouter (Access multiple providers)
OPENROUTER_API_KEY=sk-or-your-actual-key-here
```

### Step 2: Choose Your Provider

Set the `LLM_PROVIDER` to your preferred provider:

```bash
# Recommended: Anthropic Claude for best code analysis
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5

# Or use OpenAI
# LLM_PROVIDER=openai
# LLM_MODEL=gpt-4o

# Or use OpenRouter (access to multiple models)
# LLM_PROVIDER=openrouter
# LLM_MODEL=anthropic/claude-sonnet-4-5
```

### Step 3: Restart the Development Server

After setting up your API keys, restart the Next.js development server:

```bash
cd apps/api
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Getting API Keys

### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-`)

### OpenRouter API Key
1. Go to https://openrouter.ai/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-or-`)

## Alternative: Use the UI

You can also configure API keys through the application UI:

1. Start the development server
2. Open the workspace UI
3. Click on "LLM Settings" button
4. Select your provider and model
5. Enter your API key
6. Click "Save Configuration"

**Note:** UI configuration is runtime-only. For persistent configuration across server restarts, use the `.env.local` file.

## Troubleshooting

### "API key not configured" Error

If you see this error:
- Check that your `.env.local` file is in the `apps/api/` directory
- Verify the API key is correctly formatted (no extra spaces)
- Ensure you've restarted the Next.js dev server after adding the key

### "Invalid API key format" Error

- **OpenAI keys** should start with `sk-`
- **Anthropic keys** should start with `sk-ant-`
- **OpenRouter keys** should start with `sk-or-`

### Environment Variables Not Loading

If your environment variables aren't being picked up:
1. Make sure the file is named `.env.local` (not just `.env`)
2. Restart your development server completely
3. Clear Next.js cache: `rm -rf .next` then restart

## Security Notes

⚠️ **Important Security Information:**

1. **Never commit `.env.local`** to version control
2. The `.env.local` file is already in `.gitignore`
3. Only use `.env.example` as a template (with placeholder values)
4. Keep your API keys secret and rotate them if exposed
5. Use different keys for development and production

## Verification

To verify your configuration is working:

1. Open the application workspace
2. Load a model card
3. Click "Verify Model Card"
4. If configured correctly, you should see progress messages and verification results

If you still see "Verification request failed":
- Check the browser console for detailed error messages
- Check the CodeAct API server logs: `tail -f services/codeact_cardcheck/api_server.log`
- Verify the CodeAct API server is running on port 8001

## Related Files

- `apps/api/.env.local` - Your active configuration
- `apps/api/src/lib/llm-config.ts` - LLM configuration logic
- `apps/api/app/api/llm/config/route.ts` - LLM settings API endpoint
- `services/codeact_cardcheck/api_server.py` - Backend verification service

