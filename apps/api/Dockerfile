# syntax=docker/dockerfile:1
# Tek imaj, iki komut (BACKEND_SPEC §6): api ve worker.
#   docker run kabx-api node dist/main.api.js
#   docker run kabx-api node dist/main.worker.js

# ---- deps: sadece bağımlılıklar, katman önbelleği için ayrı ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: TypeScript derlemesi ----
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps: devDependencies olmadan ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# sharp'ın (Faz 3) alpine'da ihtiyaç duyduğu yerel kütüphane
RUN apk add --no-cache vips libc6-compat

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# root olarak çalışma
USER node

EXPOSE 3000

# SIGTERM doğrudan node'a ulaşsın diye shell formu değil exec formu kullanılıyor;
# graceful shutdown kancaları böylece çalışır.
CMD ["node", "dist/main.api.js"]
