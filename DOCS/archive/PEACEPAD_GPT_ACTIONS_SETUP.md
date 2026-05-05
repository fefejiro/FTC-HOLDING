# PeacePad GPT Actions Setup (API Key)

This setup avoids cookie-session issues in GPT Actions by using a dedicated API-key protected endpoint.

## Server Endpoint
- `POST /api/actions/preview-tone`

Required header:
- `x-api-key: <PEACEPAD_ACTIONS_API_KEY>`

Accepted alternative:
- `Authorization: Bearer <PEACEPAD_ACTIONS_API_KEY>`

## Required API Environment Variable
Set this on the PeacePad API service (Railway):

- `PEACEPAD_ACTIONS_API_KEY=<long-random-secret>`

Do not commit this value to git.

## GPT Actions Authentication Settings
In GPT editor -> `Actions`:

1. Authentication -> `API Key`
2. API Key name: `x-api-key`
3. API Key location: `Header`
4. API Key value: set the same value as `PEACEPAD_ACTIONS_API_KEY`

## OpenAPI Schema (single action)
Use this schema in GPT Actions:

```yaml
openapi: 3.1.0
info:
  title: PeacePad Actions API
  version: 1.0.0
servers:
  - url: https://api.peacepad.ca
paths:
  /api/actions/preview-tone:
    post:
      operationId: previewMessageTone
      summary: Analyze tone and return calmer rewrite suggestion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              additionalProperties: false
              required:
                - content
              properties:
                content:
                  type: string
                conversationHistory:
                  type: array
                  items:
                    type: string
      responses:
        "200":
          description: Tone preview result
          content:
            application/json:
              schema:
                type: object
                properties:
                  tone:
                    type: string
                  summary:
                    type: string
                  emoji:
                    type: string
                  rewordingSuggestion:
                    type: string
                    nullable: true
                  originalMessage:
                    type: string
        "400":
          description: Bad request
        "401":
          description: Unauthorized
        "500":
          description: Server error
        "503":
          description: Actions API key not configured on server
```

## Test Payload
```json
{
  "content": "You're late again. You never respect the schedule."
}
```
