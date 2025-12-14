'use client';

import { useEffect } from 'react';

/**
 * Next.js Error Boundary for Client-Side Errors
 * 
 * This component catches errors that occur during client-side rendering
 * and displays a user-friendly error page instead of a blank screen.
 * 
 * More info: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Client-side error caught by error.tsx:', error);
    
    // Log error stack for debugging in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('Error stack:', error.stack);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-lg w-full border border-purple-500/30">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold text-white mb-4">Something went wrong</h2>
          <p className="text-purple-200 mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
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
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
