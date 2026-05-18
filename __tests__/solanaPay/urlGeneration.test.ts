/**
 * Tests for Solana Pay URL generation utilities
 */

import { PublicKey } from '@solana/web3.js';
import { generateSolanaPayUrl, generateUniyaaSolanaPayUrl } from '@/utils/solanaPay';
import { TOKEN_PROGRAM_ID } from '@/lib/constants';

describe('Solana Pay URL Generation', () => {
  const mockRecipient = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  const mockMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const mockReference = new PublicKey('8xKCKSS5NvXWqyqmJHqWXeH8RJmQHPWYaFqQn2JjhLqx');

  describe('generateSolanaPayUrl', () => {
    it('should generate basic URL with only recipient', () => {
      const url = generateSolanaPayUrl({ recipient: mockRecipient });
      
      expect(url).toBe(`solana:${mockRecipient.toBase58()}`);
    });

    it('should generate URL with SPL token', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        splToken: mockMint,
      });
      
      expect(url).toContain(`solana:${mockRecipient.toBase58()}`);
      expect(url).toContain(`spl-token=${mockMint.toBase58()}`);
    });

    it('should generate URL with amount', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        splToken: mockMint,
        amount: 10.5,
      });
      
      expect(url).toContain('amount=10.5');
    });

    it('should generate URL with label and message', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        label: 'Test Label',
        message: 'Test Message',
      });
      
      expect(url).toContain('label=Test+Label');
      expect(url).toContain('message=Test+Message');
    });

    it('should generate URL with memo', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        memo: 'Test Memo',
      });
      
      expect(url).toContain('memo=Test+Memo');
    });

    it('should generate URL with reference', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        reference: [mockReference],
      });
      
      expect(url).toContain(`reference=${mockReference.toBase58()}`);
    });

    it('should generate URL with multiple references', () => {
      const ref2 = new PublicKey('7xKCKSS5NvXWqyqmJHqWXeH8RJmQHPWYaFqQn2JjhLqy');
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        reference: [mockReference, ref2],
      });
      
      expect(url).toContain(`reference=${mockReference.toBase58()}`);
      expect(url).toContain(`reference=${ref2.toBase58()}`);
    });

    it('should generate URL with token program', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        splToken: mockMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
      
      expect(url).toContain(`token-program=${TOKEN_PROGRAM_ID.toBase58()}`);
    });

    it('should accept string addresses', () => {
      const recipientStr = mockRecipient.toBase58();
      const mintStr = mockMint.toBase58();
      
      const url = generateSolanaPayUrl({
        recipient: recipientStr,
        splToken: mintStr,
      });
      
      expect(url).toContain(`solana:${recipientStr}`);
      expect(url).toContain(`spl-token=${mintStr}`);
    });

    it('should generate complete URL with all parameters', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        splToken: mockMint,
        amount: 100,
        reference: [mockReference],
        label: 'Test Payment',
        message: 'Payment for services',
        memo: 'Invoice #123',
        tokenProgram: TOKEN_PROGRAM_ID,
      });
      
      expect(url).toContain(`solana:${mockRecipient.toBase58()}`);
      expect(url).toContain(`spl-token=${mockMint.toBase58()}`);
      expect(url).toContain('amount=100');
      expect(url).toContain(`reference=${mockReference.toBase58()}`);
      expect(url).toContain('label=Test+Payment');
      expect(url).toContain('message=Payment+for+services');
      expect(url).toContain('memo=Invoice+%23123');
      expect(url).toContain(`token-program=${TOKEN_PROGRAM_ID.toBase58()}`);
    });
  });

  describe('generateUniyaaSolanaPayUrl', () => {
    it('should generate UNIYAA-specific URL with Token-2022 program', () => {
      const url = generateUniyaaSolanaPayUrl(mockRecipient, mockMint);
      
      expect(url).toContain(`solana:${mockRecipient.toBase58()}`);
      expect(url).toContain(`spl-token=${mockMint.toBase58()}`);
      expect(url).toContain('label=UNIYAA+Token');
      expect(url).toContain('message=Send+UNIYAA+tokens+%28Token-2022%29');
      expect(url).toContain(`token-program=${TOKEN_PROGRAM_ID.toBase58()}`);
    });

    it('should accept string addresses', () => {
      const recipientStr = mockRecipient.toBase58();
      const mintStr = mockMint.toBase58();
      
      const url = generateUniyaaSolanaPayUrl(recipientStr, mintStr);
      
      expect(url).toContain(`solana:${recipientStr}`);
      expect(url).toContain(`spl-token=${mintStr}`);
    });

    it('should always include Token-2022 program ID from constants', () => {
      const url = generateUniyaaSolanaPayUrl(mockRecipient, mockMint);
      
      // Should use the TOKEN_PROGRAM_ID from constants
      expect(url).toContain(`token-program=${TOKEN_PROGRAM_ID.toBase58()}`);
    });
  });

  describe('URL format validation', () => {
    it('should generate valid URL that can be parsed', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        splToken: mockMint,
        amount: 50,
      });
      
      expect(() => new URL(url)).not.toThrow();
    });

    it('should properly encode special characters in label and message', () => {
      const url = generateSolanaPayUrl({
        recipient: mockRecipient,
        label: 'Test & Label',
        message: 'Message with spaces and & symbols',
      });
      
      expect(url).toContain('label=Test+%26+Label');
      expect(url).toContain('message=Message+with+spaces+and+%26+symbols');
    });
  });
});
