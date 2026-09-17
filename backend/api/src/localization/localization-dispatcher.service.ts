import { Injectable, Logger } from '@nestjs/common';
import { LocalizationTask, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiServiceRegistry } from './ai-service-registry.service';
import { AiServiceClient, AiServiceUnreachableError } from './ai-service.client';
import { sourceHashOf } from './localization.planner';

/**
 * A task handed to the live AI service that it no longer reports as active is
 * considered lost after this long (the delay covers a heartbeat that was already
 * on its way when the job arrived).
 */
const LOST_TASK_GRACE_MS = 60_000;

/**
 * Moves waiting tasks from the database into the AI service queue.
 *
 * Runs after every localization request and every heartbeat, so tasks created
 * while the Colab runtime was down, and tasks lost when it restarted, are handed
 * over as soon as a service is back. Dispatching is idempotent: the AI service
 * ignores task ids it already holds.
 */
@Injectable()
export class LocalizationDispatcher {
  private readonly logger = new Logger(LocalizationDispatcher.name);
  private running: Promise<void> | null = null;
  private rerun = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiServiceRegistry,
    private readonly client: AiServiceClient,
  ) {}

  /** Starts a dispatch pass in the background. Never throws. */
  kick(): void {
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.running = this.dispatchPending()
      .catch((error: unknown) =>
        this.logger.error(
          `Dispatch failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      )
      .finally(() => {
        this.running = null;
        if (this.rerun) {
          this.rerun = false;
          this.kick();
        }
      });
  }

  private async dispatchPending(): Promise<void> {
    const node = this.registry.current();
    if (!node) return;

    const lostBefore = new Date(Date.now() - LOST_TASK_GRACE_MS);
    const tasks = await this.prisma.localizationTask.findMany({
      where: {
        status: { in: ['QUEUED', 'PROCESSING'] },
        OR: [
          { dispatchedTo: null },
          { dispatchedTo: { not: node.instanceId } },
          {
            dispatchedTo: node.instanceId,
            dispatchedAt: { lt: lostBefore },
            id: { notIn: node.activeTaskIds },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (tasks.length === 0) return;

    const groups = new Map<string, LocalizationTask[]>();
    for (const task of tasks) {
      const key = `${task.exhibitId}:${task.sourceLanguage}`;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }

    for (const group of groups.values()) {
      const reachable = await this.dispatchGroup(node.url, node.instanceId, group);
      if (!reachable) return;
    }
  }

  /** Returns false when the AI service could not be reached, ending this pass. */
  private async dispatchGroup(
    url: string,
    instanceId: string,
    tasks: LocalizationTask[],
  ): Promise<boolean> {
    const { exhibitId, sourceLanguage } = tasks[0];
    const taskIds = tasks.map((task) => task.id);
    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id: exhibitId },
      select: {
        code: true,
        translations: { where: { languageCode: sourceLanguage } },
      },
    });
    const source = exhibit?.translations[0];

    if (!exhibit || !source?.title.trim()) {
      await this.update(taskIds, {
        status: 'FAILED',
        error: `The ${sourceLanguage} source copy no longer exists.`,
        completedAt: new Date(),
      });
      return true;
    }

    const sourceCopy = {
      languageCode: sourceLanguage,
      title: source.title,
      shortDescription: source.shortDescription,
      description: source.description,
    };

    // Claimed before sending: the service may report progress before submitJob
    // returns, and that webhook must not be overwritten afterwards. The service
    // works from the copy sent now, which may be newer than the task's original.
    await this.update(taskIds, {
      status: 'QUEUED',
      stage: null,
      error: null,
      dispatchedTo: instanceId,
      dispatchedAt: new Date(),
      sourceHash: sourceHashOf(sourceCopy),
    });

    try {
      await this.client.submitJob(url, {
        exhibitId,
        exhibitCode: exhibit.code,
        source: sourceCopy,
        tasks: tasks.map((task) => ({
          taskId: task.id,
          languageCode: task.languageCode,
          translate: task.languageCode !== sourceLanguage,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not dispatch ${taskIds.length} task(s) for ${exhibit.code}: ${message}`,
      );
      // Stays QUEUED and is retried on the next heartbeat.
      await this.update(taskIds, { dispatchedTo: null, dispatchedAt: null, error: message });
      if (error instanceof AiServiceUnreachableError) {
        this.registry.markUnreachable(instanceId);
        return false;
      }
      return true;
    }

    this.logger.log(
      `Dispatched ${exhibit.code} [${tasks.map((task) => task.languageCode).join(', ')}]`,
    );
    return true;
  }

  /** Only touches tasks still in flight, so a concurrent supersede or webhook wins. */
  private update(ids: string[], data: Prisma.LocalizationTaskUpdateManyMutationInput) {
    return this.prisma.localizationTask.updateMany({
      where: { id: { in: ids }, status: { in: ['QUEUED', 'PROCESSING'] } },
      data,
    });
  }
}
