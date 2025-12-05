'use client';

import { FC, ReactNode, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query';

interface QueryClientProviderProps {
  children: ReactNode;
}

/**
 * QueryClientProvider wraps the application with React Query context.
 * This must be a client component and should wrap the entire app tree.
 * 
 * The QueryClient is created once per component instance using useState
 * to avoid recreating on every render while ensuring proper cleanup.
 */
export const QueryClientProvider: FC<QueryClientProviderProps> = ({ children }) => {
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
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
};
