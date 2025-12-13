/**
 * EQUA Logo Component
 * 
 * Displays the EQUA brand logo with optimized loading
 * Supports both PNG (default for faster load) and SVG formats
 */

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
  format?: 'png' | 'svg';
}

export function Logo({ className = '', size = 40, priority = false, format = 'png' }: LogoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const logoSrc = `/branding/equa-logo.${format}`;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-purple-500/20 rounded-lg animate-pulse"
          aria-hidden="true"
        />
      )}
      <Image 
        src={logoSrc}
        alt="EQUA Logo" 
        width={size} 
        height={size}
        className={className}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onLoadingComplete={() => setIsLoading(false)}
      />
    </div>
  );
}
