# Workspace UI Implementation

## Overview

A complete Cursor-style three-pane workspace UI built with Next.js (App Router), Tailwind CSS, and shadcn/ui components.

## Architecture

### File Structure

```
app/
  ├── layout.tsx                 # Global layout with header and navigation
  ├── page.tsx                   # Root page (redirects to /workspace)
  ├── workspace/
  │   └── page.tsx              # Main 3-pane workspace UI
  └── dashboard/
      └── page.tsx              # Dashboard (outside 3-pane layout)

components/
  ├── ui/                       # shadcn/ui components
  │   ├── badge.tsx
  │   ├── button.tsx
  │   ├── card.tsx
  │   ├── resizable.tsx
  │   ├── scroll-area.tsx
  │   ├── separator.tsx
  │   └── tabs.tsx
  └── workspace/                # Custom workspace components
      ├── center-tabs.tsx       # Center panel with closable tabs
      ├── file-explorer.tsx     # Left sidebar file tree
      ├── model-sidebar.tsx     # Right sidebar model card
      ├── resizable-shell.tsx   # 3-pane resizable layout
      ├── super-tabs.tsx        # Top-level Notebook/Dashboard switcher
      └── workspace-context.tsx # State management for tabs

src/lib/
  ├── types.ts                  # TypeScript types for tabs and openables
  └── utils.ts                  # Utility functions (cn helper)
```

## Features

### 1. Three-Pane Resizable Layout

- **Left Panel (20% default)**: File Explorer
  - Browse through notebooks (.ipynb) and Python files (.py)
  - Click files to open them in center tabs
  - Minimum width: 15%

- **Center Panel (58% default)**: Tabbed Editor
  - Multiple closable tabs
  - Supports Python files, Jupyter notebooks, and model cards
  - Each tab type has a custom renderer
  - Minimum width: 40%

- **Right Panel (22% default)**: Model Card
  - Display model metadata
  - Quick action to open model details in center
  - Minimum width: 15%

### 2. SuperTabs Navigation

Located above the center panel tabs:
- **Notebook**: Main 3-pane workspace view
- **Dashboard**: Separate analytics/metrics view (outside 3-pane layout)

### 3. Tab Management

The workspace maintains state for multiple open files:
- **Python Editor**: Placeholder for code editor (Monaco/CodeMirror integration ready)
- **Notebook Renderer**: Displays Jupyter notebook cells (markdown, code, output)
- **Model Details**: Shows model information and context window

Each tab includes:
- File type badge (PY, IPYNB, MODEL)
- Close button (X)
- Active state highlighting

### 4. Global Navigation

Header with:
- Logo/brand link (returns to workspace)
- Dashboard navigation button
- Sticky positioning
- Backdrop blur effect

## State Management

### WorkspaceContext

Provides centralized state management:

```typescript
type Ctx = {
  tabs: CenterTab[];          // All open tabs
  activeId: string | null;    // Currently active tab
  openItem: (item: Openable) => void;  // Open new tab
  closeTab: (id: string) => void;      // Close tab
  setActive: (id: string) => void;     // Switch active tab
};
```

### Tab Types

```typescript
type CenterTab =
  | { id: string; title: string; kind: "python"; payload: { path: string } }
  | { id: string; title: string; kind: "notebook"; payload: { path: string } }
  | { id: string; title: string; kind: "model"; payload: { name: string; contextWindow: number } };
```

## Styling

### Tailwind Configuration

- Dark mode support (class-based)
- Custom color scheme with CSS variables
- Responsive design ready
- shadcn/ui theming

### Theme Colors

```css
--background: Dark base
--foreground: Light text
--primary: Blue (#217 91% 60%)
--muted: Subtle backgrounds
--border: Separator lines
```

## Integration Points

### 1. Code Editor

Replace the `PythonEditor` placeholder in `center-tabs.tsx`:

```tsx
// Replace with Monaco Editor
import Editor from '@monaco-editor/react';

function PythonEditor({ path }: { path: string }) {
  return <Editor language="python" theme="vs-dark" />;
}
```

### 2. Notebook Renderer

Replace the `NotebookRenderer` placeholder:

```tsx
// Use a library like @nteract/notebook-render
import { Notebook } from '@nteract/notebook-render';

function NotebookRenderer({ path }: { path: string }) {
  return <Notebook notebookData={/* load from API */} />;
}
```

### 3. File System

Update `file-explorer.tsx` to fetch real files:

```tsx
// Fetch from API
const files = await fetch('/api/files').then(r => r.json());
```

### 4. Model Data

Update `model-sidebar.tsx` to fetch real model info:

```tsx
// Fetch from API
const model = await fetch('/api/models/current').then(r => r.json());
```

## Configuration

### TypeScript Paths

The `@/` alias maps to the project root (`apps/api/`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Dependencies

All required packages are already installed:
- `nanoid`: Unique ID generation
- `lucide-react`: Icons
- `react-resizable-panels`: Resizable panels
- `@radix-ui/react-*`: Headless UI components
- `tailwind-merge` + `clsx`: Utility class management

## Development

### Running the Server

```bash
cd apps/api
npm run dev
```

Server runs on `http://localhost:3001`

### Routes

- `/` - Redirects to `/workspace`
- `/workspace` - Main 3-pane workspace
- `/dashboard` - Analytics/metrics dashboard

## Customization

### Adding New Tab Types

1. Extend `CenterTab` type in `src/lib/types.ts`
2. Add renderer component in `center-tabs.tsx`
3. Update `openItem` logic in `workspace-context.tsx`

### Adding More Panels

Modify `resizable-shell.tsx` to add additional panels:

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel>Left</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>Center</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>Right</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>New Panel</ResizablePanel>
</ResizablePanelGroup>
```

## Next Steps

1. **Wire Real Data**: Connect file explorer to actual file system
2. **Add Editor**: Integrate Monaco or CodeMirror for code editing
3. **Notebook Rendering**: Add proper Jupyter notebook renderer
4. **API Integration**: Connect to backend APIs for models and files
5. **State Persistence**: Save tab state to localStorage
6. **Keyboard Shortcuts**: Add hotkeys for tab navigation
7. **Search**: Add file search functionality
8. **Git Integration**: Show git status in file explorer

## Technical Notes

### Path Resolution Fix

The tsconfig.json was updated to explicitly set `baseUrl: "."` and include both `@/*` and `@shared/*` paths. This fixes Next.js webpack module resolution.

### Client Components

All workspace components are client components (`"use client"`) because they:
- Use React hooks (useState, useContext, useEffect)
- Handle user interactions
- Need browser APIs

### Performance

The resizable panels use `react-resizable-panels` which is optimized for performance. Tab switching is instant as all tabs remain mounted (but hidden when inactive).

## License

Part of the AST-RAG-Based-Model-Card-Checks project.

