import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CountdownChipProps {
  deadlineMinute: number;
  currentMinute: number;
  className?: string;
}

export const CountdownChip: React.FC<CountdownChipProps> = ({
  deadlineMinute,
  currentMinute,
  className,
}) => {
  const remaining = deadlineMinute - currentMinute;
  const isBreached = remaining < 0;
  const isUrgent = remaining >= 0 && remaining <= 30;
  const isWarning = remaining > 30 && remaining <= 60;

  const styleConfig = (() => {
    if (isBreached) {
      return {
        bg: 'bg-[#D9534F]/15 border-[#D9534F]/40 text-[#8C2421]',
        icon: <AlertCircle className="w-3 h-3 text-[#D9534F] animate-pulse" />,
        text: `BREACH: ${Math.abs(remaining)}m OVERDUE`,
      };
    }
    if (isUrgent) {
      return {
        bg: 'bg-[#D9534F]/10 border-[#D9534F]/30 text-[#8C2421]',
        icon: <Clock className="w-3 h-3 text-[#D9534F]" />,
        text: `${remaining}m to deadline`,
      };
    }
    if (isWarning) {
      return {
        bg: 'bg-[#E8A23D]/12 border-[#E8A23D]/30 text-[#87550E]',
        icon: <Clock className="w-3 h-3 text-[#E8A23D]" />,
        text: `${remaining}m window`,
      };
    }
    return {
      bg: 'bg-black/5 border-black/10 text-[#4A5240]',
      icon: <Clock className="w-3 h-3 text-[#4A5240]" />,
      text: `T+${deadlineMinute}m (Δ${remaining}m)`,
    };
  })();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border backdrop-blur-sm',
        styleConfig.bg,
        className
      )}
    >
      {styleConfig.icon}
      <span>{styleConfig.text}</span>
    </span>
  );
};
