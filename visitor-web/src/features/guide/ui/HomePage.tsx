import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../../../shared/i18n/language';

const UI_LANGUAGES = ['vi', 'en'] as const;

export function HomePage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => resolveInitialLanguage([...UI_LANGUAGES], 'vi'));
  const [code, setCode] = useState('');

  function handleLanguageChange(next: string) {
    setLanguage(next);
    rememberLanguage(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/q/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="relative mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-14 px-6 py-12 md:grid-cols-[0.8fr_1.2fr] md:px-10">
      <div className="absolute right-6 top-6 flex overflow-hidden rounded-md border border-museum-line text-xs font-semibold">
        {UI_LANGUAGES.map((codeOption) => (
          <button
            key={codeOption}
            type="button"
            onClick={() => handleLanguageChange(codeOption)}
            className={`px-2.5 py-1 uppercase tracking-wide ${
              language === codeOption
                ? 'bg-museum-deep text-white'
                : 'text-museum-muted hover:text-museum-ink'
            }`}
          >
            {codeOption}
          </button>
        ))}
      </div>

      <div className="relative mx-auto hidden h-[28rem] w-full max-w-sm items-end overflow-hidden rounded-t-[12rem] bg-museum-deep p-8 md:flex">
        <div className="absolute inset-8 rounded-t-[10rem] border border-white/20" />
        <div className="absolute left-1/2 top-1/2 h-36 w-28 -translate-x-1/2 -translate-y-1/2 rounded-t-[4rem] bg-museum-brass" />
        <span className="relative font-serif text-7xl text-white/20">01</span>
      </div>

      <section className="max-w-xl">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-museum-accent">
          {t(language, 'companion')}
        </p>
        <h1 className="max-w-lg text-balance font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl">
          {t(language, 'appName')}
        </h1>
        <p className="mt-6 max-w-md text-pretty text-base leading-7 text-museum-muted">
          {t(language, 'invalidQrBody')}
        </p>

        <form className="mt-12 border-t border-museum-line pt-6" onSubmit={handleSubmit}>
          <label
            htmlFor="zone-code"
            className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-museum-muted"
          >
            {t(language, 'zoneCodePlaceholder')}
          </label>
          <div className="flex gap-3">
            <input
              id="zone-code"
              className="min-w-0 flex-1 border-0 border-b border-museum-ink bg-transparent px-0 py-3 text-base tracking-wide placeholder:text-museum-muted/60 focus:border-museum-accent focus:outline-none"
              placeholder="ZONE_A01"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <button
              className="bg-museum-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-museum-accent active:translate-y-px"
              type="submit"
            >
              {t(language, 'openZone')}
            </button>
          </div>
        </form>

        <p className="mt-10 text-xs text-museum-muted">{t(language, 'poweredBy')}</p>
      </section>
    </main>
  );
}
