'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { 
  PROGRAM_ID, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  STANDARD_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@/lib/constants';

/**
 * Development-only diagnostics overlay
 * 
 * Displays critical environment validation and configuration issues
 * to help developers quickly identify problems that could cause blank pages.
 * 
 * Only shows in development mode when issues are detected.
 */
export function DiagnosticsOverlay() {
  const [issues, setIssues] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const detectedIssues: string[] = [];

    // Check required environment variables
    const requiredEnvs = [
      'NEXT_PUBLIC_SOLANA_NETWORK',
      'NEXT_PUBLIC_SOLANA_RPC_HOST',
    ];

    for (const envVar of requiredEnvs) {
      if (!process.env[envVar]) {
        detectedIssues.push(`Missing environment variable: ${envVar}`);
      }
    }

    // Validate Solana network configuration
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK;
    if (network && !['devnet', 'testnet', 'mainnet-beta', 'localnet'].includes(network)) {
      detectedIssues.push(`Invalid NEXT_PUBLIC_SOLANA_NETWORK: ${network}`);
    }

    // Check program ID is valid
    try {
      new PublicKey(PROGRAM_ID);
    } catch {
      detectedIssues.push(`Invalid PROGRAM_ID: ${PROGRAM_ID.toString()}`);
    }

    // Validate token program configuration
    const tokenProgramStr = TOKEN_PROGRAM_ID.toBase58();
    if (tokenProgramStr !== STANDARD_TOKEN_PROGRAM_ADDRESS && 
        tokenProgramStr !== TOKEN_2022_PROGRAM_ADDRESS) {
      detectedIssues.push(`TOKEN_PROGRAM_ID is not a recognized token program: ${tokenProgramStr}`);
    }

    // Check for common misconfigurations
    if (typeof window !== 'undefined') {
      // Verify process polyfill is available (required for Solana libraries)
      if (!(window as any).process?.env) {
        detectedIssues.push('window.process.env is not defined - clientProcessShim may not be loaded');
      }

      // Check localStorage is accessible
      try {
        localStorage.getItem('test');
      } catch {
        detectedIssues.push('localStorage is not accessible - browser may be in private mode or storage is disabled');
      }
    }

    setIssues(detectedIssues);
    setIsVisible(detectedIssues.length > 0);
  }, []);

  // Don't render in production or if no issues
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-yellow-900/95 backdrop-blur-md rounded-lg shadow-2xl border-2 border-yellow-500">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <span className="text-yellow-100 font-bold">
              {issues.length} Configuration Issue{issues.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="text-yellow-300 hover:text-yellow-100 text-xl"
              title="Dismiss"
            >
              ×
            </button>
            <span className="text-yellow-300 text-sm">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </div>

        {/* Issues List */}
        {isExpanded && (
          <div className="p-3 pt-0 border-t border-yellow-500/30">
            <ul className="space-y-2 text-sm">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-yellow-100">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span className="flex-1">{issue}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-3 pt-3 border-t border-yellow-500/30">
              <p className="text-yellow-200 text-xs">
                💡 <strong>Tip:</strong> Check your <code className="bg-yellow-950/50 px-1 rounded">.env.local</code> file 
                and restart the dev server after making changes.
              </p>
            </div>

            <div className="mt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold py-2 px-3 rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dev Mode Indicator */}
      <div className="mt-2 text-center">
        <span className="inline-block bg-gray-800/90 text-gray-300 text-xs px-2 py-1 rounded">
          🔧 Dev Mode
        </span>
      </div>
    </div>
  );
}
