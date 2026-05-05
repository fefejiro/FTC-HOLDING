# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## Secret Handling Rules

- Never place secrets in `client/public` or any committed file.
- Keep API keys and credentials only in Cloudflare Pages environment variables or local `.env.local`.
- Run `npm run guard:openai-secrets` before commit to block accidental OpenAI key-like strings.
- OpenAI domain verification files are public by design and should contain only the verification token.
