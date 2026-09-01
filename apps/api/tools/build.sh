#!/usr/bin/env bash
# Builds the native BLE scanner used by GET /api/admin/beacons/scan.
#
# macOS only. The embedded Info.plist is required: CoreBluetooth aborts any
# process that touches the radio without NSBluetoothAlwaysUsageDescription,
# and the ad-hoc signature is what makes the system honour that plist.
set -euo pipefail
cd "$(dirname "$0")"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "beacon-scan is macOS only - skipping build." >&2
  exit 0
fi

swiftc -O beacon-scan.swift -o beacon-scan \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker Info.plist
codesign --force --sign - beacon-scan

echo "built $(pwd)/beacon-scan"
