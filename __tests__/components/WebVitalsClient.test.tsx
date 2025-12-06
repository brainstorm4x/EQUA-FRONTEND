/**
 * Tests for WebVitalsClient component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WebVitalsClient } from '@/components/WebVitalsClient';

// Mock PerformanceObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const observerInstances: any[] = [];

class MockPerformanceObserver {
  callback: PerformanceObserverCallback;
  
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }
  
  observe = mockObserve;
  disconnect = mockDisconnect;
}

describe('WebVitalsClient', () => {
  let originalPerformanceObserver: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Save original PerformanceObserver
    originalPerformanceObserver = (global as any).PerformanceObserver;
    
    // Set up mock
    (global as any).PerformanceObserver = MockPerformanceObserver;
    
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Reset mocks and instances
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    observerInstances.length = 0;
  });

  afterEach(() => {
    // Restore original PerformanceObserver
    (global as any).PerformanceObserver = originalPerformanceObserver;
    
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  it('should render without crashing', () => {
    const { container } = render(<WebVitalsClient />);
    
    // Component should not render any DOM elements
    expect(container.firstChild).toBeNull();
  });

  it('should initialize PerformanceObserver for LCP and CLS', () => {
    render(<WebVitalsClient />);
    
    // Should create two observers (LCP and CLS)
    expect(mockObserve).toHaveBeenCalledTimes(2);
    
    // First call should be for LCP
    expect(mockObserve).toHaveBeenCalledWith({ 
      type: 'largest-contentful-paint', 
      buffered: true 
    });
    
    // Second call should be for CLS
    expect(mockObserve).toHaveBeenCalledWith({ 
      type: 'layout-shift', 
      buffered: true 
    });
  });

  it('should cleanup observers on unmount', () => {
    const { unmount } = render(<WebVitalsClient />);
    
    expect(mockDisconnect).not.toHaveBeenCalled();
    
    unmount();
    
    // Both observers should be disconnected
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });

  it('should not crash if PerformanceObserver is not available', () => {
    // Remove PerformanceObserver
    delete (global as any).PerformanceObserver;
    
    // Should not throw
    expect(() => {
      render(<WebVitalsClient />);
    }).not.toThrow();
  });

  it('should handle PerformanceObserver errors gracefully', () => {
    // Make observe throw an error
    mockObserve.mockImplementation(() => {
      throw new Error('Observer error');
    });
    
    // Should not throw
    expect(() => {
      render(<WebVitalsClient />);
    }).not.toThrow();
  });

  it('should log LCP in development mode', () => {
    // Set NODE_ENV to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<WebVitalsClient />);
    
    // Get the LCP observer callback (first PerformanceObserver created)
    const lcpObserverCallback = observerInstances[0].callback;
    
    // Simulate LCP entry
    const mockEntry = {
      startTime: 1234.5678,
      entryType: 'largest-contentful-paint',
    };
    
    lcpObserverCallback({
      getEntries: () => [mockEntry],
    } as any, null as any);
    
    // Should log LCP
    expect(consoleLogSpy).toHaveBeenCalledWith('[WebVital] LCP:', '1235', 'ms');
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should not log LCP in production mode', () => {
    // Set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(<WebVitalsClient />);
    
    // Get the LCP observer callback
    const lcpObserverCallback = observerInstances[0].callback;
    
    // Simulate LCP entry
    const mockEntry = {
      startTime: 1234.5678,
      entryType: 'largest-contentful-paint',
    };
    
    lcpObserverCallback({
      getEntries: () => [mockEntry],
    } as any, null as any);
    
    // Should not log in production
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle empty entries array', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<WebVitalsClient />);
    
    // Get the LCP observer callback
    const lcpObserverCallback = observerInstances[0].callback;
    
    // Simulate empty entries
    lcpObserverCallback({
      getEntries: () => [],
    } as any, null as any);
    
    // Should not crash or log
    expect(consoleLogSpy).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });
});
