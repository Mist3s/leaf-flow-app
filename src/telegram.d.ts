interface TelegramWebApp {
  close?: () => void;
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  onEvent?: (eventType: string, eventData: Record<string, unknown>) => void;
  offEvent?: (eventType: string, eventData: Record<string, unknown>) => void;
  version?: string;
  platform?: string;
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
