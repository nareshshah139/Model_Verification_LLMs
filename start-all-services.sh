#!/bin/bash
# =============================================================================
# Start All Services Script
# =============================================================================
# Starts both the Next.js frontend and Python backend with unified config
#
# Usage: ./start-all-services.sh
# =============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "════════════════════════════════════════════════════════════════════════════"
echo "🚀 Starting AST-RAG-Based Model Card Checks Application"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found at project root"
    echo ""
    echo "Please run the setup script first:"
    echo "   ./setup-env.sh"
    echo ""
    exit 1
fi

echo "✅ Configuration found: .env"
echo ""

# Load environment
set -a
source .env
set +a

# Check if required API keys are set
HAS_KEYS=false
if [ -n "${ANTHROPIC_API_KEY:-}" ] && [ "$ANTHROPIC_API_KEY" != "sk-ant-your-anthropic-key-here" ]; then
    HAS_KEYS=true
fi
if [ -n "${OPENAI_API_KEY:-}" ] && [ "$OPENAI_API_KEY" != "sk-your-openai-key-here" ]; then
    HAS_KEYS=true
fi

if [ "$HAS_KEYS" = false ]; then
    echo "⚠️  Warning: No valid API keys configured in .env"
    echo "   You can still start the services, but verification will fail."
    echo ""
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Startup cancelled."
        echo "   Edit .env and add your API keys, or run: ./setup-env.sh"
        exit 0
    fi
fi

echo "────────────────────────────────────────────────────────────────────────────"
echo "📦 Step 1/2: Starting Python Backend (CodeAct API)"
echo "────────────────────────────────────────────────────────────────────────────"
echo ""

# Start backend in background
cd services/codeact_cardcheck
./start_api_server.sh &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
done
echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Backend failed to start within 30 seconds"
    echo "   Check logs above for errors"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "────────────────────────────────────────────────────────────────────────────"
echo "📦 Step 2/2: Starting Next.js Frontend"
echo "────────────────────────────────────────────────────────────────────────────"
echo ""

# Start frontend
cd apps/api

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    pnpm install
fi

echo "🚀 Starting Next.js development server..."
echo ""

# Start frontend (this will run in foreground)
pnpm dev

# If frontend exits, also kill backend
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

