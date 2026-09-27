import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateFloorPlanDto,
  CreateSurveyCaptureDto,
  CreateSurveyPointDto,
  GenerateGridDto,
  UpdateFloorPlanDto,
  UpdateSurveyPointDto,
} from './dto/positioning.dto';
import { PositioningService } from './positioning.service';

/**
 * Staff side of indoor positioning: room plans, the survey points staff stand
 * on while calibrating, and the recordings made there. The calibration mode of
 * the mobile app signs in as staff and posts captures here.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class PositioningController {
  constructor(private readonly positioning: PositioningService) {}

  @Get('floor-plans')
  listFloorPlans() {
    return this.positioning.listFloorPlans();
  }

  @Get('floor-plans/:id')
  getFloorPlan(@Param('id') id: string) {
    return this.positioning.getFloorPlan(id);
  }

  @Post('floor-plans')
  createFloorPlan(@Body() dto: CreateFloorPlanDto) {
    return this.positioning.createFloorPlan(dto);
  }

  @Patch('floor-plans/:id')
  updateFloorPlan(@Param('id') id: string, @Body() dto: UpdateFloorPlanDto) {
    return this.positioning.updateFloorPlan(id, dto);
  }

  @Delete('floor-plans/:id')
  removeFloorPlan(@Param('id') id: string) {
    return this.positioning.removeFloorPlan(id);
  }

  /** Raw captures included - this is what the evaluation script reads. */
  @Get('floor-plans/:id/dataset')
  dataset(@Param('id') id: string) {
    return this.positioning.exportDataset(id);
  }

  @Post('floor-plans/:id/survey-points')
  createSurveyPoint(@Param('id') id: string, @Body() dto: CreateSurveyPointDto) {
    return this.positioning.createSurveyPoint(id, dto);
  }

  @Post('floor-plans/:id/survey-points/grid')
  generateGrid(@Param('id') id: string, @Body() dto: GenerateGridDto) {
    return this.positioning.generateGrid(id, dto);
  }

  @Patch('survey-points/:id')
  updateSurveyPoint(@Param('id') id: string, @Body() dto: UpdateSurveyPointDto) {
    return this.positioning.updateSurveyPoint(id, dto);
  }

  @Delete('survey-points/:id')
  removeSurveyPoint(@Param('id') id: string) {
    return this.positioning.removeSurveyPoint(id);
  }

  @Post('survey-points/:id/captures')
  createCapture(@Param('id') id: string, @Body() dto: CreateSurveyCaptureDto) {
    return this.positioning.createCapture(id, dto);
  }

  @Delete('survey-captures/:id')
  removeCapture(@Param('id') id: string) {
    return this.positioning.removeCapture(id);
  }
}
