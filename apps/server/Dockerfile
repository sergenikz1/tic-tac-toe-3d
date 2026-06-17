# Бэкенд (Express + Socket.IO). Данные — в Directus по HTTP.
# ВАЖНО: контекст сборки = КОРЕНЬ репозитория (зависит от packages/game-core).
# В Dokploy:  Dockerfile = "apps/server/Dockerfile",  Build Context = ".".

FROM node:22-alpine AS base
WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Зависимости монорепы (слой кешируется по package.json)
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/server/package.json apps/server/
RUN npm install

COPY . .
RUN npm run build:core
RUN npm run build -w @ttt3d/server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/apps/server
# Фронт раздаётся отдельным приложением (apps/web), поэтому сервер работает в
# API-only режиме и сам создаёт коллекции players/matches в Directus при старте.
CMD ["node", "dist/index.js"]
