#!/usr/bin/env python3
"""Test OpenRouter API integration."""

import os
import sys
import json
from pathlib import Path

# Check if we're in a virtual environment
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    venv_path = Path(__file__).parent / "venv"
    if venv_path.exists():
        print("⚠️  Warning: Virtual environment detected but not activated!")
        print(f"   Please activate it first:")
        print(f"   source {venv_path}/bin/activate")
        print()
        print("   Or install dependencies in your current environment:")
        print("   pip install openai pyyaml")
        print()

# Add tools to path
sys.path.insert(0, str(Path(__file__).parent))

# Check for required dependencies
try:
    import openai
except ImportError:
    print("❌ Error: 'openai' package not found!")
    print("   Please install it:")
    print("   pip install openai")
    print("   Or activate the virtual environment:")
    print(f"   source {Path(__file__).parent}/venv/bin/activate")
    sys.exit(1)

# Try to import LLMClaimExtractor, but make it optional
# Some tests don't need it and importing it may require additional dependencies
LLMClaimExtractor = None
try:
    # Import directly from the module file to avoid triggering tools.__init__ imports
    # This prevents importing dependencies like yaml that aren't needed for basic tests
    import importlib.util
    tools_dir = Path(__file__).parent / "tools"
    llm_claim_extractor_path = tools_dir / "llm_claim_extractor.py"
    
    # First, we need to make sure tools.terminal_logger can be imported
    # without triggering tools.__init__.py. Let's add a mock or import it directly.
    # Actually, let's just try the normal import and catch the error
    from tools.llm_claim_extractor import LLMClaimExtractor
except (ImportError, ModuleNotFoundError) as e:
    # If import fails due to missing dependencies, we'll skip tests that need it
    print(f"⚠️  Warning: Could not import LLMClaimExtractor: {e}")
    print("   Some tests will be skipped. Install missing dependencies to run all tests.")
    print("   Required: pip install pyyaml")


def test_openrouter_connection(api_key: str, model: str = "openai/gpt-4o-mini"):
    """Test basic OpenRouter API connection."""
    print(f"\n{'='*70}")
    print(f"TEST 1: Basic OpenRouter Connection")
    print(f"{'='*70}")
    print(f"Model: {model}")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    os.environ["OPENROUTER_API_KEY"] = api_key
    
    try:
        # Test simple API call
        from openai import OpenAI
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0
        )
        
        print("Making test API call...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'Hello, OpenRouter!' in one sentence."}
            ],
            max_tokens=50
        )
        
        result = response.choices[0].message.content
        print(f"✅ Connection successful!")
        print(f"Response: {result}")
        print()
        
        # Check response metadata
        if hasattr(response, 'usage'):
            usage = response.usage
            print(f"Token usage:")
            print(f"  - Prompt tokens: {usage.prompt_tokens}")
            print(f"  - Completion tokens: {usage.completion_tokens}")
            print(f"  - Total tokens: {usage.total_tokens}")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())
        return False


def test_openrouter_with_headers(api_key: str, model: str = "openai/gpt-4o-mini"):
    """Test OpenRouter API with optional app attribution headers."""
    print(f"\n{'='*70}")
    print(f"TEST 2: OpenRouter with App Attribution Headers")
    print(f"{'='*70}")
    print(f"Model: {model}")
    print()
    
    os.environ["OPENROUTER_API_KEY"] = api_key
    os.environ["OPENROUTER_HTTP_REFERER"] = "https://test-app.example.com"
    os.environ["OPENROUTER_X_TITLE"] = "Test App"
    
    try:
        from openai import OpenAI
        
        default_headers = {
            "HTTP-Referer": os.environ["OPENROUTER_HTTP_REFERER"],
            "X-Title": os.environ["OPENROUTER_X_TITLE"]
        }
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers=default_headers,
            timeout=30.0
        )
        
        print("Making API call with headers...")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": "Say 'Hello with headers!' in one sentence."}
            ],
            max_tokens=50
        )
        
        result = response.choices[0].message.content
        print(f"✅ Request with headers successful!")
        print(f"Response: {result}")
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Request with headers failed: {e}")
        print()
        return False
    finally:
        # Clean up env vars
        os.environ.pop("OPENROUTER_HTTP_REFERER", None)
        os.environ.pop("OPENROUTER_X_TITLE", None)


def test_claim_extraction(api_key: str, model: str = "openai/gpt-4o-mini"):
    """Test claim extraction using OpenRouter."""
    print(f"\n{'='*70}")
    print(f"TEST 3: Claim Extraction via OpenRouter")
    print(f"{'='*70}")
    print(f"Model: {model}")
    print()
    
    if LLMClaimExtractor is None:
        print("⚠️  Skipping claim extraction test - LLMClaimExtractor not available")
        print("   Install dependencies: pip install pyyaml")
        return False
    
    os.environ["OPENROUTER_API_KEY"] = api_key
    
    # Read example model card
    model_card_path = Path(__file__).parent.parent.parent / "apps" / "api" / "public" / "model-cards" / "example_model_card.md"
    
    if not model_card_path.exists():
        print(f"❌ Model card not found: {model_card_path}")
        print("Using minimal test model card...")
        card_text = """
# Test Model Card

This model uses logistic regression for classification.
The dataset is split into 80% training and 20% testing.
The model achieves 95% accuracy on the test set.
"""
    else:
        card_text = model_card_path.read_text()
        print(f"✓ Loaded model card ({len(card_text)} characters)")
    
    print()
    
    try:
        extractor = LLMClaimExtractor(llm_provider="openrouter", model=model)
        print(f"✓ Initialized OpenRouter claim extractor")
        print()
        
        print("Extracting claims...")
        print("-"*70)
        claims = extractor.extract_claims(card_text)
        print("-"*70)
        print()
        
        print(f"✅ Extracted {len(claims)} claims!")
        print()
        
        if claims:
            print("Claims summary:")
            for idx, claim in enumerate(claims[:5], 1):  # Show first 5
                category = claim.get("category", "unknown")
                desc = claim.get("description", "no description")[:80]
                print(f"  {idx}. [{category}] {desc}")
                if len(claim.get("description", "")) > 80:
                    print(f"     ...")
            if len(claims) > 5:
                print(f"  ... and {len(claims) - 5} more claims")
        else:
            print("⚠️  WARNING: No claims extracted!")
        
        return True
        
    except Exception as e:
        print(f"❌ Claim extraction failed: {e}")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())
        return False


def test_response_format_fallback(api_key: str, model: str = "openai/gpt-4o-mini"):
    """Test that response_format fallback works correctly."""
    print(f"\n{'='*70}")
    print(f"TEST 4: Response Format Fallback")
    print(f"{'='*70}")
    print(f"Model: {model}")
    print()
    
    os.environ["OPENROUTER_API_KEY"] = api_key
    
    try:
        from openai import OpenAI
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0
        )
        
        # Try with response_format first
        print("Testing with response_format=json_object...")
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant. Always respond with valid JSON."},
                    {"role": "user", "content": 'Return {"status": "ok"} as JSON.'}
                ],
                response_format={"type": "json_object"},
                max_tokens=50
            )
            result = response.choices[0].message.content
            print(f"✅ response_format supported!")
            print(f"Response: {result}")
            
            # Try to parse as JSON
            try:
                parsed = json.loads(result)
                print(f"✅ JSON parsing successful: {parsed}")
            except json.JSONDecodeError:
                print(f"⚠️  Response format returned but not valid JSON")
                
        except Exception as e:
            error_str = str(e).lower()
            if "response_format" in error_str or "unsupported" in error_str:
                print(f"⚠️  response_format not supported (expected for some models)")
                print(f"Error: {e}")
                print()
                print("Testing without response_format...")
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant. Always respond with valid JSON."},
                        {"role": "user", "content": 'Return {"status": "ok"} as JSON.'}
                    ],
                    max_tokens=50
                )
                result = response.choices[0].message.content
                print(f"✅ Fallback successful!")
                print(f"Response: {result}")
            else:
                raise
        
        print()
        return True
        
    except Exception as e:
        print(f"❌ Response format test failed: {e}")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())
        return False


def test_error_handling(api_key: str):
    """Test error handling for various error cases."""
    print(f"\n{'='*70}")
    print(f"TEST 5: Error Handling")
    print(f"{'='*70}")
    print()
    
    # Test with invalid API key
    print("5a. Testing with invalid API key...")
    try:
        from openai import OpenAI
        
        client = OpenAI(
            api_key="sk-or-invalid-key-12345",
            base_url="https://openrouter.ai/api/v1",
            timeout=10.0
        )
        
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=10
        )
        print("❌ Should have failed with invalid key!")
        
    except Exception as e:
        error_str = str(e).lower()
        if "401" in error_str or "unauthorized" in error_str or "invalid" in error_str:
            print(f"✅ Correctly caught authentication error: {type(e).__name__}")
        else:
            print(f"⚠️  Unexpected error type: {e}")
    
    print()
    
    # Test with invalid model
    print("5b. Testing with invalid model name...")
    os.environ["OPENROUTER_API_KEY"] = api_key
    try:
        from openai import OpenAI
        
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=10.0
        )
        
        response = client.chat.completions.create(
            model="invalid/provider-model-name",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=10
        )
        print("❌ Should have failed with invalid model!")
        
    except Exception as e:
        error_str = str(e).lower()
        if "404" in error_str or "not found" in error_str or "invalid" in error_str:
            print(f"✅ Correctly caught invalid model error: {type(e).__name__}")
        else:
            print(f"⚠️  Unexpected error type: {e}")
    
    print()
    return True


def test_multiple_models(api_key: str, models: list):
    """Test multiple OpenRouter models."""
    print(f"\n{'='*70}")
    print(f"TEST 6: Multiple Models")
    print(f"{'='*70}")
    print()
    
    os.environ["OPENROUTER_API_KEY"] = api_key
    
    results = {}
    for model in models:
        print(f"Testing model: {model}")
        try:
            from openai import OpenAI
            
            client = OpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                timeout=30.0
            )
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": "Say 'OK' in one word."}
                ],
                max_tokens=10
            )
            
            result = response.choices[0].message.content
            results[model] = {"status": "success", "response": result}
            print(f"  ✅ {model}: {result}")
            
        except Exception as e:
            results[model] = {"status": "error", "error": str(e)}
            print(f"  ❌ {model}: {e}")
        
        print()
    
    print("Summary:")
    success_count = sum(1 for r in results.values() if r["status"] == "success")
    print(f"  Successful: {success_count}/{len(models)}")
    print()
    
    return results


def main():
    """Run all OpenRouter tests."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python test_openrouter.py <openrouter-api-key> [model]")
        print()
        print("Examples:")
        print("  python test_openrouter.py sk-or-...")
        print("  python test_openrouter.py sk-or-... openai/gpt-4o")
        print("  python test_openrouter.py sk-or-... anthropic/claude-sonnet-4-5")
        print()
        print("If model is not specified, defaults to 'openai/gpt-4o-mini'")
        sys.exit(1)
    
    api_key = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "openai/gpt-4o-mini"
    
    print("\n" + "="*70)
    print("OpenRouter API Integration Test Suite")
    print("="*70)
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print(f"Default Model: {model}")
    print("="*70)
    
    results = {}
    
    # Run tests
    results["connection"] = test_openrouter_connection(api_key, model)
    results["headers"] = test_openrouter_with_headers(api_key, model)
    results["claim_extraction"] = test_claim_extraction(api_key, model)
    results["response_format"] = test_response_format_fallback(api_key, model)
    results["error_handling"] = test_error_handling(api_key)
    
    # Test multiple models if time permits
    print("\n" + "="*70)
    print("Would you like to test multiple models? (y/n)")
    print("This will make additional API calls.")
    print("="*70)
    
    # For automated testing, skip interactive prompt
    # Uncomment to enable:
    # test_models = [
    #     "openai/gpt-4o-mini",
    #     "openai/gpt-4o",
    #     "anthropic/claude-sonnet-4-5",
    # ]
    # results["multiple_models"] = test_multiple_models(api_key, test_models)
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name:20s}: {status}")
    
    print()
    print(f"Total: {passed}/{total} tests passed")
    print("="*70)
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()

