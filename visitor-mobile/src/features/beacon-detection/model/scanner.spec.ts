import { RegisteredBeacon } from './beacon-registry';
import { BeaconScanner, DEFAULT_SCANNER_CONFIG } from './scanner';
import { SimulatedBleSignalSource } from './sources/simulated-ble-source';
import { BeaconSignal } from './types';

const beacon = (minRssi: number | null): RegisteredBeacon => ({
  identifier: 'BEACON_A01',
  name: 'A01',
  protocol: 'EDDYSTONE_UID',
  namespaceId: 'a1b2c3d4e5f607182930',
  instanceId: '000000000001',
  uuid: null,
  major: null,
  minor: null,
  txPower: -8,
  advertisingIntervalMs: 500,
  minRssi,
  zoneCode: 'ZONE_A01',
  zoneName: 'Ancient Sculpture',
});

/** Drives a scanner on a virtual clock with a steady -80 dBm beacon. */
function run(scanner: BeaconScanner, source: SimulatedBleSignalSource, clock: { now: number }) {
  for (let t = 0; t <= 6000; t += 250) {
    clock.now = t;
    source.emitOnce();
    if (t % 500 === 0) scanner.tick(t);
  }
}

function setup() {
  const clock = { now: 0 };
  const source = new SimulatedBleSignalSource(
    [
      {
        identifier: 'BEACON_A01',
        rssi: -80,
        enabled: true,
        protocol: 'eddystone_uid',
        beaconId: 'a1b2c3d4e5f607182930:000000000001',
      },
    ],
    { jitterDb: 0, now: () => clock.now },
  );
  const scanner = new BeaconScanner(source, [beacon(null)], DEFAULT_SCANNER_CONFIG);
  return { clock, source, scanner };
}

describe('BeaconScanner', () => {
  it('confirms a zone with the default reach', async () => {
    const { clock, source, scanner } = setup();
    await scanner.start();
    await source.stop(); // the virtual clock drives emission instead of a timer
    const zones: string[] = [];
    scanner.onZoneConfirmed((event) => zones.push(event.zoneCode));

    run(scanner, source, clock);
    await scanner.stop();

    expect(zones).toEqual(['ZONE_A01']);
  });

  it('applies a reloaded registry without a restart', async () => {
    const { clock, source, scanner } = setup();
    await scanner.start();
    await source.stop();
    const zones: string[] = [];
    scanner.onZoneConfirmed((event) => zones.push(event.zoneCode));

    // Staff tightened the reach to -70 dBm: -80 is now "another room".
    scanner.setRegistry([beacon(-70)]);
    run(scanner, source, clock);
    await scanner.stop();

    expect(zones).toEqual([]);
  });

  it('fans raw readings out to signal listeners', async () => {
    const { clock, source, scanner } = setup();
    const seen: BeaconSignal[] = [];
    scanner.onSignal((signal) => seen.push(signal));
    await scanner.start();
    await source.stop();

    clock.now = 1234;
    source.emitOnce();
    await scanner.stop();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ identifier: 'BEACON_A01', rssi: -80, timestamp: 1234 });
  });
});
