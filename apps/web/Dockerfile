# ВАЖНО: контекст сборки = КОРЕНЬ репозитория (а не apps/web),
# потому что веб зависит от workspace-пакета packages/game-core.
# В Dokploy укажи:  Build Context = "."  и  Dockerfile = "apps/web/Dockerfile".

# ---------- Этап сборки ----------
FROM node:22-alpine AS build
WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Установка зависимостей всей монорепы (кеш по package.json)
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY apps/web/package.json apps/web/
RUN npm install

# Vite вшивает VITE_*-переменные в бандл во время сборки — пробрасываем их как ARG.
# В Dokploy задай эти значения как Build-time переменные.
ARG VITE_SERVER_URL
ARG VITE_DEV_AUTH=0
ARG VITE_BOT_USERNAME
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_DEV_AUTH=$VITE_DEV_AUTH
ENV VITE_BOT_USERNAME=$VITE_BOT_USERNAME

COPY . .
RUN npm run build:core
RUN npm run build -w @ttt3d/web   # результат в apps/web/dist

# ---------- Этап раздачи статики ----------
FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
