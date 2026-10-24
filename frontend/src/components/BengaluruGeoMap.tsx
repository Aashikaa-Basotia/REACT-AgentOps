import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HospitalData, SupplierData, RouteData, RegistryHospital } from '../types';
import { BENGALURU_HOSPITALS_REGISTRY, BENGALURU_SUPPLIERS } from '../data/bengaluruRegistry';
import { AlertTriangle, Navigation, Compass, Zap } from 'lucide-react';

interface BengaluruGeoMapProps {
  scenarioId?: string;
  activeHospitals: HospitalData[];
  activeSuppliers: SupplierData[];
  activeRoutes: RouteData[];
  simulationMinute: number;
  registryHospitals?: RegistryHospital[];
  selectedFacilityId?: string;
  onSelectHospital?: (hospitalId: string) => void;
  onSelectSupplier?: (supplierId: string) => void;
}

function hasValidCoords<T extends { lat?: number; lng?: number }>(
  item: T
): item is T & { lat: number; lng: number } {
  return (
    typeof item.lat === 'number' &&
    typeof item.lng === 'number' &&
    !isNaN(item.lat) &&
    !isNaN(item.lng) &&
    item.lat !== 0 &&
    item.lng !== 0
  );
}

export const BengaluruGeoMap: React.FC<BengaluruGeoMapProps> = ({
  scenarioId,
  activeHospitals,
  activeSuppliers,
  activeRoutes,
  simulationMinute,
  registryHospitals,
  selectedFacilityId,
  onSelectHospital,
  onSelectSupplier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'crisis' | 'nominal'>('all');
  const [, setSelectedEntity] = useState<any | null>(null);
  const [invalidCoordsWarning, setInvalidCoordsWarning] = useState<string | null>(null);
  const [mapCenterCoords, setMapCenterCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: 12.9716,
    lng: 77.5946,
    zoom: 11,
  });

  // Check if current scenario contains facilities outside Bengaluru (e.g. SC-07)
  const isInterRegional = activeHospitals.some(
    h => hasValidCoords(h) && (h.lat > 14 || h.lng > 78 || h.lng < 77)
  ) || activeSuppliers.some(
    s => hasValidCoords(s) && (s.lat > 14 || s.lng > 78 || s.lng < 77)
  );

  // 1. Initialize Map safely with StrictMode handling and ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale map instance or Leaflet DOM stamp before initializing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialCenter: [number, number] = isInterRegional ? [14.5, 77.5] : [13.015, 77.658];
    const initialZoom = isInterRegional ? 6 : 11;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
    });

    // Valid OSM tile servers round-robin across 'a', 'b', 'c' (NOT 'd')
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    // Track real-time map center and zoom coordinates
    const updateMapCoordinates = () => {
      const center = map.getCenter();
      setMapCenterCoords({
        lat: Number(center.lat.toFixed(4)),
        lng: Number(center.lng.toFixed(4)),
        zoom: map.getZoom(),
      });
    };
    map.on('move', updateMapCoordinates);
    map.on('zoomend', updateMapCoordinates);
    updateMapCoordinates();

    // Responsive sizing observer: handles container visibility switches (e.g. Geomap vs Topology)
    let lastW = 0;
    let lastH = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (Math.abs(width - lastW) > 3 || Math.abs(height - lastH) > 3) {
          lastW = width;
          lastH = height;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ debounceMoveend: true });
          }
        }
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    // Initial resize trigger after layout frame settles
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Pan to selectedFacilityId if specified from external selection
  const lastSelectedFacilityRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedFacilityId || !mapInstanceRef.current) return;
    if (lastSelectedFacilityRef.current === selectedFacilityId) return;
    lastSelectedFacilityRef.current = selectedFacilityId;

    const targetH = activeHospitals.find(h => h.id === selectedFacilityId);
    if (targetH && hasValidCoords(targetH)) {
      mapInstanceRef.current.flyTo([targetH.lat, targetH.lng], 13, { duration: 0.8 });
      return;
    }
    const targetS = activeSuppliers.find(s => s.id === selectedFacilityId);
    if (targetS && hasValidCoords(targetS)) {
      mapInstanceRef.current.flyTo([targetS.lat, targetS.lng], 13, { duration: 0.8 });
      return;
    }
    const regList = registryHospitals && registryHospitals.length > 0 ? registryHospitals : BENGALURU_HOSPITALS_REGISTRY;
    const targetReg = regList.find(h => h.id === selectedFacilityId || h.scenario_id === selectedFacilityId || h.scenarioId === selectedFacilityId);
    if (targetReg && hasValidCoords(targetReg)) {
      mapInstanceRef.current.flyTo([targetReg.lat, targetReg.lng], 13, { duration: 0.8 });
    }
  }, [selectedFacilityId, activeHospitals, activeSuppliers, registryHospitals]);

  // 2. Render Markers and Routes whenever active scenario data or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Coordinate validation report
    const missingCoords: string[] = [];
    activeHospitals.forEach(h => {
      if (!hasValidCoords(h)) {
        missingCoords.push(`Hospital ${h.id} (${h.name})`);
      }
    });
    activeSuppliers.forEach(s => {
      if (!hasValidCoords(s)) {
        missingCoords.push(`Supplier ${s.id} (${s.name})`);
      }
    });
    if (missingCoords.length > 0) {
      setInvalidCoordsWarning(`Missing coordinates for: ${missingCoords.join(', ')}`);
    } else {
      setInvalidCoordsWarning(null);
    }

    const activeHospitalMap = new Map<string, HospitalData>();
    activeHospitals.forEach(h => activeHospitalMap.set(h.id, h));

    const activeSupplierMap = new Map<string, SupplierData>();
    activeSuppliers.forEach(s => activeSupplierMap.set(s.id, s));

    // A. Draw Route Lines First (Under markers) using scenario-supplied coordinates
    activeRoutes.forEach(r => {
      const supplier = activeSupplierMap.get(r.supplier_id);
      const hospital = activeHospitalMap.get(r.hospital_id);

      if (supplier && hospital && hasValidCoords(supplier) && hasValidCoords(hospital)) {
        const isBlocked = r.status === 'blocked';
        const isDelayed = r.status === 'delayed';

        const color = isBlocked ? '#ef4444' : isDelayed ? '#f59e0b' : '#0ea5e9';
        const dashArray = isBlocked ? '8, 8' : isDelayed ? '6, 6' : undefined;
        const weight = isBlocked ? 4 : isDelayed ? 3.5 : 3;

        const polyline = L.polyline(
          [
            [supplier.lat, supplier.lng],
            [hospital.lat, hospital.lng],
          ],
          {
            color,
            weight,
            opacity: 0.85,
            dashArray,
          }
        );

        polyline.bindPopup(`
          <div class="p-2 font-sans text-xs">
            <div class="font-bold text-zinc-900 border-b pb-1 mb-1 flex items-center gap-1">
              <span class="font-mono text-[10px] px-1 py-0.5 rounded font-bold ${isBlocked ? 'bg-red-100 text-red-800' : isDelayed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${isBlocked ? 'BLOCKED' : isDelayed ? 'DELAYED' : 'OPEN'}</span>
              <span>${r.corridor_name || r.id}</span>
            </div>
            <div class="text-zinc-600 space-y-0.5">
              <div><strong>From:</strong> ${supplier.name} (${supplier.id})</div>
              <div><strong>To:</strong> ${hospital.name} (${hospital.id})</div>
              <div><strong>Travel Time:</strong> ${r.travel_minutes} min ${r.delay_minutes > 0 ? `(+${r.delay_minutes}m delay)` : ''}</div>
              <div><strong>Vehicle Capacity:</strong> ${r.capacity_batches} batches</div>
              <div><strong>Status:</strong> <span class="uppercase font-bold ${isBlocked ? 'text-red-600' : isDelayed ? 'text-amber-600' : 'text-emerald-600'}">${r.status}</span></div>
            </div>
          </div>
        `);

        layerGroup.addLayer(polyline);
      }
    });

    // B. Render Suppliers from active scenario using their scenario-declared coordinates
    activeSuppliers.forEach(s => {
      if (!hasValidCoords(s)) return;

      const available = s.available_stock;
      const total = s.confirmed_stock;

      const supplierHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute w-10 h-10 bg-[#3E6B4F]/25 rounded-full animate-ping"></div>
          <div class="w-8 h-8 rounded-xl bg-[#0F1714] border-2 border-white/90 shadow-xl flex items-center justify-center text-[#8FD13F]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="absolute -bottom-6 bg-black/90 text-[#8FD13F] text-[10px] px-2 py-0.5 rounded-md border border-[#3E6B4F]/60 font-mono font-bold whitespace-nowrap shadow-md">
            ${s.id}: ${available}/${total}b (v${s.version || 1})
          </div>
        </div>
      `;

      const supplierIcon = L.divIcon({
        className: 'custom-supplier-icon',
        html: supplierHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([s.lat, s.lng], { icon: supplierIcon });
      marker.on('click', () => {
        setSelectedEntity({ entityKind: 'supplier', ...s });
        if (onSelectSupplier) onSelectSupplier(s.id);
      });

      marker.bindPopup(`
        <div class="p-2.5 font-sans text-xs">
          <div class="font-bold text-[#14170F] text-sm border-b pb-1 mb-1.5 flex items-center gap-1.5">
            <span class="text-[10px] font-mono bg-[#8FD13F]/25 text-[#2D5A1E] px-1.5 py-0.5 rounded font-bold">CRYOGENIC DEPOT</span>
            <span>${s.name} (${s.id})</span>
          </div>
          <div class="text-zinc-700 space-y-1">
            <div><strong>Zone:</strong> ${s.zone}</div>
            <div><strong>Confirmed Total:</strong> ${total} batches</div>
            <div><strong>Available Stock:</strong> <span class="font-bold text-[#2D5A1E]">${available} batches</span></div>
            <div><strong>Stock Version:</strong> v${s.version}</div>
            <div><strong>Coordinates:</strong> ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</div>
          </div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    // C. Render Active Scenario Facilities (Hospitals / Manufacturing Plants)
    activeHospitals.forEach(h => {
      if (!hasValidCoords(h)) return;

      const allocated = h.allocated_batches || 0;
      const requested = h.requested_batches || 0;
      const deficit = Math.max(0, requested - (h.received || 0) - allocated);
      const isFulfilled = deficit === 0;
      const isPartial = !isFulfilled && allocated > 0;
      const isCritical = !isFulfilled && !isPartial;

      const crisisHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute w-10 h-10 ${
            isFulfilled ? 'bg-[#8FD13F]/30' : isPartial ? 'bg-amber-500/30' : 'bg-rose-500/30'
          } rounded-full ${isFulfilled ? '' : 'animate-ping'}"></div>
          <div class="w-8 h-8 rounded-full ${
            isFulfilled ? 'bg-[#2D5A1E]' : isPartial ? 'bg-[#E8A23D]' : 'bg-[#D9534F]'
          } border-2 border-white shadow-xl flex items-center justify-center text-white font-mono font-bold text-xs transition-transform group-hover:scale-110">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </div>
          <div class="absolute -bottom-6 ${
            isFulfilled
              ? 'bg-[#2D5A1E]/95 text-emerald-100 border-[#5B9C20]'
              : isPartial
              ? 'bg-amber-950/90 text-amber-200 border-amber-700'
              : 'bg-rose-950/90 text-rose-200 border-rose-700'
          } text-[10px] px-2 py-0.5 rounded-md border font-mono font-bold whitespace-nowrap shadow-md">
            ${
              isFulfilled
                ? `${h.id}: Optimal (${allocated}/${requested}b)`
                : isPartial
                ? `${h.id}: -${deficit}b | Alloc: ${allocated}b`
                : `${h.id}: -${deficit}b Critical | T+${h.deadline_minutes}m`
            }
          </div>
        </div>
      `;

      const crisisIcon = L.divIcon({
        className: 'custom-crisis-hospital-icon',
        html: crisisHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([h.lat, h.lng], { icon: crisisIcon, zIndexOffset: 1000 });
      marker.on('click', () => {
        setSelectedEntity({ entityKind: 'hospital', ...h, isCrisis: true });
        if (onSelectHospital) onSelectHospital(h.id);
      });

      marker.bindPopup(`
        <div class="p-2.5 font-sans text-xs">
          <div class="font-bold text-rose-800 text-sm border-b pb-1 mb-1.5 flex items-center gap-1.5">
            <span class="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">ACTIVE DEMAND</span>
            <span>${h.name} (${h.id})</span>
          </div>
          <div class="text-zinc-700 space-y-1">
            <div class="text-rose-700 font-bold">${deficit > 0 ? 'STATUS: CRITICAL REPLENISHMENT SHORTAGE' : 'STATUS: DEMAND ALLOCATED'}</div>
            <div><strong>Zone:</strong> ${h.zone}</div>
            <div><strong>Target Demand:</strong> <span class="font-bold text-rose-700">${h.requested_batches} batches</span> ${(h as any).submitted_batches ? `<span class="text-[10px] text-indigo-700 font-bold">(+${(h as any).submitted_batches}b submitted)</span>` : ''}</div>
            <div><strong>Allocated / Received:</strong> ${(h.allocated_batches || 0) + (h.received || 0)} batches</div>
            <div><strong>Remaining Deficit:</strong> <span class="font-bold text-rose-800">${deficit} batches</span></div>
            <div><strong>Deadline:</strong> T+${h.deadline_minutes}m</div>
            <div><strong>Coordinates:</strong> ${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</div>
          </div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    // D. Render Nominal Bengaluru Registry facilities only when scenario is local to Bengaluru
    if (!isInterRegional && filterMode !== 'crisis') {
      const registryList = registryHospitals && registryHospitals.length > 0 ? registryHospitals : BENGALURU_HOSPITALS_REGISTRY;
      registryList.forEach(h => {
        // Skip if this hospital matches an active scenario facility
        const scId = h.scenario_id || h.scenarioId || '';
        if (activeHospitalMap.has(scId) || activeHospitalMap.has(h.id)) return;

        const nominalHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group opacity-75 hover:opacity-100 transition-opacity">
            <div class="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white shadow-sm flex items-center justify-center text-[8px] text-white">
              •
            </div>
          </div>
        `;

        const nominalIcon = L.divIcon({
          className: 'custom-nominal-hospital-icon',
          html: nominalHtml,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([h.lat, h.lng], { icon: nominalIcon });
        marker.on('click', () => {
          setSelectedEntity({ entityKind: 'hospital', ...h, isCrisis: false });
          if (onSelectHospital) onSelectHospital(h.id);
        });

        marker.bindPopup(`
          <div class="p-2 font-sans text-xs">
            <div class="font-bold text-emerald-800 border-b pb-1 mb-1 flex items-center gap-1">
              <span class="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">NOMINAL</span>
              <span>${h.name}</span>
            </div>
            <div class="text-zinc-600 space-y-0.5">
              <div><strong>Zone:</strong> ${h.zone}</div>
              <div><strong>Status:</strong> <span class="text-emerald-700 font-bold">NOMINAL (48h+ Buffer)</span></div>
              <div><strong>Capacity:</strong> ${h.bed_count} beds (${h.icu_beds} ICU)</div>
              <div><strong>Oxygen Buffer:</strong> ${h.oxygen_buffer_hours} hrs</div>
              <div><strong>Nodal Officer:</strong> ${h.nodal_officer}</div>
            </div>
          </div>
        `);

        layerGroup.addLayer(marker);
      });
    }

    // E. Auto-fit bounds on scenario data load
  }, [activeHospitals, activeSuppliers, activeRoutes, filterMode, simulationMinute, isInterRegional, registryHospitals]);

  const fitCrisisBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const points: L.LatLngExpression[] = [];
    activeHospitals.forEach(h => {
      if (hasValidCoords(h)) points.push([h.lat, h.lng]);
    });
    activeSuppliers.forEach(s => {
      if (hasValidCoords(s)) points.push([s.lat, s.lng]);
    });
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [45, 45],
        maxZoom: isInterRegional ? 8 : 11.5,
      });
    }
  };

  // Center view or fit bounds ONLY once when scenarioId changes, never repeatedly on simulation clock updates
  const lastScenarioRef = useRef<string | null>(null);
  useEffect(() => {
    if (!scenarioId) return;
    if (lastScenarioRef.current !== scenarioId) {
      lastScenarioRef.current = scenarioId;
      const t = setTimeout(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (isInterRegional) {
          fitCrisisBounds();
        } else {
          map.setView([13.015, 77.658], 11);
        }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [scenarioId, isInterRegional]);

  const centerDefaultView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (isInterRegional) {
      fitCrisisBounds();
    } else {
      map.setView([13.015, 77.658], 11);
    }
  };

  const registryList = registryHospitals && registryHospitals.length > 0 ? registryHospitals : BENGALURU_HOSPITALS_REGISTRY;
  const activeHospitalMap = new Map<string, HospitalData>();
  activeHospitals.forEach(h => activeHospitalMap.set(h.id, h));

  const totalRegistryCount = isInterRegional ? activeHospitals.length + activeSuppliers.length : registryList.length;
  const nominalCount = isInterRegional
    ? 0
    : registryList.filter(h => {
        const scId = h.scenario_id || h.scenarioId || '';
        return !activeHospitalMap.has(scId) && !activeHospitalMap.has(h.id);
      }).length;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#F8F9F5] overflow-hidden">
      {/* Missing Coordinates Warning Banner */}
      {invalidCoordsWarning && (
        <div className="absolute top-16 left-4 z-[1000] bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{invalidCoordsWarning}</span>
        </div>
      )}

      {/* Top Map Action Bar */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2.5 bg-white/95 backdrop-blur-md border border-black/10 p-2 rounded-2xl shadow-md text-xs sm:text-sm text-[#14170F]">
        <span className="font-black text-[#14170F] px-2.5 flex items-center gap-2 border-r border-black/10">
          <Compass className="w-4 h-4 text-[#3E6B4F]" />
          <span>{isInterRegional ? 'Inter-Regional Grid' : 'Facility GIS Map'}</span>
        </span>

        {/* Live Dynamic GIS Center Coordinates */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 border border-black/10 text-xs font-mono text-[#14170F]">
          <span className="text-[#14170F]/50 font-bold">LAT:</span>
          <span className="text-[#2D5A1E] font-extrabold">{mapCenterCoords.lat}° N</span>
          <span className="text-black/20">|</span>
          <span className="text-[#14170F]/50 font-bold">LNG:</span>
          <span className="text-[#2D5A1E] font-extrabold">{mapCenterCoords.lng}° E</span>
          <span className="text-black/20">|</span>
          <span className="text-[#14170F]/50 font-bold">ZOOM:</span>
          <span className="text-[#8FD13F] font-black">{mapCenterCoords.zoom}x</span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              filterMode === 'all' ? 'bg-[#14170F] text-white' : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
            }`}
          >
            {isInterRegional ? `All Facilities (${totalRegistryCount})` : `All Registry (${totalRegistryCount})`}
          </button>
          <button
            onClick={() => setFilterMode('crisis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              filterMode === 'crisis' ? 'bg-rose-600 text-white' : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
            }`}
          >
            Active Demand ({activeHospitals.length})
          </button>
          {!isInterRegional && (
            <button
              onClick={() => setFilterMode('nominal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                filterMode === 'nominal' ? 'bg-[#8FD13F] text-[#14170F] font-black' : 'bg-black/5 text-[#14170F]/70 hover:text-[#14170F]'
              }`}
            >
              Nominal Buffer ({nominalCount})
            </button>
          )}
        </div>

        {/* View Resets */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-black/10">
          <button
            onClick={fitCrisisBounds}
            className="p-2 rounded-xl text-[#14170F]/70 hover:text-[#14170F] hover:bg-black/5 transition-colors"
            title="Fit to Active Facilities Bounds"
          >
            <Zap className="w-4 h-4 text-amber-600" />
          </button>
          <button
            onClick={centerDefaultView}
            className="p-2 rounded-xl text-[#14170F]/70 hover:text-[#14170F] hover:bg-black/5 transition-colors"
            title={isInterRegional ? 'Fit All Nodes' : 'Center Bengaluru'}
          >
            <Navigation className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full flex-1 min-h-[420px]" style={{ backgroundColor: '#F3F4F0' }} />

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/85 backdrop-blur-md border border-black/8 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-4 text-[11px] font-mono text-[#14170F]/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D9534F] animate-pulse"></span>
          <span>{isInterRegional ? 'Assembly Fab / Plant' : 'Critical Hospital (Active Need)'}</span>
        </div>
        {!isInterRegional && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B9C20]"></span>
            <span>Nominal Registry (48h+ Buffer)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#0F1714]"></span>
          <span>Supplier Depot / Wafer Hub</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#3E6B4F]"></span>
          <span>Open Corridor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t border-dashed border-[#D9534F]"></span>
          <AlertTriangle className="w-3.5 h-3.5 text-[#D9534F]"/> Disrupted / Delayed
        </div>
      </div>
    </div>
  );
};
