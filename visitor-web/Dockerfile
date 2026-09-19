# Visitor Web (Vite + nginx). Build context = visitor-web/
# Coolify: Base Directory = visitor-web, Dockerfile = Dockerfile
# VITE_API_URL is baked in at build time (rebuild when the API domain changes).

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY public ./public
COPY src ./src
COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.js ./

ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
