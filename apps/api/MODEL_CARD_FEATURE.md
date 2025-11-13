# Model Card Viewer Feature

## Overview

The workspace now supports viewing **Model Cards** in both **Markdown (.md)** and **Word Document (.docx)** formats. Model cards open in the center panel with rich formatting and styling.

## What's New

### 1. Model Card Viewer Component

**Location:** `components/workspace/model-card-viewer.tsx`

A dedicated viewer that:
- ✅ Renders Markdown files with GitHub Flavored Markdown (GFM) support
- ✅ Converts Word documents (.docx) to HTML using Mammoth.js
- ✅ Provides beautiful styling with prose classes
- ✅ Shows loading and error states
- ✅ Displays file metadata (path, type)

### 2. Enhanced Type System

**Location:** `src/lib/types.ts`

```typescript
export type CenterTab =
  | { id: string; title: string; kind: "python"; payload: { path: string } }
  | { id: string; title: string; kind: "notebook"; payload: { path: string } }
  | { id: string; title: string; kind: "modelcard"; payload: { path: string; type: "markdown" | "docx" } };
```

### 3. Updated Components

#### File Explorer
- Shows model card files with document icons
- Organized in `model-cards/` folder
- Supports `.md` and `.docx` file types

#### Model Sidebar
- Lists all available model cards
- Shows metadata (name, description, last modified)
- Quick "Open Card" button for each
- File type badges (MD/DOCX)

#### Center Tabs
- Tab badge shows "CARD" for model cards
- Integrates ModelCardViewer for rendering
- Maintains tab state across switches

## File Structure

```
apps/api/
├── components/workspace/
│   ├── model-card-viewer.tsx    ← New component
│   ├── center-tabs.tsx           ← Updated
│   ├── file-explorer.tsx         ← Updated
│   ├── model-sidebar.tsx         ← Updated
│   └── workspace-context.tsx     ← Updated
├── public/model-cards/           ← New directory
│   ├── example_model_card.md     ← Sample: Lending Club model
│   ├── bert_model.md             ← Sample: BERT model
│   └── llm_card.md               ← Sample: GPT-4 Vision (placeholder)
└── src/lib/
    └── types.ts                  ← Updated types
```

## Dependencies Added

```json
{
  "react-markdown": "^9.x",
  "remark-gfm": "^4.x",
  "mammoth": "^1.x"
}
```

### What They Do

- **react-markdown**: Renders markdown with React components
- **remark-gfm**: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **mammoth**: Converts .docx files to HTML

## Features

### Markdown Support

Full GFM support including:
- ✅ Headers (H1-H6)
- ✅ Lists (ordered & unordered)
- ✅ Tables
- ✅ Code blocks with syntax highlighting
- ✅ Inline code
- ✅ Blockquotes
- ✅ Links
- ✅ Bold, italic, strikethrough
- ✅ Task lists
- ✅ Horizontal rules

### Word Document Support

Converts .docx to HTML with:
- ✅ Paragraphs and headings
- ✅ Lists
- ✅ Tables
- ✅ Basic formatting (bold, italic, underline)
- ✅ Images (embedded in document)

### Styling

Beautiful prose styling with:
- Dark mode support
- Consistent typography
- Proper spacing
- Bordered tables
- Syntax-highlighted code blocks
- Accent-colored links

## Usage

### Opening Model Cards

**Method 1: File Explorer**
1. Navigate to `model-cards/` folder
2. Click any `.md` or `.docx` file
3. File opens in center panel

**Method 2: Model Sidebar**
1. Browse available model cards in right sidebar
2. Click "Open Card" button
3. Card opens in new tab

### Multiple Cards

- Open multiple model cards simultaneously
- Switch between tabs
- Close with × button
- Tab badge shows "CARD"

## Adding New Model Cards

### Option 1: Add to Public Directory

```bash
# Copy your model card
cp your_model_card.md apps/api/public/model-cards/

# Or for Word docs
cp your_model_card.docx apps/api/public/model-cards/
```

### Option 2: Update Component Lists

**In `file-explorer.tsx`:**

```typescript
const files = [
  { 
    path: "/model-cards/your_card.md", 
    kind: "modelcard" as const, 
    type: "markdown" as const 
  },
  // ... other files
];
```

**In `model-sidebar.tsx`:**

```typescript
const modelCards = [
  {
    name: "Your Model",
    path: "/model-cards/your_card.md",
    type: "markdown" as const,
    description: "Your model description",
    lastModified: "Today",
  },
  // ... other cards
];
```

### Option 3: Connect to API (Recommended for Production)

Replace hardcoded lists with API calls:

```typescript
// In file-explorer.tsx
const { data: files } = useSWR('/api/model-cards', fetcher);

// In model-sidebar.tsx
const { data: modelCards } = useSWR('/api/model-cards', fetcher);
```

## Example Model Cards Included

### 1. Lending Club Credit Scoring Model
**File:** `example_model_card.md`

A comprehensive model card for a credit scoring model including:
- Model family (PD, LGD, EAD)
- Data splits and validation strategy
- Feature policy
- Performance metrics
- Governance compliance

### 2. BERT Base Uncased
**File:** `bert_model.md`

Complete NLP model card with:
- Model architecture details
- Training procedure
- GLUE benchmark results
- SQuAD performance
- Bias and fairness analysis
- Environmental impact
- Citation information

### 3. GPT-4 Vision (Placeholder)
**File:** `llm_card.md`

Demonstrates multimodal model documentation:
- Text and vision capabilities
- Technical specifications
- Performance metrics (placeholder)
- Safety considerations
- Usage guidelines

## Customization

### Changing Markdown Styles

Edit the `ReactMarkdown` component props in `model-card-viewer.tsx`:

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  className="prose prose-sm dark:prose-invert max-w-none"
  components={{
    h1: ({ node, ...props }) => (
      <h1 className="your-custom-classes" {...props} />
    ),
    // ... customize other elements
  }}
>
  {content}
</ReactMarkdown>
```

### Adding Document Actions

Add buttons to the viewer header:

```typescript
<div className="border-b px-4 py-2 flex items-center justify-between">
  <div className="flex items-center gap-2">
    Model Card: <Badge>{path}</Badge>
  </div>
  <div className="flex gap-2">
    <Button size="sm" variant="outline">Download</Button>
    <Button size="sm" variant="outline">Share</Button>
  </div>
</div>
```

### Supporting More Formats

To add PDF support:

```bash
npm install react-pdf
```

Then extend the types and add a PDF viewer case.

## API Integration

### Fetch Model Cards from Backend

```typescript
// Create: app/api/model-cards/route.ts
export async function GET() {
  const cards = await prisma.modelCard.findMany({
    select: {
      id: true,
      name: true,
      path: true,
      type: true,
      description: true,
      updatedAt: true,
    },
  });
  
  return Response.json(cards);
}
```

### Dynamic Content Loading

```typescript
// In model-card-viewer.tsx
const response = await fetch(`/api/model-cards/content?path=${encodeURIComponent(path)}`);
```

## Accessibility

The viewer includes:
- ✅ Semantic HTML structure
- ✅ ARIA labels on buttons
- ✅ Keyboard navigation support
- ✅ Loading states with screen reader text
- ✅ Error messages with icons

## Performance

- **Lazy Loading**: Documents load only when opened
- **Caching**: Browser caches loaded content
- **Efficient Rendering**: React-markdown only re-renders on content change
- **Scroll Virtualization**: Handled by ScrollArea component

## Troubleshooting

### Model card not loading

**Issue:** "Failed to load model card" error

**Solutions:**
1. Check file exists in `public/model-cards/`
2. Verify path matches exactly (case-sensitive)
3. Check browser console for CORS errors
4. Ensure file has correct extension (.md or .docx)

### Markdown not rendering

**Issue:** Markdown shows as plain text

**Solutions:**
1. Verify `react-markdown` is installed
2. Check `type` is set to `"markdown"`
3. Ensure `remarkGfm` plugin is imported

### Word document displays poorly

**Issue:** .docx formatting looks wrong

**Solutions:**
1. Complex Word formatting may not convert perfectly
2. Consider converting to Markdown for better results
3. Check Mammoth.js documentation for supported features

### Styles not applying

**Issue:** Content has no styling

**Solutions:**
1. Verify Tailwind is processing prose classes
2. Check `dark:prose-invert` is working in dark mode
3. Ensure CSS is loading correctly

## Next Steps

### Recommended Enhancements

1. **Search**: Add search within model cards
2. **Export**: Download cards in different formats
3. **Versioning**: Track model card versions
4. **Comments**: Add inline commenting
5. **Comparison**: Side-by-side card comparison
6. **Templates**: Model card templates for different model types
7. **Validation**: Check cards against schemas
8. **AI Analysis**: Automatically analyze cards for completeness

### Integration Points

1. **CI/CD**: Validate model cards in PR checks
2. **Model Registry**: Link to model artifacts
3. **Monitoring**: Track when cards are viewed
4. **Approvals**: Workflow for card reviews
5. **Lineage**: Link cards to training data

## Resources

- [Model Cards Paper](https://arxiv.org/abs/1810.03993) by Google
- [Hugging Face Model Cards](https://huggingface.co/docs/hub/model-cards)
- [React Markdown Docs](https://github.com/remarkjs/react-markdown)
- [Mammoth.js Docs](https://github.com/mwilliamson/mammoth.js)

## License

Part of the AST-RAG-Based-Model-Card-Checks project.

