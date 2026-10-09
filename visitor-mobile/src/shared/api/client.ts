import { RegisteredBeacon } from '../../features/beacon-detection/model/beacon-registry';
import {
  CaptureFingerprint,
  FloorPlan,
  RawSample,
} from '../../features/indoor-positioning/model/types';
import { env } from '../config/env';
import { ActiveExhibitResponse, LanguagesResponse } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { nextChangeAt?: string | null; resolvedAt?: string },
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TIMEOUT_MS = 10_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  /** Staff token - only the calibration tool ever sends one. */
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the museum server.');
  } finally {
    clearTimeout(timeout);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as {
      code?: string;
      message?: string;
      details?: ApiError['details'];
    };
    throw new ApiError(
      response.status,
      body.code ?? 'UNKNOWN',
      body.message ?? 'Request failed.',
      body.details,
    );
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

  /** Room plans for the map. Positioning runs on the phone; nothing is sent back. */
  floorPlans: () => request<FloorPlan[]>('/public/floor-plans'),

  /** Calibration fingerprints of one room, every device - the phone picks its own. */
  fingerprints: (floorPlanId: string) =>
    request<CaptureFingerprint[]>(
      `/public/floor-plans/${encodeURIComponent(floorPlanId)}/fingerprints`,
    ),

  // --- staff calibration tool ----------------------------------------------

  staffLogin: (email: string, password: string) =>
    request<{ accessToken: string; admin: { name: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  uploadCapture: (token: string, pointId: string, capture: CaptureUpload) =>
    request<{ id: string }>(`/admin/survey-points/${encodeURIComponent(pointId)}/captures`, {
      method: 'POST',
      body: capture,
      token,
    }),

  /** Every survey point of a room, test points included, with who recorded what. */
  staffFloorPlan: (token: string, floorPlanId: string) =>
    request<StaffFloorPlan>(`/admin/floor-plans/${encodeURIComponent(floorPlanId)}`, { token }),

  /** Looks a beacon up by identifier so its reach can be tuned from the phone. */
  findBeacon: (token: string, identifier: string) =>
    request<{ items: Array<{ id: string; identifier: string; minRssi: number | null }> }>(
      `/admin/beacons?search=${encodeURIComponent(identifier)}&pageSize=100`,
      { token },
    ),

  setBeaconMinRssi: (token: string, beaconId: string, minRssi: number) =>
    request<{ id: string; minRssi: number | null }>(
      `/admin/beacons/${encodeURIComponent(beaconId)}`,
      {
        method: 'PATCH',
        body: { minRssi },
        token,
      },
    ),
};

export interface StaffFloorPlan {
  id: string;
  surveyPoints: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    kind: 'REFERENCE' | 'TEST';
    captures: Array<{
      id: string;
      deviceModel: string;
      platform: string;
      orientationDeg: number | null;
    }>;
  }>;
}

export interface CaptureUpload {
  deviceModel: string;
  platform: 'ios' | 'android' | 'simulator';
  orientationDeg?: number;
  startedAt: string;
  durationMs: number;
  samples: RawSample[];
  fingerprint: Record<string, number>;
}
