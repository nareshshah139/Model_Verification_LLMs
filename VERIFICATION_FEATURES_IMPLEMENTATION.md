# Model Card and Notebook Verification Features - Implementation Summary

## Overview

This document describes the newly implemented verification features that use the CodeAct Agent to verify model cards against notebooks and highlight discrepancies in both.

## Features Implemented

### 1. **Verify Model Card Button**
- **Location**: Model card viewer (right sidebar)
- **Purpose**: Checks if the model card claims match the actual code in notebooks
- **Powered by**: CodeAct Agent with AST-grep analysis
- **Output**: Consistency score, categorized findings, and detailed verification report

### 2. **Verify Notebooks Button**
- **Location**: Model card viewer (right sidebar)
- **Purpose**: Identifies changes in notebooks that are not reflected in the model card
- **Powered by**: CodeAct Agent with AST-grep analysis
- **Output**: Discrepancies highlighted in both notebooks and model card

## Architecture

### Components

#### 1. **Frontend Components** (`apps/api/components/`)

**`workspace/model-card-viewer.tsx`**
- Added two verification buttons in the header
- Implemented tabs to switch between "Content" and "Verification" views
- Added highlighting logic for model card content based on verification results
- Shows warning badges when low consistency score is detected
- Highlights paragraphs and code snippets that may contain discrepancies

**`workspace/verification-results.tsx`**
- Displays verification reports with:
  - Consistency score (percentage)
  - Total findings count
  - Critical issues count
  - Findings grouped by category (algorithms, leakage, metrics, etc.)
  - Detailed issue information with file paths and code snippets

**`notebook/NotebookViewer.tsx`**
- Added `discrepancies` prop to accept verification issues
- Enhanced `CodeCell` component to show issues inline
- Red borders and backgrounds for cells with errors
- Yellow borders and backgrounds for cells with warnings
- Issue details shown below affected cells with emojis (❌ for errors, ⚠️ for warnings)

#### 2. **API Routes** (`apps/api/app/api/verify/`)

**`model-card/route.ts`**
- Endpoint: `POST /api/verify/model-card`
- Accepts: `modelCardPath`, `repoPath`, `llmProvider`
- Reads model card content
- Calls CodeAct Agent API at `http://localhost:8001/verify`
- Returns verification report with consistency score and evidence table

**`notebooks/route.ts`**
- Endpoint: `POST /api/verify/notebooks`
- Accepts: `notebookPaths[]`, `modelCardPath`, `repoPath`
- Calls CodeAct Agent API
- Extracts discrepancies specific to each notebook
- Returns formatted discrepancies for highlighting

#### 3. **Backend Service** (`services/codeact_cardcheck/`)

**`api_server.py`**
- FastAPI server running on port 8001
- Endpoints:
  - `POST /verify` - Main verification endpoint
  - `POST /verify/stream` - SSE streaming for progress updates
  - `POST /astgrep/scan` - Run AST-grep with rulepacks
  - `POST /astgrep/run` - Run ad-hoc AST-grep patterns
  - `GET /astgrep/rulepacks` - List available rulepacks

**`agent_main.py`**
- `CardCheckAgent` class orchestrates verification
- Workflow:
  1. Parse model card to extract claims
  2. Clone or access repository
  3. Find and convert notebooks to Python
  4. Format code with Black
  5. Run AST-grep scans with multiple rulepacks
  6. Calculate consistency score (weighted)
  7. Generate JSON and Markdown reports

## Verification Categories

The CodeAct Agent checks the following categories:

1. **Algorithms** (30% weight)
   - Verifies algorithm families (PD, LGD, EAD)
   - Checks for correct model types (logistic, linear, etc.)

2. **Leakage** (25% weight)
   - Detects data leakage patterns
   - Critical severity issues

3. **Metrics** (15% weight)
   - Validates metric calculations
   - Checks for proper rate clipping

4. **Splits** (15% weight)
   - Verifies train/test split methodology

5. **Preprocessing** (10% weight)
   - Checks data preprocessing steps

6. **Packaging** (5% weight)
   - Verifies model serialization (joblib, pickle)
   - Checks for random seed setting

## Highlighting Logic

### Model Card Highlighting

When verification results are available:
- **Yellow background**: Paragraphs mentioning algorithms, metrics, models, or data (when consistency score < 80%)
- **Red code snippets**: Code blocks that match issues found in evidence table
- **Info banner**: Shows that verification is active at the top of content

### Notebook Highlighting

When discrepancies are detected:
- **Red border & background**: Cells with error-level issues (e.g., data leakage)
- **Yellow border & background**: Cells with warning-level issues
- **Issue section**: Shows below affected cells with:
  - Issue type (category)
  - Severity icon (❌ or ⚠️)
  - Detailed message
  - Code snippet that triggered the issue

## Usage Flow

1. **Open Workspace** (`http://localhost:3001/workspace`)
2. **Select Model Card** from file explorer (loads in right sidebar)
3. **Click "Verify Model Card"** button
   - Agent analyzes the model card claims
   - Scans all notebooks in the repo
   - Generates consistency score and detailed report
   - Switches to "Verification" tab automatically
4. **Review Results**:
   - Check consistency score (aim for >80%)
   - Review findings by category
   - Click back to "Content" tab to see highlighted text
5. **Click "Verify Notebooks"** button
   - Similar analysis but focused on notebook discrepancies
   - Highlights issues in both model card and notebooks
6. **Open Notebooks** from center pane
   - Issues are shown inline with red/yellow highlighting
   - Scroll to affected cells to see detailed issue information

## Technical Details

### Dependencies Installed

```bash
# Python (CodeAct Agent)
- fastapi>=0.100
- uvicorn>=0.23
- pydantic>=2
- nbconvert>=7.0
- nbclient>=0.9
- papermill>=2.5
- black>=23.0
- ruff>=0.1
- ast-grep (external binary)
```

### Services Running

1. **Next.js Dev Server**: `http://localhost:3001`
   - Frontend UI application
   
2. **CodeAct API Server**: `http://localhost:8001`
   - Backend verification service
   - Running in virtual environment at `services/codeact_cardcheck/venv`

### Environment Variables

```bash
# apps/api/.env.local (optional, uses defaults)
CODEACT_API_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Example Workflow

```typescript
// User clicks "Verify Model Card"
const response = await fetch("/api/verify/model-card", {
  method: "POST",
  body: JSON.stringify({
    modelCardPath: "/model-cards/example_model_card.md",
    repoPath: "/path/to/Lending-Club-Credit-Scoring",
  }),
});

const result = await response.json();
// result.report contains:
// - consistency_score: 0.75 (75%)
// - claims_spec: { family: {...}, splits: {...}, ... }
// - evidence_table: { algorithms: [...], leakage: [...], ... }
// - metrics_diffs: {...}

// Display in VerificationResults component
<VerificationResults report={result.report} type="model-card" />
```

## Future Enhancements

1. **Real-time Streaming**: Use `/verify/stream` endpoint for progress updates
2. **LLM Provider Selection**: Add dropdown to choose between OpenAI, Anthropic, etc.
3. **Edit Model Card**: Allow inline editing to fix highlighted issues
4. **Edit Notebooks**: Enable editing notebooks directly in the UI
5. **Export Reports**: Download verification reports as PDF/JSON/MD
6. **Historical Tracking**: Track verification scores over time
7. **Auto-fix Suggestions**: AI-powered suggestions to resolve discrepancies

## Troubleshooting

### CodeAct API not responding
```bash
# Check if service is running
lsof -i:8001

# Restart service
cd services/codeact_cardcheck
source venv/bin/activate
python api_server.py
```

### Verification fails with "repo_path" error
- Ensure the repository path in the verification handlers is correct
- Update hardcoded paths in `model-card-viewer.tsx`:
  - Line 87: `repoPath` 
  - Line 122: `repoPath`
  - Line 123-129: `notebookPaths[]`

### Highlighting not showing
- Ensure verification report is not null
- Check consistency_score is calculated (< 0.8 triggers highlighting)
- Verify evidence_table has matches

## Files Modified/Created

### Created
- `apps/api/app/api/verify/model-card/route.ts`
- `apps/api/app/api/verify/notebooks/route.ts`
- `apps/api/components/workspace/verification-results.tsx`

### Modified
- `apps/api/components/workspace/model-card-viewer.tsx`
- `apps/api/components/notebook/NotebookViewer.tsx`
- `apps/api/app/globals.css` (theme changes)

### Backend
- `services/codeact_cardcheck/api_server.py` (already existed)
- `services/codeact_cardcheck/agent_main.py` (already existed)
- `services/codeact_cardcheck/venv/` (created, installed dependencies)

## Summary

✅ **Verify Model Card button** - Checks model card claims against code  
✅ **Verify Notebooks button** - Identifies notebook changes not in model card  
✅ **Highlighting in notebooks** - Red/yellow borders and inline issue display  
✅ **Highlighting in model card** - Yellow backgrounds and red code snippets  
✅ **Verification results UI** - Comprehensive report with scores and findings  
✅ **CodeAct Agent integration** - FastAPI backend with AST-grep analysis  
✅ **Real-time consistency scoring** - Weighted score across 6 categories  

The implementation is complete and ready for testing! 🎉

