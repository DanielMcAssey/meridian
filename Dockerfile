# Pre-built by CI — this image only runs the output.
# The .output directory is produced by `npm run build` in the workflow
# and passed in as build context, so no Node toolchain is needed here.

FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production
# NUXT_DB_PATH overrides runtimeConfig.dbPath — must use NUXT_ prefix for Nuxt to pick it up
ENV NUXT_DB_PATH=/data/leaderboard.db

# Copy the pre-built Nuxt server output
COPY .output ./.output

# SQLite data directory — mount a named volume here in production
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/leaderboard || exit 1

CMD ["node", ".output/server/index.mjs"]
