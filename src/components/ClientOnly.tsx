'use client';

import { ReactNode, useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly Wrapper Component
 * 
 * This component ensures its children are only rendered on the client side.
 * It's useful for components that:
 * - Use React Context hooks (useContext, useWallet, etc.)
 * - Access browser APIs (localStorage, window, etc.)
 * - Cause hydration mismatches during SSR
 * 
 * The fallback prop is rendered on the server side and during initial load.
 * Once mounted on the client, children are rendered instead.
 * 
 * Usage:
 * ```tsx
 * <ClientOnly fallback={<LoadingSpinner />}>
 *   <ComponentUsingContextHooks />
 * </ClientOnly>
 * ```
 * 
 * @param children - Component to render only on client
 * @param fallback - Component to show during server rendering (optional)
 */
export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return fallback || null;
  }

  return children;
}
