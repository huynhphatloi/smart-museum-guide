import { API_URL } from '../../guide/api/client';
import { AccessSource, AccessTracker } from './access-tracker';

const tracker = new AccessTracker(
  {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
  },
  async (event) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_URL}/public/exhibit-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: controller.signal,
        keepalive: true,
      });
      if (!response.ok) throw new Error('Visit was not recorded.');
    } finally {
      window.clearTimeout(timeout);
    }
  },
);

export function trackExhibitVisit(
  data: { exhibitId: string; zoneCode: string },
  source: AccessSource,
): void {
  if (document.visibilityState !== 'visible') return;
  void tracker.track({
    exhibitId: data.exhibitId,
    zoneCode: data.zoneCode,
    source,
    platform: 'WEB',
  });
}
