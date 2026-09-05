export interface StoredFile {
  /** Public, servable URL path, e.g. `/uploads/images/abc.jpg`. */
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

/**
 * Storage abstraction. The app only ever depends on this class, so swapping the
 * local disk implementation for S3 / MinIO later is a one line provider change
 * in `MediaModule` - no controller or service has to be touched.
 */
export abstract class MediaStorageService {
  abstract save(file: IncomingFile, folder?: string): Promise<StoredFile>;
  abstract remove(url: string): Promise<void>;
}
