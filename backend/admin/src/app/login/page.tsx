'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch, tokenStore } from '@/lib/api-client';
import { AdminProfile } from '@/lib/types';

interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  admin: AdminProfile;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@museum.local');
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
      toast.success(`Welcome back, ${result.admin.name}`);
      router.replace('/dashboard');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Login failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Museum Guide CMS</CardTitle>
          <CardDescription>Sign in with your museum staff account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Development seed account: admin@museum.local
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
