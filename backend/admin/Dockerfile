# Next.js Admin panel. Build context must be the backend/ workspace root.
# Coolify: Base Directory = backend, Dockerfile = admin/Dockerfile
# NEXT_PUBLIC_API_URL is baked in at build time (rebuild when the API domain changes).

FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY admin/package.json ./admin/

RUN npm ci --ignore-scripts

FROM deps AS build
COPY admin ./admin

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm --workspace admin run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/admin/public ./admin/public
COPY --from=build --chown=nextjs:nodejs /app/admin/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/admin/.next/static ./admin/.next/static

USER nextjs
EXPOSE 4000

CMD ["node", "admin/server.js"]
