# 3D Tic-Tac-Toe (Score Four) — Telegram Mini App

Онлайн-игра «4 в ряд в пространстве» (поле 4×4×4, как настольная **Score Four /
Qubic**) в формате Telegram Mini App: вращаемая 3D-модель сверху, сетка-ввод 4×4
снизу, авторизация через Telegram, поиск соперников, мультиплеер в реальном времени
и таймер 1 минута на ход.

## Структура (монорепозиторий, npm workspaces)

```
packages/game-core   Общая логика: доска 4×4×4, генерация 76 выигрышных линий,
                     определение победы, сетевой протокол. Покрыта тестами.
apps/server          Node + Express + Socket.IO + Prisma. Валидация Telegram
                     initData, JWT-сессии, матчмейкинг, игровые комнаты-арбитры,
                     серверные таймеры, рейтинг (Elo) и история матчей.
apps/web             Vite + React + react-three-fiber. Меню, профиль, матчмейкинг,
                     игровой экран (3D-доска + нижняя сетка + HUD с таймерами).
```

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
3. Поднять PostgreSQL и задать `DATABASE_URL` в `.env` (см. раздел про Dokploy
   ниже), затем создать таблицы:
   ```bash
   cd apps/server && npx prisma generate && npx prisma db push
   ```
   Для локали можно быстро поднять Postgres в Docker:
   ```bash
   docker run --name ttt3d-pg -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=tictactoe3d -p 5432:5432 -d postgres:18
   # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tictactoe3d?schema=public"
   ```
4. В двух терминалах:
   ```bash
   npm run dev:server   # http://localhost:3001
   npm run dev:web      # http://localhost:5173
   ```
5. Открыть `http://localhost:5173` в двух вкладках (в dev-режиме каждый получает
   случайного игрока) → «Найти соперника» → играть.

> Сервер читает переменные из `.env` в корне репозитория. Веб-клиент использует
> переменные с префиксом `VITE_` (см. `.env.example`).

## Тесты

```bash
npm test   # vitest в packages/game-core (проверяет ровно 76 линий и все категории побед)
```

## Деплой как Telegram Mini App

1. Создать бота в [@BotFather](https://t.me/BotFather), получить `BOT_TOKEN`.
2. Поднять `apps/server` и `apps/web` на публичном **HTTPS** (Telegram требует
   HTTPS). Локально для проверки можно использовать туннель (например `ngrok http
   5173`).
3. В `.env` указать реальный `BOT_TOKEN`, `JWT_SECRET`, `DATABASE_URL`, `WEB_URL`
   (публичный URL клиента) и выключить `DEV_AUTH`.
4. В BotFather: `/newapp` → привязать Mini App к боту и указать URL веб-клиента.
5. Открыть Mini App из бота — авторизация пройдёт автоматически через Telegram.

## База данных: PostgreSQL через Dokploy

Проект использует PostgreSQL (`provider = "postgresql"` в
`apps/server/prisma/schema.prisma`).

1. В Dokploy создать базу: **Database Name** = `tictactoe3d`, **User** = `postgres`,
   пароль скопировать, образ `postgres:18`.
2. Собрать `DATABASE_URL`:
   `postgresql://postgres:<ПАРОЛЬ>@<ХОСТ>:5432/tictactoe3d?schema=public`
   - **внутри Dokploy** (сервер рядом с БД): `<ХОСТ>` = App Name базы
     (напр. `tictactoe3d-tictactoe3d`), порт `5432`;
   - **снаружи** (миграции со своей машины): включить External-доступ у базы и взять
     `IP:внешний_порт`, которые показывает Dokploy.
3. Применить схему: `cd apps/server && npx prisma generate && npx prisma db push`.
4. Просмотр данных: `npm run prisma:studio` (см. ниже).

## Просмотр базы

```bash
cd apps/server && npm run prisma:studio   # http://localhost:5555
```
