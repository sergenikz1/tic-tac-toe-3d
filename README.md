# 3D Tic-Tac-Toe (Score Four) — Telegram Mini App

Онлайн-игра «4 в ряд в пространстве» (поле 4×4×4, как настольная **Score Four /
Qubic**) в формате Telegram Mini App: вращаемая 3D-модель сверху, сетка-ввод 4×4
снизу, авторизация через Telegram, поиск соперников, мультиплеер в реальном времени
и таймер 1 минута на ход.

## Структура (монорепозиторий, npm workspaces)

```
packages/game-core   Общая логика: доска 4×4×4, генерация 76 выигрышных линий,
                     определение победы, сетевой протокол. Покрыта тестами.
apps/server          Node + Express + Socket.IO. Валидация Telegram initData,
                     JWT-сессии, матчмейкинг, игровые комнаты-арбитры, серверные
                     таймеры, рейтинг (Elo). Данные (игроки, матчи) — в Directus.
                     В продакшене ЭТОТ ЖЕ сервер раздаёт собранный фронтенд.
apps/web             Vite + React + react-three-fiber. Меню, профиль, матчмейкинг,
                     игровой экран (3D-доска + нижняя сетка + HUD с таймерами).
```

**Деплой — раздельные контейнеры**, у каждого свой Dockerfile (контекст сборки =
корень репо):
- `apps/web/Dockerfile` — фронтенд (статика через nginx);
- `apps/server/Dockerfile` — бэкенд (Express + Socket.IO, API-only);
- `directus/Dockerfile` — Directus (данные + админка);
- + **PostgreSQL** (база для Directus).

При раздельном деплое фронт и сервер на разных доменах — при сборке фронта задай
build-arg `VITE_SERVER_URL` = публичный URL бэкенда. (Если сервер сам найдёт
`apps/web/dist` рядом — он отдаст и фронт; но при раздельных контейнерах фронт
обслуживает nginx.)

## Правила (76 выигрышных линий)

Координаты ячейки `(x, y, h)`: `x,y` — столбик (0..3), `h` — высота бусины (0..3).

| Тип | Описание | Кол-во |
|-----|----------|--------|
| Вертикаль | 4 бусины на одном столбике | 16 |
| Ряд / столбец в слое | горизонтальная линия на уровне | 32 |
| Диагональ внутри слоя | диагональ одного уровня | 8 |
| Диагональ через слои | подъём по диагонали в вертикальной плоскости | 16 |
| Пространственная диагональ | из угла куба в противоположный | 4 |
| | **Итого** | **76** |

## Запуск локально

1. Установить зависимости и собрать общий пакет:
   ```bash
   npm install
   npm run build:core
   ```
2. Настроить окружение: скопировать `.env.example` → `.env` (в корне), задать
   значения. Для локальной игры без Telegram поставьте `DEV_AUTH=1` и
   `VITE_DEV_AUTH=1`.
3. Поднять Directus и задать `DIRECTUS_URL` + `DIRECTUS_TOKEN` в `.env`
   (см. раздел про Directus ниже). Коллекции `players`/`matches` сервер создаст
   сам при первом запуске. Для локали Directus можно поднять в Docker:
   ```bash
   docker run --name ttt3d-directus -p 8055:8055 \
     -e KEY=dev-key -e SECRET=dev-secret \
     -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=admin123 \
     -e DB_CLIENT=sqlite3 -e DB_FILENAME=/directus/database/data.db \
     -d directus/directus:latest
   # затем в админке http://localhost:8055 создай статический токен и положи в DIRECTUS_TOKEN
   ```
4. В двух терминалах (локально фронт и бэк раздельно — удобнее для HMR):
   ```bash
   npm run dev:server   # http://localhost:3001
   npm run dev:web      # http://localhost:5173
   ```
   Для локалки выстави `VITE_SERVER_URL=http://localhost:3001` (фронт на :5173
   ходит на сервер :3001). В продакшене эта переменная пустая — фронт берёт
   тот же origin, что и страница.
5. Открыть `http://localhost:5173` в двух вкладках (в dev-режиме каждый получает
   случайного игрока) → «Найти соперника» → играть.

> Сервер читает переменные из `.env` в корне репозитория. Переменные с префиксом
> `VITE_` вшиваются во фронт при сборке (см. `.env.example`).

## Тесты

```bash
npm test   # vitest в packages/game-core (проверяет ровно 76 линий и все категории побед)
```

## Деплой как Telegram Mini App

1. Создать бота в [@BotFather](https://t.me/BotFather), получить `BOT_TOKEN`.
2. Задеплоить **фуллстек-приложение** (`./Dockerfile`) на публичном **HTTPS**
   (Telegram требует HTTPS) — это и фронт, и API сразу. Отдельно — Directus.
3. В переменных приложения указать `BOT_TOKEN`, `JWT_SECRET`, `DIRECTUS_URL`,
   `DIRECTUS_TOKEN`, `WEB_URL` (= собственный публичный домен), `DEV_AUTH=0`;
   build-arg `VITE_BOT_USERNAME` = имя бота. `VITE_SERVER_URL` оставить пустым.
4. В BotFather: `/newapp` → привязать Mini App к боту и указать URL приложения.
5. Открыть Mini App из бота — авторизация пройдёт автоматически через Telegram.

## Данные: Directus + PostgreSQL

Хранилище данных — **Directus** (REST API + админка), который сам использует
PostgreSQL как свою БД. Игровой сервер ходит в Directus по HTTP со статическим
admin-токеном; коллекции `players` и `matches` создаются автоматически при старте.

В Dokploy (4 объекта): **PostgreSQL** ← **Directus** ← **server** ← **web**.

1. Создать PostgreSQL (Database Name = `directus`, образ `postgres:16/18`).
2. Поднять **Directus** как приложение (образ `directus/directus:latest`), env:
   `KEY`, `SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DB_CLIENT=pg`,
   `DB_HOST=<внутренний хост Postgres>`, `DB_PORT=5432`, `DB_DATABASE=directus`,
   `DB_USER=postgres`, `DB_PASSWORD=<пароль>`, `PUBLIC_URL=https://api.твойдомен`.
3. В админке Directus создать пользователя с ролью Administrator и **статический
   токен** (User → Token), положить его в `DIRECTUS_TOKEN` сервера.
4. Сервер: `DIRECTUS_URL=<внутренний хост Directus>:8055` (или публичный URL),
   `DIRECTUS_TOKEN=<токен>`.

Данные смотри прямо в **админке Directus** (`https://api.твойдомен`) — коллекции
`players` и `matches`.
