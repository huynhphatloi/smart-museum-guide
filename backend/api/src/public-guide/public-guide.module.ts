import { Module } from '@nestjs/common';
import { ExhibitsModule } from '../exhibits/exhibits.module';
import { LanguagesModule } from '../languages/languages.module';
import { PublicGuideController } from './public-guide.controller';
import { PublicGuideService } from './public-guide.service';

@Module({
  imports: [ExhibitsModule, LanguagesModule],
  controllers: [PublicGuideController],
  providers: [PublicGuideService],
})
export class PublicGuideModule {}
