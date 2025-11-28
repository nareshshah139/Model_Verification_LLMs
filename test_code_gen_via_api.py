#!/usr/bin/env python3
"""Test code generation via direct API call"""

import json
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# Small batch of claims to test
test_claims = [
    {
        "id": "claim_1",
        "category": "algorithm",
        "claim_type": "model_family",
        "description": "PD model uses Logistic Regression",
        "verification_strategy": "Search for LogisticRegression usage",
        "search_queries": ["LogisticRegression", "sklearn.linear_model"],
        "expected_evidence": "LogisticRegression import and instantiation"
    },
    {
        "id": "claim_2",
        "category": "metric",
        "claim_type": "performance_metric",
        "description": "Model reports AUC metric",
        "verification_strategy": "Search for AUC calculations",
        "search_queries": ["auc", "roc_auc_score"],
        "expected_evidence": "AUC calculation code"
    }
]

# Model card text (minimal)
model_card_text = """
# Credit Risk Model

## Model Details
- PD model uses Logistic Regression
- Model reports AUC metric
"""

CODEACT_API_URL = "http://localhost:8001"
REPO_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"

print("="*100)
print("TESTING CODE GENERATION VIA API (2 claims only)")
print("="*100)

# Get API key
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("❌ ANTHROPIC_API_KEY not set")
    exit(1)

headers = {
    "Content-Type": "application/json",
    "X-API-Key": api_key,
    "X-LLM-Provider": "anthropic",
    "X-LLM-Model": "claude-sonnet-4-20250514",
}

payload = {
    "model_card_text": model_card_text,
    "repo_path": REPO_PATH,
    "runtime_enabled": False,
    "sg_binary": "sg",
    "llm_provider": "anthropic",
    "llm_model": "claude-sonnet-4-20250514",
}

print(f"\nSending verification request for 2 simple claims...")
print(f"Repository: {REPO_PATH}")
print(f"Using: anthropic / claude-sonnet-4-20250514\n")

try:
    response = requests.post(
        f"{CODEACT_API_URL}/verify/codeact/stream",
        json=payload,
        headers=headers,
        stream=True,
        timeout=300,
    )
    
    if response.status_code != 200:
        print(f"❌ API returned status {response.status_code}")
        print(response.text)
        exit(1)
    
    # Process SSE stream
    report = None
    for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
        if chunk and chunk.startswith('data: '):
            data_str = chunk[6:]
            try:
                data = json.loads(data_str)
                if data.get('type') == 'complete':
                    report = data.get('report')
                    break
            except json.JSONDecodeError:
                pass
    
    if report:
        print("\n" + "="*100)
        print("VERIFICATION RESULTS")
        print("="*100)
        
        verification_results = report.get('verification_results', [])
        print(f"\nTotal results: {len(verification_results)}")
        print(f"Verified: {sum(1 for r in verification_results if r.get('verified', False))}")
        
        # Show first few results with generated code
        for i, result in enumerate(verification_results[:5], 1):
            print(f"\n{'-'*100}")
            print(f"Result {i}:")
            print(f"Claim: {result.get('claim', {}).get('description', 'N/A')}")
            print(f"Verified: {result.get('verified', False)}")
            print(f"\nGenerated Code:")
            code = result.get('code', 'No code available')
            print(code[:500])  # Show first 500 chars
            if len(code) > 500:
                print(f"... ({len(code) - 500} more chars)")
            
            if "Code generation failed" in code:
                print("\n❌ This is fallback code!")
            else:
                print("\n✓ Code was generated")
    else:
        print("❌ No report received")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

