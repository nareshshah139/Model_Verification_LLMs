# Quick Start: Model Card and Notebook Verification

## 🚀 What's New

Two powerful verification buttons have been added to help you:
1. **Verify Model Card** - Check if model card claims match the actual code
2. **Verify Notebooks** - Find notebook changes not reflected in the model card

Both features use AI-powered CodeAct Agent with AST-grep to analyze your code!

## 📋 Prerequisites

The following services are already running:
- ✅ Next.js UI: http://localhost:3001
- ✅ CodeAct API: http://localhost:8001

## 🎯 How to Use

### Step 1: Open the Workspace
Navigate to: http://localhost:3001/workspace

### Step 2: View a Model Card
- The model card is already loaded in the right sidebar
- Default: `/model-cards/example_model_card.md`

### Step 3: Run Verification

#### Option A: Verify Model Card
1. Click the **"Verify Model Card"** button in the model card viewer
2. Wait for the analysis to complete (~10-30 seconds)
3. View results in the **"Verification"** tab
4. Check the consistency score (aim for >80%)
5. Review findings by category:
   - 🔴 **Leakage** (Critical - data leakage detected)
   - ⚠️ **Algorithms** (Model type mismatches)
   - ℹ️ **Metrics** (Metric calculation issues)
   - And more...

#### Option B: Verify Notebooks
1. Click the **"Verify Notebooks"** button
2. Wait for the analysis
3. View the verification report
4. Switch back to **"Content"** tab to see highlighted sections
5. Open notebooks from the center pane to see inline issues

### Step 4: Interpret Results

#### Consistency Score
- **90-100%**: Excellent! Model card matches code
- **80-89%**: Good, minor discrepancies
- **70-79%**: Fair, some issues to address
- **<70%**: Poor, significant mismatches

#### Issue Severity
- **❌ Error (Red)**: Critical issues like data leakage
- **⚠️ Warning (Yellow)**: Non-critical mismatches

## 🎨 Visual Indicators

### In Model Card
When verification is active:
- 💡 Blue info banner at top
- 🟡 Yellow highlighted paragraphs (potential issues)
- 🔴 Red code snippets (verified issues)

### In Notebooks
When issues are found:
- 🔴 Red border around error cells
- 🟡 Yellow border around warning cells
- Issue details shown below affected cells
- Badge in header showing total issue count

## 📊 Example Verification Report

```
Consistency Score: 75%

Findings by Category:
├─ Leakage (2 critical issues)
│  └─ loan_status used before train/test split
├─ Algorithms (3 warnings)
│  └─ LogisticRegression used instead of claimed scorecard
├─ Metrics (1 warning)
│  └─ ROC-AUC calculation missing
└─ Splits (0 issues)
   └─ Train/test split verified ✓
```

## 🔧 Troubleshooting

### Verification Button Does Nothing
Check browser console for errors:
- Press F12 → Console tab
- Look for network errors

### "CodeAct API not responding"
Restart the CodeAct API:
```bash
cd services/codeact_cardcheck
source venv/bin/activate
python api_server.py
```

### Wrong Repository Path
Edit `apps/api/components/workspace/model-card-viewer.tsx`:
- Line 87: Update `repoPath` variable
- Line 122: Update `repoPath` variable
- Line 123-129: Update `notebookPaths` array

### Highlighting Not Showing
- Make sure you clicked a verification button first
- Check that verification report is not empty
- Try refreshing the page

## 🎓 Tips

1. **Run verification after code changes** to keep model card in sync
2. **Fix critical (red) issues first** - they often indicate serious problems
3. **Use the verification report** to understand which files have issues
4. **Compare "Content" and "Verification" tabs** to see detailed vs. summary views
5. **Open notebooks** to see exactly which code cells have problems

## 📖 More Information

For detailed technical documentation, see:
- `VERIFICATION_FEATURES_IMPLEMENTATION.md` - Full implementation details
- `services/codeact_cardcheck/README.md` - CodeAct Agent documentation

## ✨ What's Highlighted

### Model Card Highlighting
- Paragraphs about algorithms, metrics, models, data
- Code snippets matching found issues
- Only active when consistency score < 80%

### Notebook Highlighting  
- Code cells with matching issues
- Inline issue descriptions
- Severity-based color coding

## 🎉 Ready to Go!

Your verification system is fully set up and ready to use. Just click those buttons and watch the magic happen! 🪄

---

**Need Help?** Check the browser console (F12) or the terminal where services are running for detailed logs.

