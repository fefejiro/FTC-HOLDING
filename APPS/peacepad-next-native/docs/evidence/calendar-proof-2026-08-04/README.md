# Current Calendar Simulator Proof

This evidence set was captured from the isolated PeacePad native lab on an
iPhone 17 Simulator running iOS 26.5.

- Source commit: `e0936d2e892fccc42181077ac06944504562d5cf`
- Bundle identifier: `ca.peacepad.nextnative.lab`
- Production API writes: disabled
- Source checkout: clean when the standalone Simulator workspace was prepared
- Data: fictional, session-only empty calendar state

## Screenshots

- `01-calendar-month.png`: current August 2026 month grid
- `02-calendar-week.png`: current August 1-7 schedule
- `03-calendar-day.png`: current August 1 day agenda and private layers

The three views were launched deterministically from separate local Metro
sessions. Automated interaction coverage separately proves that the Month,
Week, and Day controls switch views and that calendar sharing requires explicit
confirmation.

## Visual review

- Primary task screens no longer duplicate the native stack title and page
  title.
- Empty states are accurate; no fixture events are represented as user data.
- Layer names and privacy state remain visible without relying on colour alone.
- Layer-sharing interaction is not claimed as Simulator verified in this set.

