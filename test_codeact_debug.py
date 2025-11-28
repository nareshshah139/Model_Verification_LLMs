#!/usr/bin/env python3
"""
Debug test for CodeAct verification - check why code generation is failing
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv(Path(__file__).parent / ".env")

# Add services to path
sys.path.insert(0, str(Path(__file__).parent / "services" / "codeact_cardcheck"))

from tools.codeact_verifier import CodeActVerifier

# Test repository
REPO_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"

# Create just 3 simple claims for testing
test_claims = [
    {
        "id": "claim_1",
        "category": "algorithm",
        "description": "PD model uses logistic regression",
        "expected_evidence": "LogisticRegression usage in code"
    },
    {
        "id": "claim_2",
        "category": "data",
        "description": "Training set uses 2007-2013 vintages",
        "expected_evidence": "Data filtering by year ranges"
    },
    {
        "id": "claim_3",
        "category": "metric",
        "description": "Model reports AUC metric",
        "expected_evidence": "AUC calculation in notebooks"
    }
]

print(f"Testing CodeAct verification with {len(test_claims)} claims...")
print(f"Repository: {REPO_PATH}\n")

# Initialize verifier
verifier = CodeActVerifier(
    repo_path=REPO_PATH,
    llm_provider="anthropic",
    model="claude-sonnet-4-20250514"
)

# Generate codes (this is step 1 that's failing)
print("Step 1: Generating verification codes...")
try:
    codes = verifier._generate_verification_code_batch(test_claims)
    print(f"✓ Generated {len(codes)} code snippets\n")
    
    for i, code in enumerate(codes, 1):
        print(f"Code {i}:")
        print("-" * 80)
        print(code[:500])  # Show first 500 chars
        if len(code) > 500:
            print(f"... ({len(code) - 500} more chars)")
        print()
        
except Exception as e:
    print(f"✗ Code generation failed: {e}")
    import traceback
    traceback.print_exc()

