import { Module } from '@nestjs/common';
import { OfferedLanguagesService } from './offered-languages.service';

@Module({
  providers: [OfferedLanguagesService],
  exports: [OfferedLanguagesService],
})
export class LanguagesModule {}
