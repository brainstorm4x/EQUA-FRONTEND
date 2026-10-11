'use client';

import { FC, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { 
  getUserMintTier, 
  isElevatedUser, 
  getRemainingElevatedAttempts,
  ELEVATED_MINT_TIERS 
} from '@/utils/registration';
import { hasTokenLocking, canUnlock, formatTimeRemaining, formatUnlockDate, getSecondsUntilUnlock } from '@/utils/locked-tokens';
import { getLockedTokenAccountPda } from '@/utils/pda-helpers';
import { rawToDecimal } from '@/utils/tokenFormat';
import { createUnlockTokensInstruction, getMintPDA, getUserAccountPDA, PROGRAM_ID } from '@/lib/program';

// UserAccount PDA structure constants (after 8-byte discriminator)
const USER_ACCOUNT_AUTHORITY_SIZE = 32;       // authority: Pubkey
const USER_ACCOUNT_REFERRAL_SIZE = 32;        // referral: Pubkey
const USER_ACCOUNT_TOKEN_ACCOUNT_SIZE = 32;   // token_account: Pubkey
const USER_ACCOUNT_MINTED_AMOUNT_SIZE = 8;    // minted_amount: u64
const USER_ACCOUNT_MINT_START_SIZE = 8;       // mint_start: i64
const USER_ACCOUNT_LAST_COUNTED_DAY_SIZE = 8; // last_counted_day: u64 (was referral_rewards)
const USER_ACCOUNT_LAST_MINT_TIME_SIZE = 8;   // last_mint_time: i64

const ANCHOR_DISCRIMINATOR_SIZE = 8;

// Calculate offset for last_mint_time field
const LAST_MINT_TIME_OFFSET = ANCHOR_DISCRIMINATOR_SIZE + 
  USER_ACCOUNT_AUTHORITY_SIZE + 
  USER_ACCOUNT_REFERRAL_SIZE + 
  USER_ACCOUNT_TOKEN_ACCOUNT_SIZE + 
  USER_ACCOUNT_MINTED_AMOUNT_SIZE + 
  USER_ACCOUNT_MINT_START_SIZE + 
  USER_ACCOUNT_LAST_COUNTED_DAY_SIZE;

// Minimum size for valid UserAccount
const MIN_USER_ACCOUNT_SIZE = LAST_MINT_TIME_OFFSET + USER_ACCOUNT_LAST_MINT_TIME_SIZE;

/**
 * Format a timestamp as a short date (e.g., "Jan 2, 2026")
 */
const formatShortDate = (timestamp: number): string => {
  if (timestamp <= 0) return 'Not started';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a timestamp with time (e.g., "Jan 2, 2026, 12:36 PM")
 */
const formatDateWithTime = (timestamp: number): string => {
  if (timestamp <= 0) return 'Never';
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface MintTierCardProps {
  userNumber: number;
  totalMints: number;
}

interface LockedTokenData {
  authority: PublicKey;
  lockedAmount: BN;
  lockStartTimestamp: BN;
  unlockTimestamp: BN;
  isUnlocked: boolean;
}

export const MintTierCard: FC<MintTierCardProps> = ({ userNumber, totalMints }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const tier = getUserMintTier(userNumber);
  const isElevated = isElevatedUser(userNumber);
  const remainingAttempts = getRemainingElevatedAttempts(userNumber, totalMints);
  const hasLocking = hasTokenLocking(userNumber);
  
  const [lockedTokenData, setLockedTokenData] = useState<LockedTokenData | null>(null);
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch locked token account data
  useEffect(() => {
    if (!hasLocking || !wallet.publicKey || !connection) return;
    
    const fetchLockedTokens = async () => {
      try {
        const [lockedTokenAccountPda] = getLockedTokenAccountPda(wallet.publicKey!, PROGRAM_ID);
        
        // Fetch the account data directly
        const accountInfo = await connection.getAccountInfo(lockedTokenAccountPda);
        
        if (!accountInfo || accountInfo.data.length === 0) {
          // Account doesn't exist yet (user hasn't minted)
          setLockedTokenData(null);
          return;
        }
        
        // Parse the account data manually
        // Structure: authority (32), lockedAmount (8), lockStartTimestamp (8), unlockTimestamp (8), isUnlocked (1)
        // Plus 8-byte discriminator at the beginning
        // Total expected size: 8 + 32 + 8 + 8 + 8 + 1 = 65 bytes
        const EXPECTED_ACCOUNT_SIZE = 65;
        const data = accountInfo.data;
        
        if (data.length < EXPECTED_ACCOUNT_SIZE) {
          console.error('Invalid locked token account data length');
          setLockedTokenData(null);
          return;
        }
        
        let offset = 8; // Skip discriminator
        
        const authority = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        const lockedAmount = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        
        const lockStartTimestamp = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        
        const unlockTimestamp = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;
        
        const isUnlocked = data[offset] !== 0;
        
        setLockedTokenData({
          authority,
          lockedAmount,
          lockStartTimestamp,
          unlockTimestamp,
          isUnlocked,
        });
      } catch (error) {
        console.log('Failed to fetch locked token account:', error);
        setLockedTokenData(null);
      }
    };
    
    fetchLockedTokens();
  }, [hasLocking, wallet.publicKey, connection]);
  
  // Fetch UserAccount data for last mint time
  useEffect(() => {
    if (!hasLocking || !wallet.publicKey || !connection) return;
    
    const fetchUserAccount = async () => {
      try {
        const [userAccountPda] = getUserAccountPDA(wallet.publicKey!);
        const accountInfo = await connection.getAccountInfo(userAccountPda);
        
        if (!accountInfo || accountInfo.data.length < MIN_USER_ACCOUNT_SIZE) {
          // Account doesn't exist or is too small
          return;
        }
        
        // Parse last_mint_time from UserAccount PDA
        const lastMint = new BN(
          accountInfo.data.slice(LAST_MINT_TIME_OFFSET, LAST_MINT_TIME_OFFSET + USER_ACCOUNT_LAST_MINT_TIME_SIZE),
          'le'
        ).toNumber();
        
        setLastMintTime(lastMint);
      } catch (error) {
        console.log('Failed to fetch user account:', error);
      }
    };
    
    fetchUserAccount();
  }, [hasLocking, wallet.publicKey, connection]);
  
  // Update countdown timer every second
  useEffect(() => {
    if (!lockedTokenData || lockedTokenData.isUnlocked) return;
    
    const updateTimer = () => {
      const seconds = getSecondsUntilUnlock(lockedTokenData.unlockTimestamp);
      setTimeRemaining(formatTimeRemaining(seconds));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [lockedTokenData]);

  const handleUnlock = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction) return;
    
    setLoading(true);
    try {
      const [mintPda] = getMintPDA();
      
      const tx = await connection.getLatestBlockhash();
      const instruction = createUnlockTokensInstruction(wallet.publicKey, mintPda);
      
      const transaction = new Transaction({
        ...tx,
        feePayer: wallet.publicKey,
      }).add(instruction);
      
      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      alert('✅ Tokens unlocked successfully!');
      
      // Refresh locked token data
      setLockedTokenData(null);
    } catch (error: any) {
      console.error('Unlock failed:', error);
      alert(`❌ Unlock failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!tier) return null;

  const lockedBalance = lockedTokenData && !lockedTokenData.isUnlocked 
    ? rawToDecimal(lockedTokenData.lockedAmount.toNumber())
    : 0;
  
  const canUnlockNow = lockedTokenData && !lockedTokenData.isUnlocked && canUnlock(lockedTokenData.unlockTimestamp);

  return (
    <div className={`rounded-2xl p-6 border-2 ${
      isElevated 
        ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50' 
        : 'bg-white/10 border-purple-500/30'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {isElevated && <span className="text-2xl">⭐</span>}
          Your Mint Tier
        </h3>
        {isElevated && (
          <span className="bg-yellow-500/30 text-yellow-200 text-xs font-semibold px-3 py-1 rounded-full">
            ELEVATED
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-xl p-4">
          <p className="text-purple-300 text-sm mb-1">Max per Attempt</p>
          <p className="text-white text-2xl font-bold">
            {tier.uniyaaPerAttempt.toLocaleString()} UNIYAA
          </p>
        </div>
        
        {isElevated && tier.elevatedAttempts > 0 && (
          <div className="bg-black/20 rounded-xl p-4">
            <p className="text-purple-300 text-sm mb-1">Elevated Attempts Left</p>
            <p className={`text-2xl font-bold ${
              remainingAttempts > 0 ? 'text-green-400' : 'text-gray-400'
            }`}>
              {remainingAttempts} / {tier.elevatedAttempts}
            </p>
          </div>
        )}
      </div>

      {/* Locked Token Information (Tiers 1-3 only) */}
      {hasLocking && lockedTokenData && !lockedTokenData.isUnlocked && !lockedTokenData.lockedAmount.isZero() && (
        <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold flex items-center gap-2">
              🔒 Locked Tokens
            </h4>
            {canUnlockNow && (
              <span className="bg-green-500/30 text-green-200 text-xs font-semibold px-2 py-1 rounded-full">
                READY TO UNLOCK
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-orange-300 text-sm">Locked Amount</p>
              <p className="text-white text-xl font-bold">
                {lockedBalance.toLocaleString()} UNIYAA
              </p>
            </div>
            <div>
              <p className="text-orange-300 text-sm">First Mint Date</p>
              <p className="text-white text-sm font-medium">
                {formatShortDate(lockedTokenData.lockStartTimestamp.toNumber())}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-orange-300 text-sm">Last Claimed</p>
              <p className="text-white text-sm font-medium">
                {formatDateWithTime(lastMintTime)}
              </p>
            </div>
            <div>
              <p className="text-orange-300 text-sm">Unlock Date</p>
              <p className="text-white text-sm font-medium">
                {formatUnlockDate(lockedTokenData.unlockTimestamp)}
              </p>
            </div>
          </div>
          
          {!canUnlockNow && (
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-orange-300 text-xs mb-1">Time Remaining</p>
              <p className="text-white text-lg font-semibold">{timeRemaining}</p>
            </div>
          )}
          
          {canUnlockNow && (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Unlocking...' : 'Unlock Tokens'}
            </button>
          )}
        </div>
      )}

      {isElevated && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mt-4">
          <p className="text-yellow-200 text-sm">
            🎉 As User #{userNumber}, you have access to elevated minting rates!
          </p>
        </div>
      )}
    </div>
  );
};

interface MintScheduleCardProps {
  className?: string;
}

export const MintScheduleCard: FC<MintScheduleCardProps> = ({ className }) => {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 ${className || ''}`}>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        📋 Upcoming Mint Schedule
      </h3>
      
      <div className="space-y-3">
        {ELEVATED_MINT_TIERS.slice(0, 4).map((tier, index) => (
          <div 
            key={index}
            className={`flex items-center justify-between p-3 rounded-xl ${
              index < 2 
                ? 'bg-yellow-500/10 border border-yellow-500/20' 
                : 'bg-white/5'
            }`}
          >
            <div>
              <p className="text-white font-medium">
                {tier.maxUser === Infinity 
                  ? `User #${tier.minUser}+`
                  : tier.minUser === tier.maxUser 
                    ? `User #${tier.minUser}`
                    : `Users #${tier.minUser}-${tier.maxUser}`
                }
              </p>
              <p className="text-purple-300 text-sm">
                {tier.elevatedAttempts > 0 
                  ? `${tier.elevatedAttempts} elevated attempts`
                  : 'Standard rate'
                }
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${index < 2 ? 'text-yellow-400' : 'text-white'}`}>
                {tier.uniyaaPerAttempt.toLocaleString()}
              </p>
              <p className="text-purple-300 text-sm">UNIYAA/attempt</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
