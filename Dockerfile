# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
ARG LITESTREAM_VERSION=0.5.14

# --- build ---
FROM node:${NODE_VERSION}-bookworm AS build

RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG S3_BUCKET
ARG S3_ENDPOINT
ARG S3_REGION=auto

ENV NODE_ENV=production \
  NITRO_PRESET=node-server \
  NUXT_PUBLIC_API_URL=/api/ \
  S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID} \
  S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY} \
  S3_BUCKET=${S3_BUCKET} \
  S3_ENDPOINT=${S3_ENDPOINT} \
  S3_REGION=${S3_REGION}
RUN APP_JWT_SECRET=docker-build-placeholder \
  NUXT_SESSION_PASSWORD=docker-build-placeholder-min-32-chars!! \
  pnpm build

# --- runtime ---
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ARG LITESTREAM_VERSION

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fsSL -o /tmp/litestream.tar.gz \
    "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-x86_64.tar.gz" \
  && tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz \
  && rm -f /tmp/litestream.tar.gz \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/.output ./.output
COPY --from=build /app/server/database/migrations ./server/database/migrations
COPY litestream.yml /etc/litestream.yml
COPY scripts/docker-entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
  && mkdir -p /data/db

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  NUXT_DB_FILE=/data/db/stash.db \
  S3_REGION=auto

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
