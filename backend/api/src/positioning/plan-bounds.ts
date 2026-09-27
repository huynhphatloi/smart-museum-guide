import { MapShape, shapeFitsPlan } from './map-shape';

/** A point lies on the plan when 0 <= x <= width and 0 <= y <= height. */
export function isOnPlan(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x <= width && y <= height;
}

export interface PlanContents {
  points: Array<{ label: string; x: number; y: number }>;
  beacons: Array<{ identifier: string; mapX: number | null; mapY: number | null }>;
  zones: Array<{ code: string; shape: MapShape | null }>;
}

/**
 * What would fall off the plan if it were resized to width x height. Empty
 * when the resize is safe.
 */
export function outsideAfterResize(
  contents: PlanContents,
  width: number,
  height: number,
): string[] {
  return [
    ...contents.points
      .filter((point) => !isOnPlan(point.x, point.y, width, height))
      .map((point) => `point ${point.label}`),
    ...contents.beacons
      .filter(
        (beacon) =>
          beacon.mapX !== null &&
          beacon.mapY !== null &&
          !isOnPlan(beacon.mapX, beacon.mapY, width, height),
      )
      .map((beacon) => `beacon ${beacon.identifier}`),
    ...contents.zones
      .filter((zone) => zone.shape !== null && !shapeFitsPlan(zone.shape, width, height))
      .map((zone) => `zone ${zone.code}`),
  ];
}
