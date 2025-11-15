#!/bin/bash

# Script to create .env.local file from template

echo "Creating .env.local file..."

cat > .env.local << 'ENVFILE'
# LLM Provider Configuration - Default to Anthropic Claude Sonnet 4.5
# Recommended: anthropic with claude-sonnet-4-5 for best code analysis
# Alternatives: openai, openrouter
LLM_PROVIDER=anthropic

# LLM Model Configuration
# Default: claude-sonnet-4-5 (best for coding and agents)
# OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo
# Anthropic: claude-sonnet-4-5, claude-opus-4-1, claude-haiku-4-5
# OpenRouter: openai/gpt-4o, anthropic/claude-sonnet-4-5, etc.
LLM_MODEL=claude-sonnet-4-5

# API Keys - Add your keys below
# Get OpenAI key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# Get Anthropic key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Get OpenRouter key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-your-openrouter-key-here

# OpenRouter Optional Headers (for analytics)
# OPENROUTER_HTTP_REFERER=your-site-url
# OPENROUTER_X_TITLE=your-app-name

# CodeAct API Server URL (default: http://localhost:8001)
CODEACT_API_URL=http://localhost:8001
ENVFILE

chmod 600 .env.local

echo "✅ Created .env.local file"
echo ""
echo "📝 Next steps:"
echo "   1. Edit apps/api/.env.local and add your API keys"
echo "   2. Restart the Next.js development server"
echo ""
echo "🔑 Get API keys from:"
echo "   • Anthropic: https://console.anthropic.com/"
echo "   • OpenAI: https://platform.openai.com/api-keys"
echo "   • OpenRouter: https://openrouter.ai/keys"
