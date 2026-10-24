import React from 'react';
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
  // Total scenario stock calculation
  const totalAvailableStock = activeSuppliers.reduce((sum, s) => sum + (s.available_stock ?? 0), 0);
  const totalConfirmedStock = activeSuppliers.reduce((sum, s) => sum + (s.confirmed_stock ?? 0), 0);

  return (
    <div className="relative z-10 flex-1 flex flex-col p-6 sm:p-10 space-y-8 bg-transparent text-[#14170F] font-sans">
      {/* Top Depot Header Bar */}
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
              <span>Cryogenic Depot Ledger & Corridor Feasibility</span>
              <span className="text-sm font-mono font-bold bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40 px-3.5 py-1.5 rounded-full">
                {activeSuppliers.length} Active Production Nodes
              </span>
            </h1>
          </div>
        </div>

        {/* Aggregate Depot Metrics */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm uppercase font-mono font-bold text-[#14170F]/60 block mb-1">Total Grid Reserves</span>
            <span className="text-xl sm:text-2xl font-stat font-black text-[#2D5A1E]">
              {totalAvailableStock} / {totalConfirmedStock} Batches Available
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Supplier Card Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-7">
        {activeSuppliers.map(supplier => {
          const supplierMeta = BENGALURU_SUPPLIERS.find(s => s.id === supplier.id) || {
            id: supplier.id,
            name: supplier.name,
            zone: supplier.zone || 'Industrial Zone',
            address: 'Regional Manufacturing Hub',
            cryo_capacity_batches: supplier.confirmed_stock,
            fleet_count: 8,
            dispatch_manager: 'Plant Superintendent',
            phone: '+91-80-2839-4000',
          };

          const confirmedStock = supplier.confirmed_stock ?? supplierMeta.cryo_capacity_batches;
          const availableStock = supplier.available_stock ?? confirmedStock;
          const reservedStock = Math.max(0, confirmedStock - availableStock);
          const stockVersion = supplier.version ?? 1;

          // Outbound corridors for this supplier
          const supplierRoutes = activeRoutes.filter(r => r.supplier_id === supplier.id);

          return (
            <div
              key={supplier.id}
              className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 sm:p-8 shadow-md flex flex-col justify-between space-y-6"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-black/10 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40">
                      Depot {supplier.id}
                    </span>
                    <span className="text-sm font-mono font-bold bg-black/5 text-[#14170F]/80 px-3 py-1 rounded-lg">
                      Version: v{stockVersion}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-[#14170F] flex items-center gap-2 pt-1">
                    {supplier.name || supplierMeta.name}
                  </h2>
                  <div className="text-sm sm:text-base text-[#14170F]/70 flex items-center gap-2.5 font-medium">
                    <span>{supplier.zone || supplierMeta.zone}</span>
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
                  className="px-4 py-2.5 rounded-2xl bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 border border-[#E8A23D]/40 text-[#87550E] text-sm font-black transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
                  title="Simulate external supply disruption (-2 batches, bumps version) to test optimistic concurrency lock"
                >
                  <TrendingDown className="w-4 h-4 text-[#87550E]" />
                  <span>Drift Stock (-2b)</span>
                </button>
              </div>

              {/* Stock Inventory Telemetry Gauges */}
              <div className="grid grid-cols-3 gap-4 bg-[#F8F9F5]/80 p-5 rounded-2xl border border-black/10 text-center font-mono">
                <div>
                  <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Confirmed Base</span>
                  <span className="text-2xl sm:text-3xl font-stat font-black text-[#14170F]">{confirmedStock}</span>
                  <span className="text-sm text-[#14170F]/60 block font-semibold">batches</span>
                </div>
                <div>
                  <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Committed</span>
                  <span className="text-2xl sm:text-3xl font-stat font-black text-[#87550E]">{reservedStock}</span>
                  <span className="text-sm text-[#14170F]/60 block font-semibold">reserved</span>
                </div>
                <div>
                  <span className="text-sm uppercase text-[#14170F]/60 block mb-1 font-bold">Net Available</span>
                  <span className={`text-2xl sm:text-3xl font-stat font-black ${availableStock > 0 ? 'text-[#2D5A1E]' : 'text-[#8C2421]'}`}>
                    {availableStock}
                  </span>
                  <span className="text-sm text-[#14170F]/60 block font-semibold">uncommitted</span>
                </div>
              </div>

              {/* Outbound Corridors Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-base text-[#14170F]/70">
                  <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 text-[#14170F]">
                    <Navigation className="w-4 h-4 text-[#2D5A1E]" />
                    <span>Outbound Corridors ({supplierRoutes.length})</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-[#14170F]/70">Clock: T+{simulationMinute}m</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-base font-mono">
                    <thead>
                      <tr className="border-b border-black/10 text-sm uppercase text-[#14170F]/70 bg-black/[0.03] font-bold">
                        <th className="py-3 px-3.5">Corridor</th>
                        <th className="py-3 px-3.5">Destination</th>
                        <th className="py-3 px-3.5">Transit Time</th>
                        <th className="py-3 px-3.5">Capacity</th>
                        <th className="py-3 px-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {supplierRoutes.map(r => (
                        <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                          <td className="py-3 px-3.5 font-bold text-[#14170F]">{r.id}</td>
                          <td className="py-3 px-3.5 text-[#14170F] font-semibold">
                            {r.hospital_id} ({activeHospitals.find(h => h.id === r.hospital_id)?.name?.split(' ')[0] || r.hospital_id})
                          </td>
                          <td className="py-3 px-3.5 text-[#14170F]/85">
                            {r.travel_minutes}m {r.delay_minutes > 0 ? `(+${r.delay_minutes}m)` : ''}
                          </td>
                          <td className="py-3 px-3.5 text-[#14170F]/85 font-bold">{r.capacity_batches}b</td>
                          <td className="py-3 px-3.5">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Incoming Hospital Requests & Feasibility Analysis */}
              <div className="space-y-4 border-t border-black/10 pt-5">
                <div className="flex items-center justify-between text-base text-[#14170F]">
                  <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2D5A1E]" />
                    <span>Hospital Demand & Feasibility Evaluation</span>
                  </span>
                  <span className="text-sm font-mono text-[#14170F]/60 font-bold">
                    {hospitalRequests.length} Dynamic Requests | {activeHospitals.length} Seeded Facilities
                  </span>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
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
                              {req.hospital_id} ({req.hospital_name.split(' ')[0]})
                            </span>
                            <span className="text-[#87550E] font-black">{req.quantity_batches} batches</span>
                            <span className="text-[#14170F]/60 text-sm font-bold">by T+{req.deadline_minutes}m</span>
                          </div>
                          <div className="text-sm text-[#14170F]/70 mt-1 font-semibold">
                            Priority: <span className="font-bold text-[#14170F]">{req.priority}</span> | Status: <span className="font-bold text-[#2D5A1E]">{req.status}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {!route ? (
                            <span className="text-sm font-bold text-[#14170F]/60 bg-black/5 px-3 py-1.5 rounded-lg">
                              NO DIRECT ROUTE
                            </span>
                          ) : isCorridorBlocked ? (
                            <span className="text-sm font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-[#D9534F]" />
                              CORRIDOR BLOCKED
                            </span>
                          ) : !isDeadlineMet ? (
                            <span className="text-sm font-bold text-[#87550E] bg-[#E8A23D]/20 border border-[#E8A23D]/40 px-3 py-1.5 rounded-lg">
                              TRANSIT MISSES DEADLINE (ETA T+{eta}m)
                            </span>
                          ) : !hasStock ? (
                            <span className="text-sm font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-3 py-1.5 rounded-lg">
                              INSUFFICIENT STOCK ({availableStock} &lt; {req.quantity_batches})
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
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
                        className="p-3.5 rounded-2xl border border-black/10 bg-black/[0.02] text-base font-mono flex items-center justify-between gap-3 text-[#14170F]/80"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs uppercase font-extrabold text-[#14170F]/60 bg-black/5 px-2.5 py-1 rounded-md">
                            Baseline
                          </span>
                          <span className="text-[#14170F] font-bold">{h.id} ({h.name.split(' ')[0]})</span>
                          <span className="font-semibold">Need: {needed} batches (T+{h.deadline_minutes}m)</span>
                        </div>

                        <div>
                          {!route ? (
                            <span className="text-sm text-[#14170F]/50">No Route</span>
                          ) : isCorridorBlocked ? (
                            <span className="text-sm font-bold text-[#8C2421]">Blocked ({route.id})</span>
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
          );
        })}
      </div>
    </div>
  );
};
