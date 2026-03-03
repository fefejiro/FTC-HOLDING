# Production Guest Auth Checklist

## 1) DNS for `api.peacepad.ca`

- `api.peacepad.ca` must resolve to the Railway target hostname using a single `CNAME` record.
- Do not keep conflicting records for the same name (`A`, `AAAA`, or multiple `CNAME` records).
- During initial verification and troubleshooting, set Cloudflare proxy mode to **DNS only** (gray cloud), not proxied.
- After TLS/domain verification is stable, re-enable proxying only if you have validated cookie and CORS behavior end to end.

## 2) Health Endpoints (must return JSON)

These endpoints should all return `200` with JSON payloads:

- `https://peacepad.ca/health`
- `https://peacepad.ca/api/health`
- `https://api.peacepad.ca/health`
- `https://api.peacepad.ca/api/health`

Expected response shape (example):

```json
{
  "status": "ok",
  "timestamp": 1735689600000
}
```

## 3) Guest Login Cookie Expectations

Request:

- `POST /api/auth/guest` with JSON body (for example `{ "displayName": "GuestSmoke" }`)

Expected response behavior:

- Includes `Set-Cookie` for `peacepad_guest=...`
- Cookie attributes include:
  - `HttpOnly`
  - `Path=/`
  - `Max-Age` near 14 days
  - `SameSite=Lax` for same-origin web traffic
  - `SameSite=None; Secure` for secure cross-site/native-webview traffic

Follow-up validation:

- Send `GET /api/session` with the returned `peacepad_guest` cookie.
- Response should indicate guest session (`sessionType: "guest"`).
