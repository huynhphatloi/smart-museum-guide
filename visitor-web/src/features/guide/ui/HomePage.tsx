import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../../../shared/i18n/language';

const UI_LANGUAGES = ['vi', 'en'] as const;

export function HomePage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => resolveInitialLanguage([...UI_LANGUAGES], 'vi'));
  const [code, setCode] = useState('');
  const vi = language === 'vi';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/q/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-museum-line">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-14">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-museum-ink font-serif text-xl leading-none" aria-hidden="true">M</span>
            <span className="text-sm font-semibold tracking-tight">{t(language, 'appName')}</span>
          </div>
          <div className="flex items-center gap-1 border border-museum-line p-1" role="group" aria-label={t(language, 'language')}>
            {UI_LANGUAGES.map((option) => (
              <button key={option} type="button" onClick={() => { setLanguage(option); rememberLanguage(option); }} aria-pressed={language === option} className={`min-h-9 min-w-11 px-2 text-xs font-semibold uppercase transition-colors ${language === option ? 'bg-museum-ink text-white' : 'text-museum-muted hover:bg-museum-line/40'}`}>{option}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-14">
        <div className="grid items-center gap-10 pb-14 pt-10 lg:min-h-[690px] lg:grid-cols-[minmax(0,0.87fr)_minmax(0,1.13fr)] lg:gap-16 lg:pb-20 lg:pt-14">
          <section className="order-1 max-w-[580px]">
            <p className="mb-5 text-sm font-semibold text-museum-accent">{vi ? 'Một chuyến tham quan, nhiều câu chuyện' : 'A museum visit, many stories'}</p>
            <h1 className="max-w-[11ch] text-balance font-serif text-[clamp(3.4rem,6.5vw,7.2rem)] font-medium leading-[0.98] tracking-[-0.055em]">{vi ? 'Khám phá từ hiện vật.' : 'A closer look at every object.'}</h1>
            <p className="mt-7 max-w-[48ch] text-pretty text-base leading-7 text-museum-muted sm:text-lg sm:leading-8">{vi ? 'Quét mã QR cạnh hiện vật để xem hình ảnh, đọc bài thuyết minh đầy đủ và nghe câu chuyện bằng ngôn ngữ của bạn.' : 'Scan the QR code beside an object to see its images, read the full guide and listen in your language.'}</p>
            <form className="mt-9 max-w-[510px] border-t border-museum-ink pt-5" onSubmit={handleSubmit}>
              <label htmlFor="zone-code" className="mb-3 block text-sm font-semibold">{t(language, 'enterZoneCode')}</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="zone-code" className="min-h-12 min-w-0 flex-1 border border-museum-line bg-museum-paper px-4 text-base outline-none placeholder:text-museum-muted/70 focus:border-museum-ink" placeholder={t(language, 'zoneCodePlaceholder')} value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" />
                <button className="min-h-12 bg-museum-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-museum-accent" type="submit">{t(language, 'openZone')} <span aria-hidden="true" className="ml-3">↗</span></button>
              </div>
              <p className="mt-3 text-sm leading-6 text-museum-muted">{vi ? 'Bạn cũng có thể dùng camera điện thoại để quét mã QR tại khu trưng bày.' : 'You can also scan the QR code in the gallery with your phone camera.'}</p>
            </form>
          </section>

          <figure className="relative order-2 grid h-[310px] grid-cols-[1.2fr_0.8fr] grid-rows-2 gap-2 overflow-hidden sm:h-[480px] sm:gap-3 lg:order-2 lg:h-[590px]">
            <img src="/isana-my-son.jpg" alt={vi ? 'Tượng Isana từ Mỹ Sơn' : 'Isana statue from My Son'} className="col-start-1 row-span-2 h-full w-full object-cover object-center" />
            <img src="/dong-son-drum.jpg" alt={vi ? 'Trống đồng Đông Sơn' : 'Dong Son bronze drum'} className="h-full w-full object-cover" />
            <img src="/five-tigers-hang-trong.jpg" alt={vi ? 'Tranh Ngũ Hổ Hàng Trống' : 'Five Tigers Hang Trong painting'} className="h-full w-full object-cover" />
            <figcaption className="absolute bottom-0 right-0 bg-museum-paper/95 px-3 py-2 text-[11px] text-museum-muted">{vi ? 'Hình ảnh hiện vật minh họa' : 'Sample collection images'}</figcaption>
          </figure>
        </div>
        <section className="grid gap-6 border-t border-museum-line pb-12 pt-7 text-sm leading-6 text-museum-muted md:grid-cols-3 md:gap-10" aria-label={vi ? 'Cách tham quan' : 'How it works'}>
          <p><span className="mr-3 font-semibold text-museum-accent">01</span>{vi ? 'Tìm mã QR bên cạnh hiện vật.' : 'Find the QR beside an object.'}</p>
          <p><span className="mr-3 font-semibold text-museum-accent">02</span>{vi ? 'Đọc hoặc nghe bài thuyết minh.' : 'Read or listen to the full guide.'}</p>
          <p><span className="mr-3 font-semibold text-museum-accent">03</span>{vi ? 'Khám phá thêm bằng ngôn ngữ của bạn.' : 'Explore in your own language.'}</p>
        </section>
      </div>
    </main>
  );
}
