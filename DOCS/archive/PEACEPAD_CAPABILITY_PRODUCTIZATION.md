# PeacePad Capability Productization

## 1) Canonical API Contract

### Endpoint
- `POST /api/v1/message/preflight`
- Auth:
  - Session cookies (`credentials: include`), same as PeacePad web/app
  - Optional API-key auth (`x-api-key`) using `PEACEPAD_ACTIONS_API_KEY`
- Feature flag:
  - `FEATURE_EXTERNAL_PREFLIGHT_API=true` (or `PEACEPAD_EXTERNAL_PREFLIGHT_API=true`)
  - default behavior: enabled outside production, disabled by default in production unless flag is set.

### Request
```json
{
  "text": "You always forget pickup and never listen.",
  "context": "co-parenting",
  "channel": "whatsapp",
  "mode": "manual",
  "metadata": {
    "conversation_id": "conv_123",
    "site": "whatsapp"
  }
}
```

### Response
```json
{
  "conflict_score": 67,
  "risk_level": "high",
  "signals": [
    {
      "category": "linguistic",
      "code": "escalating_language",
      "weight": 20,
      "description": "Belittling language detected"
    }
  ],
  "moderation_flags": ["coercive_language"],
  "recommendation": "review_and_rewrite",
  "calm_version": "Could we discuss pickup timing calmly?",
  "send_policy": {
    "allow_send_original": true,
    "requires_acknowledgement": false,
    "recommended_action": "review_and_rewrite",
    "pause_minutes": 20
  },
  "model_or_ruleset_version": {
    "contract": "preflight-v1",
    "tone_model": "gpt-4o-mini",
    "escalation_ruleset": "ces-v1"
  },
  "source": {
    "tone": "hostile",
    "summary": "Escalating message"
  }
}
```

### Notes
- Wrapper uses existing `/api/messages/preview` analysis path logic (tone + CES + rewrite).
- Existing app routes are unchanged.
- For extension production testing, include `chrome-extension://<id>` in `CORS_ALLOWED_ORIGINS`.

## 2) Extension Architecture (MV3)

### Location
- `APPS/peacepad-extension`

### Components
- `dist/background.js`: calls canonical preflight API through SDK.
- `dist/content.js`: passive draft watcher + debounce + pre-send gate + thresholded intervention modal.
- `dist/popup.html` + `dist/popup.js`: site-aware settings UI.

### Supported sites (v1)
- `https://web.whatsapp.com/*`
- `https://mail.google.com/*`
- `https://app.slack.com/*`

### Behavior
- Auto-first: silent background checks while typing.
- Debounced analysis to avoid per-keystroke API calls.
- Pre-send gate runs on Enter for drafts that have not been safely cleared.
- Result modal offers:
  - Use suggested version
  - Edit suggested version
  - Send original
  - Cancel
- Per-site auto mode can be toggled from popup settings.

## 3) SDK Usage

### Package
- `@ftc/peacepad-sdk`
- Location: `PACKAGES/peacepad-sdk`

### Example
```ts
import { createPeacepadClient } from "@ftc/peacepad-sdk";

const client = createPeacepadClient({
  baseUrl: "https://api.peacepad.ca",
  credentials: "include",
});

const result = await client.analyzeMessage({
  text: "You never listen.",
  channel: "whatsapp",
});

console.log(result.risk_level, result.calm_version);
```

### Error handling
- Non-2xx responses throw `PeacepadApiError` with `status` and `body`.
- Malformed payloads throw validation errors.

## 4) Integration Roadmap and Policy Constraints

### Browser-surface integrations (near-term)
- WhatsApp Web, Gmail, Slack via extension content scripts.
- Low-friction validation of value and UX.

### Official platform integrations (mid/long-term)
- WhatsApp: Meta WhatsApp Business Platform / Cloud API.
- Instagram messaging: Meta business messaging stack.
- Slack: Slack app framework (shortcuts, events, interactions).
- Teams: Microsoft Teams app + Graph APIs.

### Unsupported / risky approaches
- Unofficial automation that bypasses platform terms.
- Deep interception patterns that violate host site policy or user expectations.
- Assuming unlimited cross-site cookie behavior across browser privacy modes.

## 5) Build + Test Commands

### PeacePad API tests
```powershell
npm --prefix APPS/peacepad run test -- --run tests/unit/preflightContract.test.ts tests/unit/previewContractParity.test.ts tests/unit/cesEscalation.test.ts
```

### SDK
```powershell
npm --prefix PACKAGES/peacepad-sdk run test
npm --prefix PACKAGES/peacepad-sdk run build
```

### Extension
```powershell
npm --prefix APPS/peacepad-extension run test
npm --prefix APPS/peacepad-extension run build
```

Load unpacked extension from `APPS/peacepad-extension` (manifest at root, assets in `dist/`).
