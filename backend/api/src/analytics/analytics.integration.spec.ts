import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PublicGuideService } from '../public-guide/public-guide.service';
import { AnalyticsService } from './analytics.service';
import { RecordVisitDto } from './analytics.dto';

const url = process.env.ANALYTICS_TEST_DATABASE_URL;
const integration = url ? describe : describe.skip;
integration('Analytics with PostgreSQL', () => {
  if (url && !new URL(url).pathname.startsWith('/smart_museum_analytics_codex_'))
    throw new Error('Use a dedicated smart_museum_analytics_codex_ database.');
  const db = new PrismaService({
    datasources: { db: { url: url ?? 'postgresql://unused@localhost/unused' } },
  });
  const exhibitId = randomUUID();
  const visitorId = randomUUID();
  const guide = {
    resolveByZoneCode: jest.fn(async () => ({
      exhibit: { id: exhibitId, code: 'TEST_EX', title: 'Test exhibit' },
      zone: { code: 'TEST_ZONE' },
    })),
    resolveByBeaconIdentifier: jest.fn(async () => ({
      exhibit: { id: exhibitId, code: 'TEST_EX', title: 'Test exhibit' },
      zone: { code: 'TEST_ZONE' },
    })),
  };
  const service = new AnalyticsService(db, guide as unknown as PublicGuideService);
  const event = (change: Partial<RecordVisitDto> = {}): RecordVisitDto => ({
    eventId: randomUUID(),
    visitorId,
    exhibitId,
    zoneCode: 'TEST_ZONE',
    source: 'QR',
    platform: 'WEB',
    ...change,
  });
  beforeAll(async () => {
    await db.$connect();
    await db.exhibit.create({
      data: { id: exhibitId, code: `TEST_${exhibitId}`, defaultTitle: 'Test', status: 'PUBLISHED' },
    });
  });
  afterAll(async () => {
    await db.exhibitVisit.deleteMany({ where: { exhibitCode: 'TEST_EX' } });
    await db.exhibit.deleteMany({ where: { id: exhibitId } });
    await db.$disconnect();
  });
  it('deduplicates concurrent views, retries and repeated access, keeping separate channels', async () => {
    const at = new Date('2026-10-16T17:00:00Z');
    const events = Array.from({ length: 8 }, () => event());
    const result = await Promise.all(events.map((input) => service.record(input, at)));
    expect(result.filter((row) => row.recorded)).toHaveLength(1);
    const original = events[result.findIndex((row) => row.recorded)];
    expect(await service.record(original, new Date(at.getTime() + 31 * 60_000))).toEqual({
      recorded: false,
    });
    await service.record(event(), new Date('2026-10-16T17:31:00Z'));
    await service.record(
      event({ source: 'BLE', platform: 'IOS', beaconIdentifier: 'B_TEST' }),
      new Date('2026-10-17T05:00:00Z'),
    );
    await service.record(event({ source: 'MANUAL' }), new Date('2026-10-17T16:59:59Z'));
    await service.record(event({ visitorId: randomUUID() }), new Date('2026-10-17T05:00:00Z'));
    await service.record(event({ visitorId: randomUUID() }), new Date('2026-10-17T17:00:00Z'));
    const summary = await service.summary({ from: '2026-10-17', to: '2026-10-17' });
    expect(summary.totals).toEqual({ visits: 5, devices: 2, qr: 3, ble: 1, manual: 1 });
    expect(summary.hourly[0].visits).toBe(2);
    expect(summary.hourly[12].visits).toBe(2);
    expect(summary.hourly[23].visits).toBe(1);
    expect(summary.peakHours).toEqual([0, 12]);
    expect(summary.hourly.reduce((n, row) => n + row.visits, 0)).toBe(summary.totals.visits);
    expect(summary.daily[0].visits).toBe(5);
    expect(summary.exhibits[0].visits).toBe(5);
    expect(summary.history.total).toBe(5);
    expect(summary.history.items).toHaveLength(5);
    expect(summary.history.items[0]).not.toHaveProperty('visitorId');
    const ble = await service.summary({ from: '2026-10-17', to: '2026-10-17', source: 'BLE' });
    expect(ble.totals).toEqual({ visits: 1, devices: 1, qr: 0, ble: 1, manual: 0 });
    const empty = await service.summary({ from: '2026-10-15', to: '2026-10-15' });
    expect(empty.totals.visits).toBe(0);
    expect(empty.hourly).toHaveLength(24);
    expect(empty.peakHours).toEqual([]);
  });
  it('rejects unrelated exhibits and unsupported BLE requests', async () => {
    await expect(service.record(event({ exhibitId: randomUUID() }))).rejects.toThrow(
      'does not match',
    );
    await expect(service.record(event({ source: 'BLE' }))).rejects.toThrow('requires');
  });
  it('retains historical title/count after the exhibit is removed', async () => {
    await db.exhibit.delete({ where: { id: exhibitId } });
    const summary = await service.summary({ from: '2026-10-17', to: '2026-10-17' });
    expect(summary.exhibits[0]).toMatchObject({
      exhibitId: null,
      title: 'Test exhibit',
      visits: 5,
    });
  });
});
