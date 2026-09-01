import { ExhibitStatus, MediaType } from '@prisma/client';

/** A single assignment row joined with the exhibit it points at. */
export interface AssignmentWithExhibit {
  id: string;
  zoneId: string;
  exhibitId: string;
  activeFrom: Date;
  activeTo: Date | null;
  exhibit: {
    id: string;
    code: string;
    defaultTitle: string;
    status: ExhibitStatus;
  };
}

/** Outcome of asking "what is on display in this zone right now?" */
export type ResolutionReason = 'RESOLVED' | 'NO_ASSIGNMENT' | 'EXHIBIT_NOT_PUBLISHED';

export interface ExhibitResolution {
  reason: ResolutionReason;
  assignment: AssignmentWithExhibit | null;
}

export interface LocalisedMedia {
  id: string;
  type: MediaType;
  url: string;
  caption: string | null;
  sortOrder: number;
}

/** Fully localised exhibit payload handed to the mobile app / visitor web. */
export interface LocalisedExhibit {
  id: string;
  code: string;
  status: ExhibitStatus;
  /** Language actually used for the copy below. */
  language: string;
  /** Language the client asked for. */
  requestedLanguage: string;
  /** True when `language !== requestedLanguage`, so the UI can say so. */
  translationFallback: boolean;
  availableLanguages: string[];
  title: string;
  shortDescription: string | null;
  description: string | null;
  audioUrl: string | null;
  media: LocalisedMedia[];
}
