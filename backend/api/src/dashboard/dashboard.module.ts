import { Module } from '@nestjs/common';
import { ExhibitsModule } from '../exhibits/exhibits.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ExhibitsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
