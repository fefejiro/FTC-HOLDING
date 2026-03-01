# Call Entry Points Analysis

## Overview
This document analyzes all call initiation points in PeacePad to ensure consistency and identify the best path forward.

---

## 1. ChatInterface - Phone/Video Icons in Header

**Location:** `client/src/components/ChatInterface.tsx`

**Trigger:** User clicks Phone or Video icon in chat header

**Flow:**
1. Extract `partnerId` from conversation members
2. Call `POST /api/calls` with:
   ```js
   { receiverId: partnerId, callType: 'audio'|'video' }
   ```
3. On success, set state:
   ```js
   setOutgoingCall({ 
     callId: data.id,
     callType: 'audio'|'video',
     receiverId: partnerId 
   })
   ```
4. Render VideoCallDialog:
   ```jsx
   <VideoCallDialog
     isOpen={true}
     onClose={() => setOutgoingCall(null)}
     callType={outgoingCall.callType}
     recipientId={outgoingCall.receiverId}
     callId={outgoingCall.callId}
     isIncoming={false}
   />
   ```

**Props passed to VideoCallDialog:**
- ✅ `isOpen={true}`
- ✅ `onClose`
- ✅ `callType`
- ✅ `recipientId` (person being called)
- ✅ `callId` (database ID)
- ✅ `isIncoming={false}`

---

## 2. QuickCallButton - Multiple Locations

**Location:** `client/src/components/QuickCallButton.tsx`

**Used in:**
- App.tsx header (icon variant)
- Calls page (default variant)

**Trigger:** User selects partner, fills reason/emergency, clicks "Start Call"

**Flow:**
1. Show dialog to select partner and call options
2. Call `POST /api/calls` with:
   ```js
   { 
     receiverId: selectedPartner,
     callType: 'audio'|'video',
     reason: reason || undefined,
     isEmergency: boolean,
     partnershipId: partnership.id
   }
   ```
3. On success, set state:
   ```js
   setOutgoingCall({ 
     callId: data.id,
     receiverId: selectedPartner,
     callType 
   })
   ```
4. Render VideoCallDialog:
   ```jsx
   <VideoCallDialog
     isOpen={true}
     onClose={() => setOutgoingCall(null)}
     callType={outgoingCall.callType}
     recipientId={outgoingCall.receiverId}
     callId={outgoingCall.callId}
     isIncoming={false}
   />
   ```

**Props passed to VideoCallDialog:**
- ✅ `isOpen={true}`
- ✅ `onClose`
- ✅ `callType`
- ✅ `recipientId` (person being called)
- ✅ `callId` (database ID)
- ✅ `isIncoming={false}`

---

## 3. IncomingCallModal → App.tsx - Accept Incoming Call

**Location:** 
- `client/src/components/IncomingCallModal.tsx`
- `client/src/App.tsx` (AuthWrapper)

**Trigger:** User receives incoming call and clicks "Accept"

**Flow:**
1. IncomingCallModal calls `PATCH /api/calls/{callId}/accept`
2. On success, call `onAccept(callId, call)` with full call data
3. App.tsx `handleAcceptCall` receives data and sets state:
   ```js
   setAcceptedCall({
     callId,
     callType: callData.callType,
     callerId: callData.callerId  // ⚠️ Different from outgoing!
   })
   ```
4. App.tsx renders global VideoCallDialog:
   ```jsx
   <VideoCallDialog
     isOpen={true}
     onClose={() => setAcceptedCall(null)}
     callerId={acceptedCall.callerId}
     callType={acceptedCall.callType}
     callId={acceptedCall.callId}
     isIncoming={true}
   />
   ```

**Props passed to VideoCallDialog:**
- ✅ `isOpen={true}`
- ✅ `onClose`
- ✅ `callType`
- ✅ `callerId` (person who called) ⚠️ **Not recipientId**
- ✅ `callId` (database ID)
- ✅ `isIncoming={true}`

---

## Key Findings

### ✅ CONSISTENT PATTERNS:
1. **ChatInterface** and **QuickCallButton** use IDENTICAL logic for outgoing calls
2. Both create call via `POST /api/calls`
3. Both store `outgoingCall` state
4. Both render VideoCallDialog with same props

### ⚠️ CRITICAL DIFFERENCE:
**Outgoing calls use:**
- `recipientId={receiverId}` - The person being called
- `isIncoming={false}`

**Incoming calls use:**
- `callerId={callerId}` - The person who called
- `isIncoming={true}`

This is **CORRECT** because VideoCallDialog expects different props based on call direction!

---

## VideoCallDialog Expected Props

Based on the interface in `VideoCallDialog.tsx`:

```typescript
interface VideoCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string;      // For OUTGOING calls
  callType: "audio" | "video";
  isIncoming?: boolean;
  callerId?: string;         // For INCOMING calls
  callId?: string;
  sessionCodeProp?: string;
  initialCameraEnabled?: boolean;
  initialMicEnabled?: boolean;
}
```

**For Outgoing Calls:**
- Pass `recipientId` (who you're calling)
- Pass `isIncoming=false`

**For Incoming Calls:**
- Pass `callerId` (who called you)
- Pass `isIncoming=true`

---

## Recommendation

### ✅ CURRENT IMPLEMENTATION IS CORRECT

All three call entry points follow the correct pattern:

1. **ChatInterface**: ✅ Outgoing pattern (recipientId, isIncoming=false)
2. **QuickCallButton**: ✅ Outgoing pattern (recipientId, isIncoming=false)
3. **IncomingCallModal**: ✅ Incoming pattern (callerId, isIncoming=true)

### No Changes Needed

The logic is consistent and correct across all entry points!

---

## Testing Checklist

- [ ] Test audio call from ChatInterface
- [ ] Test video call from ChatInterface
- [ ] Test audio call from QuickCallButton (header)
- [ ] Test audio call from QuickCallButton (calls page)
- [ ] Test accepting incoming audio call
- [ ] Test accepting incoming video call
- [ ] Verify WebRTC connection in all scenarios
- [ ] Verify call controls work in all scenarios
