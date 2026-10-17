import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsQueryDto, RecordVisitDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@Controller('public/exhibit-visits')
export class ExhibitVisitsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post()
  @HttpCode(200)
  record(@Body() body: RecordVisitDto) {
    return this.analytics.record(body);
  }
}

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  summary(@Query() query: AnalyticsQueryDto) {
    return this.analytics.summary(query);
  }
}
