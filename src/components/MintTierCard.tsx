'use client';

import { FC } from 'react';
import { 
  getUserMintTier, 
  isElevatedUser, 
  getRemainingElevatedAttempts,
  ELEVATED_MINT_TIERS 
} from '@/utils/registration';

interface MintTierCardProps {
  userNumber: number;
  totalMints: number;
}

export const MintTierCard: FC<MintTierCardProps> = ({ userNumber, totalMints }) => {
  const tier = getUserMintTier(userNumber);
  const isElevated = isElevatedUser(userNumber);
  const remainingAttempts = getRemainingElevatedAttempts(userNumber, totalMints);

  if (!tier) return null;

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
            {tier.equaPerAttempt.toLocaleString()} EQUA
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

      {isElevated && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
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
                {tier.equaPerAttempt.toLocaleString()}
              </p>
              <p className="text-purple-300 text-sm">EQUA/attempt</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
