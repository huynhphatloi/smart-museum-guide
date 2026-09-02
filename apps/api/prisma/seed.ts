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
import { BeaconProtocol, ExhibitStatus, MediaType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import * as path from 'path';

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

/** Copies the bundled placeholder media into the local upload directory. */
async function copySeedAssets(): Promise<void> {
  const source = path.join(__dirname, 'seed-assets');
  const target = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);

  for (const folder of ['audio', 'images']) {
    const from = path.join(source, folder);
    const to = path.join(target, folder);
    await fs.mkdir(to, { recursive: true });
    const entries = await fs.readdir(from);
    for (const entry of entries) {
      await fs.copyFile(path.join(from, entry), path.join(to, entry));
    }
  }
  console.log(`  media placeholders copied into ${UPLOAD_DIR}/`);
}

interface ExhibitSeed {
  code: string;
  defaultTitle: string;
  status: ExhibitStatus;
  asset: string | null;
  translations: {
    languageCode: string;
    title: string;
    shortDescription: string;
    description: string;
    audio?: string;
  }[];
}

const exhibits: ExhibitSeed[] = [
  {
    code: 'EX_CHAM_STATUE',
    defaultTitle: 'Tượng đá Chăm - Thần Shiva',
    status: ExhibitStatus.PUBLISHED,
    asset: 'cham-statue',
    translations: [
      {
        languageCode: 'vi',
        title: 'Tượng đá Chăm - Thần Shiva',
        shortDescription: 'Tác phẩm điêu khắc sa thạch thế kỷ X từ thánh địa Mỹ Sơn.',
        description:
          'Bức tượng sa thạch này khắc họa thần Shiva trong tư thế thiền định, được tạc vào khoảng thế kỷ X dưới vương triều Chăm Pa. ' +
          'Những đường nét mềm mại ở vai và cách xử lý trang phục cho thấy ảnh hưởng của nghệ thuật Ấn Độ giáo, trong khi khuôn mặt vuông vức ' +
          'và đôi lông mày liền nhau là đặc trưng riêng của phong cách Trà Kiệu. Hiện vật được tìm thấy trong đợt khai quật tại Mỹ Sơn.',
        audio: 'cham-statue-vi.wav',
      },
      {
        languageCode: 'en',
        title: 'Cham Sandstone Statue - Shiva',
        shortDescription: 'A 10th-century sandstone sculpture from the My Son sanctuary.',
        description:
          'This sandstone figure depicts Shiva seated in meditation and was carved around the 10th century during the Champa kingdom. ' +
          'The softly modelled shoulders and the treatment of the garment show clear Hindu artistic influence, while the square face and ' +
          'joined eyebrows are characteristic of the Tra Kieu style. The piece was recovered during excavations at My Son.',
        audio: 'cham-statue-en.wav',
      },
      {
        languageCode: 'ja',
        title: 'チャム砂岩像 - シヴァ神',
        shortDescription: 'ミーソン聖域から出土した10世紀の砂岩彫刻。',
        description:
          '瞑想の姿勢をとるシヴァ神を表したこの砂岩像は、チャンパ王国時代の10世紀ごろに制作されました。' +
          '肩の柔らかな造形と衣の表現にヒンドゥー美術の影響が見られ、角ばった顔立ちと繋がった眉はチャキュウ様式の特徴です。',
      },
    ],
  },
  {
    code: 'EX_DONGSON_DRUM',
    defaultTitle: 'Trống đồng Đông Sơn',
    status: ExhibitStatus.PUBLISHED,
    asset: 'dongson-drum',
    translations: [
      {
        languageCode: 'vi',
        title: 'Trống đồng Đông Sơn',
        shortDescription: 'Trống đồng loại I với hoa văn ngôi sao mười bốn cánh.',
        description:
          'Trống đồng Đông Sơn là biểu tượng tiêu biểu của văn hóa Đông Sơn, niên đại khoảng 700 năm trước Công nguyên đến thế kỷ I. ' +
          'Mặt trống trang trí ngôi sao mười bốn cánh ở trung tâm, bao quanh là các vành hoa văn hình chim Lạc, người hóa trang lông chim ' +
          'và thuyền chiến. Kỹ thuật đúc khuôn sáp mất cho thấy trình độ luyện kim rất cao của cư dân Việt cổ.',
        audio: 'dongson-drum-vi.wav',
      },
      {
        languageCode: 'en',
        title: 'Dong Son Bronze Drum',
        shortDescription: 'A Heger type I drum with a fourteen-pointed star motif.',
        description:
          'The Dong Son bronze drum is the emblematic artefact of the Dong Son culture, dated between roughly 700 BCE and the 1st century CE. ' +
          'A fourteen-pointed star occupies the centre of the tympanum, ringed by bands of Lac birds, feather-costumed figures and war canoes. ' +
          'The lost-wax casting technique demonstrates the remarkable metallurgical skill of the ancient Viet people.',
        audio: 'dongson-drum-en.wav',
      },
    ],
  },
  {
    code: 'EX_HANG_TRONG_PAINTING',
    defaultTitle: 'Tranh dân gian Hàng Trống',
    status: ExhibitStatus.PUBLISHED,
    asset: 'hang-trong-painting',
    translations: [
      {
        languageCode: 'vi',
        title: 'Tranh dân gian Hàng Trống',
        shortDescription: 'Dòng tranh khắc gỗ Hà Nội với kỹ thuật tô màu bằng bút lông.',
        description:
          'Tranh Hàng Trống ra đời tại khu phố cổ Hà Nội từ thế kỷ XVII. Nghệ nhân in nét đen bằng ván khắc gỗ, sau đó tô màu bằng bút lông ' +
          'với kỹ thuật vờn màu tạo độ chuyển tinh tế - điểm khác biệt so với tranh Đông Hồ. Đề tài thường là tranh thờ, tranh Tết và tích truyện dân gian.',
        audio: 'hang-trong-painting-vi.wav',
      },
      {
        languageCode: 'en',
        title: 'Hang Trong Folk Painting',
        shortDescription: 'A Hanoi woodblock tradition finished by hand with a brush.',
        description:
          'Hang Trong painting emerged in the old quarter of Hanoi in the 17th century. Artisans print the black outline from a carved ' +
          'woodblock and then colour the sheet by hand, blending pigment with a brush to create soft gradients - the feature that ' +
          'distinguishes it from Dong Ho printing. Subjects are typically devotional images, New Year prints and folk tales.',
        audio: 'hang-trong-painting-en.wav',
      },
    ],
  },
  {
    code: 'EX_MODERN_LACQUER',
    defaultTitle: 'Tranh sơn mài hiện đại',
    status: ExhibitStatus.PUBLISHED,
    asset: 'modern-lacquer',
    translations: [
      {
        languageCode: 'vi',
        title: 'Tranh sơn mài hiện đại',
        shortDescription: 'Sơn mài trên vóc, kết hợp vỏ trứng và bạc lá.',
        description:
          'Tác phẩm sơn mài hiện đại tiếp nối kỹ thuật truyền thống với nhiều lớp sơn ta phủ lên tấm vóc, xen kẽ vỏ trứng nghiền và bạc lá. ' +
          'Mỗi lớp phải khô trong môi trường ẩm rồi được mài phẳng, quá trình lặp lại hàng chục lần để tạo chiều sâu ánh sáng đặc trưng.',
        audio: 'modern-lacquer-vi.wav',
      },
      {
        languageCode: 'en',
        title: 'Modern Lacquer Panel',
        shortDescription: 'Vietnamese lacquer on wood with eggshell inlay and silver leaf.',
        description:
          'This contemporary work continues the traditional lacquer process: many layers of natural resin are built up on a wooden panel, ' +
          'interleaved with crushed eggshell and silver leaf. Each layer must cure in a humid room and is then sanded flat, a cycle repeated ' +
          'dozens of times to produce the characteristic depth of light.',
        audio: 'modern-lacquer-en.wav',
      },
      {
        languageCode: 'fr',
        title: 'Panneau de laque contemporain',
        shortDescription: 'Laque vietnamienne sur bois, coquille d oeuf et feuille d argent.',
        description:
          "Cette oeuvre contemporaine perpétue le procédé traditionnel de la laque : de nombreuses couches de résine naturelle sont " +
          "appliquées sur un panneau de bois, entrecoupées de coquille d'oeuf concassée et de feuille d'argent.",
      },
    ],
  },
  {
    code: 'EX_TEXTILE_DRAFT',
    defaultTitle: 'Thổ cẩm Tây Nguyên (bản nháp)',
    status: ExhibitStatus.DRAFT,
    asset: null,
    translations: [
      {
        languageCode: 'vi',
        title: 'Thổ cẩm Tây Nguyên',
        shortDescription: 'Hiện vật đang biên soạn nội dung - chưa xuất bản.',
        description:
          'Bản ghi này cố ý ở trạng thái DRAFT để minh họa: hiện vật chưa xuất bản sẽ không bao giờ được trả về cho khách tham quan.',
      },
    ],
  },
];

async function main(): Promise<void> {
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
      name: 'Modern Art',
      floor: '2',
      description: 'Khu nghệ thuật hiện đại - Modern art hall.',
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
            audioUrl: translation.audio ? `/uploads/audio/${translation.audio}` : null,
          })),
        },
        media: seed.asset
          ? {
              create: [
                {
                  type: MediaType.IMAGE,
                  url: `/uploads/images/${seed.asset}.svg`,
                  caption: seed.defaultTitle,
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
      exhibit: 'EX_MODERN_LACQUER',
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

  console.log('\nSeed complete.');
  console.log(`  Admin login : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  QR demo     : ${VISITOR_WEB_URL}/q/ZONE_A01`);
  console.log(
    `  Beacons     : Eddystone UID namespace ${MUSEUM_NAMESPACE}, instances ...0001/0002/0003 ` +
      `(Tx ${TX_POWER_DBM} dBm, ${ADVERTISING_INTERVAL_MS} ms)`,
  );
  console.log(
    '  Rotation    : change a zone\'s current exhibit in the CMS - BLE and QR follow, hardware untouched.',
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
