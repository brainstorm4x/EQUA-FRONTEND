'use client';

import { useEffect } from 'react';

/**
 * Next.js Global Error Boundary
 * 
 * This component catches errors that occur in the root layout
 * and other errors that bubble up to the top level.
 * It's a last resort error handler that ensures users never see a blank page.
 * 
 * Note: This must include its own <html> and <body> tags as it replaces
 * the root layout when an error occurs.
 * 
 * More info: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Global error caught by global-error.tsx:', error);
    
    // Log error stack for debugging in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    // Log to external error tracking service if configured
    if (typeof window !== 'undefined') {
      // You can add external error tracking here (e.g., Sentry, LogRocket)
      console.error('[Global Error] Error details:', {
        message: error.message,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        userAgent: window.navigator.userAgent,
      });
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Critical Error - EQUA</title>
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, rgb(88 28 135), rgb(109 40 217), rgb(147 51 234))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '32rem',
            width: '100%',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚨</div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                Critical Error
              </h2>
              <p style={{ color: 'rgb(216 180 254)', marginBottom: '1.5rem' }}>
                {error.message || 'A critical error occurred. Please refresh the page.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && error.digest && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(127, 29, 29, 0.3)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(239, 68, 68, 0.5)'
                }}>
                  <p style={{
                    color: 'rgb(254 202 202)',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}>
                    Error ID: {error.digest}
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => reset()}
                  style={{
                    background: 'rgb(147 51 234)',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(4px)',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reload Page
                </button>
              </div>

              <p style={{
                color: 'rgb(192 132 252)',
                fontSize: '0.875rem',
                marginTop: '1.5rem'
              }}>
                If this problem persists, please try clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
