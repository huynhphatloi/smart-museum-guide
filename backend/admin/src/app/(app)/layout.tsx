'use client';

import { Landmark, LayoutDashboard, LogOut, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokenStore } from '@/lib/api-client';
import { LanguageToggle, useI18n } from '@/lib/i18n';
import { AdminProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checked, setChecked] = useState(false);

  const navigation = [
    { href: '/dashboard', label: t('navOverview'), icon: LayoutDashboard },
    { href: '/zones', label: t('navZones'), icon: MapPin },
    { href: '/beacons', label: t('navBeacons'), icon: Radio },
    { href: '/exhibits', label: t('navExhibits'), icon: Landmark },
  ];

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    setProfile(tokenStore.profile());
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <div className="p-10 text-sm text-muted-foreground">{t('checkingSession')}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-primary-foreground/15 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 lg:px-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <span className="flex h-9 w-8 items-end rounded-t-full bg-primary-foreground/15 p-1">
              <span className="h-5 w-full rounded-t-full bg-primary-foreground/80" />
            </span>
            <span>
              <span className="block font-serif text-base font-semibold leading-tight">
                {t('museumGuide')}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60">
                {t('staffConsole')}
              </span>
            </span>
          </Link>

          <nav className="hidden h-full items-center gap-1 md:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-full items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary-foreground text-primary-foreground'
                      : 'border-transparent text-primary-foreground/65 hover:text-primary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <span className="hidden text-xs text-primary-foreground/60 lg:inline">
              {profile?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => {
                tokenStore.clear();
                router.replace('/login');
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{t('signOut')}</span>
            </Button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-primary-foreground/10 px-3 md:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium',
                pathname.startsWith(item.href)
                  ? 'border-primary-foreground text-primary-foreground'
                  : 'border-transparent text-primary-foreground/60',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
