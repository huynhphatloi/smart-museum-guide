// ---------------------------------------------------------------------------
// beacon-scan - raw BLE advertisement capture for the museum CMS.
//
// WHY A NATIVE BINARY
//
// The CMS needs a beacon's advertised identity so staff do not transcribe 20
// hex characters by hand. A browser cannot supply it on macOS: Chrome's Web
// Bluetooth never surfaces service data or manufacturer data there, which is
// exactly where Eddystone and iBeacon identities live. chrome://bluetooth-
// internals shows the same gap - an empty Manufacturer Data column for every
// device. macOS itself has no such limitation, so this binary does the radio
// work that only native code can do.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
// It does not parse Eddystone or iBeacon. It emits raw hex and lets the API
// decode it, because that parser is unit tested and this binary is not. The
// native layer stays as thin as the problem allows.
//
// Build:  ./build.sh
// Run:    ./beacon-scan [seconds]
// Output: JSON on stdout, progress on stderr.
// ---------------------------------------------------------------------------

import CoreBluetooth
import Foundation

struct Capture {
    var serviceData: [String: String]
    var manufacturerData: String?
    var rssi: Int
    var seen: Int
}

func hex(_ data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
}

final class Scanner: NSObject, CBCentralManagerDelegate {
    private var central: CBCentralManager!
    private var captures: [String: Capture] = [:]
    private let duration: Double

    private var started = false

    init(duration: Double) {
        self.duration = duration
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)

        // Watchdog. When macOS withholds Bluetooth from the responsible app,
        // CoreBluetooth does not report .unauthorized - it simply leaves the
        // manager in .unknown forever. Without this the process would hang
        // until its caller gave up, with nothing useful to show the operator.
        DispatchQueue.main.asyncAfter(deadline: .now() + duration + 5.0) {
            guard !self.started else { return }
            self.fail(
                "BLUETOOTH_UNAVAILABLE",
                "Bluetooth never became available. macOS attributes this permission to the app that "
                + "launched the API, so allow Bluetooth for it in System Settings ▸ Privacy & Security "
                + "▸ Bluetooth, then start the API again from that same app."
            )
        }
    }

    func centralManagerDidUpdateState(_ manager: CBCentralManager) {
        switch manager.state {
        case .poweredOn:
            started = true
            FileHandle.standardError.write("scanning \(duration)s\n".data(using: .utf8)!)
            // Duplicates are the point: a beacon only ever re-advertises.
            manager.scanForPeripherals(
                withServices: nil,
                options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
            )
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                manager.stopScan()
                self.emit()
                exit(0)
            }
        case .unauthorized:
            fail("BLUETOOTH_UNAUTHORIZED",
                 "Bluetooth access was denied. Allow it for the app that launched this "
                 + "(Terminal, or whatever starts the API) in System Settings ▸ Privacy & Security ▸ Bluetooth.")
        case .poweredOff:
            fail("BLUETOOTH_OFF", "Bluetooth is turned off.")
        case .unsupported:
            fail("BLUETOOTH_UNSUPPORTED", "This Mac has no Bluetooth Low Energy radio.")
        default:
            break
        }
    }

    func centralManager(
        _ manager: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let rssi = RSSI.intValue
        // CoreBluetooth reports 127 when RSSI is unavailable.
        guard rssi != 127 else { return }

        var services: [String: String] = [:]
        if let raw = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] {
            for (uuid, payload) in raw {
                services[uuid.uuidString.lowercased()] = hex(payload)
            }
        }

        let manufacturer = (advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data)
            .map(hex)

        // Nothing identifying in this frame - a phone, a mouse, a speaker.
        if services.isEmpty && manufacturer == nil { return }

        // Key on the payload itself: the same beacon re-advertising collapses
        // into one row, and the device id (a per-host UUID on macOS) is never
        // used as identity - the same rule the mobile app follows.
        let key = services.sorted { $0.key < $1.key }.map { "\($0):\($1)" }.joined(separator: "|")
            + "#" + (manufacturer ?? "")

        if let existing = captures[key] {
            captures[key] = Capture(serviceData: services, manufacturerData: manufacturer,
                                    rssi: max(existing.rssi, rssi), seen: existing.seen + 1)
        } else {
            captures[key] = Capture(serviceData: services, manufacturerData: manufacturer,
                                    rssi: rssi, seen: 1)
        }
    }

    private func emit() {
        let rows: [[String: Any]] = captures.values
            .sorted { $0.rssi > $1.rssi }
            .map { capture in
                var row: [String: Any] = [
                    "serviceData": capture.serviceData,
                    "rssi": capture.rssi,
                    "seen": capture.seen,
                ]
                if let manufacturer = capture.manufacturerData {
                    row["manufacturerData"] = manufacturer
                }
                return row
            }

        write(["ok": true, "advertisements": rows])
        }

    private func fail(_ code: String, _ message: String) {
        write(["ok": false, "code": code, "message": message])
        exit(2)
    }

    private func write(_ payload: [String: Any]) {
        let data = try! JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write("\n".data(using: .utf8)!)
    }
}

let seconds = CommandLine.arguments.count > 1 ? (Double(CommandLine.arguments[1]) ?? 6.0) : 6.0
_ = Scanner(duration: min(max(seconds, 1.0), 30.0))
RunLoop.main.run()
