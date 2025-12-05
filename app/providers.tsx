'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from '@/components/WalletProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useState } from 'react';

// Import process shim to execute it
import '@/lib/clientProcessShim';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers component wraps the application with all necessary context providers.
 * This is a client component that combines QueryClient and Wallet providers.
 * 
 * The process shim is imported here to ensure it runs before any other client code.
 */
export function Providers({ children }: ProvidersProps) {
  // Create QueryClient instance once on mount using useState
  // This ensures the instance is stable across re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long cached data is considered fresh
            staleTime: 10000, // 10 seconds
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: false,
            // Retry failed requests
            retry: 2,
            // Network mode - online by default
            networkMode: 'online',
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
