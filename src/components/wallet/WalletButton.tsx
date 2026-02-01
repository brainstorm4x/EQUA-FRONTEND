/**
 * Wallet Button Component
 * 
 * Connection button with EQUA design system
 * Shows different states: disconnected, connecting, connected
 */

'use client';

import { FC, useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletModal } from './WalletModal';
import { formatAddress, getExplorerUrl, copyToClipboard } from '@/lib/wallet/utils';
import { NETWORK } from '@/lib/constants';

interface WalletButtonProps {
  testId?: string;
}

export const WalletButton: FC<WalletButtonProps> = ({ testId }) => {
  const { publicKey, connected, connecting, disconnect, modalVisible, setModalVisible } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleConnect = useCallback(() => {
    setModalVisible(true);
  }, [setModalVisible]);
  
  const handleDisconnect = useCallback(async () => {
    setShowDropdown(false);
    await disconnect();
  }, [disconnect]);
  
  const handleCopyAddress = useCallback(async () => {
    if (!publicKey) return;
    
    const success = await copyToClipboard(publicKey.toBase58());
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [publicKey]);
  
  const handleViewExplorer = useCallback(() => {
    if (!publicKey) return;
    
    const url = getExplorerUrl(publicKey.toBase58(), NETWORK);
    window.open(url, '_blank');
    setShowDropdown(false);
  }, [publicKey]);
  
  // Connecting state
  if (connecting) {
    return (
      <div data-testid={testId}>
        <button
          disabled
          className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg opacity-75 cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Connecting...</span>
          </div>
        </button>
      </div>
    );
  }
  
  // Connected state
  if (connected && publicKey) {
    return (
      <div className="relative" data-testid={testId}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all flex items-center gap-3"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>{formatAddress(publicKey.toBase58())}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-md rounded-lg border border-purple-500/30 shadow-xl z-20">
              <div className="p-4 border-b border-purple-500/30">
                <p className="text-purple-200 text-xs mb-1">Connected Address</p>
                <p className="text-white text-sm font-mono break-all">
                  {publicKey.toBase58()}
                </p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={handleCopyAddress}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleViewExplorer}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>View in Explorer</span>
                </button>
                
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/10 rounded-lg transition-colors text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  
  // Disconnected state
  return (
    <div data-testid={testId}>
      <button
        onClick={handleConnect}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105"
      >
        Connect Wallet
      </button>
      
      <WalletModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </div>
  );
};
