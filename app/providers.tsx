'use client';

import { ReactNode, Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebVitalsClient } from '@/components/WebVitalsClient';
import dynamic from 'next/dynamic';

// Import process shim to execute it
import '@/lib/clientProcessShim';

// Dynamically import WalletProvider with no SSR to prevent hydration issues
// Simplified import pattern without module transformation
const WalletProvider = dynamic(
  () => import('@/providers/WalletProvider').then((mod) => mod.WalletProvider),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-gray-900" />
  }
);

// DiagnosticsOverlay - only in development, with safe loading
const DiagnosticsOverlay = dynamic(
  () => import('@/components/DiagnosticsOverlay').then((mod) => mod.DiagnosticsOverlay),
  { 
    ssr: false,
    loading: () => null
  }
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
        <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
          <WalletProvider>
            {children}
            <WebVitalsClient />
          </WalletProvider>
        </Suspense>
        {/* Development-only diagnostics overlay - outside Suspense for independent loading */}
        {process.env.NODE_ENV === 'development' && <DiagnosticsOverlay />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
