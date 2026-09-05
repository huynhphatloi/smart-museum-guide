import { Module } from '@nestjs/common';
import { ExhibitContentService } from './exhibit-content.service';
import { ExhibitResolverService } from './exhibit-resolver.service';
import { ExhibitsController } from './exhibits.controller';
import { ExhibitsService } from './exhibits.service';

@Module({
  controllers: [ExhibitsController],
  providers: [ExhibitsService, ExhibitResolverService, ExhibitContentService],
  exports: [ExhibitsService, ExhibitResolverService, ExhibitContentService],
})
export class ExhibitsModule {}
