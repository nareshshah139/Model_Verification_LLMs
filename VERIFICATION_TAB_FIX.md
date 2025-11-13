# Verification Tab Issues - Bug Fixes

## Issues

1. **Verification results disappearing**: When users ran verification on a model card and then switched between the "Content" and "Verification" tabs, the verification results would disappear when returning to the Verification tab.

2. **Verification tab becoming disabled**: After verification completed successfully, switching to the Content tab would cause the Verification tab to become disabled, preventing users from switching back.

## Root Cause

The issue was caused by a **React re-rendering problem** with how verification data was being accessed from the workspace context.

### Technical Details

In the original implementation:

1. **Workspace Context** stored verification reports in a `Map<string, VerificationReport>`
2. Components accessed this data through a **memoized callback** `getVerificationReport(path)`
3. The callback was wrapped in `useCallback` with `verificationReports` as a dependency

```typescript
// Original problematic code in model-card-viewer.tsx
const { getVerificationReport } = useWorkspace();
const verificationReport = getVerificationReport(path);
```

**The Problem**: When `verificationReports` Map was updated (new report saved), the context value changed and the callback reference changed, but **React didn't know it needed to re-render** the component because:
- The component wasn't directly depending on `verificationReports` in its render
- It was only calling the callback function
- React's diffing algorithm didn't trigger a re-render just from the callback reference change

This created a **stale data** situation where:
1. Verification runs and saves report to the Map ✓
2. Verification tab shows results (component already rendering) ✓
3. User switches to Content tab (tab hidden, but component still mounted) ✓
4. User switches back to Verification tab ✗
5. Component tries to read verification data but gets stale closure ✗

## Solution

The fix required two steps:

### Step 1: Access Map Directly (Initial Fix)
Changed components to **access the Map directly** instead of using the memoized callback. However, this alone wasn't sufficient.

### Step 2: Sync to Local State (Complete Fix)
React doesn't deeply track changes to Map contents - it only tracks the Map reference itself. Even though the workspace context creates a new Map reference on updates, there was a reactivity issue causing the component not to re-render properly.

**Final solution**: Use a `useEffect` to sync the Map value to local state:

```typescript
// Complete fixed code
const { verificationReports } = useWorkspace();

// Track verification report in local state
const [verificationReport, setLocalVerificationReport] = useState<any>(undefined);

useEffect(() => {
  const report = verificationReports.get(path);
  setLocalVerificationReport(report);
}, [verificationReports, path]);
```

This ensures that:
1. When `verificationReports` changes in the context, it's included in the context's `useMemo` dependencies
2. The context value updates with the new Map reference
3. The `useEffect` runs when `verificationReports` or `path` changes
4. Local state is updated, triggering a re-render
5. The component always has the latest verification data

## Files Modified

### 1. `apps/api/components/workspace/model-card-viewer.tsx`
- **Line 38**: Added `verificationReports` to destructured context (removed `getVerificationReport`)
- **Lines 45-50**: Added local state `verificationReport` synced via `useEffect` to track changes from the context Map
- The component now properly re-renders when verification data changes

### 2. `apps/api/components/workspace/center-tabs.tsx`
- **Line 101**: Added `notebookDiscrepancies` to destructured context (removed `getNotebookDiscrepancies`)
- **Lines 105-110**: Added local state `discrepancies` synced via `useEffect` to track changes from the context Map
- Notebook components now properly re-render when discrepancy data changes

### 3. `apps/api/components/workspace/workspace-context.tsx`
- No changes needed - `verificationReports` and `notebookDiscrepancies` were already properly exported in the context type and value

## Why This Works

### The Context Layer
The workspace context uses `useMemo` with dependencies:

```typescript
const value = useMemo<Ctx>(
  () => ({ 
    verificationReports,
    // ... other values
  }),
  [
    verificationReports,  // When this changes, context value updates
    // ... other dependencies
  ]
);
```

When we create a **new Map** with a different reference (via `new Map(prev)` and `.set()`), React detects the reference change and the context value updates.

### The Component Layer
However, simply consuming the Map from context isn't enough. React's reconciliation algorithm doesn't deeply compare Map contents. When a component renders:

```typescript
// This doesn't trigger re-render on Map content changes
const { verificationReports } = useWorkspace();
const report = verificationReports.get(path); // Direct access
```

The component receives the new Map reference, but React doesn't know that the *result* of `.get(path)` might be different. The component needs to **explicitly track the value** as a dependency.

### The Solution: useEffect + Local State
By using `useEffect` with the Map as a dependency:

```typescript
const [verificationReport, setLocalVerificationReport] = useState<any>(undefined);

useEffect(() => {
  const report = verificationReports.get(path);
  setLocalVerificationReport(report);  // This triggers re-render
}, [verificationReports, path]);
```

When `verificationReports` changes (new Map reference), the effect runs, reads the new value, and updates local state. This state update triggers a re-render with the correct value.

## Testing

To verify both fixes:

### Test 1: Tab Remains Enabled
1. Open the workspace at http://localhost:3001/workspace
2. Click "Verify Model Card" button
3. Wait for verification to complete
4. Note the consistency score badge on the Verification tab
5. Switch to "Content" tab
6. ✅ The Verification tab should remain **enabled** with the score badge visible
7. Switch back to "Verification" tab
8. ✅ Should be able to switch without issues

### Test 2: Results Persist
1. Follow steps 1-5 above
2. Switch back to "Verification" tab
3. ✅ Verification results should still be visible with the same score
4. All findings and details should be preserved

### Test 3: Multiple Switches
1. Run verification
2. Switch between Content and Verification tabs multiple times
3. ✅ Tab should remain enabled throughout
4. ✅ Results should remain consistent on every switch

## Additional Benefits

- **Persistence**: Reports are still saved to localStorage
- **Performance**: No additional re-renders (same as before, just properly triggered now)
- **Consistency**: Same pattern used for both verification reports and notebook discrepancies

## Lessons Learned

### About React Context and Maps
- When using React Context with mutable data structures (Maps, Sets), you need more than just direct access
- Context updates propagate Map reference changes, but React doesn't deeply track Map contents
- Always sync Map values to local state using `useEffect` to ensure proper re-renders

### About React Hooks
- Memoized callbacks (`useCallback`) can create stale closures if not carefully managed
- `useEffect` is essential for tracking derived values from context that come from method calls like `.get()`
- Local state combined with effects creates a reliable re-render trigger

### About Component Architecture
- Don't rely on inline derived values (like `map.get(key)`) to trigger re-renders
- Explicitly track values that components depend on in state or refs
- Include the actual state in context values, not just accessor functions

### About Debugging React Issues
- If a component doesn't update when you expect, check if derived values are properly tracked
- Verify that all dependencies are included in hook dependency arrays
- Consider whether React can detect the change you're trying to observe

