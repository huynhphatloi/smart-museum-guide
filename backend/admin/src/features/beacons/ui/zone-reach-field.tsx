'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';

const WEAKEST = -100;
const STRONGEST = -30;

export function ZoneReachField({ defaultValue }: { defaultValue: number | null }) {
  const { t } = useI18n();
  const [value, setValue] = useState<number>(defaultValue ?? -80);
  const [useDefault, setUseDefault] = useState(defaultValue === null);

  function describe(dbm: number): string {
    if (dbm >= -50) return t('reachAtExhibit');
    if (dbm >= -65) return t('reachFewSteps');
    if (dbm >= -80) return t('reachSmallRoom');
    return t('reachWide');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="minRssi">{t('zoneReach')}</Label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={useDefault}
            onChange={(event) => setUseDefault(event.target.checked)}
            className="h-3.5 w-3.5"
          />
          {t('useMuseumDefault')}
        </label>
      </div>

      <input type="hidden" name="minRssi" value={useDefault ? '' : String(value)} />

      <input
        id="minRssi"
        type="range"
        min={WEAKEST}
        max={STRONGEST}
        step={1}
        value={value}
        disabled={useDefault}
        onChange={(event) => setValue(Number(event.target.value))}
        className="w-full accent-primary disabled:opacity-40"
      />

      <div className="flex items-center justify-between text-xs">
        <span className={useDefault ? 'text-muted-foreground' : 'font-medium'}>
          {useDefault ? t('followingDefault') : `${value} dBm · ${describe(value)}`}
        </span>
        <span className="text-muted-foreground">{t('widerTighter')}</span>
      </div>

      <p className="text-xs text-muted-foreground">{t('reachHint')}</p>
    </div>
  );
}
