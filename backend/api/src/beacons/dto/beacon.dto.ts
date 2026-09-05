import { BeaconProtocol } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const IDENTIFIER_PATTERN = /^[A-Z0-9_.-]+$/;
/** Eddystone UID namespace: 10 bytes = 20 hex characters. */
const NAMESPACE_PATTERN = /^[0-9a-fA-F]{20}$/;
/** Eddystone UID instance: 6 bytes = 12 hex characters. */
const INSTANCE_PATTERN = /^[0-9a-fA-F]{12}$/;

export class CreateBeaconDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(IDENTIFIER_PATTERN, {
    message: 'identifier must contain only A-Z, 0-9, underscore, dash or dot.',
  })
  identifier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  zoneId!: string;

  @IsOptional()
  @IsEnum(BeaconProtocol)
  protocol?: BeaconProtocol;

  // --- Eddystone UID (primary identity) ------------------------------------

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @Matches(NAMESPACE_PATTERN, {
    message: 'namespaceId must be exactly 20 hexadecimal characters (10 bytes).',
  })
  namespaceId?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @Matches(INSTANCE_PATTERN, {
    message: 'instanceId must be exactly 12 hexadecimal characters (6 bytes).',
  })
  instanceId?: string;

  // --- iBeacon (secondary; also the iOS Core Location path) ----------------

  @IsOptional()
  @IsString()
  @MaxLength(64)
  uuid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  major?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  minor?: number;

  // --- radio configuration -------------------------------------------------

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-127)
  @Max(20)
  txPower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(10_000)
  advertisingIntervalMs?: number;

  /**
   * Smoothed RSSI below which the phone treats this beacon as another room.
   * Bounded to a range a real reading can fall in: -100 dBm is the noise floor,
   * -30 dBm is "almost touching it".
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(-30)
  minRssi?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateBeaconDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(BeaconProtocol)
  protocol?: BeaconProtocol;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @Matches(NAMESPACE_PATTERN, {
    message: 'namespaceId must be exactly 20 hexadecimal characters (10 bytes).',
  })
  namespaceId?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @Matches(INSTANCE_PATTERN, {
    message: 'instanceId must be exactly 12 hexadecimal characters (6 bytes).',
  })
  instanceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  uuid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  major?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  minor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-127)
  @Max(20)
  txPower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(10_000)
  advertisingIntervalMs?: number;

  /**
   * Smoothed RSSI below which the phone treats this beacon as another room.
   * Bounded to a range a real reading can fall in: -100 dBm is the noise floor,
   * -30 dBm is "almost touching it".
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(-30)
  minRssi?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class QueryBeaconsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}
