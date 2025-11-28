/**
 * Token formatting utilities for EQUA token
 * 
 * EQUA token uses 9 decimals (1,000,000,000 base units = 1 EQUA)
 * The smallest unit of EQUA is called Gajbhiye (singular) / Gajbhiyes (plural)
 */

const EQUA_DECIMALS = 9;
const EQUA_DECIMAL_MULTIPLIER = 1_000_000_000;

/**
 * Name of the smallest unit of EQUA
 */
export const SMALLEST_UNIT_NAME = 'Gajbhiye';
export const SMALLEST_UNIT_NAME_PLURAL = 'Gajbhiyes';

export interface FormatOptions {
  /** Number of decimal places to show. Defaults to 9 */
  decimals?: number;
  /** Whether to trim trailing zeros. Defaults to false */
  trimTrailingZeros?: boolean;
  /** Whether to show thousands separators. Defaults to true */
  useGrouping?: boolean;
}

/**
 * Formats a raw EQUA token amount (in base units/Gajbhiyes) to a human-readable EQUA string
 * This shows the actual EQUA balance, not the smallest unit
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @param options - Formatting options
 * @returns Formatted token amount as a string
 * 
 * @example
 * formatEquaRaw(1_000_000_000_000) // "1,000.000000000"
 * formatEquaRaw(1_000_000_000_000, { decimals: 2 }) // "1,000.00"
 * formatEquaRaw(1_000_000_000_000, { trimTrailingZeros: true }) // "1,000"
 * formatEquaRaw(3_120_045_000, { trimTrailingZeros: true }) // "3.120045"
 * formatEquaRaw(123_456_789) // "0.123456789"
 * 
 * @note This function converts bigint to Number. While this can lose precision for values
 * larger than Number.MAX_SAFE_INTEGER (2^53 - 1 = ~9 quadrillion), with 9 decimal places
 * this means amounts above ~9 million EQUA tokens (in raw base units) may lose precision.
 * For typical individual holdings and transactions, this precision is more than sufficient.
 * The SPL token program uses u64, which has a maximum value of ~18 quintillion.
 */
export function formatEquaRaw(
  rawAmount: number | string | bigint,
  options: FormatOptions = {}
): string {
  const {
    decimals = EQUA_DECIMALS,
    trimTrailingZeros = false,
    useGrouping = true,
  } = options;

  // Convert to number if string or bigint
  const amount = typeof rawAmount === 'bigint' 
    ? Number(rawAmount) 
    : typeof rawAmount === 'string'
    ? parseFloat(rawAmount)
    : rawAmount;

  // Handle invalid numbers
  if (isNaN(amount) || !isFinite(amount)) {
    return '0.000000000';
  }

  // Convert from raw units (Gajbhiyes) to EQUA tokens
  const tokenAmount = amount / EQUA_DECIMAL_MULTIPLIER;

  // Format with specified decimals
  let formatted = tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: trimTrailingZeros ? 0 : decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });

  return formatted;
}

/**
 * Formats a raw EQUA token amount to display the actual EQUA balance
 * Shows appropriate decimal places based on the balance value
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @returns Formatted EQUA balance string with appropriate decimals
 * 
 * @example
 * formatEquaBalance(100_000_000_000_000) // "100,000" (whole number, no decimals needed)
 * formatEquaBalance(1_500_000_000) // "1.5" (fractional, shows needed decimals)
 * formatEquaBalance(123_456_789) // "0.123456789" (small amount, shows all decimals)
 */
export function formatEquaBalance(rawAmount: number | string | bigint): string {
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

  // Convert from raw units (Gajbhiyes) to EQUA tokens
  const tokenAmount = amount / EQUA_DECIMAL_MULTIPLIER;

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
  const significantDecimals = Math.min(decimalPart.replace(/0+$/, '').length, EQUA_DECIMALS);
  
  return tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(significantDecimals, 2), // At least 2 decimals for fractional amounts
    useGrouping: true,
  });
}

/**
 * Parses a formatted EQUA token string back to raw base units (Gajbhiyes)
 * 
 * @param formattedAmount - The formatted token amount (e.g., "1,000.50" or "0.123456789")
 * @returns Raw token amount in base units (Gajbhiyes)
 * 
 * @example
 * parseEquaFormatted("1,000") // 1_000_000_000_000
 * parseEquaFormatted("0.123456789") // 123_456_789
 * 
 * @note Uses Math.round which can introduce minor rounding errors for edge cases with
 * floating point arithmetic. For precise financial calculations, consider using a
 * decimal library. However, for typical token amounts, the precision is sufficient.
 */
export function parseEquaFormatted(formattedAmount: string): number {
  // Remove any grouping separators (commas)
  const cleaned = formattedAmount.replace(/,/g, '');
  const tokenAmount = parseFloat(cleaned);

  if (isNaN(tokenAmount)) {
    return 0;
  }

  // Convert to raw units (using Math.round to minimize floating point errors)
  return Math.round(tokenAmount * EQUA_DECIMAL_MULTIPLIER);
}

/**
 * Converts raw EQUA amount (in Gajbhiyes) to a number (decimal EQUA form)
 * 
 * @param rawAmount - The raw token amount in base units (Gajbhiyes)
 * @returns Token amount as a decimal number (EQUA)
 * 
 * @example
 * rawToDecimal(1_000_000_000_000) // 1000
 * rawToDecimal(123_456_789) // 0.123456789
 * 
 * @note Converting bigint to Number can lose precision for values larger than
 * Number.MAX_SAFE_INTEGER (~9 quadrillion). With 9 decimal places, this means
 * amounts above ~9 million EQUA tokens (in raw base units) may lose precision.
 * For typical individual holdings, this is more than sufficient.
 */
export function rawToDecimal(rawAmount: number | string | bigint): number {
  const amount = typeof rawAmount === 'bigint' 
    ? Number(rawAmount) 
    : typeof rawAmount === 'string'
    ? parseFloat(rawAmount)
    : rawAmount;

  if (isNaN(amount) || !isFinite(amount)) {
    return 0;
  }

  return amount / EQUA_DECIMAL_MULTIPLIER;
}

/**
 * Converts a decimal EQUA amount to raw base units (Gajbhiyes)
 * 
 * @param decimalAmount - Token amount as a decimal number (EQUA)
 * @returns Raw token amount in base units (Gajbhiyes)
 * 
 * @example
 * decimalToRaw(1000) // 1_000_000_000_000
 * decimalToRaw(0.123456789) // 123_456_789
 * 
 * @note Uses Math.round to minimize floating point errors. For typical token amounts
 * within reasonable ranges, the precision is sufficient. Very large or very precise
 * values may have minor rounding discrepancies due to IEEE 754 floating point arithmetic.
 */
export function decimalToRaw(decimalAmount: number): number {
  if (isNaN(decimalAmount) || !isFinite(decimalAmount)) {
    return 0;
  }

  return Math.round(decimalAmount * EQUA_DECIMAL_MULTIPLIER);
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
 * Get the number of decimals for EQUA token
 */
export function getEquaDecimals(): number {
  return EQUA_DECIMALS;
}
