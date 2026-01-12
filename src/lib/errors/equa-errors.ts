/**
 * EQUA Token Error Handling System
 * 
 * Synchronized with backend error codes (6000-6043)
 * Source: brainstorm4x/EQUA - public/idl/equa_token.json
 */

/**
 * EQUA error codes enum
 * All errors from the backend Anchor program
 */
export enum EquaErrorCode {
  // Overflow errors (6000-6003)
  UserCountOverflow = 6000,
  MintOverflow = 6001,
  TransactionOverflow = 6002,
  RewardOverflow = 6003,

  // Balance and validation errors (6004-6009)
  InsufficientBalance = 6004,
  ReferralRequired = 6005,
  InvalidReferralAccount = 6006,
  MintAmountExceedsTierLimit = 6007,
  InsufficientSolBalance = 6008,
  RapidReferralSequence = 6009,

  // PDA and account validation errors (6010-6018)
  InvalidPdaDerivation = 6010,
  InvalidAssociatedTokenAccount = 6011,
  InvalidAccountOwner = 6012,
  InvalidAccountDiscriminator = 6013,
  InvalidUserAccountPda = 6014,
  InvalidUserMetadataPda = 6015,
  InvalidGlobalStatePda = 6016,
  InvalidMintPda = 6017,
  InvalidMintAuthorityPda = 6018,

  // Referral and rewards errors (6019-6020)
  InsufficientReferralRewards = 6019,
  ReferralRewardClaimFailed = 6020,

  // Business registry errors (6021-6025)
  InvalidBusinessRegistryPda = 6021,
  BusinessAlreadyRegistered = 6022,
  BusinessNotRegistered = 6023,
  UnauthorizedBusinessOperation = 6024,
  InvalidBusinessName = 6025,

  // Locked token errors (6026-6028)
  InvalidLockedTokenAccountPda = 6026,
  InvalidLockedTokenAta = 6027,
  InvalidLockedTokenPda = 6028,

  // Social funds errors (6029-6035)
  InvalidSocialFundsStatePda = 6029,
  SocialFundsNotActivated = 6030,
  SocialFundsAlreadyActivated = 6031,
  UnauthorizedSocialFundsOperation = 6032,
  CompoundingNotComplete = 6033,
  MonthlyDistributionAlreadyExecuted = 6034,
  InvalidTimestamp = 6035,

  // Additional errors (6036-6043)
  LegacyReferralRewardsDeprecated = 6036,
  InsufficientReferralCredits = 6037,
  MonthlyBonusMintCapReached = 6038,
  BonusMintOverflow = 6039,
  LockPeriodNotExpired = 6040,
  AlreadyUnlocked = 6041,
  TimestampOverflow = 6042,
  MintingCooldownNotExpired = 6043,
}

/**
 * User-friendly error messages with actionable guidance
 */
export const ERROR_MESSAGES: Record<EquaErrorCode, string> = {
  // Overflow errors
  [EquaErrorCode.UserCountOverflow]: 
    "The maximum number of users has been reached. This is a critical system limit.",
  [EquaErrorCode.MintOverflow]: 
    "The requested mint amount would exceed the maximum token supply limit.",
  [EquaErrorCode.TransactionOverflow]: 
    "Transaction count has reached the maximum limit.",
  [EquaErrorCode.RewardOverflow]: 
    "Referral rewards have reached the maximum limit.",

  // Balance and validation errors
  [EquaErrorCode.InsufficientBalance]: 
    "You don't have enough EQUA tokens for this transfer. Check your balance and try again.",
  [EquaErrorCode.ReferralRequired]: 
    "A referral code is required to register. The first 100 users registered without referrals.",
  [EquaErrorCode.InvalidReferralAccount]: 
    "The referral code is invalid. The referrer must be a registered user with a valid account.",
  [EquaErrorCode.MintAmountExceedsTierLimit]: 
    "Your mint request exceeds your tier limit. Check your tier allocation and try a smaller amount.",
  [EquaErrorCode.InsufficientSolBalance]: 
    "Your wallet needs at least 0.05 SOL to register. This is an anti-spam measure.",
  [EquaErrorCode.RapidReferralSequence]: 
    "You're referring users too quickly. Please wait a few moments before referring another user.",

  // PDA and account validation errors
  [EquaErrorCode.InvalidPdaDerivation]: 
    "Account validation failed. The provided account doesn't match the expected program-derived address.",
  [EquaErrorCode.InvalidAssociatedTokenAccount]: 
    "Your token account is missing or invalid. Try reconnecting your wallet and registering again.",
  [EquaErrorCode.InvalidAccountOwner]: 
    "Account ownership validation failed. The account must be owned by the EQUA program.",
  [EquaErrorCode.InvalidAccountDiscriminator]: 
    "Account type mismatch. The account doesn't match the expected type for this operation.",
  [EquaErrorCode.InvalidUserAccountPda]: 
    "Your user account address is invalid. Try disconnecting and reconnecting your wallet.",
  [EquaErrorCode.InvalidUserMetadataPda]: 
    "User metadata account is invalid. This may indicate a registration issue.",
  [EquaErrorCode.InvalidGlobalStatePda]: 
    "Global state account is invalid. This is a system configuration error.",
  [EquaErrorCode.InvalidMintPda]: 
    "Token mint account is invalid. This is a system configuration error.",
  [EquaErrorCode.InvalidMintAuthorityPda]: 
    "Mint authority account is invalid. This is a system configuration error.",

  // Referral and rewards errors
  [EquaErrorCode.InsufficientReferralRewards]: 
    "You don't have any referral rewards to claim. Refer more users to earn rewards.",
  [EquaErrorCode.ReferralRewardClaimFailed]: 
    "Failed to claim referral rewards. Please try again later.",

  // Business registry errors
  [EquaErrorCode.InvalidBusinessRegistryPda]: 
    "Business registry account is invalid. This is a system configuration error.",
  [EquaErrorCode.BusinessAlreadyRegistered]: 
    "This business is already registered in the system.",
  [EquaErrorCode.BusinessNotRegistered]: 
    "This business is not registered. Please register your business first.",
  [EquaErrorCode.UnauthorizedBusinessOperation]: 
    "You don't have permission to perform this business operation.",
  [EquaErrorCode.InvalidBusinessName]: 
    "The business name is invalid. Please use a valid business name.",

  // Locked token errors
  [EquaErrorCode.InvalidLockedTokenAccountPda]: 
    "Locked token account is invalid. This may indicate a registration issue.",
  [EquaErrorCode.InvalidLockedTokenAta]: 
    "Locked token ATA is invalid. This may indicate a registration issue.",
  [EquaErrorCode.InvalidLockedTokenPda]: 
    "Locked token PDA is invalid. This may indicate a registration issue.",

  // Social funds errors
  [EquaErrorCode.InvalidSocialFundsStatePda]: 
    "Social funds state account is invalid. This is a system configuration error.",
  [EquaErrorCode.SocialFundsNotActivated]: 
    "Social funds are not yet activated. Please check back later.",
  [EquaErrorCode.SocialFundsAlreadyActivated]: 
    "Social funds have already been activated.",
  [EquaErrorCode.UnauthorizedSocialFundsOperation]: 
    "You don't have permission to perform this social funds operation.",
  [EquaErrorCode.CompoundingNotComplete]: 
    "Token compounding is not complete yet. Please wait for the compounding period to finish.",
  [EquaErrorCode.MonthlyDistributionAlreadyExecuted]: 
    "This month's distribution has already been executed.",
  [EquaErrorCode.InvalidTimestamp]: 
    "Invalid timestamp provided. Please try again.",

  // Additional errors
  [EquaErrorCode.LegacyReferralRewardsDeprecated]: 
    "Legacy referral rewards system is deprecated. Use the new referral credits system.",
  [EquaErrorCode.InsufficientReferralCredits]: 
    "You don't have enough referral credits for this bonus mint. Refer more users to earn credits.",
  [EquaErrorCode.MonthlyBonusMintCapReached]: 
    "You've reached your monthly bonus mint cap. Try again next month.",
  [EquaErrorCode.BonusMintOverflow]: 
    "Bonus mint amount would exceed the maximum limit.",
  [EquaErrorCode.LockPeriodNotExpired]: 
    "Your tokens are still locked. The 4-year lock period hasn't expired yet.",
  [EquaErrorCode.AlreadyUnlocked]: 
    "Your tokens have already been unlocked.",
  [EquaErrorCode.TimestampOverflow]: 
    "Timestamp value exceeded the maximum limit.",
  [EquaErrorCode.MintingCooldownNotExpired]: 
    "Please wait 24 hours between bonus mints. Your cooldown period hasn't expired yet.",
};

/**
 * Remediation steps for common errors
 */
export const REMEDIATION_STEPS: Partial<Record<EquaErrorCode, string[]>> = {
  [EquaErrorCode.ReferralRequired]: [
    "Ask a registered user for their referral code (their wallet public key)",
    "Enter the referral code in the registration form",
    "Make sure the referrer has already completed registration",
  ],
  [EquaErrorCode.InsufficientSolBalance]: [
    "Add at least 0.05 SOL to your wallet",
    "You can get devnet SOL from https://faucet.solana.com",
    "Wait a few moments after funding, then try again",
  ],
  [EquaErrorCode.MintAmountExceedsTierLimit]: [
    "Check your current tier allocation in the dashboard",
    "Request a smaller mint amount within your tier limit",
    "Elevated tier users: check your remaining elevated attempts",
  ],
  [EquaErrorCode.InvalidReferralAccount]: [
    "Verify the referral code is a valid Solana public key",
    "Ensure the referrer has completed registration",
    "Ask the referrer to confirm their public key is correct",
  ],
  [EquaErrorCode.MintingCooldownNotExpired]: [
    "Wait 24 hours between bonus mints",
    "Check your last mint timestamp in the dashboard",
    "Try again after the cooldown period expires",
  ],
  [EquaErrorCode.InsufficientReferralCredits]: [
    "Refer more users to earn referral credits",
    "Share your referral link with friends",
    "Each successful referral earns you bonus mint credits",
  ],
  [EquaErrorCode.LockPeriodNotExpired]: [
    "Locked tokens are held for 4 years (cliff vesting)",
    "Check your lock expiration date in the dashboard",
    "Unlocked tokens are available immediately",
  ],
};

/**
 * Parse error from transaction failure
 * Extracts EQUA error code from Anchor error messages
 * 
 * @param error - Error object from transaction
 * @returns Parsed error code or null if not an EQUA error
 */
export function parseEquaErrorCode(error: any): EquaErrorCode | null {
  if (!error) return null;

  // Convert error to string for pattern matching
  const errorString = error.toString();
  const errorMessage = error.message || '';

  // Pattern 1: Anchor error with code (e.g., "custom program error: 0x1771")
  const hexMatch = errorString.match(/0x([0-9a-fA-F]+)/);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    if (code >= 6000 && code <= 6043) {
      return code as EquaErrorCode;
    }
  }

  // Pattern 2: Direct error code in message
  const codeMatch = errorString.match(/error code[:\s]+(\d+)/i);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    if (code >= 6000 && code <= 6043) {
      return code as EquaErrorCode;
    }
  }

  // Pattern 3: Error name in message (e.g., "ReferralRequired")
  for (const [key, value] of Object.entries(EquaErrorCode)) {
    if (typeof value === 'number' && errorString.includes(key)) {
      return value as EquaErrorCode;
    }
  }

  return null;
}

/**
 * Get user-friendly error message from error code
 * 
 * @param code - EQUA error code
 * @returns User-friendly error message
 */
export function getErrorMessage(code: EquaErrorCode): string {
  return ERROR_MESSAGES[code] || "An unknown error occurred. Please try again.";
}

/**
 * Get remediation steps for an error
 * 
 * @param code - EQUA error code
 * @returns Array of remediation steps or empty array
 */
export function getRemediationSteps(code: EquaErrorCode): string[] {
  return REMEDIATION_STEPS[code] || [];
}

/**
 * Format error for display to user
 * Combines error message and remediation steps
 * 
 * @param error - Error object from transaction
 * @returns Formatted error object with message and steps
 */
export function formatEquaError(error: any): {
  message: string;
  code?: EquaErrorCode;
  steps: string[];
} {
  const code = parseEquaErrorCode(error);
  
  if (code !== null) {
    return {
      message: getErrorMessage(code),
      code,
      steps: getRemediationSteps(code),
    };
  }

  // Fallback for non-EQUA errors
  return {
    message: error.message || error.toString() || "An unexpected error occurred.",
    steps: ["Try again in a few moments", "If the problem persists, contact support"],
  };
}

/**
 * Check if error is a specific EQUA error code
 * 
 * @param error - Error object from transaction
 * @param code - Expected error code
 * @returns true if error matches the code
 */
export function isEquaError(error: any, code: EquaErrorCode): boolean {
  const parsedCode = parseEquaErrorCode(error);
  return parsedCode === code;
}
