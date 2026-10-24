import React from 'react';
import { ShieldCheck, AlertTriangle, Layers, Database } from 'lucide-react';
import { cn } from '../lib/utils';

export interface StockComparisonBarProps {
  reportedStock: number;
  confirmedStock: number;
  reservedStock: number;
  version?: number;
  className?: string;
  compact?: boolean;
}

export const StockComparisonBar: React.FC<StockComparisonBarProps> = ({
  reportedStock,
  confirmedStock,
  reservedStock,
  version = 1,
  className,
  compact = false,
}) => {
  const maxStock = Math.max(reportedStock, confirmedStock, 1);
  const availableStock = Math.max(0, confirmedStock - reservedStock);
  const hasDiscrepancy = reportedStock !== confirmedStock;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!compact && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[#14170F]">
            <Database className="w-3.5 h-3.5 text-[#3E6B4F]" />
            <span>Inventory Invariant Proof</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/5 rounded text-[#4A5240]">
              v{version}
            </span>
          </div>
          {hasDiscrepancy ? (
            <span className="flex items-center gap-1 text-[11px] font-mono text-[#87550E] bg-[#E8A23D]/15 px-2 py-0.5 rounded-full border border-[#E8A23D]/30">
              <AlertTriangle className="w-3 h-3 text-[#E8A23D]" />
              Phantom Gap: {Math.abs(reportedStock - confirmedStock)} batches
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-mono text-[#2D5A1E] bg-[#8FD13F]/20 px-2 py-0.5 rounded-full border border-[#8FD13F]/40">
              <ShieldCheck className="w-3 h-3 text-[#5B9C20]" />
              Verified Invariant
            </span>
          )}
        </div>
      )}

      {/* Comparison Grid */}
      <div className="space-y-2 text-xs">
        {/* Reported Bar */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-mono mb-1">
            <span className="text-[#14170F]/70 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E8A23D]" />
              Reported (Unverified Claim)
            </span>
            <span className="font-bold text-[#14170F]">{reportedStock} batches</span>
          </div>
          <div className="w-full bg-black/8 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#E8A23D] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (reportedStock / maxStock) * 100)}%` }}
            />
          </div>
        </div>

        {/* Confirmed Bar */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-mono mb-1">
            <span className="text-[#14170F]/70 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3E6B4F]" />
              Confirmed (Physical Sensor/Store)
            </span>
            <span className="font-bold text-[#14170F]">{confirmedStock} batches</span>
          </div>
          <div className="w-full bg-black/8 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#3E6B4F] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (confirmedStock / maxStock) * 100)}%` }}
            />
          </div>
        </div>

        {/* Allocation breakdown */}
        <div className="pt-1 flex items-center justify-between text-[11px] font-mono bg-white/50 p-2 rounded-xl border border-black/5">
          <div className="flex items-center gap-1.5 text-[#2D5A1E]">
            <div className="w-2 h-2 rounded-full bg-[#8FD13F]" />
            <span>Available:</span>
            <span className="font-bold">{availableStock}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#87550E]">
            <Layers className="w-3 h-3 text-[#E8A23D]" />
            <span>Active Hold:</span>
            <span className="font-bold">{reservedStock}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
