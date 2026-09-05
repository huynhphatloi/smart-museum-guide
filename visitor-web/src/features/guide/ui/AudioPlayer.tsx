import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string | null;
  title: string;
  emptyLabel: string;
}

/**
 * Deliberately never autoplays: a visitor standing in a quiet gallery decides
 * when sound starts. Also resets whenever the language (and therefore the
 * narration track) changes.
 */
export function AudioPlayer({ src, title, emptyLabel }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    audioRef.current?.load();
  }, [src]);

  if (!src) {
    return (
      <p className="border-l-2 border-museum-line pl-4 text-sm text-museum-muted">{emptyLabel}</p>
    );
  }

  return (
    <div className="border-l-2 border-museum-brass bg-museum-brass-soft p-5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-museum-brass">
        Audio guide
      </p>
      <p className="mb-3 text-sm font-semibold">{title}</p>
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
