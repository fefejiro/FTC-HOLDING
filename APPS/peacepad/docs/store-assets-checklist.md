# PeacePad - Asset Preparation Guide

## App Icon (512x512 PNG)
The app icon is generated from the branding assets in `android/app/src/main/res/mipmap-*`. 
For the Play Store upload, use a **512x512 px PNG** version of the PeacePad logo.
- **Source**: You can extract the high-res icon from `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`.
- **Requirements**: PNG/JPEG, < 1MB, 512x512px.

## Feature Graphic (1024x500 PNG)
This is a landscape graphic used for the Play Store banner.
- **Background**: Use the theme primary color `hsl(262, 70%, 68%)`.
- **Content**: Center the PeacePad logo with the text "PeacePad" and tagline "Communicate Clearly. Reduce Conflict."
- **Requirements**: PNG/JPEG, < 15MB, 1024x500px.

## Screenshots Matrix

| Device Type | Req. Count | Aspect Ratio | Resolution Range |
| :--- | :--- | :--- | :--- |
| **Phone** | 2-8 | 9:16 | 1080x1920 (recommended) |
| **7-inch Tablet** | 2-8 | 9:16 or 16:9 | min side 320px, max 3840px |
| **10-inch Tablet** | 2-8 | 9:16 or 16:9 | min side 1080px, max 7680px |
| **Chromebook** | 4-8 | 16:9 | min side 1080px, max 7680px |
| **Android XR** | 4-8 | 9:16 or 16:9 | min side 720px, max 7680px |

## How to Capture Tablet/Landscape Screenshots
1. **Open Chrome DevTools** (F12) on the production site `https://peacepad.ca`.
2. **Toggle Device Toolbar** (Ctrl+Shift+M).
3. **Select Tablet Presets**:
   - For 7-inch: Select "iPad Mini" or custom `600x960` (portrait) or `960x600` (landscape).
   - For 10-inch: Select "iPad Pro" or custom `800x1280` (portrait).
4. **Capture**: Click the "More options" (three dots) in the device toolbar and select "Capture screenshot".

## Required Video URLs
- **Main Video**: A 15-30 second walk-through of the app. Must be a YouTube URL (public or unlisted).
- **XR Videos**: Only required if targeting specific XR hardware; otherwise, these can be skipped for general listing.
