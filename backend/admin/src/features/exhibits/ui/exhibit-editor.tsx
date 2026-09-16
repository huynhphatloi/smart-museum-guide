'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch, apiUpload, mediaUrl } from '@/lib/api-client';
import { formatPeriod } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { Exhibit, ExhibitMedia, LocalizeExhibitResult, MediaType } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Visitor languages staff can generate from the primary copy. */
export const EXHIBIT_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文（简体）' },
  { code: 'zh-hant', label: '中文（繁體）' },
  { code: 'th', label: 'ไทย' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'lo', label: 'ລາວ' },
  { code: 'fil', label: 'Filipino' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'sv', label: 'Svenska' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
] as const;

type PendingFile = { id: string; file: File; previewUrl: string; type: MediaType };

function mediaTypeFromFile(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
}

function inferPrimaryLanguage(exhibit?: Exhibit): string {
  const codes = exhibit?.translations?.map((row) => row.languageCode) ?? [];
  if (codes.includes('vi')) return 'vi';
  return codes[0] ?? 'vi';
}

export function ExhibitEditor({ exhibit }: { exhibit?: Exhibit }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(exhibit);

  const [code, setCode] = useState(exhibit?.code ?? '');
  const [defaultTitle, setDefaultTitle] = useState(exhibit?.defaultTitle ?? '');
  const [primaryLanguage, setPrimaryLanguage] = useState(inferPrimaryLanguage(exhibit));
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<string[]>(exhibit ? [] : ['en']);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const pendingFilesRef = useRef<PendingFile[]>([]);
  pendingFilesRef.current = pendingFiles;

  const translations = exhibit?.translations ?? [];
  const existingCodes = useMemo(
    () => new Set((exhibit?.translations ?? []).map((row) => row.languageCode)),
    [exhibit?.translations],
  );

  useEffect(() => {
    if (!exhibit) return;
    const nextPrimary = inferPrimaryLanguage(exhibit);
    const current = exhibit.translations?.find((row) => row.languageCode === nextPrimary);
    setCode(exhibit.code);
    setDefaultTitle(exhibit.defaultTitle);
    setPrimaryLanguage(nextPrimary);
    setTitle(current?.title ?? '');
    setShortDescription(current?.shortDescription ?? '');
    setDescription(current?.description ?? '');
    setVariants(
      (exhibit.translations ?? [])
        .map((row) => row.languageCode)
        .filter((languageCode) => languageCode !== nextPrimary),
    );
  }, [exhibit]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function applyPrimaryLanguage(next: string) {
    if (isEdit && exhibit) {
      const current = exhibit.translations?.find((row) => row.languageCode === next);
      setTitle(current?.title ?? '');
      setShortDescription(current?.shortDescription ?? '');
      setDescription(current?.description ?? '');
    }
    setPrimaryLanguage(next);
    setVariants((current) => current.filter((code) => code !== next));
  }

  function toggleVariant(languageCode: string) {
    if (languageCode === primaryLanguage) return;
    setVariants((current) =>
      current.includes(languageCode)
        ? current.filter((code) => code !== languageCode)
        : [...current, languageCode],
    );
  }

  function addPendingFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: mediaTypeFromFile(file),
      });
    }
    setPendingFiles((current) => [...current, ...next]);
  }

  function removePending(id: string) {
    setPendingFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  const invalidate = (exhibitId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['exhibit', exhibitId] });
    void queryClient.invalidateQueries({ queryKey: ['exhibits'] });
  };

  const setStatus = useMutation({
    mutationFn: (action: 'publish' | 'archive') =>
      apiFetch<Exhibit>(`/admin/exhibits/${exhibit!.id}/${action}`, { method: 'POST' }),
    onSuccess: (updated) => {
      toast.success(t('exhibitNowStatus', { status: updated.status }));
      invalidate(updated.id);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('statusChangeError')),
  });

  const deleteMedia = useMutation({
    mutationFn: (mediaId: string) =>
      apiFetch<void>(`/admin/exhibits/${exhibit!.id}/media/${mediaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('mediaRemoved'));
      invalidate(exhibit!.id);
    },
  });

  async function uploadMedia(exhibitId: string, file: File) {
    const stored = await apiUpload(file);
    const type: MediaType = stored.mimeType.startsWith('video/')
      ? 'VIDEO'
      : stored.mimeType.startsWith('audio/')
        ? 'AUDIO'
        : 'IMAGE';
    await apiFetch(`/admin/exhibits/${exhibitId}/media`, {
      method: 'POST',
      body: { type, url: stored.url, caption: file.name },
    });
  }

  async function handleImmediateUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    if (!exhibit) {
      addPendingFiles(files);
      event.target.value = '';
      return;
    }
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
        await uploadMedia(exhibit.id, file);
      }
      toast.success(t('mediaAdded'));
      invalidate(exhibit.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('uploadFailed'));
    } finally {
      event.target.value = '';
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw new ApiError(400, 'VALIDATION_FAILED', t('titleRequired'));
      const internalTitle = defaultTitle.trim() || trimmedTitle;
      const primary = {
        languageCode: primaryLanguage,
        title: trimmedTitle,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
      };

      let saved: Exhibit;
      if (!exhibit) {
        saved = await apiFetch<Exhibit>('/admin/exhibits', {
          method: 'POST',
          body: {
            code: code.trim().toUpperCase(),
            defaultTitle: internalTitle,
            translations: [primary],
          },
        });
      } else {
        const current = exhibit.translations?.find((row) => row.languageCode === primaryLanguage);
        await apiFetch<Exhibit>(`/admin/exhibits/${exhibit.id}`, {
          method: 'PATCH',
          body: { defaultTitle: internalTitle },
        });
        await apiFetch(`/admin/exhibits/${exhibit.id}/translations`, {
          method: 'POST',
          body: { ...primary, audioUrl: current?.audioUrl || undefined },
        });
        saved = { ...exhibit, defaultTitle: internalTitle };
      }

      for (const item of pendingFiles) {
        await uploadMedia(saved.id, item.file);
      }

      const localize = await apiFetch<LocalizeExhibitResult>(
        `/admin/exhibits/${saved.id}/localize`,
        {
          method: 'POST',
          body: {
            sourceLanguage: primaryLanguage,
            targetLanguages: variants.filter((code) => code !== primaryLanguage),
          },
        },
      );

      return { saved, localize };
    },
    onSuccess: ({ saved, localize }) => {
      pendingFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPendingFiles([]);
      toast.success(isEdit ? t('exhibitSaved') : t('exhibitCreated', { code: saved.code }));
      if (localize.warning) toast.warning(localize.warning);
      else if (localize.generated.some((row) => row.translated || row.audioGenerated)) {
        toast.success(t('localizeDone'));
      }
      invalidate(saved.id);
      if (!isEdit) router.push(`/exhibits/${saved.id}`);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : isEdit
            ? t('identitySaveError')
            : t('exhibitCreateError'),
      ),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  const savedMedia: ExhibitMedia[] = exhibit?.media ?? [];
  const selectedLanguages = [
    primaryLanguage,
    ...variants.filter((code) => code !== primaryLanguage),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            href="/exhibits"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t('allExhibitsLink')}
          </Link>
          <h1 className="text-2xl font-semibold">
            {isEdit ? exhibit?.defaultTitle : t('newExhibitTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? t('editExhibitHint') : t('newExhibitHint')}
          </p>
          {exhibit ? (
            <div className="mt-2 flex items-center gap-2">
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
          ) : null}
        </div>
        {exhibit ? (
          <div className="flex gap-2">
            {exhibit.status !== 'PUBLISHED' ? (
              <Button
                onClick={() => setStatus.mutate('publish')}
                disabled={translations.length === 0 || setStatus.isPending}
              >
                {t('publish')}
              </Button>
            ) : null}
            {exhibit.status !== 'ARCHIVED' ? (
              <Button
                variant="outline"
                onClick={() => setStatus.mutate('archive')}
                disabled={setStatus.isPending}
              >
                {t('archive')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
        <Card>
          <CardHeader>
            <CardTitle>{t('identity')}</CardTitle>
            <CardDescription>{t('identityHint')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">{t('code')}</Label>
              <Input
                id="code"
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="EX_CHAM_STATUE"
                autoComplete="off"
                required
                readOnly={isEdit}
                disabled={isEdit}
              />
              {isEdit ? <p className="text-xs text-muted-foreground">{t('codeReadOnly')}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultTitle">{t('defaultTitle')}</Label>
              <Input
                id="defaultTitle"
                name="defaultTitle"
                value={defaultTitle}
                onChange={(event) => setDefaultTitle(event.target.value)}
                autoComplete="off"
                placeholder={t('titlePlaceholderVi')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryLanguage">{t('primaryLanguage')}</Label>
              <select
                id="primaryLanguage"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={primaryLanguage}
                onChange={(event) => applyPrimaryLanguage(event.target.value)}
              >
                {EXHIBIT_LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{t('primaryLanguageHint')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('visitorBody')}</CardTitle>
            <CardDescription>{t('visitorBodyHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('title')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  primaryLanguage === 'en' ? t('titlePlaceholderEn') : t('titlePlaceholderVi')
                }
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDescription">{t('shortDescription')}</Label>
              <Input
                id="shortDescription"
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('fullDescription')}</Label>
              <Textarea
                id="description"
                rows={12}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{t('attachments')}</CardTitle>
              <CardDescription>{t('attachmentsHint')}</CardDescription>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" />
              {t('uploadImageVideo')}
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={handleImmediateUpload}
              />
            </label>
          </CardHeader>
          <CardContent>
            {savedMedia.length || pendingFiles.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedMedia.map((item) => (
                  <MediaTile
                    key={item.id}
                    type={item.type}
                    src={mediaUrl(item.url)}
                    caption={item.caption ?? item.url}
                    onRemove={exhibit ? () => deleteMedia.mutate(item.id) : undefined}
                  />
                ))}
                {pendingFiles.map((item) => (
                  <MediaTile
                    key={item.id}
                    type={item.type}
                    src={item.previewUrl}
                    caption={item.file.name}
                    pending
                    onRemove={() => removePending(item.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noMediaYet')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('languageVariants')}</CardTitle>
            <CardDescription>{t('languageVariantsHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EXHIBIT_LANGUAGES.map((language) => {
                const languageCode = language.code;
                const selected = selectedLanguages.includes(languageCode);
                const isPrimary = languageCode === primaryLanguage;
                const exists = existingCodes.has(languageCode);
                return (
                  <button
                    key={languageCode}
                    type="button"
                    disabled={isPrimary}
                    onClick={() => toggleVariant(languageCode)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-foreground hover:bg-accent',
                      isPrimary && 'cursor-default opacity-90',
                    )}
                  >
                    {language.label}
                    {isPrimary
                      ? ` · ${t('primaryIncluded')}`
                      : exists
                        ? ` · ${t('alreadyTranslated')}`
                        : selected
                          ? ` · ${t('willTranslate')}`
                          : ''}
                  </button>
                );
              })}
            </div>
            {translations.some((row) => row.audioUrl) ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('narrationAudio')}</p>
                {translations.map((row) =>
                  row.audioUrl ? (
                    <div key={row.id} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{row.languageCode}</p>
                      <audio className="w-full" controls src={mediaUrl(row.audioUrl)} />
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('generateAudioHint')}</p>
            )}
          </CardContent>
        </Card>

        {exhibit ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('placementTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exhibit.assignments?.length ? (
                exhibit.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{assignment.zone?.code ?? assignment.zoneId}</p>
                    <p className="text-muted-foreground">
                      {assignment.activeTo === null
                        ? t('onDisplayOpen', {
                            date: formatPeriod(assignment.activeFrom, null).split(' → ')[0],
                          })
                        : formatPeriod(assignment.activeFrom, assignment.activeTo)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('notPlacedYet')}</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/exhibits">{t('cancel')}</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('savingExhibit') : t('saveExhibit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MediaTile({
  type,
  src,
  caption,
  pending,
  onRemove,
}: {
  type: MediaType;
  src?: string;
  caption: string;
  pending?: boolean;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {type === 'IMAGE' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={caption} className="h-36 w-full rounded object-cover" />
      ) : type === 'AUDIO' ? (
        <audio controls className="w-full" src={src} />
      ) : (
        <video controls className="w-full rounded" src={src} />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted-foreground">
          {pending ? `${t('pendingUploads')}: ${caption}` : caption}
        </p>
        {onRemove ? (
          <Button size="icon" variant="ghost" type="button" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
