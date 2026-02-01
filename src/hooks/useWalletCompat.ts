/**
 * useWallet Hook
 * 
 * Re-export the wallet context hook for backward compatibility
 * This ensures existing code using import { useWallet } from '@/hooks/useWallet' still works
 */

export { useWallet, useConnection } from '@/contexts/WalletContext';
