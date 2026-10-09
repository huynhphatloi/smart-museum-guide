import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { ScheduleConflictValidator } from './schedule-conflict.validator';
import { ScheduleController } from './schedule.controller';

@Module({
  controllers: [ScheduleController],
  providers: [AssignmentsService, ScheduleConflictValidator],
  exports: [AssignmentsService, ScheduleConflictValidator],
})
export class AssignmentsModule {}
