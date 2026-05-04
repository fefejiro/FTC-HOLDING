# Tow Signal - Decision Log

## 2026-05-04: Rebrand public product name to Tow Signal
- **Decision:** Public-facing product name changes from Dispatch to Tow Signal.
- **Rationale:** Tow Signal is more memorable, more ownable, and better positioned than a generic Dispatch label for app-store, SEO, and client recall.
- **Impact:** User-facing docs, product pages, app metadata, and public UI should say Tow Signal. Internal repo paths, service IDs, and runtime names may remain Dispatch during transition.

## 2026-04-20: Started reliability hardening sprint
- **Decision:** Focus this week on making the product unbreakable before adding features.
- **Rationale:** Live paying clients (Kevin, Cheta). Revenue-first. No new features until existing flow is solid.
- **Impact:** No new feature work this week.

## 2026-04-02: Removed QA/sample jobs from production
- **Decision:** Purged demo-tagged and QA/sample jobs from production storage.
- **Rationale:** Production data hygiene. Only real roadside operations data in production.

## 2026-03-XX: Split admin onto private subdomain
- **Decision:** Admin lives on dispatch-admin.unalabs.cloud, not the public domain.
- **Rationale:** Security. Admin PIN creates HTTP-only session cookie. Proxy key stays server-side.
- **Impact:** Public surface never exposes admin credentials.

## [Add new decisions here with date + rationale]
