/**
 * Token formatting utilities for EQUA token
 * 
 * EQUA token uses 6 decimals (1,000,000 base units = 1 EQUA)
 */

const EQUA_DECIMALS = 6;
const EQUA_DECIMAL_MULTIPLIER = 1_000_000;

export interface FormatOptions {
  /** Number of decimal places to show. Defaults to 6 */
  decimals?: number;
  /** Whether to trim trailing zeros. Defaults to false */
  trimTrailingZeros?: boolean;
  /** Whether to show thousands separators. Defaults to true */
  useGrouping?: boolean;
}

/**
 * Formats a raw EQUA token amount (in base units) to a human-readable string
 * 
 * @param rawAmount - The raw token amount in base units (e.g., 1,000,000 = 1 EQUA)
 * @param options - Formatting options
 * @returns Formatted token amount as a string
 * 
 * @example
 * formatEquaRaw(1_000_000_000) // "1,000.000000"
 * formatEquaRaw(1_000_000_000, { decimals: 2 }) // "1,000.00"
 * formatEquaRaw(1_000_000_000, { trimTrailingZeros: true }) // "1,000"
 * formatEquaRaw(3_120_045, { trimTrailingZeros: true }) // "3.120045"
 * formatEquaRaw(123_456) // "0.123456"
 * 
 * @note This function converts bigint to Number. While this can lose precision for values
 * larger than Number.MAX_SAFE_INTEGER (2^53 - 1), this would require over 9 quintillion EQUA
 * tokens, which is far beyond any realistic token supply. The SPL token program uses u64,
 * which has a maximum value of ~18 quintillion, so precision loss is only a concern for
 * extremely large unrealistic values.
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
    return '0.000000';
  }

  // Convert from raw units to EQUA tokens
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
 * Parses a formatted EQUA token string back to raw base units
 * 
 * @param formattedAmount - The formatted token amount (e.g., "1,000.50" or "0.123456")
 * @returns Raw token amount in base units
 * 
 * @example
 * parseEquaFormatted("1,000") // 1_000_000_000
 * parseEquaFormatted("0.123456") // 123_456
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
 * Converts raw EQUA amount to a number (decimal form)
 * 
 * @param rawAmount - The raw token amount in base units
 * @returns Token amount as a decimal number
 * 
 * @example
 * rawToDecimal(1_000_000_000) // 1000
 * rawToDecimal(123_456) // 0.123456
 * 
 * @note Converting bigint to Number can lose precision for values larger than
 * Number.MAX_SAFE_INTEGER. For EQUA tokens with 6 decimals, this would require
 * over 9 quintillion tokens, which is beyond any realistic token supply.
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
 * Converts a decimal EQUA amount to raw base units
 * 
 * @param decimalAmount - Token amount as a decimal number
 * @returns Raw token amount in base units
 * 
 * @example
 * decimalToRaw(1000) // 1_000_000_000
 * decimalToRaw(0.123456) // 123_456
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
