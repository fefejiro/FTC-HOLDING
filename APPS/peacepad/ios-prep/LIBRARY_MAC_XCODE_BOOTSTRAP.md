# PeacePad Library Mac Xcode Bootstrap

Purpose: prove that the clean PeacePad Capacitor project compiles locally with
Xcode 26, capture the Mac-generated project files, and stop before Xcode Cloud.

## Source of truth

- Repository: `https://github.com/fefejiro/FTC-HOLDING`
- Branch: `release/peacepad-ios-1.0`
- PeacePad base commit: `372cc4a3ffde2a7039cebef0ff7187f62eace887`
- App path: `APPS/peacepad`
- Bundle ID: `ca.peacepad.family`
- Xcode target: `App`
- Production web app: `https://peacepad.ca`
- Production API: `https://api.peacepad.ca`

Do not use `peacepad-ios-testflight`, PR #136, or any standalone legacy
PeacePad repository.

## 1. Public-Mac safety

1. Use a Guest or disposable macOS account.
2. Do not download production `.env` files, API keys, `.p8`, `.p12`, exported
   certificates, or provisioning profiles.
3. Use automatic signing inside Xcode. Do not export signing identities.
4. Sign out of Xcode, GitHub, and App Store Connect and delete the clone before
   leaving.

## 2. Tool preflight

Run these before cloning:

```bash
xcodebuild -version
git --version
node --version
npm --version
pod --version
```

Required result:

- Xcode 26.x with an iOS 26 SDK;
- Git available;
- Node 20 or newer;
- npm available;
- CocoaPods available.

If Xcode is older than 26, stop. If Node or CocoaPods is unavailable and the
library does not permit a user-local installation, stop rather than changing
the shared Mac.

## 3. Clone only the clean release lane

```bash
git clone --filter=blob:none --sparse \
  --branch release/peacepad-ios-1.0 \
  --single-branch \
  https://github.com/fefejiro/FTC-HOLDING.git

cd FTC-HOLDING
git sparse-checkout set APPS/peacepad
git branch --show-current
git log --oneline -3
```

The branch must be `release/peacepad-ios-1.0`, and its history must contain the
PeacePad base commit `372cc4a3`.

## 4. Reproduce the web and Capacitor project

```bash
cd APPS/peacepad
npm ci --workspaces=false --no-audit --no-fund
npm run check
CAPACITOR_ENV=production npm run build:frontend
npx cap sync ios

cd ios/App
pod install
open App.xcworkspace
```

Use the app-level lockfile. Do not run `npm install` from the monorepo root.

## 5. Local Xcode proof

In Xcode:

1. Confirm the open workspace is `App.xcworkspace`.
2. Select scheme and target `App`.
3. Confirm bundle identifier `ca.peacepad.family`.
4. Select `Automatically manage signing` and the FTC Apple team.
5. Open **Product -> Scheme -> Manage Schemes** and mark `App` as **Shared**.
6. Select an installed iPhone simulator and run **Product -> Build**.
7. If the simulator build succeeds, select **Any iOS Device (arm64)** and run
   **Product -> Archive**.
8. Do not upload the archive and do not configure an Xcode Cloud workflow yet.

## 6. Smoke evidence

If the simulator launches, verify:

- the app opens without a blank screen;
- guest compose loads;
- tone analysis and suggested rewrite work;
- copy-to-send works;
- sign-in and sign-up entry points open;
- bottom navigation, calendar, and settings do not crash;
- no unexpected camera, microphone, location, photo, or push prompt appears;
- production navigation stays on `peacepad.ca` and `api.peacepad.ca`;
- no Replit or development URL appears.

Capture screenshots of the Xcode version, successful Build/Archive result, and
the simulator smoke flow. Never include credentials in screenshots.

## 7. Preserve the Mac-generated source files

Before cleanup:

```bash
cd FTC-HOLDING
git status --short
```

Expected source candidates include:

- `APPS/peacepad/ios/App/Podfile.lock`;
- `APPS/peacepad/ios/App/App.xcworkspace/contents.xcworkspacedata`;
- `APPS/peacepad/ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`;
- a narrowly scoped `project.pbxproj` signing/scheme change, if Xcode made one.

Do not add `Pods`, `DerivedData`, generated `public`, local `xcuserdata`, secrets,
or provisioning files.

If the local Build or Archive fails, retain the exact error text and stop. The
next repository change should fix that evidence before any Xcode Cloud minutes
are used.

## 8. Definition of success for this visit

The visit succeeds when all of the following are true:

- Xcode 26 and the FTC Apple team are confirmed;
- dependencies install from the committed app lockfile;
- `pod install` creates a usable workspace;
- a local simulator build succeeds;
- ideally, a local unsigned/device archive completes;
- the generated lock/workspace/scheme files and error evidence are preserved;
- zero Xcode Cloud compute hours are consumed.
