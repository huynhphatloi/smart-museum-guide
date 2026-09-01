import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateZoneDto, QueryZonesDto, SetCurrentExhibitDto, UpdateZoneDto } from './dto/zone.dto';
import { ZonesService } from './zones.service';

@Controller('admin/zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  findAll(@Query() query: QueryZonesDto) {
    return this.zones.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('at') at?: string) {
    return this.zones.findOne(id, at ? new Date(at) : new Date());
  }

  @Get(':id/qr')
  getQr(@Param('id') id: string) {
    return this.zones.getQr(id);
  }

  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.zones.create(dto);
  }

  /** Set the exhibit currently on display in this zone. */
  @Put(':id/current-exhibit')
  setCurrentExhibit(@Param('id') id: string, @Body() dto: SetCurrentExhibitDto) {
    return this.zones.setCurrentExhibit(id, dto.exhibitId);
  }

  /** Empty the zone: visitors get the "nothing on display" state. */
  @Delete(':id/current-exhibit')
  clearCurrentExhibit(@Param('id') id: string) {
    return this.zones.setCurrentExhibit(id, null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zones.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.zones.remove(id);
  }
}
