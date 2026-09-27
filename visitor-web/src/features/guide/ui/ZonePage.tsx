import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../../../shared/i18n/language';
import { LanguageSelector } from '../../preferences/ui/LanguageSelector';
import { ApiError, fetchActiveExhibitForZone, fetchLanguages } from '../api/client';
import { ActiveExhibitResponse } from '../model/types';
import { ExhibitSkeleton } from './ExhibitSkeleton';
import { ExhibitView } from './ExhibitView';
import { StateScreen } from './StateScreen';
import { ZoneMap } from './ZoneMap';

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
    <header className="sticky top-0 z-10 border-b border-museum-line bg-museum-bg/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-14">
        <Link to="/" className="flex items-center gap-3 text-sm font-semibold text-museum-ink">
          <span className="flex h-8 w-8 items-center justify-center border border-museum-ink font-serif text-lg leading-none" aria-hidden="true">M</span>
          <span className="hidden sm:inline">{t(language, 'appName')}</span>
          <span className="sm:hidden">Museum Guide</span>
        </Link>
        <LanguageSelector languages={languages} value={language} onChange={handleLanguageChange} label={t(language, 'language')} />
      </div>
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
          eyebrow={zoneCode}
          action={
            <div className="flex flex-wrap items-center gap-5">
              {error.code !== 'ZONE_NOT_FOUND' &&
              error.code !== 'NO_ACTIVE_EXHIBIT' &&
              error.code !== 'EXHIBIT_NOT_PUBLISHED' ? (
                <button
                  className="bg-museum-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-museum-accent active:translate-y-px"
                  onClick={() => load()}
                >
                  {t(language, 'retry')}
                </button>
              ) : null}
              <Link
                className="text-sm font-semibold text-museum-accent underline underline-offset-4"
                to="/"
              >
                {t(language, 'enterAnotherCode')}
              </Link>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      {data ? <ExhibitView data={data} language={language} /> : null}
      {data ? <ZoneMap zoneCode={data.zone.code} language={language} /> : null}
      <footer className="border-t border-museum-line py-8 text-center text-xs text-museum-muted">
        {t(language, 'poweredBy')}
      </footer>
    </>
  );
}
