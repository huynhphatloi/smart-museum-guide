import { languageLabel, t } from '../../../shared/i18n';
import { ActiveExhibitResponse } from '../model/types';
import { AudioPlayer } from './AudioPlayer';

interface Props {
  data: ActiveExhibitResponse;
  language: string;
}

export function ExhibitView({ data, language }: Props) {
  const { zone, exhibit } = data;
  const hero = exhibit.media.find((item) => item.type === 'IMAGE');
  const gallery = exhibit.media.filter((item) => item.type === 'IMAGE' && item.id !== hero?.id);
  const paragraphs = (exhibit.description ?? '')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  return (
    <article className="mx-auto max-w-6xl px-5 pb-20 pt-7 md:px-8 md:pt-12">
      <div className="grid items-start gap-9 md:grid-cols-[1.08fr_0.92fr] md:gap-14">
        {hero ? (
          <img
            src={hero.url}
            alt={hero.caption ?? exhibit.title}
            className="aspect-[4/5] w-full rounded-t-[12rem] object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center rounded-t-[12rem] bg-museum-brass-soft">
            <div className="h-28 w-24 rounded-t-[4rem] bg-museum-deep p-3">
              <div className="h-full rounded-t-[3rem] bg-museum-brass" />
            </div>
          </div>
        )}

        <div className="md:sticky md:top-28 md:pt-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-museum-accent">
            {zone.code} · {zone.name}
          </p>
          <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
            {exhibit.title}
          </h1>

          {exhibit.shortDescription ? (
            <p className="mt-5 max-w-md text-pretty text-base leading-7 text-museum-muted">
              {exhibit.shortDescription}
            </p>
          ) : null}

          {exhibit.translationFallback ? (
            <p className="mt-6 border-l-2 border-amber-700/60 pl-4 text-sm leading-6 text-amber-900">
              {t(language, 'fallbackNotice', { language: languageLabel(exhibit.language) })}
            </p>
          ) : null}

          <div className="mt-8">
            <AudioPlayer
              src={exhibit.audioUrl}
              title={t(language, 'listen')}
              emptyLabel={t(language, 'noAudio')}
            />
          </div>
        </div>
      </div>

      {paragraphs.length > 0 ? (
        <section className="mt-16 border-t border-museum-line pt-8 md:ml-[calc(50%+1.75rem)] md:mt-24">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-museum-accent">
            {t(language, 'aboutThisWork')}
          </p>
          <div className="prose-exhibit max-w-2xl font-serif">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section className="mt-16 md:mt-24">
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-museum-accent">
            {t(language, 'gallery')}
          </h2>
          <div className="grid grid-cols-2 items-start gap-3 md:gap-6">
            {gallery.map((item, index) => (
              <img
                key={item.id}
                src={item.url}
                alt={item.caption ?? exhibit.title}
                className={`w-full object-cover ${
                  index % 2 === 0 ? 'aspect-[4/5]' : 'mt-10 aspect-square md:mt-20'
                }`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {exhibit.media.some((item) => item.type === 'VIDEO') ? (
        <section className="mt-16 space-y-5">
          {exhibit.media
            .filter((item) => item.type === 'VIDEO')
            .map((item) => (
              <video key={item.id} controls className="w-full bg-museum-ink" src={item.url} />
            ))}
        </section>
      ) : null}
    </article>
  );
}
