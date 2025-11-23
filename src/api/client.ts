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
        throw new ApiError('Failed to authorize via Telegram', response.status, await response.json().catch(() => null));
      }
      const { tokens } = (await response.json()) as AuthResponse;
      persistAuthTokens(tokens);
      return tokens;
    })
    .catch((error) => {
      console.error('Telegram auth failed', error);
      persistAuthTokens(null);
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
        throw new ApiError('Failed to refresh tokens', response.status, await response.json().catch(() => null));
      }
      const nextTokens = (await response.json()) as AuthTokens;
      persistAuthTokens(nextTokens);
      return nextTokens;
    })
    .catch((error) => {
      console.error('Token refresh failed', error);
      persistAuthTokens(null);
      return null;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
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
        const refreshed = await refreshTokens();
        if (refreshed?.accessToken) {
          return request<T>(path, options);
        }

        const telegramTokens = await authorizeWithTelegram();
        if (telegramTokens?.accessToken) {
          return request<T>(path, options);
        }
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
