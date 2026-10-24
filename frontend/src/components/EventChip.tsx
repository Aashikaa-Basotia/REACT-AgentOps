import React from 'react';
import {
  Ban,
  TrendingDown,
  FileCheck,
  Send,
  CheckCheck,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface EventChipProps {
  eventType: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const EventChip: React.FC<EventChipProps> = ({
  eventType,
  size = 'sm',
  className,
  onClick,
}) => {
  const norm = eventType.toUpperCase();

  const config = (() => {
    if (norm.includes('BLOCK') || norm.includes('CUTOFF') || norm.includes('FAIL')) {
      return {
        label: norm.replace('EVENT_', ''),
        icon: <Ban className="shrink-0" />,
        style: 'bg-[#D9534F]/15 border-[#D9534F]/40 text-[#8C2421]',
      };
    }
    if (norm.includes('DELAY') || norm.includes('STALE') || norm.includes('WARN')) {
      return {
        label: norm.replace('EVENT_', ''),
        icon: <Clock className="shrink-0" />,
        style: 'bg-[#E8A23D]/15 border-[#E8A23D]/40 text-[#87550E]',
      };
    }
    if (norm.includes('VERIF') || norm.includes('INVARIANT') || norm.includes('COMMIT')) {
      return {
        label: norm.replace('EVENT_', ''),
        icon: <FileCheck className="shrink-0" />,
        style: 'bg-[#8FD13F]/20 border-[#8FD13F]/40 text-[#2D5A1E]',
      };
    }
    if (norm.includes('PROPOS') || norm.includes('REQUEST') || norm.includes('AGENT')) {
      return {
        label: norm.replace('EVENT_', ''),
        icon: <Send className="shrink-0" />,
        style: 'bg-[#3E6B4F]/15 border-[#3E6B4F]/30 text-[#1E3B29]',
      };
    }
    if (norm.includes('STOCK') || norm.includes('RESERV')) {
      return {
        label: norm.replace('EVENT_', ''),
        icon: <TrendingDown className="shrink-0" />,
        style: 'bg-black/5 border-black/15 text-[#14170F]',
      };
    }
    return {
      label: norm,
      icon: <Activity className="shrink-0" />,
      style: 'bg-black/5 border-black/10 text-[#4A5240]',
    };
  })();

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.2 gap-1 font-mono',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5 font-mono font-medium',
    md: 'text-[11px] px-2.5 py-1 gap-1.5 font-mono font-semibold',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border backdrop-blur-sm select-none transition-all',
        onClick && 'cursor-pointer hover:scale-105 active:scale-95',
        sizeStyles,
        config.style,
        className
      )}
    >
      {React.cloneElement(config.icon, { className: iconSizes })}
      <span className="truncate max-w-[130px]">{config.label}</span>
    </span>
  );
};
