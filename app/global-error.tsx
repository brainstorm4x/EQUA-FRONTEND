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
      <body>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full border border-purple-500/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🚨</div>
              <h2 className="text-3xl font-bold text-white mb-4">Critical Error</h2>
              <p className="text-purple-200 mb-6">
                {error.message || 'A critical error occurred. Please refresh the page.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && error.digest && (
                <div className="mb-6 p-4 bg-red-900/30 rounded-lg border border-red-500/50">
                  <p className="text-red-200 text-sm font-mono">
                    Error ID: {error.digest}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => reset()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-all backdrop-blur-sm"
                >
                  Reload Page
                </button>
              </div>

              <p className="text-purple-300 text-sm mt-6">
                If this problem persists, please try clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
        
        <style jsx global>{`
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
              'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
              'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}</style>
      </body>
    </html>
  );
}
