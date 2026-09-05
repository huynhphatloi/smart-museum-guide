/** Extracts a zone code from a scanned QR payload such as `https://.../q/ZONE_A01`. */
export function zoneCodeFromQr(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fromUrl = /\/q\/([A-Za-z0-9_-]+)/.exec(trimmed);
  if (fromUrl) return fromUrl[1].toUpperCase();

  // A bare code typed in by hand or printed under the QR.
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed.toUpperCase();

  return null;
}
