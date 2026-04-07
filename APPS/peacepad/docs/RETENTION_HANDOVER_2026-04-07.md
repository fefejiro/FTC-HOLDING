# PeacePad Retention Handover

Date: 2026-04-07

## Scope completed

This handover covers the retention and re-engagement work that was already implemented in code and the final production database migration/verification completed in this session.

## Product/code changes already landed

The following work was already present in the repo and had been reported as tested before this handover:

- retention fields added to the `users` model and migration generated
- `GET /api/auth/user` increments `sessionCount` once per hour
- `POST /api/prep-chat/sessions` increments `prepChatSessionCount` and sets `firstPrepChatAt` on first use
- `POST /api/messages` sets `firstMessageSentAt` on first send
- `PUT /api/prep-chat/sessions/:id` increments `draftToSendCount` when `sentToChat: true`
- PostHog identify enrichment includes retention-related traits
- notification permission prompt is delayed until after user value is demonstrated
- re-engagement scheduler exists and is registered
- Prep Chat UX improvements landed, including `+ New session` and chip overflow treatment
- onboarding mini-tour step was added

## Migration completed

Production database migration was executed and verified for the 7 additive `users` columns in:

[0001_aspiring_zaran.sql](/c:/FTC%20HOLDING/APPS/peacepad/migrations/0001_aspiring_zaran.sql)

Columns confirmed present:

- `session_count`
- `prep_chat_session_count`
- `draft_to_send_count`
- `first_prep_chat_at`
- `first_message_sent_at`
- `first_tone_check_at`
- `last_re_engagement_at`

## Live verification

Production verification was run from monorepo root with:

```powershell
npm run verify:peacepad:prod
```

Result:

- `https://peacepad.ca` returned `200`
- `https://www.peacepad.ca` returned `200`
- `https://api.peacepad.ca/health` returned `200`
- `https://api.peacepad.ca/api/health` returned `200`
- auth callback routes returned `200`
- build metadata endpoint returned `200`
- frontend onboarding bundle referenced `api.peacepad.ca`

Status at handover: live and healthy.

## Railway note for future operators

One important operational detail surfaced during this handover:

- the local Railway CLI default link in `APPS/peacepad` reported the `dispatch-api` service when running plain `railway status`
- the documented PeacePad production service is `FTC-HOLDING`
- explicit service targeting against `FTC-HOLDING` was used to verify the retention columns directly before closing this task

For future PeacePad production database work, prefer explicit service selection:

```powershell
railway run -s FTC-HOLDING -e production <command>
```

Do not assume the current directory's default Railway link is the intended PeacePad service.

## Repo cleanliness at handover

- working tree was clean before this documentation file was added
- no application code changes were required in this session
- this handover file is the only repo change from the final wrap-up pass

## Recommended next checks

- confirm PostHog receives the new retention traits in production traffic
- monitor the first scheduled re-engagement run and push delivery outcome
- if more prod DB work is needed, standardize the Railway service link for `APPS/peacepad` or always use `-s FTC-HOLDING`
