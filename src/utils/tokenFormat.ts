/**
 * Token formatting utilities for UNIYAA token
 * 
 * UNIYAA token uses 6 decimals (1,000,000 base units = 1 UNIYAA)
 * The smallest unit of UNIYAA is called Gajbhiye (singular) / Gajbhiyes (plural)
 */

// UNIYAA token decimals - imported from centralized config for consistency
import { UNIYAA_DECIMALS } from '@/lib/constants';

/**
 * Name of the smallest unit of UNIYAA
 */
export const SMALLEST_UNIT_NAME = 'Gajbhiye';
export const SMALLEST_UNIT_NAME_PLURAL = 'Gajbhiyes';

export interface FormatOptions {
  /** Number of decimal places to show. Defaults to token decimals (6) */
  decimals?: number;
  /** Whether to trim trailing zeros. Defaults to false */
  trimTrailingZeros?: boolean;
  /** Whether to show thousands separators. Defaults to true */
  useGrouping?: boolean;
  /** Token decimals (base unit multiplier). Defaults to 6 */
  tokenDecimals?: number;
}

/**
 * Formats a raw UNIYAA token amount (in base units/Gajbhiyes) to a human-readable UNIYAA string
 * This shows the actual UNIYAA balance, not the smallest unit
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @param options - Formatting options
 * @returns Formatted token amount as a string
 * 
 * @example
 * formatUniyaaRaw(1_000_000_000) // "1,000.000000" (with 6 decimals)
 * formatUniyaaRaw(1_000_000_000, { decimals: 2 }) // "1,000.00"
 * formatUniyaaRaw(1_000_000_000, { trimTrailingZeros: true }) // "1,000"
 * formatUniyaaRaw(3_120_045, { trimTrailingZeros: true }) // "3.120045"
 * formatUniyaaRaw(123_456) // "0.123456"
 * formatUniyaaRaw(1_000_000_000, { tokenDecimals: 9 }) // "1.000000000" (if mint had 9 decimals)
 * 
 * @note This function converts bigint to Number. While this can lose precision for values
 * larger than Number.MAX_SAFE_INTEGER (2^53 - 1 = ~9 quadrillion), with 6 decimal places
 * this means amounts above ~9 billion UNIYAA tokens (in raw base units) may lose precision.
 * For typical individual holdings and transactions, this precision is more than sufficient.
 * The SPL token program uses u64, which has a maximum value of ~18 quintillion.
 */
export function formatUniyaaRaw(
  rawAmount: number | string | bigint,
  options: FormatOptions = {}
): string {
  const {
    decimals = UNIYAA_DECIMALS,
    trimTrailingZeros = false,
    useGrouping = true,
    tokenDecimals = UNIYAA_DECIMALS,
  } = options;

  // Convert to number if string or bigint
  const amount = typeof rawAmount === 'bigint' 
    ? Number(rawAmount) 
    : typeof rawAmount === 'string'
    ? parseFloat(rawAmount)
    : rawAmount;

  // Handle invalid numbers
  if (isNaN(amount) || !isFinite(amount)) {
    return '0'.padEnd(decimals + 2, '0'); // "0.000..." with appropriate decimal places
  }

  // Convert from raw units (Gajbhiyes) to UNIYAA tokens using dynamic decimals
  const multiplier = Math.pow(10, tokenDecimals);
  const tokenAmount = amount / multiplier;

  // Format with specified decimals
  let formatted = tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: trimTrailingZeros ? 0 : decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });

  return formatted;
}

/**
 * Formats a raw UNIYAA token amount to display the actual UNIYAA balance
 * Shows appropriate decimal places based on the balance value
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @param tokenDecimals - Token decimals (defaults to 6)
 * @returns Formatted UNIYAA balance string with appropriate decimals
 * 
 * @example
 * formatUniyaaBalance(100_000_000_000) // "100,000" (whole number, no decimals needed)
 * formatUniyaaBalance(1_500_000) // "1.5" (fractional, shows needed decimals)
 * formatUniyaaBalance(123_456) // "0.123456" (small amount, shows all decimals)
 */
export function formatUniyaaBalance(rawAmount: number | string | bigint, tokenDecimals: number = UNIYAA_DECIMALS): string {
  // Convert to number if string or bigint
  const amount = typeof rawAmount === 'bigint' 
    ? Number(rawAmount) 
    : typeof rawAmount === 'string'
    ? parseFloat(rawAmount)
    : rawAmount;

  // Handle invalid numbers
  if (isNaN(amount) || !isFinite(amount)) {
    return '0';
  }

  // Convert from raw units (Gajbhiyes) to UNIYAA tokens using dynamic decimals
  const multiplier = Math.pow(10, tokenDecimals);
  const tokenAmount = amount / multiplier;

  // If it's a whole number, show without decimals
  if (Number.isInteger(tokenAmount)) {
    return tokenAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    });
  }

  // Otherwise, show with appropriate decimals (trim trailing zeros)
  // Find out how many decimal places are significant
  const tokenStr = tokenAmount.toString();
  const decimalPart = tokenStr.includes('.') ? tokenStr.split('.')[1] : '';
  const significantDecimals = Math.min(decimalPart.replace(/0+$/, '').length, tokenDecimals);
  
  return tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(significantDecimals, 2), // At least 2 decimals for fractional amounts
    useGrouping: true,
  });
}

/**
 * Parses a formatted UNIYAA token string back to raw base units (Gajbhiyes)
 * 
 * @param formattedAmount - The formatted token amount (e.g., "1,000.50" or "0.123456789")
 * @param tokenDecimals - Token decimals (defaults to 6)
 * @returns Raw token amount in base units (Gajbhiyes)
 * 
 * @example
 * parseUniyaaFormatted("1,000") // 1_000_000 (with 6 decimals)
 * parseUniyaaFormatted("0.123456") // 123_456
 * 
 * @note Uses Math.round which can introduce minor rounding errors for edge cases with
 * floating point arithmetic. For precise financial calculations, consider using a
 * decimal library. However, for typical token amounts, the precision is sufficient.
 */
export function parseUniyaaFormatted(formattedAmount: string, tokenDecimals: number = UNIYAA_DECIMALS): number {
  // Remove any grouping separators (commas)
  const cleaned = formattedAmount.replace(/,/g, '');
  const tokenAmount = parseFloat(cleaned);

  if (isNaN(tokenAmount)) {
    return 0;
  }

  // Convert to raw units using dynamic decimals (using Math.round to minimize floating point errors)
  const multiplier = Math.pow(10, tokenDecimals);
  return Math.round(tokenAmount * multiplier);
}

/**
 * Converts raw UNIYAA amount (in Gajbhiyes) to a number (decimal UNIYAA form)
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @param tokenDecimals - Token decimals (defaults to 6)
 * @returns Token amount as a decimal number (UNIYAA)
 * 
 * @example
 * rawToDecimal(1_000_000) // 1 (with 6 decimals)
 * rawToDecimal(123_456) // 0.123456
 * 
 * @note Converting bigint to Number can lose precision for values larger than
 * Number.MAX_SAFE_INTEGER (~9 quadrillion). With 6 decimal places, this means
 * amounts above ~9 billion UNIYAA tokens (in raw base units) may lose precision.
 * For typical individual holdings, this is more than sufficient.
 */
export function rawToDecimal(rawAmount: number | string | bigint, tokenDecimals: number = UNIYAA_DECIMALS): number {
  const amount = typeof rawAmount === 'bigint' 
    ? Number(rawAmount) 
    : typeof rawAmount === 'string'
    ? parseFloat(rawAmount)
    : rawAmount;

  if (isNaN(amount) || !isFinite(amount)) {
    return 0;
  }

  const multiplier = Math.pow(10, tokenDecimals);
  return amount / multiplier;
}

/**
 * Converts a decimal UNIYAA amount to raw base units (Gajbhiyes)
 * 
 * @param decimalAmount - Token amount as a decimal number (UNIYAA)
 * @param tokenDecimals - Token decimals (defaults to 6)
 * @returns Raw token amount in base units (Gajbhiyes)
 * 
 * @example
 * decimalToRaw(1) // 1_000_000 (with 6 decimals)
 * decimalToRaw(0.123456) // 123_456
 * 
 * @note Uses Math.round to minimize floating point errors. For typical token amounts
 * within reasonable ranges, the precision is sufficient. Very large or very precise
 * values may have minor rounding discrepancies due to IEEE 754 floating point arithmetic.
 */
export function decimalToRaw(decimalAmount: number, tokenDecimals: number = UNIYAA_DECIMALS): number {
  if (isNaN(decimalAmount) || !isFinite(decimalAmount)) {
    return 0;
  }

  const multiplier = Math.pow(10, tokenDecimals);
  return Math.round(decimalAmount * multiplier);
}

/**
 * Parses a decimal string amount to raw base units using BigInt for precision
 * Avoids floating point issues by working with string manipulation
 * 
 * @param decimalString - Amount as a decimal string (e.g., "1.123456")
 * @param tokenDecimals - Token decimals (defaults to 6)
 * @returns Raw token amount in base units as bigint, or null if invalid
 * 
 * @example
 * parseDecimalStringToRaw("1.5", 6) // 1500000n
 * parseDecimalStringToRaw("0.123456", 6) // 123456n
 * parseDecimalStringToRaw("100", 6) // 100000000n
 */
export function parseDecimalStringToRaw(decimalString: string, tokenDecimals: number = UNIYAA_DECIMALS): bigint | null {
  try {
    // Remove whitespace and validate
    const cleaned = decimalString.trim();
    if (!cleaned || cleaned === '' || !/^[0-9.]+$/.test(cleaned)) {
      return null;
    }

    // Split into integer and decimal parts
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return null; // Multiple decimal points
    }

    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';

    // Check if decimal part exceeds token decimals
    if (decimalPart.length > tokenDecimals) {
      // Truncate to token decimals (no rounding)
      const truncatedDecimal = decimalPart.slice(0, tokenDecimals);
      const combined = integerPart + truncatedDecimal.padEnd(tokenDecimals, '0');
      return BigInt(combined);
    }

    // Pad decimal part to match token decimals
    const paddedDecimal = decimalPart.padEnd(tokenDecimals, '0');
    const combined = integerPart + paddedDecimal;

    return BigInt(combined);
  } catch (error) {
    console.error('Error parsing decimal string:', error);
    return null;
  }
}

/**
 * Returns the smallest unit name for a given amount
 * @param amount - The amount (for determining singular vs plural)
 * @returns "Gajbhiye" for 1, "Gajbhiyes" otherwise
 */
export function getSmallestUnitName(amount: number): string {
  return amount === 1 ? SMALLEST_UNIT_NAME : SMALLEST_UNIT_NAME_PLURAL;
}

/**
 * Get the number of decimals for UNIYAA token
 */
export function getUniyaaDecimals(): number {
  return UNIYAA_DECIMALS;
}
