/**
 * Copy for the map, notifications and the staff calibration tool. Vietnamese
 * and English; every other language falls back to English, like the rest of
 * the app's interface text.
 */
const en = {
  mapTab: 'Map',
  mapEyebrow: 'Indoor positioning',
  comingSoon: 'Coming soon',
  comingSoonTitle: 'Museum map',
  comingSoonBody:
    'A map showing where you are in the gallery is being tested on site. Until it is ready, the guide still finds the nearest exhibit from museum beacons.',
  comingSoonQr: 'You can also scan the QR code next to any exhibit.',
  scanQr: 'Scan a QR code',
  mapTitle: 'Where you are',
  statusIdle: 'Start the guide to see where you are.',
  statusNoMap: 'No floor plan is available yet.',
  statusNoRadioMap: 'Move closer to a museum beacon to see your nearby zone.',
  statusNearbyZone: 'Nearby zone · approximate location',
  nearbyZoneHelp:
    'The marker shows the nearby beacon, or the zone centre. No recordings are needed. It does not show your exact position.',
  statusWeak: 'Weak signal - at least {n} beacons are needed.',
  statusOk: 'About ±{m} m',
  zoneHere: 'Current zone: {zone}',
  noZone: 'Not in any exhibit zone',
  explain: 'Explain the algorithm',
  explainHelp:
    'WKNN: the live RSSI vector is compared with fingerprints recorded at reference points. The k closest points are averaged, each weighted by 1 / distance.',
  liveVector: 'Live RSSI vector',
  neighbours: 'k nearest reference points',
  weight: 'weight',
  simulatorHint: 'Simulation: tap or drag on the map to move the virtual visitor.',
  beaconsHeard: '{n}/{total} beacons heard',
  radioMap: 'Radio map: {points} points, {source}',
  sourceModel: 'recorded on this phone model',
  sourcePlatform: 'recorded on this platform',
  sourceAny: 'recorded on other phones',
  startGuide: 'Start the guide',

  notificationTitle: 'You are near: {zone}',
  notificationBody: 'Tap to listen to the guide.',
  notificationChannel: 'Exhibit zones',

  calibrationEntry: 'Positioning calibration (staff)',
  calibrationEntryHelp: 'Record fingerprints so the map can position visitors in this room.',
  calibration: 'Calibration',
  staffOnly: 'Museum staff only',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  signOut: 'Sign out',
  loginFailed: 'Sign-in failed.',
  device: 'This phone: {model} ({platform})',
  choosePoint: 'Tap a point on the map, then record.',
  selectedPoint: 'Point {label} · {x}, {y} m',
  pointCoverage: '{n} recording(s) on this phone',
  orientation: 'Phone facing',
  orientationNone: 'Not noted',
  duration: 'Length',
  startCapture: 'Record',
  capturing: 'Recording… {s}s',
  heardNow: '{n} beacon(s) heard',
  fewBeacons: 'Only {n} beacon(s) heard - 3 is the minimum for good results.',
  emptyCapture: 'No beacon was heard. Check the beacons and try again.',
  result: 'Fingerprint',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved - the radio map is updated.',
  discard: 'Discard',
  saveFailed: 'Could not save: {message}',
  suggestions: 'Suggested zone reach (minRssi)',
  suggestionsHelp:
    'Fitted from this phone’s radio map so a zone triggers within {m} m of its beacon.',
  pathLoss: 'P0 {p0} dBm, n = {n}',
  apply: 'Apply',
  applied: 'Applied - the zone detector uses it now.',
  testPoint: 'test',
  notEnoughData: 'Record at least 3 points first.',
  suggestNeedsOwnData:
    'Record a few points on this kind of phone first - other phones read RSSI differently.',
  progress: '{done}/{total} reference points recorded on this phone',
  back: 'Back',
} as const;

type Key = keyof typeof en;

const vi: Record<Key, string> = {
  mapTab: 'Bản đồ',
  mapEyebrow: 'Định vị trong nhà',
  comingSoon: 'Sắp ra mắt',
  comingSoonTitle: 'Bản đồ bảo tàng',
  comingSoonBody:
    'Bản đồ hiển thị vị trí của bạn trong phòng trưng bày đang được thử nghiệm tại chỗ. Trong lúc chờ, ứng dụng vẫn tự nhận biết hiện vật gần bạn nhờ beacon của bảo tàng.',
  comingSoonQr: 'Bạn cũng có thể quét mã QR đặt cạnh mỗi hiện vật.',
  scanQr: 'Quét mã QR',
  mapTitle: 'Bạn đang ở đâu',
  statusIdle: 'Bật hướng dẫn tự động để thấy vị trí của bạn.',
  statusNoMap: 'Bảo tàng chưa có bản đồ.',
  statusNoRadioMap: 'Đi gần một beacon để thấy khu vực bạn đang ở gần.',
  statusNearbyZone: 'Khu vực ở gần · vị trí tương đối',
  nearbyZoneHelp:
    'Dấu trên bản đồ là beacon ở gần hoặc tâm khu vực. Không cần record; dấu này chưa phải vị trí chính xác của bạn.',
  statusWeak: 'Tín hiệu yếu - cần nghe được ít nhất {n} beacon.',
  statusOk: 'Sai số khoảng ±{m} m',
  zoneHere: 'Khu vực hiện tại: {zone}',
  noZone: 'Chưa ở khu trưng bày nào',
  explain: 'Giải thích thuật toán',
  explainHelp:
    'WKNN: so vector RSSI hiện tại với các fingerprint đã thu tại điểm tham chiếu, lấy k điểm gần nhất rồi lấy trung bình có trọng số 1 / khoảng cách.',
  liveVector: 'Vector RSSI hiện tại',
  neighbours: 'k điểm tham chiếu gần nhất',
  weight: 'trọng số',
  simulatorHint: 'Giả lập: chạm hoặc kéo trên bản đồ để di chuyển khách ảo.',
  beaconsHeard: 'Nghe được {n}/{total} beacon',
  radioMap: 'Radio map: {points} điểm, {source}',
  sourceModel: 'thu bằng cùng dòng máy',
  sourcePlatform: 'thu bằng cùng hệ điều hành',
  sourceAny: 'thu bằng máy khác',
  startGuide: 'Bật hướng dẫn',

  notificationTitle: 'Bạn đang ở gần: {zone}',
  notificationBody: 'Chạm để nghe thuyết minh.',
  notificationChannel: 'Khu trưng bày',

  calibrationEntry: 'Calibration định vị (nhân viên)',
  calibrationEntryHelp: 'Thu fingerprint để bản đồ định vị được khách trong phòng này.',
  calibration: 'Calibration',
  staffOnly: 'Dành cho nhân viên bảo tàng',
  email: 'Email',
  password: 'Mật khẩu',
  signIn: 'Đăng nhập',
  signingIn: 'Đang đăng nhập…',
  signOut: 'Đăng xuất',
  loginFailed: 'Đăng nhập thất bại.',
  device: 'Máy này: {model} ({platform})',
  choosePoint: 'Chạm vào một điểm trên bản đồ rồi bấm thu.',
  selectedPoint: 'Điểm {label} · {x}, {y} m',
  pointCoverage: '{n} lần thu trên máy này',
  orientation: 'Hướng cầm máy',
  orientationNone: 'Không ghi',
  duration: 'Thời gian',
  startCapture: 'Thu',
  capturing: 'Đang thu… {s}s',
  heardNow: 'Đang nghe {n} beacon',
  fewBeacons: 'Chỉ nghe {n} beacon - nên từ 3 trở lên.',
  emptyCapture: 'Không nghe thấy beacon nào. Kiểm tra beacon rồi thử lại.',
  result: 'Fingerprint',
  save: 'Lưu',
  saving: 'Đang lưu…',
  saved: 'Đã lưu - radio map đã cập nhật.',
  discard: 'Bỏ',
  saveFailed: 'Không lưu được: {message}',
  suggestions: 'Gợi ý phạm vi zone (minRssi)',
  suggestionsHelp: 'Ước lượng từ radio map của máy này để zone kích hoạt trong {m} m quanh beacon.',
  pathLoss: 'P0 {p0} dBm, n = {n}',
  apply: 'Áp dụng',
  applied: 'Đã áp dụng - bộ phát hiện zone dùng ngay giá trị mới.',
  testPoint: 'test',
  notEnoughData: 'Hãy thu ít nhất 3 điểm trước.',
  suggestNeedsOwnData: 'Hãy thu vài điểm bằng loại máy này trước - máy khác đo RSSI lệch nhau.',
  progress: 'Đã thu {done}/{total} điểm tham chiếu trên máy này',
  back: 'Quay lại',
};

const DICTIONARY: Record<string, Record<Key, string>> = { en, vi };

export type PositioningKey = Key;

export function pt(language: string, key: Key, vars: Record<string, string | number> = {}): string {
  const base = language.toLowerCase().split('-')[0];
  const template = DICTIONARY[language]?.[key] ?? DICTIONARY[base]?.[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
