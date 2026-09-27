import { SurveyPointKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const FLOOR_PLAN_CODE_PATTERN = /^[A-Z0-9_-]+$/;

// A museum hall can be large, but not a kilometre.
const MAX_METRES = 1000;

export class CreateFloorPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(FLOOR_PLAN_CODE_PATTERN, {
    message: 'code must contain only A-Z, 0-9, underscore or dash (e.g. DEMO_ROOM).',
  })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(MAX_METRES)
  widthMeters!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(MAX_METRES)
  heightMeters!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  positioningK?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-127)
  @Max(-60)
  fillDbm?: number;
}

export class UpdateFloorPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(MAX_METRES)
  widthMeters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(MAX_METRES)
  heightMeters?: number;

  /** null removes the background drawing. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  positioningK?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-127)
  @Max(-60)
  fillDbm?: number;
}

export class GenerateGridDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  @Max(50)
  spacing!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  margin!: number;
}

export class CreateSurveyPointDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_METRES)
  x!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_METRES)
  y!: number;

  @IsOptional()
  @IsEnum(SurveyPointKind)
  kind?: SurveyPointKind;
}

export class UpdateSurveyPointDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_METRES)
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(MAX_METRES)
  y?: number;

  @IsOptional()
  @IsEnum(SurveyPointKind)
  kind?: SurveyPointKind;
}

export class CreateSurveyCaptureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deviceModel!: string;

  @IsIn(['ios', 'android', 'simulator'])
  platform!: 'ios' | 'android' | 'simulator';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 90, 180, 270])
  orientationDeg?: number;

  @IsDateString()
  startedAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(600_000)
  durationMs!: number;

  /** Checked element by element in the service - see parseCapturePayload. */
  @IsArray()
  samples!: unknown[];

  @IsObject()
  fingerprint!: Record<string, number>;
}
