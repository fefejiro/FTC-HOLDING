# WebRTC Audio Issue - Advanced Agent Handoff

## 🎯 PROBLEM STATEMENT
**Critical Issue**: Users cannot hear each other during audio/video calls, despite WebRTC signaling working correctly.

**Duration**: Over 1 week
**Impact**: Complete blocker for production deployment
**Severity**: P0 - Critical

## 📊 CURRENT STATUS

### What's Working ✅
1. **WebRTC Signaling** (100% functional):
   - Offer/Answer exchange successful
   - ICE candidates exchanged (16 candidates per session)
   - Session joining/leaving working
   - Backend call database tracking working
   - Server logs show: `[SignalStats] 790988: O=1 A=1 C=16`

2. **User Interface**:
   - Call initiation UI works
   - Incoming call notifications working
   - Call accept/decline working
   - Session code sharing UI working (for group calls)

### What's NOT Working ❌
1. **Audio Transmission**: Users cannot hear each other despite successful WebRTC connection
2. **Partnership Persistence**: Partnerships disconnect after page refresh (especially guest accounts)
3. **Guest Account Sync**: Partnership syncing issues between guest accounts

## 🔍 TECHNICAL INVESTIGATION

### Last Known Working State
**Commit**: `037b6b47a85ae65ee482c36694be7d169b19c483`
**Date**: ~1 hour before current issues began
**What worked**: Users could hear each other on both Samsung (Android) and iPhone (iOS) devices

### Changes Since Working Commit
**File**: `client/src/components/VideoCallDialog.tsx` (255 lines changed, +136/-119)

**Key Changes**:
1. **Session Code Visibility Logic** (Line ~2361):
   ```tsx
   // ORIGINAL (WORKING):
   {sessionCode && (sessionCodeProp || !recipientId) && callStatus !== "connected" && (
   
   // ATTEMPTED FIX (BROKE AUDIO):
   {sessionCode && !callId && callStatus !== "connected" && (
   
   // REVERTED TO:
   {sessionCode && (sessionCodeProp || !recipientId) && callStatus !== "connected" && (
   ```
   **Root Cause Found by Architect**: Changing to `!callId` caused the session-code wrapper to unmount during WebRTC negotiation for direct 1:1 calls. This wrapper hosts components that trigger critical side-effects like `joinSession()`. When unmounted, the caller never joined the signaling session properly.

2. **Mute Button Enhancement** (Lines 1485-1501):
   - Enhanced to work without local stream
   - Should NOT affect audio transmission
   
3. **Speaker Toggle Addition** (Lines 1519-1525):
   - Added speaker on/off button for audio calls
   - Should NOT affect audio transmission

### Current Observed Behavior

**Server Logs Analysis** (Latest Call - Session 790988):
```
1. User 816f9b2e (Caller/Aaa) initiates call to d5f19cf1 (Receiver/Ayra)
2. CallSession created: 790988
3. Both users join session successfully
4. Signaling exchange:
   ✅ [Signal][offer] 816f9b2e → d5f19cf1 (delivered=1)
   ✅ [Signal][answer] d5f19cf1 → 816f9b2e (delivered=1)
   ✅ [Signal][ice-candidate] 816f9b2e → d5f19cf1 (16 candidates delivered)
5. SignalStats: O=1 A=1 C=16 (Perfect WebRTC negotiation)
6. Call ends after ~25 seconds (no audio heard by either party)
```

**Browser Console Logs**: 
- Multiple version check auto-refreshes
- WebSocket connections stable
- No JavaScript errors
- Missing: Detailed WebRTC peer connection state logs

## 🧬 CRITICAL FILES

### Primary Suspect Files
1. **client/src/components/VideoCallDialog.tsx** (2766 lines)
   - Lines 1071-1350: `createPeerConnection()` - Peer connection setup
   - Lines 1380-1410: `handleOffer()` - WebRTC offer handling
   - Lines 1420-1450: `handleAnswer()` - WebRTC answer handling
   - Lines 1120-1170: Track handling (`pc.ontrack`, `addTrack`)

2. **client/src/contexts/WebRTCContext.tsx**
   - Lines 103-150: Media permission handling
   - Lines 263-320: WebRTC signal processing

3. **server/webrtc-signaling.ts**
   - Lines 1-500: WebSocket signaling server

### Supporting Files
- **server/routes.ts**: Call database CRUD operations
- **client/src/contexts/CallContext.tsx**: Call state management
- **client/src/call/callFsm.ts**: Call finite state machine
- **client/src/hooks/useReconnectingWebSocket.ts**: WebSocket connection handling

## 🔬 HYPOTHESIS

### Most Likely Root Causes (Ranked by Probability)

1. **Media Track Not Being Added to Peer Connection** (80% probability)
   - Symptom: Signaling works, but no audio flows
   - Location: `VideoCallDialog.tsx` lines 1120-1350
   - Evidence: Server logs show successful signaling, but no media
   - **Action**: Check if `pc.addTrack()` is being called with valid audio track
   - **Action**: Verify `localStreamRef.current` has audio tracks before calling `addTrack()`

2. **Media Permission Timing Issue** (15% probability)
   - Symptom: Permission granted but track disabled/muted
   - Location: `WebRTCContext.tsx` lines 103-150
   - Evidence: User can accept calls but no audio transmission
   - **Action**: Check if audio track `enabled` property is true after permission grant
   - **Action**: Verify track is not muted in `pc.ontrack` handler

3. **Remote Stream Not Attached to Audio Element** (5% probability)
   - Symptom: Remote track received but not played
   - Location: `VideoCallDialog.tsx` lines 1120-1170 (`pc.ontrack`)
   - Evidence: Less likely since this code hasn't changed
   - **Action**: Verify `remoteVideoRef.current.srcObject` is set correctly

## 🧪 DEBUGGING PROTOCOL

### Required Client-Side Logs to Collect

Add these console.log statements to VideoCallDialog.tsx:

```typescript
// In createPeerConnection (line ~1290):
console.log('[DEBUG] Adding local track to peer connection:', {
  track: localStream.getAudioTracks()[0],
  enabled: localStream.getAudioTracks()[0].enabled,
  readyState: localStream.getAudioTracks()[0].readyState
});

// In pc.ontrack handler (line ~1120):
console.log('[DEBUG] Received remote track:', {
  kind: event.track.kind,
  enabled: event.track.enabled,
  readyState: event.track.readyState,
  streamId: event.streams[0]?.id
});

// After setting remoteVideoRef (line ~1140):
console.log('[DEBUG] Remote stream attached to element:', {
  elementExists: !!remoteVideoRef.current,
  srcObjectSet: !!remoteVideoRef.current?.srcObject,
  trackCount: event.streams[0]?.getTracks().length
});
```

### Test Protocol

**Device Setup**:
- Device A: Samsung (Android) - Guest Account
- Device B: iPhone (iOS) - Guest Account  
- Device C: Laptop (Desktop) - Logged-in Account

**Test Cases**:
1. **Direct 1:1 Call** (Laptop → Samsung):
   - Expected: Session code hidden, direct call
   - Current: Signaling works, no audio
   
2. **Direct 1:1 Call** (iPhone → Samsung):
   - Expected: Session code hidden, direct call
   - Current: Signaling works, no audio

3. **Group Call** (3+ users with session code):
   - Expected: Session code visible, multi-party
   - Status: Unknown

## 🎯 RECOMMENDED NEXT STEPS

### Immediate Actions (Do First)
1. **Add comprehensive media track logging** as shown in Debugging Protocol
2. **Test with both devices granting microphone permission explicitly**
3. **Capture browser console logs from BOTH devices** during a call
4. **Check WebRTC peer connection stats** using `chrome://webrtc-internals` (Chrome) or `about:webrtc` (Firefox)

### Investigation Path
1. Verify `localStreamRef.current.getAudioTracks()[0]` exists and is enabled before `pc.addTrack()`
2. Check if `pc.ontrack` fires on both sides
3. Verify remote track is enabled when received
4. Check if remote stream is correctly attached to `<audio>` or `<video>` element
5. Inspect ICE connection state: check if it reaches "connected" or "completed"

### Code Review Focus Areas
1. **Line 1293 in VideoCallDialog.tsx**: Where `addTrack()` is called
2. **Line 1122 in VideoCallDialog.tsx**: `pc.ontrack` handler
3. **Line 1132 in VideoCallDialog.tsx**: Remote stream assignment
4. **Lines 103-150 in WebRTCContext.tsx**: Media permission flow

## 📱 PARTNERSHIP SYNC ISSUE (Secondary Issue)

**Symptom**: Guest account partnerships disconnect after page refresh
**Impact**: Users lose connection to partners, can't call them
**Location**: Likely in session/authentication logic

**Files to Check**:
- `server/storage.ts`: Partnership persistence
- `server/routes.ts`: GET /api/partnerships
- Client partnership state management

**Test**: Create partnership as guest, refresh page, check if partnership persists

## 📊 ENVIRONMENT INFO

**Tech Stack**:
- Frontend: React 18, TypeScript, Vite, Wouter, TanStack Query
- Backend: Node.js, Express, PostgreSQL (Neon), Drizzle ORM
- WebRTC: Native WebRTC APIs, WebSocket signaling
- Auth: Dual system (Replit OAuth + Guest sessions)

**TURN/STUN Servers**:
- Configured via environment variables
- 3 ICE servers total (seen in logs)
- Working correctly (ICE candidates exchanged)

## 🆘 ESCALATION PATH

If you get stuck after 2-3 attempts:
1. Check if this is a platform-specific WebRTC codec issue (Samsung vs iPhone)
2. Test with same browser type on both devices (e.g., Chrome on both)
3. Verify no WebRTC policy restrictions in browser/device settings
4. Consider creating a minimal reproducible test case outside PeacePad
5. Consult WebRTC debugging guides: https://webrtc.org/getting-started/testing

## 🔗 RELATED RESOURCES

**Working Commit**: `037b6b47a85ae65ee482c36694be7d169b19c483`
**User Contact**: peacepad@peacepad.ca
**Project**: PeacePad - Co-Parenting Communication Platform

---

**Last Updated**: November 17, 2025, 8:11 PM EST
**Prepared By**: Replit Agent (Claude 4.5 Sonnet)
**Handoff To**: Advanced Agent
