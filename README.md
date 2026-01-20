# Leaf Flow App

Telegram Mini App интернет-магазина китайского чая. Современный интерфейс в стиле Telegram с поддержкой светлой и тёмной темы.

## Технологии

- **React 18** — UI библиотека
- **TypeScript** — типизация
- **Vite** — сборка и dev-сервер
- **Lucide React** — иконки
- **react-markdown** — рендеринг markdown-контента

## Функционал

- 📦 **Каталог** — фильтрация по категориям, поиск товаров
- 🛒 **Корзина** — редактирование позиций, подсчёт итогов
- 📄 **Страница товара** — выбор фасовок, управление количеством
- ✅ **Оформление заказа** — валидация формы, отправка на бэкенд
- 🎉 **Подтверждение** — экран с резюме заказа
- 🌙 **Темы** — автоматическое переключение светлой/тёмной темы
- 🔗 **Deep links** — поддержка прямых ссылок на товары через Telegram

## Структура проекта

```
src/
├── api/              # API клиент и эндпоинты
│   ├── auth.ts       # Авторизация
│   ├── cart.ts       # Корзина
│   ├── catalog.ts    # Каталог товаров
│   ├── client.ts     # HTTP клиент
│   └── orders.ts     # Заказы
├── components/       # UI компоненты
│   ├── CategoryFilter.tsx
│   ├── Layout.tsx
│   ├── ProductCard.tsx
│   ├── ProductShareActions.tsx
│   └── QuantityControl.tsx
├── context/          # React контексты
│   ├── CartContext.tsx
│   └── ThemeContext.tsx
├── hooks/            # Кастомные хуки
│   └── useLocalStorage.ts
├── pages/            # Страницы приложения
│   ├── CartPage.tsx
│   ├── CatalogPage.tsx
│   ├── CheckoutPage.tsx
│   ├── ConfirmationPage.tsx
│   └── ProductPage.tsx
├── utils/            # Утилиты
│   └── telegram.ts   # Telegram Web App API
├── App.tsx           # Корневой компонент
├── main.tsx          # Точка входа
├── styles.css        # Глобальные стили
└── types.ts          # TypeScript типы
```

## Запуск

### Разработка

```bash
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

### Сборка

```bash
npm run build
npm run preview   # превью продакшен-сборки
```

## Docker

### Production сборка

```bash
docker build -t teagram-shop .
docker run -p 80:80 teagram-shop
```

Используется multi-stage сборка:
1. Node.js для билда фронтенда
2. Nginx Alpine для раздачи статики

## Telegram Mini App

Приложение интегрируется с Telegram через [Web App API](https://core.telegram.org/bots/webapps):

- Автоматическое определение темы пользователя
- Поддержка `startapp` параметра для deep links
- Работает только внутри Telegram (показывает fallback вне мессенджера)

### Deep links

Формат ссылки на товар:
```
https://t.me/BOT_USERNAME/APP_NAME?startapp=product_PRODUCT_ID
```

## API

Swagger документация доступна в `docs/swagger.yaml`

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Сборка для production |
| `npm run preview` | Превью production-сборки |
