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
- **Multiple Ingestion Methods**: Support for Git repository cloning and file uploads

## Architecture

This is a monorepo containing:

- **`apps/api`**: Next.js application (port 3001)
  - 3-panel workspace UI (file explorer, tabbed editor, model card viewer)
  - REST API endpoints for models, versions, files, and discrepancies
  - Prisma ORM for database management
  - Integration with OpenAI for discrepancy analysis

- **`services/inspector`**: Python FastAPI service
  - AST-based code analysis
  - Extracts facts about models, hyperparameters, metrics, etc.

- **`packages/shared`**: Shared TypeScript types

## Prerequisites

- Node.js 18+ and pnpm 9.0.0
- Python 3.10+
- PostgreSQL database
- OpenAI API key OR Anthropic API key (for discrepancy analysis)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database

Start PostgreSQL using Docker Compose:

```bash
cd infrastructure
docker-compose up -d
```

Or use your own PostgreSQL instance. Update the `DATABASE_URL` in your `.env` file.

### 3. Configure Environment Variables

Create `.env` files in `apps/api`:

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/model_cards"
# Use OpenAI (default)
OPENAI_API_KEY="your-openai-api-key"
# OR use Anthropic
# LLM_PROVIDER="anthropic"
# ANTHROPIC_API_KEY="your-anthropic-api-key"
# LLM_MODEL="claude-3-5-sonnet-20241022"  # Optional, defaults shown below
INSPECTOR_URL="http://localhost:8000"
CARDCHECK_API_URL="http://localhost:8001"
```

### 4. Run Database Migrations

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:migrate
```

### 5. Start Inspector Service

```bash
cd services/inspector
# Using uv (recommended)
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
uvicorn main:app --reload --port 8000

# Or using pip
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --port 8000
```

### 6. Start Development Server

From the root directory:

```bash
pnpm dev
```

This starts the Next.js application on http://localhost:3001

## Usage

### Workspace Interface

- Navigate to http://localhost:3001/workspace
- Use the **left panel** to browse files
- Click files to open them in the **center panel** tabs
- View model card information in the **right panel**
- Switch between Notebook and Dashboard views using SuperTabs

### Ingesting Models via API

Use the API endpoints to ingest models:

1. **From Git Repository**:
   ```bash
   POST /api/ingest/repo
   Body: { "repoUrl": "https://github.com/..." }
   ```

2. **From File Upload**:
   ```bash
   POST /api/ingest/upload
   Body: FormData with model card and optional ZIP file
   ```

### Analyzing Discrepancies

- The system automatically runs discrepancy analysis when models are ingested
- View discrepancies via API: `GET /api/models/[id]/discrepancies?version=[versionId]`
- Discrepancies are categorized by severity (low, med, high)

## API Endpoints

### Models
- `GET /api/models` - List all models
- `GET /api/models/[id]` - Get model details
- `GET /api/models/[id]/versions` - List model versions
- `GET /api/models/[id]/cards` - Get model cards
- `GET /api/models/[id]/discrepancies?version=[versionId]` - Get discrepancies

### Files
- `GET /api/models/[id]/versions/[versionId]/files/tree` - Get file tree
- `GET /api/models/[id]/versions/[versionId]/files/content?path=[path]` - Get file content
- `GET /api/models/[id]/versions/[versionId]/notebooks` - List notebooks

### Analysis
- `POST /api/analyze/[modelVersionId]` - Run discrepancy analysis (streaming)

### Ingestion
- `POST /api/ingest/repo` - Ingest from Git repository
- `POST /api/ingest/upload` - Upload files

## Project Structure

```
.
├── apps/
│   └── api/              # Next.js application
│       ├── app/          # App router (workspace UI + API routes)
│       ├── components/   # UI components (workspace, notebook viewer)
│       ├── src/lib/      # Business logic
│       └── prisma/       # Database schema
├── services/
│   └── inspector/        # Python AST analyzer
├── packages/
│   └── shared/           # Shared types
└── infrastructure/       # Docker Compose configs
```

## Development

### Running Tests

```bash
# API tests
cd apps/api
pnpm test
```

### Building for Production

```bash
pnpm build
```

### Database Management

```bash
cd apps/api
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open Prisma Studio (if available)
```

## Technologies

- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, React
- **UI Components**: shadcn/ui, Tailwind CSS, Radix UI
- **Database**: PostgreSQL, Prisma ORM
- **Code Analysis**: Python, FastAPI, tree-sitter
- **AI**: OpenAI GPT-4o-mini or Anthropic Claude (via Vercel AI SDK)
- **Package Manager**: pnpm (workspaces)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

