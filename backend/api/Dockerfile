# NestJS API. Build context must be the backend/ workspace root.
# Coolify: Base Directory = backend, Dockerfile = api/Dockerfile

FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY admin/package.json ./admin/

RUN npm ci --ignore-scripts

FROM deps AS build
COPY api ./api
RUN npm --workspace api run prisma:generate \
  && npm --workspace api run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/data/uploads

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY admin/package.json ./admin/

# Production deps + prisma CLI (devDependency) for migrate deploy on boot.
RUN npm ci --omit=dev --ignore-scripts \
  && npm install prisma@5.22.0 --no-save --ignore-scripts \
  && chown -R nestjs:nodejs /app

COPY --from=build --chown=nestjs:nodejs /app/api/dist ./api/dist
COPY --from=build --chown=nestjs:nodejs /app/api/prisma ./api/prisma
COPY --chown=nestjs:nodejs api/docker-entrypoint.sh ./api/docker-entrypoint.sh

RUN chmod +x ./api/docker-entrypoint.sh \
  && mkdir -p /data/uploads \
  && chown -R nestjs:nodejs /data \
  && cd api && npx prisma generate

USER nestjs
WORKDIR /app/api
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
