import { BadRequestException } from '@nestjs/common';

export interface StoredFile {
  /**
   * Public, servable URL: a path such as `/uploads/images/abc.jpg` on local
   * disk, or an absolute URL such as `https://media.example.com/images/abc.jpg` on R2.
   */
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface IncomingFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];

/** Maps a mime type to a tidy sub folder so uploads stay browsable. */
export function folderForMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

/** Rules every storage backend applies before accepting a file. */
export function assertStorableFile(file: IncomingFile, maxUploadSizeBytes: number): void {
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
    throw new BadRequestException(
      `Unsupported file type "${file.mimetype}". Only image, audio and video files are accepted.`,
    );
  }
  if (file.size > maxUploadSizeBytes) {
    throw new BadRequestException(
      `File is larger than the ${Math.round(maxUploadSizeBytes / (1024 * 1024))} MB limit.`,
    );
  }
}

/**
 * Storage abstraction. The app only ever depends on this class; `MediaModule`
 * picks local disk or Cloudflare R2 from `MEDIA_STORAGE`, so no controller or
 * service has to know where files end up.
 */
export abstract class MediaStorageService {
  abstract save(file: IncomingFile, folder?: string): Promise<StoredFile>;
  abstract remove(url: string): Promise<void>;
}
