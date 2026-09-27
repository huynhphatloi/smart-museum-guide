import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';

interface Props {
  src: string | null;
  title: string;
  emptyLabel: string;
  label: string;
}

/**
 * Deliberately never autoplays: a visitor standing in a quiet gallery decides
 * when sound starts. Also resets whenever the language (and therefore the
 * narration track) changes.
 */
export function AudioPlayer({ src, title, emptyLabel, label }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    audioRef.current?.load();
  }, [src]);

  if (!src) {
    return (
      <div className="flex items-center gap-4 rounded-lg bg-museum-paper p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8DDCA] text-museum-accent" aria-hidden="true"><Headphones size={21} strokeWidth={1.7} /></span>
        <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-museum-accent">{label}</p><p className="mt-1 text-sm text-museum-muted">{emptyLabel}</p></div>
      </div>
    );
  }

  return (
    <div className="border border-museum-line bg-museum-paper p-5 sm:p-6">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-museum-accent">
        {label}
      </p>
      <p className="mb-4 font-serif text-xl font-medium">{title}</p>
      {failed ? (
        <p className="text-sm text-red-700">{emptyLabel}</p>
      ) : (
        <audio
          ref={audioRef}
          className="w-full accent-museum-accent"
          controls
          preload="none"
          src={src}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
