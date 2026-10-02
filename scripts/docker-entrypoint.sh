#!/bin/sh
set -eu

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"

DB_FILE="${NUXT_DB_FILE:-/data/db/stash.db}"
mkdir -p "$(dirname "$DB_FILE")"

exec litestream replicate \
  -config /etc/litestream.yml \
  -restore-if-db-not-exists \
  -exec "node /app/.output/server/index.mjs"
