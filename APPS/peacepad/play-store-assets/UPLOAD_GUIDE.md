# PeacePad Play Store Upload Guide

## Current Status

The codebase and release build are aligned to the MVP refocus.

Store copy is ready in:
- `docs/play-store-listing.md`
- `docs/play-store-screenshots-guide.md`

## Assets You Can Reuse

These are likely still reusable if they visually match the current brand:
- `play-store-assets/icon/app-icon-512.png`

These should be reviewed and likely refreshed:
- `play-store-assets/feature-graphic/feature-graphic.png`
- everything in `play-store-assets/screenshots/`

Reason: older assets were created for the broader product and still reference now-deferred features like Conch Mode and organization tools.

## Upload Order In Play Console

1. App icon
2. Feature graphic
3. Phone screenshots
4. Short description
5. Full description
6. Contact details
7. Privacy policy URL

## Screenshot Upload Plan

Replace the screenshot set with these six slots:
- `01-welcome.png`
- `02-messages.png`
- `03-rewording.png`
- `04-prep-chat.png`
- `05-calendar.png`
- `06-invite-settings.png`

## Metadata Checklist

- [ ] Title: `PeacePad`
- [ ] Short description: `Say what you mean. Without the fight.`
- [ ] Full description pasted from `docs/play-store-listing.md`
- [ ] Category set to `Parenting`
- [ ] Contact email set to `peacepad@peacepad.ca`
- [ ] Privacy policy URL verified

## Release Artifact Checklist

- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] Android release bundle generated
- [ ] screenshots replaced with MVP set
- [ ] feature graphic updated to the new tagline

## Notes

Do not upload screenshots or graphics that advertise:
- Conch Mode
- expenses
- tasks
- child updates
- therapist directory search
- achievements
