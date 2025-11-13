# LLM + ast-grep Integration

This document explains how the LLM can call ast-grep as a tool to perform code checks and generate reports.

## Architecture

The integration consists of three main components:

1. **CodeAct CardCheck API Service** (`services/codeact_cardcheck/api_server.py`)
   - Exposes ast-grep endpoints: `/astgrep/scan`, `/astgrep/run`, `/astgrep/rulepacks`
   - Runs on port 8001

2. **LLM Analysis Module** (`apps/api/src/lib/llm-analysis.ts`)
   - Defines ast-grep tools for the LLM to call
   - Orchestrates LLM analysis with function calling
   - Uses OpenAI GPT-4o-mini with tool support

3. **API Endpoints**
   - `/api/analyze/[modelVersionId]/llm-astgrep` - LLM-powered analysis with ast-grep tools
   - `/api/analyze/[modelVersionId]` - CodeAct CardCheck service (rule-based, no LLM)

## How It Works

### 1. LLM Tool Definitions

The LLM has access to three ast-grep tools:

- **`astGrepScan`**: Scan code using a rulepack (YAML file)
  - Parameters: `rulepack` (e.g., "algorithms.yaml"), `paths` (optional)
  - Returns: List of matches found

- **`astGrepRun`**: Run ad-hoc pattern search
  - Parameters: `pattern` (AST pattern), `lang` (default: "python"), `paths` (optional)
  - Returns: List of matches found

- **`listRulepacks`**: List available rulepack files
  - Returns: Array of rulepack names

### 2. LLM Workflow

1. LLM receives model card claims and code facts
2. LLM calls `listRulepacks` to see available rulepacks
3. LLM strategically calls `astGrepScan` with relevant rulepacks:
   - `algorithms.yaml` - Check model family (LogisticRegression, LightGBM, etc.)
   - `leakage.yaml` - Check for data leakage
   - `splits.yaml` - Verify data split strategy
   - `metrics.yaml` - Check bounds/clipping
   - `preprocessing.yaml` - Verify preprocessing steps
   - `packaging.yaml` - Check model artifacts and seeds
4. LLM may call `astGrepRun` for custom pattern searches
5. LLM analyzes results and generates discrepancy report

### 3. Example Usage

```typescript
// In your API route
import { runLLMAnalysisWithAstGrep } from "@/lib/llm-analysis";

const result = await runLLMAnalysisWithAstGrep(
  modelVersionId,
  modelCardId,
  repoPath, // Local path to cloned repository
  codeFacts,
  cardFacts
);

// result.discrepancies contains the findings
// result.report contains full LLM report with tool calls
```

## API Endpoints

### POST `/api/analyze/[modelVersionId]/llm-astgrep`

Runs LLM analysis with ast-grep tools.

**Response:**
```json
{
  "success": true,
  "discrepancies": [
    {
      "category": "algorithm",
      "severity": "high",
      "description": "Model card claims LogisticRegression but code uses XGBoost",
      "evidence": {
        "file": "model.py",
        "line": 42,
        "code": "XGBClassifier()"
      }
    }
  ],
  "report": {
    "text": "...",
    "toolCalls": [...],
    "toolResults": [...]
  },
  "count": 1
}
```

### POST `/services/codeact_cardcheck/astgrep/scan`

Direct ast-grep scan endpoint (used by LLM tools).

**Request:**
```json
{
  "rulepack": "algorithms.yaml",
  "paths": ["src/"],
  "repo_path": "/path/to/repo",
  "json_output": true
}
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "file": "src/model.py",
      "line": 42,
      "rule_id": "pd-logistic-used",
      "content": "LogisticRegression()"
    }
  ]
}
```

## Configuration

Set environment variables in `apps/api/.env`:

### Using OpenAI (default)

```bash
CARDCHECK_API_URL=http://localhost:8001
OPENAI_API_KEY=your-openai-api-key
# Optional: specify model (default: gpt-4o-mini)
LLM_MODEL=gpt-4o-mini
```

### Using Anthropic

```bash
CARDCHECK_API_URL=http://localhost:8001
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
# Optional: specify model (default: claude-3-5-sonnet-20241022)
LLM_MODEL=claude-3-5-sonnet-20241022
```

### Available Models

**OpenAI:**
- `gpt-4o-mini` (default)
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic:**
- `claude-3-5-sonnet-20241022` (default)
- `claude-3-5-sonnet-20240620`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

## Prerequisites

1. **ast-grep installed**: The `sg` binary must be in PATH
   ```bash
   brew install ast-grep
   # or
   cargo install ast-grep
   ```

2. **CodeAct CardCheck service running**:
   ```bash
   cd services/codeact_cardcheck
   source .venv/bin/activate
   python api_server.py
   ```

3. **LLM API key**: Required for LLM function calling
   - OpenAI: Set `OPENAI_API_KEY` (default provider)
   - Anthropic: Set `ANTHROPIC_API_KEY` and `LLM_PROVIDER=anthropic`

## Benefits

- **Intelligent Analysis**: LLM decides which rulepacks to use based on model card claims
- **Custom Patterns**: LLM can create ad-hoc patterns when rulepacks don't cover specific cases
- **Evidence-Backed**: Every finding includes file paths, line numbers, and code snippets
- **Comprehensive**: Combines rule-based checks with LLM reasoning

## Example LLM Tool Call Flow

```
1. LLM: "I need to check if LogisticRegression is used as claimed"
   → Calls astGrepScan("algorithms.yaml")

2. LLM receives matches, analyzes them
   → "Found LogisticRegression in model.py:42, but also found XGBoost in train.py:15"

3. LLM: "Let me check the training script more carefully"
   → Calls astGrepRun("XGBClassifier($$$ARGS)", lang="python", paths=["train.py"])

4. LLM generates discrepancy report with evidence
```

## Next Steps

- Add more rulepacks for specific use cases
- Improve LLM prompts for better analysis
- Add streaming support for real-time progress
- Cache ast-grep results to reduce API calls

