import { ReactNode } from 'react';

interface Props {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  eyebrow?: string;
}

export function StateScreen({ title, body, action, eyebrow }: Props) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-start justify-center px-6 py-16">
      <span className="mb-7 flex h-12 w-12 items-center justify-center border border-museum-ink font-serif text-2xl" aria-hidden="true">M</span>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-museum-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mb-4 text-balance font-serif text-4xl font-semibold leading-tight">{title}</h1>
      <p className="mb-7 max-w-md text-pretty text-base leading-7 text-museum-muted">{body}</p>
      {action}
    </main>
  );
}
