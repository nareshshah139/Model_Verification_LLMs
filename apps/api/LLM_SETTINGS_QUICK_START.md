# LLM Settings - Quick Start Guide

## 🚀 Getting Started

The LLM Settings feature is now available! Here's how to use it:

### Step 1: Start the Application

```bash
cd apps/api
npm run dev
```

The application will start on `http://localhost:3001`

### Step 2: Navigate to Workspace

Open your browser and go to:
```
http://localhost:3001/workspace
```

### Step 3: Open LLM Settings

Look for the **"LLM Settings"** button in the top-right corner of the workspace navigation bar (next to the Notebook/Dashboard tabs).

Click the button to open the settings dialog.

### Step 4: Configure Your LLM

1. **Select Provider**: Choose between OpenAI or Anthropic
2. **Select Model**: Pick from available models:
   - **OpenAI**: GPT-4o, GPT-4o Mini, etc.
   - **Anthropic**: Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5 (NEW!)
3. **Enter API Key** (if changing providers):
   - OpenAI keys start with `sk-`
   - Anthropic keys start with `sk-ant-`
4. **Click "Save Configuration"**

### Step 5: Verify Configuration

After saving, you should see:
- ✅ A green success message
- ✅ The current configuration displayed at the top of the dialog

## 📝 Example: Switching to Claude Sonnet 4.5

1. Click "LLM Settings"
2. Select Provider: **Anthropic**
3. Select Model: **Claude Sonnet 4.5**
4. Enter your Anthropic API key (if not already configured)
5. Click "Save Configuration"
6. Done! The new model is active immediately.

## 🔑 Getting API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Anthropic
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

## 💡 Tips

- **No Restart Required**: Changes take effect immediately
- **Secure**: API keys are never displayed after saving
- **Fallback**: Environment variables still work as fallback
- **Model Badges**: Look for "Latest", "Fast", or "Powerful" badges
- **Model Info**: Read the model descriptions in the dialog

## 🆕 What's New?

### Claude 4.x Series (2025)

The latest Claude models are now available:

#### Claude Sonnet 4.5 ⭐ (Recommended)
- **Best for**: Coding, debugging, agentic workflows
- **Performance**: Excellent balance of speed and capability
- **Use cases**: Model card verification, code analysis

#### Claude Opus 4.1
- **Best for**: Complex reasoning, deep analysis
- **Performance**: Most capable model
- **Use cases**: High-stakes analysis, complex decisions

#### Claude Haiku 4.5
- **Best for**: Real-time applications
- **Performance**: Fastest, lowest latency
- **Use cases**: Quick responses, customer support

## 🐛 Troubleshooting

### "Invalid API key format"
- **OpenAI keys** must start with `sk-`
- **Anthropic keys** must start with `sk-ant-`

### "Failed to save configuration"
- Check your internet connection
- Verify the API key is valid
- Try refreshing the page

### Settings button not visible
- Make sure you're on `/workspace` page
- Check browser console for errors
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Model not switching
- Check the success message appeared
- Verify current configuration shows the new model
- Try making a new request to test

## 📊 Testing the Configuration

To verify your LLM is working correctly, try using a feature that requires LLM:

1. Open a model card in the workspace
2. Click "Verify Model Card"
3. The system will use your configured LLM for analysis

## 🔧 Alternative: Using Environment Variables

If you prefer, you can still configure LLM via environment variables:

```bash
# .env file
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Note**: UI configuration takes priority over environment variables.

## 📖 More Information

- Full documentation: `LLM_UI_FEATURE.md`
- Provider comparison: `LLM_PROVIDERS.md`
- API reference: `/api/llm/config`

## 🎉 That's It!

You're ready to use the LLM Settings feature. Enjoy seamless model switching!

### Need Help?

- Check the full documentation in `LLM_UI_FEATURE.md`
- Look at the model descriptions in the settings dialog
- Review error messages for specific guidance


