# Call Feature Debugging Status

## Current Issue
**Duplicate WebRTC Offers** - Two offers are being sent for the same call session, causing:
- `InvalidStateError: Called in wrong state: stable`
- Failed call connections
- User frustration

## Investigation Summary

### Confirmed Facts
1. Server logs show TWO `[Signal][offer]` messages for the same session
2. Issue persists across 7 fix iterations
3. Affects cross-device calls (iPhone ↔ Laptop, Samsung ↔ Laptop)
4. Race guard successfully prevents duplicate `createPeerConnection` calls

### Debug Logging Added (Iteration #8)
Comprehensive instrumentation to identify root cause:

#### createPeerConnection Tracking
```
[DEBUG-CREATE] 🔨 createPeerConnection CALLED for {peerId}
  - shouldCreateOffer: boolean
  - alreadyExists: boolean  
  - alreadyCreating: boolean
  - from: call stack trace
```

#### Offer Tracking with Unique IDs
```
[DEBUG-OFFER] 📤 Creating INITIAL offer #1 for {peerId}
[DEBUG-OFFER] ✅ Sent INITIAL offer #1 to {peerId} (sessionId={code})

[DEBUG-OFFER] 📤 Creating RENEGOTIATION offer #2 for {peerId}  
[DEBUG-OFFER] ✅ Sent RENEGOTIATION offer #2 to {peerId} (sessionId={code})
```

#### Handler State Tracking
```
[DEBUG-OFFER] 🛑 Disabling onnegotiationneeded for {peerId}
  - wasEnabled: boolean
  - makingOffer: boolean
  - reason: 'prevent sync/async duplicate during track add + initial offer'

[DEBUG-OFFER] ✅ Re-enabling onnegotiationneeded for {peerId} after initial offer #1 sent
  - handlerExists: boolean
  - makingOffer: boolean
```

#### onnegotiationneeded Firing
```
[DEBUG-OFFER] 🔔 onnegotiationneeded FIRED for {peerId}
  - makingOffer: boolean
  - callRole: string
  - signalingState: string
```

## Next Steps

### When Next Call Happens:
1. Browser console logs will show:
   - How many times createPeerConnection is called (should be 1)
   - Which offers are sent (#1, #2, etc.)
   - When onnegotiationneeded fires (if at all)
   - Handler enable/disable timing
   
2. Analyze logs to determine:
   - Is createPeerConnection called twice? (race condition)
   - Is onnegotiationneeded firing despite being disabled? (timing issue)
   - Are BOTH initial AND renegotiation paths executing? (logic error)

3. Fix the identified root cause

4. Test again until working

## Previous Fix Attempts

| Iteration | Approach | Result |
|-----------|----------|--------|
| #1 | Timing adjustment | ❌ Failed |
| #2 | onnegotiationneeded-only offers | ❌ Failed |
| #3 | Synchronous offer creation | ⚠️ Partial |
| #4 | makingOfferRef before tracks | ⚠️ Partial |
| #5 | Disable handler during tracks | ⚠️ Partial |
| #6 | Race guard (creatingPeersRef) | ⚠️ Partial |
| #7 | Delayed handler re-enable | ❌ Failed |
| #8 | Comprehensive debug logging | 🔍 Testing |

## File Locations
- **Main logic**: `client/src/components/VideoCallDialog.tsx`
- **Audit document**: `DUPLICATE_OFFER_AUDIT.md`
- **Debug status**: This file

## User Impact
- 14-day App Store testing window (time-sensitive)
- Cross-device calling is critical requirement
- User on break, expects debugging to continue
