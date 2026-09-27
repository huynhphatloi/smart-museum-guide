/**
 * Log-distance path loss, used ONLY to drive the simulator's virtual visitor:
 *
 *   rssi(d) = P0 - 10 n log10(d)
 *
 * Keep the constants in step with backend/api/prisma/seed-positioning.ts, which
 * generates the synthetic "simulator" radio map from the same model. Numbers
 * produced this way prove the UI and pipeline work end to end; they are never
 * evidence of positioning accuracy, since the model is what built the map.
 */
export interface PathLossModel {
  /** RSSI at one metre, dBm. */
  rssiAtOneMetre: number;
  /** 2 in free space, roughly 1.6-3.5 indoors. */
  pathLossExponent: number;
  /** Closer than this reads as this - the formula explodes near zero. */
  minDistanceM: number;
}

export const SIMULATION_MODEL: PathLossModel = {
  rssiAtOneMetre: -67,
  pathLossExponent: 2,
  minDistanceM: 0.25,
};

export function simulatedRssi(
  from: { x: number; y: number },
  beacon: { x: number; y: number },
  model: PathLossModel = SIMULATION_MODEL,
): number {
  const distance = Math.max(model.minDistanceM, Math.hypot(from.x - beacon.x, from.y - beacon.y));
  return model.rssiAtOneMetre - 10 * model.pathLossExponent * Math.log10(distance);
}
