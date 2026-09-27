import { Module } from '@nestjs/common';
import { PositioningController } from './positioning.controller';
import { PositioningService } from './positioning.service';

@Module({
  controllers: [PositioningController],
  providers: [PositioningService],
  exports: [PositioningService],
})
export class PositioningModule {}
