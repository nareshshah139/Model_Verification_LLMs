# CodeAct CardCheck

A CodeAct-style agent that uses **ast-grep** to compare model cards to actual Python/Jupyter codebases, then outputs a line-item, evidence-backed consistency report.

## Features

- **Model Card Parsing**: Extracts structured ClaimsSpec JSON from Markdown/HTML/Docx model cards
- **Code Analysis**: Uses ast-grep for structural code scanning with YAML rulepacks
- **Notebook Support**: Converts Jupyter notebooks to Python for analysis
- **Evidence Collection**: Gathers evidence for/against model card claims
- **Dynamic Metrics** (optional): Re-runs notebooks to verify reported metrics
- **Comprehensive Reports**: Generates both JSON and Markdown reports

## Installation

```bash
cd services/codeact_cardcheck
pip install -e .
```

Or using uv:

```bash
cd services/codeact_cardcheck
uv venv
source .venv/bin/activate
uv pip install -e .
```

### Prerequisites

- Python 3.10+
- [ast-grep](https://ast-grep.github.io/) installed and available as `sg` in PATH
- Optional: `black` and `ruff` for code formatting
- Optional: `nbconvert` and `nbclient` for notebook operations

## Usage

### Basic Usage

```bash
python agent_main.py model_card.md --repo-url https://github.com/user/repo.git --output-dir ./reports
```

### With Local Repository

```bash
python agent_main.py model_card.md --repo-path ./local-repo --output-dir ./reports
```

### With Dynamic Metrics

```bash
python agent_main.py model_card.md --repo-url https://github.com/user/repo.git --runtime --output-dir ./reports
```

## Architecture

```
codeact_cardcheck/
├── agent_main.py          # Main orchestration script
├── tools/                 # Tool implementations
│   ├── repo_tool.py       # Git & file operations
│   ├── nb_tool.py         # Notebook conversion & execution
│   ├── formatter_tool.py  # Code formatting
│   ├── astgrep_tool.py    # ast-grep integration
│   ├── pyexec_tool.py     # Python execution
│   └── card_parser.py     # Model card parsing
├── rules/                 # ast-grep rulepacks
│   ├── algorithms.yaml
│   ├── preprocessing.yaml
│   ├── leakage.yaml
│   ├── splits.yaml
│   ├── metrics.yaml
│   └── packaging.yaml
├── schemas/               # JSON schemas
│   └── model_card.schema.json
└── reporters/             # Report generators
    ├── json_reporter.py
    └── md_reporter.py
```

## Rulepacks

The agent uses YAML rulepacks for ast-grep to detect:

- **Algorithms**: Model families (LogisticRegression, LightGBM, Beta regression, etc.)
- **Preprocessing**: Binning, encoding, scaling
- **Leakage**: Post-origination columns
- **Splits**: Time-based data splits
- **Metrics**: Bounds/clipping enforcement
- **Packaging**: Model artifacts, seed setting

## ClaimsSpec

The agent parses model cards into a normalized ClaimsSpec JSON:

```json
{
  "model_id": "CRS-LC-EL-2025-001",
  "family": {
    "pd": "logistic_scorecard",
    "lgd": "two_stage_hurdle",
    "ead": "linear_regression_on_ccf"
  },
  "score_scale": { "min": 300, "max": 850 },
  "risk_classes": ["AA","A","AB","BB","B","BC","C","CD","DD","F"],
  "splits": {
    "train": "2007-2013",
    "test": "2014",
    "monitor": "2015",
    "strategy": "out_of_time"
  },
  "features_policy": {
    "timepoint": "application_only",
    "exclude_columns": ["out_prncp","total_pymnt","recoveries",...]
  },
  "bounds": { "ccf": [0,1], "recovery_rate": [0,1] },
  "metrics": {
    "pd": { "auc_test": ">0.65", "ks": ">0.25" },
    "lgd": { "mae_test": null },
    "ead": { "mae_test": null },
    "el": { "portfolio_error_pct": "<=1.5%" }
  }
}
```

## Output

The agent generates two reports:

1. **verification_report.json**: Machine-readable structured report
2. **verification_report.md**: Human-readable Markdown report

Each finding includes:
- **Status**: Confirmed / Contradicted / Not Found / Non-verifiable
- **Evidence**: Code snippets with file:line references
- **Impact**: Low / Medium / High
- **Remediation**: Suggested fixes

## Consistency Score

The overall consistency score is calculated with weights:
- Algorithm family match: 30%
- Data split compliance: 15%
- Leakage exclusion: 25%
- Bound/clipping & scaling: 10%
- Artifacts & seeds: 5%
- Metrics agreement: 15%

## Extending

### Adding New Rules

Add YAML rulepacks to `rules/` directory. See [ast-grep documentation](https://ast-grep.github.io/reference/yaml.html) for rule syntax.

### Custom Parsers

Extend `CardParser` to support additional model card formats or extract more claims.

### Custom Reporters

Implement new reporters in `reporters/` to output in different formats.

## References

- [ast-grep](https://ast-grep.github.io/)
- [nbconvert](https://nbconvert.readthedocs.io/)
- [Lending Club Credit Scoring Example](https://github.com/allmeidaapedro/Lending-Club-Credit-Scoring)

