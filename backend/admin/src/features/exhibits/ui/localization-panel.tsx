'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch, mediaUrl } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { UiKey, useI18n } from '@/lib/i18n';
import {
  AiServiceStatus,
  ExhibitLocalization,
  LanguageLocalization,
  RequestLocalizationResult,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { languageLabel, languageOrder, useOfferedLanguages } from '../model/languages';

/** Poll quickly while the AI service is working, slowly otherwise (to notice it coming online). */
const BUSY_REFRESH_MS = 3_000;
const IDLE_REFRESH_MS = 15_000;

export function localizationQueryKey(exhibitId: string) {
  return ['exhibit-localization', exhibitId] as const;
}

function isInFlight(row: LanguageLocalization): boolean {
  return row.status === 'QUEUED' || row.status === 'PROCESSING';
}

/** Tells staff what a localization request did, including when nothing can process it yet. */
export function announceLocalization(
  result: RequestLocalizationResult,
  t: ReturnType<typeof useI18n>['t'],
): void {
  if (result.queued.length === 0) toast.message(t('localizationUpToDate'));
  else if (!result.aiService.configured) toast.warning(t('aiServiceNotConfigured'));
  else if (!result.aiService.online) toast.warning(t('aiServiceOffline'));
  else toast.success(t('localizationQueued', { count: String(result.queued.length) }));
}

/**
 * Per-language progress of translation + narration, the audio player and the
 * translated copy. Deliberately keeps its own query instead of refetching the
 * exhibit, which would reset the editor form while staff are typing.
 */
export function LocalizationPanel({
  exhibitId,
  primaryLanguage,
}: {
  exhibitId: string;
  primaryLanguage: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: localizationQueryKey(exhibitId),
    queryFn: () => apiFetch<ExhibitLocalization>(`/admin/exhibits/${exhibitId}/localization`),
    refetchInterval: (current) =>
      current.state.data?.languages.some(isInFlight) ? BUSY_REFRESH_MS : IDLE_REFRESH_MS,
  });

  const regenerate = useMutation({
    mutationFn: (languageCode: string) => {
      const sourceLanguage = query.data?.sourceLanguage ?? primaryLanguage;
      return apiFetch<RequestLocalizationResult>(`/admin/exhibits/${exhibitId}/localization`, {
        method: 'POST',
        body: {
          sourceLanguage,
          targetLanguages: languageCode === sourceLanguage ? [] : [languageCode],
          forceLanguages: [languageCode],
        },
      });
    },
    onSuccess: (result) => {
      announceLocalization(result, t);
      void queryClient.invalidateQueries({ queryKey: localizationQueryKey(exhibitId) });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('localizationRequestError')),
  });

  const offeredQuery = useOfferedLanguages();
  const offered = offeredQuery.data?.languages ?? [];
  const languages = [...(query.data?.languages ?? [])].sort((a, b) =>
    a.isSource !== b.isSource
      ? a.isSource
        ? -1
        : 1
      : languageOrder(a.languageCode, offered) - languageOrder(b.languageCode, offered),
  );

  return (
    <Card>
      <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{t('localizationTitle')}</CardTitle>
          <CardDescription>{t('localizationHint')}</CardDescription>
        </div>
        {query.data ? <AiServiceIndicator status={query.data.aiService} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading ? (
          <Skeleton className="h-24" />
        ) : languages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('localizationEmpty')}</p>
        ) : (
          languages.map((row) => (
            <LanguageRow
              key={row.languageCode}
              row={row}
              label={languageLabel(row.languageCode, offered)}
              offered={
                !offeredQuery.data || offered.some((language) => language.code === row.languageCode)
              }
              busy={regenerate.isPending && regenerate.variables === row.languageCode}
              onRegenerate={() => regenerate.mutate(row.languageCode)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AiServiceIndicator({ status }: { status: AiServiceStatus }) {
  const { t } = useI18n();

  if (!status.configured) {
    return <p className="max-w-xs text-xs text-destructive">{t('aiServiceNotConfigured')}</p>;
  }

  if (!status.online) {
    return (
      <div className="max-w-xs space-y-0.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {t('aiServiceOffline')}
        </p>
        {status.lastSeenAt ? (
          <p>{t('aiServiceLastSeen', { time: formatDateTime(status.lastSeenAt) })}</p>
        ) : null}
      </div>
    );
  }

  const details = [
    status.device,
    status.queueSize === null ? null : t('aiServiceQueue', { count: String(status.queueSize) }),
  ].filter(Boolean);

  return (
    <div className="space-y-0.5 text-xs text-muted-foreground sm:text-right">
      <p className="flex items-center gap-1.5 font-medium text-emerald-700 sm:justify-end">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {t('aiServiceOnline')}
      </p>
      {details.length ? <p>{details.join(' · ')}</p> : null}
    </div>
  );
}

const STATUS_BADGE: Record<
  LanguageLocalization['status'],
  { variant: BadgeProps['variant']; label: UiKey }
> = {
  QUEUED: { variant: 'warning', label: 'statusQueued' },
  PROCESSING: { variant: 'default', label: 'statusProcessing' },
  COMPLETED: { variant: 'success', label: 'statusCompleted' },
  FAILED: { variant: 'destructive', label: 'statusFailed' },
  NO_AUDIO: { variant: 'secondary', label: 'statusNoAudio' },
};

function statusLabel(row: LanguageLocalization): UiKey {
  if (row.status === 'PROCESSING' && row.stage === 'translating') return 'statusTranslating';
  if (row.status === 'PROCESSING' && row.stage === 'synthesizing') return 'statusSynthesizing';
  return STATUS_BADGE[row.status].label;
}

function LanguageRow({
  row,
  label,
  offered,
  busy,
  onRegenerate,
}: {
  row: LanguageLocalization;
  label: string;
  /** False when the AI service no longer supports this language, so it cannot be regenerated. */
  offered: boolean;
  busy: boolean;
  onRegenerate: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const inFlight = isInFlight(row);
  const translation = row.translation;
  const models = [row.task?.translationModel, row.task?.ttsModel].filter(Boolean).join(' · ');
  const updatedAt = row.task?.completedAt ?? translation?.updatedAt ?? null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{label}</p>
          <span className="text-xs text-muted-foreground">{row.languageCode}</span>
          {row.isSource ? <Badge variant="outline">{t('primaryIncluded')}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {row.status === 'COMPLETED' && !row.upToDate ? (
            <Badge variant="secondary" title={t('outdatedHint')}>
              {t('statusOutdated')}
            </Badge>
          ) : null}
          <Badge variant={STATUS_BADGE[row.status].variant} className="gap-1.5">
            {inFlight ? (
              <RefreshCw className={cn('h-3 w-3', row.status === 'PROCESSING' && 'animate-spin')} />
            ) : null}
            {t(statusLabel(row))}
          </Badge>
        </div>
      </div>

      {row.status === 'FAILED' && row.error ? (
        <p className="text-sm text-destructive">{row.error}</p>
      ) : null}
      {row.status === 'QUEUED' && row.error ? (
        <p className="text-xs text-muted-foreground">
          {t('lastAttemptError', { error: row.error })}
        </p>
      ) : null}

      {translation?.audioUrl ? (
        <audio
          className="w-full"
          controls
          preload="metadata"
          src={mediaUrl(translation.audioUrl)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? t('hideContent') : t('viewContent')}
        </Button>
        <div className="flex items-center gap-3">
          {updatedAt && !inFlight ? (
            <span className="text-xs text-muted-foreground">{formatDateTime(updatedAt)}</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={inFlight || busy || !offered}
            title={offered ? undefined : t('languageNotOffered')}
            onClick={onRegenerate}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            {row.status === 'FAILED' ? t('retry') : t('regenerate')}
          </Button>
        </div>
      </div>

      {expanded ? (
        translation ? (
          <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium">{translation.title}</p>
            {translation.shortDescription ? (
              <p className="text-muted-foreground">{translation.shortDescription}</p>
            ) : null}
            {translation.description ? (
              <p className="whitespace-pre-line">{translation.description}</p>
            ) : null}
            {models ? (
              <p className="text-xs text-muted-foreground">{t('generatedWith', { models })}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noTranslationYet')}</p>
        )
      ) : null}
    </div>
  );
}
