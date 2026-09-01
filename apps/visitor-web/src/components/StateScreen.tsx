import { ReactNode } from 'react';

interface Props {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

export function StateScreen({ title, body, action, tone = 'neutral' }: Props) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div
        className={`mb-4 h-12 w-12 rounded-full ${tone === 'error' ? 'bg-red-100' : 'bg-museum-line'}`}
        aria-hidden
      />
      <h1 className="mb-2 font-serif text-xl">{title}</h1>
      <p className="mb-5 text-sm text-museum-muted">{body}</p>
      {action}
    </div>
  );
}
