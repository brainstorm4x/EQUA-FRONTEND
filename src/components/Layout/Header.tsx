'use client';

import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WalletButton } from '@/components/ui/WalletButton';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export const Header: FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/mint', label: 'Mint' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <header className="border-b border-primary-700 bg-primary-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center overflow-hidden">
              <Image 
                src="/EQUA_LOGO_SIMPLE.jpg" 
                alt="EQUA Logo" 
                width={40} 
                height={40}
                className="object-cover"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerHTML = '<span class="text-white font-bold text-xl">E</span>';
                  }
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'text-lg font-medium transition-colors',
                  pathname === link.href
                    ? 'text-primary-300'
                    : 'text-primary-100 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Button */}
          <WalletButton />
        </div>
      </div>
    </header>
  );
};
