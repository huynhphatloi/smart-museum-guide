import { AdminProfile } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const TOKEN_KEY = 'museum.admin.token';
const PROFILE_KEY = 'museum.admin.profile';

/** Error carrying the backend's machine readable `code`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string, profile: AdminProfile): void {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  profile(): AdminProfile | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminProfile;
    } catch {
      return null;
    }
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header (used by /auth/login). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();

  if (!options.anonymous && token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the API. Is it running on ' + API_URL + '?',
    );
  }

  if (response.status === 401 && !options.anonymous) {
    tokenStore.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ApiError(
      response.status,
      body.code ?? 'UNKNOWN',
      body.message ?? `Request failed with status ${response.status}`,
      body.details,
    );
  }

  return payload as T;
}

/** `multipart/form-data` upload used by the media library. */
export async function apiUpload(file: File): Promise<import('./types').StoredFile> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_URL}/admin/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` },
    body: form,
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      response.status,
      body.code ?? 'UPLOAD_FAILED',
      body.message ?? 'Upload failed',
    );
  }
  return payload as import('./types').StoredFile;
}

/** Turns a stored relative media path into something the browser can load. */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL.replace(/\/api$/, '')}${url}`;
}
