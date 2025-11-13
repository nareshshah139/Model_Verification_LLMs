# Installation Guide

## Prerequisites

### 1. Python 3.10+

Verify Python is installed:
```bash
python3 --version
```

### 2. Install ast-grep

ast-grep is a Rust-based tool. Install it using one of these methods:

#### Option A: Using Homebrew (macOS)
```bash
brew install ast-grep
```

#### Option B: Using Cargo (if Rust is installed)
```bash
cargo install ast-grep
```

#### Option C: Download Binary
1. Visit https://github.com/ast-grep/ast-grep/releases
2. Download the binary for your platform
3. Add to PATH or place in `/usr/local/bin/`

#### Option D: Using npm (if Node.js is installed)
```bash
npm install -g @ast-grep/cli
```

Verify installation:
```bash
sg --version
```

### 3. Install Python Dependencies

```bash
cd services/codeact_cardcheck
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

Or install dependencies manually:
```bash
pip install pydantic pyyaml nbconvert nbclient markdown beautifulsoup4
```

## Quick Start

### Test the Installation

```bash
cd services/codeact_cardcheck
source .venv/bin/activate
python test_agent.py
```

### Run Verification

```bash
python agent_main.py example_model_card.md \
  --repo-url https://github.com/user/repo.git \
  --output-dir ./reports
```

## Troubleshooting

### ast-grep not found

If you see `sg not found`, ensure ast-grep is installed and in your PATH:
```bash
which sg
```

If not found, add the binary location to your PATH or use `--sg-binary` flag:
```bash
python agent_main.py model_card.md --repo-url ... --sg-binary /path/to/sg
```

### Import Errors

If you see import errors, ensure all dependencies are installed:
```bash
pip install -r requirements.txt  # If you create one
# Or install individually:
pip install pydantic pyyaml nbconvert nbclient markdown beautifulsoup4
```

### Notebook Conversion Issues

If notebook conversion fails, ensure nbconvert is installed:
```bash
pip install nbconvert nbclient
```

### Code Formatting Issues

Optional dependencies for code formatting:
```bash
pip install black ruff
```

These are optional - the agent will work without them, but code won't be formatted.

