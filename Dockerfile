# --- PROD 1: собираем фронтенд ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код (исключая файлы из .dockerignore)
COPY . .

# Собираем приложение
RUN npm run build

# --- PROD 2: финальный образ nginx ---
FROM nginx:1.25-alpine

# Чистим дефолтный контент
RUN rm -rf /usr/share/nginx/html/*

# Копируем собранный фронтенд
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Копируем наш nginx-конфиг
COPY nginx/prod.conf /etc/nginx/conf.d/default.conf

# Expose порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
