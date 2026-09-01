import { Module } from '@nestjs/common';
import { BeaconScanService } from './beacon-scan.service';
import { BeaconsController } from './beacons.controller';
import { BeaconsService } from './beacons.service';

@Module({
  controllers: [BeaconsController],
  providers: [BeaconsService, BeaconScanService],
  exports: [BeaconsService],
})
export class BeaconsModule {}
