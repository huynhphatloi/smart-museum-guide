export interface LanguageOption {
  code: string;
  /** English name, for staff and for sorting out ambiguities. */
  name: string;
  /** Name in the language itself - what a visitor looks for in a list. */
  nativeName: string;
}

/**
 * Display names and list order for every language the AI service can offer
 * (see ai-services/museum_ai/languages.py). Which of them are offered is
 * decided by the AI service's models, not by this list.
 */
export const LANGUAGE_CATALOG: readonly LanguageOption[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文（简体）' },
  { code: 'zh-hant', name: 'Chinese (Traditional)', nativeName: '中文（繁體）' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
];

export type LanguageListSource = 'ai-service' | 'config';

/**
 * The languages the museum offers.
 *
 * Rules:
 *  - the AI service's last report wins: staff can only generate, and visitors
 *    only choose, languages its models actually cover
 *  - until a report exists, SUPPORTED_LANGUAGES from the environment is used
 *  - the default language is always included, since every exhibit falls back to it
 *  - catalog order, unknown codes last
 */
export function resolveOfferedLanguages(input: {
  reported: readonly string[] | null;
  configured: readonly string[];
  defaultLanguage: string;
}): { source: LanguageListSource; codes: string[] } {
  const source: LanguageListSource = input.reported?.length ? 'ai-service' : 'config';
  const raw = source === 'ai-service' ? input.reported! : input.configured;
  const codes = [
    ...new Set([input.defaultLanguage, ...raw].map((code) => code.trim().toLowerCase())),
  ]
    .filter(Boolean)
    .sort((a, b) => catalogIndex(a) - catalogIndex(b));
  return { source, codes };
}

export function languageOption(code: string): LanguageOption {
  return (
    LANGUAGE_CATALOG.find((language) => language.code === code) ?? {
      code,
      name: code,
      nativeName: code,
    }
  );
}

function catalogIndex(code: string): number {
  const index = LANGUAGE_CATALOG.findIndex((language) => language.code === code);
  return index === -1 ? LANGUAGE_CATALOG.length : index;
}
