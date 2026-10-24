import React, { useState, useMemo } from 'react';
import { HospitalData, RegistryHospital } from '../types';
import { Search, MapPin, Building2, Phone, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';

interface FacilityDirectoryPanelProps {
  registryHospitals: RegistryHospital[];
  activeHospitals: HospitalData[];
  selectedFacilityId?: string;
  onLocateFacility: (facilityId: string) => void;
  onInspectFacilityPOV: (facilityId: string) => void;
}

export const FacilityDirectoryPanel: React.FC<FacilityDirectoryPanelProps> = ({
  registryHospitals,
  activeHospitals,
  selectedFacilityId,
  onLocateFacility,
  onInspectFacilityPOV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'nominal'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // Build lookup of active scenario hospitals by id and scenarioId
  const activeHospitalMap = useMemo(() => {
    const map = new Map<string, HospitalData>();
    activeHospitals.forEach(h => map.set(h.id, h));
    return map;
  }, [activeHospitals]);

  // Extract unique zones for filtering
  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    registryHospitals.forEach(h => {
      if (h.zone) set.add(h.zone.split('/')[0].trim());
    });
    return Array.from(set).sort();
  }, [registryHospitals]);

  // Combined facility records with active demand status
  const combinedList = useMemo(() => {
    return registryHospitals.map(reg => {
      const scenarioId = reg.scenario_id || reg.scenarioId || '';
      const activeMatch = activeHospitalMap.get(reg.id) || (scenarioId ? activeHospitalMap.get(scenarioId) : undefined);
      const isCrisis = !!activeMatch;

      return {
        ...reg,
        activeData: activeMatch,
        isCrisis,
        effectiveId: activeMatch ? activeMatch.id : reg.id,
      };
    });
  }, [registryHospitals, activeHospitalMap]);

  // Filtered list
  const filteredList = useMemo(() => {
    return combinedList.filter(item => {
      // Status filter
      if (statusFilter === 'active' && !item.isCrisis) return false;
      if (statusFilter === 'nominal' && item.isCrisis) return false;

      // Zone filter
      if (zoneFilter !== 'all' && !item.zone?.toLowerCase().includes(zoneFilter.toLowerCase())) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchZone = item.zone?.toLowerCase().includes(query);
        const matchOfficer = item.nodal_officer?.toLowerCase().includes(query);
        const matchId = item.id.toLowerCase().includes(query) || (item.scenario_id || item.scenarioId || '').toLowerCase().includes(query);
        return matchName || matchZone || matchOfficer || matchId;
      }

      return true;
    });
  }, [combinedList, statusFilter, zoneFilter, searchTerm]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F8F9F5] border border-black/10 rounded-2xl overflow-hidden shadow-sm text-[#14170F]">
      {/* Header & Search */}
      <div className="p-4 bg-white border-b border-black/10 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-black uppercase tracking-wide text-[#14170F]">
              Healthcare Facility Directory
            </h3>
          </div>
          <span className="text-xs font-mono bg-black/5 text-[#14170F] border border-black/10 px-2.5 py-1 rounded-lg font-bold">
            {filteredList.length} / {registryHospitals.length} Facilities
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#14170F]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search facility name, zone, or nodal officer..."
            className="w-full bg-[#F8F9F5] border border-black/15 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#14170F] placeholder-black/40 focus:outline-none focus:border-emerald-600 transition-colors shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-bold ${
              statusFilter === 'all'
                ? 'bg-[#14170F] text-white shadow-sm'
                : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
            }`}
          >
            All ({registryHospitals.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-bold ${
              statusFilter === 'active'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
            }`}
          >
            Active Need ({activeHospitals.length})
          </button>
          <button
            onClick={() => setStatusFilter('nominal')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-bold ${
              statusFilter === 'nominal'
                ? 'bg-[#8FD13F] text-[#14170F] shadow-sm'
                : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
            }`}
          >
            Nominal Buffer ({registryHospitals.length - activeHospitals.length})
          </button>

          {uniqueZones.length > 0 && (
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="bg-white border border-black/15 text-[#14170F] text-xs font-bold rounded-lg px-2.5 py-1.5 ml-auto focus:outline-none focus:border-emerald-600 shadow-sm"
            >
              <option value="all">All Zones</option>
              {uniqueZones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Facilities List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-[#14170F]/60 text-sm">
            No registered facilities matching filter query.
          </div>
        ) : (
          filteredList.map(item => {
            const isSelected = selectedFacilityId === item.effectiveId || selectedFacilityId === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all shadow-sm ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/40'
                    : item.isCrisis
                    ? 'bg-white border-rose-300 hover:border-rose-400'
                    : 'bg-white border-black/10 hover:border-black/25'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-[#14170F] bg-black/5 px-2 py-0.5 rounded">
                        {item.scenario_id || item.scenarioId || item.id}
                      </span>
                      <span className="text-sm font-bold text-[#14170F] line-clamp-1">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#14170F]/70 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#14170F]/50 shrink-0" />
                      <span className="line-clamp-1">{item.zone}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {item.isCrisis ? (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-md font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 shrink-0 animate-pulse flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>Active Need</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-md font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Nominal Buffer</span>
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-sm font-mono mt-3 bg-[#F8F9F5] p-3 rounded-xl border border-black/10">
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Capacity</span>
                    <span className="text-[#14170F] font-bold">{item.bed_count} beds ({item.icu_beds} ICU)</span>
                  </div>
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Oxygen Buffer</span>
                    <span className={item.isCrisis ? 'text-rose-700 font-black' : 'text-emerald-800 font-bold'}>
                      {item.isCrisis && item.activeData
                        ? `-${Math.max(0, item.activeData.requested_batches - (item.activeData.allocated_batches || 0))}b deficit`
                        : `${item.oxygen_buffer_hours} hrs`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Facility Type</span>
                    <span className="text-[#14170F] font-semibold truncate block">{item.type || 'Hospital'}</span>
                  </div>
                </div>

                {/* Officer & Actions */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-black/5 text-sm">
                  <div className="text-[#14170F]/70 text-sm truncate flex items-center gap-1.5 font-medium">
                    <Phone className="w-4 h-4 text-[#14170F]/50 shrink-0" />
                    <span>{item.nodal_officer} ({item.phone})</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLocateFacility(item.effectiveId)}
                      className="px-3 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[#14170F] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Center Map on this Facility"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Locate</span>
                    </button>
                    <button
                      onClick={() => onInspectFacilityPOV(item.effectiveId)}
                      className="px-3 py-1.5 rounded-lg bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] text-xs font-black transition-colors flex items-center gap-1 shadow-sm"
                      title="Switch to Hospital Portal POV"
                    >
                      <span>POV</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#14170F]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
