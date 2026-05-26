# Uses Node 24 which includes node:sqlite as a stable built-in.
# No native compilation required — the image stays lean.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Override with -e DB_PATH=... or set a Docker volume mount path
ENV DB_PATH=/data/leaderboard.db

# Copy Nuxt server output (JS bundles + public assets)
COPY --from=builder /app/.output ./.output

# SQLite data directory — mount a named volume here in production
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/leaderboard || exit 1

CMD ["node", ".output/server/index.mjs"]
