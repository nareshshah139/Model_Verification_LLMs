# OpenRouter Integration

## Overview

The AST-RAG-Based Model Card Checks system now supports **OpenRouter** as an LLM provider, giving you access to a wide variety of models including GPT-4, Claude, Gemini, Llama, and more through a single unified API.

## What is OpenRouter?

[OpenRouter](https://openrouter.ai/) is a unified interface for accessing multiple LLM providers through a single API. It offers:

- **Multiple Providers**: Access GPT-4, Claude, Gemini, Llama, Mistral, and 50+ other models
- **Pay-as-you-go**: Only pay for what you use, no subscriptions
- **No Vendor Lock-in**: Switch between models seamlessly
- **Unified API**: OpenAI-compatible API format
- **Cost Optimization**: Compare prices and choose the best model for your use case

## Getting Started

### 1. Get an OpenRouter API Key

1. Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy your API key (starts with `sk-or-...`)

### 2. Configure OpenRouter in the UI

#### Via LLM Settings Dialog

1. Open the application at `http://localhost:3001/workspace`
2. Click the **"LLM Settings"** button in the navigation bar
3. Select **"OpenRouter"** from the Provider dropdown
4. Choose your desired model from the available options:
   - **OpenAI models**: `openai/gpt-4o`, `openai/gpt-4o-mini`, etc.
   - **Anthropic models**: `anthropic/claude-sonnet-4-5`, `anthropic/claude-opus-4-1`, etc.
   - **Other models**: `google/gemini-pro-1.5`, `meta-llama/llama-3.1-405b-instruct`, etc.
5. Enter your OpenRouter API key
6. Click **"Save Configuration"**

#### Via Environment Variables

Add these to your `.env` file:

```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key-here
LLM_MODEL=openai/gpt-4o  # or any other model

# Optional: App attribution headers (for OpenRouter leaderboards)
OPENROUTER_HTTP_REFERER=https://yourapp.com  # Your site URL
OPENROUTER_X_TITLE=Your App Name              # Your app name
```

The app attribution headers (`HTTP-Referer` and `X-Title`) are optional but recommended. They allow your app to appear on OpenRouter's leaderboards and help with attribution. See [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart) for more details.

## Available Models via OpenRouter

### OpenAI Models
- `openai/gpt-4o` - Latest GPT-4 Omni model
- `openai/gpt-4o-mini` - Fast and cost-effective
- `openai/gpt-4-turbo` - High performance

### Anthropic Models
- `anthropic/claude-sonnet-4-5` - Best for coding and agents
- `anthropic/claude-opus-4-1` - Most capable reasoning
- `anthropic/claude-3.5-sonnet` - Previous generation
- `anthropic/claude-3-opus` - Powerful reasoning

### Google Models
- `google/gemini-pro-1.5` - Multimodal capabilities

### Meta Models
- `meta-llama/llama-3.1-405b-instruct` - Open source, powerful

### Mistral Models
- `mistralai/mistral-large` - Efficient and capable

> **Note**: OpenRouter supports 50+ models. Visit [https://openrouter.ai/models](https://openrouter.ai/models) for the complete list.

## Usage Examples

### Python (Backend Services)

The backend services automatically use OpenRouter when configured:

```python
from tools import LLMClaimExtractor

# Initialize with OpenRouter
extractor = LLMClaimExtractor(
    llm_provider="openrouter",
    model="openai/gpt-4o"  # Optional: specify model
)

# Extract claims from model card
claims = extractor.extract_claims(model_card_text)
```

### TypeScript (Frontend)

The frontend automatically uses OpenRouter when configured via the LLM Settings dialog:

```typescript
// Configuration is handled automatically via the settings UI
// The system will use the configured provider and model
```

### API Requests

When making API requests to the verification endpoints, you can specify OpenRouter:

```bash
curl -X POST http://localhost:8001/verify/codeact/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-or-your-key-here" \
  -H "X-LLM-Provider: openrouter" \
  -d '{
    "model_card_text": "...",
    "repo_path": "/path/to/repo",
    "llm_provider": "openrouter"
  }'
```

## Model Selection Guidelines

### For Claim Extraction (Fast Processing)
- **Recommended**: `openai/gpt-4o-mini` or `anthropic/claude-haiku-4-5`
- **Why**: Fast, cost-effective, good at structured output

### For CodeAct Verification (Code Generation)
- **Recommended**: `openai/gpt-4o` or `anthropic/claude-sonnet-4-5`
- **Why**: Excellent at generating Python code, understanding complex logic

### For Risk Assessment (Deep Reasoning)
- **Recommended**: `anthropic/claude-opus-4-1` or `openai/gpt-4o`
- **Why**: Strong reasoning capabilities, comprehensive analysis

## Cost Considerations

OpenRouter charges based on token usage. Different models have different pricing:

- **Most Affordable**: `openai/gpt-4o-mini`, `anthropic/claude-haiku-4-5`
- **Balanced**: `openai/gpt-4o`, `anthropic/claude-sonnet-4-5`
- **Premium**: `anthropic/claude-opus-4-1`, `meta-llama/llama-3.1-405b-instruct`

Check current pricing at [https://openrouter.ai/models](https://openrouter.ai/models)

## Supported Features

All system features work with OpenRouter:

✅ **Model Card Verification**
- Claim extraction from model cards
- Evidence search in notebooks and code
- Parallel claim verification

✅ **CodeAct Agent**
- Dynamic Python code generation
- Search tool orchestration
- Risk assessment generation

✅ **Notebook Analysis**
- Metric extraction from outputs
- Code pattern detection
- Output validation

✅ **Streaming Support**
- Real-time progress updates
- SSE (Server-Sent Events) streaming
- Interactive verification

## Troubleshooting

### API Key Issues

**Problem**: "OPENROUTER_API_KEY not set"
**Solution**: Ensure your API key is properly configured in environment variables or through the UI

### Model Not Available

**Problem**: "Invalid model for openrouter"
**Solution**: Check that your model ID follows the format `provider/model-name` (e.g., `openai/gpt-4o`)

### Rate Limiting

**Problem**: Too many requests
**Solution**: OpenRouter has rate limits. Consider:
- Reducing parallel workers
- Using a more affordable model
- Adding delays between requests

### Authentication Errors

**Problem**: "Invalid API key format"
**Solution**: OpenRouter API keys should start with `sk-or-` or `sk-`

## Migration Guide

### From OpenAI to OpenRouter

1. Get an OpenRouter API key
2. Change `LLM_PROVIDER=openai` to `LLM_PROVIDER=openrouter`
3. Update model from `gpt-4o` to `openai/gpt-4o` (add provider prefix)
4. Update API key environment variable

### From Anthropic to OpenRouter

1. Get an OpenRouter API key
2. Change `LLM_PROVIDER=anthropic` to `LLM_PROVIDER=openrouter`
3. Update model from `claude-sonnet-4-5` to `anthropic/claude-sonnet-4-5` (add provider prefix)
4. Update API key environment variable

## Advanced Configuration

### Custom Model Parameters

You can customize model behavior by modifying the LLM configuration:

```python
# In Python backend
from openai import OpenAI
import os

# App attribution headers (optional but recommended)
default_headers = {}
if os.environ.get("OPENROUTER_HTTP_REFERER"):
    default_headers["HTTP-Referer"] = os.environ["OPENROUTER_HTTP_REFERER"]
if os.environ.get("OPENROUTER_X_TITLE"):
    default_headers["X-Title"] = os.environ["OPENROUTER_X_TITLE"]

client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
    default_headers=default_headers if default_headers else None
)

response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=[...],
    temperature=0.7,
    max_tokens=2048
)
```

The app attribution headers are automatically added when configured via environment variables (`OPENROUTER_HTTP_REFERER` and `OPENROUTER_X_TITLE`). This follows the [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart) pattern.

### Fallback Configuration

You can configure fallback providers in case OpenRouter is unavailable:

```bash
# .env
LLM_PROVIDER=openrouter
FALLBACK_PROVIDER=openai
OPENROUTER_API_KEY=sk-or-your-key
OPENAI_API_KEY=sk-your-backup-key
```

## References

- **OpenRouter Documentation**: https://openrouter.ai/docs
- **Available Models**: https://openrouter.ai/models
- **Pricing**: https://openrouter.ai/models (see pricing column)
- **API Keys**: https://openrouter.ai/keys
- **OpenRouter GitHub**: https://github.com/OpenRouterTeam

## Support

For issues specific to OpenRouter integration:
1. Check the OpenRouter status page
2. Review model availability at https://openrouter.ai/models
3. Consult OpenRouter's documentation
4. Open an issue in this repository with `[OpenRouter]` tag

---

**Last Updated**: November 2025

