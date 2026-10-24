import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type SystemStatus = 'FEASIBLE' | 'AT RISK' | 'INFEASIBLE' | 'PENDING' | 'REJECTED';

export interface StatusBadgeProps {
  status: SystemStatus | string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'glass' | 'subtle';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  variant = 'glass',
  className,
  showIcon = true,
}) => {
  const normalized = status.toUpperCase();

  const config = (() => {
    switch (normalized) {
      case 'FEASIBLE':
      case 'VERIFIED':
      case 'OPTIMAL':
        return {
          label: normalized === 'OPTIMAL' ? 'FEASIBLE' : normalized,
          icon: <CheckCircle2 className="shrink-0" />,
          textColor: 'text-[#2D5A1E]',
          borderColor: 'border-[#8FD13F]/50',
          bgColorSolid: 'bg-[#8FD13F]',
          bgColorGlass: 'bg-[#8FD13F]/18',
          dotColor: 'bg-[#5B9C20]',
        };
      case 'AT RISK':
      case 'WARNING':
      case 'DELAYED':
      case 'UNVERIFIED':
        return {
          label: normalized === 'DELAYED' ? 'AT RISK' : normalized,
          icon: <AlertTriangle className="shrink-0" />,
          textColor: 'text-[#87550E]',
          borderColor: 'border-[#E8A23D]/50',
          bgColorSolid: 'bg-[#E8A23D]',
          bgColorGlass: 'bg-[#E8A23D]/18',
          dotColor: 'bg-[#E8A23D]',
        };
      case 'INFEASIBLE':
      case 'REJECTED':
      case 'CRITICAL':
      case 'BLOCKED':
        return {
          label: normalized === 'CRITICAL' || normalized === 'BLOCKED' ? 'INFEASIBLE' : normalized,
          icon: <AlertOctagon className="shrink-0" />,
          textColor: 'text-[#8C2421]',
          borderColor: 'border-[#D9534F]/50',
          bgColorSolid: 'bg-[#D9534F]',
          bgColorGlass: 'bg-[#D9534F]/18',
          dotColor: 'bg-[#D9534F]',
        };
      case 'PENDING':
      case 'PENDING APPROVAL':
      default:
        return {
          label: normalized.startsWith('PENDING') ? 'PENDING' : normalized,
          icon: <HelpCircle className="shrink-0" />,
          textColor: 'text-[#4A5240]',
          borderColor: 'border-black/15',
          bgColorSolid: 'bg-black/10',
          bgColorGlass: 'bg-black/5',
          dotColor: 'bg-[#7A8270]',
        };
    }
  })();

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-mono',
    md: 'text-[11px] px-2.5 py-1 gap-1.5 font-mono font-medium',
    lg: 'text-xs px-3 py-1.5 gap-2 font-mono font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const variantStyles = variant === 'solid'
    ? `${config.bgColorSolid} text-[#14170F]`
    : `${config.bgColorGlass} ${config.textColor} border ${config.borderColor} backdrop-blur-md`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full tracking-wider uppercase select-none transition-colors duration-200',
        sizeStyles,
        variantStyles,
        className
      )}
    >
      {showIcon && React.cloneElement(config.icon, { className: iconSizes })}
      <span>{config.label}</span>
    </span>
  );
};
