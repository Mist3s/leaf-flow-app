interface TelegramWebApp {
  close?: () => void;
  initData?: string;
  ready?: () => void;
  expand?: () => void;
}

interface TelegramNamespace {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: TelegramNamespace;
  }
}

export {};
