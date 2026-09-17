import { LocalizationStatus } from '@prisma/client';
import { LocalizationSkipReason } from './localization.planner';

export interface AiServiceStatus {
  /** AI_SERVICE_SECRET is set, so an AI service is able to connect. */
  configured: boolean;
  /** A heartbeat arrived recently. */
  online: boolean;
  lastSeenAt: string | null;
  queueSize: number | null;
  translationModel: string | null;
  ttsModels: string[];
  device: string | null;
}

export interface RequestLocalizationResult {
  sourceLanguage: string;
  queued: string[];
  skipped: { languageCode: string; reason: LocalizationSkipReason }[];
  aiService: AiServiceStatus;
}

/**
 * What the CMS shows per language. Task states come straight from the newest
 * task; COMPLETED / NO_AUDIO describe a language with no task in flight.
 */
export type LanguageLocalizationStatus = Exclude<LocalizationStatus, 'SUPERSEDED'> | 'NO_AUDIO';

export interface LanguageLocalization {
  languageCode: string;
  isSource: boolean;
  status: LanguageLocalizationStatus;
  stage: string | null;
  error: string | null;
  /** Translation and narration were generated from the current primary copy. */
  upToDate: boolean;
  task: {
    id: string;
    status: LocalizationStatus;
    sourceLanguage: string;
    createdAt: Date;
    updatedAt: Date;
    dispatchedAt: Date | null;
    completedAt: Date | null;
    translationModel: string | null;
    ttsModel: string | null;
  } | null;
  translation: {
    id: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
    audioUrl: string | null;
    updatedAt: Date;
  } | null;
}

export interface ExhibitLocalization {
  sourceLanguage: string | null;
  languages: LanguageLocalization[];
  aiService: AiServiceStatus;
}
