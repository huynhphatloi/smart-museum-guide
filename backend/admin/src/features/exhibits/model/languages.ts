import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { LanguageOption, LanguagesResponse } from '@/lib/types';

/**
 * Languages staff can generate: the ones the AI service's models support, as
 * reported to the API (or SUPPORTED_LANGUAGES until the service has reported).
 * The same list is offered to visitors, so it comes from the public endpoint.
 */
export function useOfferedLanguages() {
  return useQuery({
    queryKey: ['languages'],
    queryFn: () => apiFetch<LanguagesResponse>('/public/languages'),
    staleTime: 60_000,
  });
}

export function languageLabel(code: string, languages: readonly LanguageOption[]): string {
  return (
    languages.find((language) => language.code === code)?.nativeName ?? nativeLanguageName(code)
  );
}

/** Name of a language in itself from the browser (e.g. "fr" -> "français"), for codes the API did not name. */
export function nativeLanguageName(code: string): string {
  try {
    const tag = code.replace(/-hant$/i, '-Hant').replace(/-hans$/i, '-Hans');
    return new Intl.DisplayNames([tag], { type: 'language' }).of(tag) ?? code;
  } catch {
    return code;
  }
}

/** Position in the offered list, so every list shows languages in the same order. */
export function languageOrder(code: string, languages: readonly LanguageOption[]): number {
  const index = languages.findIndex((language) => language.code === code);
  return index === -1 ? languages.length : index;
}
