# Multi-Instance Pilot Runbook

Every operational command requires an explicit candidate instance:

```powershell
npm run instance:status -- --instance=fejiro
npm run instance:status -- --instance=chukwuma
npm run instance:onboarding-status -- --instance=chukwuma
```

An instance owns its profile, configuration, database, Gmail token, resume
root, browser profile, logs, and application proof. The manifest is
`instances/<id>/instance.yaml`.

## Activation gate

`chukwuma` is scaffolded but intentionally inactive. Do not enable it until:

1. `instances/chukwuma/ONBOARDING.md` is complete.
2. The friend has approved the profile, truth bank, answer policy, target jobs,
   resumes, and automation consent.
3. A Chukwuma-owned orange-format resume has passed DOCX render QA.
4. Gmail OAuth reports exactly `chukwumamezok@gmail.com`.
5. The visible/CDP browser profile is confirmed as Chukwuma and signed into
   the enabled job platforms.
6. `onboarding_approved` and `activation_enabled` are deliberately set true.

The setup-only dashboard can run before activation:

```powershell
$env:PORT = "3011"
npm run serve -- --instance=chukwuma
```

It displays the readiness checklist while blocking operational dashboard
actions. The protected `/api/instance` endpoint exposes the same status.

Check the gate:

```powershell
npm run instance:ready -- --instance=chukwuma
```

## Scheduler registration

Registration fails while the activation gate is closed:

```powershell
npm run schedule:gmail:register -- -InstanceId chukwuma
npm run schedule:discovery:register -- -InstanceId chukwuma
npm run schedule:register -- -InstanceId chukwuma
npm run schedule:digest:register -- -InstanceId chukwuma
```

The resulting names are:

- `JobReplyAgent-chukwuma-Gmail`
- `JobReplyAgent-chukwuma-Discovery`
- `JobReplyAgent-chukwuma-Applications`
- `JobReplyAgent-chukwuma-Digest`

## Proof boundary

Use `submitted_verified` only when a confirmation page, confirmation email, or
platform applied-history record proves submission. Unknown questions,
sensitive declarations, CAPTCHA, authentication challenges, and identity
mismatches pause the workflow.

Visible browser checks are candidate-specific:

```powershell
npm run browser:instance-status -- --instance=chukwuma
```

The check fails until the manifest has an approved candidate name and a visible
Chrome profile label matches that candidate. It never launches or navigates a
browser.
