'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync, 
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { getMintPDA, getSPLTokenBalance } from '@/lib/program';
import { Logo } from './Logo';
import Image from 'next/image';

interface WalletDashboardProps {
  className?: string;
}

// EQUA Token has 6 decimals
const EQUA_DECIMALS = 6;
const EQUA_MULTIPLIER = Math.pow(10, EQUA_DECIMALS);

export const WalletDashboard: FC<WalletDashboardProps> = ({ className = '' }) => {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  // Fetch EQUA balance
  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(0);
      return;
    }

    const fetchBalance = async () => {
      try {
        const [mintPDA] = getMintPDA();
        const tokenAccount = getAssociatedTokenAddressSync(
          mintPDA,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const bal = await getSPLTokenBalance(connection, tokenAccount);
        setBalance(bal);
      } catch (error) {
        console.error('Error fetching EQUA balance:', error);
        setBalance(0);
      }
    };

    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connected, connection]);

  // Copy public key to clipboard
  const copyPublicKey = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [publicKey]);

  // Share referral
  const shareReferral = useCallback(async () => {
    if (!publicKey) return;
    
    const referralMessage = `Join EQUA Token - A revolutionary token system on Solana with price appreciation! Use my referral: ${publicKey.toBase58()}\n\nGet started: https://equa.brainstorm4x.com/mint`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join EQUA Token',
          text: referralMessage,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        await navigator.clipboard.writeText(referralMessage);
        setShareMessage('Referral message copied!');
        setTimeout(() => setShareMessage(''), 2000);
      }
    } else {
      // Fallback for browsers without share API
      await navigator.clipboard.writeText(referralMessage);
      setShareMessage('Referral message copied!');
      setTimeout(() => setShareMessage(''), 2000);
    }
  }, [publicKey]);

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-purple-500/30 to-purple-600/30 backdrop-blur-md rounded-2xl p-6 border border-purple-400/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-purple-200 text-lg font-medium">Your EQUA Balance</h3>
          <Logo size={32} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white text-4xl font-bold">
            {balance.toLocaleString()}
          </span>
          <span className="text-purple-300 text-xl">EQUA</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">📤</span>
          Send EQUA
        </button>
        <button
          onClick={() => setShowReceiveModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <span className="text-xl">📥</span>
          Receive EQUA
        </button>
      </div>

      {/* Referral Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
          <span className="text-2xl">🎁</span>
          Refer & Earn
        </h3>
        <p className="text-purple-200 text-sm mb-4">
          Share your public key to refer others and earn 1% of their minted EQUA!
        </p>
        
        <div className="bg-black/20 rounded-xl p-3 mb-4">
          <p className="text-purple-300 text-xs mb-1">Your Referral Key</p>
          <p className="text-white text-xs font-mono break-all">
            {publicKey.toBase58()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyPublicKey}
            className="bg-purple-500/30 hover:bg-purple-500/50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            {copied ? '✅ Copied!' : '📋 Copy Key'}
          </button>
          <button
            onClick={shareReferral}
            className="bg-green-500/30 hover:bg-green-500/50 text-white py-3 px-4 rounded-xl transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            📲 Share
          </button>
        </div>
        
        {shareMessage && (
          <p className="text-green-400 text-sm text-center mt-3">{shareMessage}</p>
        )}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <SendModal
          publicKey={publicKey}
          balance={balance}
          connection={connection}
          signTransaction={signTransaction}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            // Refresh balance after send
            setTimeout(async () => {
              const [mintPDA] = getMintPDA();
              const tokenAccount = getAssociatedTokenAddressSync(
                mintPDA,
                publicKey,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              );
              const bal = await getSPLTokenBalance(connection, tokenAccount);
              setBalance(bal);
            }, 2000);
          }}
        />
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <ReceiveModal
          publicKey={publicKey}
          onClose={() => setShowReceiveModal(false)}
        />
      )}
    </div>
  );
};

// Send Modal Component
interface SendModalProps {
  publicKey: PublicKey;
  balance: number;
  connection: any;
  signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

const SendModal: FC<SendModalProps> = ({ 
  publicKey, 
  balance, 
  connection, 
  signTransaction,
  onClose, 
  onSuccess 
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle QR code image upload - placeholder for future implementation
  // Note: Full QR parsing would require a library like jsQR
  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, inform user about the limitation
    setError('QR scanning coming soon! Please paste the address manually for now.');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Try to validate as Solana address
      try {
        new PublicKey(text.trim());
        setRecipientAddress(text.trim());
        setError('');
      } catch {
        setError('Clipboard does not contain a valid Solana address');
      }
    } catch (err) {
      setError('Could not read from clipboard');
    }
  };

  const handleSend = async () => {
    if (!recipientAddress || !amount || !signTransaction) return;
    
    setIsLoading(true);
    setError('');
    setTxSignature('');

    try {
      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress);
      } catch {
        throw new Error('Invalid recipient address');
      }

      // Validate amount
      const sendAmount = parseFloat(amount);
      if (isNaN(sendAmount) || sendAmount <= 0) {
        throw new Error('Invalid amount');
      }
      if (sendAmount > balance) {
        throw new Error('Insufficient balance');
      }

      const [mintPDA] = getMintPDA();
      
      // Get sender's token account
      const senderTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get recipient's token account
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        mintPDA,
        recipientPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();

      // Check if recipient token account exists, if not create it
      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      if (!recipientAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientTokenAccount, // ata
            recipientPubkey, // owner
            mintPDA, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Add transfer instruction
      const amountInBaseUnits = Math.floor(sendAmount * EQUA_MULTIPLIER);
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,
          recipientTokenAccount,
          publicKey,
          amountInBaseUnits,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      transaction.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      setTxSignature(signature);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send EQUA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📤</span>
            Send EQUA
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {txSignature ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 text-lg font-bold mb-2">Transaction Successful!</p>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-300 hover:text-white underline text-sm"
            >
              View on Explorer
            </a>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-purple-200 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana address"
                className="w-full bg-white/10 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:border-purple-500"
              />
              
              {/* Quick actions for address input */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handlePaste}
                  className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                >
                  📋 Paste
                </button>
                <label className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer">
                  📷 Upload QR
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-purple-200 text-sm mb-2">Amount (EQUA)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.000001"
                  className="w-full bg-white/10 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-400/60 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => setAmount(balance.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white text-sm"
                >
                  MAX
                </button>
              </div>
              <p className="text-purple-400 text-xs mt-1">
                Available: {balance.toLocaleString()} EQUA
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={isLoading || !recipientAddress || !amount}
              className={`w-full font-bold py-4 px-6 rounded-xl transition-all ${
                isLoading || !recipientAddress || !amount
                  ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isLoading ? '⏳ Sending...' : 'Send EQUA'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Receive Modal Component
interface ReceiveModalProps {
  publicKey: PublicKey;
  onClose: () => void;
}

const ReceiveModal: FC<ReceiveModalProps> = ({ publicKey, onClose }) => {
  const [copied, setCopied] = useState(false);
  // Using a public QR code API - the address is a public key anyway
  // Note: For production, consider using a client-side QR library like 'qrcode' package
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicKey.toBase58())}`;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-purple-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📥</span>
            Receive EQUA
          </h3>
          <button 
            onClick={onClose}
            className="text-purple-300 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="text-center">
          {/* QR Code */}
          <div className="bg-white rounded-xl p-4 inline-block mb-4">
            {/* Using img for external QR code API - next/image doesn't support external domains by default */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={qrCodeUrl} 
              alt="QR Code"
              width={200}
              height={200}
              className="mx-auto"
            />
          </div>

          <p className="text-purple-200 text-sm mb-4">
            Scan this QR code or copy your address below to receive EQUA tokens
          </p>

          {/* Address */}
          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <p className="text-white text-xs font-mono break-all">
              {publicKey.toBase58()}
            </p>
          </div>

          <button
            onClick={copyAddress}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            {copied ? '✅ Copied!' : '📋 Copy Address'}
          </button>
        </div>
      </div>
    </div>
  );
};
