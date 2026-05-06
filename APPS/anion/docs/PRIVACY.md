# Anion Class App — Privacy Policy

**Version:** 1.0-draft  
**Last Updated:** 2026-05-07  
**Status:** Implementation-ready placeholder — legal signoff required before publishing

---

## 1. Who We Are

Anion is an online tutoring platform that connects parents/students with tutors for live, scheduled lessons.

**Data Controller:** [Business legal name — insert before launch]  
**Contact:** [privacy@yourdomain.com — insert before launch]

---

## 2. Data We Collect

| Category | Examples | Purpose |
|----------|----------|---------|
| Account data | Email address, role (parent/tutor/student/admin) | Authentication, role-based access |
| Profile data | Display name, preferences | Personalisation |
| Booking data | Lesson dates, tutor/student pairs, booking status | Session management |
| Billing data | Stripe customer ID, subscription plan, subscription status | Subscription billing via Stripe |
| Session data | Daily.co room name, join timestamps | Live classroom delivery |
| Usage data | Page views, API calls, error logs | Platform health and debugging |

> **Note:** We do not store raw payment card details. Card processing is handled entirely by Stripe, which is PCI-DSS Level 1 certified.

---

## 3. How We Use Data

- Provide the tutoring service (booking, classroom, billing)
- Send transactional emails (magic-link login, booking confirmations)
- Enforce role-based access control
- Monitor platform health and investigate errors
- Comply with legal obligations

We do **not** sell personal data to third parties.

---

## 4. Third-Party Processors

| Processor | Purpose | Privacy Policy |
|-----------|---------|---------------|
| Supabase | Database, authentication, row-level storage | https://supabase.com/privacy |
| Stripe | Payment processing and subscription management | https://stripe.com/privacy |
| Daily.co | Live video classroom infrastructure | https://www.daily.co/privacy |
| Cloudflare | CDN, edge compute (Workers/Pages), DDoS protection | https://www.cloudflare.com/privacypolicy/ |

All processors are contractually required to protect data in accordance with applicable data protection law.

---

## 5. Data Retention

| Data Type | Retention Period | Deletion Trigger |
|-----------|-----------------|-----------------|
| Account & profile | Duration of account + 90 days | Account deletion request |
| Booking records | 2 years from lesson date | Automatic purge job |
| Billing records | 7 years | Legal/tax requirement (may vary by jurisdiction) |
| Video session metadata | 30 days | Automatic purge via Daily.co |
| Error logs | 30 days | Rolling log rotation |
| Auth tokens | Session lifetime (auto-expiry) | Sign-out or token expiry |

---

## 6. Your Rights

Depending on your jurisdiction, you may have the right to:

- **Access** — request a copy of personal data we hold
- **Rectification** — correct inaccurate data
- **Erasure** ("right to be forgotten") — request deletion of your account and associated personal data
- **Portability** — receive your data in a portable format
- **Objection** — object to certain processing activities

To exercise any of these rights, contact: **[privacy@yourdomain.com]**

We will respond within **30 days** of a verified request.

---

## 7. Data Deletion Process

**How to request deletion:**

1. Email **[privacy@yourdomain.com]** with subject line: `Data Deletion Request — Anion`
2. Include the email address associated with your account
3. We will verify your identity and confirm receipt within **5 business days**
4. Deletion (or suppression where legal retention applies) is completed within **30 days**

**Technical deletion steps (operators):**

```sql
-- Remove user profile and cascade to user_roles
DELETE FROM profiles WHERE email = 'user@example.com';

-- Stripe: cancel subscription and delete customer via Stripe dashboard or API
-- curl -X DELETE https://api.stripe.com/v1/customers/{customer_id} \
--   -u sk_live_...:
```

> Billing records subject to tax retention periods are suppressed (anonymised), not hard-deleted.

---

## 8. Cookies and Tracking

Anion uses:

- **Session cookies** — required for authentication (Supabase auth tokens stored in `localStorage` or secure cookies)
- **No third-party advertising trackers**

A cookie consent banner should be implemented before public launch if operating in the EU/UK.  
**[Placeholder: insert cookie consent implementation details]**

---

## 9. Security

- All data in transit is encrypted via TLS 1.2+
- Supabase Row-Level Security (RLS) enforces data isolation per user role
- Stripe handles all PCI scope; raw card data never touches Anion servers
- Service role keys are stored as Cloudflare secrets (not in source code)
- Access to production systems is restricted to named operators

---

## 10. Children's Privacy

Anion provides tutoring services that may involve students under the age of 18. Accounts for minors must be created and managed by a parent or legal guardian. We do not knowingly collect personal data from children under 13 without verifiable parental consent.

**[Placeholder: confirm minimum age policy and COPPA/GDPR-K compliance approach before launch]**

---

## 11. Changes to This Policy

We will notify registered users of material changes via email at least **14 days** before the change takes effect. Continued use of the platform after that date constitutes acceptance.

---

## 12. Contact

**Privacy enquiries:** [privacy@yourdomain.com]  
**Postal address:** [Insert registered business address]  
**Data Protection Officer:** [Insert name/contact if required]

---

*This document is a placeholder and requires review by a qualified legal professional before publication.*
