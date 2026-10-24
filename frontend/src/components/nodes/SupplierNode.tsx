import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Warehouse, Layers, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SupplierData } from '../../types';

export interface SupplierNodeProps {
  data: SupplierData;
}

export const SupplierNode: React.FC<SupplierNodeProps> = ({ data }) => {
  const available = data.available_stock ?? data.confirmed_stock;
  const isDepleted = available === 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 w-64',
        'bg-white/90 text-[#14170F] shadow-[0_4px_24px_rgba(20,23,15,0.06)]',
        'hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(20,23,15,0.12)]',
        isDepleted
          ? 'border-[#E8A23D]/60 ring-1 ring-[#E8A23D]/30 shadow-[0_8px_32px_rgba(232,162,61,0.15)]'
          : 'border-white/90 hover:border-[#8FD13F]/90 ring-1 ring-[#3E6B4F]/15'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0F1714] text-[#8FD13F] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
            <Warehouse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-display font-extrabold text-[#14170F] flex items-center gap-1.5">
              <span className="truncate max-w-[130px]">{data.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/5 text-[#4A5240] rounded-md font-semibold">
                {data.id}
              </span>
            </div>
            <div className="text-[10px] text-[#14170F]/60 flex items-center gap-1 mt-0.5 font-mono">
              <ShieldCheck className="w-2.5 h-2.5 text-[#3E6B4F]" />
              <span>Version: v{data.version || 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock metrics */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#14170F]/65 font-medium">Available Supply:</span>
          <span
            className={cn(
              'font-mono font-bold text-xs',
              isDepleted ? 'text-[#87550E]' : 'text-[#2D5A1E]'
            )}
          >
            {available}{' '}
            <span className="text-[10px] font-normal text-[#14170F]/50">
              / {data.confirmed_stock} batches
            </span>
          </span>
        </div>

        {/* Stock Bar with smooth visual fill */}
        <div className="w-full bg-black/8 rounded-full h-2 overflow-hidden p-0.5">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              isDepleted ? 'bg-[#E8A23D]' : 'bg-gradient-to-r from-[#3E6B4F] to-[#8FD13F]'
            )}
            style={{
              width: `${Math.min(
                100,
                (available / Math.max(1, data.confirmed_stock)) * 100
              )}%`,
            }}
          />
        </div>

        {/* Active Hold & Concurrency details */}
        <div className="pt-1 flex items-center justify-between text-[10px]">
          <span className="text-[#14170F]/60 uppercase tracking-wider font-semibold font-mono flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-[#E8A23D]" /> Active Hold
          </span>
          <span className="font-mono text-[#14170F]/80 font-medium">
            {Math.max(0, data.confirmed_stock - available)} batches committed
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-[#8FD13F] !border-2 !border-white !-right-2 transition-transform group-hover:scale-125 shadow-md"
      />
    </div>
  );
};
