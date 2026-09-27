import { Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { LocalMediaStorageService } from './local-media-storage.service';
import { MediaController } from './media.controller';
import { MediaStorageService } from './media-storage.service';
import { R2MediaStorageService } from './r2-media-storage.service';

/**
 * `MEDIA_STORAGE=r2` stores new uploads and generated narration in Cloudflare
 * R2; otherwise files go to local disk. Everything else depends only on
 * `MediaStorageService`.
 */
@Module({
  controllers: [MediaController],
  providers: [
    LocalMediaStorageService,
    {
      provide: MediaStorageService,
      inject: [APP_CONFIG, LocalMediaStorageService],
      useFactory: (config: AppConfig, local: LocalMediaStorageService): MediaStorageService =>
        config.r2 ? new R2MediaStorageService(config, config.r2, local) : local,
    },
  ],
  exports: [MediaStorageService],
})
export class MediaModule {}
