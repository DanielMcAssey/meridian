# Pre-built by CI — this image only runs the output.
# The .output directory is produced by `npm run build` in the workflow
# and passed in as build context, so no Node toolchain is needed here.

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
# Override with -e DB_PATH=... or a Docker volume mount path
ENV DB_PATH=/data/leaderboard.db

# Copy the pre-built Nuxt server output
COPY .output ./.output

# SQLite data directory — mount a named volume here in production
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/leaderboard || exit 1

CMD ["node", ".output/server/index.mjs"]
