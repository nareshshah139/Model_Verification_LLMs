# Persistence Implementation - No Data Loss on Mount/Unmount

## Overview

The verification system now includes **persistent state management** to ensure that verification data is **never lost** during component mount/unmount cycles or even page refreshes.

## Problem Solved

### Before
- ❌ Verification reports lost when switching tabs
- ❌ Notebook discrepancies lost when closing/reopening notebooks
- ❌ All data lost on page refresh
- ❌ Had to re-run verification every time

### After
- ✅ Verification reports persist across tab switches
- ✅ Notebook discrepancies persist across component remounts
- ✅ Data survives page refreshes (localStorage)
- ✅ Each model card and notebook maintains its own state
- ✅ Run verification once, access results anytime

## Implementation Details

### 1. **Workspace Context State Management**

The `WorkspaceContext` now manages verification state globally:

```typescript
// Global state stored in context
const [verificationReports, setVerificationReports] = useState<Map<string, VerificationReport>>(...)
const [notebookDiscrepancies, setNotebookDiscrepancies] = useState<Map<string, NotebookDiscrepancy[]>>(...)
```

**Key Features:**
- Uses `Map` data structure keyed by file path
- Each model card has its own verification report
- Each notebook has its own discrepancies list
- State persists for the entire session

### 2. **localStorage Persistence**

Data is automatically saved to `localStorage` and restored on page load:

```typescript
// Saved to localStorage on every update
localStorage.setItem("verificationReports", JSON.stringify(reportsMap))
localStorage.setItem("notebookDiscrepancies", JSON.stringify(discrepanciesMap))

// Loaded from localStorage on initial mount
const saved = localStorage.getItem("verificationReports")
return new Map(Object.entries(JSON.parse(saved)))
```

**Key Features:**
- Survives page refreshes
- Survives browser restarts (until localStorage is cleared)
- Automatic serialization/deserialization
- Error handling for corrupted data

### 3. **Component Integration**

#### Model Card Viewer
```typescript
// Get verification report from context (not local state)
const { getVerificationReport, setVerificationReport } = useWorkspace()
const verificationReport = getVerificationReport(path)

// Save to context instead of local state
saveVerificationReport(path, result.report)
```

#### Notebook Viewer
```typescript
// Get discrepancies from context
const { getNotebookDiscrepancies } = useWorkspace()
const discrepancies = getNotebookDiscrepancies(path)

// Pass to NotebookViewer component
<NotebookViewer notebook={notebook} path={path} discrepancies={discrepancies} />
```

## Data Flow

### Verification Flow
```
1. User clicks "Verify Model Card"
   ↓
2. API call to CodeAct Agent
   ↓
3. Response received
   ↓
4. Save to Context: setVerificationReport(path, report)
   ↓
5. Context updates Map
   ↓
6. Automatically saves to localStorage
   ↓
7. Component re-renders with new data
   ↓
8. Data persists across unmount/remount
```

### Retrieval Flow
```
1. Component mounts (ModelCardViewer)
   ↓
2. Get report: getVerificationReport(path)
   ↓
3. Context reads from Map
   ↓
4. Returns cached report (if exists)
   ↓
5. Component displays without re-fetching
```

## Storage Keys

### localStorage Keys
- `verificationReports` - All model card verification reports
- `notebookDiscrepancies` - All notebook discrepancies

### Data Structure
```typescript
// verificationReports
{
  "/model-cards/example.md": {
    consistency_score: 0.75,
    claims_spec: {...},
    evidence_table: {...},
    metrics_diffs: {...}
  },
  "/model-cards/another.md": {...}
}

// notebookDiscrepancies
{
  "/notebooks/notebook1.ipynb": [
    {
      type: "leakage",
      severity: "error",
      message: "Data leakage detected",
      codeSnippet: "..."
    }
  ],
  "/notebooks/notebook2.ipynb": [...]
}
```

## API Changes

### New Context Methods

```typescript
// Verification Reports
setVerificationReport(modelCardPath: string, report: VerificationReport): void
getVerificationReport(modelCardPath: string): VerificationReport | undefined

// Notebook Discrepancies
setNotebookDiscrepancies(notebookPath: string, discrepancies: NotebookDiscrepancy[]): void
getNotebookDiscrepancies(notebookPath: string): NotebookDiscrepancy[] | undefined
```

## Use Cases Handled

### ✅ Switching Between Tabs
- Switch from "Content" to "Verification" tab
- Data remains available
- No need to re-verify

### ✅ Opening/Closing Notebooks
- Open notebook → See highlighted issues
- Close notebook
- Re-open same notebook → Issues still highlighted

### ✅ Multiple Model Cards
- Verify first model card
- Switch to second model card
- Switch back to first model card
- Original verification still available

### ✅ Page Refresh
- Run verification
- Refresh page (F5)
- Verification results still available
- Notebook highlights still work

### ✅ Browser Session
- Run verification today
- Close browser
- Open browser tomorrow
- Data still available (until localStorage cleared)

## Clearing Data

Data can be cleared by:
1. **Manually clearing browser localStorage**
2. **Running in incognito/private mode** (data lost on close)
3. **Clearing browser data/cache**

To programmatically clear:
```typescript
localStorage.removeItem("verificationReports")
localStorage.removeItem("notebookDiscrepancies")
// Or clear all
localStorage.clear()
```

## Benefits

### 1. **Better UX**
- No repeated verification calls
- Instant access to previous results
- Seamless navigation between files

### 2. **Performance**
- Reduces API calls to CodeAct Agent
- Faster response times
- Lower server load

### 3. **Developer Experience**
- Easier debugging (data persists)
- Can inspect results later
- No state management headaches

### 4. **Reliability**
- No lost work
- Consistent state
- Predictable behavior

## Edge Cases Handled

### ✅ Component Unmount During Verification
- Verification continues in background
- Result saved to context when complete
- Available when component remounts

### ✅ Multiple Verifications on Same File
- Latest result overwrites previous
- Ensures fresh data
- No stale results

### ✅ localStorage Full
- Error caught and logged
- Falls back to in-memory storage
- User notified in console

### ✅ Corrupted localStorage Data
- Error caught during parse
- Falls back to empty Map
- App continues to work

## Testing Scenarios

### Test 1: Tab Switching
```
1. Verify model card
2. Switch to "Content" tab
3. Switch back to "Verification" tab
✓ Results still visible
```

### Test 2: Notebook Persistence
```
1. Verify notebooks
2. Open notebook with issues
3. Close notebook tab
4. Re-open same notebook
✓ Issues still highlighted
```

### Test 3: Page Refresh
```
1. Verify model card (score: 75%)
2. Refresh page (F5)
3. Check verification tab
✓ Score still shows 75%
```

### Test 4: Multiple Files
```
1. Verify model-card-1.md
2. Switch to model-card-2.md
3. Verify model-card-2.md
4. Switch back to model-card-1.md
✓ Original results still available
```

## Migration Notes

### From Local State to Context

**Before:**
```typescript
const [verificationReport, setVerificationReport] = useState(null)
```

**After:**
```typescript
const { getVerificationReport, setVerificationReport } = useWorkspace()
const verificationReport = getVerificationReport(path)
```

## Performance Considerations

- ✅ **Map lookups**: O(1) - Very fast
- ✅ **localStorage**: Async writes, non-blocking
- ✅ **Serialization**: Only on updates, not reads
- ✅ **Memory**: Minimal overhead (reports are small)

## Future Enhancements

1. **IndexedDB**: For larger datasets
2. **Compression**: Reduce localStorage size
3. **Expiration**: Auto-cleanup old reports
4. **Sync**: Cloud sync across devices
5. **Export**: Download all verification data

## Summary

The persistence layer ensures that:
- ✅ **No data is lost** on component unmount
- ✅ **State survives** page refreshes
- ✅ **Each file maintains** its own state
- ✅ **Performance is improved** (fewer API calls)
- ✅ **UX is enhanced** (instant results)

Your verification data is now **always available** when you need it! 🎉

