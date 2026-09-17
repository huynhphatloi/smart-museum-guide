'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from './utils';

const STORAGE_KEY = 'museum.admin.language';

const en = {
  museumGuide: 'Museum Guide',
  staffConsole: 'Staff console',
  navOverview: 'Overview',
  navZones: 'Zones',
  navBeacons: 'Beacon setup',
  navExhibits: 'Exhibits',
  signOut: 'Sign out',
  checkingSession: 'Checking your session…',
  language: 'Language',

  loginTitle: 'Museum Guide CMS',
  loginDescription: 'Sign in with your museum staff account.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in...',
  seedHint: 'Development seed account: admin@museum.local',
  welcomeBack: 'Welcome back, {name}',
  loginFailed: 'Login failed.',

  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  creating: 'Creating...',
  edit: 'Edit',
  delete: 'Delete',
  code: 'Code',
  name: 'Name',
  floor: 'Floor',
  title: 'Title',
  description: 'Description',
  status: 'Status',
  enabled: 'enabled',
  disabled: 'disabled',

  dashboardTitle: 'Dashboard',
  dashboardGenerated: 'What every zone is showing right now — generated {time}.',
  statZones: 'Zones',
  statBeacons: 'Beacons',
  statExhibits: 'Exhibits',
  statSchedule: 'Schedule entries',
  beaconsEnabled: '{enabled}/{total} enabled',
  exhibitsPublished: '{published}/{total} published',
  dashboardLoadError: 'Could not load the dashboard. Is the API running?',
  zonesEmptyWarning:
    'No published exhibit is currently scheduled in {zones}. Visitors scanning those beacons or QR codes will see an empty state.',
  allZonesOk: 'Every zone currently resolves to a published exhibit.',
  liveZoneStatus: 'Live zone status',
  liveZoneHint:
    'What each beacon and QR code resolves to right now, using the same rule the visitor apps use.',
  colZone: 'Zone',
  colBeacons: 'Beacons',
  colCurrentExhibit: 'Current exhibit',
  colOnDisplaySince: 'On display since',
  nothingScheduled: 'Nothing scheduled',

  zonesTitle: 'Zones',
  zonesSubtitle:
    'Physical areas. Beacons and QR codes point at zones, never directly at an exhibit.',
  newZone: 'New zone',
  searchZones: 'Search by code or name',
  allZones: 'All zones',
  zoneCount: '{count} zone(s)',
  noZones: 'No zones yet',
  noZonesHint: 'Create your first zone to start mapping beacons.',
  colSchedule: 'Schedule entries',
  noBeacon: 'No beacon',
  newZoneTitle: 'New zone',
  newZoneHint: 'The code is permanent — it is printed inside the QR code (e.g. ZONE_A01).',
  createZone: 'Create zone',
  zoneCreated: 'Zone {code} created.',
  zoneCreateError: 'Could not create the zone.',
  zoneUpdated: 'Zone details saved.',
  zoneUpdateError: 'Could not save the zone.',
  zoneDeleted: 'Zone deleted.',
  zoneDeleteError: 'Could not delete the zone.',
  deleteZone: 'Delete zone',
  deleteZoneConfirm: 'Delete {code}? Its display history is removed too.',
  allZonesLink: 'All zones',
  zoneNotFound: 'Zone not found.',
  whatIsInRoom: 'What is in this room',
  whatIsInRoomHint: 'Exactly what the BLE and QR endpoints resolve for this zone right now.',
  onDisplaySince: 'On display since {date}',
  assignedNotPublished: 'Assigned, but not published — visitors will see “nothing on display”.',
  openExhibit: 'Open exhibit',
  nothingOnDisplay: 'Nothing on display here',
  nothingOnDisplayHint: 'Pick an exhibit below so visitors in this zone receive content.',
  changeExhibit: 'Change the exhibit in this room',
  selectExhibit: 'Select an exhibit…',
  setAsCurrent: 'Set as current',
  emptyZone: 'Empty zone',
  emptyZoneConfirm: 'Empty this zone? Visitors will see an empty state.',
  beaconQrUntouched: 'The beacon and the printed QR code are untouched — only the content changes.',
  previouslyInRoom: 'Previously in this room',
  noEarlierExhibit: 'No earlier exhibit recorded.',
  beaconsInZone: 'Beacons',
  beaconsInZoneHint: 'Hardware installed in this zone.',
  noBeaconInstalled: 'No beacon installed. Visitors can still reach this zone through its QR code.',
  qrCode: 'QR code',
  qrHint: 'Print once — it never changes when the exhibit does.',
  downloadPng: 'Download PNG',
  lastChecked: 'Last checked',
  zoneSettings: 'Zone details',
  zoneSettingsHint: 'Name, floor and notes shown to staff. The code cannot change.',
  saveZone: 'Save zone',
  exhibitSet: 'This zone now shows the selected exhibit. BLE and QR follow immediately.',
  exhibitChangeError: 'Could not change the exhibit.',
  zoneEmptied: 'Zone emptied. Visitors will see the “nothing on display” state.',
  zoneEmptyError: 'Could not empty the zone.',

  exhibitsTitle: 'Exhibits',
  exhibitsSubtitle: 'Museum objects, translations and media visitors will see.',
  newExhibit: 'New exhibit',
  allExhibits: 'All exhibits',
  exhibitCount: '{count} exhibit(s)',
  noExhibits: 'No exhibits',
  noExhibitsHint: 'Create an exhibit, write the visitor copy, then publish it.',
  colTitle: 'Title',
  colLanguages: 'Languages',
  colMedia: 'Media',
  colScheduled: 'Scheduled',
  none: 'none',
  identity: 'Identity',
  identityHint: 'Internal label used in this console. Visitors always see a translation.',
  defaultTitle: 'Default title',
  contentVi: 'Vietnamese (visitor-facing)',
  contentEn: 'English (visitor-facing)',
  shortDescription: 'Short description',
  fullDescription: 'Full description',
  createExhibit: 'Create exhibit',
  exhibitCreated: 'Exhibit {code} created.',
  exhibitCreateError: 'Could not create the exhibit.',
  deleteExhibitConfirm: 'Delete {code}?',
  exhibitDeleted: 'Exhibit deleted.',
  exhibitDeleteError: 'Could not delete the exhibit.',
  allExhibitsLink: 'All exhibits',
  exhibitNotFound: 'Exhibit not found.',
  publish: 'Publish',
  archive: 'Archive',
  exhibitNowStatus: 'Exhibit is now {status}.',
  statusChangeError: 'Could not change the status.',
  addTranslationFirst:
    'Add at least one translation before publishing — visitors are always served a translation.',
  translations: 'Translations',
  mediaTab: 'Media',
  placement: 'Placement',
  languages: 'Languages',
  addLanguage: 'Add language',
  newTranslation: 'New translation',
  editingLanguage: 'Editing “{code}”',
  saveOverwriteHint: 'Saving an existing language code overwrites that translation.',
  languageCode: 'Language code',
  narrationAudio: 'Narration audio URL',
  saveTranslation: 'Save translation',
  translationSaved: 'Translation “{code}” saved.',
  translationSaveError: 'Could not save the translation.',
  translationRemoved: 'Translation removed.',
  removeTranslationConfirm: 'Remove the “{code}” translation?',
  gallery: 'Gallery',
  galleryHint: 'Language-neutral images, audio and video.',
  uploadFile: 'Upload file',
  mediaAdded: 'Media added.',
  mediaAddError: 'Could not add the media.',
  mediaRemoved: 'Media removed.',
  uploadFailed: 'Upload failed.',
  noMediaYet: 'No media attached yet.',
  placementTitle: 'Where this exhibit is or was displayed',
  onDisplayOpen: 'On display since {date}',
  notPlacedYet: 'Not placed in any zone yet. Open a zone and set this exhibit as its current one.',
  identitySaved: 'Exhibit identity saved.',
  identitySaveError: 'Could not save the exhibit.',
  newExhibitTitle: 'New exhibit',
  newExhibitHint:
    'Write the visitor-facing post, attach images or video, then pick languages to translate and narrate.',
  requiredForVisitors: 'Shown to visitors in this language.',
  titlePlaceholderVi: 'Tượng Chăm',
  titlePlaceholderEn: 'Cham statue',
  editExhibitHint:
    'Edit this exhibit like a blog post. Saving updates the primary language and queues translation and narration for the selected languages.',
  primaryLanguage: 'Primary language',
  primaryLanguageHint:
    'Write the title and body in this language. Other languages are generated from it.',
  visitorBody: 'Visitor-facing copy',
  visitorBodyHint: 'Title, short summary and the full text visitors will read.',
  attachments: 'Attachments',
  attachmentsHint: 'Images and video shared across every language.',
  languageVariants: 'Language variants',
  languageVariantsHint:
    'The primary language is always narrated. On save, selected languages are sent to the AI service to be translated from the primary copy and narrated, unless they are already up to date.',
  primaryIncluded: 'primary',
  saveExhibit: 'Save',
  savingExhibit: 'Saving…',
  exhibitSaved: 'Exhibit saved.',
  willTranslate: 'will generate',
  alreadyTranslated: 'saved',
  uploadImageVideo: 'Upload image or video',
  pendingUploads: 'Pending',
  codeReadOnly: 'The code cannot change after the exhibit is created.',
  generateAudioHint:
    'After saving, translation and narration progress for every language appears on this page.',
  localizationTitle: 'Translation & narration',
  localizationHint:
    'Each language is translated from the primary copy and narrated by the AI service. This list refreshes on its own while work is in progress.',
  localizationEmpty: 'Nothing generated yet. Pick languages above and save.',
  localizationQueued: 'Sent {count} language(s) to the AI service queue.',
  localizationUpToDate: 'All selected languages are already up to date.',
  localizationRequestError: 'Could not queue translation and narration.',
  aiServiceOnline: 'AI service online',
  aiServiceQueue: '{count} in queue',
  aiServiceOffline: 'AI service offline — requests wait in the queue until it reconnects.',
  aiServiceLastSeen: 'Last seen {time}.',
  aiServiceNotConfigured:
    'AI service is not configured (AI_SERVICE_SECRET on the API). Requests stay queued.',
  statusQueued: 'Waiting',
  statusTranslating: 'Translating…',
  statusSynthesizing: 'Generating audio…',
  statusProcessing: 'Processing…',
  statusCompleted: 'Ready',
  statusFailed: 'Failed',
  statusNoAudio: 'No audio',
  statusOutdated: 'Outdated',
  outdatedHint: 'Generated from an older version of the primary copy.',
  lastAttemptError: 'Last attempt: {error}',
  viewContent: 'View content',
  hideContent: 'Hide content',
  regenerate: 'Regenerate',
  retry: 'Retry',
  generatedWith: 'Models: {models}',
  noTranslationYet: 'The translation appears here when the language is ready.',
  languagesFromAiService: 'Languages the AI service supports ({count}).',
  languagesFromConfig:
    'The AI service has not reported its languages yet, so this is the default list (SUPPORTED_LANGUAGES).',
  languagesLoadError: 'Could not load the language list.',
  languageNotOffered: 'not supported',
  titleRequired: 'A visitor-facing title is required.',
  langVi: 'Vietnamese',
  langEn: 'English',
  langJa: 'Japanese',
  langKo: 'Korean',
  langZh: 'Chinese',
  langFr: 'French',
  langDe: 'German',
  langRu: 'Russian',
  langEs: 'Spanish',

  beaconsEyebrow: 'Museum infrastructure',
  beaconsTitle: 'Beacon settings',
  beaconsSubtitle:
    'Assign each device to a zone and tune its detection reach. These settings are managed by staff and published read-only to the visitor app.',
  newBeacon: 'New beacon',
  registeredBeacons: 'Registered beacons',
  beaconCount: '{count} beacon(s)',
  noBeacons: 'No beacons registered',
  noBeaconsHint: 'Add a beacon and assign it to a zone.',
  colIdentifier: 'Identifier',
  colBroadcast: 'Broadcast identity',
  colRadio: 'Radio',
  colReach: 'Detection reach',
  museumDefault: 'museum default',
  beaconToggled: 'Beacon updated.',
  beaconToggleError: 'Could not update the beacon.',
  deleteBeaconConfirm: 'Delete {id}?',
  beaconDeleted: 'Beacon deleted.',
  beaconDeleteError: 'Could not delete the beacon.',
  disable: 'Disable',
  enable: 'Enable',
  registerBeacon: 'Register a beacon',
  beaconSettingsTitle: 'Beacon settings · {id}',
  beaconFormHint:
    'Museum staff manage the hardware identity, assigned zone and detection reach here. Visitor devices only consume these published values.',
  findNearby: 'Find a nearby beacon',
  pickToFill: 'Pick one to fill in its identity automatically.',
  scan: 'Scan',
  scanning: 'Scanning…',
  scanListening: 'Listening for {seconds} seconds — hold the beacon near this computer.',
  noBeaconsHeard: 'No beacons heard. Check they are powered, and that this machine is in range.',
  beaconsFound: '{count} beacon(s) found',
  scanFailed: 'Could not scan for beacons.',
  identityFilled: 'Identity filled in from the scan.',
  beaconSaved: 'Beacon {id} {action}.',
  beaconUpdatedAction: 'updated',
  beaconRegisteredAction: 'registered',
  beaconSaveError: 'Could not save the beacon.',
  protocolEddystone: 'Eddystone UID (recommended)',
  protocolIbeacon: 'iBeacon',
  protocolOther: 'Other',
  protocolEddystoneHint: 'Read from BLE service data 0xFEAA — works the same on Android and iOS.',
  protocolIbeaconHint:
    'Read from manufacturer data on Android; on iOS this is the Core Location identity.',
  protocolOtherHint: 'Any beacon carrying one of the identities below.',
  zone: 'Zone',
  eddystoneNamespace: 'Eddystone namespace',
  eddystoneInstance: 'Eddystone instance',
  hex20: '20 hex characters',
  hex12: '12 hex characters',
  iBeaconUuid: 'iBeacon proximity UUID',
  iBeaconUuidOptional: 'iBeacon proximity UUID (optional)',
  minewHint:
    'A Minew i3 can advertise both frames. Filling this in also enables the iOS Core Location path later. Give each beacon a distinct major/minor — the triple must be unique.',
  major: 'Major',
  minor: 'Minor',
  txPower: 'Tx power (dBm)',
  txPowerHint: 'Turn it down for tight zones.',
  advInterval: 'Advertising interval (ms)',
  advIntervalHint: '~500 ms suits a 4 s RSSI window.',
  saveChanges: 'Save changes',
  registerBeaconBtn: 'Register beacon',
  identifier: 'Identifier',
  protocol: 'Protocol',
  zoneReach: 'Zone reach',
  useMuseumDefault: 'Use museum default',
  followingDefault: 'Following the museum default',
  widerTighter: 'wider ← → tighter',
  reachHint:
    'A signal threshold, not a radius. The same value covers a different distance in a small room, behind glass, or in a crowd — walk the zone and adjust rather than converting to metres.',
  reachAtExhibit: 'Right at the exhibit',
  reachFewSteps: 'A few steps away',
  reachSmallRoom: 'A small room',
  reachWide: 'Wide — neighbouring zones may overlap',
  notRegistered: 'Not registered',
  eddystone: 'Eddystone',
  iBeacon: 'iBeacon',
} as const;

const vi: { [K in keyof typeof en]: string } = {
  museumGuide: 'Hướng dẫn bảo tàng',
  staffConsole: 'Bảng điều khiển',
  navOverview: 'Tổng quan',
  navZones: 'Khu vực',
  navBeacons: 'Cài beacon',
  navExhibits: 'Hiện vật',
  signOut: 'Đăng xuất',
  checkingSession: 'Đang kiểm tra phiên đăng nhập…',
  language: 'Ngôn ngữ',

  loginTitle: 'CMS Hướng dẫn bảo tàng',
  loginDescription: 'Đăng nhập bằng tài khoản nhân viên bảo tàng.',
  email: 'Email',
  password: 'Mật khẩu',
  signIn: 'Đăng nhập',
  signingIn: 'Đang đăng nhập...',
  seedHint: 'Tài khoản dev: admin@museum.local',
  welcomeBack: 'Xin chào, {name}',
  loginFailed: 'Đăng nhập thất bại.',

  cancel: 'Hủy',
  save: 'Lưu',
  saving: 'Đang lưu…',
  creating: 'Đang tạo...',
  edit: 'Sửa',
  delete: 'Xóa',
  code: 'Mã',
  name: 'Tên',
  floor: 'Tầng',
  title: 'Tiêu đề',
  description: 'Mô tả',
  status: 'Trạng thái',
  enabled: 'bật',
  disabled: 'tắt',

  dashboardTitle: 'Tổng quan',
  dashboardGenerated: 'Hiện vật mỗi khu vực đang hiển thị — cập nhật {time}.',
  statZones: 'Khu vực',
  statBeacons: 'Beacon',
  statExhibits: 'Hiện vật',
  statSchedule: 'Lịch trưng bày',
  beaconsEnabled: '{enabled}/{total} đang bật',
  exhibitsPublished: '{published}/{total} đã xuất bản',
  dashboardLoadError: 'Không tải được bảng tổng quan. API đã chạy chưa?',
  zonesEmptyWarning:
    'Chưa có hiện vật đã xuất bản trong {zones}. Khách quét beacon hoặc QR sẽ thấy khu vực trống.',
  allZonesOk: 'Mọi khu vực đều đang hiển thị một hiện vật đã xuất bản.',
  liveZoneStatus: 'Trạng thái khu vực',
  liveZoneHint: 'Beacon và mã QR đang trỏ tới hiện vật nào, theo đúng quy tắc ứng dụng khách dùng.',
  colZone: 'Khu vực',
  colBeacons: 'Beacon',
  colCurrentExhibit: 'Hiện vật hiện tại',
  colOnDisplaySince: 'Trưng bày từ',
  nothingScheduled: 'Chưa xếp lịch',

  zonesTitle: 'Khu vực',
  zonesSubtitle:
    'Không gian vật lý. Beacon và mã QR trỏ tới khu vực, không trỏ trực tiếp tới hiện vật.',
  newZone: 'Khu vực mới',
  searchZones: 'Tìm theo mã hoặc tên',
  allZones: 'Tất cả khu vực',
  zoneCount: '{count} khu vực',
  noZones: 'Chưa có khu vực',
  noZonesHint: 'Tạo khu vực đầu tiên để gắn beacon.',
  colSchedule: 'Lịch trưng bày',
  noBeacon: 'Chưa có beacon',
  newZoneTitle: 'Khu vực mới',
  newZoneHint: 'Mã là cố định — được in trong mã QR (ví dụ ZONE_A01).',
  createZone: 'Tạo khu vực',
  zoneCreated: 'Đã tạo khu vực {code}.',
  zoneCreateError: 'Không tạo được khu vực.',
  zoneUpdated: 'Đã lưu thông tin khu vực.',
  zoneUpdateError: 'Không lưu được khu vực.',
  zoneDeleted: 'Đã xóa khu vực.',
  zoneDeleteError: 'Không xóa được khu vực.',
  deleteZone: 'Xóa khu vực',
  deleteZoneConfirm: 'Xóa {code}? Lịch sử trưng bày cũng bị xóa.',
  allZonesLink: 'Tất cả khu vực',
  zoneNotFound: 'Không tìm thấy khu vực.',
  whatIsInRoom: 'Hiện vật trong phòng này',
  whatIsInRoomHint: 'Đúng nội dung BLE và QR đang trả về cho khu vực này.',
  onDisplaySince: 'Trưng bày từ {date}',
  assignedNotPublished: 'Đã gán nhưng chưa xuất bản — khách sẽ thấy “chưa có hiện vật trưng bày”.',
  openExhibit: 'Mở hiện vật',
  nothingOnDisplay: 'Chưa có hiện vật trưng bày',
  nothingOnDisplayHint: 'Chọn một hiện vật bên dưới để khách trong khu vực này nhận nội dung.',
  changeExhibit: 'Đổi hiện vật trong phòng này',
  selectExhibit: 'Chọn hiện vật…',
  setAsCurrent: 'Đặt làm hiện tại',
  emptyZone: 'Để trống khu vực',
  emptyZoneConfirm: 'Để trống khu vực này? Khách sẽ thấy trạng thái trống.',
  beaconQrUntouched: 'Beacon và mã QR in sẵn không đổi — chỉ nội dung thay đổi.',
  previouslyInRoom: 'Trước đây trong phòng này',
  noEarlierExhibit: 'Chưa ghi nhận hiện vật nào trước đó.',
  beaconsInZone: 'Beacon',
  beaconsInZoneHint: 'Phần cứng lắp trong khu vực này.',
  noBeaconInstalled: 'Chưa lắp beacon. Khách vẫn vào được khu vực này bằng mã QR.',
  qrCode: 'Mã QR',
  qrHint: 'In một lần — không đổi khi thay hiện vật.',
  downloadPng: 'Tải PNG',
  lastChecked: 'Cập nhật lần cuối',
  zoneSettings: 'Thông tin khu vực',
  zoneSettingsHint: 'Tên, tầng và ghi chú cho nhân viên. Mã không thể đổi.',
  saveZone: 'Lưu khu vực',
  exhibitSet: 'Khu vực này đang hiển thị hiện vật đã chọn. BLE và QR cập nhật ngay.',
  exhibitChangeError: 'Không đổi được hiện vật.',
  zoneEmptied: 'Đã để trống khu vực. Khách sẽ thấy trạng thái “chưa trưng bày”.',
  zoneEmptyError: 'Không để trống được khu vực.',

  exhibitsTitle: 'Hiện vật',
  exhibitsSubtitle: 'Hiện vật, bản dịch và tư liệu khách tham quan sẽ thấy.',
  newExhibit: 'Hiện vật mới',
  allExhibits: 'Tất cả hiện vật',
  exhibitCount: '{count} hiện vật',
  noExhibits: 'Chưa có hiện vật',
  noExhibitsHint: 'Tạo hiện vật, viết nội dung cho khách, rồi xuất bản.',
  colTitle: 'Tiêu đề',
  colLanguages: 'Ngôn ngữ',
  colMedia: 'Tư liệu',
  colScheduled: 'Lịch trưng bày',
  none: 'chưa có',
  identity: 'Định danh',
  identityHint: 'Nhãn nội bộ trên bảng điều khiển. Khách luôn thấy bản dịch.',
  defaultTitle: 'Tiêu đề nội bộ',
  contentVi: 'Tiếng Việt (hiển thị cho khách)',
  contentEn: 'Tiếng Anh (hiển thị cho khách)',
  shortDescription: 'Mô tả ngắn',
  fullDescription: 'Mô tả đầy đủ',
  createExhibit: 'Tạo hiện vật',
  exhibitCreated: 'Đã tạo hiện vật {code}.',
  exhibitCreateError: 'Không tạo được hiện vật.',
  deleteExhibitConfirm: 'Xóa {code}?',
  exhibitDeleted: 'Đã xóa hiện vật.',
  exhibitDeleteError: 'Không xóa được hiện vật.',
  allExhibitsLink: 'Tất cả hiện vật',
  exhibitNotFound: 'Không tìm thấy hiện vật.',
  publish: 'Xuất bản',
  archive: 'Lưu trữ',
  exhibitNowStatus: 'Hiện vật hiện ở trạng thái {status}.',
  statusChangeError: 'Không đổi được trạng thái.',
  addTranslationFirst:
    'Thêm ít nhất một bản dịch trước khi xuất bản — khách luôn được phục vụ bằng bản dịch.',
  translations: 'Bản dịch',
  mediaTab: 'Tư liệu',
  placement: 'Vị trí trưng bày',
  languages: 'Ngôn ngữ',
  addLanguage: 'Thêm ngôn ngữ',
  newTranslation: 'Bản dịch mới',
  editingLanguage: 'Đang sửa “{code}”',
  saveOverwriteHint: 'Lưu trùng mã ngôn ngữ sẽ ghi đè bản dịch đó.',
  languageCode: 'Mã ngôn ngữ',
  narrationAudio: 'URL thuyết minh',
  saveTranslation: 'Lưu bản dịch',
  translationSaved: 'Đã lưu bản dịch “{code}”.',
  translationSaveError: 'Không lưu được bản dịch.',
  translationRemoved: 'Đã xóa bản dịch.',
  removeTranslationConfirm: 'Xóa bản dịch “{code}”?',
  gallery: 'Thư viện',
  galleryHint: 'Ảnh, âm thanh và video dùng chung cho mọi ngôn ngữ.',
  uploadFile: 'Tải tệp lên',
  mediaAdded: 'Đã thêm tư liệu.',
  mediaAddError: 'Không thêm được tư liệu.',
  mediaRemoved: 'Đã xóa tư liệu.',
  uploadFailed: 'Tải lên thất bại.',
  noMediaYet: 'Chưa đính kèm tư liệu.',
  placementTitle: 'Nơi hiện vật đang hoặc đã trưng bày',
  onDisplayOpen: 'Trưng bày từ {date}',
  notPlacedYet: 'Chưa đặt vào khu vực nào. Mở một khu vực và chọn hiện vật này làm hiện tại.',
  identitySaved: 'Đã lưu định danh hiện vật.',
  identitySaveError: 'Không lưu được hiện vật.',
  newExhibitTitle: 'Hiện vật mới',
  newExhibitHint:
    'Viết bài cho khách, đính kèm ảnh hoặc video, rồi chọn ngôn ngữ để dịch và tạo thuyết minh.',
  requiredForVisitors: 'Hiển thị cho khách bằng ngôn ngữ này.',
  titlePlaceholderVi: 'Tượng Chăm',
  titlePlaceholderEn: 'Cham statue',
  editExhibitHint:
    'Sửa hiện vật như viết blog. Lưu sẽ cập nhật ngôn ngữ chính và đưa việc dịch, tạo thuyết minh cho các ngôn ngữ đã chọn vào hàng đợi.',
  primaryLanguage: 'Ngôn ngữ chính',
  primaryLanguageHint:
    'Viết tiêu đề và nội dung bằng ngôn ngữ này. Các ngôn ngữ khác được tạo từ đây.',
  visitorBody: 'Nội dung cho khách',
  visitorBodyHint: 'Tiêu đề, tóm tắt ngắn và bài viết khách sẽ đọc.',
  attachments: 'Tệp đính kèm',
  attachmentsHint: 'Ảnh và video dùng chung cho mọi ngôn ngữ.',
  languageVariants: 'Các bản ngôn ngữ',
  languageVariantsHint:
    'Ngôn ngữ chính luôn có thuyết minh. Khi lưu, các ngôn ngữ đã chọn được gửi sang AI service để dịch từ bản gốc và tạo thuyết minh, trừ khi đã cập nhật sẵn.',
  primaryIncluded: 'chính',
  saveExhibit: 'Lưu',
  savingExhibit: 'Đang lưu…',
  exhibitSaved: 'Đã lưu hiện vật.',
  willTranslate: 'sẽ tạo',
  alreadyTranslated: 'đã có',
  uploadImageVideo: 'Tải ảnh hoặc video',
  pendingUploads: 'Chưa lưu',
  codeReadOnly: 'Không đổi được mã sau khi đã tạo hiện vật.',
  generateAudioHint:
    'Sau khi lưu, tiến độ dịch và thuyết minh của từng ngôn ngữ hiển thị tại trang này.',
  localizationTitle: 'Bản dịch & thuyết minh',
  localizationHint:
    'Mỗi ngôn ngữ được AI service dịch từ bản gốc rồi tạo thuyết minh. Danh sách tự làm mới khi còn việc đang chạy.',
  localizationEmpty: 'Chưa tạo gì. Chọn ngôn ngữ ở trên rồi lưu.',
  localizationQueued: 'Đã gửi {count} ngôn ngữ vào hàng đợi AI service.',
  localizationUpToDate: 'Các ngôn ngữ đã chọn đều đã cập nhật.',
  localizationRequestError: 'Không đưa được việc dịch và thuyết minh vào hàng đợi.',
  aiServiceOnline: 'AI service đang hoạt động',
  aiServiceQueue: '{count} việc trong hàng đợi',
  aiServiceOffline: 'AI service đang tắt — yêu cầu sẽ chờ trong hàng đợi đến khi kết nối lại.',
  aiServiceLastSeen: 'Lần cuối kết nối {time}.',
  aiServiceNotConfigured:
    'Chưa cấu hình AI service (AI_SERVICE_SECRET ở API). Yêu cầu sẽ nằm chờ trong hàng đợi.',
  statusQueued: 'Đang chờ',
  statusTranslating: 'Đang dịch…',
  statusSynthesizing: 'Đang tạo audio…',
  statusProcessing: 'Đang xử lý…',
  statusCompleted: 'Hoàn tất',
  statusFailed: 'Lỗi',
  statusNoAudio: 'Chưa có audio',
  statusOutdated: 'Cũ',
  outdatedHint: 'Được tạo từ phiên bản cũ của bản gốc.',
  lastAttemptError: 'Lần thử gần nhất: {error}',
  viewContent: 'Xem nội dung',
  hideContent: 'Ẩn nội dung',
  regenerate: 'Tạo lại',
  retry: 'Thử lại',
  generatedWith: 'Mô hình: {models}',
  noTranslationYet: 'Bản dịch sẽ hiện ở đây khi ngôn ngữ này hoàn tất.',
  languagesFromAiService: 'Các ngôn ngữ AI service hỗ trợ ({count}).',
  languagesFromConfig:
    'AI service chưa báo danh sách ngôn ngữ nên đang dùng danh sách mặc định (SUPPORTED_LANGUAGES).',
  languagesLoadError: 'Không tải được danh sách ngôn ngữ.',
  languageNotOffered: 'không hỗ trợ',
  titleRequired: 'Cần có tiêu đề hiển thị cho khách.',
  langVi: 'Tiếng Việt',
  langEn: 'Tiếng Anh',
  langJa: 'Tiếng Nhật',
  langKo: 'Tiếng Hàn',
  langZh: 'Tiếng Trung',
  langFr: 'Tiếng Pháp',
  langDe: 'Tiếng Đức',
  langRu: 'Tiếng Nga',
  langEs: 'Tiếng Tây Ban Nha',

  beaconsEyebrow: 'Hạ tầng bảo tàng',
  beaconsTitle: 'Cài đặt beacon',
  beaconsSubtitle:
    'Gán từng thiết bị vào khu vực và chỉnh tầm nhận. Nhân viên quản lý các giá trị này; ứng dụng khách chỉ đọc.',
  newBeacon: 'Beacon mới',
  registeredBeacons: 'Beacon đã đăng ký',
  beaconCount: '{count} beacon',
  noBeacons: 'Chưa đăng ký beacon',
  noBeaconsHint: 'Thêm beacon và gán vào một khu vực.',
  colIdentifier: 'Mã hiệu',
  colBroadcast: 'Danh tính phát',
  colRadio: 'Radio',
  colReach: 'Tầm nhận',
  museumDefault: 'mặc định bảo tàng',
  beaconToggled: 'Đã cập nhật beacon.',
  beaconToggleError: 'Không cập nhật được beacon.',
  deleteBeaconConfirm: 'Xóa {id}?',
  beaconDeleted: 'Đã xóa beacon.',
  beaconDeleteError: 'Không xóa được beacon.',
  disable: 'Tắt',
  enable: 'Bật',
  registerBeacon: 'Đăng ký beacon',
  beaconSettingsTitle: 'Cài đặt beacon · {id}',
  beaconFormHint:
    'Nhân viên quản lý danh tính phần cứng, khu vực và tầm nhận tại đây. Thiết bị khách chỉ dùng các giá trị đã công bố.',
  findNearby: 'Tìm beacon gần đây',
  pickToFill: 'Chọn một beacon để điền danh tính tự động.',
  scan: 'Quét',
  scanning: 'Đang quét…',
  scanListening: 'Đang lắng nghe {seconds} giây — đưa beacon lại gần máy tính này.',
  noBeaconsHeard: 'Không nghe thấy beacon. Kiểm tra nguồn và khoảng cách tới máy này.',
  beaconsFound: 'Tìm thấy {count} beacon',
  scanFailed: 'Không quét được beacon.',
  identityFilled: 'Đã điền danh tính từ lần quét.',
  beaconSaved: 'Beacon {id} đã {action}.',
  beaconUpdatedAction: 'cập nhật',
  beaconRegisteredAction: 'đăng ký',
  beaconSaveError: 'Không lưu được beacon.',
  protocolEddystone: 'Eddystone UID (khuyến nghị)',
  protocolIbeacon: 'iBeacon',
  protocolOther: 'Khác',
  protocolEddystoneHint: 'Đọc từ BLE service data 0xFEAA — giống nhau trên Android và iOS.',
  protocolIbeaconHint:
    'Đọc từ manufacturer data trên Android; trên iOS là danh tính Core Location.',
  protocolOtherHint: 'Mọi beacon mang một trong các danh tính bên dưới.',
  zone: 'Khu vực',
  eddystoneNamespace: 'Eddystone namespace',
  eddystoneInstance: 'Eddystone instance',
  hex20: '20 ký tự hex',
  hex12: '12 ký tự hex',
  iBeaconUuid: 'UUID proximity iBeacon',
  iBeaconUuidOptional: 'UUID proximity iBeacon (tùy chọn)',
  minewHint:
    'Minew i3 có thể phát cả hai khung. Điền trường này cũng bật đường Core Location trên iOS. Mỗi beacon cần major/minor riêng — bộ ba phải là duy nhất.',
  major: 'Major',
  minor: 'Minor',
  txPower: 'Công suất Tx (dBm)',
  txPowerHint: 'Giảm xuống cho khu vực hẹp.',
  advInterval: 'Chu kỳ quảng bá (ms)',
  advIntervalHint: '~500 ms phù hợp cửa sổ RSSI 4 giây.',
  saveChanges: 'Lưu thay đổi',
  registerBeaconBtn: 'Đăng ký beacon',
  identifier: 'Mã hiệu',
  protocol: 'Giao thức',
  zoneReach: 'Tầm khu vực',
  useMuseumDefault: 'Dùng mặc định bảo tàng',
  followingDefault: 'Theo mặc định bảo tàng',
  widerTighter: 'rộng ← → hẹp',
  reachHint:
    'Đây là ngưỡng tín hiệu, không phải bán kính. Cùng một giá trị sẽ khác nhau trong phòng nhỏ, sau kính, hoặc đám đông — hãy đi thử khu vực rồi chỉnh, đừng đổi sang mét.',
  reachAtExhibit: 'Sát hiện vật',
  reachFewSteps: 'Cách vài bước',
  reachSmallRoom: 'Một phòng nhỏ',
  reachWide: 'Rộng — có thể chồng lên khu vực bên cạnh',
  notRegistered: 'Chưa đăng ký',
  eddystone: 'Eddystone',
  iBeacon: 'iBeacon',
};

const DICTIONARY = { en, vi } as const;

export type AdminLanguage = keyof typeof DICTIONARY;
export type UiKey = keyof typeof en;

type I18nValue = {
  language: AdminLanguage;
  setLanguage: (language: AdminLanguage) => void;
  t: (key: UiKey, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function translate(language: AdminLanguage, key: UiKey, vars: Record<string, string> = {}): string {
  const template: string = DICTIONARY[language][key] ?? DICTIONARY.en[key];
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    template,
  );
}

function readStored(): AdminLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') return stored;
  } catch {
    // Private browsing can refuse storage.
  }
  const browser = window.navigator.language?.toLowerCase().split('-')[0];
  return browser === 'vi' ? 'vi' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AdminLanguage>('en');

  useEffect(() => {
    setLanguageState(readStored());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Ignore persistence failures.
        }
      },
      t: (key, vars) => translate(language, key, vars),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}

export function LanguageToggle({
  className,
  variant = 'header',
}: {
  className?: string;
  variant?: 'header' | 'light';
}) {
  const { language, setLanguage, t } = useI18n();
  const onHeader = variant === 'header';

  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border text-xs font-semibold',
        onHeader ? 'border-primary-foreground/25' : 'border-input bg-background',
        className,
      )}
      role="group"
      aria-label={t('language')}
    >
      {(['en', 'vi'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={cn(
            'px-2.5 py-1 uppercase tracking-wide transition-colors',
            language === code
              ? onHeader
                ? 'bg-primary-foreground text-primary'
                : 'bg-primary text-primary-foreground'
              : onHeader
                ? 'text-primary-foreground/70 hover:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
