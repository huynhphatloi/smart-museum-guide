import { ExhibitStatus } from '@prisma/client';
import { demoNarration } from './demo-narration';
import { metExhibits } from './met-collection';

export interface ExhibitSeed {
  code: string;
  defaultTitle: string;
  status: ExhibitStatus;
  asset: string | null;
  mediaCaption?: string;
  translations: {
    languageCode: string;
    title: string;
    shortDescription: string;
    description: string;
  }[];
}

export const exhibits: ExhibitSeed[] = [
  {
    code: 'EX_CHAM_STATUE',
    defaultTitle: 'Tượng Isana từ Mỹ Sơn',
    status: ExhibitStatus.PUBLISHED,
    asset: 'isana-my-son.jpg',
    mediaCaption: 'Isana, Mỹ Sơn B, thế kỷ X. Ảnh: Daderot / Wikimedia Commons (CC0).',
    translations: [
      {
        languageCode: 'vi',
        title: 'Tượng Isana từ Mỹ Sơn',
        shortDescription: 'Tượng Chăm thế kỷ X từ khu Mỹ Sơn B, Quảng Nam.',
        description: demoNarration.EX_CHAM_STATUE.vi,
      },
    ],
  },
  {
    code: 'EX_DONGSON_DRUM',
    defaultTitle: 'Trống đồng Đông Sơn',
    status: ExhibitStatus.PUBLISHED,
    asset: 'dong-son-drum.jpg',
    mediaCaption: 'Trống đồng Đông Sơn. Ảnh: Gary Todd / Wikimedia Commons (CC0).',
    translations: [
      {
        languageCode: 'vi',
        title: 'Trống đồng Đông Sơn',
        shortDescription: 'Mặt trống đồng với họa tiết ngôi sao và các vòng hoa văn.',
        description: demoNarration.EX_DONGSON_DRUM.vi,
      },
    ],
  },
  {
    code: 'EX_HANG_TRONG_PAINTING',
    defaultTitle: 'Tranh Ngũ Hổ Hàng Trống',
    status: ExhibitStatus.PUBLISHED,
    asset: 'five-tigers-hang-trong.jpg',
    mediaCaption: 'Tranh Ngũ Hổ Hàng Trống. Ảnh: Daderot / Wikimedia Commons (CC0).',
    translations: [
      {
        languageCode: 'vi',
        title: 'Tranh Ngũ Hổ Hàng Trống',
        shortDescription: 'Bức tranh dân gian Hàng Trống mô tả năm con hổ.',
        description: demoNarration.EX_HANG_TRONG_PAINTING.vi,
      },
    ],
  },
  {
    code: 'EX_ELEPHANT_DISH',
    defaultTitle: 'Đĩa gốm hình voi giữa mây',
    status: ExhibitStatus.PUBLISHED,
    asset: 'vietnamese-elephant-dish.jpg',
    mediaCaption:
      'Đĩa gốm Việt Nam, thế kỷ XV–XVI. The Metropolitan Museum of Art, 1998.213 (Public Domain).',
    translations: [
      {
        languageCode: 'vi',
        title: 'Đĩa gốm hình voi giữa mây',
        shortDescription: 'Đĩa gốm Việt Nam thế kỷ XV–XVI trang trí men lam.',
        description: demoNarration.EX_ELEPHANT_DISH.vi,
      },
    ],
  },
  ...metExhibits,
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
