import { Module } from '@nestjs/common';
import { LocalMediaStorageService } from './local-media-storage.service';
import { MediaController } from './media.controller';
import { MediaStorageService } from './media-storage.service';

/**
 * To move to object storage later, replace `useClass` with an
 * `S3MediaStorageService` implementing the same abstract class.
 */
@Module({
  controllers: [MediaController],
  providers: [{ provide: MediaStorageService, useClass: LocalMediaStorageService }],
  exports: [MediaStorageService],
})
export class MediaModule {}
