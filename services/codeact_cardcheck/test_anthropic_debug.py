#!/usr/bin/env python3
"""Test script to verify Anthropic API is working."""

import os
import sys

def test_anthropic_basic():
    """Test basic Anthropic API call."""
    print("=" * 70)
    print("Testing Anthropic API Connection")
    print("=" * 70)
    
    # Check API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("[ERROR] ANTHROPIC_API_KEY environment variable is not set!")
        print("Please set it: export ANTHROPIC_API_KEY='your-key-here'")
        return False
    
    print(f"[OK] ANTHROPIC_API_KEY is set (length: {len(api_key)} chars)")
    
    # Try importing anthropic
    try:
        import anthropic
        print(f"[OK] anthropic package imported successfully (version: {anthropic.__version__})")
    except ImportError as e:
        print(f"[ERROR] Failed to import anthropic: {e}")
        print("Install with: pip install anthropic")
        return False
    
    # Try creating client
    try:
        from anthropic import Anthropic
        print("[INFO] Creating Anthropic client...")
        client = Anthropic(api_key=api_key)
        print("[OK] Anthropic client created successfully")
    except Exception as e:
        print(f"[ERROR] Failed to create Anthropic client: {e}")
        return False
    
    # Try a simple API call
    try:
        print("\n[INFO] Making test API call with max_tokens=32000...")
        model = "claude-3-haiku-20240307"
        print(f"[INFO] Using model: {model}")
        
        response = client.messages.create(
            model=model,
            max_tokens=32000,
            temperature=0.1,
            messages=[
                {"role": "user", "content": "What is 2+2? Answer with just the number."}
            ]
        )
        
        print(f"[OK] API call successful!")
        print(f"[INFO] Response ID: {response.id}")
        print(f"[INFO] Model used: {response.model}")
        print(f"[INFO] Stop reason: {response.stop_reason}")
        print(f"[INFO] Input tokens: {response.usage.input_tokens}")
        print(f"[INFO] Output tokens: {response.usage.output_tokens}")
        
        content = response.content[0].text
        print(f"[INFO] Response: {content}")
        print(f"[INFO] Response length: {len(content)} chars")
        
        print("\n" + "=" * 70)
        print("[SUCCESS] Anthropic API is working correctly!")
        print("=" * 70)
        return True
        
    except Exception as e:
        print(f"\n[ERROR] API call failed: {type(e).__name__}: {e}")
        import traceback
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        print("\n" + "=" * 70)
        print("[FAILED] Anthropic API test failed")
        print("=" * 70)
        return False


def test_with_tools():
    """Test using the actual tool classes."""
    print("\n" + "=" * 70)
    print("Testing LLMExtractorTool with Anthropic")
    print("=" * 70)
    
    try:
        from tools.llm_extractor_tool import LLMExtractorTool
        
        print("[INFO] Creating LLMExtractorTool with anthropic provider...")
        tool = LLMExtractorTool(llm_provider="anthropic")
        
        if not tool.client:
            print("[ERROR] LLMExtractorTool client is None!")
            return False
        
        print(f"[OK] Tool initialized with model: {tool.model}")
        
        # Test simple extraction
        print("\n[INFO] Testing metric extraction...")
        result = tool._extract_with_anthropic("""
Extract metrics from this text:
"The model achieved an accuracy of 0.95 and AUC of 0.87"

Return JSON like: {"accuracy": 0.95, "auc": 0.87}
""")
        
        print(f"[INFO] Extraction result: {result}")
        
        if result and isinstance(result, dict):
            print("[SUCCESS] LLMExtractorTool is working!")
            return True
        else:
            print("[WARNING] Extraction returned empty or invalid result")
            return False
            
    except Exception as e:
        print(f"[ERROR] Tool test failed: {e}")
        import traceback
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        return False


if __name__ == "__main__":
    print("\nAnthro API Debug Test")
    print("This script tests if Anthropic API calls are working.\n")
    
    success = test_anthropic_basic()
    
    if success:
        test_with_tools()
    
    sys.exit(0 if success else 1)

