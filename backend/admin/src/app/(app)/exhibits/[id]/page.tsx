'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ExhibitEditor } from '@/features/exhibits/ui/exhibit-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { Exhibit } from '@/lib/types';

export default function ExhibitDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const exhibitId = params.id;

  const exhibitQuery = useQuery({
    queryKey: ['exhibit', exhibitId],
    queryFn: () => apiFetch<Exhibit>(`/admin/exhibits/${exhibitId}`),
  });

  if (exhibitQuery.isLoading) return <Skeleton className="h-96" />;
  if (exhibitQuery.error || !exhibitQuery.data) {
    return <p className="text-sm text-destructive">{t('exhibitNotFound')}</p>;
  }

  return <ExhibitEditor exhibit={exhibitQuery.data} />;
}
