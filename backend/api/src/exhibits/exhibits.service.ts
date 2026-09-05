import { Injectable, NotFoundException } from '@nestjs/common';
import { Exhibit, Prisma } from '@prisma/client';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { ExhibitNotFoundException, ResourceInUseException } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExhibitDto,
  CreateMediaDto,
  QueryExhibitsDto,
  UpdateExhibitDto,
  UpdateTranslationDto,
  UpsertTranslationDto,
} from './dto/exhibit.dto';

@Injectable()
export class ExhibitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryExhibitsDto): Promise<Paginated<Exhibit>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.ExhibitWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { defaultTitle: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exhibit.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          translations: { select: { id: true, languageCode: true, title: true } },
          media: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { media: true, assignments: true } },
        },
      }),
      this.prisma.exhibit.count({ where }),
    ]);

    return paginate(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const exhibit = await this.prisma.exhibit.findUnique({
      where: { id },
      include: {
        translations: { orderBy: { languageCode: 'asc' } },
        media: { orderBy: { sortOrder: 'asc' } },
        assignments: {
          orderBy: { activeFrom: 'asc' },
          include: { zone: { select: { id: true, code: true, name: true } } },
        },
      },
    });

    if (!exhibit) throw new ExhibitNotFoundException(id);
    return exhibit;
  }

  create(dto: CreateExhibitDto) {
    return this.prisma.exhibit.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        defaultTitle: dto.defaultTitle.trim(),
        status: dto.status ?? 'DRAFT',
      },
    });
  }

  async update(id: string, dto: UpdateExhibitDto) {
    await this.assertExists(id);
    return this.prisma.exhibit.update({ where: { id }, data: dto });
  }

  /** Archiving is preferred over deleting: assignments keep pointing at it. */
  async archive(id: string) {
    await this.assertExists(id);
    return this.prisma.exhibit.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async publish(id: string) {
    await this.assertExists(id);
    return this.prisma.exhibit.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async remove(id: string) {
    const assignments = await this.prisma.exhibitAssignment.count({ where: { exhibitId: id } });
    if (assignments > 0) {
      throw new ResourceInUseException(
        'This exhibit is used by one or more schedule entries. Remove those first, or archive the exhibit instead.',
        { assignments },
      );
    }
    await this.assertExists(id);
    return this.prisma.exhibit.delete({ where: { id } });
  }

  // ---- translations -------------------------------------------------------

  async upsertTranslation(exhibitId: string, dto: UpsertTranslationDto) {
    await this.assertExists(exhibitId);
    const languageCode = dto.languageCode.toLowerCase();

    return this.prisma.exhibitTranslation.upsert({
      where: { exhibitId_languageCode: { exhibitId, languageCode } },
      create: {
        exhibitId,
        languageCode,
        title: dto.title,
        shortDescription: dto.shortDescription ?? null,
        description: dto.description ?? null,
        audioUrl: dto.audioUrl ?? null,
      },
      update: {
        title: dto.title,
        shortDescription: dto.shortDescription ?? null,
        description: dto.description ?? null,
        audioUrl: dto.audioUrl ?? null,
      },
    });
  }

  async updateTranslation(exhibitId: string, translationId: string, dto: UpdateTranslationDto) {
    const existing = await this.prisma.exhibitTranslation.findFirst({
      where: { id: translationId, exhibitId },
    });
    if (!existing) throw new NotFoundException('Translation not found for this exhibit.');

    return this.prisma.exhibitTranslation.update({ where: { id: translationId }, data: dto });
  }

  async removeTranslation(exhibitId: string, translationId: string) {
    const existing = await this.prisma.exhibitTranslation.findFirst({
      where: { id: translationId, exhibitId },
    });
    if (!existing) throw new NotFoundException('Translation not found for this exhibit.');

    return this.prisma.exhibitTranslation.delete({ where: { id: translationId } });
  }

  // ---- media --------------------------------------------------------------

  async addMedia(exhibitId: string, dto: CreateMediaDto) {
    await this.assertExists(exhibitId);
    return this.prisma.exhibitMedia.create({
      data: {
        exhibitId,
        type: dto.type,
        url: dto.url,
        caption: dto.caption ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeMedia(exhibitId: string, mediaId: string) {
    const existing = await this.prisma.exhibitMedia.findFirst({
      where: { id: mediaId, exhibitId },
    });
    if (!existing) throw new NotFoundException('Media not found for this exhibit.');
    return this.prisma.exhibitMedia.delete({ where: { id: mediaId } });
  }

  private async assertExists(id: string): Promise<void> {
    const count = await this.prisma.exhibit.count({ where: { id } });
    if (count === 0) throw new ExhibitNotFoundException(id);
  }
}
