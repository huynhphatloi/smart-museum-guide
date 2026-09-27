/* eslint-disable no-console */
/** Updates the original demo records without deleting staff accounts, beacons or schedules. */
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exhibits } from './demo-content';

const prisma = new PrismaClient();
const demoExhibits = exhibits.filter((item) => item.asset);

const legacy: Record<string, { code: string; image: string; titles: Record<string, string> }> = {
  EX_CHAM_STATUE: {
    code: 'EX_CHAM_STATUE',
    image: 'cham-statue.svg',
    titles: {
      vi: 'Tượng đá Chăm - Thần Shiva',
      en: 'Cham Sandstone Statue - Shiva',
      ja: 'チャム砂岩像 - シヴァ神',
    },
  },
  EX_DONGSON_DRUM: {
    code: 'EX_DONGSON_DRUM',
    image: 'dongson-drum.svg',
    titles: { vi: 'Trống đồng Đông Sơn', en: 'Dong Son Bronze Drum' },
  },
  EX_HANG_TRONG_PAINTING: {
    code: 'EX_HANG_TRONG_PAINTING',
    image: 'hang-trong-painting.svg',
    titles: { vi: 'Tranh dân gian Hàng Trống', en: 'Hang Trong Folk Painting' },
  },
  EX_ELEPHANT_DISH: {
    code: 'EX_MODERN_LACQUER',
    image: 'modern-lacquer.svg',
    titles: {
      vi: 'Tranh sơn mài hiện đại',
      en: 'Modern Lacquer Panel',
      fr: 'Panneau de laque contemporain',
    },
  },
};

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo refresh is disabled in production.');
  }

  const records = await Promise.all(
    demoExhibits.map(async (item) => {
      const old = legacy[item.code];
      const record = await prisma.exhibit.findFirst({
        where: { code: { in: [old.code, item.code] } },
        include: { translations: true, media: true, assignments: { include: { zone: true } } },
      });
      if (!record || record.media.length !== 1) {
        throw new Error(`Demo exhibit ${old.code} is missing or has custom media.`);
      }
      const allowedImages = [old.image, item.asset].map((name) => `/uploads/images/${name}`);
      if (!allowedImages.includes(record.media[0].url)) {
        throw new Error(`Demo exhibit ${record.code} has custom media; refusing to overwrite it.`);
      }
      if (record.translations.length !== item.translations.length) {
        throw new Error(`Demo exhibit ${record.code} has custom translations.`);
      }
      for (const translation of record.translations) {
        const next = item.translations.find((row) => row.languageCode === translation.languageCode);
        if (
          !next ||
          ![old.titles[translation.languageCode], next.title].includes(translation.title)
        ) {
          throw new Error(
            `Demo exhibit ${record.code} has edited ${translation.languageCode} copy.`,
          );
        }
      }
      if (
        item.code === 'EX_ELEPHANT_DISH' &&
        record.assignments.some((row) => row.zone.code !== 'ZONE_B01')
      ) {
        throw new Error('The old lacquer demo has a custom assignment.');
      }
      return { item, record };
    }),
  );

  const ceramicZone = await prisma.zone.findUnique({ where: { code: 'ZONE_B01' } });
  if (!ceramicZone || !['Modern Art', 'Vietnamese Ceramics'].includes(ceramicZone.name)) {
    throw new Error('ZONE_B01 has custom details; refusing to rename it.');
  }

  console.log('Validated four original demo exhibits and ZONE_B01.');
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to update the local demo records.');
    return;
  }

  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  const destination = path.join(
    path.isAbsolute(uploadDir) ? uploadDir : process.cwd() + '/' + uploadDir,
    'images',
  );
  await fs.mkdir(destination, { recursive: true });
  for (const { item } of records) {
    await fs.copyFile(
      path.join(__dirname, 'seed-assets', 'images', item.asset!),
      path.join(destination, item.asset!),
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const { item, record } of records) {
      await tx.exhibit.update({
        where: { id: record.id },
        data: { code: item.code, defaultTitle: item.defaultTitle },
      });
      await tx.exhibitMedia.update({
        where: { id: record.media[0].id },
        data: { url: `/uploads/images/${item.asset}`, caption: item.mediaCaption },
      });
      for (const translation of item.translations) {
        const existing = record.translations.find(
          (row) => row.languageCode === translation.languageCode,
        )!;
        await tx.exhibitTranslation.update({
          where: { id: existing.id },
          data: {
            title: translation.title,
            shortDescription: translation.shortDescription,
            description: translation.description,
            audioUrl: null,
          },
        });
      }
    }
    await tx.zone.update({
      where: { id: ceramicZone.id },
      data: {
        name: 'Vietnamese Ceramics',
        description: 'Khu gốm Việt Nam - Vietnamese ceramics gallery.',
      },
    });
  });
  console.log('Updated four demo exhibits. Existing staff, beacons and schedules were preserved.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
