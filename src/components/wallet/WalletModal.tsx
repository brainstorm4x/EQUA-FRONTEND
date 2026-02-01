/**
 * Wallet Modal Component
 * 
 * Modal for selecting and connecting wallets
 * Features EQUA purple gradient theme and works on both desktop and mobile
 */

'use client';

import { FC, useCallback, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { WalletInfo } from '@/lib/wallet/types';
import { detectDeviceType } from '@/lib/wallet/utils';

// Fallback wallet icon with purple background and wallet emoji
const WALLET_ICON_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23a855f7" width="40" height="40"/%3E%3Ctext x="20" y="25" text-anchor="middle" fill="white" font-size="20"%3E💼%3C/text%3E%3C/svg%3E';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WalletModal: FC<WalletModalProps> = ({ visible, onClose }) => {
  const { wallets, select, connect, refreshWallets } = useWallet();
  const deviceType = detectDeviceType();
  const isMobile = deviceType !== 'desktop';
  
  // Refresh wallet detection when modal opens
  useEffect(() => {
    if (visible) {
      refreshWallets();
    }
  }, [visible, refreshWallets]);
  
  const handleWalletSelect = useCallback(async (wallet: WalletInfo) => {
    try {
      select(wallet.name);
      
      // Small delay to ensure wallet is selected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await connect();
      onClose();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      // If wallet not installed, offer to install
      if (error.name === 'WalletNotInstalledError') {
        const installUrl = isMobile 
          ? (deviceType === 'ios' ? wallet.installUrl.ios : wallet.installUrl.android)
          : wallet.installUrl.desktop;
        
        const shouldInstall = window.confirm(
          `${wallet.name} is not installed. Would you like to install it now?`
        );
        
        if (shouldInstall) {
          window.open(installUrl, '_blank');
        }
      }
      
      onClose();
    }
  }, [select, connect, onClose, deviceType, isMobile]);
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!visible) return null;
  
  // Separate installed and not installed wallets
  const installedWallets = wallets.filter(w => w.detected);
  const notInstalledWallets = wallets.filter(w => !w.detected);
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <div 
        className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 
            id="wallet-modal-title"
            className="text-white text-xl font-bold"
          >
            Connect Wallet
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        
        {/* Mobile Browser Warning */}
        {isMobile && installedWallets.length === 0 && (
          <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="text-yellow-100 font-semibold mb-2">
                  Browser Extensions Don&apos;t Work on Mobile
                </p>
                <p className="text-yellow-200 text-sm mb-3">
                  To connect your wallet on mobile:
                </p>
                <ol className="text-yellow-200 text-sm space-y-1 list-decimal list-inside">
                  <li>Open your wallet app (Phantom, Solflare, etc.)</li>
                  <li>Use the app&apos;s built-in browser (dApp browser)</li>
                  <li>Navigate to this website</li>
                  <li>Connect from within the wallet app</li>
                </ol>
              </div>
            </div>
          </div>
        )}
        
        {/* Installed Wallets */}
        {installedWallets.length > 0 && (
          <div className="mb-6">
            <h4 className="text-purple-200 text-sm font-semibold mb-3">Installed Wallets</h4>
            <div className="space-y-3">
              {installedWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleWalletSelect(wallet)}
                  className="w-full flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-lg transition-all border border-purple-500/30 hover:border-purple-400/50 touch-manipulation"
                >
                  <img 
                    src={wallet.icon} 
                    alt={`${wallet.name} icon`}
                    className="w-10 h-10 rounded"
                    onError={(e) => {
                      e.currentTarget.src = WALLET_ICON_FALLBACK;
                    }}
                  />
                  <div className="flex-1 text-left">
                    <span className="text-white font-semibold block">{wallet.name}</span>
                    <span className="text-purple-300 text-sm">Ready to connect</span>
                  </div>
                  <svg 
                    className="w-5 h-5 text-purple-300" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Not Installed Wallets - Only show on desktop or if no mobile warning */}
        {!isMobile && notInstalledWallets.length > 0 && (
          <div>
            <h4 className="text-purple-200 text-sm font-semibold mb-3">
              {installedWallets.length > 0 ? 'More Wallets' : 'Available Wallets'}
            </h4>
            <div className="space-y-3">
              {notInstalledWallets.map((wallet) => {
                const installUrl = isMobile 
                  ? (deviceType === 'ios' ? wallet.installUrl.ios : wallet.installUrl.android)
                  : wallet.installUrl.desktop;
                
                return (
                  <a
                    key={wallet.name}
                    href={installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md hover:bg-white/10 rounded-lg transition-all border border-purple-500/20 hover:border-purple-400/30 touch-manipulation"
                  >
                    <img 
                      src={wallet.icon} 
                      alt={`${wallet.name} icon`}
                      className="w-10 h-10 rounded opacity-60"
                      onError={(e) => {
                        e.currentTarget.src = WALLET_ICON_FALLBACK;
                      }}
                    />
                    <div className="flex-1 text-left">
                      <span className="text-white font-semibold block">{wallet.name}</span>
                      <span className="text-purple-300 text-sm">Install to connect</span>
                    </div>
                    <svg 
                      className="w-5 h-5 text-purple-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-purple-700/50">
          <p className="text-purple-300 text-sm text-center">
            New to Solana wallets?
          </p>
          <a
            href="https://solana.com/wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-200 hover:text-white text-sm block text-center mt-1 underline transition-colors"
          >
            Learn more about Solana wallets
          </a>
        </div>
      </div>
    </div>
  );
};
