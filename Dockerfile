# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
# Needs devDependencies, so a plain `npm ci` here.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Produces build/handler.js (SvelteKit) plus build/relay.js and
# build/relay-registry.js (esbuild). server.js needs all three.
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# su-exec lets the entrypoint fix disk ownership as root, then drop to `node`.
RUN apk add --no-cache su-exec

# Production dependencies only. The build output is mostly self-contained, but
# `ws` is deliberately left external by scripts/build-relay.js so Node resolves
# it the usual way.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/build ./build
COPY server.js ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Room snapshots. Mount a persistent disk here — on an ephemeral filesystem
# every pad is lost on redeploy.
ENV ROOM_STORAGE_DIR=/data/rooms
VOLUME ["/data"]

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
