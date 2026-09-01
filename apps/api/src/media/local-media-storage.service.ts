import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { APP_CONFIG, AppConfig } from '../config/env.validation';
import { IncomingFile, MediaStorageService, StoredFile } from './media-storage.service';

const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'];

/** Maps a mime type to a tidy sub folder so uploads stay browsable. */
export function folderForMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

/** Development / academic default: plain files under `apps/api/uploads`. */
@Injectable()
export class LocalMediaStorageService extends MediaStorageService {
  private readonly logger = new Logger(LocalMediaStorageService.name);
  private readonly root: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super();
    this.root = path.isAbsolute(config.uploadDir)
      ? config.uploadDir
      : path.join(process.cwd(), config.uploadDir);
  }

  async save(file: IncomingFile, folder?: string): Promise<StoredFile> {
    if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Only image, audio and video files are accepted.`,
      );
    }
    if (file.size > this.config.maxUploadSizeBytes) {
      throw new BadRequestException(
        `File is larger than the ${Math.round(this.config.maxUploadSizeBytes / (1024 * 1024))} MB limit.`,
      );
    }

    const targetFolder = folder ?? folderForMimeType(file.mimetype);
    const extension = path.extname(file.originalname).toLowerCase() || '';
    const filename = `${randomUUID()}${extension}`;
    const directory = path.join(this.root, targetFolder);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), file.buffer);

    return {
      url: `/uploads/${targetFolder}/${filename}`,
      filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async remove(url: string): Promise<void> {
    // Only files we produced (`/uploads/<folder>/<name>`) may be deleted.
    const match = /^\/uploads\/([a-z]+)\/([A-Za-z0-9._-]+)$/.exec(url);
    if (!match) {
      this.logger.warn(`Refusing to delete unmanaged media url: ${url}`);
      return;
    }
    const target = path.join(this.root, match[1], match[2]);
    await fs.rm(target, { force: true });
  }
}
