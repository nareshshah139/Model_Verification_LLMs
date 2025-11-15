# Default Configuration: Anthropic Claude Sonnet 4.5

## Overview

The system is now configured to default to **Anthropic Claude Sonnet 4.5** (`claude-sonnet-4-5`) for all LLM operations.

## Why Claude Sonnet 4.5?

### Technical Advantages
- ✅ **Best for Coding Tasks**: Superior performance on code analysis and generation
- ✅ **Agent Operations**: Optimized for agentic workflows (CodeAct verification)
- ✅ **Context Understanding**: Better at understanding complex code relationships
- ✅ **Structured Output**: More reliable JSON and structured data generation
- ✅ **Latest Model**: Released 2025, represents state-of-the-art capabilities

### Performance Benefits for This Project
- Better claim extraction from model cards
- More accurate code analysis and pattern matching
- Superior verification logic and reasoning
- Fewer false positives in discrepancy detection
- Better understanding of notebook code vs documentation

## Current Configuration

```bash
# apps/api/.env.local
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-api03-DR9MV6... (configured)
```

## Alternative Models

While Claude Sonnet 4.5 is the default, you can switch to other models:

### Anthropic Alternatives
- `claude-opus-4-1` - Most powerful reasoning (slower, more expensive)
- `claude-haiku-4-5` - Fastest response (less capable for complex tasks)
- `claude-3-5-sonnet-20241022` - Previous generation (still excellent)

### OpenAI Models
- `gpt-4o` - Latest GPT-4 optimized
- `gpt-4o-mini` - Fast and cost-effective
- `gpt-4-turbo` - High performance

### OpenRouter (Access Multiple Providers)
- `anthropic/claude-sonnet-4-5` - Same model via OpenRouter
- `openai/gpt-4o` - GPT-4o via OpenRouter
- `google/gemini-pro-1.5` - Google's Gemini

## How to Change the Default

### Method 1: Edit .env.local (Persistent)

```bash
# Edit apps/api/.env.local
LLM_PROVIDER=openai        # Change to: openai, anthropic, or openrouter
LLM_MODEL=gpt-4o          # Change to your preferred model

# Restart the server
pnpm dev
```

### Method 2: Use the UI (Runtime)

1. Open the workspace at http://localhost:3001
2. Click "LLM Settings"
3. Select your preferred provider and model
4. Enter API key if switching providers
5. Click "Save Configuration"

**Note:** UI changes are temporary and reset on server restart.

## Code References

The default is set in multiple places:

### 1. Environment File
```bash
# apps/api/.env.local
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
```

### 2. LLM Config Code
```typescript
// apps/api/src/lib/llm-config.ts
const defaultModel =
  provider === "openai"
    ? "gpt-4o-mini"
    : provider === "anthropic"
    ? "claude-sonnet-4-5"  // ← Default for Anthropic
    : "openai/gpt-4o";
```

### 3. Helper Scripts
```bash
# apps/api/create_env.sh
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
```

## Verification

To verify your current configuration:

```bash
# Check environment file
cat apps/api/.env.local | grep LLM_

# Expected output:
# LLM_PROVIDER=anthropic
# LLM_MODEL=claude-sonnet-4-5
```

Or check via the API:

```bash
curl http://localhost:3001/api/llm/config
```

## Cost Considerations

### Anthropic Claude Sonnet 4.5
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens
- Best balance of quality and cost

### Comparison
- **Claude Opus 4.1**: Higher cost, best quality
- **Claude Haiku 4.5**: Lowest cost, good quality
- **GPT-4o**: Similar cost, different strengths
- **GPT-4o Mini**: Lower cost, less capable

For model card verification tasks, **Claude Sonnet 4.5 offers the best quality/cost ratio**.

## Model Capabilities Comparison

| Feature | Sonnet 4.5 | Opus 4.1 | GPT-4o | GPT-4o Mini |
|---------|-----------|----------|--------|-------------|
| Code Analysis | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Agent Tasks | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cost | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Reasoning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## Recommendation

**Stick with the default** (Claude Sonnet 4.5) unless:
- You need maximum reasoning power → Use `claude-opus-4-1`
- You need fastest response → Use `claude-haiku-4-5` or `gpt-4o-mini`
- You prefer OpenAI ecosystem → Use `gpt-4o`
- Budget is primary concern → Use `gpt-4o-mini` or `claude-haiku-4-5`

## Related Documentation

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Environment setup
- [ISSUE_RESOLVED.md](./ISSUE_RESOLVED.md) - Resolution details
- [LLM_PROVIDERS.md](./apps/api/LLM_PROVIDERS.md) - Provider comparison

---

**Default:** ✅ Anthropic Claude Sonnet 4.5  
**Reason:** Best balance of quality, speed, and cost for code analysis tasks  
**Alternative:** Can be changed anytime via .env.local or UI
