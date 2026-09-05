'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { tokenStore } from '@/lib/api-client';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(tokenStore.get() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading the museum CMS...
    </main>
  );
}
