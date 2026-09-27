import { Beacon, Zone } from '@/lib/types';

export type MapShape =
  | { type: 'circle'; x: number; y: number; r: number }
  | { type: 'polygon'; points: Array<[number, number]> };

export type SurveyPointKind = 'REFERENCE' | 'TEST';

export interface FloorPlanSummary {
  id: string;
  code: string;
  name: string;
  level: string | null;
  widthMeters: number;
  heightMeters: number;
  imageUrl: string | null;
  positioningK: number;
  fillDbm: number;
  _count: { zones: number; surveyPoints: number };
}

export interface CaptureSummary {
  id: string;
  deviceModel: string;
  platform: string;
  orientationDeg: number | null;
  durationMs: number;
  createdAt: string;
}

export interface SurveyPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: SurveyPointKind;
  captures: CaptureSummary[];
}

export interface MapZone extends Zone {
  floorPlanId: string | null;
  mapShape: MapShape | null;
  beacons: MapBeacon[];
}

export interface MapBeacon extends Beacon {
  mapX: number | null;
  mapY: number | null;
}

export interface FloorPlanDetail extends Omit<FloorPlanSummary, '_count'> {
  zones: MapZone[];
  surveyPoints: SurveyPoint[];
}
