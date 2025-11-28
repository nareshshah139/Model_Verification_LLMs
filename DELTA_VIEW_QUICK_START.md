# Delta View - Quick Start Guide

## What is Delta View?

Delta View is a drift detection dashboard that helps you identify changes between baseline and modified notebooks, categorized by their impact on model behavior.

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Navigation: Notebook | Dashboard | Delta View ← NEW TAB    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  DELTA VIEW DASHBOARD                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 1: Select Baseline Notebook                     │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │ [Dropdown: Choose baseline...]        │            │  │
│  │  │  • Data Cleaning & Understanding      │            │  │
│  │  │  • EDA                                │            │  │
│  │  │  • PD Modeling                        │            │  │
│  │  │  • LGD/EAD Modeling                   │            │  │
│  │  │  • PD Model Monitoring                │            │  │
│  │  └──────────────────────────────────────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 2: Upload Modified Notebook                     │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │ [Upload Button: Choose File...]       │            │  │
│  │  │  📁 my_modified_notebook.ipynb        │            │  │
│  │  │  ✓ File loaded: 156.3 KB             │            │  │
│  │  └──────────────────────────────────────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Analyze Drift & Changes] 🔍                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  RESULTS DASHBOARD                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tabs: [Overview] [Detected Drifts] [Code Changes]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ T1 CRITICAL  │  │ T2 SIGNIFICANT│ │ T3 MINOR     │     │
│  │    🔴 2      │  │    🟠 3       │  │    🔵 1      │     │
│  │ Material     │  │ Performance   │  │ Cosmetic     │     │
│  │ Impact       │  │ Metrics       │  │ Changes      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Detected Drift: Label Coding (T1 - Critical)         │  │
│  │  ───────────────────────────────────────────────────  │  │
│  │  Model Card: default = 1, non-default = 0            │  │
│  │  Repo Code:  default = 0, non-default = 1            │  │
│  │                                                        │  │
│  │  Rationale: Inverts target semantics; changes PD      │  │
│  │                                                        │  │
│  │  Evidence:                                             │  │
│  │  • target = df['default'].map({0: 1, 1: 0})          │  │
│  │  • # Flip default encoding                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Materiality Tiers Explained

### 🔴 Tier 1 - CRITICAL
**Impact**: Material changes to model behavior and predictions  
**Examples**: 
- Label coding inversions
- LGD/EAD algorithm changes
- Score scale modifications
- PD horizon differences

**Action Required**: ⚠️ IMMEDIATE - Update model card, re-validate model

### 🟠 Tier 2 - SIGNIFICANT
**Impact**: Affects performance metrics and explainability  
**Examples**:
- Preprocessing changes (WOE → one-hot)
- Validation split logic
- Regularization parameters
- Imputation strategies

**Action Required**: ⚠️ REVIEW - Document changes, assess impact

### 🔵 Tier 3 - MINOR
**Impact**: Cosmetic or operational, negligible model impact  
**Examples**:
- Variable naming
- Plot rounding
- Comment phrasing
- Python version

**Action Required**: ✓ OPTIONAL - Update documentation if needed

## 5-Minute Tutorial

### 1. Navigate to Delta View
- Click the **"Delta View"** tab at the top of the workspace
- Or click **"Delta View"** button from the Claims Dashboard

### 2. Choose Your Baseline
```
Baseline Dropdown → "PD Modeling"
```
This selects `notebooks/3_pd_modeling.ipynb` as your reference.

### 3. Upload Modified Version
```
Click "Choose File" → Select your .ipynb file
```
System validates it's a valid notebook format.

### 4. Run Analysis
```
Click "Analyze Drift & Changes"
```
Wait 5-10 seconds for analysis to complete.

### 5. Interpret Results

#### Overview Tab
- See total drifts by tier
- Quick summary of affected categories

#### Detected Drifts Tab
- Filter by tier: All | T1 | T2 | T3
- Click each drift to see:
  - Model Card description
  - Actual code found
  - Rationale for why it matters
  - Evidence snippets

#### Code Changes Tab
- See line additions/removals
- Modified cells count

## Real-World Example

### Scenario: PD Model Update

**Before**: Original PD modeling notebook uses WOE encoding  
**After**: Modified notebook switches to one-hot encoding

```python
# BASELINE CODE
from category_encoders import WOEEncoder
woe_encoder = WOEEncoder()
X_encoded = woe_encoder.fit_transform(X_train, y_train)

# MODIFIED CODE
X_encoded = pd.get_dummies(X_train, drop_first=True)
```

**Delta View Detects**:
- ✅ T2 Drift: "PD preprocessing"
- Evidence: Shows both code snippets
- Rationale: "Same objective; moves metrics and explainability"
- Action: Update model card preprocessing section

## Common Use Cases

### 1. Model Card Compliance Check
**Goal**: Ensure model card accurately reflects code  
**Process**: Upload production notebook → Review T1 drifts → Update docs

### 2. Code Review Assistant
**Goal**: Understand impact of changes before merging  
**Process**: Upload feature branch notebook → Assess drift severity → Approve/reject

### 3. Audit Trail
**Goal**: Document why model behavior changed  
**Process**: Compare versions → Generate evidence → Include in change log

### 4. Risk Assessment
**Goal**: Prioritize model updates by risk level  
**Process**: Detect all drifts → Focus on T1 first → Schedule T2 reviews

## Tips for Best Results

### ✅ DO
- Use descriptive file names for uploaded notebooks
- Review T1 drifts immediately
- Document rationale for accepting drifts
- Run analysis before production deployments

### ❌ DON'T
- Ignore T1 drifts (they affect predictions!)
- Upload non-notebook files
- Assume T3 drifts are always safe (verify context)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between tabs |
| `Esc` | Close modals |
| `Ctrl/Cmd + Click` | Open evidence in new context |

## Troubleshooting

### "Please upload a valid .ipynb file"
**Solution**: Ensure file has `.ipynb` extension and is valid JSON

### "Failed to analyze drift"
**Solution**: Check that baseline path is correct and file exists in repo

### No drifts detected but I know there are changes
**Solution**: Current detection is keyword-based. Consider:
- Checking if keywords are in the drift seed definitions
- Code changes may be semantically different but not keyword-matched
- Future enhancement: LLM-based semantic diff

### Analysis is slow
**Solution**: Large notebooks take time. Code extraction and comparison is CPU-intensive.

## Next Steps

1. **Try it now**: Upload a notebook and run your first analysis
2. **Review results**: Focus on T1 drifts first
3. **Update documentation**: Sync model card with detected changes
4. **Share feedback**: Help improve drift seed definitions

## Integration with Existing Workflows

### Claims Dashboard
Delta View complements the Claims Dashboard:
- **Claims Dashboard**: Verifies model card claims against code
- **Delta View**: Detects what changed between notebook versions

Use both together for comprehensive model governance!

### Verification Workflow
```
1. Model Card Verification → Check claims accuracy
2. Notebook Verification → Check code-card consistency  
3. Delta View → Check version-to-version changes ← NEW!
```

## Advanced Features (Coming Soon)

- 🎯 LLM-based semantic drift detection
- 📊 Historical drift tracking over time
- 📄 Export PDF reports
- 🔄 Git integration for automatic comparison
- ✏️ Custom drift seed definitions
- 🔍 Multi-notebook comparison

---

## Quick Reference Card

```
┌────────────────────────────────────────────────┐
│  DELTA VIEW QUICK REFERENCE                    │
├────────────────────────────────────────────────┤
│  Access:     /dashboard/delta                  │
│  Input:      Baseline + Modified .ipynb        │
│  Output:     Drift analysis by tier            │
│                                                 │
│  🔴 T1 = CRITICAL    → Fix immediately         │
│  🟠 T2 = SIGNIFICANT → Review & document       │
│  🔵 T3 = MINOR       → Optional update         │
│                                                 │
│  14 Drift Categories Monitored                 │
│  3 Materiality Tiers                           │
│  Automated Evidence Collection                 │
└────────────────────────────────────────────────┘
```

**Status**: ✅ Ready to Use  
**Documentation**: Complete  
**Support**: See full guide in `DELTA_VIEW_IMPLEMENTATION.md`

