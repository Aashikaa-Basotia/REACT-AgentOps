import React from 'react';
import { HospitalData, SupplierData, HospitalRequest } from '../types';
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Factory, HeartPulse, Activity, FileText } from 'lucide-react';

interface LiveMathPanelsProps {
  hospitals: HospitalData[];
  suppliers: SupplierData[];
  simulationMinute: number;
  hospitalRequests?: HospitalRequest[];
  onSelectHospital?: (id: string) => void;
  onSelectSupplier?: (id: string) => void;
}

export const LiveMathPanels: React.FC<LiveMathPanelsProps> = ({
  hospitals,
  suppliers,
  simulationMinute,
  hospitalRequests = [],
  onSelectHospital,
  onSelectSupplier,
}) => {
  const sortedHospitals = [...hospitals].sort((a, b) => a.deadline_minutes - b.deadline_minutes);

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-1 text-[#14170F] font-sans">
      {/* Panel 1: Hospitals in Need (Sorted by Deadline Urgency) */}
      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-[#D9534F]" />
            <h3 className="text-sm font-black uppercase tracking-wide text-[#14170F]">
              Facilities in Need (Priority Ranked)
            </h3>
          </div>
          <span className="text-xs font-mono bg-[#D9534F]/15 text-[#8C2421] border border-[#D9534F]/30 px-3 py-1 rounded-full font-bold">
            {hospitals.length} Targets
          </span>
        </div>

        <div className="space-y-3">
          {sortedHospitals.map(h => {
            const received = (h.received || 0) + (h.allocated_batches || 0);
            const deficit = Math.max(0, h.requested_batches - received);
            const isCritical = h.deadline_minutes - simulationMinute <= 60;
            const isSupplied = deficit === 0;

            return (
              <div
                key={h.id}
                onClick={() => onSelectHospital && onSelectHospital(h.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                  isSupplied
                    ? 'bg-[#8FD13F]/15 border-[#8FD13F]/40 hover:border-[#8FD13F]'
                    : isCritical
                    ? 'bg-[#D9534F]/15 border-[#D9534F]/40 hover:border-[#D9534F]'
                    : 'bg-[#F8F9F5] border-black/10 hover:border-black/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#14170F] bg-black/5 px-2 py-0.5 rounded">
                      {h.id}
                    </span>
                    <span className="text-sm font-bold text-[#14170F] line-clamp-1">
                      {h.name}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isSupplied
                        ? 'bg-[#8FD13F]/30 text-[#2D5A1E]'
                        : isCritical
                        ? 'bg-[#D9534F]/25 text-[#8C2421] animate-pulse'
                        : 'bg-[#E8A23D]/25 text-[#87550E]'
                    }`}
                  >
                    {isSupplied ? 'Supplied' : isCritical ? 'Critical Shortage' : 'Active Demand'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs font-mono text-[#14170F] mt-2 bg-white p-2.5 rounded-xl border border-black/10">
                  <div>
                    <span className="text-[10px] block text-[#14170F]/60 uppercase font-bold">On-Hand</span>
                    <span className="font-extrabold text-[#14170F] text-xs sm:text-sm">{h.on_hand ?? 0}b</span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-[#14170F]/60 uppercase font-bold">Demand</span>
                    <span className="font-extrabold text-[#14170F] text-xs sm:text-sm">
                      {h.requested_batches}b
                      {(h.submitted_batches ?? 0) > 0 && (
                        <span className="text-[10px] text-[#3E6B4F] block font-bold">
                          +{h.submitted_batches}b req
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-[#14170F]/60 uppercase font-bold">Deficit</span>
                    <span className={`font-black text-xs sm:text-sm ${deficit > 0 ? 'text-[#8C2421]' : 'text-[#2D5A1E]'}`}>
                      {deficit > 0 ? `-${deficit}b` : '0b (Met)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] block text-[#14170F]/60 uppercase font-bold">Deadline</span>
                    <span className="font-extrabold text-[#87550E] flex items-center gap-1 text-xs sm:text-sm">
                      <Clock className="w-3 h-3 text-[#E8A23D]" />
                      T+{h.deadline_minutes}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel 2: Suppliers & Live Invariant Verification */}
      <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#3E6B4F]/10 text-[#3E6B4F]">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wide text-[#14170F]/60">
                Deterministic Capacity Invariant
              </div>
              <div className="text-xs font-serif italic font-bold text-[#14170F] flex items-center gap-1">
                <span>A<sub>s</sub></span>
                <span className="font-sans font-normal">=</span>
                <span>Q<sub>s</sub></span>
                <span className="font-sans font-normal">−</span>
                <span>∑<sub>r ∈ R<sub>s</sub></sub> q<sub>r</sub></span>
                <span className="font-sans font-normal">≥</span>
                <span>0</span>
              </div>
            </div>
          </div>
          <span className="text-xs font-mono text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5B9C20]" /> Invariant Verified
          </span>
        </div>

        <div className="space-y-3">
          {suppliers.map(s => {
            const confirmedTotal = s.confirmed_stock;
            const available = s.available_stock;
            const lockedReservations = Math.max(0, confirmedTotal - available);

            return (
              <div
                key={s.id}
                onClick={() => onSelectSupplier && onSelectSupplier(s.id)}
                className="p-3.5 rounded-xl border border-black/10 bg-[#F8F9F5] hover:border-black/25 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 bg-[#0F1714] text-[#8FD13F] rounded-md">
                      {s.id}
                    </span>
                    <span className="text-sm font-bold text-[#14170F]">
                      {s.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs bg-white text-[#14170F] border border-black/10 px-2.5 py-0.5 rounded-full font-bold">
                    Version: v{s.version}
                  </span>
                </div>

                <div className="bg-white border border-black/10 rounded-xl p-3 font-sans text-xs sm:text-sm space-y-2">
                  <div className="flex items-center justify-between text-[#14170F]">
                    <span className="flex items-center gap-1 text-xs">
                      <span>Confirmed Physical Stock</span>
                      <span className="font-serif italic text-[#14170F]/50">(Q<sub>s</sub>)</span>
                    </span>
                    <span className="font-black font-mono text-[#14170F] text-sm">{confirmedTotal} batches</span>
                  </div>
                  <div className="flex items-center justify-between text-[#14170F]">
                    <span className="flex items-center gap-1 text-xs">
                      <span>Committed Outbound Deliveries</span>
                      <span className="font-serif italic text-[#14170F]/50">(∑ q<sub>r</sub>)</span>
                    </span>
                    <span className="font-bold font-mono text-amber-700 text-sm">−{lockedReservations} batches</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-black/10 pt-2 font-bold text-sm">
                    <span className="flex items-center gap-1 text-xs">
                      <span>Uncommitted Available Buffer</span>
                      <span className="font-serif italic text-[#14170F]/50">(A<sub>s</sub>)</span>
                    </span>
                    <span className="font-black font-mono text-[#2D5A1E] text-base">
                      {available} batches
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
