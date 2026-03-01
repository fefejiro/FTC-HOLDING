# PeacePad Android E2E Test Cases

**Last Updated**: January 29, 2026  
**Test Environment**: Android (Capacitor PWA)  
**Coverage**: Authentication, Onboarding, Practice Chat, Navigation, Breathing Exercises

---

## Test Suite A: Authentication Flow

### A1: Guest Mode Entry
**Priority**: P0 (Critical)  
**Test ID**: `auth-guest-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch app fresh (clear data) | Welcome screen appears |
| 2 | Tap "Start" on welcome screen | Consent agreement appears |
| 3 | Accept consent agreement | Guest entry screen appears |
| 4 | Tap "Try as Guest" | Loading indicator shows |
| 5 | Wait for redirect | Practice Chat page loads |
| 6 | Verify session | 14-day guest session badge visible in settings |

### A2: Secure Sign-In (Rebranded)
**Priority**: P0 (Critical)  
**Test ID**: `auth-secure-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From Guest Entry screen | "Sign In Securely" button visible |
| 2 | Verify branding | NO "Replit" text visible in app UI |
| 3 | Tap "Sign In Securely" | OAuth page loads (external) |
| 4 | Complete OAuth login | Redirect back to app |
| 5 | Verify authenticated | User profile visible, no guest badge |

### A3: Returning Guest Session
**Priority**: P1 (High)  
**Test ID**: `auth-guest-002`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Launch app with existing guest session | Skip welcome, go to Practice Chat |
| 2 | Check session info | Session expiry date accurate (14 days from creation) |
| 3 | Verify data persistence | Previous chat sessions visible |

---

## Test Suite B: Onboarding Flow

### B1: First-Time User Welcome
**Priority**: P0 (Critical)  
**Test ID**: `onboard-welcome-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear app data, launch app | Welcome slide appears |
| 2 | Verify content | PeacePad branding, calm messaging |
| 3 | Tap "Start" | Transitions to consent agreement |
| 4 | Accept consent | Guest Entry screen appears |

### B2: Calm Breath Modal (First Time)
**Priority**: P1 (High)  
**Test ID**: `onboard-breath-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete guest login (first time) | Calm Breath modal appears |
| 2 | Observe animation | Circle expands on inhale, contracts on exhale |
| 3 | Wait for cycle | Single breath cycle (6 seconds total) |
| 4 | Tap "Continue" | Modal closes, Practice Chat loads |
| 5 | Re-launch app | Breath modal does NOT appear again |

### B3: Skip Breath Modal
**Priority**: P2 (Medium)  
**Test ID**: `onboard-breath-002`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | During breath animation | "Skip" button visible |
| 2 | Tap "Skip" | Modal closes immediately |
| 3 | Verify redirect | Practice Chat loads |

---

## Test Suite C: Practice Chat Breathing Exercise

### C1: Single Breath Cycle
**Priority**: P1 (High)  
**Test ID**: `prep-breath-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Practice Chat | Topic selection visible |
| 2 | Select any topic | Breathing exercise starts |
| 3 | Observe "Breathe in..." phase | Circle expands (2 seconds) |
| 4 | Observe "Hold..." phase | Circle stays expanded (2 seconds) |
| 5 | Observe "Breathe out..." phase | Circle contracts (2 seconds) |
| 6 | Wait for completion | "Continue" button appears |
| 7 | Tap "Continue" | AI coaching chat loads |

**Total Duration**: ~6 seconds (single cycle)

### C2: Skip During Breathing
**Priority**: P2 (Medium)  
**Test ID**: `prep-breath-002`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start breathing exercise | Exercise running |
| 2 | Tap "Skip" before completion | Immediately transitions to coaching |
| 3 | Verify coach loaded | AI coaching interface visible |

### C3: Consistent UI Design
**Priority**: P2 (Medium)  
**Test ID**: `prep-breath-003`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Compare welcome breath modal | Note circle animation style |
| 2 | Compare prep-chat breath exercise | Same circle animation style |
| 3 | Verify consistency | Both use expanding/contracting circle, same colors |

---

## Test Suite D: Navigation Consistency

### D1: Desktop Sidebar Order
**Priority**: P1 (High)  
**Test ID**: `nav-sidebar-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View app on desktop/tablet | Sidebar visible |
| 2 | Check nav order | Practice, Chat, Calendar, Conch, Expenses |
| 3 | Tap each nav item | Correct page loads |

### D2: Mobile Bottom Nav Order
**Priority**: P1 (High)  
**Test ID**: `nav-mobile-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View app on mobile | Bottom navigation visible |
| 2 | Check nav order | Practice, Chat, Calendar, Conch, Expenses |
| 3 | Verify icon alignment | Same order as desktop sidebar |
| 4 | Tap each nav item | Correct page loads |

### D3: Active State Highlighting
**Priority**: P2 (Medium)  
**Test ID**: `nav-active-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Practice Chat | Practice nav item highlighted |
| 2 | Navigate to Chat | Chat nav item highlighted |
| 3 | Navigate to Calendar | Calendar nav item highlighted |

---

## Test Suite E: Avatar System

### E1: Custom Picture Priority
**Priority**: P1 (High)  
**Test ID**: `avatar-picture-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open profile settings | Avatar options visible |
| 2 | Upload custom picture | Picture preview shows |
| 3 | Select a color avatar | Color stored but picture still shows |
| 4 | Save and reload | Custom picture still displays |
| 5 | Check other locations | Avatar consistent everywhere |

### E2: Color Selection (Theme)
**Priority**: P2 (Medium)  
**Test ID**: `avatar-color-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select color without picture | Color avatar displays |
| 2 | Select different color | Color changes |
| 3 | Upload picture later | Picture takes precedence |
| 4 | Remove picture | Color avatar returns |

---

## Test Suite F: Branding Verification

### F1: No "Replit" Text in App
**Priority**: P0 (Critical)  
**Test ID**: `brand-replit-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Search all visible UI text | NO "Replit" word visible |
| 2 | Check login button | Says "Sign In Securely" not "Log in with Replit" |
| 3 | Check GuestEntry screen | No "Replit Auth" references |
| 4 | Check settings | No "Replit" branding |

**Note**: OAuth page itself (external) will show Replit branding - this is expected and cannot be changed.

---

## Test Suite G: Performance Benchmarks

### G1: Page Load Times
**Priority**: P1 (High)  
**Test ID**: `perf-load-001`

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Welcome screen | < 1.5s | < 3s |
| Practice Chat | < 2s | < 4s |
| Chat page | < 2s | < 4s |
| Calendar | < 2s | < 4s |

### G2: Breathing Animation Smoothness
**Priority**: P2 (Medium)  
**Test ID**: `perf-anim-001`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start breathing exercise | Animation smooth (60fps) |
| 2 | Check for jank | No visible stuttering |
| 3 | Test on low-end device | Still smooth |

### G3: Memory Usage
**Priority**: P2 (Medium)  
**Test ID**: `perf-memory-001`

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Idle memory | < 150MB | < 250MB |
| During chat | < 200MB | < 300MB |

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Fresh app install (clear data)
- [ ] Network connectivity verified
- [ ] Test device charged > 50%
- [ ] Screen recording enabled

### Quick Smoke Test (5 minutes)
1. [ ] Launch app -> Welcome appears
2. [ ] Start as guest -> Practice Chat loads
3. [ ] Start new session -> Breathing works
4. [ ] Navigate all pages -> All load correctly
5. [ ] Check nav order -> Matches spec

### Full Regression (30 minutes)
1. [ ] Complete all Suite A tests
2. [ ] Complete all Suite B tests
3. [ ] Complete all Suite C tests
4. [ ] Complete all Suite D tests
5. [ ] Complete all Suite E tests
6. [ ] Complete all Suite F tests
7. [ ] Complete all Suite G tests

---

## Known Issues / Notes

1. **OAuth Page**: Replit's OAuth consent page shows "Log in secured by Replit" - this cannot be changed as it's external to our app.

2. **Vite HMR**: WebSocket connection failures in dev mode are expected and don't affect production.

3. **AI Response Times**: PrepChat AI responses may take 2-4 seconds due to OpenAI API latency - this is expected behavior.

---

*Generated: January 29, 2026*
