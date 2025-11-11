# Model Card Discrepancy Explorer

An AST-RAG-based system for detecting discrepancies between trading model implementations and their model cards. This tool analyzes Python code and Jupyter notebooks using Abstract Syntax Trees (AST) and compares them against model card documentation to identify inconsistencies.

## Features

- **Code Analysis**: AST-based extraction of facts from Python code and Jupyter notebooks
- **Model Card Parsing**: Extracts structured information from model card markdown files
- **Discrepancy Detection**: Compares code implementation against model card claims
- **Interactive UI**: Web interface for browsing models, viewing code, and reviewing discrepancies
- **Multiple Ingestion Methods**: Support for Git repository cloning and file uploads
- **Notebook Support**: Full support for Jupyter notebooks with preserved structure

## Architecture

This is a monorepo containing:

- **`apps/api`**: Next.js API server (port 3001)
  - REST API endpoints for models, versions, files, and discrepancies
  - Prisma ORM for database management
  - Integration with OpenAI for discrepancy analysis

- **`apps/web`**: React frontend (Vite, port 5173)
  - File tree browser
  - Code viewer with syntax highlighting
  - Model card viewer
  - Discrepancy list and details

- **`services/inspector`**: Python FastAPI service
  - AST-based code analysis
  - Extracts facts about models, hyperparameters, metrics, etc.

- **`packages/shared`**: Shared TypeScript types

## Prerequisites

- Node.js 18+ and pnpm 9.0.0
- Python 3.10+
- PostgreSQL database
- OpenAI API key (for discrepancy analysis)

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
OPENAI_API_KEY="your-openai-api-key"
INSPECTOR_URL="http://localhost:8000"
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

### 6. Start Development Servers

From the root directory:

```bash
pnpm dev
```

This starts both:
- API server on http://localhost:3001
- Web frontend on http://localhost:5173

The frontend automatically proxies `/api/*` requests to the backend.

## Usage

### Ingesting Models

1. **From Git Repository**:
   - Navigate to `/ingest` in the web UI
   - Enter the repository URL
   - Click "Queue Import"
   - The system will clone the repo, analyze code, and extract model cards

2. **From File Upload**:
   - Navigate to `/ingest` in the web UI
   - Upload a model card markdown file (required)
   - Optionally upload a ZIP file containing Python files and/or Jupyter notebooks
   - Click "Upload"

### Viewing Models

- Navigate to `/models` to see all ingested models
- Click on a model to view:
  - File tree structure
  - Code files and notebooks
  - Model card content
  - Discrepancies detected

### Analyzing Discrepancies

- The system automatically runs discrepancy analysis when models are ingested
- View discrepancies on the model detail page or the `/discrepancies` page
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
│   ├── api/              # Next.js API server
│   │   ├── app/api/      # API routes
│   │   ├── src/lib/      # Business logic
│   │   └── prisma/       # Database schema
│   └── web/              # React frontend
│       ├── src/
│       │   ├── components/
│       │   └── routes.tsx
│       └── vite.config.ts
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

# E2E tests
cd apps/web
pnpm e2e
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

- **Frontend**: React, TypeScript, Vite, React Router
- **Backend**: Next.js 14, TypeScript, Prisma
- **Database**: PostgreSQL
- **Code Analysis**: Python, FastAPI, tree-sitter
- **AI**: OpenAI GPT-4o-mini (via Vercel AI SDK)
- **Package Manager**: pnpm (workspaces)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

