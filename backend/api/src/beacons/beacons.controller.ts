import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BeaconScanService } from './beacon-scan.service';
import { BeaconsService } from './beacons.service';
import { CreateBeaconDto, QueryBeaconsDto, UpdateBeaconDto } from './dto/beacon.dto';

@Controller('admin/beacons')
@UseGuards(JwtAuthGuard)
export class BeaconsController {
  constructor(
    private readonly beacons: BeaconsService,
    private readonly scanner: BeaconScanService,
  ) {}

  @Get()
  findAll(@Query() query: QueryBeaconsDto) {
    return this.beacons.findAll(query);
  }

  /**
   * Scans for beacons in range of the API host, so the CMS can fill in an
   * identity instead of having it transcribed. Declared before `:id` so the
   * literal path is not swallowed by the parameter route.
   */
  @Get('scan')
  scan(@Query('seconds') seconds?: string) {
    return this.scanner.scan(seconds ? Number(seconds) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.beacons.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBeaconDto) {
    return this.beacons.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBeaconDto) {
    return this.beacons.update(id, dto);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    return this.beacons.setEnabled(id, true);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    return this.beacons.setEnabled(id, false);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.beacons.remove(id);
  }
}
