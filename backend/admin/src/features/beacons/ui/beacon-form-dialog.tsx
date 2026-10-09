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
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const [identity, setIdentity] = useState({
    protocol: beacon?.protocol ?? ('EDDYSTONE_UID' as BeaconProtocol),
    namespaceId: beacon?.namespaceId ?? '',
    instanceId: beacon?.instanceId ?? '',
    uuid: beacon?.uuid ?? '',
    major: beacon?.major === null || beacon?.major === undefined ? '' : String(beacon.major),
    minor: beacon?.minor === null || beacon?.minor === undefined ? '' : String(beacon.minor),
  });
  const [identityDirty, setIdentityDirty] = useState(false);
  const [dual, setDual] = useState(Boolean(beacon?.namespaceId && beacon?.uuid));
  const [error, setError] = useState('');
  const showEddystone = identity.protocol !== 'IBEACON' || dual;
  const showIBeacon = identity.protocol !== 'EDDYSTONE_UID' || dual;

  const hasEddystone =
    /^[0-9a-f]{20}$/i.test(identity.namespaceId.trim()) &&
    /^[0-9a-f]{12}$/i.test(identity.instanceId.trim());
  const hasIBeacon =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.uuid.trim()) &&
    [identity.major, identity.minor].every(
      (value) =>
        value.trim() !== '' &&
        Number.isInteger(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= 65535,
    );
  const identityValid =
    identity.protocol === 'EDDYSTONE_UID'
      ? hasEddystone
      : identity.protocol === 'IBEACON'
        ? hasIBeacon
        : hasEddystone || hasIBeacon;
  const secondaryValid = !dual || (hasEddystone && hasIBeacon);

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
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : t('beaconSaveError')),
  });

  function changeIdentity<K extends keyof typeof identity>(key: K, value: (typeof identity)[K]) {
    setIdentity((current) => {
      const next = { ...current, [key]: value };
      if (key === 'protocol' && !dual) {
        if (value === 'IBEACON') return { ...next, namespaceId: '', instanceId: '' };
        if (value === 'EDDYSTONE_UID') return { ...next, uuid: '', major: '', minor: '' };
      }
      return next;
    });
    setIdentityDirty(true);
    setError('');
  }

  function applyScannedBeacon(scanned: ScannedBeacon) {
    // A scan supplies one broadcast frame. Preserve the alternate frame already
    // registered for this same device, but do not attach it to a different device.
    const sameDevice = Boolean(beacon && scanned.registeredAs === beacon.identifier);
    setIdentity({
      protocol: scanned.protocol,
      namespaceId: scanned.namespaceId ?? (sameDevice ? (beacon?.namespaceId ?? '') : ''),
      instanceId: scanned.instanceId ?? (sameDevice ? (beacon?.instanceId ?? '') : ''),
      uuid: scanned.uuid ?? (sameDevice ? (beacon?.uuid ?? '') : ''),
      major:
        scanned.major === null
          ? sameDevice && beacon?.major != null
            ? String(beacon.major)
            : ''
          : String(scanned.major),
      minor:
        scanned.minor === null
          ? sameDevice && beacon?.minor != null
            ? String(beacon.minor)
            : ''
          : String(scanned.minor),
    });
    setDual(Boolean(sameDevice && beacon?.namespaceId && beacon?.uuid));
    setIdentityDirty(true);
    setError('');
    toast.success(t('identityFilled'));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!editing || identityDirty) && (!identityValid || !secondaryValid)) {
      setError(t('beaconIdentityRequired'));
      if (advancedRef.current) advancedRef.current.open = true;
      return;
    }
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const reach = text('minRssi');
    save.mutate({
      name: text('name'),
      zoneId: text('zoneId'),
      minRssi: reach ? Number(reach) : null,
      // Metadata-only edits must not erase hidden identities or radio values.
      ...(!editing || identityDirty
        ? {
            protocol: identity.protocol,
            namespaceId: identity.namespaceId.trim() || null,
            instanceId: identity.instanceId.trim() || null,
            uuid: identity.uuid.trim() || null,
            major: identity.major.trim() ? Number(identity.major) : null,
            minor: identity.minor.trim() ? Number(identity.minor) : null,
          }
        : {}),
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
        <form
          className="space-y-4"
          onSubmit={handleSubmit}
          autoComplete="off"
          onInvalidCapture={(event) => {
            // Reveal collapsed controls so native validation can focus the error.
            if (advancedRef.current?.contains(event.target as Node)) {
              advancedRef.current.open = true;
            }
          }}
        >
          <fieldset disabled={save.isPending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={beacon?.name ?? ''}
                required
                maxLength={120}
              />
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
                <option value="" disabled>
                  {t('beaconSelectZone')}
                </option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.code} — {zone.name}
                  </option>
                ))}
              </select>
            </div>
            <BeaconScanner onSelect={applyScannedBeacon} />
            <div className="space-y-1 text-sm" aria-live="polite">
              <p className="font-medium">
                {identityValid ? t('beaconIdentityReady') : t('beaconIdentityEmpty')}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {identityValid
                  ? identity.protocol === 'IBEACON' || !hasEddystone
                    ? `iBeacon · ${identity.uuid} · ${identity.major}/${identity.minor}`
                    : `Eddystone UID · ${identity.namespaceId}:${identity.instanceId}`
                  : t('beaconIdentityHelp')}
              </p>
            </div>
            <details ref={advancedRef} className="border-t pt-3">
              <summary className="cursor-pointer py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t('beaconAdvanced')}
              </summary>
              <div className="mt-3 space-y-4">
                <p className="text-xs text-muted-foreground">
                  {beacon
                    ? t('beaconCodeExisting', { code: beacon.identifier })
                    : t('beaconCodeAutomatic')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="protocol">{t('protocol')}</Label>
                  <select
                    id="protocol"
                    value={identity.protocol}
                    onChange={(event) =>
                      changeIdentity('protocol', event.target.value as BeaconProtocol)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="EDDYSTONE_UID">{t('protocolEddystone')}</option>
                    <option value="IBEACON">{t('protocolIbeacon')}</option>
                    {beacon?.protocol === 'GENERIC' ? (
                      <option value="GENERIC">{t('protocolOther')}</option>
                    ) : null}
                  </select>
                </div>
                {identity.protocol !== 'GENERIC' ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      checked={dual}
                      onChange={(event) => {
                        setDual(event.target.checked);
                        setIdentityDirty(true);
                        setError('');
                        if (!event.target.checked)
                          setIdentity((current) =>
                            current.protocol === 'IBEACON'
                              ? { ...current, namespaceId: '', instanceId: '' }
                              : { ...current, uuid: '', major: '', minor: '' },
                          );
                      }}
                    />
                    {t('beaconDualIdentity')}
                  </label>
                ) : null}
                {showEddystone ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="namespaceId">{t('eddystoneNamespace')}</Label>
                      <Input
                        id="namespaceId"
                        value={identity.namespaceId}
                        maxLength={20}
                        onChange={(event) => changeIdentity('namespaceId', event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">{t('hex20')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instanceId">{t('eddystoneInstance')}</Label>
                      <Input
                        id="instanceId"
                        value={identity.instanceId}
                        maxLength={12}
                        onChange={(event) => changeIdentity('instanceId', event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">{t('hex12')}</p>
                    </div>
                  </div>
                ) : null}
                {showIBeacon ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="uuid">{t('iBeaconUuid')}</Label>
                      <Input
                        id="uuid"
                        value={identity.uuid}
                        maxLength={36}
                        onChange={(event) => changeIdentity('uuid', event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['major', 'minor'] as const).map((key) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key}>{t(key)}</Label>
                          <Input
                            id={key}
                            type="number"
                            min={0}
                            max={65535}
                            value={identity[key]}
                            onChange={(event) => changeIdentity(key, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">{t('beaconIdentityManualHint')}</p>
                <ZoneReachField defaultValue={beacon?.minRssi ?? null} />
              </div>
            </details>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </fieldset>
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
