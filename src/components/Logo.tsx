/**
 * EQUA Logo Component
 * 
 * Displays the EQUA brand logo
 */

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 40 }: LogoProps) {
  return (
    <Image 
      src="/branding/equa-logo.svg" 
      alt="EQUA Logo" 
      width={size} 
      height={size}
      className={className}
    />
  );
}
