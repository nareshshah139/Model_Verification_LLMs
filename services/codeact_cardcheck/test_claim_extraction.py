#!/usr/bin/env python3
"""Test claim extraction with your model card."""

import os
import sys
from pathlib import Path

# Add tools to path
sys.path.insert(0, str(Path(__file__).parent))

from tools.llm_claim_extractor import LLMClaimExtractor

def test_extraction(api_key: str, llm_provider: str = "anthropic"):
    """Test claim extraction."""
    
    # Set API key
    if llm_provider == "openai":
        os.environ["OPENAI_API_KEY"] = api_key
    else:
        os.environ["ANTHROPIC_API_KEY"] = api_key
    
    print(f"Testing claim extraction with {llm_provider}...")
    print("="*60)
    
    # Read example model card
    model_card_path = Path("/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/apps/api/public/model-cards/example_model_card.md")
    
    if not model_card_path.exists():
        print(f"❌ Model card not found: {model_card_path}")
        return
    
    card_text = model_card_path.read_text()
    print(f"✓ Loaded model card ({len(card_text)} characters)")
    print()
    
    # Extract claims
    try:
        extractor = LLMClaimExtractor(llm_provider=llm_provider)
        print(f"✓ Initialized {llm_provider} claim extractor")
        print()
        
        print("Calling LLM to extract claims...")
        print("-"*60)
        claims = extractor.extract_claims(card_text)
        print("-"*60)
        print()
        
        print(f"✅ Extracted {len(claims)} claims!")
        print()
        
        if claims:
            print("Claims summary:")
            for idx, claim in enumerate(claims, 1):
                category = claim.get("category", "unknown")
                desc = claim.get("description", "no description")[:80]
                print(f"  {idx}. [{category}] {desc}")
                if len(claim.get("description", "")) > 80:
                    print(f"     ...")
        else:
            print("⚠️  WARNING: No claims extracted!")
            print()
            print("Possible reasons:")
            print("  1. API key doesn't have access to the model")
            print("  2. Rate limit hit")
            print("  3. LLM returned empty array")
            print("  4. Billing/credits issue")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print()
        print("Full traceback:")
        print(traceback.format_exc())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python test_claim_extraction.py <api-key> [provider]")
        print()
        print("Examples:")
        print("  python test_claim_extraction.py sk-ant-... anthropic")
        print("  python test_claim_extraction.py sk-proj-... openai")
        print()
        print("Provider defaults to 'anthropic' if not specified")
        sys.exit(1)
    
    api_key = sys.argv[1]
    provider = sys.argv[2] if len(sys.argv) > 2 else "anthropic"
    
    test_extraction(api_key, provider)

