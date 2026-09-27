import { RadioMap } from './types';

export interface PathLossFit {
  /** Fitted RSSI at one metre, dBm. */
  rssiAtOneMetre: number;
  /** Fitted path loss exponent n. */
  pathLossExponent: number;
  /** Reference points the fit used. */
  points: number;
}

export interface MinRssiSuggestion extends PathLossFit {
  beacon: string;
  /** Predicted smoothed RSSI at the trigger distance - use as minRssi. */
  minRssi: number;
  triggerDistanceM: number;
}

/**
 * Points closer than this are left out: a few centimetres of error in where
 * staff stood is a large error in log10(d).
 */
const MIN_FIT_DISTANCE_M = 0.3;

/**
 * Least-squares fit of rssi = A + B log10(d) for one beacon, from the radio
 * map's own measurements - the room's actual path loss, which also makes a
 * good figure for the report. Readings equal to the fill value were never
 * heard and are left out.
 */
export function fitPathLoss(
  radioMap: RadioMap,
  beacon: string,
  position: { x: number; y: number },
): PathLossFit | null {
  const index = radioMap.beaconOrder.indexOf(beacon);
  if (index < 0) return null;

  const pairs = radioMap.entries
    .map((entry) => ({
      distance: Math.hypot(entry.x - position.x, entry.y - position.y),
      rssi: entry.vector[index],
    }))
    .filter((pair) => pair.distance >= MIN_FIT_DISTANCE_M && pair.rssi > radioMap.fillDbm)
    .map((pair) => ({ logD: Math.log10(pair.distance), rssi: pair.rssi }));

  if (pairs.length < 3) return null;

  const meanX = pairs.reduce((sum, pair) => sum + pair.logD, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.rssi, 0) / pairs.length;
  let sxx = 0;
  let sxy = 0;
  for (const pair of pairs) {
    sxx += (pair.logD - meanX) ** 2;
    sxy += (pair.logD - meanX) * (pair.rssi - meanY);
  }
  if (sxx < 1e-9) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  return { rssiAtOneMetre: intercept, pathLossExponent: -slope / 10, points: pairs.length };
}

/**
 * Suggests a beacon's minRssi - the zone detector's reach - so its zone
 * triggers within `triggerDistanceM` of the beacon, on this phone, in this
 * room. The result is clamped to what the CMS accepts (-100..-30 dBm).
 */
export function suggestMinRssi(
  radioMap: RadioMap,
  beacon: string,
  position: { x: number; y: number },
  triggerDistanceM: number,
): MinRssiSuggestion | null {
  const fit = fitPathLoss(radioMap, beacon, position);
  if (!fit) return null;

  const predicted =
    fit.rssiAtOneMetre - 10 * fit.pathLossExponent * Math.log10(Math.max(0.1, triggerDistanceM));
  const minRssi = Math.max(-100, Math.min(-30, Math.round(predicted)));
  return { ...fit, beacon, minRssi, triggerDistanceM };
}
