import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { access, constants } from 'fs/promises';
import { join } from 'path';
import { platform } from 'os';
import { promisify } from 'util';
import { BleScanUnavailableException } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { RawAdvertisement, ScannedBeacon, scannedBeaconsFrom } from './advertisement.parser';

const run = promisify(execFile);

/** Where `tools/build.sh` puts the native helper. */
const SCANNER_PATH = join(process.cwd(), 'tools', 'beacon-scan');

const BUILD_HINT = 'Build it once with: npm run scanner:build';

/**
 * macOS attributes Bluetooth permission to the app that launched the process
 * tree, not to the helper binary, so this is the instruction that actually
 * resolves it.
 */
const PERMISSION_HINT =
  'macOS is withholding Bluetooth from the API. It grants that permission to the app that ' +
  'launched the API - usually Terminal - so allow Bluetooth for it in System Settings > ' +
  'Privacy & Security > Bluetooth, then start the API again from that same app.';

interface ScannerOutput {
  ok: boolean;
  code?: string;
  message?: string;
  advertisements?: RawAdvertisement[];
}

/**
 * Scans for nearby beacons so the CMS can fill in a beacon's identity instead
 * of asking staff to transcribe 20 hex characters.
 *
 * The scan runs on the machine hosting the API, because that is where the
 * radio is. In this project the API runs on the same laptop as the CMS, which
 * is the setup the museum uses while installing hardware; a remotely hosted API
 * cannot hear beacons in the building and reports the feature as unavailable.
 *
 * Decoding is delegated to {@link scannedBeaconsFrom} - the native helper only
 * captures raw advertisements.
 */
@Injectable()
export class BeaconScanService {
  private readonly logger = new Logger(BeaconScanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async scan(seconds = 6): Promise<{ beacons: ScannedBeacon[]; scannedForMs: number }> {
    const duration = Math.min(Math.max(seconds, 1), 20);

    if (platform() !== 'darwin') {
      throw new BleScanUnavailableException(
        'Scanning is only implemented for a macOS host. Enter the beacon identity by hand.',
      );
    }

    try {
      await access(SCANNER_PATH, constants.X_OK);
    } catch {
      throw new BleScanUnavailableException(`The beacon scanner is not built. ${BUILD_HINT}`);
    }

    let stdout: string;
    try {
      // Allow the helper its full scan window plus room to start and print.
      ({ stdout } = await run(SCANNER_PATH, [String(duration)], {
        timeout: (duration + 10) * 1000,
        maxBuffer: 4 * 1024 * 1024,
      }));
    } catch (error) {
      throw this.explain(error);
    }

    const output = this.parseOutput(stdout);
    const beacons = scannedBeaconsFrom(output.advertisements ?? []);

    return { beacons: await this.markRegistered(beacons), scannedForMs: duration * 1000 };
  }

  // -------------------------------------------------------------------------

  private parseOutput(stdout: string): ScannerOutput {
    const line = stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line) as ScannerOutput;
    } catch {
      this.logger.error(`Unreadable scanner output: ${stdout.slice(0, 200)}`);
      throw new BleScanUnavailableException('The beacon scanner returned unreadable output.');
    }
  }

  /**
   * The helper reports refusals as JSON on stdout and exits non-zero, so a
   * failed run still carries a message worth showing. A crash with no JSON is
   * almost always macOS killing the process over Bluetooth permission - that
   * is attributed to whichever app launched the API, not to the helper itself.
   */
  private explain(error: unknown): BleScanUnavailableException {
    const stdout = String((error as { stdout?: string }).stdout ?? '');
    const signal = (error as { signal?: string }).signal;

    // The helper reports refusals it can detect as JSON, and still exits non-zero.
    try {
      const parsed = JSON.parse(stdout.trim().split('\n').pop() ?? '') as ScannerOutput;
      if (parsed.message) return new BleScanUnavailableException(parsed.message);
    } catch {
      // No JSON to go on - classify by how the process died instead.
    }

    // macOS aborts a process that touches the radio without permission, before
    // any of the helper's own error handling can run. That permission is
    // attributed to the app that launched the API, not to the helper.
    if (signal === 'SIGABRT') return new BleScanUnavailableException(PERMISSION_HINT);

    if ((error as { killed?: boolean }).killed) {
      return new BleScanUnavailableException(
        'The beacon scan did not finish in time. If this repeats, Bluetooth is probably not ' +
          `available to the API process. ${PERMISSION_HINT}`,
      );
    }

    this.logger.error(`beacon-scan failed: ${String(error)}`);
    return new BleScanUnavailableException(`The beacon scanner could not run. ${PERMISSION_HINT}`);
  }

  /** Flags beacons the CMS already knows, so staff do not register one twice. */
  private async markRegistered(beacons: ScannedBeacon[]): Promise<ScannedBeacon[]> {
    if (beacons.length === 0) return beacons;

    const known = await this.prisma.beacon.findMany({
      select: {
        identifier: true,
        namespaceId: true,
        instanceId: true,
        uuid: true,
        major: true,
        minor: true,
        zone: { select: { code: true } },
      },
    });

    const index = new Map<string, { identifier: string; zoneCode: string }>();
    for (const beacon of known) {
      const entry = { identifier: beacon.identifier, zoneCode: beacon.zone.code };
      if (beacon.namespaceId && beacon.instanceId) {
        index.set(`${beacon.namespaceId.toLowerCase()}:${beacon.instanceId.toLowerCase()}`, entry);
      }
      if (beacon.uuid && beacon.major !== null && beacon.minor !== null) {
        index.set(`${beacon.uuid.toLowerCase()}:${beacon.major}:${beacon.minor}`, entry);
      }
    }

    return beacons.map((beacon) => {
      const match = index.get(beacon.beaconId.toLowerCase());
      return match
        ? { ...beacon, registeredAs: match.identifier, registeredZone: match.zoneCode }
        : beacon;
    });
  }
}
