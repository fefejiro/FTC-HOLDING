# PeacePad Backlog

> Status: supporting backlog.
>
> Use `ACTIONABLE_TASK_QUEUE.md` for the short execution queue and `RELEASE_EXECUTION_CHECKLIST.md` for release gating.
> Keep this file for broader roadmap and backlog context.

> Last updated: December 12, 2025
> Status: Production Live at peace-pad.replit.app (peacepad.ca pending DNS)

---

## System Health Status

### Core Systems (All Working)
- [x] Server running on port 5000
- [x] Health endpoint responding (/health, /api/health)
- [x] Database connected (PostgreSQL - 51 tables)
- [x] Authentication (Replit Auth + Guest sessions)
- [x] WebRTC signaling initialized
- [x] Session cleanup services running
- [x] Weekly report scheduler active
- [x] CORS configured for both domains

### External Services Status
| Service | Status | Notes |
|---------|--------|-------|
| Database (Neon) | Working | All 51 tables accessible |
| Replit Auth | Working | OAuth configured |
| OpenAI API | Not configured | Tone analysis uses mock data |
| Firebase FCM | Not configured | Native push disabled |
| Mailjet | Not configured | Email notifications disabled |
| Web Push (VAPID) | Needs setup | Browser push not working |

### Known Issues
- [ ] Memory usage hovering around 137MB/142MB (monitor for leaks)
- [ ] OpenAI API key not set (AI features use mock data)
- [ ] Firebase service account not set (native push disabled)

---

## MVP Features (Priority 1 - Critical)

### Completed MVP Features
- [x] Conch Mode - Structured turn-based conversations
- [x] Real-time messaging with AI tone analysis framework
- [x] Shared custody calendar
- [x] Expense tracking with settlements
- [x] Task management
- [x] Child updates tracking
- [x] Guest authentication (14-day sessions)
- [x] QR code partnership linking
- [x] Safety plans (encrypted)
- [x] Support resources directory
- [x] Health check endpoint for deployment

### MVP Enhancements Needed
- [ ] **Configure OpenAI API** - Enable real AI tone analysis
- [ ] **Configure VAPID keys** - Enable web push notifications
- [ ] **Configure Mailjet** - Enable email notifications
- [ ] **Domain verification** - Complete peacepad.ca DNS setup

---

## High Priority (Priority 2 - Should Have)

### User Experience
- [ ] Improve onboarding flow for new users
- [ ] Add tutorial/walkthrough for Conch Mode
- [ ] Better error messages for connection issues
- [ ] Offline mode improvements

### Notifications
- [ ] Configure Firebase for native Android push
- [ ] Configure APNs for iOS push
- [ ] Email digest for missed messages

### Performance
- [ ] Investigate memory usage patterns
- [ ] Optimize large message history loading
- [ ] Image compression for attachments

---

## Medium Priority (Priority 3 - Nice to Have)

### Features
- [ ] Voice message transcription
- [ ] Message reactions
- [ ] Recurring calendar events
- [ ] Expense categories and reporting
- [ ] Export data to PDF/CSV
- [ ] Multiple children profiles

### UI/UX
- [ ] Dark mode refinements
- [ ] More theme color options
- [ ] Accessibility improvements (screen reader)
- [ ] Tablet-optimized layouts

### Analytics
- [ ] User engagement metrics
- [ ] Feature usage tracking
- [ ] Error rate monitoring dashboard

---

## Low Priority (Priority 4 - Future Ideas)

### Advanced Features
- [ ] AI-powered conflict detection in calendar
- [ ] Therapist/mediator access mode
- [ ] Court document generation
- [ ] Multi-language support (French, Spanish)
- [ ] Video calling in Conch Mode
- [ ] Shared photo albums for children

### Integrations
- [ ] Google Calendar sync
- [ ] Apple Calendar sync
- [ ] Venmo/PayPal for expense settlements
- [ ] Document storage (Google Drive, Dropbox)

### Platform Expansion
- [ ] iOS App Store submission
- [ ] Desktop app (Electron)
- [ ] API for third-party integrations

---

## Technical Debt

### Code Quality
- [ ] Fix LSP diagnostic in server/routes.ts
- [ ] Add comprehensive test coverage
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Refactor large route files

### Infrastructure
- [ ] Set up staging environment
- [ ] Automated backup verification
- [ ] Load testing for scalability
- [ ] CDN for static assets

### Security
- [ ] Security audit
- [ ] Penetration testing
- [ ] Rate limiting review
- [ ] Session timeout optimization

---

## Recently Completed

### December 12, 2025
- [x] Fixed CORS configuration for peace-pad.replit.app
- [x] Added health check endpoints for deployment
- [x] Successfully deployed to production
- [x] Connected custom domain (pending DNS propagation)

### December 4, 2025
- [x] AI Tone Analysis restored (GPT-4o-mini)
- [x] Development environment fix

### Earlier
- [x] WebRTC V2 CallEngine implementation
- [x] Conch Mode with AI mood tracking
- [x] Push notification framework
- [x] Android Capacitor setup
- [x] Play Store preparation

---

## How to Use This Backlog

1. **Adding items**: Add new items to the appropriate priority section
2. **Moving items**: When priorities change, move items between sections
3. **Completing items**: Mark with [x] and move to "Recently Completed"
4. **Dating changes**: Update "Last updated" at the top

### Priority Definitions
- **P1 (Critical)**: Must have for MVP, blocks user adoption
- **P2 (High)**: Important for user satisfaction, should do soon
- **P3 (Medium)**: Nice to have, improves experience
- **P4 (Low)**: Future ideas, long-term roadmap
