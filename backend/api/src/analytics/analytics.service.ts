import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicGuideService } from '../public-guide/public-guide.service';
import { AnalyticsQueryDto, RecordVisitDto, UpdateAnalyticsSettingsDto } from './analytics.dto';
import { analyticsRange, localDate } from './analytics-range';

export const VISIT_DEDUP_MS = 30 * 60_000;
const PAGE_SIZE = 25;
const SETTINGS_ID = 'default';
type Counts = { visits: bigint; devices: bigint; qr: bigint; ble: bigint; manual: bigint };
const numericCounts = (row: Counts, multiplier: number) => ({
  visits: Number(row.visits *2 ),
  devices: Number(row.devices),
  qr: Number(row.qr),
  ble: Number(row.ble),
  manual: Number(row.manual),
  converted: {
    visits: Number(row.visits) * multiplier,
    qr: Number(row.qr) * multiplier,
    ble: Number(row.ble) * multiplier,
    manual: Number(row.manual) * multiplier,
  },
});
const counts = Prisma.sql`COUNT(*)::bigint AS visits,
  COUNT(DISTINCT "visitorId")::bigint AS devices,
  COUNT(*) FILTER (WHERE source = 'QR')::bigint AS qr,
  COUNT(*) FILTER (WHERE source = 'BLE')::bigint AS ble,
  COUNT(*) FILTER (WHERE source = 'MANUAL')::bigint AS manual`;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guide: PublicGuideService,
  ) {}

  async settings() {
    const settings = await this.prisma.analyticsSettings.findUnique({ where: { id: SETTINGS_ID } });
    return { visitMultiplier: settings?.visitMultiplier ?? 1 };
  }

  async updateSettings(body: UpdateAnalyticsSettingsDto) {
    const settings = await this.prisma.analyticsSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, visitMultiplier: body.visitMultiplier },
      update: { visitMultiplier: body.visitMultiplier },
    });
    return { visitMultiplier: settings.visitMultiplier };
  }

  async record(body: RecordVisitDto, now = new Date()) {
    if (body.source === 'BLE' && (!body.beaconIdentifier || body.platform === 'WEB'))
      throw new BadRequestException('BLE access requires a mobile beacon identifier.');
    const resolved =
      body.source === 'BLE'
        ? await this.guide.resolveByBeaconIdentifier(body.beaconIdentifier!, 'vi', now)
        : await this.guide.resolveByZoneCode(body.zoneCode, 'vi', now);
    if (
      resolved.exhibit.id !== body.exhibitId ||
      resolved.zone.code !== body.zoneCode.toUpperCase()
    )
      throw new BadRequestException('The exhibit does not match the active zone content.');

    return this.prisma.$transaction(async (tx) => {
      // Serialise concurrent tabs/retries for one anonymous visitor and exhibit.
      // This lock is scoped to this transaction and needs no additional table.
      const key = `${body.visitorId}:${body.exhibitId}:${body.source}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
      const previous = await tx.exhibitVisit.findFirst({
        where: {
          visitorId: body.visitorId,
          exhibitId: body.exhibitId,
          source: body.source,
          occurredAt: { gte: new Date(now.getTime() - VISIT_DEDUP_MS) },
        },
        select: { id: true },
      });
      if (previous) return { recorded: false };
      const result = await tx.exhibitVisit.createMany({
        data: [
          {
            id: body.eventId,
            visitorId: body.visitorId,
            exhibitId: body.exhibitId,
            exhibitCode: resolved.exhibit.code,
            exhibitTitle: resolved.exhibit.title,
            zoneCode: resolved.zone.code,
            source: body.source,
            platform: body.platform,
            occurredAt: now,
          },
        ],
        skipDuplicates: true,
      });
      return { recorded: result.count === 1 };
    });
  }

  async summary(query: AnalyticsQueryDto, now = new Date()) {
    const range = analyticsRange(query, now);
    // Prisma stores DateTime as UTC timestamp without time zone. Explicit casts
    // prevent the database session's time zone from shifting raw query bounds.
    const where = Prisma.sql`"occurredAt" >= ${range.start.toISOString()}::timestamp
      AND "occurredAt" < ${range.end.toISOString()}::timestamp
      ${query.source ? Prisma.sql`AND source = ${query.source}` : Prisma.empty}`;
    const page = Number(query.page ?? 1);
    const offset = (page - 1) * PAGE_SIZE;
    // One database snapshot keeps totals, charts and the history in agreement.
    const [totals, ranked, hourlyRows, dailyRows, recent, settings] = await this.prisma.$transaction(
      [
        this.prisma.$queryRaw<Counts[]>(
          Prisma.sql`SELECT ${counts} FROM exhibit_visits WHERE ${where}`,
        ),
        this.prisma.$queryRaw<
          Array<
            Counts & { exhibitId: string | null; code: string; title: string; lastVisitAt: Date }
          >
        >(
          Prisma.sql`SELECT "exhibitId", "exhibitCode" AS code,
          (array_agg("exhibitTitle" ORDER BY "occurredAt" DESC))[1] AS title,
          MAX("occurredAt") AS "lastVisitAt", ${counts}
          FROM exhibit_visits WHERE ${where}
          GROUP BY "exhibitId", "exhibitCode" ORDER BY visits DESC, code ASC LIMIT 20`,
        ),
        this.prisma.$queryRaw<Array<Counts & { hour: number }>>(Prisma.sql`
        SELECT EXTRACT(HOUR FROM "occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour,
          ${counts} FROM exhibit_visits WHERE ${where} GROUP BY hour ORDER BY hour`),
        this.prisma.$queryRaw<Array<Counts & { date: string }>>(Prisma.sql`
        SELECT to_char("occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
          ${counts} FROM exhibit_visits WHERE ${where} GROUP BY date ORDER BY date`),
        this.prisma.exhibitVisit.findMany({
          where: {
            occurredAt: { gte: range.start, lt: range.end },
            ...(query.source ? { source: query.source } : {}),
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: offset,
          take: PAGE_SIZE,
          // The dashboard never exposes anonymous visitor identifiers.
          select: {
            id: true,
            exhibitId: true,
            exhibitCode: true,
            exhibitTitle: true,
            zoneCode: true,
            source: true,
            platform: true,
            occurredAt: true,
          },
        }),
        this.prisma.analyticsSettings.findUnique({ where: { id: SETTINGS_ID } }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const multiplier = settings?.visitMultiplier ?? 1;
    const zero = numericCounts({ visits: 0n, devices: 0n, qr: 0n, ble: 0n, manual: 0n }, multiplier);
    const hours = Array.from({ length: 24 }, (_, hour) => {
      const row = hourlyRows.find((item) => item.hour === hour);
      return { hour, ...(row ? numericCounts(row, multiplier) : zero) };
    });
    const daily = Array.from({ length: range.days }, (_, index) => {
      const date = localDate(new Date(range.start.getTime() + index * 86_400_000));
      const row = dailyRows.find((item) => item.date === date);
      return { date, ...(row ? numericCounts(row, multiplier) : zero) };
    });
    const total = numericCounts(totals[0], multiplier);
    const peak = Math.max(...hours.map((row) => row.visits));
    return {
      range: { from: range.from, to: range.to, timeZone: range.timeZone },
      generatedAt: now.toISOString(),
      source: query.source ?? null,
      dedupMinutes: VISIT_DEDUP_MS / 60_000,
      conversion: { visitMultiplier: multiplier },
      totals: total,
      peakHours: peak > 0 ? hours.filter((row) => row.visits === peak).map((row) => row.hour) : [],
      exhibits: ranked.map((row) => ({
        exhibitId: row.exhibitId,
        code: row.code,
        title: row.title,
        lastVisitAt: row.lastVisitAt.toISOString(),
        ...numericCounts(row, multiplier),
      })),
      hourly: hours,
      daily,
      history: {
        page,
        pageSize: PAGE_SIZE,
        total: total.visits,
        items: recent.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() })),
      },
    };
  }
}
