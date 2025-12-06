/**
 * Client-side process shim
 * 
 * This module ensures that `process.env` is defined in the browser environment
 * to prevent "ReferenceError: process is not defined" errors.
 * 
 * Some libraries and inline scripts may reference `process.env.NODE_ENV` or other
 * process variables. This shim provides a minimal definition for browser compatibility.
 * 
 * This should be loaded as early as possible in the client-side bundle.
 */

if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  // Define a minimal process object in the browser
  // Default to 'development' to ensure proper dev tooling and warnings
  // Check if we're running in a Node.js environment first (e.g., during tests)
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;
  
  (window as any).process = {
    env: {
      NODE_ENV: nodeEnv || 'development',
    },
  };
}

export {};
