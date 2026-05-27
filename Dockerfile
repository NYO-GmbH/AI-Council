# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Production dependencies (drizzle-orm + @libsql/client needed by migrate script)
COPY package*.json ./
RUN npm ci --omit=dev

# Nuxt/Nitro server output
COPY --from=builder /app/.output ./.output

# Migration SQL files — copied to /app/migrations so they aren't hidden by the
# /app/server/db volume mount that holds the SQLite file.
COPY --from=builder /app/server/db/migrations ./migrations

# Startup helpers
COPY docker/migrate.mjs ./migrate.mjs
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# /app/server/db  — SQLite database file (db.sqlite)
# /app/.data      — Nitro KV storage (LM Studio settings saved via UI)
VOLUME ["/app/server/db", "/app/.data"]

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

CMD ["./entrypoint.sh"]
