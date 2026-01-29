/**
 * Custom Mobile Wallet Modal
 * 
 * Replaces @solana/wallet-adapter-react-ui modal on mobile devices to fix:
 * - Modal dismissal breaking button functionality
 * - State corruption when clicking outside modal
 * - Touch event bubbling issues
 * 
 * This modal properly handles:
 * - Backdrop clicks (closes modal without breaking button)
 * - Event propagation (prevents bubbling)
 * - State cleanup on close
 */

'use client';

import { FC } from 'react';
import { useWallet, Wallet } from '@solana/wallet-adapter-react';

interface MobileWalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MobileWalletModal: FC<MobileWalletModalProps> = ({ visible, onClose }) => {
  const { wallets, select } = useWallet();
  
  const handleWalletSelect = async (wallet: Wallet) => {
    try {
      select(wallet.adapter.name);
      // Close modal after successful selection
      onClose();
    } catch (error) {
      console.error('Failed to select wallet:', error);
      // Still close modal to avoid stuck state
      onClose();
    }
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking backdrop (not modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!visible) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-wallet-modal-title"
    >
      <div 
        className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking modal content
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 
            id="mobile-wallet-modal-title"
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
        
        {/* Wallet List */}
        {wallets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-purple-300">No wallets available</p>
            <p className="text-purple-400 text-sm mt-2">
              Please install a Solana wallet app
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                onClick={() => handleWalletSelect(wallet)}
                className="w-full flex items-center gap-4 p-4 bg-purple-800 hover:bg-purple-700 rounded-lg transition-colors touch-manipulation"
              >
                {wallet.adapter.icon && (
                  <img 
                    src={wallet.adapter.icon} 
                    alt={`${wallet.adapter.name} icon`}
                    className="w-8 h-8 rounded"
                  />
                )}
                <span className="text-white font-semibold">
                  {wallet.adapter.name}
                </span>
              </button>
            ))}
          </div>
        )}
        
        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-purple-700">
          <p className="text-purple-300 text-sm text-center">
            New to Solana wallets?
          </p>
          <a
            href="https://solana.com/wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-200 text-sm block text-center mt-1 underline"
          >
            Learn more about Solana wallets
          </a>
        </div>
      </div>
    </div>
  );
};
