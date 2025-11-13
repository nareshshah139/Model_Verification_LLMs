# Quick Start: Notebook Viewer

## 🚀 Your Notebook Viewer is Ready!

The Jupyter notebook rendering issue has been fixed. Here's how to use it:

## Access the Viewer

1. **Start your development server** (if not already running):
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Open in browser**:
   ```
   http://localhost:3001/workspace
   ```

## What You'll See

### Default View
- A **Welcome.ipynb** notebook opens by default
- Shows markdown, code cells, and outputs
- Fully styled with syntax highlighting

### Features
- 📝 **Rich Markdown** - Tables, lists, links, math equations
- 💻 **Syntax Highlighting** - Python code with proper formatting
- 📊 **Output Rendering** - Images, HTML tables, text, errors
- 🚀 **Executable Mode** - Click "🚀 Open Executable" for JupyterLite

## Opening Your Project Notebooks

Your Lending Club notebooks are available! To open them:

### Option 1: Update Default Notebook

Edit `apps/api/components/workspace/workspace-context.tsx`:

```typescript
const [tabs, setTabs] = useState<CenterTab[]>([
  {
    id: nanoid(),
    title: "1_data_cleaning_understanding.ipynb",  // Your notebook
    kind: "notebook",
    payload: { 
      path: "Lending-Club-Credit-Scoring/notebooks/1_data_cleaning_understanding.ipynb"
    },
  },
]);
```

### Option 2: Use File Explorer

1. Click on file explorer (left sidebar)
2. Navigate to `Lending-Club-Credit-Scoring/notebooks/`
3. Click on any `.ipynb` file to open

### Your Available Notebooks

- ✅ `1_data_cleaning_understanding.ipynb`
- ✅ `2_eda.ipynb`
- ✅ `3_pd_modeling.ipynb`
- ✅ `4_lgd_ead_modeling.ipynb`
- ✅ `5_pd_model_monitoring.ipynb`

## Executable Notebooks with Kernel

### Using JupyterLite (In-Browser Python)

1. Click **"🚀 Open Executable"** button (top of notebook)
2. Wait for JupyterLite to load (5-10 seconds)
3. Python kernel runs in your browser via WebAssembly!

**What you can do:**
- ✅ Run code cells
- ✅ Modify existing code
- ✅ Create new cells
- ✅ Install packages with `micropip`
- ✅ Full Python environment (no server needed!)

**Current note:**
- The full auto-load integration is coming soon
- For now, you can copy/paste cells or upload the notebook
- Use static view for reading, executable for experimenting

### Alternative: Connect to Local Jupyter Server

If you prefer a traditional Jupyter server:

```bash
# In your project root
cd Lending-Club-Credit-Scoring
jupyter notebook

# Then access at http://localhost:8888
```

## What Was Fixed

| Before | After |
|--------|-------|
| ❌ Placeholder text | ✅ Real notebook rendering |
| ❌ Mock cells | ✅ Actual Jupyter cells |
| ❌ No syntax highlighting | ✅ Full Python highlighting |
| ❌ No outputs | ✅ Images, tables, text, errors |
| ❌ No executable mode | ✅ JupyterLite integration |

## Technical Details

### What's Running

```
Next.js App (localhost:3001)
├── Static Notebook Viewer
│   ├── Markdown rendering (react-markdown)
│   ├── Code highlighting (highlight.js)
│   ├── Math equations (KaTeX)
│   └── Output rendering (multiple types)
└── Executable Mode
    └── JupyterLite (WebAssembly Python)
```

### Dependencies Added
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `remark-math` - Math equation support
- `rehype-katex` - LaTeX rendering
- `rehype-raw` - HTML in markdown
- `highlight.js` - Syntax highlighting
- `katex` - Math typesetting
- `@tailwindcss/typography` - Prose styles

## Need Help?

### Notebook Not Showing?

1. Check file path in console (F12)
2. Verify notebook exists: `ls Lending-Club-Credit-Scoring/notebooks/`
3. Check API response: `http://localhost:3001/api/notebooks/content?path=...`

### Rendering Issues?

1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
2. Check browser console for errors
3. Verify CSS imports in `apps/api/app/layout.tsx`

### JupyterLite Not Loading?

1. Check internet connection (loads from CDN)
2. Try Chrome or Firefox
3. Wait 10-15 seconds for initial load
4. Check browser supports WebAssembly

## Examples

### Math Equations
Inline: `$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$`

Block:
```
$$
\sum_{i=1}^{n} x_i = \frac{n(n+1)}{2}
$$
```

### Code with Output
```python
import numpy as np
arr = np.arange(10)
print(arr.mean())
```

Output: `4.5`

## What's Next?

See `NOTEBOOK_VIEWER_IMPLEMENTATION.md` for:
- Complete technical documentation
- Advanced features
- Customization options
- Future enhancements

---

**🎉 You're all set!** Your notebooks are now fully viewable with syntax highlighting, outputs, and executable support.

**Try it now**: [http://localhost:3001/workspace](http://localhost:3001/workspace)
