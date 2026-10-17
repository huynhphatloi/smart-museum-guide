import { Module } from '@nestjs/common';
import { PublicGuideModule } from '../public-guide/public-guide.module';
import { AnalyticsController, ExhibitVisitsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PublicGuideModule],
  controllers: [AnalyticsController, ExhibitVisitsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
