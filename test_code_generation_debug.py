#!/usr/bin/env python3
"""Debug code generation with a small batch of claims"""

import os
import json
from dotenv import load_dotenv
from pathlib import Path

# Load environment
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# Import the verifier
import sys
sys.path.insert(0, str(Path(__file__).parent / "services" / "codeact_cardcheck"))
from tools.codeact_verifier import CodeActVerifier

# Test with just 3 claims
test_claims = [
    {
        "id": "claim_1",
        "category": "metric",
        "claim_type": "benchmark_threshold",
        "description": "AUC (ROC) benchmark threshold is greater than 0.65",
        "verification_strategy": "Search for AUC calculations and threshold comparisons in evaluation code",
        "search_queries": ["auc", "roc_auc", "0.65", "benchmark", "threshold"],
        "expected_evidence": "AUC calculation code with comparison to 0.65 threshold",
        "verified": None,
        "evidence": []
    },
    {
        "id": "claim_2",
        "category": "metric",
        "claim_type": "benchmark_threshold",
        "description": "Gini Coefficient benchmark threshold is greater than 0.30",
        "verification_strategy": "Search for Gini coefficient calculations and comparisons",
        "search_queries": ["gini", "0.30", "0.3"],
        "expected_evidence": "Gini calculation with threshold comparison",
        "verified": None,
        "evidence": []
    },
    {
        "id": "claim_3",
        "category": "algorithm",
        "claim_type": "model_family",
        "description": "PD model uses Logistic Regression",
        "verification_strategy": "Search for LogisticRegression usage",
        "search_queries": ["LogisticRegression", "sklearn.linear_model"],
        "expected_evidence": "LogisticRegression import and instantiation",
        "verified": None,
        "evidence": []
    }
]

# Initialize verifier
repo_path = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"
print(f"Initializing verifier with repository: {repo_path}")
print(f"Using LLM: anthropic / claude-sonnet-4-20250514")
print()

verifier = CodeActVerifier(
    repo_path=repo_path,
    llm_provider="anthropic",
    model="claude-sonnet-4-20250514"
)

# Test code generation
print("="*100)
print("TESTING BATCH CODE GENERATION")
print("="*100)
print(f"Generating code for {len(test_claims)} claims...")
print()

try:
    codes = verifier._generate_verification_code_batch(test_claims)
    
    print(f"\n✓ Generated {len(codes)} code snippets")
    print("\n" + "="*100)
    
    for i, (claim, code) in enumerate(zip(test_claims, codes), 1):
        print(f"\nClaim {i}: {claim['description']}")
        print(f"\nGenerated Code:")
        print("-"*80)
        print(code)
        print("-"*80)
        
        # Check if it's the fallback code
        if "Code generation failed" in code:
            print("❌ This is fallback code - generation failed!")
        else:
            print("✓ Code generated successfully")
    
    print("\n" + "="*100)
    print("TEST COMPLETE")
    print("="*100)
    
except Exception as e:
    print(f"\n❌ Error during code generation: {e}")
    import traceback
    traceback.print_exc()

