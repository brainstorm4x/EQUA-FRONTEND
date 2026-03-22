'use client';

import { FC, useState } from 'react';
import { useNetworkDiagnostics } from '@/hooks/useNetworkDiagnostics';

interface NetworkDiagnosticsBannerProps {
  className?: string;
}

export const NetworkDiagnosticsBanner: FC<NetworkDiagnosticsBannerProps> = ({ className = '' }) => {
  const diagnostics = useNetworkDiagnostics();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show banner while loading
  if (diagnostics.isLoading) {
    return null;
  }

  // Don't show if dismissed and healthy
  if (isDismissed && diagnostics.isHealthy) {
    return null;
  }

  // Show minimized healthy indicator that can be expanded
  if (diagnostics.isHealthy) {
    return (
      <div className={`${className} bg-green-500/20 border border-green-500/50 rounded-xl p-3 mb-4`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span className="text-green-300 text-sm font-medium">
              On-chain connection healthy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300 text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-3 pl-7 space-y-1">
            <div className="text-green-200 text-xs">
              <span className="font-medium">Cluster:</span> {diagnostics.clusterInfo?.displayName || 'Unknown'}
            </div>
            <div className="text-green-200 text-xs">
              <span className="font-medium">RPC:</span> {diagnostics.clusterInfo?.endpoint || 'Unknown'}
            </div>
            <div className="text-green-200 text-xs break-all">
              <span className="font-medium">Program ID:</span> {diagnostics.programId}
            </div>
            <div className="text-green-200 text-xs break-all">
              <span className="font-medium">Token Program:</span> {diagnostics.tokenProgramId}
            </div>
            <div className="text-green-200 text-xs">
              <span className="font-medium">GlobalState:</span> ✓ Found
            </div>
            <div className="text-green-200 text-xs">
              <span className="font-medium">Mint:</span> ✓ Found
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  return (
    <div className={`${className} bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <h4 className="text-red-300 text-sm font-bold mb-1">
              Network Configuration Issues Detected
            </h4>
            <p className="text-red-200 text-xs mb-2">
              Your wallet may not sync properly. Check the details below:
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-red-300 hover:text-red-100 text-lg leading-none ml-2"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Current Configuration */}
      <div className="bg-black/20 rounded-lg p-3 mb-3 space-y-1">
        <div className="text-red-200 text-xs">
          <span className="font-medium">Cluster:</span> {diagnostics.clusterInfo?.displayName || 'Unknown'}
        </div>
        <div className="text-red-200 text-xs break-all">
          <span className="font-medium">RPC:</span> {diagnostics.clusterInfo?.endpoint || 'Unknown'}
        </div>
        <div className="text-red-200 text-xs break-all">
          <span className="font-medium">Program ID (env):</span> {diagnostics.programId}
        </div>
        {diagnostics.idlProgramId && diagnostics.idlProgramId !== diagnostics.programId && (
          <div className="text-red-200 text-xs break-all">
            <span className="font-medium">Program ID (IDL):</span> {diagnostics.idlProgramId}
          </div>
        )}
        <div className="text-red-200 text-xs break-all">
          <span className="font-medium">Token Program:</span> {diagnostics.tokenProgramId}
        </div>
        <div className="text-red-200 text-xs">
          <span className="font-medium">GlobalState:</span> {diagnostics.globalStateExists ? '✓ Found' : '✗ Missing'}
        </div>
        <div className="text-red-200 text-xs">
          <span className="font-medium">Mint:</span> {diagnostics.mintExists ? '✓ Found' : '✗ Missing'}
        </div>
        {diagnostics.mintOwner && (
          <div className="text-red-200 text-xs break-all">
            <span className="font-medium">Mint Owner:</span> {diagnostics.mintOwner}
          </div>
        )}
      </div>

      {/* Errors and Actionable Steps */}
      {diagnostics.errors.map((error, index) => (
        <div key={index} className="mb-3 last:mb-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-red-400 text-xs font-bold">●</span>
            <div className="flex-1">
              <p className="text-red-300 text-xs font-medium mb-1">{error.message}</p>
              <div className="bg-black/30 rounded p-2 space-y-1">
                <p className="text-red-200 text-xs font-medium mb-1">How to fix:</p>
                {error.actionableSteps.map((step, stepIndex) => (
                  <p key={stepIndex} className="text-red-200 text-xs pl-2">
                    {stepIndex + 1}. {step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* General Help */}
      <div className="mt-3 pt-3 border-t border-red-500/30">
        <p className="text-red-200 text-xs">
          <span className="font-medium">Need help?</span> Check the{' '}
          <a
            href="https://github.com/brainstorm4x/UNIA-FRONTEND/blob/main/docs/TROUBLESHOOTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-red-100"
          >
            troubleshooting guide
          </a>
          {' '}or ensure your wallet is connected to the correct network.
        </p>
      </div>
    </div>
  );
};
