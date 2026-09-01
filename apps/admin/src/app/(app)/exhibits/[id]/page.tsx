'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch, apiUpload, mediaUrl } from '@/lib/api-client';
import { formatPeriod } from '@/lib/format';
import { Exhibit, ExhibitTranslation, MediaType } from '@/lib/types';

/** Common ISO codes offered as shortcuts - any other code can be typed freely. */
const LANGUAGE_SUGGESTIONS = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'ru', 'es'];

export default function ExhibitDetailPage() {
  const params = useParams<{ id: string }>();
  const exhibitId = params.id;
  const queryClient = useQueryClient();
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);

  const exhibitQuery = useQuery({
    queryKey: ['exhibit', exhibitId],
    queryFn: () => apiFetch<Exhibit>(`/admin/exhibits/${exhibitId}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['exhibit', exhibitId] });
    void queryClient.invalidateQueries({ queryKey: ['exhibits'] });
  };

  const setStatus = useMutation({
    mutationFn: (action: 'publish' | 'archive') =>
      apiFetch<Exhibit>(`/admin/exhibits/${exhibitId}/${action}`, { method: 'POST' }),
    onSuccess: (exhibit) => {
      toast.success(`Exhibit is now ${exhibit.status}.`);
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not change the status.'),
  });

  const saveTranslation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ExhibitTranslation>(`/admin/exhibits/${exhibitId}/translations`, {
        method: 'POST',
        body,
      }),
    onSuccess: (translation) => {
      toast.success(`Translation "${translation.languageCode}" saved.`);
      setActiveLanguage(translation.languageCode);
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save the translation.'),
  });

  const deleteTranslation = useMutation({
    mutationFn: (translationId: string) =>
      apiFetch<void>(`/admin/exhibits/${exhibitId}/translations/${translationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Translation removed.');
      invalidate();
    },
  });

  const addMedia = useMutation({
    mutationFn: (body: { type: MediaType; url: string; caption?: string }) =>
      apiFetch(`/admin/exhibits/${exhibitId}/media`, { method: 'POST', body }),
    onSuccess: () => {
      toast.success('Media added.');
      invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not add the media.'),
  });

  const deleteMedia = useMutation({
    mutationFn: (mediaId: string) =>
      apiFetch<void>(`/admin/exhibits/${exhibitId}/media/${mediaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Media removed.');
      invalidate();
    },
  });

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const stored = await apiUpload(file);
      const type: MediaType = stored.mimeType.startsWith('audio/')
        ? 'AUDIO'
        : stored.mimeType.startsWith('video/')
          ? 'VIDEO'
          : 'IMAGE';
      addMedia.mutate({ type, url: stored.url, caption: file.name });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Upload failed.');
    } finally {
      event.target.value = '';
    }
  }

  if (exhibitQuery.isLoading) return <Skeleton className="h-96" />;
  if (exhibitQuery.error || !exhibitQuery.data) {
    return <p className="text-sm text-destructive">Exhibit not found.</p>;
  }

  const exhibit = exhibitQuery.data;
  const translations = exhibit.translations ?? [];
  const selected = activeLanguage ?? translations[0]?.languageCode ?? null;
  const current = translations.find((translation) => translation.languageCode === selected) ?? null;

  function handleTranslationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveTranslation.mutate({
      languageCode: String(form.get('languageCode') ?? '').toLowerCase(),
      title: String(form.get('title') ?? ''),
      shortDescription: String(form.get('shortDescription') ?? '') || undefined,
      description: String(form.get('description') ?? '') || undefined,
      audioUrl: String(form.get('audioUrl') ?? '') || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            href="/exhibits"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All exhibits
          </Link>
          <h1 className="text-2xl font-semibold">{exhibit.defaultTitle}</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{exhibit.code}</p>
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
          </div>
        </div>
        <div className="flex gap-2">
          {exhibit.status !== 'PUBLISHED' ? (
            <Button
              onClick={() => setStatus.mutate('publish')}
              disabled={translations.length === 0}
            >
              Publish
            </Button>
          ) : null}
          {exhibit.status !== 'ARCHIVED' ? (
            <Button variant="outline" onClick={() => setStatus.mutate('archive')}>
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      {translations.length === 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Add at least one translation before publishing &mdash; visitors are always served a
          translation.
        </p>
      ) : null}

      <Tabs defaultValue="translations">
        <TabsList>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="placement">Placement</TabsTrigger>
        </TabsList>

        <TabsContent value="translations">
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Languages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {translations.map((translation) => (
                  <div key={translation.id} className="flex items-center gap-1">
                    <Button
                      variant={selected === translation.languageCode ? 'secondary' : 'ghost'}
                      size="sm"
                      className="flex-1 justify-start"
                      onClick={() => setActiveLanguage(translation.languageCode)}
                    >
                      {translation.languageCode} — {translation.title.slice(0, 14)}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (
                          window.confirm(`Remove the "${translation.languageCode}" translation?`)
                        ) {
                          deleteTranslation.mutate(translation.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setActiveLanguage('__new__')}
                >
                  Add language
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selected === '__new__' ? 'New translation' : `Editing "${selected ?? '-'}"`}
                </CardTitle>
                <CardDescription>
                  Saving an existing language code overwrites that translation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  key={selected ?? 'empty'}
                  onSubmit={handleTranslationSubmit}
                >
                  <div className="space-y-2">
                    <Label htmlFor="languageCode">Language code</Label>
                    <Input
                      id="languageCode"
                      name="languageCode"
                      list="language-suggestions"
                      defaultValue={selected === '__new__' ? '' : (current?.languageCode ?? '')}
                      placeholder="vi, en, ja, ko, zh, fr..."
                      required
                    />
                    <datalist id="language-suggestions">
                      {LANGUAGE_SUGGESTIONS.map((code) => (
                        <option key={code} value={code} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={selected === '__new__' ? '' : (current?.title ?? '')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortDescription">Short description</Label>
                    <Input
                      id="shortDescription"
                      name="shortDescription"
                      defaultValue={selected === '__new__' ? '' : (current?.shortDescription ?? '')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Full description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={8}
                      defaultValue={selected === '__new__' ? '' : (current?.description ?? '')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audioUrl">Narration audio URL</Label>
                    <Input
                      id="audioUrl"
                      name="audioUrl"
                      placeholder="/uploads/audio/narration-en.mp3"
                      defaultValue={selected === '__new__' ? '' : (current?.audioUrl ?? '')}
                    />
                    {current?.audioUrl ? (
                      <audio className="w-full" controls src={mediaUrl(current.audioUrl)} />
                    ) : null}
                  </div>
                  <Button type="submit" disabled={saveTranslation.isPending}>
                    {saveTranslation.isPending ? 'Saving...' : 'Save translation'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Gallery</CardTitle>
                <CardDescription>Language neutral images, audio and video.</CardDescription>
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
            </CardHeader>
            <CardContent>
              {exhibit.media?.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {exhibit.media.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg border p-3">
                      {item.type === 'IMAGE' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(item.url)}
                          alt={item.caption ?? ''}
                          className="h-36 w-full rounded object-cover"
                        />
                      ) : item.type === 'AUDIO' ? (
                        <audio controls className="w-full" src={mediaUrl(item.url)} />
                      ) : (
                        <video controls className="w-full rounded" src={mediaUrl(item.url)} />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {item.caption ?? item.url}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMedia.mutate(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No media attached yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="placement">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where this exhibit is or was displayed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exhibit.assignments?.length ? (
                exhibit.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{assignment.zone?.code ?? assignment.zoneId}</p>
                    <p className="text-muted-foreground">
                      {assignment.activeTo === null
                        ? `On display since ${formatPeriod(assignment.activeFrom, null).split(' → ')[0]}`
                        : formatPeriod(assignment.activeFrom, assignment.activeTo)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not placed in any zone yet. Open a zone and set this exhibit as its current one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
