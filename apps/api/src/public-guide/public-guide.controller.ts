import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { GuideQueryDto } from './dto/public-guide.dto';
import { PublicGuideService } from './public-guide.service';

/**
 * Unauthenticated, visitor facing endpoints. No account, no tracking, no
 * personally identifying data is accepted or stored by any of these routes.
 */
@Controller()
export class PublicGuideController {
  constructor(
    private readonly guide: PublicGuideService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('public/languages')
  languages() {
    return this.guide.languages();
  }

  /** Beacon registry for the mobile scanner (identifier <-> uuid/major/minor). */
  @Get('public/beacons')
  beacons() {
    return this.guide.listBeacons();
  }

  @Get('public/zones/:zoneCode')
  zone(@Param('zoneCode') zoneCode: string) {
    return this.guide.getZoneByCode(zoneCode);
  }

  /** QR fallback entry point. */
  @Get('public/zones/:zoneCode/active-exhibit')
  activeExhibitForZone(@Param('zoneCode') zoneCode: string, @Query() query: GuideQueryDto) {
    return this.guide.resolveByZoneCode(zoneCode, this.language(query), this.at(query));
  }

  /** BLE entry point - called once per *confirmed* zone, never per RSSI sample. */
  @Get('public/beacons/:identifier/active-exhibit')
  activeExhibitForBeacon(@Param('identifier') identifier: string, @Query() query: GuideQueryDto) {
    return this.guide.resolveByBeaconIdentifier(identifier, this.language(query), this.at(query));
  }

  @Get('public/exhibits/:id')
  exhibit(@Param('id') id: string, @Query() query: GuideQueryDto) {
    return this.guide.getExhibit(id, this.language(query));
  }

  private language(query: GuideQueryDto): string {
    return (query.lang ?? this.config.defaultLanguage).toLowerCase();
  }

  private at(query: GuideQueryDto): Date {
    return query.at ? new Date(query.at) : new Date();
  }
}
