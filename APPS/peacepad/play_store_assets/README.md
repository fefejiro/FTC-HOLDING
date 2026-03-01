# PeacePad Play Store Assets

## ✅ Assets Ready for Submission

### 1. Hi-Res App Icon (512x512) - UPLOAD THIS TO GOOGLE PLAY
- **File:** `peacepad_hi_res_app_icon_512x512.png`
- **Specs:** 512 x 512 pixels, PNG format
- **Status:** ✅ Ready (Updated Dec 24, 2024)
- **Description:** Official PeacePad app icon - matches the launcher icon in your AAB
- **Use For:** Google Play Console → App content → App icon (Hi-res icon)

### 2. Feature Graphic (1024x500)
- **File:** `feature_graphic_1024x500.png`
- **Specs:** 1024 x 500 pixels, PNG format  
- **Status:** ✅ Ready
- **Description:** Horizontal banner with gradient and co-parenting illustration

### 3. Screenshots (1080x1920) - 8 Total
- **Location:** `screenshots/` folder
- **Specs:** 1080 x 1920 pixels each, PNG or JPG
- **Status:** 🔄 Capture manually using checklist

**Screenshot Checklist:**
Open `SCREENSHOT_CHECKLIST.html` in your browser for interactive checklist with direct links to each screen.

**Required Screenshots:**
1. `screenshot_01_chat.png` - Home/Chat Screen
2. `screenshot_02_conch_mode.png` - Conch Mode Active
3. `screenshot_03_progress.png` - Progress Dashboard
4. `screenshot_04_calendar.png` - Shared Calendar
5. `screenshot_05_ai_tone.png` - AI Tone Analysis
6. `screenshot_06_expenses.png` - Expense Tracking
7. `screenshot_07_tasks.png` - Tasks & To-Dos
8. `screenshot_08_settings.png` - Settings/Profile

---

## 📋 Play Store Listing Content

All listing content is ready in `../PLAY_STORE_LISTING.md`:
- ✅ App title and descriptions
- ✅ Feature lists
- ✅ Keywords for ASO
- ✅ Privacy policy URL
- ✅ Release notes

---

## 🚀 Submission Checklist

### Before Submitting:
- [ ] Google Play Developer account created ($25 one-time fee)
- [ ] All 8 screenshots captured and saved to `screenshots/` folder
- [ ] App icon verified (512x512)
- [ ] Feature graphic verified (1024x500)
- [ ] Privacy policy accessible at https://dev.peacepad.ca/privacy
- [ ] Terms of service accessible at https://dev.peacepad.ca/terms

### Play Console Setup:
1. Create new app in Play Console
2. Fill in store listing details (copy from PLAY_STORE_LISTING.md)
3. Upload app icon and feature graphic
4. Upload all 8 screenshots
5. Set privacy policy URL: `https://dev.peacepad.ca/privacy`
6. Set content rating: Adults (18+)
7. Select categories: Parenting, Lifestyle
8. Choose countries: Start with Canada, United States

### App Bundle:
Since PeacePad is a PWA, you'll need to:
1. Use **Trusted Web Activity (TWA)** to package it
2. Or use **Bubblewrap CLI** to generate Android app bundle
3. Sign the APK/AAB with your keystore

**Quick TWA Setup:**
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://dev.peacepad.ca/manifest.json
bubblewrap build
```

---

## 📱 Next Steps After Play Store Launch

1. Monitor user reviews and feedback
2. Track analytics via Google Analytics
3. Iterate based on beta tester feedback
4. Plan iOS App Store launch (requires Capacitor wrapper)

---

## 🆘 Need Help?

- **Screenshots:** Open `SCREENSHOT_CHECKLIST.html` for step-by-step guide
- **Listing Content:** See `../PLAY_STORE_LISTING.md`
- **TWA Packaging:** See `../PLAY_STORE_LISTING.md` for detailed instructions

---

Generated on: ${new Date().toLocaleDateString()}
Ready for submission to Google Play Store!
