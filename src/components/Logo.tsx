/**
 * EQUA Logo Component
 * 
 * TODO: Replace placeholder with actual EQUA logo
 * See docs/LOGO_INSTRUCTIONS.md for implementation details
 * 
 * To use the actual logo:
 * 1. Add equa-logo.svg (or .png) to /public/ folder
 * 2. Uncomment the Image import and JSX below
 * 3. Remove the placeholder div
 */

// import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 40 }: LogoProps) {
  // TODO: Uncomment this when actual logo is available
  // return (
  //   <Image 
  //     src="/equa-logo.svg" 
  //     alt="EQUA Logo" 
  //     width={size} 
  //     height={size}
  //     className={className}
  //   />
  // );

  // Placeholder implementation
  return (
    <div 
      className={`bg-purple-500 rounded-lg flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold text-xl">E</span>
    </div>
  );
}
