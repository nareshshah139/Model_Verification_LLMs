# How CodeAct Agent Verifies Model Cards

## 🎯 Overview

The **CodeAct Agent** uses a **code-first verification approach** that analyzes actual code (notebooks and Python files) to verify if the model card claims match reality. It's like having an automated code reviewer that reads your model card, then checks if your code actually does what the card says it does.

## 🔄 10-Step Verification Workflow

### **Step 1: Parse Model Card → Extract Claims**

The agent reads your model card and extracts **ClaimsSpec** - a structured JSON of what you claim in the card.

**What it extracts:**
- Model family (LogisticRegression, XGBoost, etc.)
- Score scale (e.g., 300-850)
- Risk classes (A, B, C, D, E, etc.)
- Data splits (train: 2015-2018, test: 2019)
- Excluded columns (leakage prevention)
- Bounds (rate clipping ranges)
- Metrics (AUC, KS, etc.)

**Example ClaimsSpec:**
```json
{
  "model_id": "CREDIT-RISK-V1",
  "family": {
    "pd": "logistic_scorecard",
    "lgd": "two_stage_hurdle",
    "ead": "linear_regression_on_ccf"
  },
  "splits": {
    "train": "2015-2018",
    "test": "2019",
    "strategy": "out_of_time"
  },
  "features_policy": {
    "exclude_columns": ["out_prncp", "total_pymnt", "recoveries"]
  }
}
```

**How it works:**
- Uses regex patterns to find keywords in the model card
- Converts natural language to structured data
- Looks for common ML terminology:
  - "Logistic Regression" → `pd: "logistic_scorecard"`
  - "Two-stage hurdle model" → `lgd: "two_stage_hurdle"`
  - "Excluded columns: out_prncp, total_pymnt" → `exclude_columns: [...]`

---

### **Step 2: Prepare Repository**

The agent needs access to your code to verify the claims.

**Options:**
1. **Clone from GitHub**: `repo_url = "https://github.com/user/repo.git"`
2. **Use local path**: `repo_path = "/path/to/Lending-Club-Credit-Scoring"`

**What it does:**
- Clones repository (if URL provided)
- Validates path exists
- Finds all notebooks and Python files

---

### **Step 3: Process Notebooks**

Since Jupyter notebooks are JSON files, they need to be converted to Python for analysis.

**Process:**
1. Find all `*.ipynb` files
2. Convert to Python using `nbconvert`:
   ```python
   notebook.ipynb → notebook.py
   ```
3. Preserve code structure
4. Extract only code cells (ignore markdown)

**Example conversion:**
```python
# Notebook Cell 1
import pandas as pd
from sklearn.linear_model import LogisticRegression

# Notebook Cell 2
model = LogisticRegression(max_iter=100)
model.fit(X_train, y_train)
```

---

### **Step 4: Format Code**

The agent formats all Python code for consistent analysis.

**Tools used:**
- **Black**: Python code formatter
- **Ruff**: Fast Python linter

**Why format?**
- Consistent indentation
- Standardized quotes
- Easier pattern matching

---

### **Step 5: Run AST-grep Scans** ⭐ (Most Important!)

This is where the magic happens! The agent uses **AST-grep** (Abstract Syntax Tree grep) to analyze code patterns.

**What is AST-grep?**
- A tool that searches code by structure, not just text
- Understands Python syntax
- Finds patterns like "LogisticRegression with any arguments"

**6 Rulepacks Executed:**

#### 1️⃣ **algorithms.yaml** - Detects model types
```yaml
- id: pd-logistic-used
  language: python
  rule:
    pattern: LogisticRegression($$$ARGS)
```
**Finds:** `model = LogisticRegression(max_iter=100)`

#### 2️⃣ **leakage.yaml** - Detects data leakage
```yaml
- id: possible-leakage-columns
  language: python
  rule:
    regex: '\b(out_prncp|total_pymnt|recoveries)\b'
```
**Finds:** `features = ['out_prncp', 'loan_amnt']` ❌ (out_prncp is leakage!)

#### 3️⃣ **splits.yaml** - Validates train/test splits
```yaml
- id: train-test-split-found
  rule:
    pattern: train_test_split($$$)
```
**Finds:** Split methodology in code

#### 4️⃣ **metrics.yaml** - Checks metric calculations
```yaml
- id: roc-auc-computed
  rule:
    pattern: roc_auc_score($$$)
```
**Finds:** Metric computation code

#### 5️⃣ **preprocessing.yaml** - Validates preprocessing
```yaml
- id: standardization-used
  rule:
    pattern: StandardScaler($$$)
```
**Finds:** Scaling and normalization

#### 6️⃣ **packaging.yaml** - Checks model serialization
```yaml
- id: joblib-dump-model
  rule:
    pattern: joblib.dump($$$)
```
**Finds:** Model saving/loading code

**Output: Evidence Table**
```json
{
  "algorithms": [
    {
      "rule_id": "pd-logistic-used",
      "file": "notebooks/3_pd_modeling.ipynb",
      "line": 45,
      "matched": "model = LogisticRegression(max_iter=100)"
    }
  ],
  "leakage": [
    {
      "rule_id": "possible-leakage-columns",
      "file": "notebooks/1_data_cleaning.ipynb",
      "line": 23,
      "matched": "features = ['out_prncp', 'loan_amnt']"
    }
  ]
}
```

---

### **Step 6: Resolve Claims vs Evidence**

The agent compares what you **claimed** vs what it **found**.

**Matching Logic:**

| Claim | Evidence | Result |
|-------|----------|--------|
| "Logistic Regression" | Found `LogisticRegression()` | ✅ Match |
| "Excluded out_prncp" | Found `out_prncp` in features | ❌ Mismatch |
| "Train: 2015-2018" | Found `df[df.year < 2019]` | ✅ Match |
| "AUC > 0.8" | Found `auc_score = 0.75` | ❌ Mismatch |

---

### **Step 7: Calculate Consistency Score**

The agent calculates a **weighted consistency score** across all categories.

**Weights:**
- **Algorithm family**: 30% (most important)
- **Leakage exclusion**: 25% (critical)
- **Metrics agreement**: 15%
- **Data splits**: 15%
- **Preprocessing**: 10%
- **Packaging**: 5%

**Scoring Example:**
```python
Algorithm Match:  100% × 0.30 = 0.30
Leakage Check:     0% × 0.25 = 0.00  # Found leakage!
Metrics Match:    80% × 0.15 = 0.12
Splits Match:    100% × 0.15 = 0.15
Preprocessing:    90% × 0.10 = 0.09
Packaging:       100% × 0.05 = 0.05
─────────────────────────────────
Total Score:                  71%
```

**Score Interpretation:**
- **90-100%**: Excellent - card matches code
- **80-89%**: Good - minor discrepancies
- **70-79%**: Fair - some issues to address
- **<70%**: Poor - significant mismatches

---

### **Step 8: Generate Reports**

The agent creates two types of reports:

#### **JSON Report** (`verification_report.json`)
```json
{
  "consistency_score": 0.71,
  "claims_spec": {...},
  "evidence_table": {...},
  "timestamp": "2025-11-12T10:30:00Z"
}
```

#### **Markdown Report** (`verification_report.md`)
```markdown
# Model Card Verification Report

## Summary
- **Consistency Score**: 71%
- **Status**: ⚠️ Fair

## Findings

### 🔴 Critical Issues (2)
1. **Data Leakage Detected** - Line 23 in `1_data_cleaning.ipynb`
   - Column `out_prncp` found in features
   - This column is post-origination and causes leakage

### ⚠️ Warnings (3)
1. **Algorithm Mismatch** - Found XGBoost, claimed LogisticRegression
```

---

### **Step 9: Optional - Runtime Metric Validation**

If `runtime_enabled=True`, the agent can actually **execute notebooks** to verify metrics.

**What it does:**
1. Runs notebooks using Papermill
2. Extracts computed metrics
3. Compares with claimed metrics
4. Flags discrepancies

**Example:**
- **Claimed**: "AUC = 0.85"
- **Computed**: AUC = 0.78
- **Result**: ❌ Metric mismatch (0.07 difference)

---

### **Step 10: Return Results**

The verification is complete! Results are returned to the UI.

**What you get:**
- ✅ Consistency score
- ✅ Detailed findings by category
- ✅ File paths and line numbers for issues
- ✅ Code snippets showing problems
- ✅ Severity levels (error/warning)

---

## 🧠 How AST-grep Works (Deep Dive)

### **Traditional Text Search:**
```python
# grep "LogisticRegression"
# Finds: "LogisticRegression" anywhere in text
# Problems:
# - Matches comments
# - Matches strings
# - Can't understand context
```

### **AST-grep (Smart Search):**
```yaml
pattern: LogisticRegression($$$ARGS)
```
**Understands:**
- `LogisticRegression()` ✅ Match
- `LogisticRegression(max_iter=100)` ✅ Match
- `LogisticRegression(C=0.1, penalty='l2')` ✅ Match
- `"LogisticRegression"` in a string ❌ No match (it's just text)
- `# LogisticRegression` in a comment ❌ No match (it's a comment)

**Pattern Syntax:**
- `$$$ARGS` = any arguments
- `$VAR` = single variable
- `any: [...]` = match any of these
- `all: [...]` = must match all

---

## 🎨 Visual Example: Full Flow

```
Model Card (Input)
│
│ "We use Logistic Regression for PD modeling"
│ "Excluded columns: out_prncp, total_pymnt"
│ "Train: 2015-2018, Test: 2019"
│
▼
┌─────────────────────────┐
│ Step 1: Parse Card      │
│ Extract ClaimsSpec      │
└─────────────────────────┘
│
│ ClaimsSpec = {
│   family: {pd: "logistic_scorecard"},
│   exclude_columns: ["out_prncp", "total_pymnt"]
│ }
│
▼
┌─────────────────────────┐
│ Step 5: AST-grep Scan   │
│ Search actual code      │
└─────────────────────────┘
│
│ Evidence = {
│   algorithms: [LogisticRegression found ✅],
│   leakage: [out_prncp found in code ❌]
│ }
│
▼
┌─────────────────────────┐
│ Step 7: Compare         │
│ Claims vs Evidence      │
└─────────────────────────┘
│
│ • Algorithm: Match ✅
│ • Leakage: Mismatch ❌ (claimed excluded but found in code!)
│
▼
┌─────────────────────────┐
│ Step 8: Calculate Score │
│ Weighted average        │
└─────────────────────────┘
│
│ Consistency Score: 75%
│ Status: Fair (has issues)
│
▼
Report Generated 📄
```

---

## 🔍 Real Example: Data Leakage Detection

### **Model Card Claims:**
```markdown
## Feature Engineering
We carefully exclude post-origination columns to prevent leakage:
- `out_prncp` (outstanding principal)
- `total_pymnt` (total payment received)
- `recoveries` (recovery amounts)
```

### **Actual Code (Notebook):**
```python
# Cell 5: Feature selection
features = [
    'loan_amnt',
    'int_rate',
    'annual_inc',
    'out_prncp',      # ⚠️ LEAKAGE!
    'dti'
]

X = df[features]
y = df['default']
```

### **CodeAct Verification:**
1. **Reads claim**: "Excluded `out_prncp`"
2. **Runs leakage.yaml rule**: Searches for `out_prncp`
3. **Finds match**: Line 8 in notebook
4. **Reports issue**: ❌ "Claimed excluded but found in features"
5. **Highlights in red**: Shows the problematic line in UI

---

## 🎯 Why This Approach Works

### ✅ **Advantages:**

1. **Code-First Truth**
   - Code doesn't lie
   - Documentation might be outdated
   - Code is the source of truth

2. **Automated**
   - No manual code review needed
   - Consistent checking
   - Runs in seconds

3. **Precise**
   - AST-level analysis (understands code structure)
   - Not just text matching
   - Context-aware

4. **Comprehensive**
   - Checks 6 different categories
   - Weighted scoring
   - Detailed line-by-line findings

5. **Actionable**
   - Shows exact file and line number
   - Displays problematic code
   - Suggests what's wrong

### ⚠️ **Limitations:**

1. **Pattern-Based**
   - Can only detect what rules define
   - May miss edge cases
   - Needs good rule coverage

2. **Static Analysis**
   - Doesn't execute code by default
   - Can't validate runtime behavior
   - May miss dynamic issues

3. **Regex Parsing**
   - Model card parsing uses regex
   - Not as robust as NLP
   - Needs structured cards

---

## 🛠️ Technologies Used

| Technology | Purpose | Why |
|------------|---------|-----|
| **AST-grep** | Code pattern matching | Fast, accurate, syntax-aware |
| **nbconvert** | Notebook → Python | Analyze notebook code |
| **Black** | Code formatting | Consistent structure |
| **Ruff** | Code linting | Quality checks |
| **BeautifulSoup** | HTML parsing | Extract text from cards |
| **Regex** | Pattern extraction | Find claims in text |
| **FastAPI** | API server | Expose verification service |

---

## 📊 Summary

The CodeAct Agent verification works by:

1. **📖 Reading** your model card claims
2. **🔍 Searching** your actual code with AST-grep
3. **⚖️ Comparing** claims vs evidence
4. **📊 Scoring** consistency (weighted)
5. **📝 Reporting** issues with line numbers

**Result:** You get an automated code review that tells you:
- ✅ What matches (good!)
- ❌ What doesn't match (fix this!)
- 📍 Where to look (exact file:line)
- 🎯 How critical (error/warning)

It's like having a **robot code reviewer** that never gets tired and always checks if your documentation matches your code! 🤖✨

---

**Pro Tip:** Keep your model card and code in sync. CodeAct will catch discrepancies automatically! 🎉

