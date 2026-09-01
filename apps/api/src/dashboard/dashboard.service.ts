import { Injectable } from '@nestjs/common';
import { ExhibitResolverService } from '../exhibits/exhibit-resolver.service';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardZoneRow {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  beaconCount: number;
  enabledBeaconCount: number;
  currentExhibit: { id: string; code: string; title: string; status: string } | null;
  currentReason: string;
  /** When the current exhibit went on display in this zone. */
  onDisplaySince: string | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ExhibitResolverService,
  ) {}

  async summary(at: Date = new Date()) {
    const [
      zoneCount,
      beaconCount,
      disabledBeacons,
      exhibitCount,
      publishedCount,
      assignmentCount,
      languages,
    ] = await Promise.all([
      this.prisma.zone.count(),
      this.prisma.beacon.count(),
      this.prisma.beacon.count({ where: { enabled: false } }),
      this.prisma.exhibit.count(),
      this.prisma.exhibit.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.exhibitAssignment.count(),
      this.prisma.exhibitTranslation.findMany({
        distinct: ['languageCode'],
        select: { languageCode: true },
        orderBy: { languageCode: 'asc' },
      }),
    ]);

    const zones = await this.prisma.zone.findMany({
      orderBy: { code: 'asc' },
      include: { beacons: { select: { enabled: true } } },
    });

    const rows: DashboardZoneRow[] = [];
    for (const zone of zones) {
      const timeline = await this.resolver.getZoneTimeline(zone.id, at);
      const current = timeline.current;

      rows.push({
        zoneId: zone.id,
        zoneCode: zone.code,
        zoneName: zone.name,
        beaconCount: zone.beacons.length,
        enabledBeaconCount: zone.beacons.filter((beacon) => beacon.enabled).length,
        currentExhibit: current
          ? {
              id: current.exhibit.id,
              code: current.exhibit.code,
              title: current.exhibit.defaultTitle,
              status: current.exhibit.status,
            }
          : null,
        currentReason: timeline.currentReason,
        onDisplaySince: current?.activeFrom.toISOString() ?? null,
      });
    }

    return {
      generatedAt: at.toISOString(),
      counts: {
        zones: zoneCount,
        beacons: beaconCount,
        disabledBeacons,
        exhibits: exhibitCount,
        publishedExhibits: publishedCount,
        scheduleEntries: assignmentCount,
      },
      languages: languages.map((row) => row.languageCode),
      zones: rows,
      /** Zones with no published exhibit right now - the CMS highlights these. */
      zonesWithoutContent: rows
        .filter((row) => row.currentExhibit === null)
        .map((row) => row.zoneCode),
    };
  }
}
