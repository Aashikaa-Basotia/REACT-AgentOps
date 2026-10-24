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
    <div className="flex-1 flex flex-col p-6 sm:p-8 space-y-8 bg-[#F8F9F5] text-[#14170F] font-sans">
      {/* Top Depot Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-black/10 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#8FD13F]/20 border border-[#8FD13F]/50 flex items-center justify-center text-[#2D5A1E] font-bold shadow-xs">
            <Factory className="w-6 h-6 text-[#3E6B4F]" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-[#3E6B4F]">
              Supplier Logistics & Inventory Hub
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-black text-[#14170F] flex items-center gap-3 mt-0.5">
              <span>Cryogenic Depot Ledger & Corridor Feasibility</span>
              <span className="text-xs font-mono font-bold bg-[#8FD13F]/20 text-[#2D5A1E] border border-[#8FD13F]/40 px-3 py-1 rounded-full">
                {activeSuppliers.length} Active Production Nodes
              </span>
            </h1>
          </div>
        </div>

        {/* Aggregate Depot Metrics */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs uppercase font-mono font-bold text-[#14170F]/50 block">Total Grid Reserves</span>
            <span className="text-base font-mono font-black text-[#2D5A1E]">
              {totalAvailableStock} / {totalConfirmedStock} Batches Available
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Supplier Card Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
              className="bg-white border border-black/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-black/8 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40">
                      Depot {supplier.id}
                    </span>
                    <span className="text-xs font-mono font-bold bg-black/5 text-[#14170F]/80 px-2.5 py-0.5 rounded">
                      Version: v{stockVersion}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#14170F] flex items-center gap-2 pt-0.5">
                    {supplier.name || supplierMeta.name}
                  </h2>
                  <div className="text-xs text-[#14170F]/70 flex items-center gap-2 font-medium">
                    <span>{supplier.zone || supplierMeta.zone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-[#2D5A1E]">
                      <PhoneCall className="w-3.5 h-3.5" />
                      {supplierMeta.dispatch_manager} ({supplierMeta.phone})
                    </span>
                  </div>
                </div>

                {/* State Drift Test Action Button */}
                <button
                  onClick={() => onSimulateDrift && onSimulateDrift(supplier.id)}
                  className="px-3 py-2 rounded-xl bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 border border-[#E8A23D]/40 text-[#87550E] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  title="Simulate external supply disruption (-2 batches, bumps version) to test optimistic concurrency lock"
                >
                  <TrendingDown className="w-4 h-4 text-[#87550E]" />
                  <span>Drift Stock (-2b)</span>
                </button>
              </div>

              {/* Stock Inventory Telemetry Gauges */}
              <div className="grid grid-cols-3 gap-3 bg-[#F8F9F5] p-4 rounded-xl border border-black/8 text-center font-mono">
                <div>
                  <span className="text-xs uppercase text-[#14170F]/50 block mb-1 font-bold">Confirmed Base</span>
                  <span className="text-xl font-black text-[#14170F]">{confirmedStock}</span>
                  <span className="text-xs text-[#14170F]/50 block">batches</span>
                </div>
                <div>
                  <span className="text-xs uppercase text-[#14170F]/50 block mb-1 font-bold">Committed</span>
                  <span className="text-xl font-black text-[#87550E]">{reservedStock}</span>
                  <span className="text-xs text-[#14170F]/50 block">reserved</span>
                </div>
                <div>
                  <span className="text-xs uppercase text-[#14170F]/50 block mb-1 font-bold">Net Available</span>
                  <span className={`text-xl font-black ${availableStock > 0 ? 'text-[#2D5A1E]' : 'text-[#8C2421]'}`}>
                    {availableStock}
                  </span>
                  <span className="text-xs text-[#14170F]/50 block">uncommitted</span>
                </div>
              </div>

              {/* Outbound Corridors Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-[#14170F]/70">
                  <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 text-[#14170F]">
                    <Navigation className="w-4 h-4 text-[#3E6B4F]" />
                    <span>Outbound Corridors ({supplierRoutes.length})</span>
                  </span>
                  <span className="text-xs font-mono font-bold">Clock: T+{simulationMinute}m</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-mono">
                    <thead>
                      <tr className="border-b border-black/10 text-xs uppercase text-[#14170F]/50 bg-black/[0.02]">
                        <th className="py-2 px-3">Corridor</th>
                        <th className="py-2 px-3">Destination</th>
                        <th className="py-2 px-3">Transit Time</th>
                        <th className="py-2 px-3">Capacity</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {supplierRoutes.map(r => (
                        <tr key={r.id} className="hover:bg-black/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#14170F]">{r.id}</td>
                          <td className="py-2.5 px-3 text-[#14170F]">
                            {r.hospital_id} ({activeHospitals.find(h => h.id === r.hospital_id)?.name?.split(' ')[0] || r.hospital_id})
                          </td>
                          <td className="py-2.5 px-3 text-[#14170F]/80">
                            {r.travel_minutes}m {r.delay_minutes > 0 ? `(+${r.delay_minutes}m)` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-[#14170F]/80">{r.capacity_batches}b</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
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
              <div className="space-y-3 border-t border-black/8 pt-4">
                <div className="flex items-center justify-between text-sm text-[#14170F]">
                  <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#3E6B4F]" />
                    <span>Hospital Demand & Feasibility Evaluation</span>
                  </span>
                  <span className="text-xs font-mono text-[#14170F]/50 font-bold">
                    {hospitalRequests.length} Dynamic Requests | {activeHospitals.length} Seeded Facilities
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
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
                        className={`p-3 rounded-xl border text-sm font-mono flex items-center justify-between gap-3 ${
                          isFeasible
                            ? 'bg-[#8FD13F]/15 border-[#8FD13F]/40'
                            : isCorridorBlocked
                            ? 'bg-[#D9534F]/15 border-[#D9534F]/40'
                            : 'bg-black/[0.02] border-black/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#3E6B4F]">{req.request_id}</span>
                            <span className="text-[#14170F] font-semibold">
                              {req.hospital_id} ({req.hospital_name.split(' ')[0]})
                            </span>
                            <span className="text-[#87550E] font-bold">{req.quantity_batches} batches</span>
                            <span className="text-[#14170F]/50 text-xs">by T+{req.deadline_minutes}m</span>
                          </div>
                          <div className="text-xs text-[#14170F]/70 mt-1">
                            Priority: <span className="font-bold text-[#14170F]">{req.priority}</span> | Status: <span className="font-bold text-[#2D5A1E]">{req.status}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {!route ? (
                            <span className="text-xs font-bold text-[#14170F]/60 bg-black/5 px-2.5 py-1 rounded-md">
                              NO DIRECT ROUTE
                            </span>
                          ) : isCorridorBlocked ? (
                            <span className="text-xs font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-[#D9534F]" />
                              CORRIDOR BLOCKED
                            </span>
                          ) : !isDeadlineMet ? (
                            <span className="text-xs font-bold text-[#87550E] bg-[#E8A23D]/20 border border-[#E8A23D]/40 px-2.5 py-1 rounded-md">
                              TRANSIT MISSES DEADLINE (ETA T+{eta}m)
                            </span>
                          ) : !hasStock ? (
                            <span className="text-xs font-bold text-[#8C2421] bg-[#D9534F]/20 border border-[#D9534F]/40 px-2.5 py-1 rounded-md">
                              INSUFFICIENT STOCK ({availableStock} &lt; {req.quantity_batches})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9C20]" />
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
                        className="p-2.5 rounded-xl border border-black/8 bg-black/[0.02] text-sm font-mono flex items-center justify-between gap-3 text-[#14170F]/70"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase font-bold text-[#14170F]/50 bg-black/5 px-2 py-0.5 rounded">
                            Baseline
                          </span>
                          <span className="text-[#14170F] font-bold">{h.id} ({h.name.split(' ')[0]})</span>
                          <span>Need: {needed} batches (T+{h.deadline_minutes}m)</span>
                        </div>

                        <div>
                          {!route ? (
                            <span className="text-xs text-[#14170F]/50">No Route</span>
                          ) : isCorridorBlocked ? (
                            <span className="text-xs font-bold text-[#8C2421]">Blocked ({route.id})</span>
                          ) : isFeasible ? (
                            <span className="text-xs text-[#2D5A1E] font-bold">
                              Corridor Open (ETA T+{eta}m)
                            </span>
                          ) : (
                            <span className="text-xs text-[#14170F]/50">Exceeds Buffer</span>
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
