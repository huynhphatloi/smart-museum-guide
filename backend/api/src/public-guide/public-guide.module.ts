import { Module } from '@nestjs/common';
import { ExhibitsModule } from '../exhibits/exhibits.module';
import { PublicGuideController } from './public-guide.controller';
import { PublicGuideService } from './public-guide.service';

@Module({
  imports: [ExhibitsModule],
  controllers: [PublicGuideController],
  providers: [PublicGuideService],
})
export class PublicGuideModule {}
