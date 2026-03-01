# 📞 PeacePad Call Diagnostic Guide

## What Happened to Your Calls?

Your recent calls on **Nov 5, 04:38-04:39 AM** both show:
- **Status**: MISSED
- **Started At**: NULL (never connected)
- **Ended**: Auto-timeout after ~1.5 minutes

This means the calls were initiated but the WebRTC connection never established.

---

## 🔍 Step-by-Step Testing Guide

### **Test 1: Check WebSocket Connection**

**On Device 1 (Caller):**
1. Open browser console (F12 → Console tab)
2. Make sure you see: `[WS] Connected to signaling server`
3. If you don't see this, refresh the page and check again

**On Device 2 (Receiver):**
1. Same steps - check for connection message

**✅ Expected**: Both devices show WebSocket connected
**❌ If not**: One or both devices aren't connected to the signaling server

---

### **Test 2: Make a Test Call**

**On Device 1 (Caller):**
1. Open browser console (F12)
2. Click the call button
3. Look for these console messages:
   ```
   [VideoCallDialog] Initiating outgoing call
   [VideoCallDialog] Local media initialized successfully
   [WebRTCContext] Sending WebRTC signal: offer
   ```

**On Device 2 (Receiver):**
1. Keep browser console open
2. When call comes in, look for:
   ```
   [VideoCallDialog] Received incoming-call message
   [VideoCallDialog] This is an incoming call, initializing media
   ```
3. **IMPORTANT**: Click "Answer" within 30 seconds
4. After clicking Answer, look for:
   ```
   [VideoCallDialog] Call accepted, creating peer connection
   [VideoCallDialog] Media ready, receiver creating peer connection
   ```

---

### **Test 3: Check Media Permissions**

**Both Devices:**
1. When call starts, browser should ask for mic/camera permission
2. **Click "Allow"** - this is critical!
3. Look for console message: `[VideoCallDialog] Local media initialized successfully`
4. If you see `Permission denied`, the call won't connect

**✅ Expected**: Green checkmark near address bar showing mic/camera allowed
**❌ If not**: Click the lock icon → Site settings → Reset permissions

---

### **Test 4: Check WebRTC Connection**

**After clicking "Answer" on receiver side:**

Look for these messages in console:
```
[VideoCallDialog] Received track from [userId]
[VideoCallDialog] Remote stream has 2 tracks
[VideoCallDialog] AUDIO: Remote video element updated
```

**✅ Expected**: You see/hear each other
**❌ If not**: Check firewall or network blocking WebRTC

---

## 🐛 Common Issues & Fixes

### **Issue 1: "Call timed out"**
- **Cause**: Receiver didn't click "Answer" within 30 seconds
- **Fix**: Make sure to click Answer button quickly

### **Issue 2: "No notification received"**
- **Cause**: WebSocket not connected
- **Fix**: Refresh both pages, verify WebSocket connection in console

### **Issue 3: "Permission denied" errors**
- **Cause**: Browser blocking mic/camera
- **Fix**: 
  1. Click lock icon in address bar
  2. Go to Site settings
  3. Allow Camera and Microphone
  4. Refresh page

### **Issue 4: "Can see each other but no audio"**
- **Cause**: Remote video element muted
- **Fix**: Check console for `AUDIO ERROR` messages
- **Workaround**: Click unmute button in call interface

### **Issue 5: "Ringtone plays but call doesn't connect"**
- **Cause**: Media initialization failed
- **Fix**: Check console for errors, grant permissions, try again

---

## 📊 What to Check in Console

### **Caller Side Should Show:**
```
✅ [WS] Connected to signaling server
✅ [VideoCallDialog] Initiating outgoing call
✅ [VideoCallDialog] Local media initialized successfully
✅ [WebRTCContext] Sending WebRTC signal: offer
✅ Sent offer to [receiverId]
```

### **Receiver Side Should Show:**
```
✅ [WS] Connected to signaling server
✅ [VideoCallDialog] Received incoming-call message
✅ [VideoCallDialog] This is an incoming call, initializing media
✅ [VideoCallDialog] Call accepted, creating peer connection
✅ [VideoCallDialog] Received track from [callerId]
✅ [VideoCallDialog] AUDIO: Remote video element updated
```

---

## 🧪 Quick Test Procedure

1. **Open two browser windows/devices**
2. **Log in as different users**
3. **Open browser console on BOTH (F12)**
4. **Caller: Click call button**
5. **Receiver: Click "Answer" within 10 seconds**
6. **Check console for errors**
7. **Verify you can see/hear each other**

If it still doesn't work, **copy the console logs** from both devices and send them to me!

---

## 📱 Device-Specific Notes

### **iPhone/iOS:**
- Safari might block WebRTC in private mode
- Make sure Low Power Mode is OFF
- PWA needs to be added to home screen for best results

### **Android/Samsung:**
- Chrome works best
- Check battery saver isn't blocking background connections
- Clear browser cache if issues persist

### **Desktop:**
- Chrome/Firefox work best
- Edge also supported
- Safari on Mac may have issues with WebRTC

---

## 🆘 Still Having Issues?

**Send me these logs:**

1. Open browser console (F12)
2. Clear console
3. Make a test call
4. Copy ALL console logs from both devices
5. Send me:
   - Full console logs (caller side)
   - Full console logs (receiver side)
   - What you clicked and when
   - Any error messages you saw

This will help me diagnose the exact issue!
