'use client';

import { Upload } from 'lucide-react';
import { FormEvent, useId, useMemo, useRef, useState } from 'react';
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
import { useFloorPlanI18n } from '../i18n';
import { DXF_UNITS, DxfImportError, DxfPlan, dxfSvg, importDxf } from '../model/dxf-import';

export interface DxfIdentity {
  code: string;
  name: string;
  level: string;
}

/** Raster output uses the existing media API and all three map renderers. */
async function toPng(plan: DxfPlan, furniture: boolean): Promise<File> {
  const url = URL.createObjectURL(new Blob([dxfSvg(plan, furniture)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(160, 2400 / Math.max(plan.widthMeters, plan.heightMeters));
    canvas.width = Math.max(1, Math.round(plan.widthMeters * scale));
    canvas.height = Math.max(1, Math.round(plan.heightMeters * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('PNG conversion failed'))),
        'image/png',
      ),
    );
    return new File([blob], 'floor-plan.png', { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function DxfImportDialog({
  create = false,
  blocked = false,
  onApply,
}: {
  create?: boolean;
  blocked?: boolean;
  onApply: (file: File, plan: DxfPlan, identity: DxfIdentity) => Promise<void>;
}) {
  const { t } = useFloorPlanI18n();
  const id = useId();
  const readVersion = useRef(0);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [unit, setUnit] = useState('');
  const [furniture, setFurniture] = useState(true);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(() => {
    if (!text) return null;
    try {
      return { plan: importDxf(text, unit ? Number(unit) : undefined) };
    } catch (caught) {
      return { error: caught instanceof DxfImportError ? caught.code : ('invalid' as const) };
    }
  }, [text, unit]);
  const plan = parsed?.plan;
  const preview = useMemo(
    () =>
      plan ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dxfSvg(plan, furniture))}` : '',
    [plan, furniture],
  );
  const parseError = parsed?.error ? t(`dxfError_${parsed.error}`) : '';

  const changeOpen = (value: boolean) => {
    if (saving) return;
    setOpen(value);
    if (!value) {
      readVersion.current++;
      setText('');
      setFilename('');
      setUnit('');
      setError('');
      setReading(false);
      setFurniture(true);
    }
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    const version = ++readVersion.current;
    setText('');
    setUnit('');
    setError('');
    setFilename(file.name);
    setReading(false);
    if (!/\.dxf$/i.test(file.name)) {
      setError(t('dxfError_invalid'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('dxfError_size'));
      return;
    }
    setReading(true);
    try {
      const contents = await file.text();
      if (version === readVersion.current) setText(contents);
    } catch {
      if (version === readVersion.current) setError(t('dxfError_invalid'));
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan || saving || blocked || reading) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      const png = await toPng(plan, furniture);
      await onApply(png, plan, {
        code: String(form.get('code') ?? '')
          .trim()
          .toUpperCase(),
        name: String(form.get('name') ?? '').trim(),
        level: String(form.get('level') ?? '').trim(),
      });
      setOpen(false);
      setText('');
      setFilename('');
      setUnit('');
      setFurniture(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('dxfSaveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => changeOpen(true)}>
        <Upload className="h-4 w-4" />
        {t('importDxf')}
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl">
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{t('importDxf')}</DialogTitle>
              <DialogDescription>{t('dxfDescription')}</DialogDescription>
            </DialogHeader>
            <fieldset disabled={saving} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor={`${id}-file`}>{t('dxfFile')}</Label>
                  <Input
                    id={`${id}-file`}
                    type="file"
                    accept=".dxf"
                    className="h-auto py-2"
                    onChange={(event) => {
                      void readFile(event.target.files?.[0]);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{t('dxfFileHint')}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-unit`}>{t('dxfUnits')}</Label>
                  <select
                    id={`${id}-unit`}
                    value={unit}
                    onChange={(event) => {
                      setUnit(event.target.value);
                      setError('');
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t('dxfAutoUnits')}</option>
                    {DXF_UNITS.map((choice) => (
                      <option key={choice.code} value={choice.code}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {reading ? (
                <p role="status" className="text-sm">
                  {t('dxfReading')}
                </p>
              ) : null}
              {plan ? (
                <>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 rounded-md border bg-white p-2">
                      <img
                        src={preview}
                        alt={t('dxfPreview')}
                        className="max-h-[42vh] w-full object-contain"
                      />
                    </div>
                    <div className="space-y-3 text-sm">
                      <p className="break-words font-semibold">{filename}</p>
                      <dl className="space-y-2 tabular-nums">
                        <div>
                          <dt className="text-muted-foreground">{t('dxfBounds')}</dt>
                          <dd>
                            {plan.widthMeters.toFixed(3)} × {plan.heightMeters.toFixed(3)} m
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('dxfUnits')}</dt>
                          <dd>
                            {DXF_UNITS.find((choice) => choice.code === plan.unit)?.label} → m
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('dxfWallCount')}</dt>
                          <dd>{plan.counts.WALLS}</dd>
                        </div>
                      </dl>
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={furniture}
                          className="mt-1 accent-primary"
                          onChange={(event) => setFurniture(event.target.checked)}
                        />
                        <span>{t('dxfFurniture')}</span>
                      </label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('dxfReviewHint')}
                      </p>
                    </div>
                  </div>
                  {create ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${id}-code`}>{t('code')}</Label>
                        <Input
                          id={`${id}-code`}
                          name="code"
                          required
                          minLength={2}
                          maxLength={64}
                          pattern="[A-Za-z0-9_-]+"
                          placeholder="ROOM_01"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${id}-name`}>{t('name')}</Label>
                        <Input id={`${id}-name`} name="name" required maxLength={120} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${id}-level`}>{t('level')}</Label>
                        <Input id={`${id}-level`} name="level" maxLength={40} />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </fieldset>
            {blocked ? (
              <p className="text-sm text-destructive">{t('dxfExistingCoordinates')}</p>
            ) : null}
            {error || parseError ? (
              <p role="alert" className="text-sm text-destructive">
                {error || parseError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => changeOpen(false)}
              >
                {t('dxfCancel')}
              </Button>
              <Button type="submit" disabled={!plan || reading || saving || blocked}>
                {saving ? t('dxfSaving') : create ? t('dxfCreate') : t('dxfApply')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
