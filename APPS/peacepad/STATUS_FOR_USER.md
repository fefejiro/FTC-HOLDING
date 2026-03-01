# ACTUAL Root Cause Found & Fixed! 🎉

## The Real Problem

Your test logs revealed the **ACTUAL bug**: The "dual message listener" in the WebSocket hook was causing **EVERY message to be processed TWICE**!

### What Was Happening

```typescript
// OLD CODE (BROKEN):
ws.onmessage = handleMessage;         // Handler fires once
addEventListener('message', handleMessage); // Handler fires AGAIN! ❌
```

This meant:
- Every `peer-joined` event → fires TWICE
- First call: `createPeerConnection(peer)` starts
- Second call: `createPeerConnection(peer)` starts again **before first finishes**
- Both calls bypass the guard because they check it simultaneously
- Result: **TWO peer connections** → **TWO offers** sent!

### Proof from Your Test Logs

**Server showed duplicate offers:**
```
[Signal][offer] caller -> receiver (session 196823), delivered=1
[Signal][offer] caller -> receiver (session 196823), delivered=1  <-- DUPLICATE!
```

**Client showed duplicate message handling:**
```
[WS_HOOK] Message received: {"type":"peer-joined"...
[WS_HOOK] Message received: {"type":"peer-joined"...  <-- DUPLICATE!
```

**Debug logs showed both calls bypassed guard:**
```
[DEBUG-CREATE] createPeerConnection CALLED {alreadyCreating: false}
[DEBUG-CREATE] createPeerConnection CALLED {alreadyCreating: false}  <-- Should be TRUE!
```

## The Fix

**Removed the duplicate listener entirely:**

```typescript
// NEW CODE (FIXED):
addEventListener('message', handleMessage);  // Fires ONCE ✅
```

Why `addEventListener` alone is sufficient:
- ✅ Standards-compliant modern approach
- ✅ Works reliably in ALL browsers (including Safari/iOS)
- ✅ Each message processes exactly ONCE
- ✅ Proper cleanup with `removeEventListener`

## Previous Fixes Still Valid

The earlier `setTimeout` (macrotask deferral) fix we implemented IS still correct and necessary - it prevents a different race condition within the offer creation itself. Both fixes work together:

1. **This fix**: Ensures `createPeerConnection` is called only ONCE per peer
2. **Previous fix**: Ensures queued `onnegotiationneeded` events don't bypass the flag guard

## What Changed

**File**: `client/src/hooks/useReconnectingWebSocket.ts`
- Removed: `ws.onmessage = handleMessage` 
- Kept: `addEventListener('message', handleMessage)` (single listener)
- Updated: Log message confirms fix is active

## Testing Now

The app is restarting with the fix. When ready, test a call and you should see:

**Success indicators:**
- ✅ Only ONE `[WS_HOOK] Message received` per actual WebSocket message
- ✅ Only ONE `[Signal][offer]` in server logs per session  
- ✅ Only ONE `[DEBUG-CREATE] createPeerConnection CALLED` per peer
- ✅ No `InvalidStateError` errors
- ✅ Bidirectional audio works
- ✅ Call ends cleanly on both devices

**The log message confirming fix is active:**
```
[WS_FIX] Single message listener attached (duplicate listener bug fixed) ✅
```

---

**Ready to test when the app restarts!** This should definitively solve the duplicate offer bug. 🚀
