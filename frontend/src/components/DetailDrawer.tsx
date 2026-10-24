import React from 'react';
import {
  X,
  Building2,
  Warehouse,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  MapPin,
  TrendingDown,
} from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { PillButton } from './PillButton';
import { CountdownChip } from './CountdownChip';
import { StockComparisonBar } from './StockComparisonBar';
import { HospitalData, SupplierData } from '../types';

export interface DetailDrawerProps {
  selectedEntity:
    | { type: 'hospital'; data: HospitalData }
    | { type: 'supplier'; data: SupplierData }
    | null;
  currentMinute: number;
  onClose: () => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  selectedEntity,
  currentMinute,
  onClose,
}) => {
  if (!selectedEntity) return null;

  const isHospital = selectedEntity.type === 'hospital';
  const hospital = isHospital ? (selectedEntity.data as HospitalData) : null;
  const supplier = !isHospital ? (selectedEntity.data as SupplierData) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <GlassPanel
        variant="light"
        elevation="elevated"
        rounded="panel"
        animateScaleIn
        className="w-full max-w-lg overflow-hidden border border-white/80 p-0 shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-5 border-b border-black/8 flex items-center justify-between bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8FD13F]/25 border border-[#8FD13F]/40 flex items-center justify-center text-[#2D5A1E]">
              {isHospital ? <Building2 className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#14170F]">
                  {isHospital ? hospital?.name : supplier?.name}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/5 text-[#4A5240]">
                  {isHospital ? hospital?.id : supplier?.id}
                </span>
              </div>
              <p className="text-xs text-[#14170F]/60 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#3E6B4F]" />
                <span>
                  Zone: {isHospital ? hospital?.zone || 'Bengaluru Central' : supplier?.zone || 'Industrial Cluster'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#14170F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* HOSPITAL DRILL-IN */}
          {isHospital && hospital && (
            <>
              {/* Top Countdown and Invariant State */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CountdownChip
                  deadlineMinute={hospital.deadline_minutes}
                  currentMinute={currentMinute}
                />
                <span className="text-xs font-mono text-[#14170F]/70 bg-white/70 px-2.5 py-1 rounded-full border border-black/5">
                  Burn Rate: <span className="font-bold text-[#14170F]">{hospital.burn_rate || 2}</span> batches/hr
                </span>
              </div>

              {/* Demand vs Allocation Card */}
              <div className="rounded-card bg-white/70 p-4 border border-black/5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#14170F]/70">Allocation Fulfillment:</span>
                  <span className="font-mono font-bold text-sm text-[#14170F]">
                    {hospital.allocated_batches || 0} / {hospital.requested_batches} batches
                  </span>
                </div>

                {/* Demand Progress Bar */}
                <div className="w-full bg-black/8 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-[#8FD13F] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        ((hospital.allocated_batches || 0) / Math.max(1, hospital.requested_batches)) * 100
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono text-[#14170F]/70 pt-1">
                  <span>Minimum Reserve Line: {hospital.min_reserve || 2} batches</span>
                  {(hospital.unmet || 0) > 0 ? (
                    <span className="text-[#8C2421] font-bold">Unmet: {hospital.unmet} batches</span>
                  ) : (
                    <span className="text-[#2D5A1E] font-bold">Demand Satisfied</span>
                  )}
                </div>
              </div>

              {/* Mini Sparkline Timeline (Current Stock vs Burn Rate) */}
              <div className="rounded-card bg-white/70 p-4 border border-black/5">
                <div className="flex items-center justify-between text-xs font-medium mb-3">
                  <span className="flex items-center gap-1.5 text-[#14170F]">
                    <TrendingDown className="w-3.5 h-3.5 text-[#3E6B4F]" />
                    <span>Stock Depletion vs Burn Rate Sparkline</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#14170F]/50">T+0m → T+300m</span>
                </div>

                {/* SVG Sparkline */}
                <div className="h-16 w-full flex items-end relative border-b border-black/10 pb-1">
                  {/* Minimum reserve threshold line */}
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-[#D9534F]/40 flex justify-end">
                    <span className="text-[9px] font-mono text-[#D9534F] bg-white/80 px-1 -translate-y-2">
                      Min Reserve
                    </span>
                  </div>

                  {/* Sparkline curve */}
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 60">
                    <path
                      d="M 0,10 Q 50,25 100,38 T 180,45 T 240,42 T 300,50"
                      fill="none"
                      stroke="#3E6B4F"
                      strokeWidth="2.5"
                    />
                    <circle cx="100" cy="38" r="4" fill="#8FD13F" />
                    <circle cx="240" cy="42" r="4" fill="#E8A23D" />
                  </svg>
                </div>
              </div>
            </>
          )}

          {/* SUPPLIER DRILL-IN */}
          {!isHospital && supplier && (
            <>
              {/* Stock Comparison Bar Component (reported != confirmed != reserved) */}
              <div className="rounded-card bg-white/70 p-4 border border-black/5">
                <StockComparisonBar
                  reportedStock={supplier.reported_stock ?? supplier.confirmed_stock}
                  confirmedStock={supplier.confirmed_stock}
                  reservedStock={
                    supplier.confirmed_stock - (supplier.available_stock ?? supplier.confirmed_stock)
                  }
                  version={supplier.version}
                />
              </div>

              {/* Supplier Verification Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-card bg-white/70 p-3 border border-black/5">
                  <div className="text-[10px] text-[#14170F]/60 uppercase tracking-wider font-semibold">
                    Sensor Telemetry
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[#2D5A1E] font-mono font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5B9C20]" />
                    <span>Cryptographic ID</span>
                  </div>
                  <div className="text-[10px] text-[#14170F]/60 mt-0.5 font-mono">
                    Node: {supplier.id}-DEPO
                  </div>
                </div>

                <div className="rounded-card bg-white/70 p-3 border border-black/5">
                  <div className="text-[10px] text-[#14170F]/60 uppercase tracking-wider font-semibold">
                    Active Reservations
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[#14170F] font-mono font-bold">
                    <Layers className="w-3.5 h-3.5 text-[#E8A23D]" />
                    <span>{supplier.active_reservations_count ?? 1} Open Holds</span>
                  </div>
                  <div className="text-[10px] text-[#14170F]/60 mt-0.5 font-mono">
                    Strict Two-Phase Lock
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/8 bg-white/50 flex justify-end">
          <PillButton variant="secondary" size="sm" onClick={onClose}>
            Close Inspector
          </PillButton>
        </div>
      </GlassPanel>
    </div>
  );
};
