# Android QA Testing Checklist - PeacePad

> Status: reference only.
>
> The canonical execution surface is `RELEASE_EXECUTION_CHECKLIST.md`.
> Use this file for expanded manual QA depth after the canonical checklist identifies Android QA as in scope.

## 📱 Device Testing Matrix

Test on minimum 3 devices with different specs:

### Minimum Requirements
- [ ] Android 8.0+ (API 26+)
- [ ] 2GB RAM minimum
- [ ] Chrome browser 80+

### Recommended Test Devices
- [ ] Budget phone (Android 10, 2GB RAM)
- [ ] Mid-range phone (Android 12, 4GB RAM)  
- [ ] Flagship phone (Android 14, 8GB+ RAM)
- [ ] Tablet (10" screen, Android 11+)

---

## 🔧 Installation & Setup

### PWA Installation
- [ ] App installs correctly from browser
- [ ] "Add to Home Screen" prompt appears
- [ ] Icon appears on home screen with correct branding
- [ ] Icon uses vibrant purple theme (#A78BFE)
- [ ] App name displays correctly ("PeacePad")

### TWA/APK Installation (After Packaging)
- [ ] APK installs without errors
- [ ] Digital Asset Links verified (no browser UI visible)
- [ ] App opens in full-screen standalone mode
- [ ] Splash screen displays correctly
- [ ] No browser chrome/URL bar visible

---

## 🎨 UI/UX Testing

### Visual Design
- [ ] Vibrant purple theme (#A78BFE) displays correctly
- [ ] All colors match AppClose-inspired brand
- [ ] Text is readable on all backgrounds (WCAG AA)
- [ ] Dark mode toggles correctly
- [ ] Icons and images load properly
- [ ] No layout shifts or visual glitches

### Responsive Design
- [ ] Mobile portrait layout works (default)
- [ ] Mobile landscape layout works
- [ ] Tablet layout works
- [ ] Bottom navigation visible on mobile
- [ ] Sidebar navigation works on tablet/desktop

### Onboarding Carousel
- [ ] All 4 slides display correctly
- [ ] Vibrant backgrounds (purple, blue, green, coral) render
- [ ] "Get Started" button visible without scrolling
- [ ] Swipe gestures work smoothly
- [ ] Skip button functions properly
- [ ] Carousel auto-advances (if implemented)

---

## 🔐 Authentication & Onboarding

### Guest Mode
- [ ] Guest signup works (14-day session)
- [ ] Terms & Conditions acceptance required
- [ ] Guest users can explore features
- [ ] Guest-to-registered conversion works

### OAuth Login
- [ ] Google Sign-In works
- [ ] Apple Sign-In works (if available on Android)
- [ ] GitHub Sign-In works
- [ ] Email/password login works
- [ ] Session persists after app restart
- [ ] Logout works correctly

### Profile Setup
- [ ] Display name can be set/edited
- [ ] Profile photo upload works
- [ ] Camera access for photo (if implemented)
- [ ] Profile updates save correctly

---

## 💬 Messaging Features

### Basic Messaging
- [ ] Send text messages
- [ ] Receive messages in real-time
- [ ] Message history loads correctly
- [ ] Timestamps display correctly
- [ ] Message bubbles styled correctly
- [ ] Long messages wrap properly
- [ ] Emoji/special characters display

### AI Tone Analysis
- [ ] Tone analysis triggers on send
- [ ] Warning displays for frustrated/hostile messages
- [ ] AI suggestions appear
- [ ] "Send Anyway" option works
- [ ] Rewording suggestions are helpful
- [ ] Personalized based on user preferences

### Voice Messages
- [ ] Record voice message (press & hold)
- [ ] Slide up to lock recording
- [ ] Slide left to cancel
- [ ] Audio playback works
- [ ] Waveform visualization displays
- [ ] Voice messages send successfully

### Attachments
- [ ] Plus (+) button opens attachment tray
- [ ] File upload works
- [ ] Document sharing works
- [ ] File previews display correctly

---

## 🐚 Conch Mode Testing

### Session Creation
- [ ] Create Conch Mode session
- [ ] Invite partner to session
- [ ] Session shows "pending" state
- [ ] Partner receives notification

### Active Session
- [ ] Audio/video calls connect
- [ ] 30-second turn timer works
- [ ] Double-tap to pass turn
- [ ] Long-press for extra time request
- [ ] Partner approval for extra time
- [ ] Strike system enforces (3 strikes max)
- [ ] AI mood tracking displays
- [ ] Mood indicators update in real-time
- [ ] Session ends gracefully

### WebRTC Quality
- [ ] Audio quality is clear
- [ ] Video quality is acceptable
- [ ] No significant lag or delay
- [ ] Reconnection works after network drop
- [ ] Microphone permissions work
- [ ] Camera permissions work (if video enabled)

---

## 📅 Calendar Features

### Event Management
- [ ] Create calendar events
- [ ] Edit existing events
- [ ] Delete events
- [ ] View monthly/weekly/daily views
- [ ] Events sync with co-parent
- [ ] AI conflict detection works
- [ ] Recurring events work
- [ ] Event notifications trigger

### Custody Schedule
- [ ] Mark custody days
- [ ] Exchange times display correctly
- [ ] Color-coded custody indicators
- [ ] Export calendar (if implemented)

---

## 💰 Expense Tracking

### Expense Management
- [ ] Create expense entry
- [ ] Upload receipt photo
- [ ] Camera access for receipts
- [ ] Automatic expense splitting
- [ ] Edit/delete expenses
- [ ] Payment status tracking
- [ ] Expense categories work
- [ ] Total calculations accurate

### Settlements
- [ ] Settlement requests work
- [ ] Partner receives notification
- [ ] Approve/reject settlements
- [ ] Settled expenses marked correctly
- [ ] Payment history viewable

---

## ✅ Tasks & To-Dos

- [ ] Create tasks
- [ ] Assign tasks to partner
- [ ] Mark tasks complete
- [ ] Edit/delete tasks
- [ ] Task notifications work
- [ ] Completed tasks archived

---

## 🔔 Push Notifications

### Notification Setup
- [ ] Permission prompt appears
- [ ] Accept notifications works
- [ ] Decline notifications works
- [ ] Toggle in settings works
- [ ] VAPID keys configured correctly

### Notification Triggers
- [ ] New message notification
- [ ] Urgent message notification
- [ ] Schedule change notification
- [ ] Expense request notification
- [ ] Task assignment notification
- [ ] Conch Mode invitation notification

### Notification Behavior
- [ ] Notifications appear when app closed
- [ ] Notifications appear when app backgrounded
- [ ] Clicking notification opens correct page
- [ ] Notification badge updates
- [ ] Clear notifications works

---

## 📴 Offline Functionality

### Service Worker
- [ ] Service worker registers
- [ ] Offline page displays when no connection
- [ ] Cached pages load offline
- [ ] Messages queue when offline
- [ ] Messages send when reconnected
- [ ] "No connection" indicator shows

### Offline Testing
- [ ] Enable airplane mode
- [ ] Try to access app
- [ ] Send message while offline
- [ ] Disable airplane mode
- [ ] Verify message sends
- [ ] Check for data sync

---

## ⚡ Performance Testing

### Load Times
- [ ] Initial app load < 3 seconds
- [ ] Page transitions smooth
- [ ] No janky scrolling
- [ ] Images load efficiently
- [ ] Large message history loads well

### Memory Usage
- [ ] App uses reasonable RAM
- [ ] No memory leaks during long sessions
- [ ] Background usage is minimal
- [ ] CPU usage acceptable

### Battery Impact
- [ ] Reasonable battery drain
- [ ] WebSocket doesn't kill battery
- [ ] Push notifications efficient

---

## 🔒 Security & Privacy

### Data Protection
- [ ] HTTPS/TLS encryption active
- [ ] Sensitive data not logged
- [ ] Session tokens secure
- [ ] OAuth tokens handled safely
- [ ] No data leaks in console

### Privacy Features
- [ ] Privacy policy accessible
- [ ] Terms & conditions accessible
- [ ] Data deletion works
- [ ] Account deletion works (with confirmation)
- [ ] Data export works (GDPR)
- [ ] Analytics opt-out available

---

## 🌐 Network Conditions

Test under various network conditions:

### Connection Types
- [ ] WiFi (fast)
- [ ] 4G/LTE
- [ ] 3G (slow)
- [ ] Edge/2G (very slow)
- [ ] Flaky connection (intermittent)

### Resilience
- [ ] App handles network switch (WiFi ↔ mobile)
- [ ] Reconnection logic works
- [ ] No crashes during network issues
- [ ] User informed of connection status

---

## 🐛 Error Handling

### User-Facing Errors
- [ ] Helpful error messages display
- [ ] Errors don't crash app
- [ ] Retry options available
- [ ] Contact support option shown

### Edge Cases
- [ ] Empty states display correctly
- [ ] Loading states show
- [ ] Large text/long names handled
- [ ] Special characters in input
- [ ] Invalid form submissions blocked
- [ ] API timeouts handled gracefully

---

## ♿ Accessibility

### Screen Readers
- [ ] TalkBack works (Android)
- [ ] All interactive elements labeled
- [ ] Form fields have labels
- [ ] Images have alt text

### Visual Accessibility
- [ ] Text scales with system settings
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Touch targets ≥48x48dp

---

## 📊 Analytics & Monitoring

- [ ] Google Analytics tracking works
- [ ] Page views logged
- [ ] Events tracked correctly
- [ ] User properties set
- [ ] No PII in analytics

---

## 🔄 App Updates

### Version Updates
- [ ] Version check works
- [ ] Update prompt appears
- [ ] Force-refresh updates app
- [ ] No data loss after update

---

## ✅ Final Checklist

Before submission to Play Store:

- [ ] All critical bugs fixed
- [ ] All core features working
- [ ] Privacy policy reviewed
- [ ] Terms updated
- [ ] Screenshots captured
- [ ] Feature graphic created
- [ ] Content rating completed
- [ ] Test on 3+ devices
- [ ] Lighthouse PWA score > 90
- [ ] No console errors
- [ ] Analytics verified
- [ ] Push notifications tested
- [ ] Offline mode works
- [ ] Performance acceptable

---

## 🚨 Critical Issues (Block Launch)

Mark any of these as blocking issues:

- [ ] App crashes on launch
- [ ] Authentication doesn't work
- [ ] Messages don't send/receive
- [ ] Data loss occurs
- [ ] Security vulnerabilities
- [ ] Privacy policy missing/incorrect
- [ ] Notifications don't work
- [ ] Payment/billing issues (if applicable)

---

## 📝 Testing Notes

**Testing Period:** _____________________

**Devices Tested:**
1. _____________________
2. _____________________
3. _____________________

**Critical Issues Found:**
- 
- 
- 

**Nice-to-Have Improvements:**
- 
- 
-
