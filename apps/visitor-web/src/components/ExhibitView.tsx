import { languageLabel, t } from '../lib/i18n';
import { ActiveExhibitResponse } from '../lib/types';
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
    <article className="mx-auto max-w-2xl px-5 pb-16">
      {hero ? (
        <img
          src={hero.url}
          alt={hero.caption ?? exhibit.title}
          className="mb-6 aspect-[3/2] w-full rounded-2xl object-cover shadow-sm"
        />
      ) : null}

      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-museum-muted">
        {zone.code} · {zone.name}
      </p>
      <h1 className="mb-3 font-serif text-3xl leading-tight">{exhibit.title}</h1>

      {exhibit.shortDescription ? (
        <p className="mb-5 text-base text-museum-muted">{exhibit.shortDescription}</p>
      ) : null}

      {exhibit.translationFallback ? (
        <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t(language, 'fallbackNotice', { language: languageLabel(exhibit.language) })}
        </p>
      ) : null}

      <div className="mb-6">
        <AudioPlayer
          src={exhibit.audioUrl}
          title={t(language, 'listen')}
          emptyLabel={t(language, 'noAudio')}
        />
      </div>

      {paragraphs.length > 0 ? (
        <div className="prose-exhibit font-serif text-[1.05rem] leading-relaxed">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {gallery.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-museum-muted">
            {t(language, 'gallery')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {gallery.map((item) => (
              <img
                key={item.id}
                src={item.url}
                alt={item.caption ?? ''}
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {exhibit.media.some((item) => item.type === 'VIDEO') ? (
        <section className="mt-8 space-y-3">
          {exhibit.media
            .filter((item) => item.type === 'VIDEO')
            .map((item) => (
              <video key={item.id} controls className="w-full rounded-xl" src={item.url} />
            ))}
        </section>
      ) : null}
    </article>
  );
}
