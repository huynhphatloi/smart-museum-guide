'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, apiFetch } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { Exhibit, ExhibitStatus, Paginated } from '@/lib/types';

const STATUS_FILTERS: (ExhibitStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'];

export default function ExhibitsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ExhibitStatus | 'ALL'>('ALL');

  const exhibitsQuery = useQuery({
    queryKey: ['exhibits', status],
    queryFn: () =>
      apiFetch<Paginated<Exhibit>>(
        `/admin/exhibits?pageSize=100${status === 'ALL' ? '' : `&status=${status}`}`,
      ),
  });

  const deleteExhibit = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/exhibits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('exhibitDeleted'));
      void queryClient.invalidateQueries({ queryKey: ['exhibits'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('exhibitDeleteError')),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('exhibitsTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('exhibitsSubtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/exhibits/new">
            <Plus className="h-4 w-4" />
            {t('newExhibit')}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={status === option ? 'default' : 'outline'}
            onClick={() => setStatus(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('allExhibits')}</CardTitle>
          <CardDescription>
            {t('exhibitCount', { count: String(exhibitsQuery.data?.total ?? 0) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {exhibitsQuery.isLoading ? (
            <Skeleton className="m-6 h-40" />
          ) : !exhibitsQuery.data?.items.length ? (
            <div className="p-6">
              <EmptyState title={t('noExhibits')} description={t('noExhibitsHint')} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('colTitle')}</TableHead>
                  <TableHead>{t('colLanguages')}</TableHead>
                  <TableHead>{t('colMedia')}</TableHead>
                  <TableHead>{t('colScheduled')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {exhibitsQuery.data.items.map((exhibit) => (
                  <TableRow key={exhibit.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/exhibits/${exhibit.id}`}
                      >
                        {exhibit.code}
                      </Link>
                    </TableCell>
                    <TableCell>{exhibit.defaultTitle}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {exhibit.translations?.length ? (
                          exhibit.translations.map((translation) => (
                            <Badge key={translation.id} variant="secondary">
                              {translation.languageCode}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="warning">{t('none')}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exhibit._count?.media ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {exhibit._count?.assignments ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          exhibit.status === 'PUBLISHED'
                            ? 'success'
                            : exhibit.status === 'DRAFT'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {exhibit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/exhibits/${exhibit.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t('edit')}
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={deleteExhibit.isPending && deleteExhibit.variables === exhibit.id}
                          onClick={() => {
                            if (window.confirm(t('deleteExhibitConfirm', { code: exhibit.code }))) {
                              deleteExhibit.mutate(exhibit.id);
                            }
                          }}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
