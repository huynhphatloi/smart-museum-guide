/**
 * Tiny UI dictionary. Exhibit copy itself always comes from the backend - this
 * only covers chrome (buttons, error states). Unknown languages fall back to
 * English, which mirrors the backend's translation fallback rule.
 */
const DICTIONARY = {
  en: {
    appName: 'Museum Guide',
    zone: 'Zone',
    listen: 'Listen to the narration',
    language: 'Language',
    loading: 'Loading the exhibit...',
    fallbackNotice:
      'This exhibit is not available in your language yet. Showing {language} instead.',
    errorZoneTitle: 'Zone not found',
    errorZoneBody:
      'This QR code does not match any zone in this museum. Please ask a member of staff.',
    errorNoExhibitTitle: 'Nothing on display here right now',
    errorNoExhibitBody:
      'No exhibit is scheduled for this zone at the moment. Please try another zone.',
    errorNetworkTitle: 'Cannot reach the museum server',
    errorNetworkBody: 'Check your connection and try again.',
    retry: 'Try again',
    gallery: 'Gallery',
    invalidQrTitle: 'Invalid QR code',
    invalidQrBody: 'Scan the QR code printed next to an exhibit, or type a zone code below.',
    openZone: 'Open zone',
    zoneCodePlaceholder: 'e.g. ZONE_A01',
    noAudio: 'No narration is available in this language.',
    poweredBy: 'No app or account needed.',
  },
  vi: {
    appName: 'Hướng dẫn tham quan',
    zone: 'Khu vực',
    listen: 'Nghe thuyết minh',
    language: 'Ngôn ngữ',
    loading: 'Đang tải hiện vật...',
    fallbackNotice:
      'Hiện vật chưa có bản dịch cho ngôn ngữ của bạn. Đang hiển thị bằng {language}.',
    errorZoneTitle: 'Không tìm thấy khu vực',
    errorZoneBody: 'Mã QR này không khớp với khu vực nào trong bảo tàng. Vui lòng hỏi nhân viên.',
    errorNoExhibitTitle: 'Hiện chưa có hiện vật trưng bày',
    errorNoExhibitBody: 'Khu vực này chưa được xếp lịch trưng bày. Vui lòng thử khu vực khác.',
    errorNetworkTitle: 'Không kết nối được máy chủ',
    errorNetworkBody: 'Vui lòng kiểm tra kết nối mạng và thử lại.',
    retry: 'Thử lại',
    gallery: 'Hình ảnh',
    invalidQrTitle: 'Mã QR không hợp lệ',
    invalidQrBody: 'Hãy quét mã QR đặt cạnh hiện vật, hoặc nhập mã khu vực bên dưới.',
    openZone: 'Mở khu vực',
    zoneCodePlaceholder: 'ví dụ ZONE_A01',
    noAudio: 'Chưa có thuyết minh cho ngôn ngữ này.',
    poweredBy: 'Không cần cài ứng dụng hay đăng nhập.',
  },
  ja: {
    appName: '博物館ガイド',
    zone: 'エリア',
    listen: '音声ガイドを聞く',
    language: '言語',
    loading: '展示を読み込んでいます...',
    fallbackNotice: 'この展示はお使いの言語にまだ対応していません。{language} で表示します。',
    errorZoneTitle: 'エリアが見つかりません',
    errorZoneBody: 'このQRコードは当館のどのエリアとも一致しません。係員にお尋ねください。',
    errorNoExhibitTitle: '現在展示はありません',
    errorNoExhibitBody: 'このエリアには現在展示が予定されていません。',
    errorNetworkTitle: 'サーバーに接続できません',
    errorNetworkBody: '接続を確認してもう一度お試しください。',
    retry: '再試行',
    gallery: 'ギャラリー',
    invalidQrTitle: '無効なQRコード',
    invalidQrBody: '展示の横に掲示されたQRコードを読み取ってください。',
    openZone: 'エリアを開く',
    zoneCodePlaceholder: '例: ZONE_A01',
    noAudio: 'この言語の音声ガイドはありません。',
    poweredBy: 'アプリも登録も不要です。',
  },
  ko: {
    appName: '박물관 가이드',
    zone: '구역',
    listen: '해설 듣기',
    language: '언어',
    loading: '전시물을 불러오는 중...',
    fallbackNotice: '이 전시물은 아직 해당 언어를 지원하지 않습니다. {language}(으)로 표시합니다.',
    errorZoneTitle: '구역을 찾을 수 없습니다',
    errorZoneBody: '이 QR 코드는 박물관의 어떤 구역과도 일치하지 않습니다.',
    errorNoExhibitTitle: '현재 전시 중인 작품이 없습니다',
    errorNoExhibitBody: '이 구역에는 현재 예정된 전시가 없습니다.',
    errorNetworkTitle: '서버에 연결할 수 없습니다',
    errorNetworkBody: '연결 상태를 확인한 후 다시 시도해 주세요.',
    retry: '다시 시도',
    gallery: '갤러리',
    invalidQrTitle: '잘못된 QR 코드',
    invalidQrBody: '전시물 옆에 있는 QR 코드를 스캔해 주세요.',
    openZone: '구역 열기',
    zoneCodePlaceholder: '예: ZONE_A01',
    noAudio: '이 언어의 해설이 없습니다.',
    poweredBy: '앱 설치나 계정이 필요 없습니다.',
  },
  zh: {
    appName: '博物馆导览',
    zone: '展区',
    listen: '收听讲解',
    language: '语言',
    loading: '正在加载展品...',
    fallbackNotice: '该展品暂无您所选语言的版本，现以{language}显示。',
    errorZoneTitle: '未找到展区',
    errorZoneBody: '此二维码与本馆任何展区都不匹配，请咨询工作人员。',
    errorNoExhibitTitle: '此处暂无展品',
    errorNoExhibitBody: '该展区目前没有安排展品。',
    errorNetworkTitle: '无法连接服务器',
    errorNetworkBody: '请检查网络后重试。',
    retry: '重试',
    gallery: '图库',
    invalidQrTitle: '二维码无效',
    invalidQrBody: '请扫描展品旁的二维码。',
    openZone: '打开展区',
    zoneCodePlaceholder: '例如 ZONE_A01',
    noAudio: '该语言暂无讲解音频。',
    poweredBy: '无需安装应用或注册账号。',
  },
  fr: {
    appName: 'Guide du musée',
    zone: 'Zone',
    listen: 'Écouter le commentaire',
    language: 'Langue',
    loading: "Chargement de l'oeuvre...",
    fallbackNotice:
      "Cette oeuvre n'est pas encore disponible dans votre langue. Affichage en {language}.",
    errorZoneTitle: 'Zone introuvable',
    errorZoneBody:
      'Ce QR code ne correspond à aucune zone du musée. Demandez à un membre du personnel.',
    errorNoExhibitTitle: 'Rien exposé ici pour le moment',
    errorNoExhibitBody: "Aucune oeuvre n'est programmée dans cette zone actuellement.",
    errorNetworkTitle: 'Serveur injoignable',
    errorNetworkBody: 'Vérifiez votre connexion puis réessayez.',
    retry: 'Réessayer',
    gallery: 'Galerie',
    invalidQrTitle: 'QR code invalide',
    invalidQrBody: "Scannez le QR code affiché à côté d'une oeuvre.",
    openZone: 'Ouvrir la zone',
    zoneCodePlaceholder: 'ex. ZONE_A01',
    noAudio: 'Aucun commentaire audio dans cette langue.',
    poweredBy: 'Ni application ni compte requis.',
  },
} as const;

export type UiLanguage = keyof typeof DICTIONARY;
export type UiKey = keyof (typeof DICTIONARY)['en'];

export const UI_LANGUAGES = Object.keys(DICTIONARY) as UiLanguage[];

export const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  es: 'Español',
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}

/** Translates a UI key, falling back to English for unsupported languages. */
export function t(language: string, key: UiKey, vars: Record<string, string> = {}): string {
  const base = language.toLowerCase().split('-')[0] as UiLanguage;
  const table = DICTIONARY[base] ?? DICTIONARY.en;
  const template: string = table[key] ?? DICTIONARY.en[key];
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    template,
  );
}
