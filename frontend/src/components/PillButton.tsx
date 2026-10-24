import React from 'react';
import { cn } from '../lib/utils';

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-[#8FD13F] hover:bg-[#7ec032] text-[#14170F] font-semibold shadow-sm hover:shadow-soft-glow border border-[#8FD13F]/50',
    dark:
      'bg-[#0F1714]/90 hover:bg-[#0F1714] text-[#F3F4F0] font-medium border border-white/12 shadow-sm',
    secondary:
      'bg-white/80 hover:bg-white text-[#14170F] font-medium border border-black/8 shadow-sm backdrop-blur-md',
    ghost:
      'bg-transparent hover:bg-black/5 text-[#14170F] font-medium border border-transparent',
    outline:
      'bg-transparent hover:bg-black/5 text-[#14170F] font-medium border border-black/15',
    danger:
      'bg-[#D9534F] hover:bg-[#c9433f] text-white font-semibold border border-[#D9534F]/40 shadow-sm',
  }[variant];

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm font-semibold gap-2',
    lg: 'h-12 px-6 text-base font-bold gap-2.5',
  }[size];

  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-full select-none transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none disabled:active:scale-100',
        sizeStyles,
        variantStyles,
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
