import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_DECIMALS } from './constants';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas for better readability
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a token amount with proper decimals
 * @param amount - Raw token amount (with decimals)
 * @param decimals - Token decimals (default: TOKEN_DECIMALS)
 */
export function formatTokenAmount(amount: number, decimals: number = TOKEN_DECIMALS): string {
  const value = amount / Math.pow(10, decimals);
  return formatNumber(value, 2);
}

/**
 * Shorten a Solana address for display
 * @param address - The public key or address string
 * @param chars - Number of characters to show on each end (default: 4)
 */
export function shortenAddress(address: PublicKey | string, chars: number = 4): string {
  const addr = typeof address === 'string' ? address : address.toBase58();
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/**
 * Format a date to a readable string
 * @param timestamp - Unix timestamp in seconds
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format time remaining from a timestamp
 * @param endTimestamp - Unix timestamp in seconds when period ends
 */
export function formatTimeRemaining(endTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTimestamp - now;

  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((remaining % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}

/**
 * Validate if a string is a valid Solana address
 * @param address - Address string to validate
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get explorer URL for a transaction
 * @param signature - Transaction signature
 * @param cluster - Network cluster (default: 'devnet')
 */
export function getExplorerUrl(signature: string, cluster: string = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Get explorer URL for an address
 * @param address - Public key or address string
 * @param cluster - Network cluster (default: 'devnet')
 */
export function getAddressExplorerUrl(address: PublicKey | string, cluster: string = 'devnet'): string {
  const addr = typeof address === 'string' ? address : address.toBase58();
  return `https://explorer.solana.com/address/${addr}?cluster=${cluster}`;
}

/**
 * Format SOL amount
 * @param lamports - Amount in lamports
 */
export function formatSolAmount(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return `${formatNumber(sol, 4)} SOL`;
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
