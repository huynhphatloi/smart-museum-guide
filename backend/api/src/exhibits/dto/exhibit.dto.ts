import { ExhibitStatus, MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const CODE_PATTERN = /^[A-Z0-9_-]+$/;
/** ISO-639 style code, optionally with a region suffix: vi, en, zh-Hans, pt-BR. */
const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export class UpsertTranslationDto {
  @IsString()
  @Matches(LANGUAGE_PATTERN, { message: 'languageCode must look like "vi", "en" or "zh-Hans".' })
  languageCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}

export class CreateExhibitDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(CODE_PATTERN, { message: 'code must contain only A-Z, 0-9, underscore or dash.' })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  defaultTitle!: string;

  @IsOptional()
  @IsEnum(ExhibitStatus)
  status?: ExhibitStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertTranslationDto)
  translations?: UpsertTranslationDto[];
}

export class UpdateExhibitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  defaultTitle?: string;

  @IsOptional()
  @IsEnum(ExhibitStatus)
  status?: ExhibitStatus;
}

export class UpdateTranslationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}

export class CreateMediaDto {
  @IsEnum(MediaType)
  type!: MediaType;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class QueryExhibitsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ExhibitStatus)
  status?: ExhibitStatus;
}

export class LocalizeExhibitDto {
  @IsString()
  @Matches(LANGUAGE_PATTERN, { message: 'sourceLanguage must look like "vi", "en" or "zh-Hans".' })
  sourceLanguage!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(LANGUAGE_PATTERN, { each: true, message: 'Each target language must look like "vi" or "en".' })
  targetLanguages!: string[];
}
