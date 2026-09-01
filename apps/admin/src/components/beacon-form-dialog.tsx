'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BeaconScanner } from '@/components/beacon-scanner';
import { ZoneReachField } from '@/components/zone-reach-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch } from '@/lib/api-client';
import { ScannedBeacon } from '@/lib/ble-scan';
import { Beacon, BeaconProtocol, Zone } from '@/lib/types';

const PROTOCOLS: { value: BeaconProtocol; label: string; hint: string }[] = [
  {
    value: 'EDDYSTONE_UID',
    label: 'Eddystone UID (recommended)',
    hint: 'Read from BLE service data 0xFEAA — works the same on Android and iOS.',
  },
  {
    value: 'IBEACON',
    label: 'iBeacon',
    hint: 'Read from manufacturer data on Android; on iOS this is the Core Location identity.',
  },
  { value: 'GENERIC', label: 'Other', hint: 'Any beacon carrying one of the identities below.' },
];

const DEFAULT_NAMESPACE_HINT = 'a1b2c3d4e5f607182930';

/**
 * Create and edit share one form: the fields, the validation hints and the
 * scan panel are identical, and only the request differs. Keeping them apart
 * is how the two drift.
 */
export function BeaconFormDialog({
  open,
  onOpenChange,
  zones,
  beacon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Zone[];
  /** Present when editing; absent when registering a new beacon. */
  beacon?: Beacon | null;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(beacon);
  const [protocol, setProtocol] = useState<BeaconProtocol>(beacon?.protocol ?? 'EDDYSTONE_UID');
  const formRef = useRef<HTMLFormElement>(null);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      beacon
        ? apiFetch<Beacon>(`/admin/beacons/${beacon.id}`, { method: 'PATCH', body })
        : apiFetch<Beacon>('/admin/beacons', { method: 'POST', body }),
    onSuccess: (saved) => {
      toast.success(`Beacon ${saved.identifier} ${editing ? 'updated' : 'registered'}.`);
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ['beacons'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save the beacon.'),
  });

  /**
   * Copies a scanned beacon's identity into the form. The inputs are
   * uncontrolled, so they are written directly rather than mirrored in state -
   * that keeps whatever the operator has already typed into identifier / name.
   */
  function applyScannedBeacon(scanned: ScannedBeacon) {
    setProtocol(scanned.protocol);

    const form = formRef.current;
    if (!form) return;

    const set = (name: string, value: string | number | null) => {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement) field.value = value === null ? '' : String(value);
    };

    set('namespaceId', scanned.namespaceId);
    set('instanceId', scanned.instanceId);
    set('uuid', scanned.uuid);
    set('major', scanned.major);
    set('minor', scanned.minor);
    set('txPower', scanned.txPower);

    toast.success('Identity filled in from the scan.');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const text = (key: string) => String(form.get(key) ?? '').trim();
    const optionalNumber = (key: string) => {
      const raw = text(key);
      return raw ? Number(raw) : undefined;
    };
    /** Editing must be able to clear a value, which undefined cannot express. */
    const nullableNumber = (key: string) => {
      const raw = text(key);
      if (raw) return Number(raw);
      return editing ? null : undefined;
    };

    save.mutate({
      identifier: text('identifier').toUpperCase(),
      name: text('name'),
      zoneId: text('zoneId'),
      protocol,
      namespaceId: text('namespaceId') || undefined,
      instanceId: text('instanceId') || undefined,
      uuid: text('uuid') || undefined,
      major: optionalNumber('major'),
      minor: optionalNumber('minor'),
      txPower: optionalNumber('txPower'),
      advertisingIntervalMs: optionalNumber('advertisingIntervalMs'),
      minRssi: nullableNumber('minRssi'),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${beacon?.identifier}` : 'Register a beacon'}</DialogTitle>
          <DialogDescription>
            Identity comes from what the beacon broadcasts. The BLE MAC address is deliberately not
            used: Android reports a MAC there, iOS reports a per-device UUID.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <BeaconScanner onSelect={applyScannedBeacon} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier</Label>
              <Input
                id="identifier"
                name="identifier"
                placeholder="BEACON_A01"
                defaultValue={beacon?.identifier ?? ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Entrance A01"
                defaultValue={beacon?.name ?? ''}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneId">Zone</Label>
            <select
              id="zoneId"
              name="zoneId"
              required
              defaultValue={beacon?.zoneId ?? ''}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.code} — {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocol">Protocol</Label>
            <select
              id="protocol"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={protocol}
              onChange={(event) => setProtocol(event.target.value as BeaconProtocol)}
            >
              {PROTOCOLS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {PROTOCOLS.find((option) => option.value === protocol)?.hint}
            </p>
          </div>

          {protocol !== 'IBEACON' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="namespaceId">Eddystone namespace</Label>
                <Input
                  id="namespaceId"
                  name="namespaceId"
                  placeholder={DEFAULT_NAMESPACE_HINT}
                  defaultValue={beacon?.namespaceId ?? ''}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">20 hex characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">Eddystone instance</Label>
                <Input
                  id="instanceId"
                  name="instanceId"
                  placeholder="000000000001"
                  defaultValue={beacon?.instanceId ?? ''}
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground">12 hex characters</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="uuid">
              iBeacon proximity UUID{protocol === 'EDDYSTONE_UID' ? ' (optional)' : ''}
            </Label>
            <Input
              id="uuid"
              name="uuid"
              placeholder="f7826da6-4fa2-4e98-8024-bc5b71e0893e"
              defaultValue={beacon?.uuid ?? ''}
            />
            {protocol === 'EDDYSTONE_UID' ? (
              <p className="text-xs text-muted-foreground">
                A Minew i3 can advertise both frames. Filling this in also enables the iOS Core
                Location path later. Give each beacon a distinct major/minor — the triple must be
                unique.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                name="major"
                type="number"
                min={0}
                max={65535}
                defaultValue={beacon?.major ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minor">Minor</Label>
              <Input
                id="minor"
                name="minor"
                type="number"
                min={0}
                max={65535}
                defaultValue={beacon?.minor ?? ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="txPower">Tx power (dBm)</Label>
              <Input
                id="txPower"
                name="txPower"
                type="number"
                min={-127}
                max={20}
                placeholder="-8"
                defaultValue={beacon?.txPower ?? ''}
              />
              <p className="text-xs text-muted-foreground">Turn it down for tight zones.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advertisingIntervalMs">Advertising interval (ms)</Label>
              <Input
                id="advertisingIntervalMs"
                name="advertisingIntervalMs"
                type="number"
                min={20}
                max={10000}
                placeholder="500"
                defaultValue={beacon?.advertisingIntervalMs ?? ''}
              />
              <p className="text-xs text-muted-foreground">~500 ms suits a 4 s RSSI window.</p>
            </div>
          </div>

          <ZoneReachField defaultValue={beacon?.minRssi ?? null} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Register beacon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
