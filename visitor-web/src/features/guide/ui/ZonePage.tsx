import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../../../shared/i18n/language';
import { BrandMark } from '../../../shared/ui/BrandMark';
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
  const [receivedAt, setReceivedAt] = useState(0);

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
    (signal?: AbortSignal, background = false) => {
      if (!background) {
        setStatus('loading');
        setError(null);
      }
      fetchActiveExhibitForZone(zoneCode, language, signal)
        .then((result) => {
          if (signal?.aborted) return;
          setData(result);
          setError(null);
          setReceivedAt(Date.now());
          setStatus('ready');
        })
        .catch((caught: unknown) => {
          if (signal?.aborted) return;
          if (caught instanceof DOMException && caught.name === 'AbortError') return;
          setError(
            caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN', 'Unexpected error'),
          );
          setData(null);
          setReceivedAt(Date.now());
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

  // Refresh at the server's next switch, even when the zone is temporarily empty.
  // Use its clock rather than assuming the visitor's device clock is correct.
  useEffect(() => {
    if (!languageReady || status === 'loading') return;
    const next = data?.nextChangeAt ?? data?.assignment.activeTo ?? error?.details?.nextChangeAt;
    const resolved = data?.resolvedAt ?? error?.details?.resolvedAt;
    const delay =
      next && resolved
        ? Date.parse(next) - Date.parse(resolved) - (Date.now() - receivedAt) + 150
        : 30_000;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => load(controller.signal, true),
      Math.min(30_000, Math.max(1000, delay)),
    );
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(controller.signal, true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [data, error, languageReady, load, receivedAt, status]);

  function handleLanguageChange(next: string) {
    setLanguage(next);
    rememberLanguage(next);
  }

  const header = (
    <header className="sticky top-0 z-10 border-b border-museum-line bg-museum-bg/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-14">
        <Link
          to="/"
          className="group flex items-center gap-3 text-sm font-semibold text-museum-ink"
        >
          <BrandMark size={36} />
          <span className="hidden sm:inline">{t(language, 'appName')}</span>
          <ArrowLeft
            className="ml-2 opacity-50 transition-transform group-hover:-translate-x-1 sm:hidden"
            size={17}
            aria-hidden="true"
          />
        </Link>
        <LanguageSelector
          languages={languages}
          value={language}
          onChange={handleLanguageChange}
          label={t(language, 'language')}
        />
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
