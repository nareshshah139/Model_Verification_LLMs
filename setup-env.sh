#!/bin/bash
# =============================================================================
# Unified Environment Setup Script
# =============================================================================
# This script sets up a single .env file at the project root that both
# the Next.js frontend and Python backend will use.
#
# Usage: ./setup-env.sh
# =============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 Setting up unified environment configuration..."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists at project root"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Your existing .env is unchanged."
        exit 0
    fi
fi

# Copy template to .env
if [ ! -f "env.config.template" ]; then
    echo "❌ Error: env.config.template not found"
    exit 1
fi

cp env.config.template .env
echo "✅ Created .env from template"
echo ""

# Prompt for API keys
echo "📝 Configure your API keys (or press Enter to skip and add later):"
echo ""

read -p "Enter your Anthropic API key (sk-ant-...): " ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
    # Use sed to replace the placeholder
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANTHROPIC_KEY|" .env
    else
        # Linux
        sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANTHROPIC_KEY|" .env
    fi
    echo "✅ Anthropic API key saved"
fi
echo ""

read -p "Enter your OpenAI API key (sk-...): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
    else
        sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
    fi
    echo "✅ OpenAI API key saved"
fi
echo ""

read -p "Enter your OpenRouter API key (sk-or-...) [optional]: " OPENROUTER_KEY
if [ -n "$OPENROUTER_KEY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
    else
        sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
    fi
    echo "✅ OpenRouter API key saved"
fi
echo ""

echo "════════════════════════════════════════════════════════════════════════════"
echo "✅ Environment configuration complete!"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📍 Configuration file location: $PROJECT_ROOT/.env"
echo ""
echo "📝 Both services will now use this single configuration file:"
echo "   • Next.js frontend (apps/api) - automatically loads .env"
echo "   • Python backend (services/codeact_cardcheck) - loads via startup script"
echo ""
echo "🚀 To start the services:"
echo "   1. Backend:  cd services/codeact_cardcheck && ./start_api_server.sh"
echo "   2. Frontend: cd apps/api && pnpm dev"
echo ""
echo "📖 To edit configuration later:"
echo "   Edit: $PROJECT_ROOT/.env"
echo ""
echo "⚠️  Security reminder: Never commit .env to version control!"
echo "════════════════════════════════════════════════════════════════════════════"

