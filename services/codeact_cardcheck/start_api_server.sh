#!/bin/bash
# Start the CodeAct API server using uv-managed virtual environment (sequential, low-mem)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

echo "🔧 CodeAct API Server Startup"
echo "   Project root: $PROJECT_ROOT"
echo ""

# Load environment from project root .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📝 Loading environment from: $PROJECT_ROOT/.env"
    set -a  # automatically export all variables
    source "$PROJECT_ROOT/.env"
    set +a
    echo "✅ Environment loaded"
else
    echo "⚠️  No .env file found at project root"
    echo "   Run: ./setup-env.sh (from project root) to create one"
    echo "   Continuing with existing environment variables..."
fi
echo ""

# 1) Require uv (fast, reproducible env + installs)
if ! command -v uv >/dev/null 2>&1; then
    echo "❌ 'uv' is required but not found."
    echo "   Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# 2) Create/refresh a local .venv via uv
if [ ! -d ".venv" ]; then
    echo "🪄 Creating uv-managed virtual environment (.venv)..."
    uv venv .venv
    echo "✓ Created .venv"
fi

# 3) Sync dependencies from lock if available, otherwise editable install
if [ -f "uv.lock" ]; then
    echo "📦 Syncing dependencies from uv.lock..."
    UV_ACTIVE_VENV=".venv" uv sync --frozen
else
    echo "📦 Installing project (editable)..."
    UV_ACTIVE_VENV=".venv" uv pip install -e .
fi

# 4) Low-memory defaults (override if not set)
export CODEACT_MAX_WORKERS=${CODEACT_MAX_WORKERS:-1}
export CLAIM_EXTRACT_LOG_REQUEST=${CLAIM_EXTRACT_LOG_REQUEST:-truncated}
export PYTHONUNBUFFERED=${PYTHONUNBUFFERED:-1}

# Check if port 8001 is already in use
PORT=8001
EXISTING_PID=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo "⚠️  Port $PORT is already in use (PID: $EXISTING_PID)"
    echo "   Killing existing process..."
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 1
    # Verify it's been killed
    if lsof -ti:$PORT >/dev/null 2>&1; then
        echo "❌ Error: Could not free port $PORT"
        echo "   Please manually kill the process using: kill -9 $EXISTING_PID"
        exit 1
    fi
    echo "✓ Port $PORT is now available"
fi

# 5) Verify API keys are loaded
echo "🔑 API Key Status:"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    echo "   ✅ ANTHROPIC_API_KEY: Set (${#ANTHROPIC_API_KEY} chars)"
else
    echo "   ⚠️  ANTHROPIC_API_KEY: Not set"
fi
if [ -n "${OPENAI_API_KEY:-}" ]; then
    echo "   ✅ OPENAI_API_KEY: Set (${#OPENAI_API_KEY} chars)"
else
    echo "   ⚠️  OPENAI_API_KEY: Not set"
fi
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
    echo "   ✅ OPENROUTER_API_KEY: Set (${#OPENROUTER_API_KEY} chars)"
else
    echo "   ⚠️  OPENROUTER_API_KEY: Not set"
fi
echo ""
echo "🎯 LLM Configuration:"
echo "   Provider: ${LLM_PROVIDER:-not set}"
echo "   Model: ${LLM_MODEL:-not set}"
echo ""

# 6) Start the API server (uv ensures the correct venv is used)
echo "🚀 Starting CodeAct API server on http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""
UV_ACTIVE_VENV=".venv" uv run python api_server.py

