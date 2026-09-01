'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';

/** The floor of a usable reading, and the point of "almost touching it". */
const WEAKEST = -100;
const STRONGEST = -30;

/**
 * Plain-language reading of a dBm threshold. Deliberately qualitative: the
 * same value covers a different distance in a small room, a glass-cased hall,
 * or a crowd, so a figure in metres would promise precision that does not exist.
 */
function describe(dbm: number): string {
  if (dbm >= -50) return 'Right at the exhibit';
  if (dbm >= -65) return 'A few steps away';
  if (dbm >= -80) return 'A small room';
  return 'Wide — neighbouring zones may overlap';
}

/**
 * Sets how far a beacon's zone reaches, as the minimum smoothed RSSI the phone
 * will still count as "inside". Null hands the decision back to the app's
 * global default.
 */
export function ZoneReachField({ defaultValue }: { defaultValue: number | null }) {
  const [value, setValue] = useState<number>(defaultValue ?? -80);
  const [useDefault, setUseDefault] = useState(defaultValue === null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="minRssi">Zone reach</Label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={useDefault}
            onChange={(event) => setUseDefault(event.target.checked)}
            className="h-3.5 w-3.5"
          />
          Use app default
        </label>
      </div>

      {/* Submitted only when a beacon-specific value is set; an empty string
          clears the column back to null on the API side. */}
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
          {useDefault ? 'Following the app default' : `${value} dBm · ${describe(value)}`}
        </span>
        <span className="text-muted-foreground">wider ← → tighter</span>
      </div>

      <p className="text-xs text-muted-foreground">
        A signal threshold, not a radius. The same value covers a different distance in a small
        room, behind glass, or in a crowd — walk the zone and adjust rather than converting to
        metres.
      </p>
    </div>
  );
}
