export type AccessSource = 'QR' | 'BLE' | 'MANUAL';
export interface VisitInput {
  exhibitId: string;
  zoneCode: string;
  source: AccessSource;
  platform: 'WEB' | 'IOS' | 'ANDROID';
  beaconIdentifier?: string;
}
export interface VisitEvent extends VisitInput {
  eventId: string;
  visitorId: string;
}
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
const ID_KEY = 'museum.analytics.visitor.v1';
const RECEIPTS_KEY = 'museum.analytics.receipts.v1';
const QUIET_MS = 30 * 60_000;

// Anonymous identifiers are not authentication credentials or hardware IDs.
export function randomVisitId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const n = Math.floor(Math.random() * 16);
    return (char === 'x' ? n : (n & 3) | 8).toString(16);
  });
}

/** Tracking never prevents access to content. The server also deduplicates
 * concurrent tabs and idempotent retries, independently of these receipts. */
export class AccessTracker {
  private work: Promise<void> = Promise.resolve();
  private memoryId = randomVisitId();
  private receipts: Record<string, number> = {};

  constructor(
    private readonly storage: Storage,
    private readonly send: (event: VisitEvent) => Promise<unknown>,
    private readonly now = Date.now,
    private readonly wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ) {}

  track(input: VisitInput): Promise<void> {
    const task = this.work.then(() => this.record(input));
    this.work = task.catch(() => undefined);
    return this.work;
  }

  private async record(input: VisitInput): Promise<void> {
    let visitorId = this.memoryId;
    try {
      const stored = await this.storage.getItem(ID_KEY);
      if (
        stored &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
      ) {
        visitorId = stored;
      } else {
        await this.storage.setItem(ID_KEY, visitorId);
      }
      const raw = await this.storage.getItem(RECEIPTS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'number' && Number.isFinite(value)) this.receipts[key] = value;
          }
        }
      }
    } catch {
      /* Private browsing/storage failure: retain an in-memory identity. */
    }
    this.memoryId = visitorId;
    const key = `${input.exhibitId}:${input.source}`;
    const at = this.now();
    const previous = this.receipts[key];
    if (previous !== undefined && at >= previous && at - previous < QUIET_MS) return;
    const event = { ...input, visitorId, eventId: randomVisitId() };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.send(event);
        this.receipts = Object.fromEntries(
          Object.entries(this.receipts).filter(([, time]) => at >= time && at - time < QUIET_MS),
        );
        this.receipts[key] = at;
        try {
          await this.storage.setItem(RECEIPTS_KEY, JSON.stringify(this.receipts));
        } catch {
          /* memory receipt still works */
        }
        return;
      } catch {
        if (attempt < 2) await this.wait((attempt + 1) * 1000);
      }
    }
    // Failed delivery does not mark the exhibit as counted; next open may retry.
  }
}
