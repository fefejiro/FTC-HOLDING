# Terra Dev prompt: PeacePad language, icon polish, and release retest

You are continuing the canonical PeacePad product. Work only in `C:\ppn` on branch `peacepad-native-main` and preserve the existing branch, dependency tree, EAS project, Supabase project, production configuration, and all unrelated dirty files. Do not create another app, clone, worktree, branch, backend, or release pipeline. Do not submit or promote a store build.

Before editing, record the repository root, branch, exact source SHA, upstream SHA, dirty files, package and bundle identity, app version, Android version code, iOS build number, EAS project identity, and production API health. The package and bundle identity must remain `ca.peacepad.family`. Treat `D:\PeacePadRecordings\20260910-231102\PEACEPAD_RELEASE_FIX_BRIEF_2026-09-11.md` and the release handover in this folder as the controlling release documents.

## Product language rule

Remove dash punctuation from all customer facing PeacePad wording on native Android, native iOS, the PeacePad website, accessibility labels and hints, notifications, exports, store copy, and screenshots. This includes em dashes, en dashes, and hyphens used in customer terms such as `co-parent` or `co-parenting`. Do not mechanically delete punctuation and leave broken grammar. Rewrite each sentence naturally.

Preferred terms:

* Use `coparent`, `coparenting`, `other parent`, or `parenting partner`, according to context.
* Use `Shared with another parent` and `Private space` as separate labels instead of joining labels with a dash.
* Keep the product child centred. PeacePad supports practical parenting coordination and does not imply adult reconciliation, relationship counselling, or pressure to reunite.
* Do not restore `Family connection`, `Native V2`, prototype language, internal IDs, or developer terminology in customer surfaces.

Do not alter technical identifiers, URLs, CLI flags, dates, negative numbers, source code operators, standards names, or third party legal names merely to satisfy the wording rule. Add an automated customer copy guard that scans the actual rendered copy sources while excluding technical and test only material.

## Icon and visual quality rule

Upgrade the in product icon system so it feels deliberate, warm, recognizable, and production quality. Keep the established PeacePad conch mark and palette. Do not replace the brand, imitate another app, use emoji, use generated photorealistic pictures as icons, or introduce an unrelated icon library.

* Use one coherent vector icon family with consistent optical size, stroke weight, corner treatment, padding, and filled versus outlined state.
* Choose semantically specific symbols for Home, Messages, Calendar, Records, More, Tasks, Support, Coach, Family tools, Calls, Conch, invitations, privacy, location, light and dark appearance.
* Make the appearance control unmistakable. Use a sun in light mode and a moon in dark mode, include a text accessible name, and provide visible pressed and focus states. Do not use decorative hearts as a substitute for the control meaning.
* Preserve the round PeacePad branded Conch voice focal point. It must never look like a square placeholder. Show clear idle, listening, speaking, waiting, muted, connecting, failed, and ended states using icon, text, and shape, not colour alone.
* Ensure meaningful icons and control boundaries meet at least 3 to 1 contrast. Normal text must meet 4.5 to 1. Test light and dark appearance, large text, reduced motion, VoiceOver, and TalkBack.
* Use minimum 44 by 44 point iOS and 48 by 48 dp Android touch targets, without crowding or clipping.
* Keep decorative illustrations separate from functional controls and mark decorative artwork inaccessible.

Add focused component and screenshot coverage for icon semantics, accessibility labels, dark appearance, large text, and the absence of customer facing placeholder or internal terminology.

## Existing functional blocker that must remain first

Do not let visual polish hide functional defects. Android build 2.0.3 code 55 from source `984b8ab9211e2cbddb56f6e2b9d8615c12bb71bf` proved that the recipient receives both the private `Demo pickup` and shared `RRC53 shared pick` events in Day view. Month view displayed only the first same day event and silently clipped the second. Production database checks also showed that both active family members have calendar permission, receive all 8 layers, and receive the shared event from the schedule event RPC. Preserve the synchronization behaviour and verify the repaired Month view shows a visible additional event count without exposing private event details. Never log tokens, account identifiers, invitation codes, message content, record content, or exact private data.

Acceptance for the blocker:

1. Parent A creates one new labelled shared event in the shared `Events and Activities` calendar.
2. Parent A sees one persisted copy after restart.
3. Parent B opens the same shared parenting space and sees exactly one copy with matching date, time, and approved synthetic details.
4. Parent B continues to see Parent B private events while Parent A cannot see them.
5. The result survives ten close and reopen cycles and a forced refresh on both devices.

## Full two parent value and reliability retest

After focused automated tests pass, build one identifiable install only candidate through the existing protected GitHub and EAS workflow. Install it over the two existing disposable Android accounts without clearing data. Capture redacted Logcat, UI XML, screenshots, exact source SHA, artifact hash, signer certificate hash, package, version, code, device and API level.

Test the real journey in this order:

1. Returning user email sign in and Google sign in availability, invalid credentials, cancellation, offline failure, retry, restart persistence, sign out protection, and prominent sign in recovery.
2. Solo parenting space, task validation and duplicate prevention, private calendar event, private Case Binder visibility, attachment selection failure recovery, support search by current location and city or postal code, and dark appearance.
3. Invitation creation, review, acceptance, expiry, invalid code, already used code, deterministic shared space selection, restart persistence, and accurate connected state.
4. Two way plain messages, Message Check original versus suggestion review, send once semantics, recipient receipt, correction, search, attachment and voice note states.
5. Shared calendar event creation and recipient visibility, parenting plan change request, accept and decline states, duplicates, offline retry, and private event isolation.
6. Tasks, children, expenses, settlement, records, export, support links, notifications, and permission denial or recovery states.
7. Audio and video calls on two devices, incoming ring, accept, decline, mute, speaker, camera, interruption, reconnect, end, and recipient proof.
8. Conch Audio and Video on two devices, invitation and consent, turn ownership, listening and speaking states, microphone and camera denial, timeout, reconnect, end, reduced motion, and no unapproved recording or transcript claim.
9. Ten consecutive cold and warm reopen cycles, offline launch, slow API, API failure recovery, background and foreground, rotation where supported, large text, light and dark appearance, TalkBack, and redacted Logcat review.

Assess usefulness as well as mechanics. For every journey record the parent goal, time to first value, number of decisions, unclear wording, dead ends, duplicate risk, confidence after completion, child centred value, and whether PeacePad reduces the need to switch among chat, calendar, notes, calls, and support searches. Keep verified defects separate from subjective observations.

Repeat all applicable acceptance journeys on a physical Android device and a physical iPhone using the matching candidate source. A simulator or emulator is useful evidence but is not physical device proof. Do not report `GO FOR BOTH STORES` until all P0 and P1 checks pass, two parent outcomes are verified, physical Android attachment and call evidence exists, physical iPhone and TestFlight evidence exists, and current Play and App Store provider states are refreshed.

## Required handoff

Return the exact source SHA, changed files, rationale, automated test outputs, Android and iOS candidate identities, artifact hashes, redacted evidence paths, a defect table, usability findings, remaining exclusions, and one truthful verdict: `GO FOR BOTH STORES` or `NO GO`. Do not publish, submit, deploy, or promote as part of this assignment.
