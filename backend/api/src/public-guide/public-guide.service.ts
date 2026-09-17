import { Injectable } from '@nestjs/common';
import {
  BeaconDisabledException,
  BeaconNotFoundException,
  NoActiveExhibitException,
  ZoneNotFoundException,
} from '../common/errors/app.exception';
import { ExhibitContentService } from '../exhibits/exhibit-content.service';
import { ExhibitResolverService } from '../exhibits/exhibit-resolver.service';
import { LanguageListSource, LanguageOption } from '../languages/language-catalog';
import { OfferedLanguagesService } from '../languages/offered-languages.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActiveExhibitResponse, PublicBeacon, PublicZone } from './public-guide.types';

/**
 * Everything the visitor facing clients need, and nothing else.
 *
 * Both entry points (BLE beacon identifier, QR zone code) funnel into the same
 * `resolveForZone` method, which delegates the scheduling rule to
 * {@link ExhibitResolverService}. There is exactly one implementation of
 * "what is on display here right now".
 */
@Injectable()
export class PublicGuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ExhibitResolverService,
    private readonly content: ExhibitContentService,
    private readonly offeredLanguages: OfferedLanguagesService,
  ) {}

  /**
   * The languages visitors can choose - the ones the AI service can produce.
   * `supported` (codes only) is kept for clients that predate `languages`.
   */
  languages(): {
    default: string;
    supported: string[];
    languages: LanguageOption[];
    source: LanguageListSource;
  } {
    const offered = this.offeredLanguages.offered();
    return {
      default: offered.default,
      supported: offered.languages.map((language) => language.code),
      languages: offered.languages,
      source: offered.source,
    };
  }

  async getZoneByCode(zoneCode: string): Promise<PublicZone> {
    const zone = await this.prisma.zone.findUnique({
      where: { code: zoneCode.toUpperCase().trim() },
      select: { id: true, code: true, name: true, description: true, floor: true },
    });
    if (!zone) throw new ZoneNotFoundException(zoneCode);
    return zone;
  }

  /**
   * Beacon registry handed to the mobile app on startup so the BLE scanner can
   * match advertising packets locally. Contains only museum infrastructure -
   * no visitor data is involved in either direction.
   */
  async listBeacons(): Promise<PublicBeacon[]> {
    const beacons = await this.prisma.beacon.findMany({
      where: { enabled: true },
      orderBy: { identifier: 'asc' },
      include: { zone: { select: { code: true, name: true } } },
    });

    return beacons.map((beacon) => ({
      identifier: beacon.identifier,
      name: beacon.name,
      protocol: beacon.protocol,
      namespaceId: beacon.namespaceId,
      instanceId: beacon.instanceId,
      uuid: beacon.uuid,
      major: beacon.major,
      minor: beacon.minor,
      txPower: beacon.txPower,
      advertisingIntervalMs: beacon.advertisingIntervalMs,
      minRssi: beacon.minRssi,
      zoneCode: beacon.zone.code,
      zoneName: beacon.zone.name,
    }));
  }

  /** QR flow: zone code -> zone -> active assignment -> localised exhibit. */
  async resolveByZoneCode(
    zoneCode: string,
    language: string,
    at: Date = new Date(),
  ): Promise<ActiveExhibitResponse> {
    const zone = await this.getZoneByCode(zoneCode);
    return this.resolveForZone(zone, null, language, at);
  }

  /** BLE flow: beacon identifier -> zone -> active assignment -> localised exhibit. */
  async resolveByBeaconIdentifier(
    identifier: string,
    language: string,
    at: Date = new Date(),
  ): Promise<ActiveExhibitResponse> {
    const beacon = await this.prisma.beacon.findUnique({
      where: { identifier: identifier.toUpperCase().trim() },
      include: {
        zone: { select: { id: true, code: true, name: true, description: true, floor: true } },
      },
    });

    if (!beacon) throw new BeaconNotFoundException(identifier);
    if (!beacon.enabled) throw new BeaconDisabledException(identifier);

    return this.resolveForZone(
      beacon.zone,
      { identifier: beacon.identifier, name: beacon.name },
      language,
      at,
    );
  }

  async getExhibit(exhibitId: string, language: string) {
    return this.content.localiseExhibit(exhibitId, language);
  }

  // -------------------------------------------------------------------------

  private async resolveForZone(
    zone: PublicZone,
    beacon: { identifier: string; name: string } | null,
    language: string,
    at: Date,
  ): Promise<ActiveExhibitResponse> {
    const resolution = await this.resolver.resolveActiveExhibit(zone.id, at, {
      requirePublished: true,
    });

    // DRAFT/ARCHIVED and "nothing scheduled" are the same thing for a visitor:
    // there is no content to show here right now.
    if (resolution.reason !== 'RESOLVED' || !resolution.assignment) {
      throw new NoActiveExhibitException(zone.code, at);
    }

    const assignment = resolution.assignment;
    const exhibit = await this.content.localiseExhibit(assignment.exhibit.id, language, {
      requirePublished: true,
    });

    return {
      zone,
      beacon,
      assignment: {
        id: assignment.id,
        activeFrom: assignment.activeFrom.toISOString(),
        activeTo: assignment.activeTo ? assignment.activeTo.toISOString() : null,
      },
      exhibit,
      resolvedAt: at.toISOString(),
    };
  }
}
