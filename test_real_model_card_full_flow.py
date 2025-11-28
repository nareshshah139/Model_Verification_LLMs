#!/usr/bin/env python3
"""
Full End-to-End Test with Real Model Card and Notebooks

This script tests the complete flow:
1. Convert DOCX model card to text
2. Extract claims using Claude 4.5 Sonnet
3. Verify claims against real notebooks using CodeAct with Claude 4.5 Sonnet
4. Display all intermediate outputs to terminal

Model Card: Lending-Club-Credit-Scoring/Model Card - Credit Risk Scoring Model - Expected Loss.docx
Notebooks:
  - 1_data_cleaning_understanding.ipynb
  - 2_eda.ipynb
  - 3_pd_modeling.ipynb
  - 4_lgd_ead_modeling.ipynb
  - 5_pd_model_monitoring.ipynb
"""

import os
import sys
import json
import requests
import time
from pathlib import Path
from typing import Dict, Any, List
import subprocess

# Load environment variables from .env file
from dotenv import load_dotenv
project_root = Path(__file__).parent
env_file = project_root / ".env"
if env_file.exists():
    load_dotenv(env_file)
    print(f"✓ Loaded .env from {env_file}")
else:
    print(f"⚠ No .env file found at {env_file}, using system environment")

# Configuration
CODEACT_API_URL = "http://localhost:8001"
DOCX_MODEL_CARD_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring/Model Card - Credit Risk Scoring Model - Expected Loss.docx"
TEXT_MODEL_CARD_PATH = "/tmp/model_card_real.txt"
NOTEBOOKS_DIR = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring/notebooks"
REPO_PATH = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring"

# LLM Configuration - Using Claude 4.5 Sonnet
LLM_PROVIDER = "anthropic"
LLM_MODEL = "claude-sonnet-4-20250514"

# Testing configuration - No limit for full end-to-end test
MAX_CLAIMS_TO_VERIFY = None  # Verify all claims

# Notebooks to verify against
NOTEBOOKS = [
    "1_data_cleaning_understanding.ipynb",
    "2_eda.ipynb",
    "3_pd_modeling.ipynb",
    "4_lgd_ead_modeling.ipynb",
    "5_pd_model_monitoring.ipynb"
]

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
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*100}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(100)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*100}{Colors.ENDC}\n")


def print_section(text: str):
    """Print a formatted section header."""
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}{'─'*100}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}► {text}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}{'─'*100}{Colors.ENDC}\n")


def print_subsection(text: str):
    """Print a formatted subsection header."""
    print(f"\n{Colors.OKBLUE}{Colors.BOLD}• {text}{Colors.ENDC}")


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


def print_progress(text: str):
    """Print progress message."""
    print(f"{Colors.OKCYAN}▸ {text}{Colors.ENDC}")


def check_prerequisites():
    """Check if all prerequisites are met."""
    print_section("STEP 0: CHECKING PREREQUISITES")
    
    all_ok = True
    
    # Check if DOCX file exists
    print_subsection("Checking Model Card File")
    if Path(DOCX_MODEL_CARD_PATH).exists():
        size = Path(DOCX_MODEL_CARD_PATH).stat().st_size
        print_success(f"Model card found: {DOCX_MODEL_CARD_PATH}")
        print_info(f"  Size: {size:,} bytes ({size/1024:.2f} KB)")
    else:
        print_error(f"Model card not found: {DOCX_MODEL_CARD_PATH}")
        all_ok = False
    
    # Check if notebooks exist
    print_subsection("Checking Notebooks")
    notebooks_path = Path(NOTEBOOKS_DIR)
    if notebooks_path.exists():
        print_success(f"Notebooks directory found: {NOTEBOOKS_DIR}")
        for nb in NOTEBOOKS:
            nb_path = notebooks_path / nb
            if nb_path.exists():
                size = nb_path.stat().st_size
                print_info(f"  ✓ {nb} ({size/1024:.2f} KB)")
            else:
                print_error(f"  ✗ {nb} not found")
                all_ok = False
    else:
        print_error(f"Notebooks directory not found: {NOTEBOOKS_DIR}")
        all_ok = False
    
    # Check if repository exists
    print_subsection("Checking Repository")
    if Path(REPO_PATH).exists():
        print_success(f"Repository found: {REPO_PATH}")
    else:
        print_error(f"Repository not found: {REPO_PATH}")
        all_ok = False
    
    # Check API keys
    print_subsection("Checking API Keys")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        print_success(f"ANTHROPIC_API_KEY is set (length: {len(anthropic_key)})")
    else:
        print_error("ANTHROPIC_API_KEY is not set")
        all_ok = False
    
    # Check if Python docx2txt is available
    print_subsection("Checking Python Dependencies")
    try:
        import docx2txt
        print_success("docx2txt is installed")
    except ImportError:
        print_warning("docx2txt not found, will try alternative method")
    
    return all_ok


def check_api_health() -> bool:
    """Check if the CodeAct API is healthy."""
    print_subsection("Checking CodeAct API Health")
    try:
        response = requests.get(f"{CODEACT_API_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"CodeAct API is healthy")
            print_info(f"  Service: {data.get('service')}")
            print_info(f"  Version: {data.get('version')}")
            print_info(f"  Python: {data.get('python_version', '').split()[0]}")
            
            deps = data.get('dependencies', {})
            print_info(f"  Dependencies:")
            print_info(f"    - OpenAI: {deps.get('openai', 'N/A')}")
            print_info(f"    - Anthropic: {deps.get('anthropic', 'N/A')}")
            
            env = data.get('env', {})
            print_info(f"  API Keys Available:")
            print_info(f"    - OpenAI: {'✓' if env.get('has_openai_key') else '✗'}")
            print_info(f"    - Anthropic: {'✓' if env.get('has_anthropic_key') else '✗'}")
            print_info(f"    - OpenRouter: {'✓' if env.get('has_openrouter_key') else '✗'}")
            return True
        else:
            print_error(f"API returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Failed to connect to CodeAct API at {CODEACT_API_URL}")
        print_info("Please start the API server with: cd services/codeact_cardcheck && ./start_api_server.sh")
        return False
    except Exception as e:
        print_error(f"Failed to connect to CodeAct API: {e}")
        return False


def convert_docx_to_text() -> str:
    """Convert DOCX model card to text."""
    print_section("STEP 1: CONVERTING MODEL CARD FROM DOCX TO TEXT")
    
    # Try method 1: Python docx2txt
    try:
        import docx2txt
        print_info("Using docx2txt library for extraction...")
        text = docx2txt.process(DOCX_MODEL_CARD_PATH)
        print_success(f"Extracted text using docx2txt")
        print_info(f"  Length: {len(text):,} characters")
        print_info(f"  Estimated tokens: ~{len(text)//4:,}")
        
        # Save to file
        with open(TEXT_MODEL_CARD_PATH, 'w', encoding='utf-8') as f:
            f.write(text)
        print_success(f"Saved to: {TEXT_MODEL_CARD_PATH}")
        
        # Show preview
        print_subsection("Text Preview (first 500 chars)")
        print(text[:500])
        if len(text) > 500:
            print("...")
        
        return text
    except ImportError:
        print_warning("docx2txt not available, trying alternative method...")
    except Exception as e:
        print_error(f"Failed with docx2txt: {e}")
    
    # Try method 2: python-docx
    try:
        from docx import Document
        print_info("Using python-docx library for extraction...")
        doc = Document(DOCX_MODEL_CARD_PATH)
        text = '\n'.join([para.text for para in doc.paragraphs])
        print_success(f"Extracted text using python-docx")
        print_info(f"  Length: {len(text):,} characters")
        print_info(f"  Estimated tokens: ~{len(text)//4:,}")
        
        # Save to file
        with open(TEXT_MODEL_CARD_PATH, 'w', encoding='utf-8') as f:
            f.write(text)
        print_success(f"Saved to: {TEXT_MODEL_CARD_PATH}")
        
        # Show preview
        print_subsection("Text Preview (first 500 chars)")
        print(text[:500])
        if len(text) > 500:
            print("...")
        
        return text
    except ImportError:
        print_warning("python-docx not available, trying Node.js method...")
    except Exception as e:
        print_error(f"Failed with python-docx: {e}")
    
    # Try method 3: Node.js mammoth (if available)
    try:
        print_info("Attempting to use Node.js mammoth for extraction...")
        result = subprocess.run(
            ["node", "test_docx_extraction.js"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            print_success("Node.js extraction successful (see output above)")
            # The JS script doesn't save the file, so we need to run mammoth directly
            # For now, just inform the user
            print_error("Node.js method doesn't save the file automatically")
        else:
            print_error(f"Node.js extraction failed: {result.stderr}")
    except FileNotFoundError:
        print_warning("Node.js not available")
    except Exception as e:
        print_error(f"Node.js extraction failed: {e}")
    
    print_error("All DOCX extraction methods failed!")
    print_info("Please install one of: pip install docx2txt OR pip install python-docx")
    sys.exit(1)


def extract_and_verify_with_codeact(model_card_text: str) -> Dict[str, Any]:
    """Run full CodeAct verification (includes claim extraction + verification)."""
    print_section("STEP 2: EXTRACTING CLAIMS & VERIFYING WITH CODEACT")
    
    print_info(f"LLM Provider: {LLM_PROVIDER}")
    print_info(f"LLM Model: {LLM_MODEL}")
    print_info(f"Repository: {REPO_PATH}")
    print_info(f"Model Card Length: {len(model_card_text):,} characters (~{len(model_card_text)//4:,} tokens)")
    print_info("This will take several minutes (typically 5-15 minutes)...")
    print_info("Progress will be shown below:")
    print()
    
    # Get API key from environment
    api_key = os.environ.get("ANTHROPIC_API_KEY")
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
        print_subsection("Starting Verification Stream")
        print("─"*100)
        
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
        report = None
        line_buffer = ""
        event_count = 0
        claims_extracted = 0
        verification_count = 0
        
        for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
            if chunk:
                line_buffer += chunk
                while '\n' in line_buffer:
                    line, line_buffer = line_buffer.split('\n', 1)
                    
                    if line.startswith('data: '):
                        data_str = line[6:]  # Remove 'data: ' prefix
                        try:
                            data = json.loads(data_str)
                            event_count += 1
                            
                            if data.get('type') == 'progress':
                                message = data.get('message', '')
                                extra_data = data.get('data', {})
                                
                                # Format progress message with timestamp
                                timestamp = time.strftime("%H:%M:%S")
                                
                                # Determine message type and format accordingly
                                if 'step' in extra_data:
                                    step = extra_data['step']
                                    print(f"{Colors.OKCYAN}[{timestamp}] [{step}]{Colors.ENDC} {message}")
                                else:
                                    print(f"{Colors.OKBLUE}[{timestamp}] ▸{Colors.ENDC} {message}")
                                
                                # Print additional data if available
                                if 'claims_count' in extra_data:
                                    claims_extracted = extra_data['claims_count']
                                    print(f"  {Colors.OKGREEN}→ Claims extracted: {claims_extracted}{Colors.ENDC}")
                                
                                if 'verification_results_count' in extra_data:
                                    verification_count = extra_data['verification_results_count']
                                    print(f"  {Colors.OKGREEN}→ Verification results: {verification_count}{Colors.ENDC}")
                                
                                # Show claim details if available
                                if 'claim' in extra_data:
                                    claim = extra_data['claim']
                                    claim_preview = claim[:100] + '...' if len(claim) > 100 else claim
                                    print(f"  {Colors.OKBLUE}→ Claim: {claim_preview}{Colors.ENDC}")
                                
                                # Show verification result if available
                                if 'verified' in extra_data:
                                    verified = extra_data['verified']
                                    status = f"{Colors.OKGREEN}✓ VERIFIED{Colors.ENDC}" if verified else f"{Colors.FAIL}✗ NOT VERIFIED{Colors.ENDC}"
                                    print(f"  {Colors.BOLD}→ Result: {status}{Colors.ENDC}")
                                
                                # Show evidence if available
                                if 'evidence' in extra_data:
                                    evidence = extra_data['evidence']
                                    if evidence:
                                        evidence_preview = evidence[:150] + '...' if len(evidence) > 150 else evidence
                                        print(f"  {Colors.OKBLUE}→ Evidence: {evidence_preview}{Colors.ENDC}")
                                
                                # Add blank line for readability after each claim verification
                                if 'verified' in extra_data:
                                    print()
                                
                            elif data.get('type') == 'complete':
                                report = data.get('report')
                                print("─"*100)
                                print_success(f"\n✓ Verification complete! (Total events: {event_count})")
                                break
                                
                            elif data.get('type') == 'error':
                                error_msg = data.get('message', 'Unknown error')
                                print("─"*100)
                                print_error(f"\n✗ Verification failed: {error_msg}")
                                sys.exit(1)
                                
                        except json.JSONDecodeError as e:
                            print_warning(f"Failed to parse JSON: {e}")
                            print_info(f"Data: {data_str[:100]}...")
                    elif line.startswith(': '):
                        # Keep-alive ping, ignore silently
                        pass
        
        print("─"*100)
        
        if not report:
            print_error("No report received from verification")
            sys.exit(1)
        
        return report
        
    except requests.exceptions.Timeout:
        print_error("Request timed out after 30 minutes")
        sys.exit(1)
    except Exception as e:
        print_error(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def display_results(report: Dict[str, Any]):
    """Display verification results in detail."""
    print_section("STEP 3: VERIFICATION RESULTS")
    
    # Extract data
    claims = report.get('claims', [])
    verification_results = report.get('verification_results', [])
    metadata = report.get('metadata', {})
    
    # Summary
    print_subsection("Summary Statistics")
    print_info(f"Total claims extracted: {len(claims)}")
    print_info(f"Claims verified: {len(verification_results)}")
    
    if metadata:
        print_info(f"LLM Provider: {metadata.get('llm_provider', 'N/A')}")
        print_info(f"LLM Model: {metadata.get('llm_model', 'N/A')}")
        if 'total_time' in metadata:
            total_time = metadata['total_time']
            print_info(f"Total time: {total_time:.2f} seconds ({total_time/60:.2f} minutes)")
    
    # Verification breakdown
    if verification_results:
        verified = sum(1 for r in verification_results if r.get('verified', False))
        not_verified = len(verification_results) - verified
        
        print()
        print_subsection("Verification Breakdown")
        print(f"  {Colors.OKGREEN}{Colors.BOLD}✓ Verified: {verified} ({verified/len(verification_results)*100:.1f}%){Colors.ENDC}")
        print(f"  {Colors.FAIL}{Colors.BOLD}✗ Not Verified: {not_verified} ({not_verified/len(verification_results)*100:.1f}%){Colors.ENDC}")
    
    # Show all claims first
    print()
    print_section("EXTRACTED CLAIMS")
    for i, claim in enumerate(claims, 1):
        print(f"\n{Colors.BOLD}Claim {i}:{Colors.ENDC}")
        print(f"  ID: {claim.get('id', 'N/A')}")
        print(f"  Category: {claim.get('category', 'N/A')}")
        print(f"  Subcategory: {claim.get('subcategory', 'N/A')}")
        print(f"  Description: {claim.get('description', 'N/A')}")
        print("─"*100)
    
    # Detailed verification results
    print()
    print_section("DETAILED VERIFICATION RESULTS")
    
    for i, result in enumerate(verification_results, 1):
        claim_text = result.get('claim', 'N/A')
        verified = result.get('verified', False)
        evidence = result.get('evidence', 'No evidence')
        confidence = result.get('confidence', 0.0)
        
        status_icon = "✓" if verified else "✗"
        status_color = Colors.OKGREEN if verified else Colors.FAIL
        
        print(f"\n{status_color}{Colors.BOLD}{'='*100}{Colors.ENDC}")
        print(f"{status_color}{Colors.BOLD}{status_icon} Result {i}/{len(verification_results)}{Colors.ENDC}")
        print(f"{status_color}{Colors.BOLD}{'='*100}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}Claim:{Colors.ENDC}")
        print(f"  {claim_text}")
        
        print(f"\n{Colors.BOLD}Status:{Colors.ENDC}")
        print(f"  {status_color}{status_icon} {'VERIFIED' if verified else 'NOT VERIFIED'}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}Confidence:{Colors.ENDC}")
        print(f"  {confidence*100:.1f}%")
        
        print(f"\n{Colors.BOLD}Evidence:{Colors.ENDC}")
        if evidence and evidence != "No evidence":
            # Print evidence with proper formatting
            if isinstance(evidence, str):
                evidence_lines = evidence.split('\n')
                for line in evidence_lines[:20]:  # Show first 20 lines
                    print(f"  {line}")
                if len(evidence_lines) > 20:
                    print(f"  ... ({len(evidence_lines) - 20} more lines)")
            elif isinstance(evidence, dict):
                # Evidence is a dict, format it nicely
                import json
                evidence_str = json.dumps(evidence, indent=2)
                evidence_lines = evidence_str.split('\n')
                for line in evidence_lines[:20]:
                    print(f"  {line}")
                if len(evidence_lines) > 20:
                    print(f"  ... ({len(evidence_lines) - 20} more lines)")
            else:
                print(f"  {evidence}")
        else:
            print(f"  {Colors.WARNING}No evidence provided{Colors.ENDC}")
    
    # Save full report
    print()
    print_section("SAVING FULL REPORT")
    output_file = "/tmp/verification_report_full.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    print_success(f"Full JSON report saved to: {output_file}")
    
    # Also save a human-readable version
    output_txt = "/tmp/verification_report_full.txt"
    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write("="*100 + "\n")
        f.write("MODEL CARD VERIFICATION REPORT\n")
        f.write("="*100 + "\n\n")
        
        f.write("SUMMARY\n")
        f.write("-"*100 + "\n")
        f.write(f"Total Claims: {len(claims)}\n")
        f.write(f"Verified: {sum(1 for r in verification_results if r.get('verified', False))}\n")
        f.write(f"Not Verified: {len(verification_results) - sum(1 for r in verification_results if r.get('verified', False))}\n\n")
        
        f.write("\nDETAILED RESULTS\n")
        f.write("="*100 + "\n")
        
        for i, result in enumerate(verification_results, 1):
            f.write(f"\nResult {i}/{len(verification_results)}\n")
            f.write("-"*100 + "\n")
            f.write(f"Claim: {result.get('claim', 'N/A')}\n")
            f.write(f"Status: {'VERIFIED' if result.get('verified', False) else 'NOT VERIFIED'}\n")
            f.write(f"Confidence: {result.get('confidence', 0.0)*100:.1f}%\n")
            f.write(f"\nEvidence:\n{result.get('evidence', 'No evidence')}\n")
            f.write("="*100 + "\n")
    
    print_success(f"Human-readable report saved to: {output_txt}")


def main():
    """Main test function."""
    print_header("FULL END-TO-END TEST: REAL MODEL CARD + REAL NOTEBOOKS")
    print_header("Claims Extraction (Claude 4.5 Sonnet) + CodeAct Verification (Claude 4.5 Sonnet)")
    
    start_time = time.time()
    
    # Check prerequisites
    if not check_prerequisites():
        print_error("\nPrerequisites check failed. Please fix the issues above.")
        sys.exit(1)
    
    # Check API health
    if not check_api_health():
        print_error("\nCodeAct API is not available. Please start the services.")
        sys.exit(1)
    
    # Convert DOCX to text
    model_card_text = convert_docx_to_text()
    
    # Run full verification (extraction + verification)
    report = extract_and_verify_with_codeact(model_card_text)
    
    # Display results
    display_results(report)
    
    # Final summary
    end_time = time.time()
    total_duration = end_time - start_time
    
    print_section("TEST COMPLETE")
    print_success(f"Total execution time: {total_duration:.2f} seconds ({total_duration/60:.2f} minutes)")
    
    claims_count = len(report.get('claims', []))
    verified_count = sum(1 for r in report.get('verification_results', []) if r.get('verified', False))
    total_results = len(report.get('verification_results', []))
    
    print()
    print(f"{Colors.BOLD}Final Statistics:{Colors.ENDC}")
    print_info(f"Claims extracted: {claims_count}")
    print_info(f"Verification results: {total_results}")
    print_info(f"Verified claims: {verified_count} ({verified_count/total_results*100:.1f}%)")
    print_info(f"Not verified: {total_results - verified_count} ({(total_results - verified_count)/total_results*100:.1f}%)")
    
    print()
    if verified_count > 0:
        print_success("✓ Test completed successfully!")
        print_success(f"✓ Found {verified_count} verified claims out of {total_results} total claims")
    else:
        print_warning("⚠ Test completed but no claims were verified")
        print_warning("  This might indicate that the model card claims couldn't be found in the notebooks")
    
    print()
    print_info("Output files:")
    print_info(f"  - Text model card: {TEXT_MODEL_CARD_PATH}")
    print_info(f"  - JSON report: /tmp/verification_report_full.json")
    print_info(f"  - Text report: /tmp/verification_report_full.txt")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARNING}{'='*100}{Colors.ENDC}")
        print(f"{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        print(f"{Colors.WARNING}{'='*100}{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print_error(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

