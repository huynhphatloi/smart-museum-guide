import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { MediaStorageService } from '../media/media-storage.service';
import { LocalizeExhibitDto } from './dto/exhibit.dto';
import { ExhibitsService } from './exhibits.service';

const LANGUAGE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const TRANSLATE_MODEL = 'gpt-4o-mini';
const TTS_MODEL = 'tts-1';
const TTS_VOICE = 'nova';

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Simplified Chinese',
  'zh-hant': 'Traditional Chinese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  km: 'Khmer',
  lo: 'Lao',
  fil: 'Filipino',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  cs: 'Czech',
  sv: 'Swedish',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  uk: 'Ukrainian',
};

export type LocalizeLanguageResult = {
  languageCode: string;
  translated: boolean;
  audioGenerated: boolean;
  skippedReason?: string;
};

export type LocalizeExhibitResult = {
  sourceLanguage: string;
  generated: LocalizeLanguageResult[];
  warning?: string;
};

type CopyFields = {
  title: string;
  shortDescription: string | null;
  description: string | null;
};

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

function hasStaffCopy(row: { title: string } | null | undefined): boolean {
  return Boolean(row?.title?.trim());
}

function narrationText(copy: CopyFields): string {
  return [copy.title, copy.shortDescription, copy.description]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('. ')
    .slice(0, 4096);
}

function parseTranslatedCopy(raw: string, fallbackTitle: string): CopyFields {
  const parsed = JSON.parse(raw) as Partial<CopyFields>;
  return {
    title:
      typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallbackTitle,
    shortDescription:
      typeof parsed.shortDescription === 'string' && parsed.shortDescription.trim()
        ? parsed.shortDescription.trim()
        : null,
    description:
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : null,
  };
}

function uniqueLanguageCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of codes) {
    const code = raw.trim().toLowerCase();
    if (!LANGUAGE_PATTERN.test(code) || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

/** Exported for unit tests only. */
export const narrationTextForTest = narrationText;
/** Exported for unit tests only. */
export const parseTranslatedCopyForTest = parseTranslatedCopy;

@Injectable()
export class ExhibitLocalizeService {
  private readonly logger = new Logger(ExhibitLocalizeService.name);

  constructor(
    private readonly exhibits: ExhibitsService,
    private readonly storage: MediaStorageService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async localize(exhibitId: string, dto: LocalizeExhibitDto): Promise<LocalizeExhibitResult> {
    const exhibit = await this.exhibits.findOne(exhibitId);
    const sourceLanguage = dto.sourceLanguage.trim().toLowerCase();
    const source = exhibit.translations.find((row) => row.languageCode === sourceLanguage);

    if (!source?.title.trim()) {
      throw new BadRequestException(
        'Save the primary-language title and body before generating translations.',
      );
    }

    const sourceCopy: CopyFields = {
      title: source.title,
      shortDescription: source.shortDescription,
      description: source.description,
    };

    const requested = uniqueLanguageCodes([sourceLanguage, ...(dto.targetLanguages ?? [])]);
    const generated: LocalizeLanguageResult[] = [];

    if (!this.config.openaiApiKey) {
      return {
        sourceLanguage,
        generated: requested.map((languageCode) => ({
          languageCode,
          translated: false,
          audioGenerated: false,
          skippedReason: 'no_api_key',
        })),
        warning:
          'OPENAI_API_KEY is not configured. The exhibit was saved; write translations and audio by hand, or set the key and save again.',
      };
    }

    for (const languageCode of requested) {
      const existing = exhibit.translations.find((row) => row.languageCode === languageCode);
      const isSource = languageCode === sourceLanguage;
      const needsTranslation =
        !isSource &&
        (!hasStaffCopy(existing) ||
          (!existing?.shortDescription?.trim() && Boolean(sourceCopy.shortDescription?.trim())) ||
          (!existing?.description?.trim() && Boolean(sourceCopy.description?.trim())));

      try {
        const generatedCopy = needsTranslation
          ? await this.translateCopy(sourceCopy, sourceLanguage, languageCode)
          : sourceCopy;
        const copy: CopyFields = isSource
          ? sourceCopy
          : {
              title: existing?.title?.trim() || generatedCopy.title,
              shortDescription:
                existing?.shortDescription?.trim() || generatedCopy.shortDescription,
              description: existing?.description?.trim() || generatedCopy.description,
            };

        const translated = needsTranslation;
        let audioUrl = existing?.audioUrl ?? null;
        let audioGenerated = false;
        let skippedReason: string | undefined =
          !needsTranslation && !isSource && hasStaffCopy(existing) ? 'already_exists' : undefined;

        if (translated) {
          await this.exhibits.upsertTranslation(exhibitId, {
            languageCode,
            title: copy.title,
            shortDescription: copy.shortDescription ?? undefined,
            description: copy.description ?? undefined,
            audioUrl: audioUrl ?? undefined,
          });
        }

        if (!audioUrl) {
          try {
            audioUrl = await this.speakAndStore(narrationText(copy), languageCode, exhibitId);
            audioGenerated = Boolean(audioUrl);
            if (audioGenerated) {
              await this.exhibits.upsertTranslation(exhibitId, {
                languageCode,
                title: copy.title,
                shortDescription: copy.shortDescription ?? undefined,
                description: copy.description ?? undefined,
                audioUrl: audioUrl ?? undefined,
              });
              if (skippedReason === 'already_exists') skippedReason = undefined;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'TTS failed';
            this.logger.warn(`TTS failed for ${exhibitId}/${languageCode}: ${message}`);
            skippedReason = translated ? `audio: ${message}` : message;
          }
        }

        generated.push({ languageCode, translated, audioGenerated, skippedReason });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown localize error';
        this.logger.warn(`Localize failed for ${exhibitId}/${languageCode}: ${message}`);
        generated.push({
          languageCode,
          translated: false,
          audioGenerated: false,
          skippedReason: message,
        });
      }
    }

    const failures = generated.filter(
      (row) => row.skippedReason && row.skippedReason !== 'already_exists',
    );
    return {
      sourceLanguage,
      generated,
      warning: failures.length
        ? `Some languages were not generated: ${failures.map((row) => `${row.languageCode} (${row.skippedReason})`).join('; ')}`
        : undefined,
    };
  }

  private async translateCopy(
    source: CopyFields,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<CopyFields> {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You translate museum exhibit copy. Return JSON with keys title, shortDescription, description. Keep tone formal and visitor-friendly. Preserve proper names. Use null for empty optional fields.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              sourceLanguage: languageName(sourceLanguage),
              targetLanguage: languageName(targetLanguage),
              title: source.title,
              shortDescription: source.shortDescription,
              description: source.description,
            }),
          },
        ],
      }),
    });

    const payload = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `OpenAI translation failed (${response.status})`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI returned an empty translation.');
    return parseTranslatedCopy(content, source.title);
  }

  private async speakAndStore(
    text: string,
    languageCode: string,
    exhibitId: string,
  ): Promise<string | null> {
    if (!text.trim()) return null;

    const response = await fetch(OPENAI_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(payload?.error?.message ?? `OpenAI TTS failed (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await this.storage.save({
      originalname: `${exhibitId}-${languageCode}.mp3`,
      mimetype: 'audio/mpeg',
      size: buffer.length,
      buffer,
    });
    return stored.url;
  }
}
