# Auto-Outreach Sandbox Evidence - 2026-06-14

Production URL: `https://capsigma-growth-desk.pages.dev`

## Configuration

`npm run prod:doctor` passed after deployment.

- D1: ready
- OpenAI: ready
- SendGrid: ready
- From: `fejiro.efiuvwere@gmail.com`
- Reply-To: `fejiro.efiuvwere@gmail.com`
- Sandbox recipient override: `fejiro.efiuvwere@gmail.com`
- Auto-send minimum fit score: `60`
- Daily send limit: `25`

## Source-Backed Prospect Builder

Live Prospect Builder test passed.

- Run ID: `prospect_run_d28d59bb-76ef-41e0-8f85-523dd425f65b`
- Imported prospect: `Record Solutions`
- Intended email: `info@rsrs.com`
- Fit score: `85`
- Source URL: `https://www.recordsolutions.ca/`
- Status: `qualified`

## No-Approval Sandbox Send

The qualified prospect was drafted and sent without manual approval.

- Lead ID: `lead_record-solutions-info-rsrs-com`
- Draft ID: `draft_814d39e1-fdb7-470e-b840-833d7d6361ae`
- Subject: `Streamlining Your Data Operations`
- Send ID: `send_912a87b9-a95a-4e94-852d-ae291c70d54a`
- Status: `sandbox_sent`
- SendGrid provider message ID: `3fksoZBOTwKJ-6vXerujYg`
- Intended recipient: `info@rsrs.com`
- Actual recipient: `fejiro.efiuvwere@gmail.com`
- Sent Review proof: present

## Reply Attention Smoke

Manual reply-sync smoke passed with a simulated positive reply event.

- Reply ID: `reply_9f975355-ba13-4d17-8238-4d729a0e8540`
- Matched company: `Record Solutions`
- From: `info@rsrs.com`
- Classification: `positive`
- Needs human: `true`

This proves reply ingestion, send matching, classification, and the dashboard
attention queue. Full automatic Outlook/Gmail polling is still a follow-up.

## Generated Reports

- `ops/PRODUCTION-SMOKE-2026-06-14T15-35-59-731Z.json`
- `ops/RECIPIENT-TEST-2026-06-14T15-36-19-136Z.json`
