import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { SIGNATURE_HEADER, verifySignature } from './ai-service-signature';

/**
 * Protects the routes the AI service calls (heartbeat, result webhook). There
 * is no JWT on that side: the request body must be signed with AI_SERVICE_SECRET.
 * Needs `rawBody: true` in main.ts, because re-serialised JSON would not match.
 */
@Injectable()
export class AiServiceSignatureGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.aiServiceSecret) {
      throw new ServiceUnavailableException('AI_SERVICE_SECRET is not configured on the API.');
    }

    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const header = request.header(SIGNATURE_HEADER);
    if (
      !request.rawBody ||
      !verifySignature(this.config.aiServiceSecret, header, request.rawBody)
    ) {
      throw new UnauthorizedException('Invalid or missing AI service signature.');
    }
    return true;
  }
}
