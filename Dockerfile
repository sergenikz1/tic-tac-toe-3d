# Фуллстек-образ: один контейнер = фронтенд (React/Vite) + бэкенд (Express +
# Socket.IO). Express отдаёт собранную статику фронта с того же origin, что и API.
# Данные хранятся в отдельном Directus (см. README). Postgres — база для Directus.
#
# В Dokploy для приложения укажи:  Build Context = "."  и  Dockerfile = "Dockerfile".

FROM node:22-alpine AS base
WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# --- Зависимости всей монорепы (слой кешируется по package.json) ---
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm install

# --- Сборка ---
# Vite вшивает VITE_*-переменные в бандл во время сборки. В фуллстеке фронт и API
# на одном origin, поэтому VITE_SERVER_URL обычно НЕ нужен (клиент сам берёт
# window.location.origin). Задай только имя бота для кнопки «Поделиться».
ARG VITE_BOT_USERNAME
ARG VITE_DEV_AUTH=0
ARG VITE_SERVER_URL
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME
ENV VITE_DEV_AUTH=$VITE_DEV_AUTH
ENV VITE_SERVER_URL=$VITE_SERVER_URL

COPY . .
RUN npm run build:core              # общий пакет логики
RUN npm run build -w @ttt3d/web     # фронт -> apps/web/dist
RUN npm run build -w @ttt3d/server  # бэкенд -> apps/server/dist

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

WORKDIR /app/apps/server
# Сервер раздаёт apps/web/dist и сам создаёт коллекции players/matches в Directus.
CMD ["node", "dist/index.js"]
