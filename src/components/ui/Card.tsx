import { FC, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  variant?: 'standard' | 'elevated' | 'info' | 'success' | 'warning';
  className?: string;
}

export const Card: FC<CardProps> = ({ 
  children, 
  variant = 'standard',
  className 
}) => {
  const variantStyles = {
    standard: 'bg-white border border-gray-200 shadow-card hover:shadow-card-hover',
    elevated: 'bg-white shadow-xl',
    info: 'bg-info-100 border border-info-300',
    success: 'bg-success-100 border border-success-300',
    warning: 'bg-warning-100 border border-warning-300',
  };

  return (
    <div className={clsx(
      'rounded-2xl p-6 transition-shadow duration-200',
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
};

