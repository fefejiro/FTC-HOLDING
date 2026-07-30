# PeacePad Authorization Matrix v0.1

Status: PROPOSED - DESIGN ONLY
Data: synthetic examples only

All access is deny-by-default. Client-supplied user IDs, family IDs, roles,
consent, timestamps, and ownership claims are untrusted.

| Resource/action | Owner parent | Co-parent | Professional viewer | Support operator | Service |
| --- | --- | --- | --- | --- | --- |
| Shared message read | family grant | family grant | explicit time-bound scope | no content by default | delivery only |
| Shared message correct | linked correction only | linked correction only | never | never | never |
| Calendar/expense read | family grant | family grant | explicit scope | metadata only when authorized | job scope |
| Private Binder read | owner only | never by default | explicit export/binder grant | never by default | malware/index job only |
| Original artifact read | owner/grant + purpose | shared artifact grant only | explicit export grant | incident break-glass | scoped processor |
| Evidence annotate | owner | never by default | explicit comment scope | never | never |
| Export generate | owner | own/shared authorized scope | delegated scope | never | deterministic export job |
| Grant professional access | owner with re-auth | separate own decision | never | never | never |
| Delete own account | self with re-auth | self only | self only | admin workflow only | never |
| Apply legal preservation | authorized custodian workflow | no | no | named custodian only | policy job |

Every successful or denied sensitive action records an append-only `AuditEvent`
without message bodies, artifact content, child details, tokens, or precise
location.

Before backend implementation, each row requires:

- server-derived actor identity;
- active, unrevoked `ParticipantGrant`;
- family/region binding;
- purpose and consent check where applicable;
- idempotency and optimistic concurrency for writes;
- adversarial ownership tests.
