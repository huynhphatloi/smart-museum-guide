import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaStorageService, StoredFile } from './media-storage.service';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('admin/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly storage: MediaStorageService) {}

  /** `multipart/form-data` upload with a single `file` field. */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: MulterFile): Promise<StoredFile> {
    if (!file) throw new BadRequestException('No file was uploaded (expected field "file").');
    return this.storage.save(file);
  }

  @Delete()
  async remove(@Body('url') url: string): Promise<{ removed: boolean }> {
    if (!url) throw new BadRequestException('"url" is required.');
    await this.storage.remove(url);
    return { removed: true };
  }
}
