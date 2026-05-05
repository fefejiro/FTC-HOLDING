# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Use npm install (not npm ci) to tolerate platform-specific optional-deps
# divergence between local Node 24/npm 11 lockfile generation and
# container Node 22/npm 10 resolution. Lockfile still respected as input.
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build:prod

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["npm", "run", "start"]
