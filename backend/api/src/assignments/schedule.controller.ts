import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignmentsService } from './assignments.service';

export class ScheduleExhibitDto {
  @IsUUID()
  exhibitId!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/i, { message: 'activeFrom must include a timezone.' })
  activeFrom!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/i, { message: 'activeTo must include a timezone.' })
  activeTo?: string | null;
}

@Controller('admin/zones/:zoneId/schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  list(@Param('zoneId') zoneId: string) {
    return this.assignments.scheduleForZone(zoneId);
  }

  @Post()
  create(@Param('zoneId') zoneId: string, @Body() dto: ScheduleExhibitDto) {
    return this.assignments.saveScheduledExhibit(zoneId, dto);
  }

  @Put(':id')
  update(
    @Param('zoneId') zoneId: string,
    @Param('id') id: string,
    @Body() dto: ScheduleExhibitDto,
  ) {
    return this.assignments.saveScheduledExhibit(zoneId, dto, id);
  }

  @Delete(':id')
  cancel(@Param('zoneId') zoneId: string, @Param('id') id: string) {
    return this.assignments.cancelScheduledExhibit(zoneId, id);
  }
}
