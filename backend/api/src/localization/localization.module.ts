import { Module } from '@nestjs/common';
import { LanguagesModule } from '../languages/languages.module';
import { MediaModule } from '../media/media.module';
import { AdminAiServiceController, AiServiceController } from './ai-service.controller';
import { AiServiceClient } from './ai-service.client';
import { AiServiceRegistry } from './ai-service-registry.service';
import { LocalizationDispatcher } from './localization-dispatcher.service';
import { LocalizationController } from './localization.controller';
import { LocalizationService } from './localization.service';

/**
 * Translation + narration through the external AI service (ai-services/, run on
 * Google Colab). The CMS queues tasks here, the dispatcher hands them to the
 * service, and the service reports results back through a signed webhook.
 */
@Module({
  imports: [MediaModule, LanguagesModule],
  controllers: [LocalizationController, AiServiceController, AdminAiServiceController],
  providers: [LocalizationService, LocalizationDispatcher, AiServiceRegistry, AiServiceClient],
})
export class LocalizationModule {}
