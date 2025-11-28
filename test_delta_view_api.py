#!/usr/bin/env python3
"""
Test script for Delta View drift detection API
Tests the /api/analyze-drift endpoint with sample notebooks
"""

import json
import requests
from pathlib import Path

# Configuration
API_URL = "http://localhost:3000/api/analyze-drift"
REPO_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"
BASELINE_PATH = "notebooks/3_pd_modeling.ipynb"

def create_test_notebook():
    """Create a simple test notebook with intentional drifts"""
    return {
        "cells": [
            {
                "cell_type": "code",
                "source": [
                    "# Modified preprocessing - using one-hot encoding instead of WOE\n",
                    "import pandas as pd\n",
                    "X_encoded = pd.get_dummies(X_train, drop_first=True)\n",
                    "# Changed target encoding\n",
                    "y = df['default'].map({0: 1, 1: 0})  # Inverted labels!\n"
                ]
            },
            {
                "cell_type": "code",
                "source": [
                    "# Using different score scale\n",
                    "score_min = 300\n",
                    "score_max = 850  # Changed from 900\n",
                    "roi_threshold = 0.0215  # Changed from 0.03\n"
                ]
            },
            {
                "cell_type": "code",
                "source": [
                    "# LGD calculation changed\n",
                    "recovery_rate = recoveries / funded_amount  # Using funded instead of UPB\n",
                    "lgd = 1 - recovery_rate\n"
                ]
            },
            {
                "cell_type": "markdown",
                "source": [
                    "# Model Documentation\n",
                    "This notebook implements PD modeling with modified preprocessing."
                ]
            }
        ],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }

def test_drift_analysis():
    """Test the drift analysis API"""
    
    print("=" * 60)
    print("DELTA VIEW API TEST")
    print("=" * 60)
    
    # Create test notebook
    print("\n1. Creating test notebook with intentional drifts...")
    modified_notebook = create_test_notebook()
    print("   ✓ Test notebook created")
    
    # Prepare request
    print("\n2. Preparing API request...")
    payload = {
        "baselinePath": BASELINE_PATH,
        "modifiedNotebook": modified_notebook,
        "repoPath": REPO_PATH
    }
    print(f"   - Baseline: {BASELINE_PATH}")
    print(f"   - Repo: {REPO_PATH}")
    
    # Make request
    print("\n3. Calling drift analysis API...")
    try:
        response = requests.post(API_URL, json=payload, timeout=30)
        print(f"   - Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ✗ Error: {response.text}")
            return False
        
        results = response.json()
        print("   ✓ API call successful")
        
        # Analyze results
        print("\n4. Analysis Results:")
        print("   " + "-" * 56)
        print(f"   Total Changes Detected: {results['totalChanges']}")
        print(f"   T1 (Critical):          {results['summary']['t1Count']}")
        print(f"   T2 (Significant):       {results['summary']['t2Count']}")
        print(f"   T3 (Minor):             {results['summary']['t3Count']}")
        
        if results['affectedCategories']:
            print(f"\n   Affected Categories:")
            for cat in results['affectedCategories']:
                print(f"   - {cat}")
        
        # Code comparison
        if 'codeComparison' in results:
            comp = results['codeComparison']
            print(f"\n   Code Changes:")
            print(f"   - Lines Added:    +{comp['addedLines']}")
            print(f"   - Lines Removed:  -{comp['removedLines']}")
            print(f"   - Cells Modified:  {comp['modifiedCells']}")
        
        # Show detected drifts
        print(f"\n5. Detected Drifts ({len(results['drifts'])} total):")
        print("   " + "-" * 56)
        
        detected_drifts = [d for d in results['drifts'] if d['detected']]
        
        if not detected_drifts:
            print("   No drifts detected")
        else:
            for drift in detected_drifts[:5]:  # Show first 5
                tier_emoji = {"T1": "🔴", "T2": "🟠", "T3": "🔵"}.get(drift['materialityTier'], "⚪")
                print(f"\n   {tier_emoji} [{drift['materialityTier']}] {drift['name']}")
                print(f"      Severity: {drift.get('severity', 'unknown')}")
                if drift.get('evidence'):
                    print(f"      Evidence: {len(drift['evidence'])} snippets found")
                    for i, ev in enumerate(drift['evidence'][:2], 1):
                        print(f"        {i}. {ev[:60]}...")
        
        print("\n" + "=" * 60)
        print("TEST COMPLETED SUCCESSFULLY ✓")
        print("=" * 60)
        
        # Save results to file
        output_file = "test_delta_view_results.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {output_file}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("   ✗ Error: Could not connect to API")
        print("   Make sure the Next.js server is running on port 3000")
        print("   Run: cd apps/api && pnpm dev")
        return False
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
        return False

def test_expected_drifts():
    """Verify that expected drifts are detected"""
    
    print("\n\n" + "=" * 60)
    print("EXPECTED DRIFT VALIDATION")
    print("=" * 60)
    
    expected_drifts = [
        ("Label coding", "T1", ["target", "default", "map"]),
        ("PD preprocessing", "T2", ["one-hot", "get_dummies"]),
        ("Score scale, bands, ROI floor", "T1", ["850", "roi", "threshold"]),
        ("LGD definition/algorithm", "T1", ["recovery", "funded", "lgd"]),
    ]
    
    print("\nExpected drifts in test notebook:")
    for name, tier, keywords in expected_drifts:
        tier_emoji = {"T1": "🔴", "T2": "🟠", "T3": "🔵"}[tier]
        print(f"  {tier_emoji} [{tier}] {name}")
        print(f"      Keywords: {', '.join(keywords)}")
    
    print("\nThese drifts should be detected by the analysis.")

if __name__ == "__main__":
    print("\n🔍 Delta View API Test Suite\n")
    
    # Show expected drifts first
    test_expected_drifts()
    
    # Run API test
    success = test_drift_analysis()
    
    if success:
        print("\n✅ All tests passed!")
        print("\n💡 Next steps:")
        print("   1. Open http://localhost:3000/dashboard/delta")
        print("   2. Select 'PD Modeling' as baseline")
        print("   3. Upload a modified notebook")
        print("   4. Review the drift analysis results")
    else:
        print("\n❌ Tests failed")
        print("   Please check the error messages above")

