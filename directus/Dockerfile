# Directus (хранилище данных + админка). Деплой через метод Dockerfile в Dokploy,
# если метод "Docker Image" недоступен.
#
# В Dokploy:  Dockerfile = "directus/Dockerfile",  Build Context = ".",
# порт 8055, и переменные окружения:
#   KEY, SECRET, PUBLIC_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN,
#   DB_CLIENT=pg, DB_HOST, DB_PORT=5432, DB_DATABASE, DB_USER, DB_PASSWORD
#
# Зафиксированная версия — поменяй тег при необходимости.
FROM directus/directus:11

EXPOSE 8055
