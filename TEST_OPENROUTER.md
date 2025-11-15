# OpenRouter API Test Guide

This guide explains how to test the OpenRouter API integration.

## Prerequisites

1. **OpenRouter API Key**: Get one from [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. **Python Dependencies**: 
   - **Required**: `openai` package
     ```bash
     pip install openai
     ```
   - **Optional** (for claim extraction test): `pyyaml` package
     ```bash
     pip install pyyaml
     ```
     Note: Most tests will run without this dependency. Only the claim extraction test requires it.

## Running the Tests

### Full Test Suite

**Important**: Make sure to activate the virtual environment first (if using one):

```bash
cd services/codeact_cardcheck

# Activate virtual environment (if you have one)
source venv/bin/activate

# Run the tests
python test_openrouter.py <your-openrouter-api-key> [model]
```

If you don't have a virtual environment, install dependencies first:

```bash
pip install openai pyyaml
```

**Examples:**
```bash
# Test with default model (gpt-4o-mini)
python test_openrouter.py sk-or-your-key-here

# Test with specific model
python test_openrouter.py sk-or-your-key-here openai/gpt-4o
python test_openrouter.py sk-or-your-key-here anthropic/claude-sonnet-4-5
```

### What the Tests Cover

The test suite includes:

1. **Basic Connection Test**
   - Verifies OpenRouter API connectivity
   - Tests simple chat completion
   - Checks token usage reporting

2. **App Attribution Headers Test**
   - Tests optional `HTTP-Referer` and `X-Title` headers
   - Verifies headers are sent correctly

3. **Claim Extraction Test**
   - Tests the full claim extraction pipeline
   - Uses `LLMClaimExtractor` with OpenRouter
   - Validates claim extraction from model cards

4. **Response Format Fallback Test**
   - Tests `response_format=json_object` support
   - Verifies fallback when format is unsupported
   - Ensures JSON parsing works correctly

5. **Error Handling Test**
   - Tests invalid API key handling
   - Tests invalid model name handling
   - Verifies error messages are informative

6. **Multiple Models Test** (optional)
   - Tests multiple OpenRouter models
   - Useful for verifying model availability

## Expected Output

Successful test output should look like:

```
======================================================================
OpenRouter API Integration Test Suite
======================================================================
API Key: sk-or-xxxx...xxxx
Default Model: openai/gpt-4o-mini
======================================================================

======================================================================
TEST 1: Basic OpenRouter Connection
======================================================================
Model: openai/gpt-4o-mini
API Key: sk-or-xxxx...xxxx

Making test API call...
✅ Connection successful!
Response: Hello, OpenRouter!

Token usage:
  - Prompt tokens: 12
  - Completion tokens: 3
  - Total tokens: 15

...
```

## Troubleshooting

### Authentication Errors

**Error**: `401 Unauthorized` or `Invalid API key`

**Solution**: 
- Verify your API key is correct
- Ensure it starts with `sk-or-`
- Check that the key has sufficient credits

### Model Not Found

**Error**: `404 Not Found` or `Invalid model`

**Solution**:
- Verify model name format: `provider/model-name`
- Check available models at [https://openrouter.ai/models](https://openrouter.ai/models)
- Common formats:
  - `openai/gpt-4o`
  - `anthropic/claude-sonnet-4-5`
  - `google/gemini-pro-1.5`

### Rate Limiting

**Error**: `429 Rate limit exceeded`

**Solution**:
- Wait a few minutes and retry
- Check your OpenRouter account limits
- Consider using a different model

### Timeout Errors

**Error**: `Request timed out`

**Solution**:
- Increase timeout: `export CLAIM_EXTRACT_TIMEOUT_SECONDS=180`
- Use a faster model (e.g., `gpt-4o-mini` instead of `gpt-4o`)
- Check your network connection

### Response Format Issues

**Warning**: `response_format not supported`

**Note**: This is expected for some models. The test verifies that the fallback mechanism works correctly.

## Quick Manual Test

For a quick manual test, you can use Python directly:

```python
from openai import OpenAI
import os

# Set your API key
os.environ["OPENROUTER_API_KEY"] = "sk-or-your-key-here"

# Create client
client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
    timeout=30.0
)

# Make a test call
response = client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=[
        {"role": "user", "content": "Say 'Hello, OpenRouter!'"}
    ],
    max_tokens=50
)

print(response.choices[0].message.content)
```

## Integration with Existing Tests

The OpenRouter test can be integrated with existing test suites:

```bash
# Test claim extraction with OpenRouter
python test_claim_extraction.py <openrouter-key> openrouter

# Note: You may need to modify test_claim_extraction.py to support OpenRouter
```

## Environment Variables

The tests use these environment variables:

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `OPENROUTER_HTTP_REFERER` (optional): App referer URL
- `OPENROUTER_X_TITLE` (optional): App name
- `CLAIM_EXTRACT_TIMEOUT_SECONDS` (optional): Timeout in seconds (default: 120)

## Next Steps

After running the tests:

1. **If all tests pass**: OpenRouter integration is working correctly!
2. **If tests fail**: Check the error messages and troubleshooting section above
3. **For production use**: Configure OpenRouter via the LLM Settings UI or environment variables

## Related Documentation

- [OpenRouter Integration Guide](./OPENROUTER_INTEGRATION.md)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Available Models](https://openrouter.ai/models)

