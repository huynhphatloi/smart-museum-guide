'use client';

import { Radar, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { ScannedBeacon, scanForBeacons } from '@/lib/ble-scan';
import { useI18n } from '@/lib/i18n';

const SCAN_SECONDS = 6;

export function BeaconScanner({ onSelect }: { onSelect: (beacon: ScannedBeacon) => void }) {
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<ScannedBeacon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function scan() {
    setError(null);
    setScanning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await scanForBeacons(SCAN_SECONDS, controller.signal);
      setFound(result.beacons);
      setRan(true);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof ApiError ? caught.message : t('scanFailed'));
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t('findNearby')}</p>
          <p className="text-xs text-muted-foreground">{t('pickToFill')}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void scan()}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
              {t('scanning')}
            </>
          ) : (
            <>
              <Radar className="mr-1 h-3.5 w-3.5" />
              {t('scan')}
            </>
          )}
        </Button>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {scanning ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('scanListening', { seconds: String(SCAN_SECONDS) })}
        </p>
      ) : null}

      {ran && !scanning && found.length === 0 && !error ? (
        <p className="mt-3 text-xs text-muted-foreground">{t('noBeaconsHeard')}</p>
      ) : null}

      {found.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">
            {t('beaconsFound', { count: String(found.length) })}
          </p>
          <ul className="mt-1.5 max-h-44 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
            {found.map((beacon) => (
              <li key={beacon.beaconId}>
                <button
                  type="button"
                  onClick={() => onSelect(beacon)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {beacon.protocol === 'EDDYSTONE_UID' ? t('eddystone') : t('iBeacon')}
                      </Badge>
                      {beacon.registeredAs ? (
                        <Badge variant="success">
                          {beacon.registeredAs} · {beacon.registeredZone}
                        </Badge>
                      ) : (
                        <Badge variant="warning">{t('notRegistered')}</Badge>
                      )}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {beacon.protocol === 'EDDYSTONE_UID'
                        ? `${beacon.namespaceId} · ${beacon.instanceId}`
                        : `${beacon.uuid} · ${beacon.major}/${beacon.minor}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {beacon.rssi} dBm · {beacon.seen}×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
