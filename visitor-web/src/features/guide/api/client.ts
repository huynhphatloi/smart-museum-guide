import { ActiveExhibitResponse, LanguagesResponse } from '../model/types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/** Error carrying the backend's machine readable `code` so the UI can branch. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the museum server.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as { code?: string; message?: string };
    throw new ApiError(response.status, body.code ?? 'UNKNOWN', body.message ?? 'Request failed.');
  }

  return payload as T;
}

export function fetchActiveExhibitForZone(
  zoneCode: string,
  language: string,
  signal?: AbortSignal,
): Promise<ActiveExhibitResponse> {
  return request<ActiveExhibitResponse>(
    `/public/zones/${encodeURIComponent(zoneCode)}/active-exhibit?lang=${encodeURIComponent(language)}`,
    signal,
  );
}

export function fetchLanguages(signal?: AbortSignal): Promise<LanguagesResponse> {
  return request<LanguagesResponse>('/public/languages', signal);
}
