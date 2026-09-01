import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeValue } from './error-codes';

export interface AppErrorBody {
  statusCode: number;
  code: ErrorCodeValue;
  message: string;
  details?: unknown;
}

/**
 * Base class for every domain error thrown by the API. Carries a stable
 * `code` alongside the HTTP status so clients can render the right UI state
 * (for example "no exhibit is currently scheduled in this zone").
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCodeValue,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ statusCode: status, code, message, details } satisfies AppErrorBody, status);
  }
}

export class ZoneNotFoundException extends AppException {
  constructor(zoneRef: string) {
    super(ErrorCode.ZONE_NOT_FOUND, `Zone "${zoneRef}" was not found.`, HttpStatus.NOT_FOUND);
  }
}

export class BeaconNotFoundException extends AppException {
  constructor(identifier: string) {
    super(
      ErrorCode.BEACON_NOT_FOUND,
      `Beacon "${identifier}" is not registered in this museum.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class BeaconDisabledException extends AppException {
  constructor(identifier: string) {
    super(
      ErrorCode.BEACON_DISABLED,
      `Beacon "${identifier}" is currently disabled.`,
      HttpStatus.GONE,
    );
  }
}

/**
 * The host could not scan for beacons: not a Mac, the helper is not built, the
 * radio is off, or macOS withheld Bluetooth access. Never a 500 - the CMS shows
 * the message and the operator falls back to typing the identity in.
 */
export class BleScanUnavailableException extends AppException {
  constructor(message: string) {
    super(ErrorCode.BLE_SCAN_UNAVAILABLE, message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * A beacon must carry an identity the phone can actually read from the air.
 * Eddystone UID needs namespace + instance; iBeacon needs uuid + major + minor.
 */
export class BeaconIdentityInvalidException extends AppException {
  constructor(message: string) {
    super(ErrorCode.BEACON_IDENTITY_INVALID, message, HttpStatus.BAD_REQUEST);
  }
}

export class NoActiveExhibitException extends AppException {
  constructor(zoneCode: string, at: Date) {
    super(
      ErrorCode.NO_ACTIVE_EXHIBIT,
      `No published exhibit is scheduled in zone "${zoneCode}" at ${at.toISOString()}.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ExhibitNotFoundException extends AppException {
  constructor(ref: string) {
    super(ErrorCode.EXHIBIT_NOT_FOUND, `Exhibit "${ref}" was not found.`, HttpStatus.NOT_FOUND);
  }
}

export class ExhibitNotPublishedException extends AppException {
  constructor(ref: string) {
    super(
      ErrorCode.EXHIBIT_NOT_PUBLISHED,
      `Exhibit "${ref}" is not published.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ScheduleOverlapException extends AppException {
  constructor(details: unknown) {
    super(
      ErrorCode.SCHEDULE_OVERLAP,
      'This zone already contains another exhibit during part of the selected period.',
      HttpStatus.CONFLICT,
      details,
    );
  }
}

export class InvalidDateRangeException extends AppException {
  constructor(message = 'The end date must be after the start date.') {
    super(ErrorCode.INVALID_DATE_RANGE, message, HttpStatus.BAD_REQUEST);
  }
}

export class ResourceInUseException extends AppException {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.RESOURCE_IN_USE, message, HttpStatus.CONFLICT, details);
  }
}
