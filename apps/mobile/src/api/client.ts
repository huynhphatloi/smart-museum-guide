import { env } from '../config/env';
import { RegisteredBeacon } from '../features/ble/beacon-registry';
import { ActiveExhibitResponse, LanguagesResponse } from './types';

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

const TIMEOUT_MS = 10_000;

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, { signal: controller.signal });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the museum server.');
  } finally {
    clearTimeout(timeout);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as { code?: string; message?: string };
    throw new ApiError(response.status, body.code ?? 'UNKNOWN', body.message ?? 'Request failed.');
  }

  return payload as T;
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  languages: () => request<LanguagesResponse>('/public/languages'),

  /** Beacon registry used for local matching. Contains no visitor data. */
  beacons: () => request<RegisteredBeacon[]>('/public/beacons'),

  /** BLE flow - called once per *confirmed* zone, never per RSSI sample. */
  activeExhibitForBeacon: (identifier: string, language: string) =>
    request<ActiveExhibitResponse>(
      `/public/beacons/${encodeURIComponent(identifier)}/active-exhibit?lang=${encodeURIComponent(language)}`,
    ),

  /** QR / manual flow. */
  activeExhibitForZone: (zoneCode: string, language: string) =>
    request<ActiveExhibitResponse>(
      `/public/zones/${encodeURIComponent(zoneCode)}/active-exhibit?lang=${encodeURIComponent(language)}`,
    ),
};
