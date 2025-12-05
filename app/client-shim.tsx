'use client';

/**
 * ClientShim component
 * 
 * This component imports the client process shim to ensure that
 * process.env is defined in the browser before any other code runs.
 * 
 * It must be included near the top of the app layout and rendered
 * on the client side only.
 */

// Import the shim to execute it
import '@/lib/clientProcessShim';

export default function ClientShim() {
  // This component renders nothing but ensures the shim is loaded
  return null;
}
