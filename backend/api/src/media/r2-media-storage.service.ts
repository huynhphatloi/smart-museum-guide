import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AppConfig, R2Config } from '../config/env.validation';
import {
  assertStorableFile,
  folderForMimeType,
  IncomingFile,
  MediaStorageService,
  StoredFile,
} from './media-storage.service';

/** Object key behind a URL this bucket produced (`<publicUrl>/<folder>/<name>`), else null. */
export function r2KeyFromUrl(publicUrl: string, url: string): string | null {
  const prefix = `${publicUrl}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return /^[a-z]+\/[A-Za-z0-9._-]+$/.test(key) ? key : null;
}

/**
 * Cloudflare R2 bucket, reached through R2's S3-compatible endpoint. Stored
 * URLs are absolute (`<R2_PUBLIC_URL>/<folder>/<uuid>.<ext>`), so the admin,
 * the visitor apps and the audio players load media from R2 directly.
 */
export class R2MediaStorageService extends MediaStorageService {
  private readonly logger = new Logger(R2MediaStorageService.name);
  private readonly client: S3Client;

  constructor(
    private readonly config: AppConfig,
    private readonly r2: R2Config,
    /** Media saved before the switch to R2 stays on disk and is still removed from there. */
    private readonly legacy: MediaStorageService,
    client?: S3Client,
  ) {
    super();
    this.client =
      client ??
      new S3Client({
        region: 'auto',
        endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
        // Stick to the S3 subset R2 implements: no optional checksums.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
  }

  async save(file: IncomingFile, folder?: string): Promise<StoredFile> {
    assertStorableFile(file, this.config.maxUploadSizeBytes);

    const filename = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    const key = `${folder ?? folderForMimeType(file.mimetype)}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.r2.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Keys are never reused, so browsers and Cloudflare's cache may keep them forever.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: `${this.r2.publicUrl}/${key}`,
      filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async remove(url: string): Promise<void> {
    if (url.startsWith('/uploads/')) return this.legacy.remove(url);

    const key = r2KeyFromUrl(this.r2.publicUrl, url);
    if (!key) {
      this.logger.warn(`Refusing to delete unmanaged media url: ${url}`);
      return;
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.r2.bucket, Key: key }));
  }
}
