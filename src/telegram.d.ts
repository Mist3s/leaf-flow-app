interface TelegramWebAppPopupButton {
  id?: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text: string;
}

interface TelegramWebAppPopupParams {
  title?: string;
  message: string;
  buttons?: TelegramWebAppPopupButton[];
}

interface TelegramWebApp { 
  close?: () => void;
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
  };
  ready?: () => void;
  expand?: () => void;
  onEvent?: (eventType: string, eventData: Record<string, unknown>) => void;
  offEvent?: (eventType: string, eventData: Record<string, unknown>) => void;
  version?: string;
  platform?: string;
  showAlert?: (message: string, callback?: () => void) => void;
  showPopup?: (params: TelegramWebAppPopupParams, callback?: (id?: string) => void) => void;
  openTelegramLink?: (url: string) => void;
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
