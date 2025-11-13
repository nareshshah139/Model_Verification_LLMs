# Quick Start Guide - Model Card Workspace

## 🚀 Getting Started (5 Minutes)

### 1. Start the Server

```bash
cd apps/api
npm run dev
```

Server will start at: **http://localhost:3001**

### 2. Open the Workspace

Navigate to: **http://localhost:3001/workspace**

### 3. Explore Model Cards

#### Option A: File Explorer (Left Panel)
1. Look for the `📁 model-cards` folder
2. Click on any file:
   - `📄 example_model_card.md` - Lending Club credit model
   - `📄 bert_model.md` - BERT language model
   - `📄 llm_card.md` - GPT-4 Vision (placeholder)

#### Option B: Model Sidebar (Right Panel)
1. Scroll through the list of model cards
2. Click any "Open Card" button
3. Card opens in the center panel

### 4. Work with Multiple Cards
- Open several cards
- Switch between tabs by clicking headers
- Close tabs with the **×** button
- Each tab shows a **CARD** badge

### 5. Try the Dashboard

Click **Dashboard** button in the header to see the metrics view.

## 📱 UI Overview

```
┌──────────────────────────────────────────────────┐
│ 🧭 Workspace                      [Dashboard]   │ ← Header
├──────────────────────────────────────────────────┤
│ LEFT        │    CENTER           │    RIGHT     │
│             │                     │              │
│ File        │  ┌─Notebook─┬─────┐│  Model       │
│ Explorer    │  │  Cards   │ Tabs││  Cards       │
│             │  └──────────┴─────┘│              │
│ 📁 model    │                     │  Quick       │
│   cards     │  [Content Area]     │  Open        │
│ 📁 notebooks│                     │  Buttons     │
│ 📁 src      │  Rendered           │              │
│             │  Markdown           │              │
└─────────────┴─────────────────────┴──────────────┘
```

## 📝 What You Can Do

### View Model Cards
✅ Markdown files (.md) with full formatting  
✅ Word documents (.docx) converted to HTML  
✅ Tables, code blocks, lists, headers  
✅ Dark mode styling  

### Navigate Efficiently
✅ Multiple tabs open simultaneously  
✅ Quick switching between cards  
✅ File explorer for browsing  
✅ Sidebar for quick access  

### Work Alongside Code
✅ Open Python files (.py)  
✅ View Jupyter notebooks (.ipynb)  
✅ Mix model cards with code  
✅ All in one workspace  

## 🎯 Common Tasks

### Task 1: Compare Two Model Cards
```
1. Click "example_model_card.md" in file explorer
2. Click "bert_model.md" in file explorer
3. Switch tabs to compare
```

### Task 2: Review Model Documentation
```
1. Open model card from sidebar
2. Scroll through sections
3. Check metrics, limitations, etc.
```

### Task 3: Work with Code and Docs Together
```
1. Open model card
2. Open related Python file
3. Open training notebook
4. Switch tabs as needed
```

## 📦 Sample Model Cards

### 1. **Lending Club Model** (`example_model_card.md`)
Credit scoring model with:
- PD, LGD, EAD components
- Performance metrics
- Governance compliance

### 2. **BERT Model** (`bert_model.md`)
NLP model documentation:
- Architecture details
- GLUE benchmarks
- Bias analysis
- Environmental impact

### 3. **GPT-4 Vision** (`llm_card.md`)
Multimodal model card:
- Text & vision capabilities
- Safety considerations
- Usage guidelines

## 🔧 Adding Your Own Model Cards

### Simple Method
```bash
# 1. Copy your markdown file
cp your_model.md apps/api/public/model-cards/

# 2. It will automatically be served at:
# http://localhost:3001/model-cards/your_model.md
```

### Display in UI
Edit `components/workspace/file-explorer.tsx`:
```typescript
<FileRow
  icon="md"
  label="your_model.md"
  onOpen={() => openItem({ 
    kind: "modelcard", 
    payload: { 
      path: "/model-cards/your_model.md", 
      type: "markdown" 
    } 
  })}
/>
```

## 💡 Tips & Tricks

### Tip 1: Keyboard Navigation
- `Ctrl/Cmd + Click` tabs for quick switching
- Scroll with trackpad/mouse wheel
- Close tabs with click on **×**

### Tip 2: Dark Mode
Everything is optimized for dark mode by default.

### Tip 3: Markdown Best Practices
- Use headers for structure
- Add tables for metrics
- Include code examples
- Use blockquotes for important notes

### Tip 4: File Organization
Organize your model cards by:
- Model type (classification, regression, etc.)
- Project
- Team
- Date

### Tip 5: Multiple Windows
Open multiple browser windows for side-by-side comparison.

## 🆘 Troubleshooting

### Issue: Card doesn't load
**Solution:** Check file exists in `apps/api/public/model-cards/`

### Issue: Formatting looks wrong
**Solution:** Verify markdown syntax or convert Word doc to markdown

### Issue: Server not responding
**Solution:** 
```bash
# Restart the server
pkill -f "next dev"
cd apps/api && npm run dev
```

### Issue: Changes not showing
**Solution:** Hard refresh browser (`Cmd+Shift+R` or `Ctrl+F5`)

## 📚 Learn More

- **MODEL_CARD_FEATURE.md** - Complete feature docs
- **MODEL_CARD_SUMMARY.md** - Implementation summary
- **WORKSPACE_UI_README.md** - Overall workspace guide

## ✅ Checklist for Success

- [ ] Server running on port 3001
- [ ] Workspace loads at /workspace
- [ ] Can see model-cards folder
- [ ] Can open example_model_card.md
- [ ] Content renders with formatting
- [ ] Can open multiple tabs
- [ ] Sidebar shows model cards
- [ ] Can navigate to dashboard

## 🎉 You're Ready!

Everything is set up and working. Start exploring model cards, opening notebooks, and working with your ML documentation in a professional, Cursor-style workspace!

---

**Need Help?** Check the detailed documentation or open an issue.

**Server:** http://localhost:3001/workspace  
**Status:** ✅ All systems operational

