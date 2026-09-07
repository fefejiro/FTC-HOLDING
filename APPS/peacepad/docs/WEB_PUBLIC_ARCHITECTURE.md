# PeacePad Public Web Architecture

## Domain boundary

The browser root of `peacepad.ca` now serves the public hub. Production mobile clients still load the same origin through Capacitor, but are detected synchronously and kept on the legacy product shell. Existing browser account, authentication-callback, invitation, and web-companion routes also remain on that legacy shell.

`www.peacepad.ca` serves the same public hub. The decision is made before the legacy application mounts, avoiding a root-domain redirect, user-agent detection, or any change to native WebView navigation.

## Public hub routes

The public hub implements marketing, Journal, Safety, Browse Safely, download, and support-oriented routes. Its internal calls to action deliberately go to the existing legacy host for actual account and product entry points.

## Safety and privacy

- Quick Exit is a direct, accessible user action to a neutral external page; it does not claim to erase browser history or device activity.
- The Safety and Browse Safely pages do not initialize public-hub analytics.
- Public content must never include authentication credentials, user data, provider tokens, invitation codes, or secrets.
- `/open` does not invoke a custom app scheme until the installed client’s deep-link route is specifically verified on iOS and Android.

## Deployment gate

After each public-site deployment, verify both `peacepad.ca` and `www.peacepad.ca` serve the current public bundle at `/`, while `/account-access`, `/auth/*`, `/join/*`, and other product routes remain available to the legacy shell. Native Android and iOS login, invite, confirmation, reset, and restart flows must continue to use `peacepad.ca` without redirecting to the public hub.
