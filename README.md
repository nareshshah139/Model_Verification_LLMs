# Model Card Discrepancy Explorer

An AST-RAG-based system for detecting discrepancies between trading model implementations and their model cards. This tool analyzes Python code and Jupyter notebooks using Abstract Syntax Trees (AST) and compares them against model card documentation to identify inconsistencies.

## Features

- **Code Analysis**: AST-based extraction of facts from Python code and Jupyter notebooks
- **Model Card Parsing**: Extracts structured information from model card markdown files
- **Discrepancy Detection**: Compares code implementation against model card claims
- **3-Panel Workspace UI**: Cursor-style single-page interface with:
  - File explorer (left panel)
  - Tabbed editor with notebook viewer (center panel)
  - Model card viewer (right panel)
  - Resizable panels for customized layout
- **Notebook Viewer**: Professional Jupyter notebook rendering with syntax highlighting and output display
- **CodeAct Agent**: AI-powered verification using LLM-driven code analysis

## Architecture

This is a monorepo containing:

- **`apps/api`**: Next.js application (port 3001)
  - 3-panel workspace UI (file explorer, tabbed editor, model card viewer)
  - File system API for browsing local repositories
  - Model card verification interface

- **`services/codeact_cardcheck`**: Python FastAPI backend (port 8001)
  - CodeAct agent for intelligent verification
  - AST-based code analysis
  - Claim extraction from model cards

- **`packages/shared`**: Shared TypeScript types

## Prerequisites

- Node.js 18+ and pnpm 9.0.0
- Python 3.10+ with uv
- OpenAI API key OR Anthropic API key (for verification)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables (Unified Configuration)

This project uses a **single centralized `.env` file** at the project root that both frontend and backend share.

**Quick Setup (Recommended):**

```bash
# Run interactive setup script
./setup-env.sh
```

This will create `.env` and prompt you for your API keys.

**Manual Setup:**

```bash
# Copy template and edit
cp env.config.template .env
# Then edit .env and add your API keys
```

📖 **For detailed configuration options, see [UNIFIED_ENV_CONFIG.md](./UNIFIED_ENV_CONFIG.md)**

**Get API Keys:**
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys
- OpenRouter: https://openrouter.ai/keys

### 3. Start Services

**Option A: Start All Services (Recommended)**

From the project root:

```bash
./start-all-services.sh
```

This script will:
- Verify your `.env` configuration
- Start the Python backend (CodeAct API)
- Start the Next.js frontend
- Show you when both are ready

**Option B: Start Services Individually**

Terminal 1 - Backend:
```bash
cd services/codeact_cardcheck
./start_api_server.sh  # Automatically loads root .env
```

Terminal 2 - Frontend:
```bash
cd apps/api
pnpm dev  # Automatically loads root .env
```

The services run on:
- Backend: http://localhost:8001
- Frontend: http://localhost:3001

## Usage

### Workspace Interface

- Navigate to http://localhost:3001/workspace
- Use the **left panel** to browse files in your local repository
- Click files to open them in the **center panel** tabs
- View and verify model cards in the **right panel**
- Switch between Notebook and Dashboard views using SuperTabs

### Verifying Model Cards

1. Open a model card in the right panel
2. Click **"Verify Model Card"** button
3. Watch real-time progress as the CodeAct agent analyzes your code
4. Review verification results and discrepancies
5. Results are persisted across sessions

## API Endpoints

### File System
- `GET /api/files?path=[path]` - Browse directory contents
- `GET /api/notebooks/content?path=[path]` - Get notebook content
- `GET /api/modelcards/content?path=[path]&type=[markdown|docx]` - Get model card content

### Verification
- `POST /api/verify/model-card` - Verify model card against repository (streaming)
- `POST /api/verify/notebooks` - Verify notebooks against model card (streaming)

### Configuration
- `GET /api/llm/config` - Get current LLM configuration
- `POST /api/llm/config` - Update LLM configuration

## Project Structure

```
.
├── apps/
│   └── api/                    # Next.js application
│       ├── app/                # App router (workspace UI + API routes)
│       ├── components/         # UI components (workspace, notebook viewer)
│       └── src/lib/            # Business logic (LLM config, file handling)
├── services/
│   └── codeact_cardcheck/      # Python FastAPI backend
│       ├── agent_main.py       # CodeAct agent orchestration
│       ├── api_server.py       # FastAPI server
│       └── tools/              # Verification tools (AST, claim extraction)
├── packages/
│   └── shared/                 # Shared types
└── Lending-Club-Credit-Scoring/ # Example project for testing
```

## Development

### Building for Production

```bash
pnpm build
```

### Running Tests

```bash
# Frontend tests
cd apps/api
pnpm test

# Backend tests
cd services/codeact_cardcheck
uv run pytest
```

## Technologies

- **Frontend**: Next.js 14 (App Router), TypeScript, React
- **UI Components**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Python FastAPI, uvicorn
- **Code Analysis**: AST-grep, Python AST
- **AI/LLM**: Anthropic Claude, OpenAI GPT-4, OpenRouter (configurable)
- **Package Management**: pnpm (Node.js), uv (Python)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

