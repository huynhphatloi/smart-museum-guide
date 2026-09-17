import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestLocalizationDto } from './dto/localization.dto';
import { LocalizationService } from './localization.service';

/** CMS side: queue translation + narration for an exhibit and watch its progress. */
@Controller('admin/exhibits/:id/localization')
@UseGuards(JwtAuthGuard)
export class LocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Post()
  request(@Param('id') id: string, @Body() dto: RequestLocalizationDto) {
    return this.localization.request(id, dto);
  }

  @Get()
  status(@Param('id') id: string) {
    return this.localization.status(id);
  }
}
