# Pre-Travel Portfolio Readiness - 2026-05-26

## Executive Verdict

Status: HOLD until the checklist below is closed. The portfolio has enough real product proof for travel conversations, but the public story needed tighter stage language so live products, demos, and pre-launch work are not mixed together.

## Readiness Checklist

| Area | Status | Finding | Next action |
| --- | --- | --- | --- |
| PeacePad product page | GO | Product page is already complete. Avoid adding more surface area before travel. | No change needed. |
| Garden Cleaners case study | PARTIAL | Public site is live, but previous wording implied a fully completed booking operation while recurring booking and GBP work remain next milestones. | Framed as public site live with post-launch hardening. |
| Anion Class App | PARTIAL | Product exists in repo and docs, but was missing a public portfolio case study. | Added pre-launch case-study framing and naming guardrails. |
| SayWetin | HOLD | Concept page is clean; tested Play Store push is still the credibility gate. | Keep public language as Play Store candidate until QA push is complete. |
| Dispatch | GO | Web product is live at dispatch.unalabs.cloud; portfolio needed clearer live status. | Mark as live web app, not just early access. |
| Una Labs landing page | PARTIAL | Strong service story, but needed less generic agency phrasing and more stage-based product proof. | Tightened hero and product proof copy. |
| ATEAM intake demo | PARTIAL | Existing public ATEAM route and assets are present; demo readiness still depends on a live smoke pass. | Run a 5-minute browser demo script before travel. |
| FTC Holding portfolio page | PARTIAL | Work page overclaimed everything as live. | Changed to delivery snapshots and actual status labels. |
| GitHub profile README | HOLD | No profile README lives in this repo; top-level README says it lives in external `fefejiro/fefejiro`. | Update external profile repo separately. |
| Investor/client brief | PARTIAL | No concise travel brief existed. | Added product portfolio brief doc. |
| Call-signal tracking | PARTIAL | Existing job agent had applications and recruiter email tracking, but not phone-call capture. | Added lightweight call signal table and CLI logging. |

## Product Snapshot

| Product | Stage label | Public proof | Guardrail |
| --- | --- | --- | --- |
| Dispatch | Live web app | `https://dispatch.unalabs.cloud`, `/products/dispatch` | Play Store language should be separate from web status. |
| PeacePad | Live on Google Play | `https://peacepad.ca`, Google Play listing | Do not call concept visuals screenshots unless they are actual app captures. |
| SayWetin | Play Store candidate | `/saywetin`, Android package path | Do not claim tested Play Store release until device QA and push are complete. |
| Anion Class App | Pre-launch case study | `/products/anion`, `APPS/anion` docs | Use "pre-launch classroom workflow"; avoid marketplace claims. |
| Garden Cleaners | Public site live / post-launch hardening | `/work/garden-cleaners`, `/garden-cleaners` | Quote/booking operations are rollout work, not completed proof. |
| ATEAM | Demo/internal workflow surface | `/ateam`, product preview assets | Keep demo focused on intake, scope, and artifacts. |

## Call-Signal Workflow

Use the existing job reply agent database instead of a new CRM.

Required fields now captured:
caller name, phone, company, role, source platform, matching application/job id, notes, follow-up date, confidence score.

Example:

```powershell
npm --prefix APPS/job-reply-agent run dev -- call:log --caller-name "Jane Recruiter" --phone "+1 555 0100" --company "Acme" --role "Technical Program Manager" --source Dice --job-id 42 --notes "Asked for availability and salary range" --follow-up 2026-05-28 --confidence 80
npm --prefix APPS/job-reply-agent run dev -- call:list --limit 20
```

## Final Travel Gate

- [ ] Build `APPS/ftc-site`.
- [ ] Build and test `APPS/job-reply-agent`.
- [ ] Open `/`, `/products`, `/products/anion`, `/products/dispatch`, `/work`, `/work/garden-cleaners`, `/saywetin`, `/products/peacepad`.
- [ ] Confirm public links load.
- [ ] Confirm no secrets are shown in docs or pages.
- [ ] Record or rehearse ATEAM intake demo.
- [ ] Update external GitHub profile README in `fefejiro/fefejiro`.
