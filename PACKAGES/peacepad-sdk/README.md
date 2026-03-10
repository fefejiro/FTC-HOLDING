# @ftc/peacepad-sdk

Typed client for PeacePad canonical preflight API.

## API
- `createPeacepadClient(options)`
- `client.analyzeMessage(request)`
- `client.rewriteMessage(request)`

## Example
```ts
import { createPeacepadClient } from "@ftc/peacepad-sdk";

const client = createPeacepadClient({
  baseUrl: "https://api.peacepad.ca",
  credentials: "include",
});

const result = await client.analyzeMessage({ text: "You always forget pickup." });
console.log(result.risk_level, result.calm_version);
```
