import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { SIGNATURE_HEADER, signBody } from './ai-service-signature';

const REQUEST_TIMEOUT_MS = 20_000;

/** The AI service could not be reached at all (as opposed to rejecting the job). */
export class AiServiceUnreachableError extends Error {}

export interface AiJobSource {
  languageCode: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
}

/** Body of `POST <ai service>/v1/jobs` (see ai-services/museum_ai/schemas.py). */
export interface AiJobRequest {
  exhibitId: string;
  exhibitCode: string;
  source: AiJobSource;
  tasks: { taskId: string; languageCode: string; translate: boolean }[];
}

@Injectable()
export class AiServiceClient {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** Hands a job to the AI service queue. Throws with a readable message on any failure. */
  async submitJob(baseUrl: string, job: AiJobRequest): Promise<void> {
    if (!this.config.aiServiceSecret) throw new Error('AI_SERVICE_SECRET is not configured.');

    const body = JSON.stringify(job);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [SIGNATURE_HEADER]: signBody(this.config.aiServiceSecret, body),
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new AiServiceUnreachableError(
        `Could not reach the AI service at ${baseUrl}: ${reason}`,
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `The AI service rejected the job (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      );
    }
  }
}
