import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Building2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HospitalData } from '../../types';

export interface HospitalNodeProps {
  data: HospitalData;
}

export const HospitalNode: React.FC<HospitalNodeProps> = ({ data }) => {
  const allocated = data.allocated_batches ?? 0;
  const requested = data.requested_batches ?? 8;
  const unmet = Math.max(0, requested - allocated);
  const isFulfilled = unmet === 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 w-64',
        'bg-white/90 text-[#14170F] shadow-[0_4px_24px_rgba(20,23,15,0.06)]',
        'hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(20,23,15,0.12)]',
        isFulfilled
          ? 'border-white/90 hover:border-[#8FD13F]/90 ring-1 ring-[#8FD13F]/20'
          : 'border-[#D9534F]/60 ring-1 ring-[#D9534F]/30 shadow-[0_8px_32px_rgba(217,83,79,0.14)]'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-[#3E6B4F] !border-2 !border-white !-left-2 transition-transform group-hover:scale-125 shadow-md"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/6">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105',
              isFulfilled
                ? 'bg-[#8FD13F]/25 text-[#2D5A1E]'
                : 'bg-[#D9534F]/20 text-[#8C2421]'
            )}
          >
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-display font-extrabold text-[#14170F] flex items-center gap-1.5">
              <span className="truncate max-w-[130px]">{data.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/5 text-[#4A5240] rounded-md font-semibold">
                {data.id}
              </span>
            </div>
            <div className="text-[10px] text-[#14170F]/60 flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-[#3E6B4F]" />
              <span className="font-mono">Deadline: T+{data.deadline_minutes}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demand & Allocation Progress */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#14170F]/65 font-medium">Demand Fulfilled:</span>
          <span className="font-mono font-bold text-xs text-[#14170F]">
            {allocated} / {requested}{' '}
            <span className="text-[10px] font-normal text-[#14170F]/50">batches</span>
          </span>
        </div>

        {/* Progress Bar with smooth gradient */}
        <div className="w-full bg-black/8 rounded-full h-2 overflow-hidden p-0.5">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              isFulfilled ? 'bg-gradient-to-r from-[#3E6B4F] to-[#8FD13F]' : 'bg-[#D9534F]'
            )}
            style={{ width: `${Math.min(100, (allocated / requested) * 100)}%` }}
          />
        </div>

        {/* Status Invariant Badge */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-[#14170F]/50 uppercase tracking-wider font-semibold font-mono">
            Integrity
          </span>
          {isFulfilled ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-[#2D5A1E] bg-[#8FD13F]/20 border border-[#8FD13F]/40 px-2 py-0.5 rounded-full shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-[#5B9C20]" /> Feasible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#8C2421] bg-[#D9534F]/15 border border-[#D9534F]/40 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
              <AlertTriangle className="w-3 h-3 text-[#D9534F]" /> Shortfall: {unmet}b
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
