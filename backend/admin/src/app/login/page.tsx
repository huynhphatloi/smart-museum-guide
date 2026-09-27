'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch, tokenStore } from '@/lib/api-client';
import { LanguageToggle, useI18n } from '@/lib/i18n';
import { AdminProfile } from '@/lib/types';

interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  admin: AdminProfile;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState(
    process.env.NODE_ENV === 'production' ? '' : 'admin@museum.local',
  );
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        anonymous: true,
      });
      tokenStore.set(result.accessToken, result.admin);
      toast.success(t('welcomeBack', { name: result.admin.name }));
      router.replace('/dashboard');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('loginFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.83fr)]">
      <div className="relative hidden min-h-screen overflow-hidden bg-foreground lg:block">
        <img src="/isana-my-son.jpg" alt="Isana statue from My Son" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-12 pb-12 pt-32 text-white">
          <p className="font-serif text-4xl">{t('museumGuide')}</p><p className="mt-3 text-sm text-white/80">{t('staffConsole')}</p>
        </div>
      </div>
      <div className="flex min-h-screen flex-col bg-background px-5 sm:px-10">
        <div className="flex min-h-20 items-center justify-between gap-4 border-b border-border">
          <span className="flex items-center gap-3 text-sm font-semibold"><span className="flex h-9 w-9 items-center justify-center border border-foreground font-serif text-xl" aria-hidden="true">M</span>{t('museumGuide')}</span><LanguageToggle variant="light" />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md">
            <p className="mb-5 text-sm font-semibold text-primary">{t('staffConsole')}</p>
            <h1 className="font-serif text-5xl leading-tight">{t('loginTitle')}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('loginDescription')}</p>
            <form className="mt-9 space-y-5 border-t border-border pt-7" onSubmit={handleSubmit}>
              <div className="space-y-2"><Label htmlFor="email">{t('email')}</Label><Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">{t('password')}</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
              <Button type="submit" className="h-12 w-full" disabled={pending}>{pending ? t('signingIn') : t('signIn')}</Button>
              {process.env.NODE_ENV !== 'production' ? <p className="text-xs leading-5 text-muted-foreground">{t('seedHint')}</p> : null}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
