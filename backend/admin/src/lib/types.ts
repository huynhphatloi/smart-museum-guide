export type ExhibitStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO';
export type BeaconProtocol = 'EDDYSTONE_UID' | 'IBEACON' | 'GENERIC';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  description: string | null;
  floor: string | null;
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
  beacons?: Beacon[];
  _count?: { assignments: number };
}

export interface AssignmentSummary {
  id: string;
  zoneId: string;
  exhibitId: string;
  activeFrom: string;
  activeTo: string | null;
  note?: string | null;
  exhibit: { id: string; code: string; defaultTitle: string; status: ExhibitStatus };
  zone?: { id: string; code: string; name: string };
}

export interface ZoneDetail extends Zone {
  qrValue: string;
  currentAssignment: AssignmentSummary | null;
  currentReason: 'RESOLVED' | 'NO_ASSIGNMENT' | 'EXHIBIT_NOT_PUBLISHED';
  /** What stood here before, newest first. */
  history: AssignmentSummary[];
}

export interface Beacon {
  id: string;
  identifier: string;
  name: string;
  protocol: BeaconProtocol;
  /** Eddystone UID namespace - 20 hex characters, usually one per museum. */
  namespaceId: string | null;
  /** Eddystone UID instance - 12 hex characters, one per beacon. */
  instanceId: string | null;
  uuid: string | null;
  major: number | null;
  minor: number | null;
  txPower: number | null;
  advertisingIntervalMs: number | null;
  /** Zone reach in dBm. Null means the app falls back to its global default. */
  minRssi: number | null;
  enabled: boolean;
  zoneId: string;
  zone?: { id: string; code: string; name: string };
}

export interface ExhibitTranslation {
  id: string;
  exhibitId: string;
  languageCode: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  audioUrl: string | null;
}

export interface ExhibitMedia {
  id: string;
  exhibitId: string;
  type: MediaType;
  url: string;
  caption: string | null;
  sortOrder: number;
}

export interface Exhibit {
  id: string;
  code: string;
  defaultTitle: string;
  status: ExhibitStatus;
  createdAt: string;
  updatedAt: string;
  translations?: ExhibitTranslation[];
  media?: ExhibitMedia[];
  assignments?: AssignmentSummary[];
  _count?: { media: number; assignments: number };
}

export interface DashboardZoneRow {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  beaconCount: number;
  enabledBeaconCount: number;
  currentExhibit: { id: string; code: string; title: string; status: string } | null;
  currentReason: string;
  onDisplaySince: string | null;
}

export interface DashboardSummary {
  generatedAt: string;
  counts: {
    zones: number;
    beacons: number;
    disabledBeacons: number;
    exhibits: number;
    publishedExhibits: number;
    scheduleEntries: number;
  };
  languages: string[];
  zones: DashboardZoneRow[];
  zonesWithoutContent: string[];
}

export interface StoredFile {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export interface LanguagesResponse {
  default: string;
  supported: string[];
  languages: LanguageOption[];
  /** `ai-service`: reported by the AI service. `config`: SUPPORTED_LANGUAGES fallback. */
  source: 'ai-service' | 'config';
}

export type LocalizationStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SUPERSEDED';

/** Per-language state shown in the CMS. NO_AUDIO: a translation exists without narration. */
export type LanguageLocalizationStatus = Exclude<LocalizationStatus, 'SUPERSEDED'> | 'NO_AUDIO';

export interface AiServiceStatus {
  configured: boolean;
  online: boolean;
  lastSeenAt: string | null;
  queueSize: number | null;
  translationModel: string | null;
  ttsModels: string[];
  device: string | null;
}

export interface LanguageLocalization {
  languageCode: string;
  isSource: boolean;
  status: LanguageLocalizationStatus;
  /** `translating` or `synthesizing` while PROCESSING. */
  stage: string | null;
  error: string | null;
  upToDate: boolean;
  task: {
    id: string;
    status: LocalizationStatus;
    sourceLanguage: string;
    createdAt: string;
    updatedAt: string;
    dispatchedAt: string | null;
    completedAt: string | null;
    translationModel: string | null;
    ttsModel: string | null;
  } | null;
  translation: {
    id: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
    audioUrl: string | null;
    updatedAt: string;
  } | null;
}

export interface ExhibitLocalization {
  sourceLanguage: string | null;
  languages: LanguageLocalization[];
  aiService: AiServiceStatus;
}

export interface RequestLocalizationResult {
  sourceLanguage: string;
  queued: string[];
  skipped: { languageCode: string; reason: 'up_to_date' | 'in_progress' }[];
  aiService: AiServiceStatus;
}
