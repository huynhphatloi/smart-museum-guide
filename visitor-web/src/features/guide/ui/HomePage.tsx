import { ArrowUpRight, ChevronLeft, ChevronRight, Headphones, MapPin, ScanLine } from 'lucide-react';
import { FormEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../../../shared/i18n';
import { rememberLanguage, resolveInitialLanguage } from '../../../shared/i18n/language';
import { BrandMark } from '../../../shared/ui/BrandMark';

const UI_LANGUAGES = ['vi', 'en'] as const;
const ARTWORKS = [
  { image: '/isana-my-son.jpg', label: 'ISANA · MỸ SƠN', vi: 'Tượng Isana từ Mỹ Sơn', en: 'Isana sculpture from My Son' },
  { image: '/dong-son-drum.jpg', label: 'TRỐNG ĐỒNG · ĐÔNG SƠN', vi: 'Trống đồng Đông Sơn', en: 'Dong Son bronze drum' },
  { image: '/five-tigers-hang-trong.jpg', label: 'NGŨ HỔ · HÀNG TRỐNG', vi: 'Tranh Ngũ Hổ Hàng Trống', en: 'Five Tigers painting' },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => resolveInitialLanguage([...UI_LANGUAGES], 'vi'));
  const [code, setCode] = useState('');
  const [activeArtwork, setActiveArtwork] = useState(0);
  const [artworkPaused, setArtworkPaused] = useState(false);
  const [artworkVisible, setArtworkVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const artworkRef = useRef<HTMLElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const vi = language === 'vi';

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motionPreference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    motionPreference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);

    const observer = new IntersectionObserver(([entry]) => setArtworkVisible(entry.isIntersecting), { threshold: 0.1 });
    if (artworkRef.current) observer.observe(artworkRef.current);
    return () => {
      motionPreference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (artworkPaused || !artworkVisible || !pageVisible || reducedMotion) return;
    const timer = window.setInterval(() => setActiveArtwork((current) => (current + 1) % ARTWORKS.length), 4200);
    return () => window.clearInterval(timer);
  }, [artworkPaused, artworkVisible, pageVisible, reducedMotion]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/q/${encodeURIComponent(trimmed)}`);
  }

  function moveArtwork(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 5}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 7}deg`);
  }

  function resetArtwork(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '0deg');
  }

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    setActiveArtwork((current) => (current + (deltaX < 0 ? 1 : ARTWORKS.length - 1)) % ARTWORKS.length);
  }

  return (
    <main className="visitor-home min-h-[100dvh]">
      <div className="home-stage">
        <header className="mx-auto flex w-full max-w-[1480px] items-center justify-between px-5 py-5 sm:px-9 lg:px-16">
          <div className="flex items-center gap-3 text-[#F7F1E7]">
            <BrandMark size={38} light />
            <span className="text-sm font-semibold tracking-[-0.02em] sm:text-base">{t(language, 'appName')}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/25 p-1" role="group" aria-label={t(language, 'language')}>
            {UI_LANGUAGES.map((option) => (
              <button key={option} type="button" onClick={() => { setLanguage(option); rememberLanguage(option); }} aria-pressed={language === option} className={`min-h-10 min-w-11 rounded-full px-3 text-xs font-semibold uppercase transition-colors ${language === option ? 'bg-[#F7F1E7] text-[#2D2824]' : 'text-[#F7F1E7] hover:bg-white/15'}`}>{option}</button>
            ))}
          </div>
        </header>

        <div className="home-hero mx-auto grid w-full max-w-[1480px] items-center gap-10 px-5 pb-12 pt-8 sm:px-9 lg:min-h-[710px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:px-16 lg:pb-20 lg:pt-8">
          <section className="home-copy relative z-[2] max-w-[650px]">
            <h1 className="home-title max-w-[12ch] text-balance font-serif text-[clamp(3.5rem,6.1vw,6.8rem)] font-medium leading-[0.99] tracking-[-0.035em] text-[#F7F1E7]">{vi ? 'Dừng lại. Nhìn sâu hơn.' : 'Pause. Look closer.'}</h1>
            <p className="mt-7 max-w-[43ch] text-pretty text-base leading-8 text-[#DBD2C5] sm:text-lg">{vi ? 'Mỗi hiện vật giữ một câu chuyện. Quét mã QR tại khu trưng bày để mở bài thuyết minh, hình ảnh và âm thanh ngay trên điện thoại.' : 'Every object holds a story. Scan a QR code in the gallery to discover its guide, images and audio on your phone.'}</p>
            <form onSubmit={handleSubmit} className="mt-9 max-w-[520px]">
              <label htmlFor="zone-code" className="mb-3 block text-sm font-semibold text-[#F7F1E7]">{t(language, 'enterZoneCode')}</label>
              <div className="home-code-form flex flex-col gap-2 rounded-lg border border-white/20 bg-white/10 p-2 sm:flex-row">
                <input id="zone-code" className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-white outline-none placeholder:text-[#C9BEB0]" placeholder={t(language, 'zoneCodePlaceholder')} value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" />
                <button className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#D8B77F] px-5 text-sm font-semibold text-[#211A16] transition-colors hover:bg-[#EBCB95]" type="submit">{t(language, 'openZone')}<ArrowUpRight size={18} strokeWidth={1.8} aria-hidden="true" /></button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#C9BEB0]">{vi ? 'Hoặc quét mã QR đặt cạnh hiện vật.' : 'Or scan the QR code next to an object.'}</p>
              <Link to="/q/ZONE_A01" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#F7F1E7] underline decoration-[#D8B77F] underline-offset-4 transition-colors hover:text-[#EBCB95]">{vi ? 'Xem hiện vật mẫu' : 'Explore a sample exhibit'}<ArrowUpRight size={16} aria-hidden="true" /></Link>
            </form>
          </section>

          <figure ref={artworkRef} className="artifact-scene relative mx-auto w-full max-w-[670px]" onPointerMove={moveArtwork} onPointerLeave={(event) => { resetArtwork(event); setArtworkPaused(false); }} onPointerEnter={() => setArtworkPaused(true)} onFocusCapture={() => setArtworkPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setArtworkPaused(false); }} onPointerDown={(event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={finishSwipe} onPointerCancel={() => { swipeStart.current = null; }}>
            <div className="artifact-rings" aria-hidden="true" />
            <div className="artifact-plane">
              {ARTWORKS.map((artwork, index) => {
                const position = (index - activeArtwork + ARTWORKS.length) % ARTWORKS.length;
                return <div key={artwork.image} className={`artifact-card artifact-card-${position === 0 ? 'center' : position === 1 ? 'right' : 'left'}`} aria-hidden={position !== 0}>
                  <img src={artwork.image} alt={vi ? artwork.vi : artwork.en} />
                  <span className="artifact-image-label">{artwork.label}</span>
                </div>;
              })}
            </div>
            <div className="artifact-controls" role="group" aria-label={vi ? 'Chuyển ảnh hiện vật' : 'Browse exhibit images'}>
              <button type="button" aria-label={vi ? 'Ảnh trước' : 'Previous image'} onClick={() => setActiveArtwork((current) => (current + ARTWORKS.length - 1) % ARTWORKS.length)}><ChevronLeft size={18} aria-hidden="true" /></button>
              <span className="artifact-counter" aria-live="off">{String(activeArtwork + 1).padStart(2, '0')} / {String(ARTWORKS.length).padStart(2, '0')}</span>
              <button type="button" aria-label={vi ? 'Ảnh tiếp theo' : 'Next image'} onClick={() => setActiveArtwork((current) => (current + 1) % ARTWORKS.length)}><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
            <figcaption className="artifact-caption">{vi ? 'Hình ảnh hiện vật từ kho dữ liệu mẫu' : 'Object images from the demonstration collection'}</figcaption>
          </figure>
        </div>
      </div>

      <section className="home-journey mx-auto max-w-[1480px] px-5 py-14 sm:px-9 lg:px-16 lg:py-20" aria-labelledby="journey-title">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 id="journey-title" className="max-w-[13ch] font-serif text-[clamp(2.8rem,4vw,4.8rem)] leading-[1.05] tracking-[-0.025em]">{vi ? 'Chọn cách bạn khám phá.' : 'Explore your own way.'}</h2>
            <p className="mt-5 max-w-[44ch] text-base leading-7 text-museum-muted">{vi ? 'Một mã QR dẫn đến đúng hiện vật đang trưng bày tại vị trí đó. Nội dung luôn theo khu trưng bày, ngay cả khi hiện vật thay đổi.' : 'One QR code opens the object currently on display in that gallery zone, even when the display changes.'}</p>
          </div>
          <div className="journey-list">
            <div className="journey-item"><ScanLine size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{vi ? 'Quét tại khu trưng bày' : 'Scan in the gallery'}</h3><p>{vi ? 'Mở đúng hiện vật trước mắt bằng mã QR.' : 'Open the object in front of you with its QR code.'}</p></div></div>
            <div className="journey-item"><Headphones size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{vi ? 'Đọc hoặc nghe' : 'Read or listen'}</h3><p>{vi ? 'Bài thuyết minh đầy đủ và audio khi có sẵn.' : 'Full guide text and audio when available.'}</p></div></div>
            <div className="journey-item"><MapPin size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{vi ? 'Tiếp tục tham quan' : 'Keep exploring'}</h3><p>{vi ? 'Theo hành trình của bạn, bằng ngôn ngữ của bạn.' : 'Follow your own route in your language.'}</p></div></div>
          </div>
        </div>
      </section>
      <footer className="border-t border-museum-line px-5 py-6 text-center text-xs text-museum-muted">{t(language, 'appName')}</footer>
    </main>
  );
}
