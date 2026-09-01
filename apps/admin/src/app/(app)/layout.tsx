'use client';

import { Image as ImageIcon, LayoutDashboard, LogOut, MapPin, Radio, Landmark } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokenStore } from '@/lib/api-client';
import { AdminProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/zones', label: 'Zones', icon: MapPin },
  { href: '/beacons', label: 'Beacons', icon: Radio },
  { href: '/exhibits', label: 'Exhibits', icon: Landmark },
  { href: '/media', label: 'Media', icon: ImageIcon },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checked, setChecked] = useState(false);

  // Client side guard: the API is the real authority, this only avoids
  // rendering an empty shell to a signed out user.
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    setProfile(tokenStore.profile());
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <div className="p-10 text-sm text-muted-foreground">Checking your session...</div>;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="border-b px-5 py-5">
          <p className="text-sm font-semibold">Museum Guide</p>
          <p className="text-xs text-muted-foreground">Content management</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <p className="px-2 pb-2 text-xs text-muted-foreground">{profile?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              tokenStore.clear();
              router.replace('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-6 py-3 md:hidden">
          <p className="text-sm font-semibold">Museum Guide CMS</p>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 md:hidden">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs',
                pathname.startsWith(item.href) ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
