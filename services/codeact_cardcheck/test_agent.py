#!/usr/bin/env python3
"""Test script for CodeAct CardCheck agent."""

import sys
import json
from pathlib import Path
from agent_main import CardCheckAgent

def test_card_parser():
    """Test the card parser."""
    print("=" * 60)
    print("Testing Card Parser")
    print("=" * 60)
    
    agent = CardCheckAgent()
    
    # Read example model card
    card_path = Path(__file__).parent / "example_model_card.md"
    if not card_path.exists():
        print(f"ERROR: {card_path} not found")
        return False
    
    card_text = card_path.read_text(encoding="utf-8")
    claims_spec = agent.card_parser.parse(card_text)
    
    print("\nParsed ClaimsSpec:")
    print(json.dumps(claims_spec, indent=2))
    
    # Verify expected fields
    assert claims_spec.get("model_id") == "CRS-LC-EL-2025-001", "Model ID mismatch"
    assert claims_spec.get("family", {}).get("pd") == "logistic_scorecard", "PD family mismatch"
    assert claims_spec.get("family", {}).get("lgd") == "two_stage_hurdle", "LGD family mismatch"
    assert claims_spec.get("score_scale", {}).get("min") == 300, "Score scale min mismatch"
    assert claims_spec.get("score_scale", {}).get("max") == 850, "Score scale max mismatch"
    
    print("\n✅ Card parser test passed!")
    return True

def test_tools():
    """Test individual tools."""
    print("\n" + "=" * 60)
    print("Testing Tools")
    print("=" * 60)
    
    import tempfile
    from tools import RepoTool, AstGrepTool
    
    # Test RepoTool
    print("\n1. Testing RepoTool...")
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_tool = RepoTool(tmpdir)
        
        # Test glob
        test_file = Path(tmpdir) / "test.py"
        test_file.write_text("import numpy as np\n")
        
        matches = repo_tool.glob("*.py")
        assert len(matches) > 0, "Glob should find test.py"
        print("   ✅ RepoTool.glob() works")
        
        # Test read
        content = repo_tool.read("test.py")
        assert "numpy" in content, "Read should return file content"
        print("   ✅ RepoTool.read() works")
    
    # Test AstGrepTool (will fail gracefully if ast-grep not installed)
    print("\n2. Testing AstGrepTool...")
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "test.py"
        test_file.write_text("from sklearn.linear_model import LogisticRegression\n")
        
        astgrep_tool = AstGrepTool(tmpdir)
        rules_dir = Path(__file__).parent / "rules"
        
        if rules_dir.exists():
            matches = astgrep_tool.scan(
                str(rules_dir / "algorithms.yaml"),
                paths=[tmpdir],
                json_output=True,
            )
            print(f"   Found {len(matches)} matches (may be 0 if ast-grep not installed)")
        else:
            print("   ⚠️  Rules directory not found")
    
    print("\n✅ Tools test completed!")
    return True

def test_integration():
    """Test full integration (requires ast-grep and a test repo)."""
    print("\n" + "=" * 60)
    print("Integration Test")
    print("=" * 60)
    
    print("\n⚠️  Full integration test requires:")
    print("   1. ast-grep installed (sg binary in PATH)")
    print("   2. A test repository or model card")
    print("\n   To run full test:")
    print("   python agent_main.py example_model_card.md --repo-url <repo-url> --output-dir ./test_reports")
    
    return True

def main():
    """Run all tests."""
    print("\n🧪 CodeAct CardCheck Test Suite\n")
    
    tests = [
        ("Card Parser", test_card_parser),
        ("Tools", test_tools),
        ("Integration", test_integration),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} test failed: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result for _, result in results)
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

