# PeacePad Security Model

Last updated: 2026-07-23

## Security goals

- Protect account access.
- Protect private co-parenting records.
- Prevent cross-user data leaks.
- Preserve evidence integrity for user-owned records.
- Keep operational credentials out of source control.

## Minimum controls

- Environment variables for secrets.
- Authenticated server-side access checks.
- Rate limits for messages, uploads, and AI routes.
- Audit logs for sensitive actions.
- Safe file upload validation.
- Separate production, staging, and local credentials.

## Future Premium requirements

- Document-level ownership checks.
- Download/export audit events.
- Optional tamper-evident hashes for uploaded evidence.
- Professional access invitations with revocation.
- Incident runbook for exposed documents.

