'use client';

import { useEffect } from 'react';

/**
 * WebVitalsClient component
 * 
 * Initializes lightweight Web Vitals tracking (LCP and CLS) in the browser.
 * This component runs client-side only, after the process shim is loaded
 * and after React Query/WalletProvider are initialized.
 * 
 * Uses PerformanceObserver API to track:
 * - LCP (Largest Contentful Paint): Time when largest content element is rendered
 * - CLS (Cumulative Layout Shift): Visual stability score
 * 
 * Logs are only displayed in development mode.
 */
export function WebVitalsClient() {
  useEffect(() => {
    // Only run in browser with PerformanceObserver support
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Track LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        
        // Log only in development mode
        // Check process is defined and NODE_ENV is development
        if (last && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('[WebVital] LCP:', last.startTime.toFixed(0), 'ms');
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Track CLS (Cumulative Layout Shift)
      let cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count layout shifts that weren't caused by user input
          if (!(entry as any).hadRecentInput && (entry as any).value) {
            cls += (entry as any).value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Cleanup observers on unmount
      return () => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      // Silently fail if PerformanceObserver setup fails
      // This is optional tracking, shouldn't break the app
    }
  }, []);

  // This component doesn't render anything
  return null;
}
