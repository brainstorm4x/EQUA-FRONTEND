/**
 * Tests for explorerLink utility
 * 
 * Validates Solana Explorer link generation for different networks and resource types.
 */

import { 
  getExplorerLink, 
  getTransactionExplorerLink,
  getAddressExplorerLink,
  getBlockExplorerLink 
} from '@/utils/explorerLink';

describe('explorerLink', () => {
  describe('getExplorerLink', () => {
    it('should generate correct transaction link for devnet', () => {
      const sig = '5KtPnAz8hPHmdFd3bXELE2k3tR4ZqMGJbNXUVJz9KqUvWNxYqE2b9YH5RmEQnJ8vGZJ5kZJ8b8Qb8Qb8Qb8Qb8';
      const link = getExplorerLink('tx', sig, 'devnet');
      expect(link).toBe(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    });

    it('should generate correct address link for devnet', () => {
      const addr = 'GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C';
      const link = getExplorerLink('address', addr, 'devnet');
      expect(link).toBe(`https://explorer.solana.com/address/${addr}?cluster=devnet`);
    });

    it('should generate correct block link for devnet', () => {
      const block = '123456789';
      const link = getExplorerLink('block', block, 'devnet');
      expect(link).toBe(`https://explorer.solana.com/block/${block}?cluster=devnet`);
    });

    it('should generate correct link for mainnet-beta without cluster parameter', () => {
      const sig = '5KtPnAz8hPHmdFd3bXELE2k3tR4ZqMGJbNXUVJz9KqUvWNxYqE2b9YH5RmEQnJ8vGZJ5kZJ8b8Qb8Qb8Qb8Qb8';
      const link = getExplorerLink('tx', sig, 'mainnet-beta');
      expect(link).toBe(`https://explorer.solana.com/tx/${sig}`);
    });

    it('should generate correct link for testnet', () => {
      const addr = 'GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C';
      const link = getExplorerLink('address', addr, 'testnet');
      expect(link).toBe(`https://explorer.solana.com/address/${addr}?cluster=testnet`);
    });
  });

  describe('getTransactionExplorerLink', () => {
    it('should generate correct transaction link with default network', () => {
      const sig = '5KtPnAz8hPHmdFd3bXELE2k3tR4ZqMGJbNXUVJz9KqUvWNxYqE2b9YH5RmEQnJ8vGZJ5kZJ8b8Qb8Qb8Qb8Qb8';
      const link = getTransactionExplorerLink(sig);
      // Should use NETWORK from constants (devnet in test env)
      expect(link).toContain('explorer.solana.com/tx/');
      expect(link).toContain(sig);
    });

    it('should generate correct transaction link with custom network', () => {
      const sig = '5KtPnAz8hPHmdFd3bXELE2k3tR4ZqMGJbNXUVJz9KqUvWNxYqE2b9YH5RmEQnJ8vGZJ5kZJ8b8Qb8Qb8Qb8Qb8';
      const link = getTransactionExplorerLink(sig, 'mainnet-beta');
      expect(link).toBe(`https://explorer.solana.com/tx/${sig}`);
    });
  });

  describe('getAddressExplorerLink', () => {
    it('should generate correct address link', () => {
      const addr = 'GR1XrKDd6VT56Rcpa6H6nwGxBVJeTg2KnmJ9RdAwok7C';
      const link = getAddressExplorerLink(addr, 'devnet');
      expect(link).toBe(`https://explorer.solana.com/address/${addr}?cluster=devnet`);
    });
  });

  describe('getBlockExplorerLink', () => {
    it('should generate correct block link with number', () => {
      const block = 123456789;
      const link = getBlockExplorerLink(block, 'devnet');
      expect(link).toBe('https://explorer.solana.com/block/123456789?cluster=devnet');
    });

    it('should generate correct block link with string', () => {
      const block = '123456789';
      const link = getBlockExplorerLink(block, 'devnet');
      expect(link).toBe('https://explorer.solana.com/block/123456789?cluster=devnet');
    });
  });
});
