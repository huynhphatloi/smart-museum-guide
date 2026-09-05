import { Inject, Injectable } from '@nestjs/common';
import { ExhibitStatus } from '@prisma/client';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import {
  ExhibitNotFoundException,
  ExhibitNotPublishedException,
} from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { LocalisedExhibit } from './exhibit.types';

interface TranslationRow {
  languageCode: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  audioUrl: string | null;
}

/**
 * Picks the best translation for a requested language.
 *
 * Order: exact match -> configured default language -> first available.
 * Pure and exported so the rule is unit testable.
 */
export function pickTranslation(
  translations: readonly TranslationRow[],
  requested: string,
  defaultLanguage: string,
): TranslationRow | null {
  if (translations.length === 0) return null;

  const normalised = requested.toLowerCase();
  const exact = translations.find((t) => t.languageCode.toLowerCase() === normalised);
  if (exact) return exact;

  // "pt-BR" should still find "pt" if that is all we have.
  const base = normalised.split('-')[0];
  const baseMatch = translations.find((t) => t.languageCode.toLowerCase().split('-')[0] === base);
  if (baseMatch) return baseMatch;

  const fallback = translations.find(
    (t) => t.languageCode.toLowerCase() === defaultLanguage.toLowerCase(),
  );
  return fallback ?? translations[0];
}

/**
 * Turns an exhibit + a requested language into the payload the mobile app and
 * the visitor web render. Handles missing translations by falling back and
 * flagging the fallback so the UI can tell the visitor.
 */
@Injectable()
export class ExhibitContentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Rewrites stored relative media paths into absolute, publicly reachable URLs. */
  toAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    return `${this.config.publicBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  async localiseExhibit(
    exhibitId: string,
    requestedLanguage: string,
    options: { requirePublished?: boolean } = {},
  ): Promise<LocalisedExhibit> {
    const requirePublished = options.requirePublished ?? true;

    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id: exhibitId },
      include: {
        translations: { orderBy: { languageCode: 'asc' } },
        media: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!exhibit) throw new ExhibitNotFoundException(exhibitId);
    if (requirePublished && exhibit.status !== ExhibitStatus.PUBLISHED) {
      throw new ExhibitNotPublishedException(exhibit.code);
    }

    const requested = (requestedLanguage || this.config.defaultLanguage).toLowerCase();
    const translation = pickTranslation(
      exhibit.translations,
      requested,
      this.config.defaultLanguage,
    );

    const language = translation?.languageCode ?? this.config.defaultLanguage;

    return {
      id: exhibit.id,
      code: exhibit.code,
      status: exhibit.status,
      language,
      requestedLanguage: requested,
      translationFallback: language.toLowerCase() !== requested,
      availableLanguages: exhibit.translations.map((t) => t.languageCode),
      title: translation?.title ?? exhibit.defaultTitle,
      shortDescription: translation?.shortDescription ?? null,
      description: translation?.description ?? null,
      audioUrl: this.toAbsoluteUrl(translation?.audioUrl ?? null),
      media: exhibit.media.map((item) => ({
        id: item.id,
        type: item.type,
        url: this.toAbsoluteUrl(item.url) as string,
        caption: item.caption,
        sortOrder: item.sortOrder,
      })),
    };
  }
}
