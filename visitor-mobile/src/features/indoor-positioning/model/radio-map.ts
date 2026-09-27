import { beaconOrderFor, meanVector, vectorFromFingerprint } from './fingerprint-vector';
import { CaptureFingerprint, DeviceProfile, FloorPlan, RadioMap, RadioMapEntry } from './types';

/**
 * Picks the calibration captures that suit this phone.
 *
 * Phones of different makes report RSSI with different offsets, so a radio map
 * recorded on the same model is best, then the same platform, then any real
 * phone. Synthetic "simulator" captures are only ever used by the simulator,
 * and the simulator only ever uses them: a real phone matched against invented
 * data would show a confident, wrong position.
 */
export function selectCaptures(
  captures: readonly CaptureFingerprint[],
  device: DeviceProfile,
): { captures: CaptureFingerprint[]; source: RadioMap['source'] } {
  if (device.platform === 'simulator') {
    return { captures: captures.filter((c) => c.platform === 'simulator'), source: 'platform' };
  }

  const real = captures.filter((capture) => capture.platform !== 'simulator');
  const sameModel = real.filter(
    (capture) => capture.platform === device.platform && capture.deviceModel === device.model,
  );
  if (sameModel.length > 0) return { captures: sameModel, source: 'model' };

  const samePlatform = real.filter((capture) => capture.platform === device.platform);
  if (samePlatform.length > 0) return { captures: samePlatform, source: 'platform' };

  return { captures: real, source: 'any' };
}

/**
 * Builds the radio map: one averaged fingerprint vector per reference point,
 * pooling every orientation and repeat recorded there. Returns null when there
 * is nothing to position against.
 */
export function buildRadioMap(
  plan: FloorPlan,
  captures: readonly CaptureFingerprint[],
  device: DeviceProfile,
): RadioMap | null {
  const beaconOrder = beaconOrderFor(plan);
  if (beaconOrder.length === 0) return null;

  const selected = selectCaptures(captures, device);
  const byPoint = new Map<string, number[][]>();
  for (const capture of selected.captures) {
    const vectors = byPoint.get(capture.pointId) ?? [];
    vectors.push(vectorFromFingerprint(capture.fingerprint, beaconOrder, plan.fillDbm));
    byPoint.set(capture.pointId, vectors);
  }

  const entries: RadioMapEntry[] = plan.referencePoints
    .filter((point) => byPoint.has(point.id))
    .map((point) => {
      const vectors = byPoint.get(point.id) ?? [];
      return {
        pointId: point.id,
        label: point.label,
        x: point.x,
        y: point.y,
        vector: meanVector(vectors),
        captureCount: vectors.length,
      };
    });

  if (entries.length === 0) return null;
  return { beaconOrder, fillDbm: plan.fillDbm, entries, source: selected.source };
}
