'use client';

import { Landmark, LayoutDashboard, LogOut, Map, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFloorPlanI18n } from '@/features/floor-plans/i18n';
import { tokenStore } from '@/lib/api-client';
import { LanguageToggle, useI18n } from '@/lib/i18n';
import { AdminProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { t: tMap } = useFloorPlanI18n();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checked, setChecked] = useState(false);

  const navigation = [
    { href: '/dashboard', label: t('navOverview'), icon: LayoutDashboard },
    { href: '/zones', label: t('navZones'), icon: MapPin },
    { href: '/exhibits', label: t('navExhibits'), icon: Landmark },
    { href: '/floor-plans', label: tMap('navFloorPlans'), icon: Map },
    { href: '/beacons', label: t('navBeacons'), icon: Radio },
  ];

  useEffect(() => {
    if (!tokenStore.get()) { router.replace('/login'); return; }
    setProfile(tokenStore.profile());
    setChecked(true);
  }, [router]);

  if (!checked) return <div className="p-10 text-sm text-muted-foreground">{t('checkingSession')}</div>;

  const signOut = () => { tokenStore.clear(); router.replace('/login'); };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-border bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/dashboard" className="flex min-h-24 items-center gap-3 border-b border-border px-6">
          <span className="flex h-10 w-10 items-center justify-center border border-foreground font-serif text-2xl" aria-hidden="true">M</span>
          <span><strong className="block text-sm font-semibold leading-5">{t('museumGuide')}</strong><small className="block text-xs text-muted-foreground">{t('staffConsole')}</small></span>
        </Link>
        <nav className="flex-1 space-y-1 p-3" aria-label={t('staffConsole')}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-3 border-l-2 px-4 text-sm transition-colors', active ? 'border-primary bg-accent/60 font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground')}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />{item.label}</Link>;
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="mb-3 truncate px-2 text-xs text-muted-foreground">{profile?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}><LogOut className="h-4 w-4" />{t('signOut')}</Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-5 sm:px-8 lg:min-h-20 lg:px-10">
            <Link href="/dashboard" className="flex items-center gap-3 lg:hidden"><span className="flex h-8 w-8 items-center justify-center border border-foreground font-serif text-xl" aria-hidden="true">M</span><span className="text-sm font-semibold">{t('museumGuide')}</span></Link>
            <span className="hidden font-serif text-2xl lg:block">{navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? t('staffConsole')}</span>
            <div className="ml-auto flex items-center gap-2"><LanguageToggle /><Button variant="ghost" size="icon" className="lg:hidden" onClick={signOut} aria-label={t('signOut')}><LogOut className="h-4 w-4" /></Button></div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-1 lg:hidden" aria-label={t('staffConsole')}>
            {navigation.map((item) => { const active = pathname === item.href || pathname.startsWith(`${item.href}/`); const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}><Icon className="h-4 w-4" />{item.label}</Link>; })}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
