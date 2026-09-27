/* eslint-disable no-console */
/** Adds the sourced collection to an existing local database without resetting it. */
import { MediaType, PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { demoNarration } from './demo-narration';
import { metExhibits } from './met-collection';

const prisma = new PrismaClient();
const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads';

const legacyCopy = [
  [
    'EX_CHAM_STATUE',
    'en',
    'Isana sculpture from My Son',
    'A 10th-century Cham sculpture from My Son B, Quang Nam.',
    demoNarration.EX_CHAM_STATUE.en,
  ],
  [
    'EX_CHAM_STATUE',
    'ja',
    'ミーソンのイーシャーナ像',
    'クアンナム省ミーソンB地区の10世紀のチャム彫刻。',
    demoNarration.EX_CHAM_STATUE.ja,
  ],
  [
    'EX_DONGSON_DRUM',
    'en',
    'Dong Son Bronze Drum',
    'A bronze drum surface with a central star and concentric decoration.',
    demoNarration.EX_DONGSON_DRUM.en,
  ],
  [
    'EX_HANG_TRONG_PAINTING',
    'en',
    'Five Tigers, Hang Trong painting',
    'A Hang Trong folk painting depicting five tigers.',
    demoNarration.EX_HANG_TRONG_PAINTING.en,
  ],
  [
    'EX_ELEPHANT_DISH',
    'en',
    'Dish with an elephant among clouds',
    'A Vietnamese blue-and-white ceramic dish from the 15th–16th century.',
    demoNarration.EX_ELEPHANT_DISH.en,
  ],
  [
    'EX_ELEPHANT_DISH',
    'fr',
    'Plat à l’éléphant parmi les nuages',
    'Plat vietnamien bleu et blanc des XVe–XVIe siècles.',
    demoNarration.EX_ELEPHANT_DISH.fr,
  ],
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo collection seed is disabled in production.');
  }
  const apply = process.argv.includes('--apply');
  const existing = await prisma.exhibit.findMany({
    where: { code: { in: metExhibits.map((seed) => seed.code) } },
    include: { translations: true, media: true },
  });
  const byCode = new Map(existing.map((row) => [row.code, row]));
  const missing = metExhibits.filter((seed) => !byCode.has(seed.code));

  for (const seed of metExhibits) {
    const row = byCode.get(seed.code);
    if (!row) continue;
    const vi = row.translations.find((item) => item.languageCode === 'vi');
    const copy = seed.translations[0];
    if (
      row.defaultTitle !== seed.defaultTitle ||
      row.status !== seed.status ||
      vi?.title !== copy.title ||
      vi.shortDescription !== copy.shortDescription ||
      vi.description !== copy.description ||
      !row.media.some((item) => item.url === `/uploads/images/${seed.asset}`)
    ) {
      throw new Error(
        `${seed.code} already exists with edited content. Resolve this code collision manually.`,
      );
    }
  }

  // Check every source and destination before changing either files or rows.
  const destination = path.resolve(process.cwd(), uploadRoot, 'images');
  for (const seed of metExhibits) {
    if (!seed.asset) throw new Error(`${seed.code} has no image.`);
    const source = path.join(__dirname, 'seed-assets', 'images', seed.asset);
    const bundled = await fs.readFile(source);
    const target = path.join(destination, seed.asset);
    try {
      const installed = await fs.readFile(target);
      if (!installed.equals(bundled)) {
        throw new Error(`${target} already exists with different image bytes.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  const removeLegacy: string[] = [];
  const preservedLegacy: string[] = [];
  for (const [code, language, title, shortDescription, description] of legacyCopy) {
    const row = await prisma.exhibit.findUnique({
      where: { code },
      include: { translations: true },
    });
    const copy = row?.translations.find((item) => item.languageCode === language);
    if (!copy) continue;
    if (
      copy.title === title &&
      copy.shortDescription === shortDescription &&
      copy.description === description &&
      !copy.audioUrl &&
      !copy.sourceHash
    )
      removeLegacy.push(copy.id);
    else preservedLegacy.push(`${code}/${language}`);
  }

  console.log(
    `Collection: ${metExhibits.length} sourced records; ${missing.length} to create; ${existing.length} already installed.`,
  );
  console.log(
    `Legacy manual translations: ${removeLegacy.length} exact demo rows to remove; ${preservedLegacy.length} edited or AI rows preserved.`,
  );
  if (preservedLegacy.length) console.log(`Preserved: ${preservedLegacy.join(', ')}`);
  if (!apply) {
    console.log(
      'Dry run only. Pass --apply to add the missing records and remove exact legacy demo translations.',
    );
    return;
  }

  await fs.mkdir(destination, { recursive: true });
  for (const seed of metExhibits) {
    const source = path.join(__dirname, 'seed-assets', 'images', seed.asset!);
    await fs.copyFile(source, path.join(destination, seed.asset!));
  }
  await prisma.$transaction(async (tx) => {
    for (const seed of missing) {
      await tx.exhibit.create({
        data: {
          code: seed.code,
          defaultTitle: seed.defaultTitle,
          status: seed.status,
          translations: { create: seed.translations },
          media: {
            create: [
              {
                type: MediaType.IMAGE,
                url: `/uploads/images/${seed.asset}`,
                caption: seed.mediaCaption ?? seed.defaultTitle,
                sortOrder: 0,
              },
            ],
          },
        },
      });
    }
    if (removeLegacy.length) {
      await tx.exhibitTranslation.deleteMany({ where: { id: { in: removeLegacy } } });
    }
  });
  console.log(
    `Added ${missing.length} Vietnamese-source exhibits. Existing staff, zones, assignments and edited translations were preserved.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
