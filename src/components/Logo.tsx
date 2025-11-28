/**
 * EQUA Logo Component
 * 
 * Displays the EQUA brand logo with optimized loading
 */

import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

export function Logo({ className = '', size = 40, priority = false }: LogoProps) {
  return (
    <Image 
      src="/equa-logo.svg" 
      alt="EQUA Logo" 
      width={size} 
      height={size}
      className={className}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}
