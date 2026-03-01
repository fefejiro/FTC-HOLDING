# Call Feature Debug Summary - Session Nov 18, 2025

## What I Found

**CRITICAL**: Duplicate WebRTC offer bug **still present** after 7 fix iterations.

**Evidence** (Session 198165):
```
[Signal][offer] d5f19cf1... -> 08d3bc23... (session 198165), delivered=1
[Signal][offer] d5f19cf1... -> 08d3bc23... (session 198165), delivered=1  ← DUPLICATE
```

This causes:
- `InvalidStateError: Called in wrong state: stable`
- Failed call connections
- Cross-device calling broken

## What I Did

### Added Comprehensive Debug Logging (Iteration #8) ✅

**Architect-approved instrumentation** to identify root cause on next call:

1. **Unique Offer IDs**
   ```
   [DEBUG-OFFER] ✅ Sent INITIAL offer #1 to {peer} (sessionId={code})
   [DEBUG-OFFER] ✅ Sent RENEGOTIATION offer #2 to {peer} (sessionId={code})
   ```

2. **createPeerConnection Tracking**
   ```
   [DEBUG-CREATE] 🔨 createPeerConnection CALLED for {peer}
     - shouldCreateOffer: boolean
     - alreadyExists: boolean
     - alreadyCreating: boolean  
     - from: {call stack trace}
   ```

3. **Handler State Tracking**
   ```
   [DEBUG-OFFER] 🛑 Disabling onnegotiationneeded for {peer}
     - wasEnabled: true
     - makingOffer: false
     - reason: 'prevent sync/async duplicate'
   
   [DEBUG-OFFER] ✅ Re-enabling onnegotiationneeded after offer #1
     - handlerExists: true
     - makingOffer: false
   ```

4. **Handler Firing**
   ```
   [DEBUG-OFFER] 🔔 onnegotiationneeded FIRED for {peer}
     - makingOffer: boolean
     - callRole: string
     - signalingState: string
   ```

### What These Logs Will Reveal

When next call happens, we'll see:
- ✅ **How many** createPeerConnection calls (should be 1)
- ✅ **Which offers** are sent (#1 only, or #1 + #2)
- ✅ **If/when** onnegotiationneeded fires unexpectedly  
- ✅ **Handler timing** - is it disabled when it should be?
- ✅ **Exact source** - initial path vs renegotiation path

## Root Cause Hypotheses

The duplicate could be from:

1. **Race Condition**: createPeerConnection called twice
   - Logs will show TWO `[DEBUG-CREATE]` calls
   - Call stacks will show different origins

2. **Handler Timing**: onnegotiationneeded fires despite being disabled
   - Logs will show `[DEBUG-OFFER] 🔔 onnegotiationneeded FIRED`
   - Will show it fired when handler should be null

3. **Dual Code Paths**: Both initial AND renegotiation execute
   - Logs will show offer #1 (INITIAL) AND offer #2 (RENEGOTIATION)
   - Will show which path (#1 or #2) corresponds to each server log

## Next Steps

### IMMEDIATE (When Next Call Happens):
1. **Capture logs** - Browser console will have [DEBUG-OFFER] and [DEBUG-CREATE] logs
2. **Correlate** - Match offer #1, #2 to server's duplicate [Signal][offer] messages
3. **Identify** - Which hypothesis is correct based on logs
4. **Fix** - Implement targeted fix for identified root cause
5. **Test** - Verify only ONE offer sent
6. **Verify audio** - Confirm bidirectional audio works

### Why I Can't Test Myself:
- Cross-device WebRTC calls require real devices (iPhone, laptop, Samsung)
- Cannot simulate WebRTC peer connections in single environment
- Need real WebSocket signaling between separate browsers/devices
- User has been doing manual testing with real devices

## Files Changed

- `client/src/components/VideoCallDialog.tsx` - Added all debug logging
- `DEBUGGING_STATUS.md` - Created comprehensive status doc
- `CALL_DEBUG_SUMMARY.md` - This file
- `DUPLICATE_OFFER_AUDIT.md` - Updated with Iteration #8

## Current System State

✅ **Server**: Running and ready (port 5000)
✅ **Logging**: Comprehensive debug instrumentation active
✅ **Users**: Ayra (d5f19cf1) and Dodo2 (08d3bc23) connected
⏳ **Waiting**: For next call attempt to capture debug logs

## Confidence Level

**HIGH** - Architect confirmed: "instrumentation comprehensively covers suspected pathways and should surface root cause on next call attempt"

Once we capture the next call's logs, we'll know EXACTLY where the duplicate is coming from and can fix it definitively.
