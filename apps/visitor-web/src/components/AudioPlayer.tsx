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
    return <p className="text-sm text-museum-muted">{emptyLabel}</p>;
  }

  return (
    <div className="rounded-xl border border-museum-line bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {failed ? (
        <p className="text-sm text-red-700">{emptyLabel}</p>
      ) : (
        <audio
          ref={audioRef}
          className="w-full"
          controls
          preload="none"
          src={src}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
