import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { OfferedLanguagesService } from '../languages/offered-languages.service';
import { AiServiceHeartbeatDto } from './dto/localization.dto';
import { AiServiceStatus } from './localization.types';

export interface AiServiceNode {
  instanceId: string;
  url: string;
  queueSize: number;
  activeTaskIds: string[];
  translationModel: string | null;
  ttsModels: string[];
  device: string | null;
  lastSeenAt: Date;
  /** Set when a job could not be delivered; cleared by the next heartbeat. */
  unreachable: boolean;
}

/**
 * Remembers the AI service that last sent a heartbeat.
 *
 * The AI service runs in Google Colab behind a throw-away tunnel, so its URL
 * changes with every runtime. Instead of an env variable that needs an API
 * restart, the service announces itself every few seconds. Memory is enough:
 * after an API restart the next heartbeat restores the entry.
 */
@Injectable()
export class AiServiceRegistry {
  private readonly logger = new Logger(AiServiceRegistry.name);
  private node: AiServiceNode | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly offeredLanguages: OfferedLanguagesService,
  ) {}

  record(heartbeat: AiServiceHeartbeatDto, now: Date = new Date()): AiServiceNode {
    const previous = this.current(now);
    this.node = {
      instanceId: heartbeat.instanceId,
      url: heartbeat.url.replace(/\/+$/, ''),
      queueSize: heartbeat.queueSize,
      activeTaskIds: heartbeat.activeTaskIds,
      translationModel: heartbeat.translationModel ?? null,
      ttsModels: heartbeat.ttsModels ?? [],
      device: heartbeat.device ?? null,
      lastSeenAt: now,
      unreachable: false,
    };
    if (previous?.instanceId !== heartbeat.instanceId) {
      this.logger.log(`AI service ${heartbeat.instanceId} online at ${this.node.url}`);
    }
    return this.node;
  }

  /**
   * Treats the service as offline until its next heartbeat. A Colab runtime that
   * was shut down stops answering long before its last heartbeat expires.
   */
  markUnreachable(instanceId: string): void {
    if (this.node?.instanceId === instanceId && !this.node.unreachable) {
      this.node.unreachable = true;
      this.logger.warn(`AI service ${instanceId} is unreachable at ${this.node.url}`);
    }
  }

  /** The live AI service, or null when none has sent a heartbeat recently. */
  current(now: Date = new Date()): AiServiceNode | null {
    if (!this.node || this.node.unreachable) return null;
    const age = now.getTime() - this.node.lastSeenAt.getTime();
    return age <= this.config.aiServiceOfflineAfterMs ? this.node : null;
  }

  status(now: Date = new Date()): AiServiceStatus {
    const live = this.current(now);
    // After an API restart nothing is in memory until the next heartbeat; the
    // stored report still tells staff which models were last used.
    const known = this.node ?? this.offeredLanguages.lastReport();
    return {
      configured: Boolean(this.config.aiServiceSecret),
      online: Boolean(live),
      lastSeenAt: known?.lastSeenAt.toISOString() ?? null,
      queueSize: live?.queueSize ?? null,
      translationModel: known?.translationModel ?? null,
      ttsModels: known?.ttsModels ?? [],
      device: known?.device ?? null,
    };
  }
}
