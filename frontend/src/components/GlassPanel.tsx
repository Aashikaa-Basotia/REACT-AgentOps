import React from 'react';
import { cn } from '../lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'dark' | 'subtle';
  elevation?: 'flat' | 'default' | 'elevated';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'panel' | 'card' | 'full';
  animateScaleIn?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  variant = 'light',
  elevation = 'default',
  rounded = 'panel',
  animateScaleIn = false,
  ...props
}) => {
  const variantStyles = {
    light: 'bg-white/75 backdrop-blur-xl border border-white/65 text-[#14170F]',
    dark: 'bg-[#0F1714]/88 backdrop-blur-xl border border-white/12 text-[#F3F4F0]',
    subtle: 'bg-white/50 backdrop-blur-md border border-white/50 text-[#14170F]',
  }[variant];

  const elevationStyles = {
    flat: 'shadow-none',
    default: variant === 'dark' ? 'shadow-glass-dark' : 'shadow-glass',
    elevated: 'shadow-glass-elevated',
  }[elevation];

  const roundedStyles = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-[20px]',
    panel: 'rounded-[24px]',
    card: 'rounded-[16px]',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={cn(
        variantStyles,
        elevationStyles,
        roundedStyles,
        animateScaleIn && 'animate-scale-in',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
