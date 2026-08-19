# Just Checking In Android Release Handover

Date: 2026-08-19
Owner account: Fejiro Play organization, developer account `9098950441049789979`

## Current verified state

- A new Google Play app record was created for **Just Checking In Game**.
- Play app ID: `4974165497912861650`.
- Android package: `com.ftcholding.justcheckingin`.
- The Play Console dashboard opened successfully and showed the initial setup checklist.
- Privacy policy was saved as `https://unalabs.cloud/privacy/`.
- Ads declaration was saved as **No, my app does not contain ads**.
- Content-rating questionnaire was opened but not verified as submitted.
- No Android bundle has been uploaded.
- The app is not published on Google Play. Do not report it as published until a production track and public Play URL prove it.

## Icon correction

- The Unity project had empty Android and iOS icon slots, which caused the
  missing/default app icon reported during release preparation.
- A branded Just Checking In icon was added at
  `Assets/_Game/Art/jci-icon.png` and the editor build script now applies it
  to Android and iOS player settings before every build.
- Corrected signed bundle built successfully at
  `D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab`.
- Corrected bundle SHA-256: `148205D847F9392ECAD4673E84C65E4DD55DB75DF59B41F0AC9EDDE688CE07C3`.
- The bundle contains Android `mipmap-*/app_icon.png` assets. It has not yet
  been uploaded to Play Console because this browser channel cannot attach a
  local file through the Play upload picker.

## Android build work

The source Unity project used for this release is outside the Git checkout:

`D:\FTC-GAMES\just-checking-in-game-clean`

Unity:

`C:\Program Files\Unity\Hub\Editor\6000.4.5f1\Editor\Unity.exe`

The batch build entry point is `Jci.Editor.BuildScript.BuildAndroid` and should produce:

`D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab`

The local build script was repaired in that external Unity project by removing the obsolete `ApiCompatibilityLevel.NET_Standard_2_1` assignment. Unity 6000.4.5f1 does not expose that enum member and the previous build stopped at compile time.

The active clean build was started with an external upload key and these paths:

- Keystore: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-upload-release-v2.jks`
- DPAPI-protected password file: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\jci-upload-password-v2.dpapi.txt`
- Build log: `D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\unity-build-android-v2.log`

At handover, Unity process `19200` was still active in the final Android player/Burst build phase and the AAB did not yet exist. Do not start a second Unity build against the same project while that process is active.

Check it with:

```powershell
Get-Process -Name Unity -ErrorAction SilentlyContinue
Test-Path 'D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab'
Get-Content 'D:\FTC-HOLDING-releases\just-checking-in\android-2026-08-19\unity-build-android-v2.log' -Tail 80
```

When the AAB appears, record its size and SHA-256 before uploading:

```powershell
Get-FileHash 'D:\FTC-GAMES\just-checking-in-game-clean\Builds\Android\JustCheckingIn.aab' -Algorithm SHA256
```

## Next Play Console steps

1. Reconnect the authenticated Chrome Play Console session. The previous browser-control channel dropped even though the owner could still see the Play tabs.
2. Finish the JCI content-rating questionnaire as a **Game**, using the owner mailbox `fejiro.efiuvwere@gmail.com` and truthful answers from `GAME-BRIEF.md` and `SECURITY-PRIVACY.md`.
3. Complete target audience, data safety, category/contact, and store listing. JCI documentation says there are no microphone, camera, location, contact, recording, or transcription permissions; spoken answers are not recorded and remote state is compact metadata only.
4. Upload the verified AAB to the first available release track, preferably Production if Play permits it. If Play requires testing, record the exact policy gate and use the required track.
5. Submit the release for review only after all mandatory declarations and listing assets are complete.
6. Verify public availability from the Play listing and release status. A console upload or review submission is not publication.

## Important separate issue

The screenshot showing **App rejected** is for **UnaScout AI Job Search**, not Just Checking In Game. Its visible Play policy evidence says the reviewer login credentials are incorrect. That is an UnaScout testing-credentials issue, not evidence of a JCI signing failure. Do not mix the two app records.

## Source and repository note

`C:\FTC HOLDING\APPS\just-checking-in-game` contains the operational scripts but is not itself a Git repository. This handover is committed from the FTC root repository under `APPS/just-checking-in-game/scripts`. The Unity project and external release artifacts remain outside the repository and must be moved into the proper versioned game checkout before the next repeatable release.
