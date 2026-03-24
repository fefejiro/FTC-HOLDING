# Up Nepa

Last updated: 2026-03-24

## What It Does

`Up Nepa` is the local OpenClaw quota guard for Codex account switching.

It watches the active `openai-codex` usage windows and:

- keeps `peacepad@peacepad.ca` as the primary account
- keeps `fejiro.ontario@gmail.com` as the backup account
- switches the OpenClaw auth order to the backup account when quota gets low
- sends a Telegram notification when the switch happens
- restores the primary account after the exhausted quota window resets

## Files

- [up-nepa.ps1](/c:/FTC%20HOLDING/scripts/up-nepa.ps1)
- [up-nepa-scheduler.ps1](/c:/FTC%20HOLDING/scripts/up-nepa-scheduler.ps1)

## Thresholds

Default thresholds in the script:

- `5h` window: switch when `20%` or less remains
- `Week` window: switch when `10%` or less remains

## Current Requirement

OpenClaw must have both Codex auth profiles saved locally before automatic switching can work.

Right now this machine already has:

- `peacepad@peacepad.ca`

The backup account still needs to be added once:

```powershell
openclaw models auth login --provider openai-codex
```

Sign in with `fejiro.ontario@gmail.com`, then confirm both profiles exist:

```powershell
openclaw models status
```

## Install Or Remove The Scheduler

Install:

```powershell
powershell -ExecutionPolicy Bypass -File C:\FTC HOLDING\scripts\up-nepa-scheduler.ps1
```

Remove:

```powershell
powershell -ExecutionPolicy Bypass -File C:\FTC HOLDING\scripts\up-nepa-scheduler.ps1 -Remove
```

## Dry Run

```powershell
powershell -ExecutionPolicy Bypass -File C:\FTC HOLDING\scripts\up-nepa.ps1 -DryRun
```

## Notification Path

Notifications go to the linked Telegram operator chat using the existing OpenClaw Telegram bot token from `~\.openclaw\openclaw.json`.

## Notes

- The switch works by changing the OpenClaw auth order for `openai-codex`.
- It does not invent credentials. The backup account has to be authenticated once first.
- State is stored locally in `~\.openclaw\up-nepa-state.json`.
