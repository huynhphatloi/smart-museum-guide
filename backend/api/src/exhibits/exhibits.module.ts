import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ExhibitContentService } from './exhibit-content.service';
import { ExhibitLocalizeService } from './exhibit-localize.service';
import { ExhibitResolverService } from './exhibit-resolver.service';
import { ExhibitsController } from './exhibits.controller';
import { ExhibitsService } from './exhibits.service';

@Module({
  imports: [MediaModule],
  controllers: [ExhibitsController],
  providers: [ExhibitsService, ExhibitResolverService, ExhibitContentService, ExhibitLocalizeService],
  exports: [ExhibitsService, ExhibitResolverService, ExhibitContentService],
})
export class ExhibitsModule {}
