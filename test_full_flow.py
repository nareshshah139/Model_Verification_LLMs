#!/usr/bin/env python3
"""
Test the full end-to-end flow:
1. Extract claims from model card using Claude 4.5 Sonnet
2. Verify claims against notebooks using CodeAct with Claude 4.5 Sonnet
"""

import os
import sys
import json
import requests
import time
from pathlib import Path
from typing import Dict, Any, List

# Load environment variables from .env file
from dotenv import load_dotenv
project_root = Path(__file__).parent
load_dotenv(project_root / ".env")

# Configuration
CODEACT_API_URL = "http://localhost:8001"
MODEL_CARD_PATH = "/tmp/model_card_text.txt"
NOTEBOOKS_DIR = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring/notebooks"
REPO_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"

# LLM Configuration
LLM_PROVIDER = "anthropic"
LLM_MODEL = "claude-sonnet-4-20250514"

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text: str):
    """Print a formatted header."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")


def print_section(text: str):
    """Print a formatted section header."""
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}{'─'*80}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}► {text}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}{'─'*80}{Colors.ENDC}\n")


def print_success(text: str):
    """Print success message."""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")


def print_error(text: str):
    """Print error message."""
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    """Print info message."""
    print(f"{Colors.OKBLUE}ℹ {text}{Colors.ENDC}")


def print_warning(text: str):
    """Print warning message."""
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")


def check_health() -> bool:
    """Check if the CodeAct API is healthy."""
    try:
        response = requests.get(f"{CODEACT_API_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"CodeAct API is healthy")
            print_info(f"  Service: {data.get('service')}")
            print_info(f"  Version: {data.get('version')}")
            print_info(f"  Python: {data.get('python_version', '').split()[0]}")
            print_info(f"  OpenAI: {data.get('dependencies', {}).get('openai', 'N/A')}")
            print_info(f"  Anthropic: {data.get('dependencies', {}).get('anthropic', 'N/A')}")
            
            env = data.get('env', {})
            print_info(f"  API Keys:")
            print_info(f"    - OpenAI: {'✓' if env.get('has_openai_key') else '✗'}")
            print_info(f"    - Anthropic: {'✓' if env.get('has_anthropic_key') else '✗'}")
            print_info(f"    - OpenRouter: {'✓' if env.get('has_openrouter_key') else '✗'}")
            return True
        else:
            print_error(f"API returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to connect to CodeAct API: {e}")
        return False


def read_model_card() -> str:
    """Read the model card text."""
    try:
        with open(MODEL_CARD_PATH, 'r', encoding='utf-8') as f:
            text = f.read()
        print_success(f"Read model card: {len(text)} characters")
        return text
    except Exception as e:
        print_error(f"Failed to read model card: {e}")
        sys.exit(1)


def list_notebooks() -> List[str]:
    """List all notebooks in the directory."""
    try:
        notebooks = list(Path(NOTEBOOKS_DIR).glob("*.ipynb"))
        print_success(f"Found {len(notebooks)} notebooks:")
        for nb in notebooks:
            print_info(f"  - {nb.name}")
        return [str(nb) for nb in notebooks]
    except Exception as e:
        print_error(f"Failed to list notebooks: {e}")
        sys.exit(1)


def extract_claims(model_card_text: str) -> List[Dict[str, Any]]:
    """Extract claims from model card using LLM."""
    print_section("STEP 1: EXTRACTING CLAIMS FROM MODEL CARD")
    print_info(f"Using {LLM_PROVIDER} / {LLM_MODEL}")
    print_info("This may take a minute...")
    
    # For this test, we'll use the CodeAct verifier which includes claim extraction
    # So we'll skip this step and let the verifier do it all in one go
    print_warning("Skipping separate claim extraction - will be done by verifier")
    return []


def verify_with_codeact(model_card_text: str) -> Dict[str, Any]:
    """Run CodeAct verification on the model card and notebooks."""
    print_section("STEP 2: VERIFYING CLAIMS WITH CODEACT")
    print_info(f"Using {LLM_PROVIDER} / {LLM_MODEL}")
    print_info(f"Repository: {REPO_PATH}")
    print_info("This will take several minutes...")
    
    # Get API key from environment
    api_key = None
    if LLM_PROVIDER == "anthropic":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
    elif LLM_PROVIDER == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
    elif LLM_PROVIDER == "openrouter":
        api_key = os.environ.get("OPENROUTER_API_KEY")
    
    if not api_key:
        print_error(f"No API key found for {LLM_PROVIDER}")
        sys.exit(1)
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key,
        "X-LLM-Provider": LLM_PROVIDER,
        "X-LLM-Model": LLM_MODEL,
    }
    
    payload = {
        "model_card_text": model_card_text,
        "repo_path": REPO_PATH,
        "runtime_enabled": False,
        "sg_binary": "sg",
        "llm_provider": LLM_PROVIDER,
        "llm_model": LLM_MODEL,
    }
    
    try:
        # Use streaming endpoint for progress updates
        response = requests.post(
            f"{CODEACT_API_URL}/verify/codeact/stream",
            json=payload,
            headers=headers,
            stream=True,
            timeout=1800,  # 30 minutes timeout
        )
        
        if response.status_code != 200:
            print_error(f"API returned status {response.status_code}")
            print_error(response.text)
            sys.exit(1)
        
        # Process SSE stream
        print("\n" + "─"*80)
        report = None
        line_buffer = ""
        
        for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
            if chunk:
                line_buffer += chunk
                while '\n' in line_buffer:
                    line, line_buffer = line_buffer.split('\n', 1)
                    
                    if line.startswith('data: '):
                        data_str = line[6:]  # Remove 'data: ' prefix
                        try:
                            data = json.loads(data_str)
                            
                            if data.get('type') == 'progress':
                                message = data.get('message', '')
                                extra_data = data.get('data', {})
                                
                                # Format progress message
                                if 'step' in extra_data:
                                    step = extra_data['step']
                                    print(f"{Colors.OKCYAN}[{step}]{Colors.ENDC} {message}")
                                else:
                                    print(f"{Colors.OKBLUE}▸{Colors.ENDC} {message}")
                                
                                # Print additional data if available
                                if 'claims_count' in extra_data:
                                    print_info(f"  Claims: {extra_data['claims_count']}")
                                if 'verification_results_count' in extra_data:
                                    print_info(f"  Verification results: {extra_data['verification_results_count']}")
                                
                            elif data.get('type') == 'complete':
                                report = data.get('report')
                                print_success("\nVerification complete!")
                                break
                                
                            elif data.get('type') == 'error':
                                error_msg = data.get('message', 'Unknown error')
                                print_error(f"\nVerification failed: {error_msg}")
                                sys.exit(1)
                                
                        except json.JSONDecodeError:
                            pass  # Skip malformed JSON
                    elif line.startswith(': '):
                        # Keep-alive ping, ignore
                        pass
        
        print("─"*80 + "\n")
        
        if not report:
            print_error("No report received from verification")
            sys.exit(1)
        
        return report
        
    except Exception as e:
        print_error(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def display_results(report: Dict[str, Any]):
    """Display verification results."""
    print_section("STEP 3: VERIFICATION RESULTS")
    
    # Summary
    claims = report.get('claims', [])
    verification_results = report.get('verification_results', [])
    
    print(f"{Colors.BOLD}Summary:{Colors.ENDC}")
    print_info(f"Total claims extracted: {len(claims)}")
    print_info(f"Claims verified: {len(verification_results)}")
    
    # Verification breakdown
    if verification_results:
        verified = sum(1 for r in verification_results if r.get('verified', False))
        not_verified = len(verification_results) - verified
        
        print(f"\n{Colors.BOLD}Verification Breakdown:{Colors.ENDC}")
        print(f"  {Colors.OKGREEN}✓ Verified: {verified}{Colors.ENDC}")
        print(f"  {Colors.FAIL}✗ Not Verified: {not_verified}{Colors.ENDC}")
    
    # Detailed results
    print(f"\n{Colors.BOLD}Detailed Results:{Colors.ENDC}")
    print("─"*80)
    
    for i, result in enumerate(verification_results, 1):
        claim_text = result.get('claim', 'N/A')
        verified = result.get('verified', False)
        evidence = result.get('evidence', 'No evidence')
        
        status_icon = "✓" if verified else "✗"
        status_color = Colors.OKGREEN if verified else Colors.FAIL
        
        print(f"\n{status_color}{Colors.BOLD}{status_icon} Claim {i}:{Colors.ENDC}")
        print(f"  {claim_text[:200]}{'...' if len(claim_text) > 200 else ''}")
        print(f"\n  {Colors.BOLD}Evidence:{Colors.ENDC}")
        evidence_preview = evidence[:300] if evidence else "No evidence provided"
        print(f"  {evidence_preview}{'...' if len(evidence) > 300 else ''}")
        print("─"*80)
    
    # Save full report
    output_file = "/tmp/verification_report.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    print(f"\n{Colors.OKGREEN}Full report saved to: {output_file}{Colors.ENDC}")


def main():
    """Main test function."""
    print_header("FULL END-TO-END TEST: CLAIMS EXTRACTION + CODEACT VERIFICATION")
    
    print_info(f"Model Card: {MODEL_CARD_PATH}")
    print_info(f"Repository: {REPO_PATH}")
    print_info(f"Notebooks Directory: {NOTEBOOKS_DIR}")
    print_info(f"LLM Provider: {LLM_PROVIDER}")
    print_info(f"LLM Model: {LLM_MODEL}")
    
    # Check API health
    print_section("STEP 0: CHECKING API HEALTH")
    if not check_health():
        print_error("API is not healthy. Please start the services.")
        sys.exit(1)
    
    # Read model card
    print_section("READING MODEL CARD")
    model_card_text = read_model_card()
    
    # List notebooks
    print_section("LISTING NOTEBOOKS")
    notebooks = list_notebooks()
    
    # Run verification with CodeAct (includes claim extraction)
    start_time = time.time()
    report = verify_with_codeact(model_card_text)
    end_time = time.time()
    
    # Display results
    display_results(report)
    
    # Summary
    print_section("TEST COMPLETE")
    duration = end_time - start_time
    print_success(f"Total execution time: {duration:.2f} seconds ({duration/60:.2f} minutes)")
    
    claims_count = len(report.get('claims', []))
    verified_count = sum(1 for r in report.get('verification_results', []) if r.get('verified', False))
    total_results = len(report.get('verification_results', []))
    
    print_info(f"Claims extracted: {claims_count}")
    print_info(f"Verification results: {total_results}")
    print_info(f"Verified claims: {verified_count}")
    
    if verified_count > 0:
        print_success(f"\n✓ Test completed successfully!")
    else:
        print_warning(f"\n⚠ Test completed but no claims were verified")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print_error(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

