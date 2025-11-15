# Terminal Logging Implementation

## Overview

Added comprehensive terminal-only logging system with colored output, structured formatting, and log levels for better visibility into the verification pipeline.

## Features

### 1. **Colored Terminal Output**
- **INFO** (Cyan): General information
- **WARN** (Yellow): Warnings
- **ERROR** (Red): Errors
- **SUCCESS** (Green): Success messages
- **DEBUG** (Dim White): Debug information

### 2. **Structured Formatting**
- Timestamps (HH:MM:SS format)
- Log level indicators
- Component names (e.g., `[CodeActAPI]`, `[ClaimExtractor]`)
- Optional data/metadata display

### 3. **Section Headers**
- Visual section dividers for major operations
- Progress indicators with step counts

## Implementation

### New File: `services/codeact_cardcheck/tools/terminal_logger.py`

Terminal logger utility with:
- `TerminalLogger` class for structured logging
- Convenience functions: `info()`, `warn()`, `error()`, `success()`, `debug()`
- Section headers and dividers
- Progress tracking

### Integration Points

#### 1. **API Server** (`api_server.py`)
- Logs incoming verification requests
- Logs LLM provider and model information
- Logs verification start/completion
- Logs errors with context

**Example Output:**
```
============================================================
              CodeAct Verification Request
============================================================

14:23:45 [INFO] [CodeActAPI] LLM Provider: openrouter (provider=openrouter)
14:23:45 [INFO] [CodeActAPI] LLM Model: openai/gpt-5-nano (model=openai/gpt-5-nano)
14:23:45 [INFO] [CodeActAPI] Model card size: 57703 chars (size=57703)
14:23:45 [INFO] [CodeActAPI] Starting CodeAct verification...
14:24:12 [SUCCESS] [CodeActAPI] Verification completed successfully (claims_verified=15)
```

#### 2. **Claim Extractor** (`llm_claim_extractor.py`)
- Logs claim extraction start
- Logs token counts and model information
- Logs extraction results
- Logs errors with helpful suggestions

**Example Output:**
```
============================================================
                    Claim Extraction
============================================================

14:23:46 [INFO] [ClaimExtractor] Model card length: 57703 chars
14:23:46 [INFO] [ClaimExtractor] Estimated total tokens: ~14425 (tokens=14425)
14:23:46 [INFO] [ClaimExtractor] Calling openrouter API (provider=openrouter, model=openai/gpt-5-nano)
14:24:10 [SUCCESS] [ClaimExtractor] Extracted 15 claims (count=15)
```

## Usage Examples

### Basic Logging
```python
from tools.terminal_logger import get_logger

logger = get_logger("MyComponent")

logger.info("Processing started")
logger.success("Operation completed")
logger.warn("Potential issue detected")
logger.error("Operation failed", {"error_code": 500})
```

### Section Headers
```python
logger.section("Verification Pipeline")
logger.info("Step 1: Reading model card...")
logger.info("Step 2: Extracting claims...")
logger.divider()  # Visual separator
```

### Progress Tracking
```python
logger.progress(1, 5, "Processing claim 1")
logger.progress(2, 5, "Processing claim 2")
```

## Log Levels

- **DEBUG**: Detailed diagnostic information (only shown if min_level=DEBUG)
- **INFO**: General informational messages
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages for failures
- **SUCCESS**: Success confirmations

## Benefits

1. **Better Visibility**: Colored output makes it easy to scan logs
2. **Structured Format**: Consistent formatting across all components
3. **Terminal Only**: No file I/O overhead, fast output
4. **Context**: Includes metadata (tokens, counts, etc.) for debugging
5. **Professional**: Clean, readable output for monitoring

## Example Full Output

```
============================================================
              CodeAct Verification Request
============================================================

14:23:45 [INFO] [CodeActAPI] LLM Provider: openrouter (provider=openrouter)
14:23:45 [INFO] [CodeActAPI] LLM Model: openai/gpt-5-nano (model=openai/gpt-5-nano)
14:23:45 [INFO] [CodeActAPI] Model card size: 57703 chars (size=57703)
14:23:45 [INFO] [CodeActAPI] Repo path: /path/to/repo (repo_path=/path/to/repo)
14:23:45 [INFO] [CodeActAPI] Starting CodeAct verification...

============================================================
                    Claim Extraction
============================================================

14:23:46 [INFO] [ClaimExtractor] Model card length: 57703 chars
14:23:46 [INFO] [ClaimExtractor] Estimated total tokens: ~14425 (tokens=14425)
14:23:46 [INFO] [ClaimExtractor] Calling openrouter API (provider=openrouter, model=openai/gpt-5-nano)
14:24:10 [SUCCESS] [ClaimExtractor] Extracted 15 claims (count=15)

14:24:12 [SUCCESS] [CodeActAPI] Verification completed successfully (claims_verified=15)
```

## Notes

- All logging goes to `stderr` (standard error stream)
- Colors are ANSI codes (works in most modern terminals)
- Logging is non-blocking and fast
- No file I/O overhead
- Compatible with existing progress callback system

