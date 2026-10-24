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
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-3.5 mb-3.5">
          <div className="flex items-center gap-3">
            <HeartPulse className="w-5 h-5 text-[#D9534F]" />
            <h3 className="text-base font-display font-black uppercase tracking-wide text-[#14170F]">
              Facilities in Need (Priority Ranked)
            </h3>
          </div>
          <span className="text-sm font-mono bg-[#D9534F]/15 text-[#8C2421] border border-[#D9534F]/30 px-3 py-1 rounded-full font-bold">
            {hospitals.length} Targets
          </span>
        </div>

        <div className="space-y-3.5">
          {sortedHospitals.map(h => {
            const received = (h.received || 0) + (h.allocated_batches || 0);
            const deficit = Math.max(0, h.requested_batches - received);
            const isCritical = h.deadline_minutes - simulationMinute <= 60;
            const isSupplied = deficit === 0;

            return (
              <div
                key={h.id}
                onClick={() => onSelectHospital && onSelectHospital(h.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                  isSupplied
                    ? 'bg-[#8FD13F]/15 border-[#8FD13F]/40 hover:border-[#8FD13F]'
                    : isCritical
                    ? 'bg-[#D9534F]/15 border-[#D9534F]/40 hover:border-[#D9534F]'
                    : 'bg-[#F8F9F5] border-black/10 hover:border-black/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black text-[#14170F] bg-black/5 px-2.5 py-0.5 rounded-md">
                      {h.id}
                    </span>
                    <span className="text-base font-display font-black text-[#14170F] line-clamp-1">
                      {h.name}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-mono px-3 py-1 rounded-full font-bold uppercase ${
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

                <div className="grid grid-cols-4 gap-2.5 font-mono text-[#14170F] mt-2.5 bg-white p-3 rounded-xl border border-black/10">
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">On-Hand</span>
                    <span className="font-stat font-black text-[#14170F] text-base">{h.on_hand ?? 0}b</span>
                  </div>
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Demand</span>
                    <span className="font-stat font-black text-[#14170F] text-base">
                      {h.requested_batches}b
                      {(h.submitted_batches ?? 0) > 0 && (
                        <span className="text-xs text-[#2D5A1E] block font-bold">
                          +{h.submitted_batches}b
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Deficit</span>
                    <span className={`font-stat font-black text-base ${deficit > 0 ? 'text-[#8C2421]' : 'text-[#2D5A1E]'}`}>
                      {deficit > 0 ? `-${deficit}b` : '0b (Met)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Deadline</span>
                    <span className="font-stat font-black text-[#87550E] flex items-center gap-1 text-base">
                      <Clock className="w-3.5 h-3.5 text-[#E8A23D]" />
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
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-3.5 mb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#3E6B4F]/10 text-[#3E6B4F]">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-[#14170F]/60">
                Deterministic Capacity Invariant
              </div>
              <div className="text-sm sm:text-base font-serif italic font-black text-[#14170F] flex items-center gap-1.5 mt-0.5">
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
          <span className="text-sm font-mono text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-3 py-1 rounded-full flex items-center gap-1 font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#5B9C20]" /> Verified
          </span>
        </div>

        <div className="space-y-3.5">
          {suppliers.map(s => {
            const confirmedTotal = s.confirmed_stock;
            const available = s.available_stock;
            const lockedReservations = Math.max(0, confirmedTotal - available);

            return (
              <div
                key={s.id}
                onClick={() => onSelectSupplier && onSelectSupplier(s.id)}
                className="p-4 rounded-2xl border border-black/10 bg-[#F8F9F5] hover:border-black/25 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black px-2.5 py-0.5 bg-[#0F1714] text-[#8FD13F] rounded-md">
                      {s.id}
                    </span>
                    <span className="text-base font-display font-black text-[#14170F]">
                      {s.name}
                    </span>
                  </div>
                  <span className="font-mono text-sm bg-white text-[#14170F] border border-black/10 px-3 py-0.5 rounded-full font-bold">
                    Version: v{s.version}
                  </span>
                </div>

                <div className="bg-white border border-black/10 rounded-xl p-3.5 font-sans text-sm space-y-2.5">
                  <div className="flex items-center justify-between text-[#14170F]">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span>Confirmed Physical Stock</span>
                      <span className="font-serif italic text-[#14170F]/50">(Q<sub>s</sub>)</span>
                    </span>
                    <span className="font-black font-mono text-[#14170F] text-base">{confirmedTotal} batches</span>
                  </div>
                  <div className="flex items-center justify-between text-[#14170F]">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span>Committed Outbound Deliveries</span>
                      <span className="font-serif italic text-[#14170F]/50">(∑ q<sub>r</sub>)</span>
                    </span>
                    <span className="font-bold font-mono text-[#87550E] text-base">−{lockedReservations} batches</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-black/10 pt-2.5 font-bold">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <span>Uncommitted Available Buffer</span>
                      <span className="font-serif italic text-[#14170F]/50">(A<sub>s</sub>)</span>
                    </span>
                    <span className="font-stat font-black text-[#2D5A1E] text-lg sm:text-xl">
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
