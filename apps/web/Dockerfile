# Фронтенд (React/Vite) — статика через nginx.
# ВАЖНО: контекст сборки = КОРЕНЬ репозитория (зависит от packages/game-core).
# В Dokploy:  Dockerfile = "apps/web/Dockerfile",  Build Context = ".".

# ---------- Сборка ----------
FROM node:22-alpine AS build
WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/web/package.json apps/web/
RUN npm install

# Vite вшивает VITE_*-переменные в бандл во время сборки. При РАЗДЕЛЬНОМ деплое
# фронт и сервер на разных доменах — ОБЯЗАТЕЛЬНО задай VITE_SERVER_URL = публичный
# URL бэкенда (apps/server), иначе клиент не найдёт API. В Dokploy это Build-arg.
ARG VITE_SERVER_URL
ARG VITE_DEV_AUTH=0
ARG VITE_BOT_USERNAME
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_DEV_AUTH=$VITE_DEV_AUTH
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME

COPY . .
RUN npm run build:core
RUN npm run build -w @ttt3d/web   # результат в apps/web/dist

# ---------- Раздача статики ----------
FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
