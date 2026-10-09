'use client';

import { Map } from 'lucide-react';
import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { useFloorPlanI18n } from '@/features/floor-plans/i18n';
import { indoorMapEnabled } from '@/lib/features';

export default function FloorPlansLayout({ children }: { children: ReactNode }) {
  const { t } = useFloorPlanI18n();

  if (indoorMapEnabled)
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Badge variant="warning">{t('comingSoon')}</Badge>
        </div>
        {children}
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
      <Map className="h-10 w-10 text-muted-foreground" strokeWidth={1.4} aria-hidden="true" />
      <Badge variant="warning">{t('comingSoon')}</Badge>
      <h1 className="font-serif text-2xl font-semibold">{t('comingSoonTitle')}</h1>
      <p className="max-w-lg text-sm text-muted-foreground">{t('comingSoonBody')}</p>
      <p className="max-w-lg text-xs text-muted-foreground">{t('comingSoonHint')}</p>
    </div>
  );
}
