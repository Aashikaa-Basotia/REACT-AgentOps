import React, { useState, useEffect } from 'react';
import { SupplierData, RouteData, HospitalData, HospitalRequest } from '../types';
import { BENGALURU_SUPPLIERS } from '../data/bengaluruRegistry';
import {
  Factory,
  CheckCircle2,
  XCircle,
  TrendingDown,
  PhoneCall,
  Navigation,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface SupplierDepotViewProps {
  activeSuppliers: SupplierData[];
  activeRoutes: RouteData[];
  activeHospitals: HospitalData[];
  simulationMinute: number;
  initialSupplierId?: string;
  hospitalRequests?: HospitalRequest[];
  onSelectSupplier?: (supplierId: string) => void;
  onSimulateDrift?: (supplierId: string) => void;
}

export const SupplierDepotView: React.FC<SupplierDepotViewProps> = ({
  activeSuppliers,
  activeRoutes,
  activeHospitals,
  simulationMinute,
  initialSupplierId,
  hospitalRequests = [],
  onSelectSupplier,
  onSimulateDrift,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || activeSuppliers[0]?.id || 'S1'
  );

  useEffect(() => {
    if (initialSupplierId) {
      setSelectedSupplierId(initialSupplierId);
    }
  }, [initialSupplierId]);

  // Total scenario stock calculation
  const totalAvailableStock = activeSuppliers.reduce((sum, s) => sum + (s.available_stock ?? 0), 0);
  const totalConfirmedStock = activeSuppliers.reduce((sum, s) => sum + (s.confirmed_stock ?? 0), 0);

  // Current selected supplier
  const supplier = activeSuppliers.find(s => s.id === selectedSupplierId) || activeSuppliers[0] || {
    id: 'S1',
    name: 'Peenya Cryogenic Oxygen Depot',
    confirmed_stock: 12,
    available_stock: 12,
    version: 1,
  };

  const supplierMeta = BENGALURU_SUPPLIERS.find(s => s.id === supplier.id) || {
    id: supplier.id,
    name: supplier.name,
    zone: supplier.zone || 'North-West Industrial Zone',
    address: 'Peenya Industrial Area, Phase 1, Bengaluru',
    cryo_capacity_batches: supplier.confirmed_stock,
    fleet_count: 8,
    dispatch_manager: 'Plant Superintendent R. S. Narayanan',
    phone: '+91-80-2839-4000',
  };

  const confirmedStock = supplier.confirmed_stock ?? supplierMeta.cryo_capacity_batches;
  const availableStock = supplier.available_stock ?? confirmedStock;
  const reservedStock = Math.max(0, confirmedStock - availableStock);
  const stockVersion = supplier.version ?? 1;

  // Outbound corridors for this supplier
  const supplierRoutes = activeRoutes.filter(r => r.supplier_id === supplier.id);

  return (
    <div className="relative z-10 flex-1 flex flex-col p-6 sm:p-10 space-y-8 bg-transparent text-[#14170F] font-sans">
      {/* Top Depot Header Bar with POV Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/90 backdrop-blur-md border border-black/10 p-7 sm:p-8 rounded-3xl shadow-md">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#8FD13F]/25 border border-[#8FD13F]/50 flex items-center justify-center text-[#2D5A1E] font-bold shadow-sm shrink-0">
            <Factory className="w-7 h-7 text-[#2D5A1E]" />
          </div>
          <div>
            <div className="text-sm uppercase font-extrabold tracking-widest text-[#2E7D32]">
              Supplier Logistics & Inventory Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#14170F] flex items-center gap-3 mt-1 flex-wrap">
              <span>{supplier.name || supplierMeta.name}</span>
              <span className="text-sm font-mono font-bold bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40 px-3.5 py-1.5 rounded-full">
                Active Depot POV ({supplier.id})
              </span>
            </h1>
          </div>
        </div>

        {/* Right Active Supplier POV Selector Dropdown */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-base font-bold text-[#14170F] whitespace-nowrap">Active Supplier POV:</label>
            <select
              value={selectedSupplierId}
              onChange={e => {
                const val = e.target.value;
                setSelectedSupplierId(val);
                if (onSelectSupplier) onSelectSupplier(val);
              }}
              className="bg-white border border-black/20 text-[#14170F] text-base rounded-2xl px-4 py-3 focus:outline-none focus:border-[#8FD13F] font-bold shadow-sm min-w-[280px] max-w-[380px] h-13"
            >
              {activeSuppliers.map(s => {
                const meta = BENGALURU_SUPPLIERS.find(m => m.id === s.id);
                return (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name || meta?.name || s.id} ({s.zone || meta?.zone || 'Industrial'})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="text-right pl-4 border-l border-black/10 hidden md:block">
            <span className="text-xs uppercase font-mono font-bold text-[#14170F]/60 block mb-0.5">Total Grid Stock</span>
            <span className="text-lg font-stat font-black text-[#2D5A1E]">
              {totalAvailableStock} / {totalConfirmedStock}b Available
            </span>
          </div>
        </div>
      </div>

      {/* Single Selected Supplier Depot View */}
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col space-y-7">
        {/* Card Header & Profile */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 rounded-xl text-sm font-mono font-bold bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40">
                Depot ID: {supplier.id}
              </span>
              <span className="text-sm font-mono font-bold bg-black/5 text-[#14170F]/80 px-3.5 py-1 rounded-xl">
                Concurrency State: v{stockVersion}
              </span>
              <span className="text-sm font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Optimistic Lock Verified
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[#14170F] pt-1">
              {supplier.name || supplierMeta.name}
            </h2>
            <div className="text-sm sm:text-base text-[#14170F]/70 flex flex-wrap items-center gap-3 font-medium">
              <span>{supplier.zone || supplierMeta.zone}</span>
              <span>•</span>
              <span className="text-xs sm:text-sm font-mono text-[#14170F]/60">{supplierMeta.address}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#2D5A1E]">
                <PhoneCall className="w-4 h-4" />
                {supplierMeta.dispatch_manager} ({supplierMeta.phone})
              </span>
            </div>
          </div>

          {/* State Drift Test Action Button */}
          <button
            onClick={() => onSimulateDrift && onSimulateDrift(supplier.id)}
            className="px-5 py-3 rounded-2xl bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 border border-[#E8A23D]/40 text-[#87550E] text-base font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
            title="Simulate external supply disruption (-2 batches, bumps version) to test optimistic concurrency lock"
          >
            <TrendingDown className="w-5 h-5 text-[#87550E]" />
            <span>Simulate Stock Disruption (-2 batches)</span>
          </button>
        </div>

        {/* Stock Inventory Telemetry Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-[#F8F9F5]/90 p-6 rounded-2xl border border-black/10 text-center font-mono">
          <div className="p-4 bg-white rounded-xl border border-black/8 shadow-xs">
            <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Confirmed Physical Stock</span>
            <span className="text-3xl sm:text-4xl font-stat font-black text-[#14170F]">{confirmedStock}</span>
            <span className="text-sm text-[#14170F]/60 block font-semibold mt-1">batches in cryogenic storage</span>
          </div>
          <div className="p-4 bg-white rounded-xl border border-black/8 shadow-xs">
            <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Committed Outbound Deliveries</span>
            <span className="text-3xl sm:text-4xl font-stat font-black text-[#87550E]">{reservedStock}</span>
            <span className="text-sm text-[#14170F]/60 block font-semibold mt-1">batches locked in transit</span>
          </div>
          <div className="p-4 bg-white rounded-xl border border-black/8 shadow-xs">
            <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Net Available Emergency Buffer</span>
            <span className={`text-3xl sm:text-4xl font-stat font-black ${availableStock > 0 ? 'text-[#2D5A1E]' : 'text-[#8C2421]'}`}>
              {availableStock}
            </span>
            <span className="text-sm text-[#14170F]/60 block font-semibold mt-1">batches ready for immediate dispatch</span>
          </div>
        </div>

        {/* Outbound Corridors Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-base text-[#14170F]/70 border-b border-black/8 pb-3">
            <span className="font-bold uppercase tracking-wider text-base flex items-center gap-2.5 text-[#14170F]">
              <Navigation className="w-5 h-5 text-[#2D5A1E]" />
              <span>Outbound Transport Corridors ({supplierRoutes.length} Connected Routes)</span>
            </span>
            <span className="text-sm font-mono font-bold text-[#14170F]/70">Incident Clock: T+{simulationMinute}m</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-black/10">
            <table className="w-full text-left text-base font-mono">
              <thead>
                <tr className="border-b border-black/10 text-sm uppercase text-[#14170F]/70 bg-black/[0.03] font-bold">
                  <th className="py-3.5 px-4">Corridor ID</th>
                  <th className="py-3.5 px-4">Destination Facility</th>
                  <th className="py-3.5 px-4">Transit Time</th>
                  <th className="py-3.5 px-4">Max Capacity</th>
                  <th className="py-3.5 px-4">Route Status</th>
                  <th className="py-3.5 px-4">Active Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {supplierRoutes.map(r => (
                  <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#14170F]">{r.id}</td>
                    <td className="py-3.5 px-4 text-[#14170F] font-semibold">
                      {r.hospital_id} ({activeHospitals.find(h => h.id === r.hospital_id)?.name || r.hospital_id})
                    </td>
                    <td className="py-3.5 px-4 text-[#14170F]/85">
                      {r.travel_minutes}m {r.delay_minutes > 0 ? `(+${r.delay_minutes}m delay)` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-[#14170F]/85 font-bold">{r.capacity_batches} batches</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase ${
                        r.status === 'open'
                          ? 'bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/50'
                          : r.status === 'delayed'
                          ? 'bg-[#E8A23D]/20 text-[#87550E] border border-[#E8A23D]/40'
                          : 'bg-[#D9534F]/20 text-[#8C2421] border border-[#D9534F]/40'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-stat font-black text-lg text-[#2D5A1E]">
                      {r.active_batches ?? 0} batches
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incoming Hospital Requests & Feasibility Analysis */}
        <div className="space-y-4 border-t border-black/10 pt-6">
          <div className="flex items-center justify-between text-base text-[#14170F]">
            <span className="font-bold uppercase tracking-wider text-base flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#2D5A1E]" />
              <span>Incoming Replenishment Demands & Feasibility Verification</span>
            </span>
            <span className="text-sm font-mono text-[#14170F]/60 font-bold">
              {hospitalRequests.length} Dynamic Requests | {activeHospitals.length} Seeded Facilities
            </span>
          </div>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
            {/* 1. Dynamic User-Submitted Requests */}
            {hospitalRequests.map(req => {
              const route = supplierRoutes.find(r => r.hospital_id === req.hospital_id);
              const eta = route ? simulationMinute + route.travel_minutes + route.delay_minutes : 999;
              const isCorridorBlocked = route && route.status === 'blocked';
              const isDeadlineMet = eta <= req.deadline_minutes;
              const hasStock = availableStock >= req.quantity_batches;
              const isFeasible = route && !isCorridorBlocked && isDeadlineMet && hasStock;

              return (
                <div
                  key={req.request_id}
                  className={`p-4 rounded-2xl border text-base font-mono flex items-center justify-between gap-4 ${
                    isFeasible
                      ? 'bg-[#8FD13F]/15 border-[#8FD13F]/40'
                      : isCorridorBlocked
                      ? 'bg-[#D9534F]/15 border-[#D9534F]/40'
                      : 'bg-black/[0.02] border-black/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-[#2D5A1E]">{req.request_id}</span>
                      <span className="text-[#14170F] font-bold">
                        {req.hospital_id} ({req.hospital_name})
                      </span>
                      <span className="text-[#87550E] font-black">{req.quantity_batches} batches</span>
                      <span className="text-[#14170F]/60 text-sm font-bold">Deadline: T+{req.deadline_minutes}m</span>
                    </div>
                    <div className="text-sm text-[#14170F]/70 mt-1 font-semibold">
                      Priority: <span className="font-bold text-[#14170F]">{req.priority}</span> | Status: <span className="font-bold text-[#2D5A1E]">{req.status}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {!route ? (
                      <span className="text-sm font-bold text-[#14170F]/60 bg-black/5 px-3.5 py-1.5 rounded-lg">
                        NO DIRECT ROUTE
                      </span>
                    ) : isCorridorBlocked ? (
                      <span className="text-sm font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-[#D9534F]" />
                        CORRIDOR BLOCKED
                      </span>
                    ) : !isDeadlineMet ? (
                      <span className="text-sm font-bold text-[#87550E] bg-[#E8A23D]/20 border border-[#E8A23D]/40 px-3.5 py-1.5 rounded-lg">
                        TRANSIT MISSES DEADLINE (ETA T+{eta}m)
                      </span>
                    ) : !hasStock ? (
                      <span className="text-sm font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-3.5 py-1.5 rounded-lg">
                        INSUFFICIENT STOCK ({availableStock} &lt; {req.quantity_batches}b)
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#5B9C20]" />
                        FEASIBLE (via {route.id}, ETA T+{eta}m)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 2. Seeded Scenario Facilities */}
            {activeHospitals.map(h => {
              const route = supplierRoutes.find(r => r.hospital_id === h.id);
              const eta = route ? simulationMinute + route.travel_minutes + route.delay_minutes : 999;
              const isCorridorBlocked = route && route.status === 'blocked';
              const isDeadlineMet = eta <= h.deadline_minutes;
              const needed = Math.max(0, h.requested_batches - (h.received || 0) - (h.allocated_batches || 0));
              const isFeasible = route && !isCorridorBlocked && isDeadlineMet && availableStock > 0;

              return (
                <div
                  key={`seeded-${h.id}`}
                  className="p-4 rounded-2xl border border-black/10 bg-black/[0.02] text-base font-mono flex items-center justify-between gap-3 text-[#14170F]/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase font-extrabold text-[#14170F]/60 bg-black/5 px-2.5 py-1 rounded-md">
                      Baseline Target
                    </span>
                    <span className="text-[#14170F] font-bold">{h.id} — {h.name}</span>
                    <span className="font-semibold">Target: {needed} batches (Deadline T+{h.deadline_minutes}m)</span>
                  </div>

                  <div>
                    {!route ? (
                      <span className="text-sm text-[#14170F]/50">No Direct Route</span>
                    ) : isCorridorBlocked ? (
                      <span className="text-sm font-bold text-[#8C2421]">Corridor Blocked ({route.id})</span>
                    ) : isFeasible ? (
                      <span className="text-sm text-[#2D5A1E] font-bold">
                        Corridor Open (ETA T+{eta}m)
                      </span>
                    ) : (
                      <span className="text-sm text-[#14170F]/50">Exceeds Buffer</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
