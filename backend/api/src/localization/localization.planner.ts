import { createHash } from 'crypto';

export interface SourceCopy {
  languageCode: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
}

/**
 * Fingerprint of the primary copy. A translation or narration generated from a
 * different fingerprint is out of date. The language code is part of it, so
 * switching the primary language regenerates everything.
 */
export function sourceHashOf(copy: SourceCopy): string {
  const normalised = [
    copy.languageCode.trim().toLowerCase(),
    copy.title.trim(),
    copy.shortDescription?.trim() || null,
    copy.description?.trim() || null,
  ];
  return createHash('sha256').update(JSON.stringify(normalised)).digest('hex');
}

/** Lower-cases, drops duplicates and puts the source language first. */
export function requestedLanguages(
  sourceLanguage: string,
  targetLanguages: readonly string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [sourceLanguage, ...targetLanguages]) {
    const code = raw.trim().toLowerCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

export type LocalizationSkipReason = 'up_to_date' | 'in_progress';

export interface PlannerTranslation {
  languageCode: string;
  audioUrl: string | null;
  sourceHash: string | null;
}

export interface PlannerActiveTask {
  id: string;
  languageCode: string;
  sourceHash: string;
}

export interface LocalizationPlan {
  /** Languages that get a new task. */
  enqueue: string[];
  skipped: { languageCode: string; reason: LocalizationSkipReason }[];
  /** Queued or running tasks made obsolete by this request. */
  supersedeTaskIds: string[];
}

/**
 * Pure decision step behind "the admin pressed Save".
 *
 * Rules, per requested language:
 *  - a task already working from the same source copy is left alone (no duplicate work)
 *  - a language whose narration was generated from the same source copy is up to date
 *  - anything else is (re)generated, and older in-flight tasks for it are superseded
 *  - languages in `force` are regenerated even when up to date or in flight
 *
 * Copy with no recorded source hash (seed data, hand edits) is never up to date.
 */
export function planLocalization(input: {
  languages: readonly string[];
  sourceHash: string;
  force: readonly string[];
  translations: readonly PlannerTranslation[];
  activeTasks: readonly PlannerActiveTask[];
}): LocalizationPlan {
  const plan: LocalizationPlan = { enqueue: [], skipped: [], supersedeTaskIds: [] };

  for (const languageCode of input.languages) {
    const active = input.activeTasks.filter((task) => task.languageCode === languageCode);
    const translation = input.translations.find((row) => row.languageCode === languageCode);
    const running = active.find((task) => task.sourceHash === input.sourceHash);
    const forced = input.force.includes(languageCode);

    if (!forced && running) {
      plan.skipped.push({ languageCode, reason: 'in_progress' });
      plan.supersedeTaskIds.push(
        ...active.filter((task) => task !== running).map((task) => task.id),
      );
      continue;
    }

    plan.supersedeTaskIds.push(...active.map((task) => task.id));

    const upToDate = Boolean(translation?.audioUrl) && translation?.sourceHash === input.sourceHash;
    if (!forced && upToDate) {
      plan.skipped.push({ languageCode, reason: 'up_to_date' });
    } else {
      plan.enqueue.push(languageCode);
    }
  }

  return plan;
}
