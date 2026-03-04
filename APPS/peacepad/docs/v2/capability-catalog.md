# PeacePad v2 Capability Catalog

Canonical source: `server/v2/registry/moduleRegistry.ts`

## Modules
| Module ID | Title | Endpoint | Risk | Description | Tags |
| --- | --- | --- | --- | --- | --- |
| `PP_MOD_ROUTER_INTENT` | Intent Router | `/v2/router/intent` | low | Routes free-form intent to the best next v2 module. | routing, intent, orchestration |
| `PP_MOD_CONFLICT_CHECK` | Conflict Check | `/v2/modules/conflict-check` | medium | Detects escalation risk, conflict level, and safety signals. | conflict, safety, analysis |
| `PP_MOD_REWRITE_MESSAGE` | Rewrite Message | `/v2/modules/rewrite-message` | medium | Produces calm/neutral/boundary rewrites for safer communication. | rewrite, tone, communication |
| `PP_MOD_SUPPORT_DISCOVERY` | Support Discovery | `/v2/modules/support-discovery` | high | Ranks support resources with crisis-first gating under high risk. | resources, support, safety |
