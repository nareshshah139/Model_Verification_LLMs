# Multi-Provider LLM Support

This application supports both **OpenAI** and **Anthropic** models for LLM-powered analysis, with both **UI-based** and **environment variable** configuration options.

## Configuration Methods

### Method 1: UI Configuration (Recommended) ✨ NEW

You can now configure the LLM provider directly from the workspace UI without restarting the server!

1. **Open the Workspace**: Navigate to `/workspace`
2. **Click "LLM Settings"**: Find the button in the top-right corner of the workspace
3. **Select Provider**: Choose between OpenAI or Anthropic
4. **Select Model**: Pick from the available models for your provider
5. **Enter API Key**: Provide your API key (if changing providers)
6. **Save**: Click "Save Configuration" - changes take effect immediately!

**Benefits:**
- ✅ No server restart required
- ✅ Real-time configuration updates
- ✅ Easy model switching
- ✅ Visual interface with model descriptions

### Method 2: Environment Variables

The LLM provider can also be configured via environment variables in `apps/api/.env`:

### Environment Variables

- `LLM_PROVIDER`: `"openai"` or `"anthropic"` (default: `"openai"`)
- `LLM_MODEL`: Model name (optional, uses defaults below)
- `OPENAI_API_KEY`: Required if `LLM_PROVIDER=openai`
- `ANTHROPIC_API_KEY`: Required if `LLM_PROVIDER=anthropic`

### Default Models

- **OpenAI**: `gpt-4o-mini` (fast and cost-effective)
- **Anthropic**: `claude-sonnet-4-5` (latest model optimized for coding and agents)

## Usage Examples

### Using OpenAI (Default)

```bash
# apps/api/.env
OPENAI_API_KEY=sk-...
# LLM_MODEL=gpt-4o-mini  # Optional
```

### Using Anthropic

```bash
# apps/api/.env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# LLM_MODEL=claude-3-5-sonnet-20241022  # Optional
```

## Available Models

### OpenAI Models
- `gpt-4o` - Most capable, multimodal (Latest)
- `gpt-4o-mini` - Fast and cost-effective (Default)
- `gpt-4-turbo` - High performance
- `gpt-4` - Previous generation flagship
- `gpt-3.5-turbo` - Legacy model

### Anthropic Models

#### Claude 4.x Series (Latest - 2025) 🆕
- `claude-sonnet-4-5` - **Best for coding and agents** (Default, Released Sept 2025)
- `claude-opus-4-1` - **Most capable reasoning** (Released Aug 2025)
- `claude-haiku-4-5` - **Fastest, low latency** (Released Oct 2025)

#### Claude 3.5 Series
- `claude-3-5-sonnet-20241022` - October 2024 release
- `claude-3-5-sonnet-20240620` - June 2024 release

#### Claude 3 Series
- `claude-3-opus-20240229` - Most capable Claude 3
- `claude-3-sonnet-20240229` - Balanced Claude 3
- `claude-3-haiku-20240307` - Fastest Claude 3

## Code Usage

The LLM configuration is handled automatically via `getLLMModel()`:

```typescript
import { getLLMModel, getLLMConfig } from "@/lib/llm-config";
import { generateText } from "ai";

// Get the configured model (OpenAI or Anthropic)
const model = getLLMModel();

// Use it with the AI SDK
const { text } = await generateText({
  model,
  prompt: "Your prompt here",
});
```

## Features Supported

Both providers support:
- ✅ Function calling / tool use (for ast-grep integration)
- ✅ Streaming responses
- ✅ System prompts
- ✅ Multi-step tool calling

## Provider Selection Logic

1. Check runtime configuration (set via UI or API)
2. Fall back to `LLM_PROVIDER` environment variable
3. Default to `"openai"` if not set
4. Validate required API key is present
5. Use default model if `LLM_MODEL` not specified

**Priority Order:**
- Runtime Config (UI) > Environment Variables > Defaults

## Error Handling

The system will throw clear errors if:
- Invalid provider specified
- Required API key is missing
- Invalid model name provided

Example error:
```
Error: ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic
```

## Migration Guide

### From OpenAI to Anthropic

**Using UI (Recommended):**
1. Open workspace and click "LLM Settings"
2. Select "Anthropic" as provider
3. Choose your preferred Claude model (e.g., `claude-sonnet-4-5`)
4. Enter your Anthropic API key
5. Click "Save Configuration"

**Using Environment Variables:**
1. Add `ANTHROPIC_API_KEY` to `.env`
2. Set `LLM_PROVIDER=anthropic`
3. Optionally set `LLM_MODEL` to your preferred Claude model
4. Restart the API server

### From Anthropic to OpenAI

**Using UI (Recommended):**
1. Open workspace and click "LLM Settings"
2. Select "OpenAI" as provider
3. Choose your preferred model (e.g., `gpt-4o-mini`)
4. Enter your OpenAI API key
5. Click "Save Configuration"

**Using Environment Variables:**
1. Remove `LLM_PROVIDER` or set it to `"openai"`
2. Ensure `OPENAI_API_KEY` is set
3. Restart the API server

## Testing

To test with a different provider:

```bash
# Test with Anthropic
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... npm run dev

# Test with OpenAI
OPENAI_API_KEY=sk-... npm run dev
```

## API Endpoints

The UI uses these endpoints to manage LLM configuration:

### GET `/api/llm/config`
Returns current LLM configuration and available models.

```bash
curl http://localhost:3000/api/llm/config
```

### POST `/api/llm/config`
Updates LLM configuration at runtime.

```bash
curl -X POST http://localhost:3000/api/llm/config \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "model": "claude-sonnet-4-5",
    "apiKey": "sk-ant-..."
  }'
```

## Components

The LLM settings feature consists of:

- **UI Component**: `components/workspace/llm-settings.tsx`
- **Configuration Library**: `src/lib/llm-config.ts`
- **API Route**: `app/api/llm/config/route.ts`

## Notes

- The Vercel AI SDK provides a unified interface for both providers
- Tool calling works identically with both providers
- Model responses may vary in format, but the SDK normalizes them
- Cost considerations: Claude 4.x models offer superior performance but may cost more
- **Claude Sonnet 4.5** is recommended for coding tasks and agentic workflows
- **Claude Haiku 4.5** is ideal for real-time applications requiring low latency
- API keys are stored securely and never sent to the client
- Runtime configuration persists across requests but not server restarts (use environment variables for persistence)

