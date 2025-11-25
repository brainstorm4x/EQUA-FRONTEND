'use client';

import { FC, useState } from 'react';

interface KycKybModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: 'individual' | 'business';
}

export const KycKybModal: FC<KycKybModalProps> = ({ isOpen, onClose, accountType }) => {
  if (!isOpen) return null;

  const title = accountType === 'individual' ? 'KYC Verification' : 'KYB Verification';
  const description = accountType === 'individual' 
    ? 'Know Your Customer (KYC) verification will be required for individual accounts in a future update.'
    : 'Know Your Business (KYB) verification will be required for business accounts in a future update.';

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-modal-title"
    >
      <div 
        className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔜</span>
          </div>
          
          <h3 id="kyc-modal-title" className="text-2xl font-bold text-gray-900 mb-4">
            {title} - Coming Soon
          </h3>
          
          <p className="text-gray-600 mb-6">
            {description}
          </p>
          
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <p className="text-purple-700 text-sm">
              <strong>Note:</strong> Registration and minting are currently available without verification. 
              We will notify you when verification becomes required.
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
