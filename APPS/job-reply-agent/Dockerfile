FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --workspaces=false
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY public ./public
RUN npm run build \
    && npm prune --omit=dev --workspaces=false \
    && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ARG RELEASE_SHA=unknown
ARG BUILD_TIMESTAMP=unknown
ENV RELEASE_SHA=$RELEASE_SHA
ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/public ./public
RUN chmod -R a+rX /app/public
USER node
EXPOSE 3000
CMD ["node", "dist/product_entrypoint.js"]
