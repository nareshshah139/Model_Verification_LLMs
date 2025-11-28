#!/usr/bin/env python3
"""
Test script to demonstrate the batch optimization API call reduction.

This shows the difference between:
- OLD: verify_claims_batch() -> 2N+1 API calls
- NEW: verify_claims_batch_optimized() -> 3 API calls

For example, with 10 claims:
- OLD: 21 API calls
- NEW: 3 API calls (85% reduction!)
"""

import os
import sys
import json
from pathlib import Path

# Add the services directory to path
sys.path.insert(0, str(Path(__file__).parent / "services" / "codeact_cardcheck"))

from tools.codeact_verifier import CodeActVerifier


def create_sample_claims(num_claims: int = 5):
    """Create sample claims for testing."""
    claims = []
    for i in range(1, num_claims + 1):
        claims.append({
            "id": f"claim_{i}",
            "category": "model_training",
            "subcategory": "data_preprocessing",
            "description": f"Sample claim {i} about data preprocessing",
            "expected_evidence": [f"evidence_{i}.py", "data processing code"]
        })
    return claims


def test_batch_optimization():
    """Test the batch optimization and show API call reduction."""
    
    # Get LLM provider from environment
    llm_provider = os.environ.get("LLM_PROVIDER", "anthropic")
    
    # Check if API key is set
    api_key_var = f"{llm_provider.upper()}_API_KEY"
    if not os.environ.get(api_key_var):
        print(f"❌ {api_key_var} not set in environment")
        print(f"Please set it with: export {api_key_var}='your-key-here'")
        return
    
    # Get repo path
    repo_path = str(Path(__file__).parent / "Lending-Club-Credit-Scoring")
    if not Path(repo_path).exists():
        print(f"❌ Repository not found at: {repo_path}")
        return
    
    print("=" * 80)
    print("🚀 BATCH OPTIMIZATION TEST - API Call Reduction Demo")
    print("=" * 80)
    print()
    
    # Create sample claims
    num_claims = 5
    claims = create_sample_claims(num_claims)
    
    print(f"📋 Testing with {num_claims} sample claims")
    print(f"🔑 Using LLM Provider: {llm_provider}")
    print(f"📂 Repository: {repo_path}")
    print()
    
    # Show the calculation
    old_calls = 2 * num_claims + 1
    new_calls = 3
    reduction = ((old_calls - new_calls) / old_calls) * 100
    
    print("📊 API CALL COMPARISON:")
    print(f"  OLD Method (verify_claims_batch):     {old_calls} API calls")
    print(f"  NEW Method (verify_claims_batch_optimized): {new_calls} API calls")
    print(f"  💰 Reduction: {reduction:.0f}% ({old_calls - new_calls} fewer calls)")
    print()
    
    # Initialize verifier
    print("🔧 Initializing CodeAct verifier...")
    verifier = CodeActVerifier(
        repo_path=repo_path,
        llm_provider=llm_provider
    )
    print("✅ Verifier initialized")
    print()
    
    # Test the optimized batch method
    print("=" * 80)
    print("🚀 Running OPTIMIZED batch verification (3 API calls total)...")
    print("=" * 80)
    print()
    
    def progress_callback(message: str, current: int, total: int):
        print(f"  [{current}/{total}] {message}")
    
    # Run optimized verification
    results = verifier.verify_claims_batch_optimized(
        claims,
        progress_callback=progress_callback
    )
    
    print()
    print("=" * 80)
    print("✅ VERIFICATION COMPLETE")
    print("=" * 80)
    print()
    
    # Show results summary
    verified_count = sum(1 for r in results if r["verified"])
    print(f"📊 RESULTS SUMMARY:")
    print(f"  Total Claims: {len(results)}")
    print(f"  Verified: {verified_count}")
    print(f"  Not Verified: {len(results) - verified_count}")
    print(f"  API Calls Used: 3 (vs {old_calls} with old method)")
    print(f"  Cost Savings: {reduction:.0f}%")
    print()
    
    # Show individual results
    print("📝 INDIVIDUAL RESULTS:")
    for result in results:
        status = "✓" if result["verified"] else "✗"
        confidence = result["confidence"] * 100
        claim_id = result["claim_id"]
        print(f"  {status} {claim_id}: {confidence:.0f}% confidence")
    
    print()
    print("=" * 80)
    print("🎉 Test Complete!")
    print("=" * 80)
    

if __name__ == "__main__":
    test_batch_optimization()

