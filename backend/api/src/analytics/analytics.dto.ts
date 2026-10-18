import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export const VISIT_SOURCES = ['QR', 'BLE', 'MANUAL'] as const;
export type VisitSource = (typeof VISIT_SOURCES)[number];

export class RecordVisitDto {
  @IsUUID('4')
  eventId!: string;

  @IsUUID('4')
  visitorId!: string;

  @IsUUID()
  exhibitId!: string;

  @Matches(/^[A-Za-z0-9_-]{1,80}$/)
  zoneCode!: string;

  @IsIn(VISIT_SOURCES)
  source!: VisitSource;

  @IsIn(['WEB', 'IOS', 'ANDROID'])
  platform!: 'WEB' | 'IOS' | 'ANDROID';

  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{1,100}$/)
  beaconIdentifier?: string;
}

export class AnalyticsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsIn(VISIT_SOURCES)
  source?: VisitSource;

  @IsOptional()
  @Matches(/^[1-9]\d{0,5}$/)
  page?: string;
}

export class UpdateAnalyticsSettingsDto {
  @IsInt()
  @Min(1)
  @Max(100)
  visitMultiplier!: number;
}
