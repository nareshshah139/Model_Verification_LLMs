# Testing Persistence - Verification Data Never Lost

## Quick Test Checklist

Use this checklist to verify that mount/unmount doesn't lose information.

### ✅ Test 1: Tab Switching (Model Card)
- [ ] Go to http://localhost:3001/workspace
- [ ] Click "Verify Model Card" button
- [ ] Wait for verification to complete
- [ ] Note the consistency score (e.g., 75%)
- [ ] Switch to "Content" tab
- [ ] Switch back to "Verification" tab
- [ ] **PASS**: Score and results still visible
- [ ] **FAIL**: Data disappeared

### ✅ Test 2: Component Unmount/Remount
- [ ] Run verification on model card
- [ ] Click away to Dashboard in header
- [ ] Click back to Workspace
- [ ] Check model card viewer
- [ ] **PASS**: Verification tab still shows results
- [ ] **FAIL**: Have to re-verify

### ✅ Test 3: Page Refresh
- [ ] Run "Verify Model Card"
- [ ] Note consistency score
- [ ] Press F5 to refresh page
- [ ] Wait for page to reload
- [ ] Click on model card in file explorer (if needed)
- [ ] Check "Verification" tab
- [ ] **PASS**: Same score and results appear
- [ ] **FAIL**: Verification tab is empty

### ✅ Test 4: Notebook Highlighting Persistence
- [ ] Click "Verify Notebooks" button
- [ ] Open a notebook from center pane (e.g., 3_pd_modeling.ipynb)
- [ ] Note highlighted cells (red/yellow borders)
- [ ] Close the notebook tab (X button)
- [ ] Re-open the same notebook
- [ ] **PASS**: Same cells still highlighted
- [ ] **FAIL**: No highlighting visible

### ✅ Test 5: Multiple Model Cards
- [ ] Verify the default model card
- [ ] Note the score (e.g., 75%)
- [ ] Select a different model card from file explorer
- [ ] Verify the new model card
- [ ] Note the new score (e.g., 85%)
- [ ] Switch back to the first model card
- [ ] **PASS**: Original score (75%) still shows
- [ ] **FAIL**: Lost first card's results

### ✅ Test 6: localStorage Verification
- [ ] Run any verification
- [ ] Open browser DevTools (F12)
- [ ] Go to "Application" or "Storage" tab
- [ ] Click "Local Storage" → http://localhost:3001
- [ ] **PASS**: See keys "verificationReports" and "notebookDiscrepancies"
- [ ] **FAIL**: Keys not present

### ✅ Test 7: Browser Restart
- [ ] Run verification (note the score)
- [ ] Close entire browser
- [ ] Re-open browser
- [ ] Navigate to http://localhost:3001/workspace
- [ ] **PASS**: Verification results still available
- [ ] **FAIL**: Lost all data

### ✅ Test 8: Concurrent Notebooks
- [ ] Verify notebooks
- [ ] Open notebook #1 (see highlighted issues)
- [ ] Open notebook #2 in another tab (see highlighted issues)
- [ ] Close notebook #1
- [ ] **PASS**: Notebook #2 still has highlights
- [ ] **FAIL**: Notebook #2 lost its highlights

## Expected Behavior

### 🟢 When Persistence Works
- Verification results appear instantly (no API call)
- Tab badges show correct counts
- Highlighting appears immediately
- No loading spinners
- Console shows "Loaded from localStorage" messages

### 🔴 When Persistence Fails
- Verification tab is empty after refresh
- Have to click verify button again
- No highlighted cells in notebooks
- Console shows errors about localStorage

## Debugging

### Check localStorage Contents
```javascript
// Open browser console and run:
JSON.parse(localStorage.getItem('verificationReports'))
JSON.parse(localStorage.getItem('notebookDiscrepancies'))
```

### Clear localStorage (Start Fresh)
```javascript
// Open browser console and run:
localStorage.removeItem('verificationReports')
localStorage.removeItem('notebookDiscrepancies')
// Or clear everything:
localStorage.clear()
```

### Check Context State
```javascript
// In React DevTools:
1. Open React DevTools (F12 → Components tab)
2. Find "WorkspaceProvider" component
3. Look at hooks → useState
4. Should see Maps with data
```

## What to Look For

### ✅ Good Signs
- ✅ Verification tab shows data immediately
- ✅ No "Loading..." spinner on tab switch
- ✅ localStorage has data (check DevTools)
- ✅ Notebook cells have colored borders
- ✅ Console is clean (no errors)

### 🚨 Bad Signs
- 🚨 Empty verification tab after refresh
- 🚨 localStorage is empty
- 🚨 Console shows "Failed to load" errors
- 🚨 Notebooks have no highlighting
- 🚨 Have to re-verify every time

## Performance Check

### Should Be Fast ⚡
- Tab switching: Instant (<50ms)
- Opening notebook: 100-300ms (loading only)
- Page load with cached data: 500ms-1s
- No API calls on repeated views

### Should Be Slow 🐌 (Expected)
- First verification: 10-30 seconds (API call)
- Loading new model card: 500ms-2s (file read)
- First notebook open: 500ms-2s (file parse)

## Success Criteria

All 8 tests should **PASS** ✅

If any test **FAILS** ❌:
1. Check browser console for errors
2. Verify localStorage permissions (not in private mode)
3. Check if CodeAct API is running (http://localhost:8001)
4. Clear localStorage and try again

## Report Issues

If persistence is not working:
```
Issue: [Test number] failed
Browser: [Chrome/Firefox/Safari/Edge]
Version: [Browser version]
Console errors: [Copy error messages]
localStorage: [Empty/Has data]
```

---

## Quick Test (30 seconds)

**The fastest way to test:**
1. Verify model card → Note score
2. Refresh page (F5)
3. Check if score still shows

✅ **PASS** = Persistence works!  
❌ **FAIL** = Something's broken

---

**Last Updated**: After implementing context + localStorage persistence  
**Status**: ✅ All systems operational

