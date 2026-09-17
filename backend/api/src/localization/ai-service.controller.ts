import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiServiceRegistry } from './ai-service-registry.service';
import { AiServiceSignatureGuard } from './ai-service.guard';
import { AiServiceHeartbeatDto, LocalizationWebhookDto } from './dto/localization.dto';
import { LocalizationService } from './localization.service';

/** Called by the AI service (ai-services/), authenticated by a signed body instead of a JWT. */
@Controller('ai-services')
@UseGuards(AiServiceSignatureGuard)
export class AiServiceController {
  constructor(private readonly localization: LocalizationService) {}

  /** Lets the AI service check the URL and secret at startup without registering itself. */
  @Post('ping')
  @HttpCode(200)
  ping() {
    return { ok: true };
  }

  @Post('heartbeat')
  @HttpCode(200)
  heartbeat(@Body() dto: AiServiceHeartbeatDto) {
    return this.localization.heartbeat(dto);
  }

  @Post('webhooks/localization')
  @HttpCode(200)
  webhook(@Body() dto: LocalizationWebhookDto) {
    return this.localization.handleWebhook(dto);
  }
}

@Controller('admin/ai-services')
@UseGuards(JwtAuthGuard)
export class AdminAiServiceController {
  constructor(private readonly registry: AiServiceRegistry) {}

  @Get('status')
  status() {
    return this.registry.status();
  }
}
