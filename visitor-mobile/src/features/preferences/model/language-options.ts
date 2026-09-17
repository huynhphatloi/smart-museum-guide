import { LanguageOption, LanguagesResponse } from '../../../shared/api/types';
import { languageLabel } from '../../../shared/i18n';

/** Offered until the museum server answers, e.g. when it cannot be reached at startup. */
export const FALLBACK_LANGUAGE_CODES = ['vi', 'en'];

export function optionsForCodes(codes: readonly string[]): LanguageOption[] {
  return codes.map((code) => ({ code, name: code, nativeName: languageLabel(code) }));
}

/**
 * The languages the museum offers, as the server reports them: the ones its AI
 * service can translate and narrate. Older servers only send codes.
 */
export function languageOptionsFrom(response: LanguagesResponse): LanguageOption[] {
  return response.languages?.length ? response.languages : optionsForCodes(response.supported);
}

/** Reads the list cached from a previous visit; anything malformed is ignored. */
export function parseStoredLanguageOptions(raw: string | null): LanguageOption[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as LanguageOption).code === 'string' &&
        typeof (item as LanguageOption).name === 'string' &&
        typeof (item as LanguageOption).nativeName === 'string',
    );
    return valid ? (parsed as LanguageOption[]) : null;
  } catch {
    return null;
  }
}

export function findLanguageOption(
  options: readonly LanguageOption[],
  code: string,
): LanguageOption | undefined {
  return options.find((option) => option.code.toLowerCase() === code.toLowerCase());
}
