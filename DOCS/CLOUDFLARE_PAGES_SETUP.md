# Cloudflare Pages Setup

Use one Pages project per frontend.

## PeacePad Frontend

- Project root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm exec vite build`
- Build output directory: `dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.peacepad.ca`

Custom domains:

- `peacepad.ca`
- `www.peacepad.ca`

## SayWetin Frontend

- Project root directory: `APPS/saywetin`
- Install command: `npm install`
- Build command: `npm exec vite build`
- Build output directory: `dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.saywetin.app`

Custom domains:

- `saywetin.app`
- `www.saywetin.app`
