# RUNBOOK - FTC Site

## Prerequisites

- Node.js v18+
- npm

## Install (repo root)

```powershell
npm install
```

## Dev

```powershell
npm --workspace=@ftc/ftc-site run dev
```

## Build

```powershell
npm --workspace=@ftc/ftc-site run build
```

## Test

```powershell
npm --workspace=@ftc/ftc-site run test:e2e
```

## DNS and TLS verification (launch)

```powershell
Resolve-DnsName ftc.peacepad.ca
curl -I https://ftc.peacepad.ca
```

## Launch readiness artifacts

- `docs/LAUNCH_READINESS_CHECKLIST.md`
- `docs/EXTERNAL_PROFILE_LINKAGE_PACK.md`
- `docs/LAUNCH_VERIFICATION_REPORT_2026-03-08.md`

## No-deploy policy in this pass

This implementation pass does not deploy or bind domains. It prepares a deploy-ready V1 for subdomain-first publishing.
