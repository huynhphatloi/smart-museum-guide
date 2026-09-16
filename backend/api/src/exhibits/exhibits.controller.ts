import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateExhibitDto,
  CreateMediaDto,
  LocalizeExhibitDto,
  QueryExhibitsDto,
  UpdateExhibitDto,
  UpdateTranslationDto,
  UpsertTranslationDto,
} from './dto/exhibit.dto';
import { ExhibitLocalizeService } from './exhibit-localize.service';
import { ExhibitsService } from './exhibits.service';

@Controller('admin/exhibits')
@UseGuards(JwtAuthGuard)
export class ExhibitsController {
  constructor(
    private readonly exhibits: ExhibitsService,
    private readonly localizeService: ExhibitLocalizeService,
  ) {}

  @Get()
  findAll(@Query() query: QueryExhibitsDto) {
    return this.exhibits.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exhibits.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExhibitDto) {
    return this.exhibits.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExhibitDto) {
    return this.exhibits.update(id, dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.exhibits.publish(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.exhibits.archive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exhibits.remove(id);
  }

  @Post(':id/localize')
  localize(@Param('id') id: string, @Body() dto: LocalizeExhibitDto) {
    return this.localizeService.localize(id, dto);
  }

  @Post(':id/translations')
  upsertTranslation(@Param('id') id: string, @Body() dto: UpsertTranslationDto) {
    return this.exhibits.upsertTranslation(id, dto);
  }

  @Patch(':id/translations/:translationId')
  updateTranslation(
    @Param('id') id: string,
    @Param('translationId') translationId: string,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.exhibits.updateTranslation(id, translationId, dto);
  }

  @Delete(':id/translations/:translationId')
  removeTranslation(@Param('id') id: string, @Param('translationId') translationId: string) {
    return this.exhibits.removeTranslation(id, translationId);
  }

  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() dto: CreateMediaDto) {
    return this.exhibits.addMedia(id, dto);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string) {
    return this.exhibits.removeMedia(id, mediaId);
  }
}
