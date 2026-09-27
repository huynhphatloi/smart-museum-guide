const STORAGE_KEY = 'museum.visitor.language';

/**
 * Language resolution order:
 *   1. `?lang=` in the URL (a staff member can print a language specific QR)
 *   2. the visitor's previous choice
 *   3. the museum's default language (Vietnamese in the demo catalogue)
 */
export function resolveInitialLanguage(supported: string[], fallback: string): string {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (fromQuery && supported.includes(fromQuery.toLowerCase())) return fromQuery.toLowerCase();

  const stored = safeRead();
  if (stored && supported.includes(stored)) return stored;

  return fallback;
}

export function rememberLanguage(language: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private browsing modes can refuse storage - not a problem, we just forget.
  }
}

function safeRead(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
