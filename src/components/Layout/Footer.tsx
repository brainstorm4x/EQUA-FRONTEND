'use client';

import { FC } from 'react';
import Link from 'next/link';

export const Footer: FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { label: 'Mint Tokens', href: '/mint' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'About', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'GitHub', href: 'https://github.com/brainstorm4x/EQUA-FRONTEND', external: true },
        { label: 'Support', href: '#' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Twitter', href: '#', external: true },
        { label: 'Discord', href: '#', external: true },
        { label: 'Telegram', href: '#', external: true },
      ],
    },
  ];

  return (
    <footer className="border-t border-primary-700 bg-primary-900/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h3 className="text-xl font-bold text-white">EQUA Token</h3>
            </div>
            <p className="text-primary-300 text-sm">
              Next-generation token platform built on Solana blockchain.
            </p>
          </div>

          {/* Footer Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-300 hover:text-white transition-colors text-sm"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-primary-300 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-300 text-sm">
              © {currentYear} EQUA Token. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-primary-300 hover:text-white transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link href="#" className="text-primary-300 hover:text-white transition-colors text-sm">
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-primary-400 text-xs">
              Built on Solana Devnet | Program ID: G6yZUuyumRxcKbvWjaDVURJzShfeBW1zpde1BHzCr6si
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
