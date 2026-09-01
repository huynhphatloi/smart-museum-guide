export function ExhibitSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mb-6 h-56 w-full animate-pulse rounded-2xl bg-museum-line" />
      <div className="mb-3 h-6 w-2/3 animate-pulse rounded bg-museum-line" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-museum-line" />
      <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-museum-line" />
      <div className="h-4 w-4/6 animate-pulse rounded bg-museum-line" />
    </div>
  );
}
