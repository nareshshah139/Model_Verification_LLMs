# Dynamic File Browser Feature

## ✅ Implementation Complete

The file explorer now dynamically browses the actual filesystem and shows files from the cloned Lending Club repository!

## 🎯 What Was Built

### 1. **Files API Endpoint** (`app/api/files/route.ts`)
A secure server-side API that:
- ✅ Reads directory contents from the filesystem
- ✅ Returns file metadata (name, path, size, modified date, extension)
- ✅ Filters out hidden files and sensitive directories (node_modules, .git, etc.)
- ✅ Sorts directories first, then files alphabetically
- ✅ Includes security checks to prevent directory traversal attacks
- ✅ Supports navigation up to parent directories

### 2. **Dynamic File Explorer** (`components/workspace/file-explorer.tsx`)
An interactive file browser that:
- ✅ **Quick Access** section with preset folders
- ✅ **Browse** capability - click folders to navigate into them
- ✅ **Up button** to navigate to parent directory
- ✅ **File type detection** with appropriate icons
- ✅ **Loading and error states**
- ✅ **Automatic file handling**:
  - `.ipynb` files → Open in center panel as notebooks
  - `.py` files → Open in center panel as Python files
  - `.md` files → Display in right panel as model cards
  - `.docx` files → Display in right panel as model cards

## 📁 Quick Access Folders

The file explorer includes these preset locations:

1. **Lending Club** - The cloned credit scoring repository
   - `/Lending-Club-Credit-Scoring/`
   - Contains 5 notebooks, Python source files, and artifacts

2. **Model Cards** - Your model card documentation
   - `/apps/api/public/model-cards/`
   - Pre-made markdown model cards

3. **Services** - CodeAct card check service
   - `/services/codeact_cardcheck/`
   - Rules, schemas, and tools

## 🔍 How It Works

### Browsing Files

1. **Quick Access**: Click any preset folder to jump directly there
2. **Navigate Down**: Click any folder to open it
3. **Navigate Up**: Click the "↑ Up" button to go to parent directory
4. **Open Files**: Click any file to open it:
   - Notebooks open in center panel
   - Python files open in center panel
   - Markdown/Word files display in right panel

### File Structure Example

```
📁 Lending-Club-Credit-Scoring/
  📁 artifacts/
    📁 pd_model/
      📄 scorecard.csv
  📁 notebooks/
    📓 1_data_cleaning_understanding.ipynb
    📓 2_eda.ipynb
    📓 3_pd_modeling.ipynb
    📓 4_lgd_ead_modeling.ipynb
    📓 5_pd_model_monitoring.ipynb
  📁 src/
    🐍 eda_utils.py
    🐍 modelling_utils.py
    🐍 exception.py
  📄 README.md
```

## 🚀 Usage

### Basic Navigation

1. **Start**: File explorer loads Lending Club repo by default
2. **Click "notebooks"** folder to see all 5 notebooks
3. **Click any notebook** to open it in the center panel
4. **Click "src"** folder to see Python files
5. **Click any .py file** to open it in center
6. **Click "README.md"** to view it as a model card in the right panel

### Switching Folders

1. Click **Quick Access > Model Cards** to see the example model cards
2. Click **Quick Access > Services** to browse the services directory
3. Click **Quick Access > Lending Club** to return to the repository

### Going Up

When inside a subfolder (e.g., `notebooks/`):
- Click the **"↑ Up"** button to return to the parent directory

## 🔒 Security Features

The API includes several security measures:

1. **Path Validation**: Only allows access to files within the project directory
2. **Hidden File Filter**: Excludes `.git`, `.env`, and other hidden files
3. **Sensitive Directory Filter**: Excludes `node_modules`, `__pycache__`, etc.
4. **Directory Traversal Prevention**: Prevents `../../../` attacks
5. **Access Control**: Base path restriction to project directory

## 📊 API Response Format

```json
{
  "currentPath": "/Users/.../Lending-Club-Credit-Scoring",
  "parentPath": "/Users/.../AST-RAG-Based-Model-Card-Checks",
  "canGoUp": true,
  "files": [
    {
      "name": "notebooks",
      "path": "/Users/.../notebooks",
      "isDirectory": true,
      "size": 224,
      "modified": "2025-11-12T11:00:32.458Z",
      "extension": null
    },
    {
      "name": "README.md",
      "path": "/Users/.../README.md",
      "isDirectory": false,
      "size": 28705,
      "modified": "2025-11-12T11:00:32.216Z",
      "extension": "md"
    }
  ]
}
```

## 🎨 UI Features

### Visual Indicators
- 📁 **Folder icon** for directories
- 🐍 **Python icon** for .py files
- 📓 **Notebook icon** for .ipynb files
- 📄 **Document icon** for .md/.docx files
- 📋 **JSON icon** for .json files

### States
- **Loading**: Shows "Loading..." message
- **Error**: Displays error message in red
- **Empty**: Shows files when loaded
- **Navigation**: "↑ Up" button when in subdirectory

## 🔧 Technical Details

### File Type Detection

```typescript
const ext = file.extension?.toLowerCase();
if (ext === "ipynb") {
  openItem({ kind: "notebook", payload: { path: file.path } });
} else if (ext === "py") {
  openItem({ kind: "python", payload: { path: file.path } });
} else if (ext === "md") {
  selectModelCard({ path: file.path, type: "markdown" });
}
```

### Directory Navigation

```typescript
const handleFileClick = (file: FileEntry) => {
  if (file.isDirectory) {
    loadDirectory(file.path);  // Navigate into folder
  } else {
    // Open file based on extension
  }
};
```

## 📋 Supported File Types

| Extension | Icon | Opens In | Handler |
|-----------|------|----------|---------|
| `.ipynb` | 📓 | Center | Notebook renderer |
| `.py` | 🐍 | Center | Python editor |
| `.md` | 📄 | Right | Model card viewer |
| `.docx` | 📄 | Right | Model card viewer |
| `.json` | 📋 | N/A | Not yet implemented |
| `.txt` | 📄 | N/A | Not yet implemented |

## 🎯 Benefits

1. **Real File System**: No hardcoded file lists
2. **Dynamic**: Shows actual files from disk
3. **Flexible**: Can browse any folder
4. **Secure**: Protected against unauthorized access
5. **Fast**: Client-side rendering after initial API call
6. **Intuitive**: Familiar file browser UX

## 🔄 Integration with Cloned Repository

The Lending Club repository is automatically available:

```
Quick Access > Lending Club
  ↓
Browse folders:
  - artifacts/ (trained models)
  - notebooks/ (5 Jupyter notebooks)
  - src/ (Python utilities)
  - README.md (comprehensive docs)
```

Click any notebook to open it in the center panel and start exploring the credit scoring models!

## 💡 Pro Tips

1. **Use Quick Access** for instant navigation to common folders
2. **Navigate deeply** - you can go into nested folders
3. **Open multiple files** - files open in tabs in center panel
4. **Model cards auto-display** in right panel when clicked
5. **Use ↑ Up button** to go back one level

## 🚀 Try It Now

1. Visit: **http://localhost:3001/workspace**
2. File explorer loads with Lending Club repository
3. Click **"notebooks"** folder
4. Click **"3_pd_modeling.ipynb"** to see the PD model notebook
5. Browse through the Python files in the **"src"** folder
6. Click **"README.md"** to view the full project documentation

## ✨ Result

A fully functional, dynamic file browser that:
- Shows real files from the filesystem
- Supports navigation and folder browsing
- Automatically handles different file types
- Provides quick access to important folders
- Seamlessly integrates with the workspace UI

**The cloned Lending Club repository is now fully accessible in your workspace!** 🎉


