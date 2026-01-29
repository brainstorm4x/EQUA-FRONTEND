/**
 * EQUA Logo Component
 * 
 * Uses standard <img> for SVG logos following industry best practices.
 * SVG logos don't benefit from Next.js Image optimization and can cause build failures.
 * 
 * @see https://nextjs.org/docs/pages/api-reference/components/image (when NOT to use Image)
 */

interface LogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

export function Logo({ className = '', size = 40, priority = false }: LogoProps) {
  return (
    <img 
      src="/branding/equa-logo.svg"
      alt="EQUA Logo"
      className={className}
      style={{ 
        height: `${size}px`, 
        width: 'auto',
        display: 'block' // Prevents inline spacing issues
      }}
      loading={priority ? 'eager' : 'lazy'} // Priority images load eagerly
      draggable="false" // Prevent accidental logo dragging
    />
  );
}
