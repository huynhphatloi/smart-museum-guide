import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { ScheduleConflictValidator } from './schedule-conflict.validator';

@Module({
  providers: [AssignmentsService, ScheduleConflictValidator],
  exports: [AssignmentsService, ScheduleConflictValidator],
})
export class AssignmentsModule {}
