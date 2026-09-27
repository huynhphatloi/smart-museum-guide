import { Button } from './button';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  rangeLabel: string;
}

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  previousLabel,
  nextLabel,
  rangeLabel,
}: Props) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={rangeLabel
        .replace('{start}', String(start))
        .replace('{end}', String(end))
        .replace('{total}', String(total))}
      className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {rangeLabel
          .replace('{start}', String(start))
          .replace('{end}', String(end))
          .replace('{total}', String(total))}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {previousLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
        </Button>
      </div>
    </nav>
  );
}
