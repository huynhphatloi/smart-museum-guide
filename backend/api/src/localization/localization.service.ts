import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LocalizationTask } from '@prisma/client';
import { ExhibitNotFoundException } from '../common/errors/app.exception';
import { OfferedLanguagesService } from '../languages/offered-languages.service';
import { MediaStorageService } from '../media/media-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiServiceRegistry } from './ai-service-registry.service';
import {
  AiServiceHeartbeatDto,
  LocalizationWebhookDto,
  RequestLocalizationDto,
} from './dto/localization.dto';
import { LocalizationDispatcher } from './localization-dispatcher.service';
import { planLocalization, requestedLanguages, sourceHashOf } from './localization.planner';
import {
  ExhibitLocalization,
  LanguageLocalization,
  RequestLocalizationResult,
} from './localization.types';

const IN_FLIGHT = ['QUEUED', 'PROCESSING'] as const;

const AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
};

export type WebhookResult = { applied: true } | { applied: false; reason: string };

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorageService,
    private readonly registry: AiServiceRegistry,
    private readonly dispatcher: LocalizationDispatcher,
    private readonly offeredLanguages: OfferedLanguagesService,
  ) {}

  // ---- CMS ------------------------------------------------------------------

  /** Queues translation + narration for the languages that are not up to date. */
  async request(
    exhibitId: string,
    dto: RequestLocalizationDto,
  ): Promise<RequestLocalizationResult> {
    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id: exhibitId },
      include: { translations: true },
    });
    if (!exhibit) throw new ExhibitNotFoundException(exhibitId);

    const languages = requestedLanguages(dto.sourceLanguage, dto.targetLanguages);
    const sourceLanguage = languages[0];
    const offered = this.offeredLanguages.codes();
    const unsupported = languages.filter((code) => !offered.includes(code));
    if (unsupported.length) {
      throw new BadRequestException(
        `Unsupported language(s): ${unsupported.join(', ')}. The AI service does not offer them.`,
      );
    }

    const source = exhibit.translations.find((row) => row.languageCode === sourceLanguage);
    if (!source?.title.trim()) {
      throw new BadRequestException(
        'Save the primary-language title and body before generating translations.',
      );
    }

    const sourceHash = sourceHashOf({
      languageCode: sourceLanguage,
      title: source.title,
      shortDescription: source.shortDescription,
      description: source.description,
    });
    const activeTasks = await this.prisma.localizationTask.findMany({
      where: { exhibitId, status: { in: [...IN_FLIGHT] } },
      select: { id: true, languageCode: true, sourceHash: true },
    });

    const plan = planLocalization({
      languages,
      sourceHash,
      force: (dto.forceLanguages ?? []).map((code) => code.trim().toLowerCase()),
      translations: exhibit.translations,
      activeTasks,
    });

    await this.prisma.$transaction([
      this.prisma.localizationTask.updateMany({
        where: { id: { in: plan.supersedeTaskIds }, status: { in: [...IN_FLIGHT] } },
        data: { status: 'SUPERSEDED', stage: null },
      }),
      this.prisma.localizationTask.createMany({
        data: plan.enqueue.map((languageCode) => ({
          exhibitId,
          languageCode,
          sourceLanguage,
          sourceHash,
        })),
      }),
    ]);

    if (plan.enqueue.length) this.dispatcher.kick();

    return {
      sourceLanguage,
      queued: plan.enqueue,
      skipped: plan.skipped,
      aiService: this.registry.status(),
    };
  }

  /** Per-language state for the exhibit page: newest task plus the stored translation. */
  async status(exhibitId: string): Promise<ExhibitLocalization> {
    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id: exhibitId },
      include: { translations: true },
    });
    if (!exhibit) throw new ExhibitNotFoundException(exhibitId);

    const latestTasks = await this.prisma.localizationTask.findMany({
      where: { exhibitId, status: { not: 'SUPERSEDED' } },
      orderBy: [{ languageCode: 'asc' }, { createdAt: 'desc' }],
      distinct: ['languageCode'],
    });

    const newest = latestTasks.reduce<LocalizationTask | null>(
      (best, task) => (!best || task.createdAt > best.createdAt ? task : best),
      null,
    );
    const sourceLanguage = newest?.sourceLanguage ?? null;
    const source = exhibit.translations.find((row) => row.languageCode === sourceLanguage);
    const currentHash = source
      ? sourceHashOf({
          languageCode: source.languageCode,
          title: source.title,
          shortDescription: source.shortDescription,
          description: source.description,
        })
      : null;

    const codes = new Set([
      ...exhibit.translations.map((row) => row.languageCode),
      ...latestTasks.map((task) => task.languageCode),
    ]);

    const languages = [...codes].map((languageCode): LanguageLocalization => {
      const task = latestTasks.find((row) => row.languageCode === languageCode) ?? null;
      const translation = exhibit.translations.find((row) => row.languageCode === languageCode);
      const status =
        task && task.status !== 'COMPLETED' && task.status !== 'SUPERSEDED'
          ? task.status
          : translation?.audioUrl
            ? 'COMPLETED'
            : 'NO_AUDIO';

      return {
        languageCode,
        isSource: languageCode === sourceLanguage,
        status,
        stage: task?.stage ?? null,
        error: task?.error ?? null,
        upToDate:
          Boolean(currentHash && translation?.audioUrl) && translation?.sourceHash === currentHash,
        task: task && {
          id: task.id,
          status: task.status,
          sourceLanguage: task.sourceLanguage,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          dispatchedAt: task.dispatchedAt,
          completedAt: task.completedAt,
          translationModel: task.translationModel,
          ttsModel: task.ttsModel,
        },
        translation: translation
          ? {
              id: translation.id,
              title: translation.title,
              shortDescription: translation.shortDescription,
              description: translation.description,
              audioUrl: translation.audioUrl,
              updatedAt: translation.updatedAt,
            }
          : null,
      };
    });

    languages.sort((a, b) =>
      a.isSource !== b.isSource
        ? a.isSource
          ? -1
          : 1
        : a.languageCode.localeCompare(b.languageCode),
    );

    return { sourceLanguage, languages, aiService: this.registry.status() };
  }

  // ---- AI service -----------------------------------------------------------

  async heartbeat(dto: AiServiceHeartbeatDto) {
    const node = this.registry.record(dto);
    this.dispatcher.kick();
    await this.offeredLanguages.record({
      // A service that does not report languages keeps the previously known list.
      languages: dto.languages ?? this.offeredLanguages.lastReport()?.languages ?? [],
      translationModel: node.translationModel,
      ttsModels: node.ttsModels,
      device: node.device,
      seenAt: node.lastSeenAt,
    });
    return { ok: true, instanceId: node.instanceId };
  }

  async handleWebhook(dto: LocalizationWebhookDto): Promise<WebhookResult> {
    const task = await this.prisma.localizationTask.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException(`Localization task "${dto.taskId}" does not exist.`);
    if (!IN_FLIGHT.includes(task.status as (typeof IN_FLIGHT)[number])) {
      return { applied: false, reason: `task is ${task.status}` };
    }

    switch (dto.event) {
      case 'task.processing':
        await this.updateInFlight(task.id, {
          status: 'PROCESSING',
          stage: dto.stage ?? null,
          error: null,
        });
        return { applied: true };
      case 'task.failed':
        await this.fail(task.id, dto.error?.trim() || 'The AI service reported a failure.');
        return { applied: true };
      case 'task.completed':
        return this.complete(task, dto);
    }
  }

  private async complete(
    task: LocalizationTask,
    dto: LocalizationWebhookDto,
  ): Promise<WebhookResult> {
    const isSource = task.languageCode === task.sourceLanguage;
    if (!dto.audio) {
      await this.fail(task.id, 'The AI service finished without narration audio.');
      return { applied: false, reason: 'missing audio' };
    }
    if (!isSource && !dto.translation?.title.trim()) {
      await this.fail(task.id, 'The AI service finished without a translation.');
      return { applied: false, reason: 'missing translation' };
    }

    const previous = await this.prisma.exhibitTranslation.findUnique({
      where: {
        exhibitId_languageCode: { exhibitId: task.exhibitId, languageCode: task.languageCode },
      },
    });
    if (isSource && !previous) {
      await this.fail(task.id, 'The source translation was deleted before narration finished.');
      return { applied: false, reason: 'missing source translation' };
    }

    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id: task.exhibitId },
      select: { code: true },
    });
    const buffer = Buffer.from(dto.audio.base64, 'base64');
    const extension = AUDIO_EXTENSIONS[dto.audio.mimeType] ?? '';
    const stored = await this.storage.save(
      {
        originalname: `${exhibit?.code ?? task.exhibitId}-${task.languageCode}${extension}`,
        mimetype: dto.audio.mimeType,
        size: buffer.length,
        buffer,
      },
      'audio',
    );

    const applied = await this.prisma
      .$transaction(async (tx) => {
        // Claim first: a request that superseded this task in the meantime wins.
        const claimed = await tx.localizationTask.updateMany({
          where: { id: task.id, status: { in: [...IN_FLIGHT] } },
          data: {
            status: 'COMPLETED',
            stage: null,
            error: null,
            completedAt: new Date(),
            audioUrl: stored.url,
            translationModel: dto.models?.translation ?? null,
            ttsModel: dto.models?.tts ?? null,
          },
        });
        if (claimed.count === 0) return false;

        if (isSource && previous) {
          await tx.exhibitTranslation.update({
            where: { id: previous.id },
            data: { audioUrl: stored.url, sourceHash: task.sourceHash },
          });
        } else {
          const copy = {
            title: dto.translation!.title.trim(),
            shortDescription: dto.translation!.shortDescription?.trim() || null,
            description: dto.translation!.description?.trim() || null,
            audioUrl: stored.url,
            sourceHash: task.sourceHash,
          };
          await tx.exhibitTranslation.upsert({
            where: {
              exhibitId_languageCode: {
                exhibitId: task.exhibitId,
                languageCode: task.languageCode,
              },
            },
            create: { exhibitId: task.exhibitId, languageCode: task.languageCode, ...copy },
            update: copy,
          });
        }
        return true;
      })
      .catch(async (error: unknown) => {
        await this.storage.remove(stored.url);
        throw error;
      });

    if (!applied) {
      await this.storage.remove(stored.url);
      return { applied: false, reason: 'task was superseded' };
    }

    await this.removeGeneratedAudio(previous?.audioUrl, stored.url);
    this.logger.log(`Localized ${exhibit?.code ?? task.exhibitId}/${task.languageCode}`);
    return { applied: true };
  }

  private fail(taskId: string, error: string) {
    return this.updateInFlight(taskId, {
      status: 'FAILED',
      stage: null,
      error,
      completedAt: new Date(),
    });
  }

  private updateInFlight(
    taskId: string,
    data: {
      status: 'PROCESSING' | 'FAILED';
      stage: string | null;
      error: string | null;
      completedAt?: Date;
    },
  ) {
    return this.prisma.localizationTask.updateMany({
      where: { id: taskId, status: { in: [...IN_FLIGHT] } },
      data,
    });
  }

  /** Deletes replaced narration, but only files an earlier task generated - never staff uploads. */
  private async removeGeneratedAudio(url: string | null | undefined, replacement: string) {
    if (!url || url === replacement) return;
    const generated = await this.prisma.localizationTask.count({ where: { audioUrl: url } });
    if (!generated) return;
    try {
      await this.storage.remove(url);
    } catch (error) {
      this.logger.warn(
        `Could not remove replaced audio ${url}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
