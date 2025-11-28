# Drift Metadata System - Implementation Guide

## Overview

This guide explains how to use **drift metadata files** to annotate notebooks with detected drifts without modifying the notebook itself. This approach keeps drift detection separate from the notebooks being analyzed.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Notebook (Clean, Unmodified)                       │
│  example_modified_pd_modeling.ipynb                 │
│                                                      │
│  Contains: Code, markdown, outputs                  │
│  No drift annotations embedded                      │
└─────────────────────────────────────────────────────┘
                          ↓
                    Analyzed by
                          ↓
┌─────────────────────────────────────────────────────┐
│  Drift Metadata File (Separate)                     │
│  example_drift_metadata.json                        │
│                                                      │
│  Contains:                                           │
│  • Cell-level drift mappings                        │
│  • Evidence snippets                                │
│  • Materiality tiers                                │
│  • Recommendations                                  │
└─────────────────────────────────────────────────────┘
                          ↓
                    Rendered by
                          ↓
┌─────────────────────────────────────────────────────┐
│  Dashboard View                                      │
│  Shows notebook + drift overlays                    │
│                                                      │
│  • Color-coded cells (T1/T2/T3)                     │
│  • Drift indicators                                 │
│  • Evidence tooltips                                │
│  • Recommendations panel                            │
└─────────────────────────────────────────────────────┘
```

## Files Created

### 1. `example_modified_pd_modeling.ipynb`

**Purpose**: Sample notebook derived from the repository that demonstrates various drifts

**Key Modifications** (vs. baseline):
- ✅ **Label coding inverted**: default=1, non-default=0 (was opposite)
- ✅ **PD horizon changed**: 9 months (was 12 months)
- ✅ **Score scale modified**: 300-850 (was 300-900)
- ✅ **Risk bands changed**: AA-F (was A-G)
- ✅ **ROI floor lowered**: 2.15% (was 3.00%)
- ✅ **Preprocessing switched**: One-hot encoding + StandardScaler (was WOE + min-max)
- ✅ **Validation strategy**: Out-of-time split (was random stratified)
- ✅ **Population filter**: Different criteria
- ✅ **Regularization**: Modified hyperparameters
- ✅ **Imputation**: Median imputation specified
- ✅ **Python version**: 3.10 (from 3.8)

**Structure**:
```
Cell 0: Markdown - Introduction (contains T1 drift: label coding)
Cell 1: Markdown - Project context
Cell 2: Code - Imports (contains T3 drift: Python version)
Cell 3: Code - Load data
Cell 4: Code - Missing value imputation (contains T2 drift: imputation policy)
Cell 5: Code - Target definition (contains T1 drifts: label coding, PD horizon)
Cell 6: Code - Train-test split (contains T2 drift: validation split logic)
Cell 7: Code - Preprocessing (contains T2 drift: encoding/scaling methods)
Cell 8: Code - Model training (contains T2 drift: regularization)
Cell 9: Code - Credit scoring (contains T1 drift: score scale/bands)
Cell 10: Code - Model evaluation (contains T3 drift: rounding)
Cell 11: Code - Credit policy (contains T1 drift: ROI floor)
Cell 12: Code - Population filter (contains T1 drift: filter criteria)
Cell 13: Code - Monitoring (contains T3 drift: phrasing)
Cell 14: Code - Summary
```

### 2. `example_drift_metadata.json`

**Purpose**: Standalone file containing all drift detection results

**Structure**:

```json
{
  "notebook_path": "...",
  "baseline_path": "...",
  "analysis_date": "...",
  "total_drifts": 10,
  "summary": {
    "t1_count": 5,
    "t2_count": 3,
    "t3_count": 2
  },
  "cell_drifts": [
    {
      "cell_index": 5,
      "cell_type": "code",
      "drift_ids": [1, 5],
      "drifts": [
        {
          "id": 1,
          "name": "Label coding",
          "materialityTier": "T1",
          "detected": true,
          "severity": "high",
          "model_card": "...",
          "repo_code": "...",
          "rationale": "...",
          "evidence": ["..."],
          "location": {
            "line": 4,
            "context": "..."
          }
        }
      ]
    }
  ],
  "affected_categories": [...],
  "code_comparison": {...},
  "recommendations": [...]
}
```

## Drift Metadata Schema

### Top Level

| Field | Type | Description |
|-------|------|-------------|
| `notebook_path` | string | Path to the analyzed notebook |
| `baseline_path` | string | Path to the baseline notebook |
| `analysis_date` | string (ISO 8601) | When analysis was performed |
| `total_drifts` | number | Total number of detected drifts |
| `summary` | object | Count by materiality tier |
| `cell_drifts` | array | Drift mappings per cell |
| `affected_categories` | array | List of drift category names |
| `code_comparison` | object | Line-level diff statistics |
| `recommendations` | array | Action items by tier |

### Cell Drift Object

| Field | Type | Description |
|-------|------|-------------|
| `cell_index` | number | 0-based cell index in notebook |
| `cell_type` | string | "code" or "markdown" |
| `drift_ids` | array | IDs of drifts in this cell |
| `drifts` | array | Full drift details |

### Drift Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Drift seed ID (1-14) |
| `name` | string | Drift category name |
| `materialityTier` | string | "T1", "T2", or "T3" |
| `detected` | boolean | Always true in this file |
| `severity` | string | "high", "medium", or "low" |
| `model_card` | string | What model card says |
| `repo_code` | string | What code actually does |
| `rationale` | string | Why this drift matters |
| `evidence` | array | Code snippets proving drift |
| `location` | object | Where in cell drift was found |

### Location Object

| Field | Type | Description |
|-------|------|-------------|
| `line` | number | Line number within cell |
| `context` | string | Surrounding context |

## How to Use

### 1. Load and Display in Dashboard

```typescript
// Load notebook
const notebook = await loadNotebook('example_modified_pd_modeling.ipynb');

// Load drift metadata
const driftMetadata = await loadJSON('example_drift_metadata.json');

// Render notebook with drift overlays
renderNotebookWithDrifts(notebook, driftMetadata);
```

### 2. Apply Drift Indicators to Cells

```typescript
function renderNotebookWithDrifts(notebook, metadata) {
  notebook.cells.forEach((cell, index) => {
    // Find drifts for this cell
    const cellDrift = metadata.cell_drifts.find(
      cd => cd.cell_index === index
    );
    
    if (cellDrift) {
      // Apply visual indicators based on highest severity
      const maxTier = getHighestTier(cellDrift.drifts);
      applyCellStyle(cell, maxTier);
      
      // Add drift badges
      cellDrift.drifts.forEach(drift => {
        addDriftBadge(cell, drift);
      });
    }
  });
}
```

### 3. Show Drift Details on Hover/Click

```typescript
function addDriftBadge(cell, drift) {
  const badge = createBadge({
    tier: drift.materialityTier,
    name: drift.name,
    severity: drift.severity
  });
  
  // Add tooltip/popover
  badge.addEventListener('click', () => {
    showDriftDetails({
      name: drift.name,
      rationale: drift.rationale,
      evidence: drift.evidence,
      modelCard: drift.model_card,
      repoCode: drift.repo_code
    });
  });
  
  cell.appendChild(badge);
}
```

### 4. Color-Code Cells by Tier

```typescript
function applyCellStyle(cell, tier) {
  const styles = {
    'T1': {
      border: '2px solid #DC2626',
      background: '#FEF2F2',
      icon: '🔴'
    },
    'T2': {
      border: '2px solid #EA580C',
      background: '#FFF7ED',
      icon: '🟠'
    },
    'T3': {
      border: '2px solid #2563EB',
      background: '#EFF6FF',
      icon: '🔵'
    }
  };
  
  Object.assign(cell.style, styles[tier]);
}
```

## Example Visualizations

### Cell with T1 Drift (Critical)

```
┌────────────────────────────────────────────────────┐
│ 🔴 T1: Label coding  🔴 T1: PD Horizon            │ ← Badges
├────────────────────────────────────────────────────┤
│  # Create target variable - INVERTED ENCODING      │
│  df['target'] = df['loan_status'].map({           │
│      'Fully Paid': 0,                              │
│      'Default': 1                                  │
│  })                                                 │
│                                                     │
│  # PD Horizon: 9 months (modified from 12)        │
│  df_pd = df[df['months_since_issue'] <= 9]        │
└────────────────────────────────────────────────────┘
   Red border indicating critical drift
```

### Cell with T2 Drift (Significant)

```
┌────────────────────────────────────────────────────┐
│ 🟠 T2: PD preprocessing                            │ ← Badge
├────────────────────────────────────────────────────┤
│  # One-hot encoding for categorical variables      │
│  train_encoded = pd.get_dummies(                   │
│      train_df[categorical_features],               │
│      drop_first=True                               │
│  )                                                  │
│                                                     │
│  # Standard scaling for numerical variables        │
│  scaler = StandardScaler()                         │
│  train_num_scaled = scaler.fit_transform(...)      │
└────────────────────────────────────────────────────┘
   Orange border indicating significant drift
```

### Cell with T3 Drift (Minor)

```
┌────────────────────────────────────────────────────┐
│ 🔵 T3: Rounding plots                              │ ← Badge
├────────────────────────────────────────────────────┤
│  plt.plot(fpr, tpr,                                │
│      label=f'ROC (AUC = {auc_test:.3f})')         │
│  #                             ↑ 3 decimals        │
└────────────────────────────────────────────────────┘
   Blue border indicating minor drift
```

## Integration with Delta View

### Update Delta View to Use Metadata

Modify `drift-analysis-results.tsx` to accept drift metadata:

```typescript
interface DriftAnalysisProps {
  notebook: NotebookJSON;
  driftMetadata: DriftMetadata;
}

export function DriftAnalysisWithMetadata({ 
  notebook, 
  driftMetadata 
}: DriftAnalysisProps) {
  return (
    <div>
      {/* Render notebook cells */}
      {notebook.cells.map((cell, index) => {
        const cellDrift = driftMetadata.cell_drifts.find(
          cd => cd.cell_index === index
        );
        
        return (
          <NotebookCell 
            key={index}
            cell={cell}
            drifts={cellDrift?.drifts}
          />
        );
      })}
      
      {/* Summary panel */}
      <DriftSummary metadata={driftMetadata} />
    </div>
  );
}
```

### Notebook Cell Component

```typescript
function NotebookCell({ cell, drifts }) {
  const maxTier = drifts ? getHighestTier(drifts) : null;
  
  return (
    <div className={`cell ${maxTier ? `drift-${maxTier}` : ''}`}>
      {drifts && (
        <div className="drift-badges">
          {drifts.map(drift => (
            <DriftBadge 
              key={drift.id}
              drift={drift}
              onClick={() => showDriftDetails(drift)}
            />
          ))}
        </div>
      )}
      
      <CellContent cell={cell} />
    </div>
  );
}
```

## Benefits of This Approach

### 1. **Separation of Concerns**
- Notebooks remain clean and runnable
- Drift metadata can be updated independently
- Multiple analyses can coexist (different baselines, dates)

### 2. **Version Control Friendly**
- Notebooks don't get polluted with annotations
- Drift metadata files are small, readable JSON
- Easy to diff and track changes over time

### 3. **Flexible Display**
- Dashboard can show/hide drifts dynamically
- Filter by materiality tier
- Export clean notebooks without annotations

### 4. **Reusability**
- Same notebook can be compared against multiple baselines
- Historical drift tracking over time
- Generate reports from metadata

### 5. **Performance**
- Lazy loading of drift overlays
- Notebook parsing happens once
- Metadata is lightweight JSON

## Workflow

### Step 1: Analyze Notebook

```bash
# Upload modified notebook to Delta View
# System compares against baseline
# Generates drift metadata JSON
```

### Step 2: Save Metadata

```typescript
// Save to filesystem
await saveFile(
  `drift_metadata_${timestamp}.json`,
  JSON.stringify(driftMetadata, null, 2)
);

// Or save to database
await db.driftAnalyses.create({
  notebookPath: notebook.path,
  baselinePath: baseline.path,
  metadata: driftMetadata,
  analyzedAt: new Date()
});
```

### Step 3: Display with Annotations

```typescript
// Load notebook + metadata
const notebook = await loadNotebook(notebookPath);
const metadata = await loadDriftMetadata(metadataPath);

// Render with overlays
renderNotebookWithDrifts(notebook, metadata);
```

### Step 4: Export Report

```typescript
// Generate summary report
const report = generateDriftReport(metadata);

// Export as PDF, HTML, or MD
exportReport(report, 'drift_analysis_report.pdf');
```

## Example Use Cases

### 1. **Code Review**

```typescript
// During PR review
const prNotebook = await fetchFromGit('feature-branch/notebook.ipynb');
const mainNotebook = await fetchFromGit('main/notebook.ipynb');

const driftMetadata = await analyzeDrift(prNotebook, mainNotebook);

if (driftMetadata.summary.t1_count > 0) {
  postPRComment('⚠️ Critical drifts detected! Review required.');
}
```

### 2. **Compliance Audit**

```typescript
// Compare Q2 vs Q1 models
const q2Metadata = await loadDriftMetadata('q2_2024_drift.json');

const auditReport = {
  period: 'Q2 2024',
  criticalChanges: q2Metadata.cell_drifts.filter(
    cd => cd.drifts.some(d => d.materialityTier === 'T1')
  ),
  recommendations: q2Metadata.recommendations
};

sendToCompliance(auditReport);
```

### 3. **Model Card Update**

```typescript
// Sync model card with detected drifts
const drifts = driftMetadata.cell_drifts.flatMap(cd => cd.drifts);

for (const drift of drifts.filter(d => d.materialityTier === 'T1')) {
  updateModelCardSection(drift.name, {
    current: drift.repo_code,
    rationale: drift.rationale,
    evidence: drift.evidence
  });
}
```

## File Locations

```
project/
├── example_modified_pd_modeling.ipynb        ← Sample notebook
├── example_drift_metadata.json               ← Drift annotations
├── DRIFT_METADATA_GUIDE.md                   ← This guide
└── apps/api/
    └── components/workspace/
        ├── notebook-viewer-with-drifts.tsx   ← New component
        └── drift-badge.tsx                   ← Drift indicator
```

## Next Steps

1. ✅ Review `example_modified_pd_modeling.ipynb` to see drift examples
2. ✅ Examine `example_drift_metadata.json` structure
3. ✅ Implement notebook viewer with drift overlays
4. ✅ Add drift badge components
5. ✅ Integrate with Delta View dashboard
6. ✅ Test with real notebooks from repo

---

## Summary

**Drift metadata files** provide a clean, maintainable way to annotate notebooks with drift detection results:

✅ **Notebooks stay clean** - No embedded annotations  
✅ **Metadata is portable** - JSON format, easy to process  
✅ **Dashboard friendly** - Easy to render overlays  
✅ **Version control** - Small, diffable files  
✅ **Flexible** - Multiple analyses, historical tracking  

**Files Created:**
- `example_modified_pd_modeling.ipynb` - Sample notebook with 10 drifts
- `example_drift_metadata.json` - Complete drift annotations
- `DRIFT_METADATA_GUIDE.md` - This comprehensive guide

🎯 **Ready to integrate into Delta View dashboard!**

