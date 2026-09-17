import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Every request between this API and the AI service carries
 * `X-Museum-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`,
 * the same scheme in both directions (see ai-services/museum_ai/signing.py).
 * The timestamp stops a captured request from being replayed later.
 */
export const SIGNATURE_HEADER = 'x-museum-signature';

const DEFAULT_TOLERANCE_SECONDS = 300;

export function signBody(secret: string, body: string | Buffer, now: Date = new Date()): string {
  const timestamp = Math.floor(now.getTime() / 1000);
  return `t=${timestamp},v1=${digest(secret, timestamp, body)}`;
}

export function verifySignature(
  secret: string,
  header: string | undefined,
  body: string | Buffer,
  now: Date = new Date(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  if (!header) return false;

  const parts = new Map(
    header.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=')] as const;
    }),
  );
  const timestamp = Number(parts.get('t'));
  const signature = parts.get('v1');
  if (!Number.isInteger(timestamp) || !signature || !/^[0-9a-f]{64}$/.test(signature)) {
    return false;
  }
  if (Math.abs(now.getTime() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = Buffer.from(digest(secret, timestamp, body), 'hex');
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

function digest(secret: string, timestamp: number, body: string | Buffer): string {
  return createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
}
