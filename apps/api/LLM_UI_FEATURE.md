# LLM Settings UI Feature

## Overview

A comprehensive UI for managing LLM providers and models has been implemented, allowing users to dynamically switch between OpenAI and Anthropic models without restarting the server.

## ✨ What's New

### 1. LLM Settings Dialog Component

**Location:** `components/workspace/llm-settings.tsx`

A fully-featured settings dialog that provides:
- ✅ Provider selection (OpenAI vs Anthropic)
- ✅ Model selection with badges (Latest, Fast, Powerful)
- ✅ Secure API key input
- ✅ Real-time configuration updates
- ✅ Current configuration display
- ✅ Model information and descriptions
- ✅ Error handling and validation
- ✅ Success feedback

### 2. Latest Claude Models Support 🆕

**Updated:** `src/lib/llm-config.ts`

Now includes the latest **Claude 4.x series** released in 2025:

#### Claude 4.x Models (2025)
- **`claude-sonnet-4-5`** (Default for Anthropic)
  - Released: September 29, 2025
  - Best for: Coding tasks and agentic workflows
  - Optimized for real-world applications

- **`claude-opus-4-1`**
  - Released: August 5, 2025
  - Best for: Complex reasoning and problem-solving
  - Most capable Claude model

- **`claude-haiku-4-5`**
  - Released: October 15, 2025
  - Best for: Real-time applications
  - Fastest, lowest latency

#### Also Supports
- All Claude 3.5 models (20241022, 20240620)
- All Claude 3 models (Opus, Sonnet, Haiku)

### 3. Runtime Configuration API

**Location:** `app/api/llm/config/route.ts`

RESTful API endpoints for LLM configuration management:

#### GET `/api/llm/config`
Returns current configuration and available models.

**Response:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5",
  "availableModels": {
    "openai": ["gpt-4o", "gpt-4o-mini", ...],
    "anthropic": ["claude-sonnet-4-5", "claude-opus-4-1", ...]
  }
}
```

#### POST `/api/llm/config`
Updates configuration at runtime.

**Request:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5",
  "apiKey": "sk-ant-..."
}
```

**Features:**
- ✅ Input validation (provider, model, API key format)
- ✅ Runtime configuration without server restart
- ✅ Environment variable fallback
- ✅ Secure API key handling

### 4. Enhanced Configuration Library

**Updated:** `src/lib/llm-config.ts`

**New Functions:**
- `setRuntimeLLMConfig(config)` - Set runtime configuration
- `clearRuntimeLLMConfig()` - Clear runtime and revert to env vars
- `getLLMConfig()` - Get current config (runtime > env > defaults)
- `getLLMModel()` - Get AI SDK model instance
- `getAvailableModels(provider)` - Get list of available models

**Configuration Priority:**
1. Runtime Config (set via UI)
2. Environment Variables
3. Default Values

### 5. Workspace Integration

**Updated:** `components/workspace/super-tabs.tsx`

The LLM Settings button is now prominently displayed in the workspace navigation bar, providing easy access to configuration.

## 🎯 Features

### User Experience
- **No Server Restart**: Switch models on the fly
- **Visual Interface**: Dropdown selectors with model descriptions
- **Smart Defaults**: Recommended models are pre-selected
- **Model Badges**: Visual indicators (Latest, Fast, Powerful)
- **Validation**: Real-time validation of inputs
- **Feedback**: Clear success/error messages
- **Current Config Display**: See what's currently active

### Security
- **API Key Protection**: Never sent to client
- **Input Validation**: Provider, model, and API key format checks
- **Secure Storage**: Keys stored in memory/environment only
- **Format Validation**: 
  - OpenAI keys must start with `sk-`
  - Anthropic keys must start with `sk-ant-`

### Flexibility
- **Dual Configuration**: UI or environment variables
- **Runtime Updates**: Changes apply immediately
- **Backward Compatible**: Existing env-based configs still work
- **Fallback Support**: Graceful degradation if UI config fails

## 📁 Files Changed

```
apps/api/
├── components/workspace/
│   ├── llm-settings.tsx          ← NEW: Settings dialog component
│   └── super-tabs.tsx             ← UPDATED: Added settings button
├── app/api/llm/config/
│   └── route.ts                   ← NEW: Configuration API endpoints
├── src/lib/
│   └── llm-config.ts              ← UPDATED: Runtime config + Claude 4.x
└── LLM_PROVIDERS.md               ← UPDATED: Documentation
```

## 🚀 Usage

### For End Users

1. **Open Workspace**: Navigate to `/workspace`
2. **Click "LLM Settings"**: Button in top-right corner
3. **Configure**:
   - Select provider (OpenAI/Anthropic)
   - Choose model from dropdown
   - Enter API key (if changing providers)
4. **Save**: Configuration applies immediately!

### For Developers

#### Using Runtime Configuration
```typescript
import { setRuntimeLLMConfig } from "@/src/lib/llm-config";

// Set configuration programmatically
setRuntimeLLMConfig({
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  apiKey: "sk-ant-..."
});
```

#### Using the Model
```typescript
import { getLLMModel } from "@/src/lib/llm-config";
import { generateText } from "ai";

// Automatically uses configured provider/model
const model = getLLMModel();

const { text } = await generateText({
  model,
  prompt: "Analyze this model card...",
});
```

## 🎨 UI Components Used

- **Dialog**: Modal container from shadcn/ui
- **Select**: Dropdown selectors for provider/model
- **Input**: Password input for API keys
- **Button**: Action buttons
- **Badge**: Visual indicators for models
- **Alert**: Success/error messages
- **Label**: Form field labels

## 🔧 Configuration Examples

### Example 1: Using Latest Claude Model
```typescript
// Via UI: Select "Anthropic" → "Claude Sonnet 4.5"

// Via API:
fetch('/api/llm/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    apiKey: 'sk-ant-...'
  })
});
```

### Example 2: Using GPT-4o
```typescript
// Via UI: Select "OpenAI" → "GPT-4o"

// Via API:
fetch('/api/llm/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'sk-...'
  })
});
```

## 📊 Model Comparison

### OpenAI Models

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| GPT-4o | Fast | High | Multimodal tasks |
| GPT-4o Mini | Fastest | Low | Cost-effective |
| GPT-4 Turbo | Medium | High | Complex tasks |

### Anthropic Models

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| Sonnet 4.5 | Fast | Medium | Coding & agents |
| Opus 4.1 | Slow | High | Complex reasoning |
| Haiku 4.5 | Fastest | Low | Real-time apps |

## 🐛 Error Handling

The system provides clear error messages for:
- Invalid provider selection
- Missing models
- Incorrect API key format
- Network failures
- API errors

Example error messages:
```
❌ Invalid OpenAI API key format. Should start with 'sk-'
❌ Invalid provider. Must be 'openai' or 'anthropic'
❌ Failed to save configuration: Network error
```

## 🔒 Security Considerations

1. **API Keys**: Never logged or sent to client
2. **Validation**: All inputs validated server-side
3. **Environment Isolation**: Runtime config doesn't override .env file permanently
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Consider adding rate limits to config endpoint

## 🎓 Best Practices

### When to Use Each Model

**Claude Sonnet 4.5** (Recommended Default):
- ✅ Coding and debugging
- ✅ Agentic workflows
- ✅ Model card verification
- ✅ Complex tool use

**Claude Opus 4.1**:
- ✅ Deep reasoning tasks
- ✅ Complex analysis
- ✅ High-stakes decisions

**Claude Haiku 4.5**:
- ✅ Real-time assistants
- ✅ Customer support
- ✅ Quick responses

**GPT-4o**:
- ✅ Multimodal tasks
- ✅ Image analysis
- ✅ Vision + text

**GPT-4o Mini**:
- ✅ Cost-effective operations
- ✅ High-volume tasks
- ✅ Simple queries

## 🚦 Migration Path

### From Environment Variables to UI

1. Keep your `.env` file as backup
2. Open LLM Settings in UI
3. Configure your preferred setup
4. Test thoroughly
5. Remove env vars if desired (optional)

### Reverting to Environment Variables

1. Delete runtime config via API or restart server
2. Ensure `.env` has correct values
3. Restart application

## 📝 Notes

- Runtime config persists across requests but **not** server restarts
- For production, use environment variables for persistence
- API keys in runtime config take precedence over env vars
- UI configuration is stored in memory on the server
- No database storage is used (stateless)

## 🔮 Future Enhancements

Potential improvements:
- [ ] Database storage for persistent config
- [ ] User-specific configurations
- [ ] Model performance analytics
- [ ] Cost tracking per model
- [ ] A/B testing between models
- [ ] Model response comparison
- [ ] Automatic model selection based on task
- [ ] Token usage monitoring

## 🎉 Summary

You now have a **fully functional LLM settings UI** that:
- ✅ Supports latest Claude 4.x models
- ✅ Allows runtime provider/model switching
- ✅ Provides a beautiful, intuitive interface
- ✅ Works without server restarts
- ✅ Maintains backward compatibility
- ✅ Handles errors gracefully
- ✅ Secures API keys properly

**Ready to use!** Just open the workspace and click "LLM Settings" in the top-right corner.


