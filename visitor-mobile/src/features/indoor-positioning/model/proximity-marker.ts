import { BeaconStat } from '../../beacon-detection/model/types';
import { FloorPlan } from './types';
import { centroid } from './zone-geometry';

/** A zone/beacon landmark, never an estimate of the phone's coordinates. */
export function proximityMarker(
  plan: FloorPlan,
  confirmedZone: string | null,
  stats: readonly BeaconStat[],
): { x: number; y: number } | null {
  if (!confirmedZone) return null;
  const beacons = plan.beacons.filter(
    (beacon) =>
      beacon.zoneCode === confirmedZone &&
      beacon.mapX !== null &&
      beacon.mapY !== null &&
      Number.isFinite(beacon.mapX) &&
      Number.isFinite(beacon.mapY) &&
      beacon.mapX >= 0 &&
      beacon.mapX <= plan.widthMeters &&
      beacon.mapY >= 0 &&
      beacon.mapY <= plan.heightMeters,
  );
  // A zone can have multiple devices; use its strongest observed landmark.
  const heard = [...stats].sort((a, b) => b.smoothedRssi - a.smoothedRssi);
  const beacon =
    heard
      .map((stat) => beacons.find((item) => item.identifier === stat.identifier))
      .find((item) => item !== undefined) ?? beacons[0];
  if (beacon) return { x: beacon.mapX!, y: beacon.mapY! };
  const shape = plan.zones.find((zone) => zone.code === confirmedZone)?.mapShape;
  return shape ? centroid(shape) : null;
}
