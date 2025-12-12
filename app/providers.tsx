'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebVitalsClient } from '@/components/WebVitalsClient';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Import process shim to execute it
import '@/lib/clientProcessShim';

// Dynamically import WalletProvider with no SSR to prevent hydration issues
const WalletProvider = dynamic(
  () => import('@/providers/WalletProvider').then((mod) => ({ default: mod.WalletProvider })),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers component wraps the application with all necessary context providers.
 * This is a client component that combines QueryClient and Wallet providers.
 * 
 * The process shim is imported here to ensure it runs before any other client code.
 * WebVitalsClient is rendered after all providers to ensure safe access to process.env.
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
        <WalletProvider>
          {children}
          <WebVitalsClient />
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
