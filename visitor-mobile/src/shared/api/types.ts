export type MediaType = 'IMAGE' | 'AUDIO' | 'VIDEO';

export interface LocalisedMedia {
  id: string;
  type: MediaType;
  url: string;
  caption: string | null;
  sortOrder: number;
}

export interface LocalisedExhibit {
  id: string;
  code: string;
  status: string;
  language: string;
  requestedLanguage: string;
  translationFallback: boolean;
  availableLanguages: string[];
  title: string;
  shortDescription: string | null;
  description: string | null;
  audioUrl: string | null;
  media: LocalisedMedia[];
}

export interface PublicZone {
  id: string;
  code: string;
  name: string;
  description: string | null;
  floor: string | null;
}

export interface ActiveExhibitResponse {
  zone: PublicZone;
  beacon: { identifier: string; name: string } | null;
  assignment: { id: string; activeFrom: string; activeTo: string | null };
  exhibit: LocalisedExhibit;
  resolvedAt: string;
}

export interface LanguageOption {
  code: string;
  /** English name. */
  name: string;
  /** Name in the language itself, shown in the language list. */
  nativeName: string;
}

export interface LanguagesResponse {
  default: string;
  supported: string[];
  /** Display names; absent on servers older than the AI service language list. */
  languages?: LanguageOption[];
  source?: 'ai-service' | 'config';
}
