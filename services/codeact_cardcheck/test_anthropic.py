#!/usr/bin/env python3
"""Test Anthropic API key and available models."""

import os
import sys

# Check if API key is provided as argument or in environment
api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ANTHROPIC_API_KEY")

if not api_key:
    print("❌ ANTHROPIC_API_KEY not provided")
    print("\nUsage:")
    print("  python test_anthropic.py <your-api-key>")
    print("Or set environment variable:")
    print("  export ANTHROPIC_API_KEY='your-key-here'")
    print("  python test_anthropic.py")
    sys.exit(1)

print(f"✓ ANTHROPIC_API_KEY found: {api_key[:10]}...{api_key[-4:]}")

# Try to import anthropic
try:
    from anthropic import Anthropic
    print("✓ anthropic package installed")
except ImportError:
    print("❌ anthropic package not installed")
    print("\nInstall with:")
    print("  pip install anthropic")
    sys.exit(1)

# Test API call with different models
print("\n" + "="*60)
print("Testing Anthropic API with different models...")
print("="*60)

client = Anthropic(api_key=api_key)

test_models = [
    "claude-3-5-sonnet-20241022",  # Latest
    "claude-3-5-sonnet-20240620",  # June 2024
    "claude-3-opus-20240229",      # Opus
    "claude-3-sonnet-20240229",    # Sonnet 3.0
    "claude-3-haiku-20240307",     # Haiku
]

for model in test_models:
    print(f"\n🔍 Testing model: {model}")
    try:
        response = client.messages.create(
            model=model,
            max_tokens=100,
            temperature=0.0,
            messages=[
                {"role": "user", "content": "Say 'Hello, I am working!' and nothing else."}
            ]
        )
        result = response.content[0].text
        print(f"   ✅ SUCCESS: {result[:50]}")
        print(f"   Usage: {response.usage.input_tokens} in, {response.usage.output_tokens} out")
    except Exception as e:
        error_msg = str(e)
        if "credit" in error_msg.lower():
            print(f"   ❌ BILLING: {error_msg[:100]}")
        elif "model" in error_msg.lower():
            print(f"   ❌ MODEL ACCESS: {error_msg[:100]}")
        elif "rate" in error_msg.lower():
            print(f"   ⏳ RATE LIMIT: {error_msg[:100]}")
        else:
            print(f"   ❌ ERROR: {error_msg[:100]}")

print("\n" + "="*60)
print("Test complete!")
print("="*60)

