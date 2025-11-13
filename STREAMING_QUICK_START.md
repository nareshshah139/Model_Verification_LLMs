# 🚀 Quick Start: Streaming Verification

## What's New?

Verification results now **stream in real-time** instead of appearing all at once! You'll see step-by-step progress as the CodeAct agent analyzes your model card.

## How to Use

### 1. Start the Services

```bash
# Terminal 1: Start Next.js UI
cd apps/api
pnpm dev

# Terminal 2: Start CodeAct API
cd services/codeact_cardcheck
python api_server.py
```

### 2. Open the Workspace

Navigate to: http://localhost:3001/workspace

### 3. Click "Verify Model Card"

The verification tab will open immediately and show live progress:

```
🔄 Verifying model card...

⏱️ 10:23:45 AM
📍 Step 1
Parsing model card...

⏱️ 10:23:47 AM
📍 Step 2
Preparing repository...

⏱️ 10:23:50 AM
📍 Step 3
Running AST-grep scans...
├─ Scanning for leakage patterns...
├─ Scanning for algorithm usage...
└─ Scanning for metric calculations...

⏱️ 10:23:58 AM
📍 Step 4
Extracting metrics with LLM...

⏱️ 10:24:03 AM
📍 Step 5
Comparing claims with evidence...

⏱️ 10:24:06 AM
✅ Verification complete!
```

### 4. View Results

Results appear automatically as soon as verification completes!

## Visual Guide

### Streaming Progress Card

<img width="800" alt="Streaming Progress" src="https://via.placeholder.com/800x400/1a1a2e/eaeaea?text=Real-time+Progress+Messages" />

Each progress message shows:
- ⏱️ **Timestamp**: When the step started
- 📍 **Step Number**: Which verification step (1-5)
- 📝 **Message**: What's happening now
- 📊 **Details**: Expandable JSON data (click "View details")

### Key Features

1. **Instant Feedback**: See progress within 500ms of clicking
2. **Step-by-Step**: Know exactly what's being analyzed
3. **Detailed Logs**: Expand any step to see internal data
4. **Smooth Animation**: Messages fade in as they arrive
5. **Auto-Scroll**: Progress area scrolls to show latest updates

## What You'll See

### For Model Card Verification

| Step | Message | Duration |
|------|---------|----------|
| 1 | "Parsing model card..." | ~1s |
| 2 | "Preparing repository..." | ~2s |
| 3 | "Running AST-grep scans..." | ~5-10s |
| 4 | "Extracting metrics with LLM..." | ~5-15s |
| 5 | "Comparing claims with evidence..." | ~2-5s |

**Total**: ~15-30 seconds with real-time updates

### For Notebook Verification

Same steps, but with additional notebook-specific analysis.

## Troubleshooting

### Progress Stops Mid-Stream

**Symptom**: Progress messages stop appearing
**Cause**: Network connection lost
**Fix**: Refresh page and try again

### No Progress Messages

**Symptom**: Only sees "Verifying model card..." spinner
**Cause**: CodeAct API not running or SSE not supported
**Fix**: 
1. Check that `python api_server.py` is running on port 8001
2. Check browser console for errors
3. Ensure browser supports SSE (all modern browsers do)

### Messages Appear Out of Order

**Symptom**: Step 3 appears before Step 2
**Cause**: This shouldn't happen with SSE (order is guaranteed)
**Fix**: Report as bug if this occurs

## Technical Details

### Browser Requirements
- ✅ Chrome/Edge (all recent versions)
- ✅ Firefox (all recent versions)
- ✅ Safari (all recent versions)
- ❌ Internet Explorer (not supported)

### Network Tab (DevTools)

To see the SSE stream in action:

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Verify Model Card"
4. Look for request to `/api/verify/model-card`
5. Click on it
6. Select "EventStream" or "Response" tab
7. Watch events arrive in real-time!

```
data: {"type":"progress","message":"Step 1: Parsing model card...","data":{"step":1}}

data: {"type":"progress","message":"Step 2: Preparing repository...","data":{"step":2}}

data: {"type":"progress","message":"Step 3: Running AST-grep scans...","data":{"step":3}}

...

data: {"type":"complete","report":{...}}
```

## Comparison: Before vs After

### Before (Non-Streaming) ❌

```
1. Click button
2. See spinner
3. Wait... 😴
4. Wait... 😴
5. Wait... 😴
6. Results appear (30s later)
```

### After (Streaming) ✅

```
1. Click button
2. See "Parsing model card..." (0.5s)
3. See "Preparing repository..." (2s)
4. See "Running AST-grep scans..." (5s)
5. See "Extracting metrics..." (8s)
6. See "Comparing claims..." (3s)
7. Results appear (total: 18s, but felt like 5s!)
```

## Advanced: Programmatic Access

You can also consume the SSE stream programmatically:

```javascript
const eventSource = new EventSource('/api/verify/model-card', {
  method: 'POST', // Note: EventSource doesn't support POST
  // Use fetch with streaming instead (see implementation)
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
});
```

Or with fetch (recommended):

```javascript
const response = await fetch('/api/verify/model-card', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ modelCardPath, repoPath }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  // Parse SSE lines starting with "data: "
  console.log('Chunk:', text);
}
```

## What's Streaming?

**SSE (Server-Sent Events)** is a standard way for servers to push data to browsers:

- ✅ **Simple**: Just HTTP GET/POST with `text/event-stream`
- ✅ **Reliable**: Built-in reconnection logic
- ✅ **Efficient**: One connection, many messages
- ✅ **Standard**: Works in all modern browsers
- ✅ **Unidirectional**: Perfect for progress updates

Unlike WebSockets (which are bidirectional), SSE is perfect for one-way streams like progress updates.

## Next Steps

1. Try clicking "Verify Model Card" to see streaming in action
2. Open DevTools Network tab to inspect SSE events
3. Check the verification results when complete
4. Try "Verify Notebooks" (also supports streaming!)

## Need Help?

- 📖 Read: `STREAMING_VERIFICATION_IMPLEMENTATION.md` for technical details
- 🐛 Report issues: Check browser console for errors
- 💬 Questions: Check that both services are running on correct ports

---

**Enjoy real-time verification feedback! 🎉**

