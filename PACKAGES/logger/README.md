# @ftc/logger

Structured logger shared across FTC services.

## Axiom transport

```ts
import { axiomTransport, createLogger } from "@ftc/logger";

const logger = createLogger("service-name", {
  transports: [axiomTransport({ token: process.env.AXIOM_TOKEN!, dataset: process.env.AXIOM_DATASET! })],
});
```

`axiomTransport({ token, dataset })` sends JSON log entries to:

- `https://api.axiom.co/v1/datasets/<dataset>/ingest`

## Redaction

`@ftc/logger` automatically redacts sensitive keys (email, phone, payment/card, token/secret, auth/session/cookie fields) before writing logs or shipping to Axiom.

## Dashboard tile: errors per service

Create an Axiom tile with a query similar to:

```apl
['<DATASET_NAME>']
| where level == "error"
| summarize errors=count() by service
| order by errors desc
```
