export function ExhibitSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto grid max-w-[1440px] gap-9 px-5 py-8 lg:grid-cols-[1fr_0.78fr] md:px-8 md:py-12"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="aspect-[4/5] w-full animate-pulse bg-museum-line" />
      <div className="space-y-4 pt-8">
        <div className="h-3 w-1/3 animate-pulse bg-museum-line" />
        <div className="h-12 w-4/5 animate-pulse bg-museum-line" />
        <div className="h-4 w-full animate-pulse bg-museum-line" />
        <div className="h-4 w-5/6 animate-pulse bg-museum-line" />
      </div>
    </div>
  );
}
