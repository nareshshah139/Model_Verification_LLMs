# Delta View & Drift Detection Dashboard

## Overview

A comprehensive notebook drift detection system that allows you to upload a modified notebook and compare it against baseline versions to detect changes categorized by materiality tier.

## Features

### 1. **Notebook Upload & Comparison**
- Select from predefined baseline notebooks
- Upload modified `.ipynb` files for comparison
- Automatic code extraction and analysis

### 2. **Materiality-Based Drift Detection**

The system detects **14 different drift categories** organized into 3 materiality tiers:

#### **Tier 1 (T1) - Critical** 🔴
Material impact on model behavior, predictions, and business outcomes:
- Label coding inversions
- LGD definition/algorithm changes
- EAD definition/algorithm changes
- Score scale, bands, ROI floor modifications
- PD Horizon differences
- Population filter changes

#### **Tier 2 (T2) - Significant** 🟠
Affects model performance metrics and explainability:
- Validation split logic changes
- PD preprocessing differences
- Class weight / regularization changes
- Imputation policy modifications

#### **Tier 3 (T3) - Minor** 🔵
Cosmetic or operational changes with negligible impact:
- Monitoring thresholds phrasing
- Variable naming conventions
- Rounding in plots
- Python version differences

### 3. **Visual Dashboard**

#### Overview Tab
- Summary cards showing counts by materiality tier
- Materiality tier definitions and descriptions
- Affected categories list

#### Detected Drifts Tab
- Filterable list of all detected drifts
- Evidence snippets showing actual code differences
- Side-by-side comparison of Model Card vs. Repo Code
- Severity badges and rationale for each drift

#### Code Changes Tab
- Line addition/removal statistics
- Modified cells count
- Detailed change summary

## Architecture

### Frontend Components

#### `/apps/api/app/dashboard/delta/page.tsx`
Main page component for the Delta View dashboard.

```typescript
- Title: "Notebook Delta & Drift Detection"
- Navigation: Links to Claims Dashboard and Workspace
- Embeds: DeltaView component
```

#### `/apps/api/components/workspace/delta-view.tsx`
Upload interface and comparison orchestrator.

**Features:**
- Baseline notebook selection dropdown
- Modified notebook file upload
- Analysis trigger button
- Results display container

#### `/apps/api/components/workspace/drift-analysis-results.tsx`
Comprehensive results visualization component.

**Features:**
- Three-tab interface (Overview, Drifts, Code)
- Tier-based filtering
- Color-coded materiality indicators
- Evidence display with code snippets

### Backend API

#### `/apps/api/app/api/analyze-drift/route.ts`
POST endpoint for drift analysis.

**Request Body:**
```json
{
  "baselinePath": "notebooks/3_pd_modeling.ipynb",
  "modifiedNotebook": { /* parsed notebook JSON */ },
  "repoPath": "/path/to/repo"
}
```

**Response:**
```json
{
  "totalChanges": 5,
  "affectedCategories": ["Label coding", "PD preprocessing"],
  "drifts": [
    {
      "id": 1,
      "name": "Label coding",
      "materialityTier": "T1",
      "detected": true,
      "evidence": ["snippet1", "snippet2"],
      "severity": "high"
    }
  ],
  "summary": {
    "t1Count": 2,
    "t2Count": 2,
    "t3Count": 1
  },
  "codeComparison": {
    "addedLines": 45,
    "removedLines": 23,
    "modifiedCells": 12
  }
}
```

**Analysis Logic:**
1. Extract code from both notebooks (baseline and modified)
2. Check for keyword matches and behavioral differences
3. Apply heuristics for specific drift patterns
4. Categorize detected drifts by materiality tier
5. Generate evidence snippets

## Navigation

### Access Points

1. **From Workspace**: SuperTabs → "Delta View" tab
2. **From Claims Dashboard**: Header → "Delta View" button
3. **Direct URL**: `/dashboard/delta`

### Updated Components

#### `/apps/api/components/workspace/super-tabs.tsx`
Added third tab option:
- Notebook (workspace)
- Dashboard (claims)
- **Delta View** (drift detection) ✨ NEW

#### `/apps/api/app/dashboard/page.tsx`
Added navigation button in header to access Delta View.

## Usage Guide

### Step-by-Step Workflow

1. **Navigate to Delta View**
   - Click "Delta View" tab in the top navigation
   - Or go to `/dashboard/delta` directly

2. **Select Baseline Notebook**
   - Use dropdown to choose from:
     - Data Cleaning & Understanding
     - EDA
     - PD Modeling
     - LGD/EAD Modeling
     - PD Model Monitoring

3. **Upload Modified Notebook**
   - Click "Choose File" button
   - Select your modified `.ipynb` file
   - File validation checks for `.ipynb` extension

4. **Analyze Drift**
   - Click "Analyze Drift & Changes" button
   - System extracts code from both notebooks
   - Detects drifts across 14 categories
   - Generates comparison metrics

5. **Review Results**
   - **Overview Tab**: See summary by materiality tier
   - **Detected Drifts Tab**: Filter and review specific drifts
   - **Code Changes Tab**: View line-level statistics

6. **Interpret Findings**
   - **T1 Drifts**: Require immediate attention and model card updates
   - **T2 Drifts**: Review for consistency and documentation updates
   - **T3 Drifts**: Generally safe, cosmetic changes

## Drift Detection Logic

### Keyword Matching
Each drift seed has associated keywords. The system:
1. Searches for keywords in baseline and modified code
2. Compares presence/absence between versions
3. Extracts contextual snippets as evidence

### Pattern-Based Detection
Special heuristics for common patterns:
- **Label Coding**: Detects target/default variable changes
- **Preprocessing**: Identifies WOE vs. one-hot encoding differences
- **Algorithm Changes**: Finds method signature differences

### Evidence Collection
- Extracts 30-character context around detected keywords
- Limits to top 3 evidence snippets per drift
- Displays in monospace font for code readability

## Technical Details

### Supported Notebooks
The system is configured for the Lending Club Credit Scoring project:
- `notebooks/1_data_cleaning_understanding.ipynb`
- `notebooks/2_eda.ipynb`
- `notebooks/3_pd_modeling.ipynb`
- `notebooks/4_lgd_ead_modeling.ipynb`
- `notebooks/5_pd_model_monitoring.ipynb`

### File Format
Only `.ipynb` (Jupyter Notebook) files are supported.

### Code Extraction
- Extracts only code cells (ignores markdown)
- Handles both array and string source formats
- Joins all code with double newlines

### Comparison Algorithm
- Simple line-based diff
- Counts unique added/removed lines
- Estimates modified cells from overlap

## UI Components

### Color Scheme
- **T1 (Red)**: `bg-red-50`, `border-red-200`, `text-red-600`
- **T2 (Orange)**: `bg-orange-50`, `border-orange-200`, `text-orange-600`
- **T3 (Blue)**: `bg-blue-50`, `border-blue-200`, `text-blue-600`

### Icons
- `AlertTriangle`: T1 Critical
- `AlertCircle`: T2 Significant
- `Info`: T3 Minor
- `Upload`: File upload
- `FileSearch`: Analysis results
- `GitCompare`: Drift comparison
- `Code`: Code changes

## Future Enhancements

### Potential Improvements
1. **LLM-Based Semantic Diff**: Use Claude to detect semantic changes beyond keyword matching
2. **Visual Diff Viewer**: Side-by-side code comparison with highlighting
3. **Historical Tracking**: Store drift analysis history over time
4. **Export Reports**: Generate PDF/HTML reports of drift analysis
5. **Custom Drift Seeds**: Allow users to define custom drift categories
6. **Multi-Notebook Comparison**: Compare multiple notebooks simultaneously
7. **Integration with Version Control**: Automatically detect changes from git diffs

## Files Created

```
apps/api/
├── app/
│   ├── api/
│   │   └── analyze-drift/
│   │       └── route.ts          # Drift analysis API endpoint
│   └── dashboard/
│       ├── page.tsx               # Claims dashboard (updated)
│       └── delta/
│           └── page.tsx           # Delta View main page
└── components/
    ├── ui/
    │   └── select.tsx             # (existing)
    └── workspace/
        ├── delta-view.tsx         # Upload & comparison UI
        ├── drift-analysis-results.tsx  # Results visualization
        └── super-tabs.tsx         # Navigation tabs (updated)
```

## Quick Start

```bash
# Ensure the Next.js app is running
cd apps/api
pnpm dev

# Navigate to Delta View
# Open http://localhost:3000/dashboard/delta

# Select a baseline notebook
# Upload your modified .ipynb file
# Click "Analyze Drift & Changes"
# Review results in the three tabs
```

## Example Use Case

**Scenario**: A data scientist modifies the PD modeling notebook to use different preprocessing.

1. Select "PD Modeling" as baseline
2. Upload modified `3_pd_modeling_v2.ipynb`
3. System detects:
   - **T2 Drift**: PD preprocessing (WOE → one-hot encoding)
   - **T3 Drift**: Variable naming changes
4. Review evidence showing actual code differences
5. Update model card documentation accordingly

## Benefits

✅ **Early Detection**: Catch model-code inconsistencies before deployment  
✅ **Compliance**: Ensure model cards accurately reflect implementation  
✅ **Risk Management**: Prioritize changes by materiality tier  
✅ **Transparency**: Clear evidence and rationale for each detected drift  
✅ **Efficiency**: Automated analysis saves manual review time

## Notes

- The drift seeds are based on your provided table of 14 drift categories
- Detection is keyword and pattern-based; consider adding LLM-based semantic analysis for higher accuracy
- The system currently uses simple line diff; consider implementing proper AST-based code comparison for production use

---

**Status**: ✅ Fully Implemented  
**Ready for Testing**: Yes  
**Documentation**: Complete

