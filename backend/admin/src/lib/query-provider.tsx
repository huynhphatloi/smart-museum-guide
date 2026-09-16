'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { I18nProvider } from './i18n';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
