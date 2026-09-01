'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Exhibit, ExhibitStatus, Paginated } from '@/lib/types';

const STATUS_FILTERS: (ExhibitStatus | 'ALL')[] = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'];

export default function ExhibitsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExhibitStatus | 'ALL'>('ALL');

  const exhibitsQuery = useQuery({
    queryKey: ['exhibits', status],
    queryFn: () =>
      apiFetch<Paginated<Exhibit>>(
        `/admin/exhibits?pageSize=100${status === 'ALL' ? '' : `&status=${status}`}`,
      ),
  });

  const createExhibit = useMutation({
    mutationFn: (body: { code: string; defaultTitle: string }) =>
      apiFetch<Exhibit>('/admin/exhibits', { method: 'POST', body }),
    onSuccess: (exhibit) => {
      toast.success(`Exhibit ${exhibit.code} created.`);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['exhibits'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the exhibit.'),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createExhibit.mutate({
      code: String(form.get('code') ?? '').toUpperCase(),
      defaultTitle: String(form.get('defaultTitle') ?? ''),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Exhibits</h1>
          <p className="text-sm text-muted-foreground">
            Museum objects and their translations. Adding a language never requires a schema change.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New exhibit
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
          <CardTitle>All exhibits</CardTitle>
          <CardDescription>{exhibitsQuery.data?.total ?? 0} exhibit(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {exhibitsQuery.isLoading ? (
            <Skeleton className="m-6 h-40" />
          ) : !exhibitsQuery.data?.items.length ? (
            <div className="p-6">
              <EmptyState
                title="No exhibits"
                description="Create an exhibit, add translations, then publish it."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
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
                          <Badge variant="warning">none</Badge>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New exhibit</DialogTitle>
            <DialogDescription>
              The default title is an internal label &mdash; visitors always see a translation.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="EX_CHAM_STATUE" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTitle">Default title</Label>
              <Input id="defaultTitle" name="defaultTitle" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createExhibit.isPending}>
                {createExhibit.isPending ? 'Creating...' : 'Create exhibit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
