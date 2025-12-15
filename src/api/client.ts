import type { AuthResponse, AuthTokens } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app-stage.zavarka39.ru/api/v1';
const AUTH_STORAGE_KEY = 'teagram-auth';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? import.meta.env.VITE_APP_NAME ?? 'unknown';

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const readAuthTokens = (): AuthTokens | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch (error) {
    console.error('Failed to parse auth tokens', error);
    return null;
  }
};

const persistAuthTokens = (tokens: AuthTokens | null) => {
  if (!tokens) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
};

let inFlightRefresh: Promise<AuthTokens | null> | null = null;
let inFlightTelegramAuth: Promise<AuthTokens | null> | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getTelegramInitData = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const initData = window.Telegram?.WebApp?.initData;
  if (!initData || !initData.trim()) {
    console.warn('Telegram initData is missing');
    return null;
  }

  return initData;
};

const authorizeWithTelegram = async (): Promise<AuthTokens | null> => {
  if (inFlightTelegramAuth) {
    return inFlightTelegramAuth;
  }

  const initData = getTelegramInitData();
  if (!initData) {
    console.warn('Cannot authorize via Telegram: initData is missing');
    return null;
  }

  inFlightTelegramAuth = fetch(`${API_BASE_URL}/auth/telegram/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData, appVersion: APP_VERSION }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error = new ApiError('Failed to authorize via Telegram', response.status, errorData);
        
        if (response.status === 400 || response.status === 429) {
          console.error('Telegram authorization failed', response.status, errorData);
        } else {
          console.error('Telegram authorization failed with unexpected status', response.status, errorData);
        }
        
        persistAuthTokens(null);
        throw error;
      }
      const { tokens } = (await response.json()) as AuthResponse;
      persistAuthTokens(tokens);
      console.log('Telegram authorization successful');
      return tokens;
    })
    .catch((error) => {
      // Если это не ApiError (например, сетевой сбой), логируем и очищаем токены
      if (!(error instanceof ApiError)) {
        console.error('Telegram auth failed with network error', error);
        persistAuthTokens(null);
      }
      // ApiError уже обработан в then блоке
      return null;
    })
    .finally(() => {
      inFlightTelegramAuth = null;
    });

  return inFlightTelegramAuth;
};

const ensureAuthTokens = async (): Promise<AuthTokens | null> => {
  const tokens = readAuthTokens();
  if (tokens?.accessToken) {
    return tokens;
  }

  return authorizeWithTelegram();
};

const refreshTokens = async (): Promise<AuthTokens | null> => {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const tokens = readAuthTokens();
  if (!tokens?.refreshToken) {
    console.warn('No refresh token available');
    return null;
  }

  inFlightRefresh = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const error = new ApiError('Failed to refresh tokens', response.status, errorData);
        
        // Если рефреш токен невалиден (401), очищаем токены
        // Авторизация через Telegram будет выполнена на уровне request
        if (response.status === 401) {
          console.warn('Refresh token is invalid or expired, clearing tokens');
          persistAuthTokens(null);
        } else {
          console.error('Token refresh failed with status', response.status, errorData);
        }
        
        throw error;
      }
      const nextTokens = (await response.json()) as AuthTokens;
      persistAuthTokens(nextTokens);
      console.log('Tokens refreshed successfully');
      return nextTokens;
    })
    .catch((error) => {
      // Если это не ApiError (например, сетевой сбой), логируем и очищаем токены
      if (!(error instanceof ApiError)) {
        console.error('Token refresh failed with network error', error);
        persistAuthTokens(null);
      }
      // ApiError уже обработан в then блоке
      return null;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _authRetryCount?: number; // Внутренний флаг для предотвращения бесконечной рекурсии
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const authRetryCount = options._authRetryCount ?? 0;
  const MAX_AUTH_RETRIES = 2; // Максимум 2 попытки авторизации (рефреш + Telegram)

  let tokens = options.skipAuth ? null : await ensureAuthTokens();
  const headers = new Headers({ Accept: 'application/json' });

  if (options.headers) {
    const incoming = new Headers(options.headers);
    incoming.forEach((value, key) => headers.set(key, value));
  }

  if (!options.skipAuth && tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 500;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_ATTEMPTS) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });

      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }
        return (await response.json()) as T;
      }

      if (response.status === 401 && !options.skipAuth) {
        // Предотвращаем бесконечную рекурсию
        if (authRetryCount >= MAX_AUTH_RETRIES) {
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch (error) {
            errorBody = null;
          }
          throw new ApiError(
            'Authentication failed: unable to refresh tokens or authorize via Telegram',
            401,
            errorBody
          );
        }

        // Пытаемся обновить токены через refresh
        const refreshed = await refreshTokens();
        if (refreshed?.accessToken) {
          // Токены уже сохранены в localStorage функцией refreshTokens
          return request<T>(path, { ...options, _authRetryCount: authRetryCount + 1 });
        }

        // Если рефреш не удался, пытаемся авторизоваться через Telegram
        const telegramTokens = await authorizeWithTelegram();
        if (telegramTokens?.accessToken) {
          // Токены уже сохранены в localStorage функцией authorizeWithTelegram
          return request<T>(path, { ...options, _authRetryCount: authRetryCount + 1 });
        }

        // Если обе попытки не удались, выбрасываем ошибку авторизации
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch (error) {
          errorBody = null;
        }
        throw new ApiError(
          'Authentication failed: unable to refresh tokens or authorize via Telegram',
          401,
          errorBody
        );
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt + 1 < MAX_ATTEMPTS) {
        const backoff = BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
        await delay(backoff);
        attempt += 1;
        continue;
      }

      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch (error) {
        errorBody = null;
      }

      lastError = new ApiError('Request failed', response.status, errorBody);
      break;
    } catch (error) {
      // Если это ошибка авторизации, не пытаемся повторить запрос
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }

      lastError = error;
      if (attempt + 1 < MAX_ATTEMPTS) {
        const backoff = BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 150);
        await delay(backoff);
        attempt += 1;
        continue;
      }
      break;
    }
  }

  throw lastError instanceof ApiError
    ? lastError
    : new ApiError('Network request failed', undefined, (lastError as Error | undefined)?.message);
};

export const setAuthTokens = (tokens: AuthTokens | null) => persistAuthTokens(tokens);
export const getAuthTokens = () => readAuthTokens();
