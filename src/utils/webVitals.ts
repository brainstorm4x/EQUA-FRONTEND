/**
 * Web Vitals Monitoring
 * 
 * Tracks Core Web Vitals metrics for performance monitoring:
 * - LCP (Largest Contentful Paint) - measures loading performance
 * - FID (First Input Delay) - measures interactivity
 * - CLS (Cumulative Layout Shift) - measures visual stability
 * - FCP (First Contentful Paint) - measures initial render time
 * - TTFB (Time to First Byte) - measures server response time
 */

export type WebVitalsMetric = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

// Performance thresholds based on Google's recommendations
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },     // milliseconds
  FID: { good: 100, poor: 300 },       // milliseconds
  CLS: { good: 0.1, poor: 0.25 },      // score
  FCP: { good: 1800, poor: 3000 },     // milliseconds
  TTFB: { good: 800, poor: 1800 },     // milliseconds
  INP: { good: 200, poor: 500 },       // milliseconds (Interaction to Next Paint)
} as const;

/**
 * Get rating for a metric value
 */
function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'needs-improvement';
  
  if (value <= threshold.good) return 'good';
  if (value > threshold.poor) return 'poor';
  return 'needs-improvement';
}

/**
 * Report web vital metric to analytics (placeholder)
 * In production, this would send to an analytics service
 */
function reportMetric(metric: WebVitalsMetric): void {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    const color = metric.rating === 'good' ? '\x1b[32m' : 
                  metric.rating === 'poor' ? '\x1b[31m' : '\x1b[33m';
    console.log(
      `${color}[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})\x1b[0m`
    );
  }
  
  // In production, you would send this to your analytics service
  // Example: sendToAnalytics({ name: metric.name, value: metric.value, rating: metric.rating });
}

/**
 * Initialize Web Vitals tracking using native Performance API
 * This is a lightweight alternative to the web-vitals library
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  // Track LCP (Largest Contentful Paint)
  if ('PerformanceObserver' in window) {
    try {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        if (lastEntry) {
          const value = lastEntry.startTime;
          reportMetric({
            id: `lcp-${Date.now()}`,
            name: 'LCP',
            value,
            delta: value,
            rating: getRating('LCP', value),
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID Observer (First Input Delay)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries() as PerformanceEventTiming[];
        for (const entry of entries) {
          const value = entry.processingStart - entry.startTime;
          reportMetric({
            id: `fid-${Date.now()}`,
            name: 'FID',
            value,
            delta: value,
            rating: getRating('FID', value),
          });
          fidObserver.disconnect();
          break;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS Observer (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
          if (!entry.hadRecentInput && entry.value) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // Report CLS when page visibility changes or before unload
      const reportCLS = () => {
        reportMetric({
          id: `cls-${Date.now()}`,
          name: 'CLS',
          value: clsValue,
          delta: clsValue,
          rating: getRating('CLS', clsValue),
        });
      };
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportCLS();
        }
      });

    } catch (e) {
      // PerformanceObserver not supported or metric type not available
      console.warn('Web Vitals tracking not fully supported:', e);
    }
  }

  // Track FCP (First Contentful Paint) and TTFB using Navigation Timing API
  if ('performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // TTFB
          const ttfb = navigation.responseStart - navigation.requestStart;
          if (ttfb > 0) {
            reportMetric({
              id: `ttfb-${Date.now()}`,
              name: 'TTFB',
              value: ttfb,
              delta: ttfb,
              rating: getRating('TTFB', ttfb),
            });
          }
        }

        // FCP from Paint Timing API
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          reportMetric({
            id: `fcp-${Date.now()}`,
            name: 'FCP',
            value: fcpEntry.startTime,
            delta: fcpEntry.startTime,
            rating: getRating('FCP', fcpEntry.startTime),
          });
        }
      }, 0);
    });
  }
}

/**
 * Get current performance metrics snapshot
 * Useful for debugging and manual inspection
 */
export function getPerformanceSnapshot(): Record<string, number> {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return {};
  }

  const snapshot: Record<string, number> = {};
  
  // Navigation timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    snapshot.ttfb = navigation.responseStart - navigation.requestStart;
    snapshot.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    snapshot.loadTime = navigation.loadEventEnd - navigation.fetchStart;
  }

  // Paint timing
  const paintEntries = performance.getEntriesByType('paint');
  for (const entry of paintEntries) {
    if (entry.name === 'first-paint') {
      snapshot.fp = entry.startTime;
    } else if (entry.name === 'first-contentful-paint') {
      snapshot.fcp = entry.startTime;
    }
  }

  return snapshot;
}
