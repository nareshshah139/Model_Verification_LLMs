# Testing the Enhanced Notebook Viewer

> **⚠️ HISTORICAL DOCUMENT**: This document references `apps/web/` which has been removed. The notebook viewer functionality is now in `apps/api/components/notebook/`.

## Quick Start

The notebook viewer has been completely upgraded with professional rendering and executable capabilities!

### 1. Start the Development Server

```bash
cd apps/web
npm run dev
```

The server will start at `http://localhost:5174` (or next available port).

### 2. Test with Example Notebooks

The repository includes several Jupyter notebooks you can test with:

```
Lending-Club-Credit-Scoring/notebooks/
├── 1_data_cleaning_understanding.ipynb
├── 2_eda.ipynb
├── 3_pd_modeling.ipynb
├── 4_lgd_ead_modeling.ipynb
└── 5_pd_model_monitoring.ipynb
```

### 3. Upload and View

1. Navigate to the workspace view in the web app
2. Upload a notebook (or select from the file tree if already loaded)
3. Observe the enhanced rendering!

## What to Test

### ✅ Markdown Rendering

**Look for:**
- Formatted headings (H1, H2, H3, etc.)
- Bold and italic text
- Lists (ordered and unordered)
- Links
- Images
- Tables
- Code blocks in markdown (with backticks)

**Example in notebook:**
```markdown
# This is a heading
## Subheading

- Bullet point 1
- Bullet point 2

**Bold text** and *italic text*

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

### ✅ Code Syntax Highlighting

**Look for:**
- Python keywords highlighted (def, class, import, etc.)
- Strings in different color
- Comments grayed out
- Numbers highlighted
- Function/variable names distinct

**In the notebooks:**
- Open any code cell
- Check that `import`, `def`, `class` are highlighted
- Check strings are colored
- Check numbers are highlighted

### ✅ Execution Count Display

**Look for:**
- `In [1]:` labels on code cells
- `Out[1]:` labels on output cells
- Numbers matching the notebook's execution order
- Empty `In [ ]:` for unexecuted cells

### ✅ Output Rendering

#### Text Outputs
**Test:** Look for print statements or simple calculations
```python
print("Hello, World!")
x = 5 + 3
x  # Should show 8
```

#### Images/Plots
**Test:** Look for matplotlib/seaborn plots in the EDA notebook
- Should display as actual images, not JSON
- Should be properly sized
- PNG/JPEG/SVG all supported

#### DataFrames
**Test:** Look for pandas DataFrames
- Should render as HTML tables
- Formatting preserved
- Scrollable if large

#### Errors
**Test:** If any cells have errors
- Should show formatted traceback
- Red background for visibility
- Readable error messages

### ✅ Math Equations

**Look for:** LaTeX math in markdown cells
- Inline math: `$E = mc^2$` → E = mc²
- Block math: `$$\sum_{i=1}^{n} x_i$$`
- Properly rendered with KaTeX

### ✅ Professional Styling

**Check:**
- Clean, modern appearance
- Proper spacing between cells
- Clear visual distinction between:
  - Markdown cells (prose styling)
  - Code cells (bordered, with In/Out labels)
  - Output cells (distinct background)
- Dark mode support (if enabled)

### 🚀 Executable Notebook Mode (Beta)

**Test:**
1. Click the **"🚀 Open Executable"** button in the header
2. JupyterLite should load in an iframe
3. Note appears explaining current beta status
4. Can run Python code in the JupyterLite environment
5. Click **"← Back to Static View"** to return

**Current Limitations:**
- Your notebook doesn't auto-load yet
- Need to manually copy/paste cells or upload
- Full integration coming in future update

## Detailed Test Cases

### Test Case 1: Data Cleaning Notebook
File: `1_data_cleaning_understanding.ipynb`

**Check:**
- [ ] Markdown titles and descriptions render properly
- [ ] Import statements are syntax highlighted
- [ ] DataFrame outputs show as formatted tables
- [ ] Any plots/visualizations display correctly
- [ ] Statistics outputs are readable

### Test Case 2: EDA Notebook
File: `2_eda.ipynb`

**Check:**
- [ ] Multiple plots render (matplotlib/seaborn)
- [ ] Color schemes preserved in plots
- [ ] Correlation matrices display properly
- [ ] Markdown explanations are well-formatted
- [ ] Statistical summaries readable

### Test Case 3: Modeling Notebooks
Files: `3_pd_modeling.ipynb`, `4_lgd_ead_modeling.ipynb`

**Check:**
- [ ] Complex code cells are highlighted correctly
- [ ] Model outputs (scores, metrics) display well
- [ ] Any confusion matrices or plots render
- [ ] Mathematical formulas in markdown render (if any)
- [ ] Long outputs are scrollable

### Test Case 4: Monitoring Notebook
File: `5_pd_model_monitoring.ipynb`

**Check:**
- [ ] Time series plots render correctly
- [ ] Dashboard-style outputs display well
- [ ] Any interactive elements show properly
- [ ] Performance metrics are clear

## Common Issues & Solutions

### Issue: Code not highlighted
**Solution:** Check browser console for errors. Verify highlight.js loaded.

### Issue: Math not rendering
**Solution:** 
- Check that equations use proper LaTeX syntax
- Verify KaTeX CSS is loaded
- Look for any `$...$` or `$$...$$` delimiters

### Issue: Images not showing
**Solution:**
- Verify images are base64 encoded in notebook
- Check browser console for errors
- Try re-running the notebook to regenerate outputs

### Issue: Markdown looks plain
**Solution:**
- Verify Tailwind typography plugin loaded
- Check that `prose` classes are applied
- Look for console errors

### Issue: Executable mode not loading
**Solution:**
- Check internet connection (loads from CDN)
- Verify iframe isn't blocked
- Check browser console for errors
- Try different browser

## Performance Notes

### First Load
- May be slower due to KaTeX fonts loading
- Subsequent loads will be cached

### Large Notebooks
- Notebooks with 50+ cells should still render smoothly
- Very large outputs (>1MB) may lag slightly
- Consider clearing outputs before saving if too slow

### Browser Compatibility
- ✅ Chrome/Edge: Fully supported
- ✅ Firefox: Fully supported
- ✅ Safari: Fully supported
- ⚠️  IE11: Not supported (modern browsers only)

## Regression Tests

Before considering complete, verify:

1. **Old functionality still works:**
   - [ ] Can still upload notebooks
   - [ ] File tree navigation works
   - [ ] Model card viewer still functions
   - [ ] Analysis tools still work

2. **New features work:**
   - [ ] Markdown renders properly
   - [ ] Code is syntax highlighted
   - [ ] Outputs display correctly
   - [ ] Executable button shows
   - [ ] Can switch between views

3. **No breaking changes:**
   - [ ] Build succeeds
   - [ ] No console errors
   - [ ] No TypeScript errors
   - [ ] Existing tests pass (if any)

## Success Criteria

The notebook viewer is working correctly if:

✅ Markdown cells look professional and well-formatted  
✅ Code cells have syntax highlighting  
✅ `In [n]:` / `Out[n]:` labels display correctly  
✅ Images/plots render as actual images  
✅ DataFrames show as formatted HTML tables  
✅ Math equations render beautifully  
✅ Overall appearance is clean and modern  
✅ Executable mode launches (even if manual upload needed)  
✅ Can switch between static and executable views  
✅ No errors in browser console  

## Next Steps After Testing

1. **If issues found:**
   - Document the issue
   - Check browser console
   - Verify dependencies installed
   - See troubleshooting guide

2. **If working well:**
   - Consider enabling by default
   - Share with team for feedback
   - Plan full JupyterLite integration

3. **Future enhancements:**
   - Auto-load notebooks in executable mode
   - Support for more kernels
   - Interactive widgets
   - Collaboration features

## Feedback

After testing, note:
- What works well?
- What could be improved?
- Any missing features?
- Performance issues?
- UI/UX suggestions?

## Resources

- Full documentation: `apps/web/NOTEBOOK_VIEWER_GUIDE.md`
- Summary: `NOTEBOOK_IMPROVEMENTS_SUMMARY.md`
- Code: `apps/web/src/components/NotebookViewer.tsx`

