#!/bin/bash
# Wrapper script to run the real model card test with proper environment

set -e

PROJECT_ROOT="/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks"
VENV_PATH="$PROJECT_ROOT/services/codeact_cardcheck/.venv"

echo "=========================================="
echo "Setting up environment..."
echo "=========================================="

# Activate virtual environment
if [ -d "$VENV_PATH" ]; then
    echo "✓ Activating virtual environment: $VENV_PATH"
    source "$VENV_PATH/bin/activate"
else
    echo "✗ Virtual environment not found at $VENV_PATH"
    exit 1
fi

# Check if required packages are installed
echo ""
echo "Checking dependencies..."
python3 -c "import requests" 2>/dev/null || {
    echo "Installing requests..."
    uv pip install requests
}

python3 -c "import dotenv" 2>/dev/null || {
    echo "Installing python-dotenv..."
    uv pip install python-dotenv
}

python3 -c "import docx" 2>/dev/null || {
    echo "Installing python-docx..."
    uv pip install python-docx
}

echo "✓ All dependencies installed"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "✓ Loading .env file"
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
else
    echo "⚠ No .env file found at $PROJECT_ROOT/.env"
fi

# Verify API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "✗ ANTHROPIC_API_KEY not set"
    echo "Please set it with: export ANTHROPIC_API_KEY='your-key-here'"
    exit 1
fi

echo "✓ ANTHROPIC_API_KEY is set"

echo ""
echo "=========================================="
echo "Running test..."
echo "=========================================="
echo ""

# Run the test script
cd "$PROJECT_ROOT"
python3 test_real_model_card_full_flow.py

echo ""
echo "=========================================="
echo "Test completed!"
echo "=========================================="

