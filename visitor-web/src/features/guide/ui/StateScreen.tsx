import { ReactNode } from 'react';

interface Props {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

export function StateScreen({ title, body, action, tone = 'neutral' }: Props) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-start justify-center px-6 py-16">
      <div
        className={`mb-8 flex h-24 w-20 items-end rounded-t-[3rem] p-2 ${tone === 'error' ? 'bg-museum-deep' : 'bg-museum-brass-soft'}`}
        aria-hidden
      >
        <span className="h-14 w-full rounded-t-[2rem] bg-museum-brass" />
      </div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-museum-accent">
        Museum guide
      </p>
      <h1 className="mb-4 text-balance font-serif text-4xl font-semibold leading-tight">{title}</h1>
      <p className="mb-7 max-w-md text-pretty text-base leading-7 text-museum-muted">{body}</p>
      {action}
    </main>
  );
}
