# Model Card Word Document Loading Fix

## Problem
When trying to load a Word document (`.docx`) model card from the file explorer, users were getting the error:

```
Error Loading Model Card
Failed to load Word document: Not Found
```

Even though the Word document existed in the filesystem at:
```
Lending-Club-Credit-Scoring/Model Card - Credit Risk Scoring Model - Expected Loss.docx
```

## Root Cause
The `ModelCardViewer` component was trying to fetch Word documents directly using the browser's `fetch()` API with a filesystem path:

```typescript
const response = await fetch(path); // path = "/Users/nshah/Documents/.../Model Card.docx"
```

However, browsers cannot access arbitrary filesystem paths through `fetch()` - they can only fetch URLs from web servers or files in the public directory.

## Solution

### 1. Created API Endpoint for Model Cards
Created a new API endpoint at `/api/modelcards/content/route.ts` that:
- Accepts a file path as a query parameter
- Reads the file from the filesystem using Node.js `fs/promises`
- Returns markdown files as JSON with text content
- Returns Word documents as binary data with appropriate headers
- Includes security checks to prevent path traversal attacks
- Handles both absolute and relative paths

### 2. Updated ModelCardViewer Component
Modified `components/workspace/model-card-viewer.tsx` to:
- Detect whether a path is a filesystem path or a URL
- Use the new API endpoint for filesystem paths
- Keep direct fetching for public URLs (like `/model-cards/example.md`)
- Pass the file type (`markdown` or `docx`) to the API endpoint

### Key Changes

**API Endpoint** (`app/api/modelcards/content/route.ts`):
```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  const fileType = searchParams.get("type");
  
  // Security checks and path resolution
  // Read file from filesystem
  // Return appropriate response based on file type
}
```

**ModelCardViewer Logic**:
```typescript
// Detect if path is from filesystem or is a URL
const isFilesystemPath = path.includes("Documents") || 
                          path.includes("Users") || 
                          /^[A-Za-z]:/.test(path) ||
                          (!path.startsWith("http://") && 
                           !path.startsWith("https://") && 
                           !path.startsWith("/model-cards/"));

if (isFilesystemPath) {
  // Use API endpoint
  const response = await fetch(`/api/modelcards/content?path=${encodeURIComponent(path)}&type=${type}`);
} else {
  // Fetch directly (for public URLs)
  const response = await fetch(path);
}
```

## How It Works Now

1. User clicks on a Word document in the File Explorer
2. File Explorer calls `selectModelCard({ path: "/absolute/path/to/file.docx", type: "docx" })`
3. ModelSidebar renders ModelCardViewer with the path and type
4. ModelCardViewer detects it's a filesystem path
5. Fetches the file via `/api/modelcards/content?path=...&type=docx`
6. API endpoint reads the file from disk and returns it as binary data
7. ModelCardViewer receives the binary data and converts it to HTML using Mammoth.js
8. Rendered HTML is displayed in the right sidebar

## Files Modified
- ✅ Created: `apps/api/app/api/modelcards/content/route.ts` (new API endpoint)
- ✅ Updated: `apps/api/components/workspace/model-card-viewer.tsx` (client-side logic)

## Testing
To test the fix:
1. Start the development server: `npm run dev` (in `apps/api/`)
2. Navigate to the workspace at `/workspace`
3. Use the File Explorer to browse to the Lending Club folder
4. Click on "Model Card - Credit Risk Scoring Model - Expected Loss.docx"
5. The Word document should now load and display in the right sidebar

## Notes
- The fix maintains backward compatibility with markdown files and public URLs
- Security checks prevent path traversal attacks (`..` in paths)
- The API endpoint supports both absolute and relative paths
- The solution is similar to how notebooks are handled (`/api/notebooks/content`)


