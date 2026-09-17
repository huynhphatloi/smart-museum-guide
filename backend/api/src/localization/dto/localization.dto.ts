import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Same shape as exhibit.dto.ts: vi, en, zh-hant, pt-BR. */
const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

// ---- CMS -> API -------------------------------------------------------------

export class RequestLocalizationDto {
  @IsString()
  @Matches(LANGUAGE_PATTERN, { message: 'sourceLanguage must look like "vi", "en" or "zh-hant".' })
  sourceLanguage!: string;

  /** Languages to translate into and narrate. The source language is always narrated. */
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @Matches(LANGUAGE_PATTERN, {
    each: true,
    message: 'Each target language must look like "vi" or "en".',
  })
  targetLanguages!: string[];

  /** Languages to regenerate even when they are up to date with the source copy. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @Matches(LANGUAGE_PATTERN, {
    each: true,
    message: 'Each forced language must look like "vi" or "en".',
  })
  forceLanguages?: string[];
}

// ---- AI service -> API --------------------------------------------------------

export class AiServiceHeartbeatDto {
  /** Random per process: a new value means the previous queue is gone. */
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  instanceId!: string;

  /** Public base URL the API can POST jobs to (e.g. a trycloudflare.com tunnel). */
  @IsUrl({ require_tld: false, require_protocol: true })
  url!: string;

  @IsInt()
  @Min(0)
  queueSize!: number;

  /** Tasks queued, running or waiting for webhook delivery inside the service. */
  @IsArray()
  @IsString({ each: true })
  activeTaskIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  translationModel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ttsModels?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  device?: string;

  /** Language codes both of its models cover; these become the languages the museum offers. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Matches(LANGUAGE_PATTERN, {
    each: true,
    message: 'Each language must look like "vi" or "zh-hant".',
  })
  languages?: string[];
}

export const LOCALIZATION_EVENTS = ['task.processing', 'task.completed', 'task.failed'] as const;
export type LocalizationEvent = (typeof LOCALIZATION_EVENTS)[number];

export class TranslatedCopyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class NarrationAudioDto {
  @IsString()
  @MinLength(1)
  base64!: string;

  @IsString()
  @Matches(/^audio\/[a-z0-9.+-]+$/, { message: 'mimeType must be an audio/* type.' })
  mimeType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;
}

export class ModelInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  translation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tts?: string | null;
}

export class LocalizationWebhookDto {
  @IsIn(LOCALIZATION_EVENTS)
  event!: LocalizationEvent;

  @IsString()
  taskId!: string;

  @IsOptional()
  @IsIn(['translating', 'synthesizing'])
  stage?: 'translating' | 'synthesizing';

  @IsOptional()
  @ValidateNested()
  @Type(() => TranslatedCopyDto)
  translation?: TranslatedCopyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NarrationAudioDto)
  audio?: NarrationAudioDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ModelInfoDto)
  models?: ModelInfoDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  error?: string;
}
