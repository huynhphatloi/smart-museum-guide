import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const ZONE_CODE_PATTERN = /^[A-Z0-9_-]+$/;

export class CreateZoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(ZONE_CODE_PATTERN, {
    message: 'code must contain only A-Z, 0-9, underscore or dash (e.g. ZONE_A01).',
  })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  floor?: string;
}

export class QueryZonesDto extends PaginationQueryDto {}

export class SetCurrentExhibitDto {
  @IsUUID()
  exhibitId!: string;
}
