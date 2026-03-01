# PeacePad Pre-Launch Checklist

## ✅ Legal & Privacy
- [ ] Update Privacy Policy with precise location disclosure
- [ ] Update Privacy Policy with AI-enhanced location data processing disclosure
- [ ] Verify Terms of Service reflect 14-day Guest session limitations
- [ ] Confirm "Privacy Mode" functionality across all location-based pages

## 📍 Location System
- [ ] Test high-accuracy GPS on physical mobile device (Whitby/Ontario area)
- [ ] Verify 5km default radius in Find Support provides relevant local results
- [ ] Confirm fallback to IP-based geolocation works when GPS is disabled
- [ ] Monitor AI enhancement API (GPT-4o-mini) performance and latency

## 📱 App Experience
- [ ] Verify Bottom Navigation highlighting on all main pages
- [ ] Confirm Chat "No Co-Parent" notification auto-dismisses after 5s
- [ ] Test solo vs partnership expense display logic
- [ ] Verify Prep Chat input clears after suggestion generation

## ⚙️ Technical & Performance
- [ ] Check server logs for any unhandled location geocoding errors
- [ ] Verify Replit Auth production domain settings
- [ ] Perform "Final Sweep" of console logs for debug noise
- [ ] Ensure all local storage keys (location, privacy mode) are consistent
