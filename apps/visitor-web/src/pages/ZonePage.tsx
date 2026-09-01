import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExhibitSkeleton } from '../components/Skeleton';
import { ExhibitView } from '../components/ExhibitView';
import { LanguageSelector } from '../components/LanguageSelector';
import { StateScreen } from '../components/StateScreen';
import { ApiError, fetchActiveExhibitForZone, fetchLanguages } from '../lib/api';
import { t } from '../lib/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../lib/language';
import { ActiveExhibitResponse } from '../lib/types';

type Status = 'loading' | 'ready' | 'error';

/**
 * The QR landing page: `/q/:zoneCode`.
 *
 * The QR encodes a ZONE, not an exhibit, so the museum can rotate exhibits
 * without reprinting anything. The active exhibit is resolved on every load.
 */
export function ZonePage() {
  const { zoneCode = '' } = useParams<{ zoneCode: string }>();
  const [languages, setLanguages] = useState<string[]>(['vi', 'en']);
  const [language, setLanguage] = useState<string>('vi');
  const [languageReady, setLanguageReady] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<ActiveExhibitResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Ask the museum which languages it offers, then pick the visitor's.
  useEffect(() => {
    const controller = new AbortController();
    fetchLanguages(controller.signal)
      .then((result) => {
        setLanguages(result.supported);
        setLanguage(resolveInitialLanguage(result.supported, result.default));
      })
      .catch(() => {
        setLanguage(resolveInitialLanguage(['vi', 'en'], 'vi'));
      })
      .finally(() => setLanguageReady(true));
    return () => controller.abort();
  }, []);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setStatus('loading');
      setError(null);
      fetchActiveExhibitForZone(zoneCode, language, signal)
        .then((result) => {
          setData(result);
          setStatus('ready');
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === 'AbortError') return;
          setError(
            caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
          );
          setStatus('error');
        });
    },
    [zoneCode, language],
  );

  useEffect(() => {
    if (!languageReady) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [languageReady, load]);

  function handleLanguageChange(next: string) {
    setLanguage(next);
    rememberLanguage(next);
  }

  const header = (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-museum-line bg-museum-bg/90 px-5 py-3 backdrop-blur">
      <Link to="/" className="font-serif text-base">
        {t(language, 'appName')}
      </Link>
      <LanguageSelector
        languages={languages}
        value={language}
        onChange={handleLanguageChange}
        label={t(language, 'language')}
      />
    </header>
  );

  if (!languageReady || status === 'loading') {
    return (
      <>
        {header}
        <ExhibitSkeleton label={t(language, 'loading')} />
      </>
    );
  }

  if (status === 'error' && error) {
    const screen =
      error.code === 'ZONE_NOT_FOUND'
        ? { title: t(language, 'errorZoneTitle'), body: t(language, 'errorZoneBody') }
        : error.code === 'NO_ACTIVE_EXHIBIT' || error.code === 'EXHIBIT_NOT_PUBLISHED'
          ? { title: t(language, 'errorNoExhibitTitle'), body: t(language, 'errorNoExhibitBody') }
          : { title: t(language, 'errorNetworkTitle'), body: t(language, 'errorNetworkBody') };

    return (
      <>
        {header}
        <StateScreen
          tone="error"
          title={screen.title}
          body={screen.body}
          action={
            <button
              className="rounded-full bg-museum-ink px-5 py-2 text-sm text-white"
              onClick={() => load()}
            >
              {t(language, 'retry')}
            </button>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      {data ? <ExhibitView data={data} language={language} /> : null}
      <footer className="pb-10 text-center text-xs text-museum-muted">
        {t(language, 'poweredBy')}
      </footer>
    </>
  );
}
