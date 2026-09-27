/* eslint-disable no-console */
/**
 * Seed data for the Smart Multilingual Museum Guide.
 *
 * Produces a dataset that demonstrates the central architectural idea:
 * the beacon and the QR code stay put, while the exhibit assigned to a zone
 * changes on a schedule. ZONE_A01 deliberately holds two consecutive
 * assignments so the rotation can be demonstrated without editing anything.
 *
 * Run with: npm run db:seed
 */
import { BeaconProtocol, MediaType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exhibits } from './demo-content';
import { seedDemoRoom } from './seed-positioning';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@museum.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
const VISITOR_WEB_URL = (process.env.VISITOR_WEB_URL ?? 'http://localhost:4173').replace(/\/$/, '');
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// --- demo timeline ---------------------------------------------------------
// Derived from "today" so the seed stays meaningful whenever a student runs it.
// Each zone gets exactly one open ended assignment - "what is in the room" -
// plus one closed assignment in ZONE_A01 so the history view has content.
const now = new Date();
const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

const iso = (date: Date): string => date.toISOString().slice(0, 10);

/** Copies the bundled demo media into the local upload directory. */
async function copySeedAssets(): Promise<void> {
  const from = path.join(__dirname, 'seed-assets', 'images');
  const target = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
  const to = path.join(target, 'images');
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from);
  for (const entry of entries) {
    await fs.copyFile(path.join(from, entry), path.join(to, entry));
  }
  console.log(`  demo images copied into ${UPLOAD_DIR}/images/`);
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production. Create museum content and staff accounts separately.');
  }
  console.log('Seeding Smart Museum Guide...');

  // Clean slate, in dependency order.
  await prisma.exhibitAssignment.deleteMany();
  await prisma.exhibitMedia.deleteMany();
  await prisma.exhibitTranslation.deleteMany();
  await prisma.exhibit.deleteMany();
  await prisma.beacon.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.adminUser.deleteMany();

  await copySeedAssets();

  const admin = await prisma.adminUser.create({
    data: {
      email: ADMIN_EMAIL.toLowerCase(),
      name: 'Museum Administrator',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
    },
  });
  console.log(`  admin: ${admin.email}`);

  // Matches the prototype hardware: Minew i3, configured with BeaconSET+ to
  // advertise Eddystone UID *and* iBeacon from the same unit.
  //   - Eddystone UID  -> foreground detection on both Android and iOS
  //   - iBeacon        -> the identity iOS Core Location would monitor
  // Tx power is turned DOWN, not up: a 200 m beacon makes museum zones overlap.
  const MUSEUM_NAMESPACE = 'a1b2c3d4e5f607182930';
  const IBEACON_UUID = 'f7826da6-4fa2-4e98-8024-bc5b71e0893e';
  const TX_POWER_DBM = -8;
  const ADVERTISING_INTERVAL_MS = 500;

  const zoneSeeds = [
    {
      code: 'ZONE_A01',
      name: 'Ancient Sculpture',
      floor: '1',
      description: 'Khu điêu khắc cổ - Ancient sculpture hall, east wing.',
      beacon: {
        identifier: 'BEACON_A01',
        name: 'Minew i3 - Gallery A01',
        instanceId: '000000000001',
        major: 1,
        minor: 1,
      },
    },
    {
      code: 'ZONE_A02',
      name: 'Traditional Painting',
      floor: '1',
      description: 'Khu tranh dân gian - Traditional painting gallery.',
      beacon: {
        identifier: 'BEACON_A02',
        name: 'Minew i3 - Gallery A02',
        instanceId: '000000000002',
        major: 1,
        minor: 2,
      },
    },
    {
      code: 'ZONE_B01',
      name: 'Vietnamese Ceramics',
      floor: '2',
      description: 'Khu gốm Việt Nam - Vietnamese ceramics gallery.',
      beacon: {
        identifier: 'BEACON_B01',
        name: 'Minew i3 - Hall B01',
        instanceId: '000000000003',
        major: 1,
        minor: 3,
      },
    },
  ];

  const zones: Record<string, string> = {};

  for (const seed of zoneSeeds) {
    const zone = await prisma.zone.create({
      data: {
        code: seed.code,
        name: seed.name,
        floor: seed.floor,
        description: seed.description,
        qrCode: `${VISITOR_WEB_URL}/q/${seed.code}`,
        beacons: {
          create: {
            identifier: seed.beacon.identifier,
            name: seed.beacon.name,
            protocol: BeaconProtocol.EDDYSTONE_UID,
            namespaceId: MUSEUM_NAMESPACE,
            instanceId: seed.beacon.instanceId,
            uuid: IBEACON_UUID,
            major: seed.beacon.major,
            minor: seed.beacon.minor,
            txPower: TX_POWER_DBM,
            advertisingIntervalMs: ADVERTISING_INTERVAL_MS,
            enabled: true,
          },
        },
      },
    });
    zones[seed.code] = zone.id;
    console.log(
      `  zone ${zone.code} + beacon ${seed.beacon.identifier} ` +
        `(eddystone ${MUSEUM_NAMESPACE}:${seed.beacon.instanceId})`,
    );
  }

  const exhibitIds: Record<string, string> = {};

  for (const seed of exhibits) {
    const exhibit = await prisma.exhibit.create({
      data: {
        code: seed.code,
        defaultTitle: seed.defaultTitle,
        status: seed.status,
        translations: {
          create: seed.translations.map((translation) => ({
            languageCode: translation.languageCode,
            title: translation.title,
            shortDescription: translation.shortDescription,
            description: translation.description,
            audioUrl: null,
          })),
        },
        media: seed.asset
          ? {
              create: [
                {
                  type: MediaType.IMAGE,
                  url: `/uploads/images/${seed.asset}`,
                  caption: seed.mediaCaption ?? seed.defaultTitle,
                  sortOrder: 0,
                },
              ],
            }
          : undefined,
      },
    });
    exhibitIds[seed.code] = exhibit.id;
    console.log(
      `  exhibit ${exhibit.code} [${exhibit.status}] with ${seed.translations.length} translation(s)`,
    );
  }

  // --- what is in each room ------------------------------------------------
  // One open ended assignment per zone, plus one closed assignment so the
  // zone history has something to show.
  const assignments = [
    {
      zone: 'ZONE_A01',
      exhibit: 'EX_DONGSON_DRUM',
      activeFrom: startOfYear,
      activeTo: startOfPrevMonth,
      note: 'Previously on display in this zone.',
    },
    {
      zone: 'ZONE_A01',
      exhibit: 'EX_CHAM_STATUE',
      activeFrom: startOfPrevMonth,
      activeTo: null,
      note: 'Currently on display.',
    },
    {
      zone: 'ZONE_A02',
      exhibit: 'EX_HANG_TRONG_PAINTING',
      activeFrom: startOfYear,
      activeTo: null,
      note: 'Currently on display.',
    },
    {
      zone: 'ZONE_B01',
      exhibit: 'EX_ELEPHANT_DISH',
      activeFrom: startOfPrevMonth,
      activeTo: null,
      note: 'Currently on display.',
    },
  ];

  for (const assignment of assignments) {
    await prisma.exhibitAssignment.create({
      data: {
        zoneId: zones[assignment.zone],
        exhibitId: exhibitIds[assignment.exhibit],
        activeFrom: assignment.activeFrom,
        activeTo: assignment.activeTo,
        note: assignment.note,
      },
    });
    console.log(
      `  display  ${assignment.zone} -> ${assignment.exhibit} ` +
        `[${iso(assignment.activeFrom)} .. ${assignment.activeTo ? iso(assignment.activeTo) : 'open'})`,
    );
  }

  // --- indoor positioning demo room -----------------------------------------
  await seedDemoRoom(prisma);

  console.log('\nSeed complete.');
  console.log(`  Admin login : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  QR demo     : ${VISITOR_WEB_URL}/q/ZONE_A01`);
  console.log(
    `  Beacons     : Eddystone UID namespace ${MUSEUM_NAMESPACE}, instances ...0001/0002/0003 ` +
      `(Tx ${TX_POWER_DBM} dBm, ${ADVERTISING_INTERVAL_MS} ms)`,
  );
  console.log(
    "  Rotation    : change a zone's current exhibit in the CMS - BLE and QR follow, hardware untouched.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
