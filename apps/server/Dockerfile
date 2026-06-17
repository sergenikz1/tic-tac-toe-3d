# ВАЖНО: контекст сборки = КОРЕНЬ репозитория (а не apps/server),
# потому что сервер зависит от workspace-пакета packages/game-core.
# В Dokploy укажи:  Build Context = "."  и  Dockerfile = "apps/server/Dockerfile".

FROM node:22-bookworm-slim AS base
WORKDIR /app

# Prisma query engine требует OpenSSL и CA-сертификаты (для скачивания движка).
# bookworm-slim (Debian, glibc) — самый беспроблемный вариант под Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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
# 1) общий пакет логики игры
RUN npm run build:core
# 2) Prisma Client (DATABASE_URL на этапе сборки не используется реально —
#    задаём заглушку, реальный URL придёт из переменных Dokploy в рантайме)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run prisma:generate -w @ttt3d/server
# 3) компиляция сервера в dist/
RUN npm run build -w @ttt3d/server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/apps/server
# При старте применяем схему к базе (создаёт/обновляет таблицы), затем запуск.
# Без --accept-data-loss: разрушающее изменение схемы остановит деплой с ошибкой
# вместо тихой потери данных. DATABASE_URL приходит из переменных Dokploy.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
