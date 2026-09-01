import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../lib/i18n';
import { resolveInitialLanguage } from '../lib/language';

/**
 * Landing page for visitors who opened the site without scanning a QR code,
 * and manual entry for a zone code printed under the QR.
 */
export function HomePage() {
  const navigate = useNavigate();
  const [language] = useState(() =>
    resolveInitialLanguage(['vi', 'en', 'ja', 'ko', 'zh', 'fr'], 'vi'),
  );
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/q/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 font-serif text-3xl">{t(language, 'appName')}</h1>
      <p className="mb-6 text-sm text-museum-muted">{t(language, 'invalidQrBody')}</p>

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-lg border border-museum-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-museum-accent"
          placeholder={t(language, 'zoneCodePlaceholder')}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-label={t(language, 'zoneCodePlaceholder')}
        />
        <button className="rounded-lg bg-museum-ink px-4 py-2 text-sm text-white" type="submit">
          {t(language, 'openZone')}
        </button>
      </form>

      <p className="mt-8 text-xs text-museum-muted">{t(language, 'poweredBy')}</p>
    </main>
  );
}
