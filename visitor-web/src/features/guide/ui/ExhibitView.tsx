import { languageLabel, t } from '../../../shared/i18n';
import { ActiveExhibitResponse } from '../model/types';
import { AudioPlayer } from './AudioPlayer';

interface Props {
  data: ActiveExhibitResponse;
  language: string;
}

export function ExhibitView({ data, language }: Props) {
  const { zone, exhibit } = data;
  const images = exhibit.media.filter((item) => item.type === 'IMAGE');
  const hero = images[0];
  const gallery = images.slice(1);
  const paragraphs = (exhibit.description ?? '').split(/\n\s*\n|\n/).map((line) => line.trim()).filter(Boolean);

  return (
    <article className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-8 lg:px-14">
      <div className="grid gap-7 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.78fr)] lg:gap-16 lg:pt-12">
        <figure className="lg:row-span-2">
          {hero ? (
            <img src={hero.url} alt={exhibit.title} className="aspect-[4/3] w-full bg-museum-line/40 object-contain sm:aspect-[5/4] lg:aspect-[4/5]" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-museum-line/40 text-sm text-museum-muted">{t(language, 'gallery')}</div>
          )}
          {hero?.caption ? <figcaption className="mt-3 max-w-[70ch] text-xs leading-5 text-museum-muted">{hero.caption}</figcaption> : null}
        </figure>

        <div className="lg:pt-4">
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold text-museum-accent"><span className="h-px w-8 bg-museum-accent" aria-hidden="true" />{zone.name} · {zone.code}</p>
          <h1 className="max-w-[13ch] text-balance font-serif text-[clamp(2.8rem,5vw,5.7rem)] font-medium leading-[1.02] tracking-[-0.045em]">{exhibit.title}</h1>
          {exhibit.shortDescription ? <p className="mt-7 max-w-[50ch] text-pretty text-lg leading-8 text-museum-muted">{exhibit.shortDescription}</p> : null}
          {exhibit.translationFallback ? (
            <p className="mt-6 border-l-2 border-museum-accent pl-4 text-sm leading-6 text-museum-muted">{t(language, 'fallbackNotice', { language: languageLabel(exhibit.language) })}</p>
          ) : null}
          <div className="mt-9 border-t border-museum-line pt-6">
            <AudioPlayer src={exhibit.audioUrl} title={t(language, 'listen')} emptyLabel={t(language, 'noAudio')} label={t(language, 'audioGuide')} />
          </div>
        </div>
      </div>

      {paragraphs.length > 0 ? (
        <section className="mx-auto mt-16 max-w-[800px] border-t border-museum-ink pt-9 md:mt-24" aria-labelledby="guide-heading">
          <h2 id="guide-heading" className="mb-8 font-serif text-3xl font-medium tracking-tight sm:text-4xl">{t(language, 'aboutThisWork')}</h2>
          <div className="prose-exhibit max-w-[70ch]">
            {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section className="mt-16 border-t border-museum-line pt-8 md:mt-24">
          <h2 className="mb-7 font-serif text-3xl font-medium tracking-tight">{t(language, 'gallery')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => <figure key={item.id}><img src={item.url} alt={item.caption ?? exhibit.title} className="aspect-[4/3] w-full bg-museum-line/40 object-contain" />{item.caption ? <figcaption className="mt-2 text-xs leading-5 text-museum-muted">{item.caption}</figcaption> : null}</figure>)}
          </div>
        </section>
      ) : null}
      {exhibit.media.some((item) => item.type === 'VIDEO') ? (
        <section className="mt-16 space-y-5">{exhibit.media.filter((item) => item.type === 'VIDEO').map((item) => <video key={item.id} controls className="w-full bg-museum-ink" src={item.url} />)}</section>
      ) : null}
    </article>
  );
}
