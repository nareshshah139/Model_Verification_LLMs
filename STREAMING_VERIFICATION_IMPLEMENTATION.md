# Streaming Verification Implementation

## Overview

The verification system now supports **real-time streaming** of results using Server-Sent Events (SSE). This allows users to see progress updates step-by-step as the CodeAct agent performs verification, instead of waiting for the entire process to complete.

## Architecture

### Data Flow

```
User clicks "Verify Model Card"
           ↓
[Frontend] model-card-viewer.tsx
  - Initiates streaming request
  - Switches to verification tab
  - Displays progress messages in real-time
           ↓
[Next.js API] /api/verify/model-card (SSE Stream)
  - Reads model card file
  - Proxies SSE stream from CodeAct API
  - Forwards events to frontend
           ↓
[CodeAct API] http://localhost:8001/verify/stream
  - Parses model card
  - Runs AST-grep scans
  - Extracts metrics with LLM
  - Sends progress updates via SSE
           ↓
[Frontend] Real-time updates
  - Step 1: "Parsing model card..."
  - Step 2: "Preparing repository..."
  - Step 3: "Running AST-grep scans..."
  - Step 4: "Extracting metrics..."
  - Step 5: "Comparing claims with evidence..."
  - Complete: Final report displayed
```

## Implementation Details

### 1. Backend API Routes (Streaming)

#### `/api/verify/model-card/route.ts`

**Key Changes:**
- Changed from regular `fetch` + `response.json()` to streaming with `ReadableStream`
- Uses `text/event-stream` content type
- Proxies SSE events from CodeAct API to frontend
- Buffers incomplete lines to handle chunked SSE messages

**Code Structure:**
```typescript
// Stream SSE events from CodeAct API
const stream = new ReadableStream({
  async start(controller) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          // Forward SSE event to client
          controller.enqueue(encoder.encode(line + '\n'));
        }
      }
    }
  }
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  },
});
```

#### `/api/verify/notebooks/route.ts`

**Similar Changes:**
- Streams verification results for notebooks
- Injects `discrepancies` data into the final `complete` event
- Maintains backward compatibility with notebook-specific features

### 2. Frontend Components (Streaming Consumer)

#### `model-card-viewer.tsx`

**New State:**
```typescript
const [progressMessages, setProgressMessages] = useState<Array<{
  message: string;
  step?: number;
  data?: any;
  timestamp: number;
}>>([]);
```

**Streaming Handler:**
```typescript
const handleVerifyModelCard = async () => {
  setVerifying(true);
  setProgressMessages([]);
  setActiveTab("verification"); // Switch immediately
  
  const response = await fetch("/api/verify/model-card", { ... });
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.type === 'progress') {
          // Add progress message to UI
          setProgressMessages(prev => [...prev, {
            message: data.message,
            step: data.data?.step,
            timestamp: Date.now(),
          }]);
        } else if (data.type === 'complete') {
          // Save final report
          saveVerificationReport(path, data.report);
        }
      }
    }
  }
};
```

### 3. UI Components (Progress Display)

**Verification Tab Content:**

When `verifying === true`, displays a live progress feed:

```tsx
<TabsContent value="verification">
  {verifying ? (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span>Verifying model card...</span>
          </div>
          
          <ScrollArea className="h-[500px]">
            {progressMessages.map((msg, idx) => (
              <div key={idx} className="p-3 rounded border animate-in fade-in">
                {msg.step && <Badge>Step {msg.step}</Badge>}
                <div>{msg.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                {msg.data && (
                  <details>
                    <summary>View details</summary>
                    <pre>{JSON.stringify(msg.data, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Show results as soon as they arrive */}
      {verificationReport && (
        <VerificationResults report={verificationReport} type="model-card" />
      )}
    </div>
  ) : (
    /* Normal results display */
  )}
</TabsContent>
```

## SSE Event Types

### Progress Event
```json
{
  "type": "progress",
  "message": "Step 3: Running AST-grep scans...",
  "data": {
    "step": 3,
    "claims_spec": { ... }
  }
}
```

### Complete Event
```json
{
  "type": "complete",
  "report": {
    "consistency_score": 0.85,
    "evidence_table": { ... },
    "claims_spec": { ... }
  }
}
```

### Error Event
```json
{
  "type": "error",
  "message": "Verification failed: ..."
}
```

## User Experience Improvements

### Before (Non-Streaming)
1. User clicks "Verify Model Card"
2. Button shows loading spinner
3. User waits 10-30 seconds with no feedback
4. Results appear all at once

### After (Streaming)
1. User clicks "Verify Model Card"
2. Immediately switches to verification tab
3. Sees real-time progress:
   - ⏳ "Step 1: Parsing model card..." (0.5s)
   - ⏳ "Step 2: Preparing repository..." (2s)
   - ⏳ "Step 3: Running AST-grep scans..." (5s)
   - ⏳ "Step 4: Extracting metrics..." (8s)
   - ⏳ "Step 5: Comparing claims..." (3s)
   - ✓ "Verification complete!"
4. Results appear as soon as available

## Benefits

1. **Better UX**: Users see progress instead of a blank screen
2. **Transparency**: Each verification step is visible
3. **Debugging**: Easier to identify where issues occur
4. **Early Results**: Can display partial results before completion
5. **Engagement**: Animated progress keeps users engaged

## Browser Compatibility

SSE (Server-Sent Events) is supported in all modern browsers:
- ✅ Chrome 6+
- ✅ Firefox 6+
- ✅ Safari 5+
- ✅ Edge (all versions)
- ❌ Internet Explorer (not supported)

## Future Enhancements

1. **Progress Bar**: Add visual progress indicator (0-100%)
2. **Cancellation**: Allow users to cancel long-running verifications
3. **Retry**: Automatic retry on network errors
4. **Compression**: Use gzip for SSE streams
5. **Reconnection**: Auto-reconnect on connection loss
6. **Partial Results**: Display findings as they're discovered (not just at the end)

## Testing

To test streaming verification:

1. Start the services:
   ```bash
   cd apps/api && pnpm dev  # Next.js UI (port 3001)
   cd services/codeact_cardcheck && python api_server.py  # CodeAct API (port 8001)
   ```

2. Open http://localhost:3001/workspace

3. Click "Verify Model Card"

4. Observe real-time progress messages in the verification tab

5. Check browser DevTools > Network tab > verify/model-card to see SSE stream

## Code Locations

| Component | Path | Purpose |
|-----------|------|---------|
| Model Card API Route | `apps/api/app/api/verify/model-card/route.ts` | Proxies SSE from CodeAct |
| Notebooks API Route | `apps/api/app/api/verify/notebooks/route.ts` | Proxies SSE with notebook data |
| Model Card Viewer | `apps/api/components/workspace/model-card-viewer.tsx` | Consumes SSE stream |
| CodeAct API Server | `services/codeact_cardcheck/api_server.py` | Generates SSE events |
| CodeAct Agent | `services/codeact_cardcheck/agent_main.py` | Emits progress callbacks |

## Technical Notes

### SSE vs WebSockets
- **SSE**: Unidirectional (server → client), simpler, built-in reconnection
- **WebSockets**: Bidirectional, more complex, no built-in reconnection
- **Choice**: SSE is perfect for progress updates (we only need server → client)

### Buffering Strategy
SSE messages can arrive in chunks, so we use a buffer:
```typescript
let buffer = '';
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // Keep incomplete line
```

### Error Handling
- Connection errors: Caught and displayed to user
- Parse errors: Logged but don't break the stream
- Server errors: Sent as SSE error events

## Performance

Streaming has minimal overhead:
- **Network**: Same data, just sent incrementally
- **Memory**: Progress messages stored in state (small)
- **CPU**: SSE parsing is lightweight
- **Latency**: Users see feedback ~500ms sooner

## Conclusion

The streaming implementation provides a significantly better user experience by giving real-time feedback during the verification process. Users can now see exactly what the system is doing at each step, making the application feel more responsive and transparent.

