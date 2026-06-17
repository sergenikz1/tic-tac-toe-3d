# ВАЖНО: контекст сборки = КОРЕНЬ репозитория (а не apps/server),
# потому что сервер зависит от workspace-пакета packages/game-core.
# В Dokploy укажи:  Build Context = "."  и  Dockerfile = "apps/server/Dockerfile".

FROM node:22-alpine AS base
WORKDIR /app

# На случай флапов CDN — ретраи npm с нарастающим backoff.
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# --- Установка зависимостей всей монорепы (слой кешируется по package.json) ---
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/server/package.json apps/server/
RUN npm install

# --- Сборка ---
COPY . .
RUN npm run build:core           # общий пакет логики игры
RUN npm run build -w @ttt3d/server   # компиляция сервера в dist/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/apps/server
# Данные хранятся в Directus (по HTTP), поэтому никаких миграций при старте.
# Сервер сам создаст коллекции players/matches в Directus, если их нет.
CMD ["node", "dist/index.js"]
