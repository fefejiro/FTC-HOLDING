# PeacePad v2 Testing

## Unit Tests (v2)

Run targeted v2 suite:

```bash
npx vitest run \
  tests/unit/v2/intentRouter.test.ts \
  tests/unit/v2/conflictCheck.test.ts \
  tests/unit/v2/rewriteMessage.test.ts \
  tests/unit/v2/supportDiscovery.test.ts \
  tests/unit/v2/fallback.test.ts \
  tests/unit/v2/orchestrator.test.ts \
  tests/unit/v2/envelopeContract.test.ts
```

Coverage focus:
- canonical envelope contract for all v2 endpoints (`ui.version=1`, top-level keys)
- orchestrator session lifecycle and safety gating
- deterministic fallback behavior for conflict/router degradation

## Local Smoke Commands

Assume local server at `http://localhost:5000`.

### 1) New session orchestrate

```bash
curl -s -X POST http://localhost:5000/v2/conversation/orchestrate \
  -H 'content-type: application/json' \
  -d '{
    "sessionId": null,
    "user": {"userId":"user-123","locale":"en-CA","tz":"America/Toronto"},
    "mode":"task",
    "message":{"text":"Help me reply calmly to this message","source":"typed"},
    "userChoice": null,
    "contextHints":{"coparentTone":"direct","userTone":"gentle"},
    "debug": false
  }'
```

### 2) Reuse session orchestrate

```bash
curl -s -X POST http://localhost:5000/v2/conversation/orchestrate \
  -H 'content-type: application/json' \
  -d '{
    "sessionId":"REPLACE_WITH_SESSION_UUID",
    "user": {"userId":"user-123","locale":"en-CA","tz":"America/Toronto"},
    "mode":"task",
    "message":{"text":"I need another draft with firmer boundaries","source":"typed"},
    "userChoice":{"moduleId":"PP_MOD_REWRITE_MESSAGE"},
    "contextHints":{"coparentTone":"direct","userTone":"gentle"},
    "debug": false
  }'
```

### 3) Router endpoint

```bash
curl -s -X POST http://localhost:5000/v2/router/intent \
  -H 'content-type: application/json' \
  -d '{"text":"Help me rewrite this message"}'
```

### 4) Conflict-check endpoint

```bash
curl -s -X POST http://localhost:5000/v2/modules/conflict-check \
  -H 'content-type: application/json' \
  -d '{"text":"If you deny access again I will take legal action"}'
```

### 5) Rewrite-message endpoint

```bash
curl -s -X POST http://localhost:5000/v2/modules/rewrite-message \
  -H 'content-type: application/json' \
  -d '{"text":"You never listen to anything"}'
```

### 6) Support-discovery endpoint

```bash
curl -s -X POST http://localhost:5000/v2/modules/support-discovery \
  -H 'content-type: application/json' \
  -d '{"query":"family support","conflict_level":4}'
```

### 7) Health endpoint

```bash
curl -s http://localhost:5000/v2/health
```

## v1 Guardrail

Confirm a legacy endpoint remains unchanged:

```bash
curl -s http://localhost:5000/api/version
```
