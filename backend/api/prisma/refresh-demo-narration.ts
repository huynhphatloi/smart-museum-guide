/* eslint-disable no-console */
/** Safely replaces only the first short demo descriptions with full reading scripts. */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { demoNarration } from './demo-narration';

const prisma = new PrismaClient();
const originalHashes: Record<string, Record<string, string>> = {
  EX_CHAM_STATUE: {
    vi: '06d68dc45e5217d954434564dc1c4220116ee60599b1901c9402e45ca2ebf510',
    en: '7d11b74cbe32b88257ffe3656c2b79460c07fefc4d3106c753a40906e89cda97',
    ja: 'a54aafbf87d54a23952e7c29a98b4211c6cc3cdefa32a0d8eb0994b084590b3e',
  },
  EX_DONGSON_DRUM: {
    vi: '00e0b7d11ec5d5ed697883c2171010371ea0b2c9cc533b364e05e1f6846e98a9',
    en: '8a50132d754abac77f231ba3939b15219da402ec8fca30a015b22cb9132de54a',
  },
  EX_HANG_TRONG_PAINTING: {
    vi: '8149d92f12b2f1c4fc32828030c4be2fa2361b33e6e62afd13318bc3638b98b7',
    en: 'f6b1bab4b647b75f2606760980acd93495737dd99488286c13d2203637441183',
  },
  EX_ELEPHANT_DISH: {
    vi: '4c4d603596904389520b27aa517b23675f51a8da5d58a8f221ec73d7b4696137',
    en: 'e177d8cc4b71bc209cbe03564dd6112b734f9a23785e505237764506cc9d72db',
    fr: '011ae88355db5729e08b0693bd5ec6042194e20305e1a7db947d99345da8ab5d',
  },
};

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo narration refresh is disabled in production.');
  }

  const updates: {
    id: string;
    code: string;
    language: string;
    oldDescription: string | null;
    description: string;
  }[] = [];
  for (const [code, translations] of Object.entries(demoNarration)) {
    const exhibit = await prisma.exhibit.findUnique({
      where: { code },
      include: { translations: true },
    });
    if (!exhibit) throw new Error(`Missing demo exhibit ${code}.`);
    for (const [language, description] of Object.entries(translations)) {
      const current = exhibit.translations.find((row) => row.languageCode === language);
      if (!current) throw new Error(`Missing ${language} translation for ${code}.`);
      if (current.description === description) continue;
      if (hash(current.description ?? '') !== originalHashes[code]?.[language]) {
        throw new Error(`${code}/${language} was edited after the first demo seed; leaving all copy unchanged.`);
      }
      updates.push({ id: current.id, code, language, oldDescription: current.description, description });
    }
  }

  console.log(`Validated demo copy. ${updates.length} narration scripts need updating.`);
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply to update these demo descriptions.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      const result = await tx.exhibitTranslation.updateMany({
        where: { id: item.id, description: item.oldDescription },
        data: { description: item.description },
      });
      if (result.count !== 1) {
        throw new Error(`Copy changed while updating ${item.code}/${item.language}.`);
      }
    }
  });
  console.log(`Updated ${updates.length} narration scripts without changing titles, media, audio or schedules.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
