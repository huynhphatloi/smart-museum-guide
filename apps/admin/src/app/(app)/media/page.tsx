'use client';

import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch, apiUpload, mediaUrl } from '@/lib/api-client';
import { Exhibit, Paginated, StoredFile } from '@/lib/types';

export default function MediaPage() {
  const [uploads, setUploads] = useState<StoredFile[]>([]);

  const exhibitsQuery = useQuery({
    queryKey: ['exhibits-media'],
    queryFn: () => apiFetch<Paginated<Exhibit>>('/admin/exhibits?pageSize=100'),
  });

  const attached = (exhibitsQuery.data?.items ?? []).flatMap((exhibit) =>
    (exhibit.media ?? []).map((item) => ({ ...item, exhibitCode: exhibit.code })),
  );

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const stored = await apiUpload(file);
      setUploads((previous) => [stored, ...previous]);
      toast.success('Uploaded. Copy the URL into an exhibit translation or gallery.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Upload failed.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Media</h1>
          <p className="text-sm text-muted-foreground">
            Images, narration audio and video. Stored locally in development through
            MediaStorageService.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" />
          Upload file
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept="image/*,audio/*,video/*"
          />
        </label>
      </header>

      {uploads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Just uploaded</CardTitle>
            <CardDescription>Copy a URL and paste it into an exhibit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.url}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <code className="break-all text-xs">{upload.url}</code>
                <button
                  className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                  onClick={() => {
                    void navigator.clipboard.writeText(upload.url);
                    toast.success('URL copied.');
                  }}
                >
                  Copy
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attached to exhibits</CardTitle>
        </CardHeader>
        <CardContent>
          {exhibitsQuery.isLoading ? (
            <Skeleton className="h-40" />
          ) : attached.length === 0 ? (
            <EmptyState
              title="No media attached yet"
              description="Upload a file here, then add it from the exhibit's Media tab."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {attached.map((item) => (
                <div key={item.id} className="space-y-2 rounded-lg border p-3">
                  {item.type === 'IMAGE' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(item.url)}
                      alt={item.caption ?? ''}
                      className="h-32 w-full rounded object-cover"
                    />
                  ) : item.type === 'AUDIO' ? (
                    <audio controls className="w-full" src={mediaUrl(item.url)} />
                  ) : (
                    <video controls className="w-full rounded" src={mediaUrl(item.url)} />
                  )}
                  <p className="truncate text-xs text-muted-foreground">{item.exhibitCode}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
