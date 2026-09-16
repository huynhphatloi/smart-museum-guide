'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BeaconScanner } from './beacon-scanner';
import { ZoneReachField } from './zone-reach-field';
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
import { useI18n } from '@/lib/i18n';
import { Beacon, BeaconProtocol, Zone } from '@/lib/types';

const DEFAULT_NAMESPACE_HINT = 'a1b2c3d4e5f607182930';

export function BeaconFormDialog({
  open,
  onOpenChange,
  zones,
  beacon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Zone[];
  beacon?: Beacon | null;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const editing = Boolean(beacon);
  const [protocol, setProtocol] = useState<BeaconProtocol>(beacon?.protocol ?? 'EDDYSTONE_UID');
  const formRef = useRef<HTMLFormElement>(null);

  const protocols: { value: BeaconProtocol; label: string; hint: string }[] = [
    {
      value: 'EDDYSTONE_UID',
      label: t('protocolEddystone'),
      hint: t('protocolEddystoneHint'),
    },
    { value: 'IBEACON', label: t('protocolIbeacon'), hint: t('protocolIbeaconHint') },
    { value: 'GENERIC', label: t('protocolOther'), hint: t('protocolOtherHint') },
  ];

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      beacon
        ? apiFetch<Beacon>(`/admin/beacons/${beacon.id}`, { method: 'PATCH', body })
        : apiFetch<Beacon>('/admin/beacons', { method: 'POST', body }),
    onSuccess: (saved) => {
      toast.success(
        t('beaconSaved', {
          id: saved.identifier,
          action: editing ? t('beaconUpdatedAction') : t('beaconRegisteredAction'),
        }),
      );
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ['beacons'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t('beaconSaveError')),
  });

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

    toast.success(t('identityFilled'));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const text = (key: string) => String(form.get(key) ?? '').trim();
    const optionalNumber = (key: string) => {
      const raw = text(key);
      return raw ? Number(raw) : undefined;
    };
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
          <DialogTitle>
            {editing
              ? t('beaconSettingsTitle', { id: beacon?.identifier ?? '' })
              : t('registerBeacon')}
          </DialogTitle>
          <DialogDescription>{t('beaconFormHint')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef} autoComplete="off">
          <BeaconScanner onSelect={applyScannedBeacon} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('identifier')}</Label>
              <Input
                id="identifier"
                name="identifier"
                placeholder="BEACON_A01"
                defaultValue={beacon?.identifier ?? ''}
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                name="name"
                placeholder="Entrance A01"
                defaultValue={beacon?.name ?? ''}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneId">{t('zone')}</Label>
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
            <Label htmlFor="protocol">{t('protocol')}</Label>
            <select
              id="protocol"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={protocol}
              onChange={(event) => setProtocol(event.target.value as BeaconProtocol)}
            >
              {protocols.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {protocols.find((option) => option.value === protocol)?.hint}
            </p>
          </div>

          {protocol !== 'IBEACON' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="namespaceId">{t('eddystoneNamespace')}</Label>
                <Input
                  id="namespaceId"
                  name="namespaceId"
                  placeholder={DEFAULT_NAMESPACE_HINT}
                  defaultValue={beacon?.namespaceId ?? ''}
                  maxLength={20}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">{t('hex20')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">{t('eddystoneInstance')}</Label>
                <Input
                  id="instanceId"
                  name="instanceId"
                  placeholder="000000000001"
                  defaultValue={beacon?.instanceId ?? ''}
                  maxLength={12}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">{t('hex12')}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="uuid">
              {protocol === 'EDDYSTONE_UID' ? t('iBeaconUuidOptional') : t('iBeaconUuid')}
            </Label>
            <Input
              id="uuid"
              name="uuid"
              placeholder="f7826da6-4fa2-4e98-8024-bc5b71e0893e"
              defaultValue={beacon?.uuid ?? ''}
              autoComplete="off"
            />
            {protocol === 'EDDYSTONE_UID' ? (
              <p className="text-xs text-muted-foreground">{t('minewHint')}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="major">{t('major')}</Label>
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
              <Label htmlFor="minor">{t('minor')}</Label>
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
              <Label htmlFor="txPower">{t('txPower')}</Label>
              <Input
                id="txPower"
                name="txPower"
                type="number"
                min={-127}
                max={20}
                placeholder="-8"
                defaultValue={beacon?.txPower ?? ''}
              />
              <p className="text-xs text-muted-foreground">{t('txPowerHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advertisingIntervalMs">{t('advInterval')}</Label>
              <Input
                id="advertisingIntervalMs"
                name="advertisingIntervalMs"
                type="number"
                min={20}
                max={10000}
                placeholder="500"
                defaultValue={beacon?.advertisingIntervalMs ?? ''}
              />
              <p className="text-xs text-muted-foreground">{t('advIntervalHint')}</p>
            </div>
          </div>

          <ZoneReachField defaultValue={beacon?.minRssi ?? null} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('saving') : editing ? t('saveChanges') : t('registerBeaconBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
