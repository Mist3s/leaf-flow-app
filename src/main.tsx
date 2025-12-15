import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Инициализация Telegram WebApp
const initTelegramWebApp = () => {
  // Проверяем наличие Telegram WebApp
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    // Вызываем ready() для уведомления Telegram о готовности приложения
    window.Telegram.WebApp.ready?.();
    // Разворачиваем приложение на весь экран
    window.Telegram.WebApp.expand?.();
  } else {
    // Если WebApp еще не загружен, ждем его появления
    // Это может произойти при открытии через меню
    const checkInterval = setInterval(() => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready?.();
        window.Telegram.WebApp.expand?.();
        clearInterval(checkInterval);
      }
    }, 100);

    // Останавливаем проверку через 5 секунд
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
  }
};

// Инициализируем Telegram WebApp
initTelegramWebApp();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
