import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiServiceProfile } from '@prisma/client';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  LanguageListSource,
  LanguageOption,
  languageOption,
  resolveOfferedLanguages,
} from './language-catalog';

const PROFILE_ID = 'default';

/** The stored lastSeenAt only matters after an API restart, so it may lag this much. */
const LAST_SEEN_PRECISION_MS = 5 * 60_000;

export interface AiServiceReport {
  languages: string[];
  translationModel: string | null;
  ttsModels: string[];
  device: string | null;
  seenAt: Date;
}

export interface OfferedLanguages {
  default: string;
  source: LanguageListSource;
  languages: LanguageOption[];
}

/**
 * Which languages the museum offers - to staff generating content and to
 * visitors choosing a language - based on what the AI service reported.
 *
 * The report is cached in memory (read on every public request) and persisted,
 * so a restarted API or a Colab runtime that is switched off does not shrink
 * the list back to the environment default.
 */
@Injectable()
export class OfferedLanguagesService implements OnModuleInit {
  private readonly logger = new Logger(OfferedLanguagesService.name);
  private profile: AiServiceProfile | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.profile = await this.prisma.aiServiceProfile.findUnique({ where: { id: PROFILE_ID } });
  }

  offered(): OfferedLanguages {
    const { source, codes } = resolveOfferedLanguages({
      reported: this.profile?.languages ?? null,
      configured: this.config.supportedLanguages,
      defaultLanguage: this.config.defaultLanguage,
    });
    return { default: this.config.defaultLanguage, source, languages: codes.map(languageOption) };
  }

  codes(): string[] {
    return this.offered().languages.map((language) => language.code);
  }

  /** The last stored report, for showing models while the AI service is offline. */
  lastReport(): AiServiceProfile | null {
    return this.profile;
  }

  async record(report: AiServiceReport): Promise<void> {
    const previous = this.profile;
    const changed =
      !previous ||
      !sameList(previous.languages, report.languages) ||
      !sameList(previous.ttsModels, report.ttsModels) ||
      previous.translationModel !== report.translationModel ||
      previous.device !== report.device;
    const stale =
      !previous || report.seenAt.getTime() - previous.lastSeenAt.getTime() > LAST_SEEN_PRECISION_MS;
    if (!changed && !stale) return;

    const data = {
      languages: report.languages,
      translationModel: report.translationModel,
      ttsModels: report.ttsModels,
      device: report.device,
      lastSeenAt: report.seenAt,
    };
    this.profile = await this.prisma.aiServiceProfile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...data },
      update: data,
    });
    if (changed && report.languages.length) {
      this.logger.log(
        `AI service offers ${report.languages.length} languages: ${report.languages.join(', ')}`,
      );
    }
  }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
