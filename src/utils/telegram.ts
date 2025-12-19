const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'teagramshop_bot';
const APP_NAME = import.meta.env.VITE_TELEGRAM_APP_NAME;

export const buildStartAppLink = (payload?: string | null): string => {
  const base = APP_NAME ? `https://t.me/${BOT_USERNAME}/${APP_NAME}` : `https://t.me/${BOT_USERNAME}`;

  if (payload) {
    return `${base}?startapp=${encodeURIComponent(payload)}`;
  }

  return base;
};

export const buildProductDeepLink = (productId: string): string => {
  return buildStartAppLink(`product_${productId}`);
};

export const buildMainDeepLink = (): string => buildStartAppLink();

export const extractStartParam = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const telegramStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

  const urlParams = new URLSearchParams(window.location.search);
  const urlStartApp = urlParams.get('startapp');
  const urlStartParam = urlParams.get('start_param');

  return telegramStartParam || urlStartApp || urlStartParam;
};

export const parseProductIdFromStartParam = (startParam?: string | null): string | null => {
  if (!startParam) {
    return null;
  }

  const prefix = 'product_';

  if (!startParam.startsWith(prefix)) {
    return null;
  }

  return startParam.slice(prefix.length);
};

export const hasTelegramInitData = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const initData = window.Telegram?.WebApp?.initData;
  return Boolean(initData && initData.length > 0);
};
