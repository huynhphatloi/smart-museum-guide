export interface VisitCounts {
  visits: number;
  devices: number;
  qr: number;
  ble: number;
  manual: number;
}
export interface VisitAnalytics {
  range: { from: string; to: string; timeZone: string };
  generatedAt: string;
  dedupMinutes: number;
  totals: VisitCounts;
  peakHours: number[];
  exhibits: Array<
    VisitCounts & { exhibitId: string | null; code: string; title: string; lastVisitAt: string }
  >;
  hourly: Array<VisitCounts & { hour: number }>;
  daily: Array<VisitCounts & { date: string }>;
  history: {
    page: number;
    pageSize: number;
    total: number;
    items: Array<{
      id: string;
      exhibitId: string | null;
      exhibitCode: string;
      exhibitTitle: string;
      zoneCode: string;
      source: string;
      platform: string;
      occurredAt: string;
    }>;
  };
}
