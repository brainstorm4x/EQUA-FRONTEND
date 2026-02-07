'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '@/hooks/useProgram';

export default function TestRegistration() {
  const wallet = useWallet();
  const { publicKey, program, connection } = useProgram();
  
  const handleTestClick = () => {
    console.log('🧪 TEST BUTTON CLICKED');
    console.log('  - wallet.connected:', wallet.connected);
    console.log('  - publicKey:', publicKey?.toBase58());
    console.log('  - program:', !!program);
    console.log('  - connection:', !!connection);
    
    alert('Check console for wallet state!');
  };
  
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Registration Test</h1>
        
        <div className="mb-4">
          <p>Wallet Connected: {wallet.connected ? '✅ YES' : '❌ NO'}</p>
          <p>Public Key: {publicKey?.toBase58() || 'Not connected'}</p>
          <p>Program: {program ? '✅ Loaded' : '❌ Not loaded'}</p>
        </div>
        
        <button
          onClick={handleTestClick}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700"
        >
          Test Click Handler
        </button>
      </div>
    </div>
  );
}