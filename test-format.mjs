import { formatEquaRaw, rawToDecimal, decimalToRaw, parseEquaFormatted } from './src/utils/tokenFormat.ts';

console.log('=== EQUA Token Formatting Tests ===\n');

// Test case 1: 1,000 EQUA (as shown in the UI)
console.log('Test 1: 1,000 EQUA (raw: 1,000,000,000)');
console.log('  formatEquaRaw(1_000_000_000):', formatEquaRaw(1_000_000_000));
console.log('  formatEquaRaw with trimTrailingZeros:', formatEquaRaw(1_000_000_000, { trimTrailingZeros: true }));
console.log('  rawToDecimal(1_000_000_000):', rawToDecimal(1_000_000_000));
console.log('');

// Test case 2: Fractional amount (0.123456 EQUA)
console.log('Test 2: 0.123456 EQUA (raw: 123,456)');
console.log('  formatEquaRaw(123_456):', formatEquaRaw(123_456));
console.log('  formatEquaRaw with trimTrailingZeros:', formatEquaRaw(123_456, { trimTrailingZeros: true }));
console.log('  rawToDecimal(123_456):', rawToDecimal(123_456));
console.log('');

// Test case 3: 3.120045 EQUA (mixed decimals)
console.log('Test 3: 3.120045 EQUA (raw: 3,120,045)');
console.log('  formatEquaRaw(3_120_045):', formatEquaRaw(3_120_045));
console.log('  formatEquaRaw with trimTrailingZeros:', formatEquaRaw(3_120_045, { trimTrailingZeros: true }));
console.log('  rawToDecimal(3_120_045):', rawToDecimal(3_120_045));
console.log('');

// Test case 4: Zero
console.log('Test 4: 0 EQUA (raw: 0)');
console.log('  formatEquaRaw(0):', formatEquaRaw(0));
console.log('  formatEquaRaw with trimTrailingZeros:', formatEquaRaw(0, { trimTrailingZeros: true }));
console.log('');

// Test case 5: Very large amount
console.log('Test 5: 1,000,000 EQUA (raw: 1,000,000,000,000)');
console.log('  formatEquaRaw(1_000_000_000_000):', formatEquaRaw(1_000_000_000_000));
console.log('  formatEquaRaw with trimTrailingZeros:', formatEquaRaw(1_000_000_000_000, { trimTrailingZeros: true }));
console.log('');

// Test case 6: Conversion round-trip
console.log('Test 6: Round-trip conversion');
const original = 1_234_567_890;
const formatted = formatEquaRaw(original, { trimTrailingZeros: true });
const parsed = parseEquaFormatted(formatted);
console.log('  Original raw:', original);
console.log('  Formatted:', formatted);
console.log('  Parsed back:', parsed);
console.log('  Match:', original === parsed ? '✅' : '❌');
console.log('');

// Test case 7: decimalToRaw
console.log('Test 7: decimalToRaw conversion');
console.log('  decimalToRaw(1000):', decimalToRaw(1000));
console.log('  decimalToRaw(0.123456):', decimalToRaw(0.123456));
console.log('  decimalToRaw(3.120045):', decimalToRaw(3.120045));
