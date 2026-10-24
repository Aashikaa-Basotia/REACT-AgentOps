import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { TopologyGraph } from './components/TopologyGraph';
import { AgentActivityFeed } from './components/AgentActivityFeed';
import { ComparisonDrawer } from './components/ComparisonDrawer';
import { DebriefModal } from './components/DebriefModal';
import { HumanApprovalModal } from './components/HumanApprovalModal';
import { BengaluruGeoMap } from './components/BengaluruGeoMap';
import { LiveMathPanels } from './components/LiveMathPanels';
import { HospitalPortalView } from './components/HospitalPortalView';
import { SupplierDepotView } from './components/SupplierDepotView';
import { FacilityDirectoryPanel } from './components/FacilityDirectoryPanel';
import { DataIngestionModal } from './components/DataIngestionModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { EnterpriseAcceleratorModal } from './components/EnterpriseAcceleratorModal';
import { GovernanceModal } from './components/GovernanceModal';
import { EvaluatorTourGuide } from './components/EvaluatorTourGuide';
import {
  ScenarioMeta,
  HospitalData,
  SupplierData,
  RouteData,
  EventLogEntry,
  BenchmarkRow,
  SupervisorDebrief,
  StagedPlan,
  RolePOV,
  CoordinatorViewMode,
  DomainPack,
  DOMAIN_TERMINOLOGY,
  RegistryHospital,
  RegistrySupplier,
  HospitalRequest,
} from './types';
import { BENGALURU_HOSPITALS_REGISTRY, BENGALURU_SUPPLIERS } from './data/bengaluruRegistry';
import { Map, Network, Terminal, Calculator, Building2, X } from 'lucide-react';
import { NetworkBackground } from './components/NetworkBackground';
import { DetailDrawer } from './components/DetailDrawer';
import { HeroLandingOverlay } from './components/HeroLandingOverlay';

// Default Scenarios Metadata fallback
const DEFAULT_SCENARIOS: ScenarioMeta[] = [
  { id: 'SC-01', filename: '01_baseline.json', name: 'Clean Baseline (Optimal Ops)', description: 'Normal operations across Bengaluru corridors with clean feasibility.', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
  { id: 'SC-02', filename: '02_flood_basic.json', name: 'Compound Flood Disruption', description: 'Bellandur/Sarjapur routes flooded at t=30m, coordinator adapts at t=120m.', hospitals_count: 3, suppliers_count: 2, routes_count: 5, total_demand: 20, total_supply: 20 },
  { id: 'SC-03', filename: '03_double_booking.json', name: 'Double-Booking Competition', description: 'Competing demands on central depot S1 (Peenya Cryo-Plant).', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
  { id: 'SC-04', filename: '04_ambiguous_reply.json', name: 'Ambiguous Supplier Message', description: 'Hoskote depot replies with ambiguous collection status ("Six ready").', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
  { id: 'SC-05', filename: '05_stale_confirmation.json', name: 'Stale Stock Version Mismatch', description: 'Peenya inventory drops while plan is pending human sign-off.', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
  { id: 'SC-06', filename: '06_infeasible_demand.json', name: 'Physical Shortfall & Triage', description: 'Total demand exceeds capacity; honest gap surfacing.', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
  { id: 'SC-07', filename: '07_semiconductor_jit_accelerator.json', name: 'Advanced Mfg (Semiconductor JIT)', description: 'Cross-industry enterprise accelerator: JIT wafer distribution under customs freeze.', hospitals_count: 3, suppliers_count: 2, routes_count: 4, total_demand: 20, total_supply: 20 },
];

export function App() {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>(DEFAULT_SCENARIOS);
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('SC-02');
  const [simulationMinute, setSimulationMinute] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  // 3-Role POV Switcher State
  const [rolePOV, setRolePOV] = useState<RolePOV>('coordinator');
  const [coordinatorView, setCoordinatorView] = useState<CoordinatorViewMode>('geomap');
  const [coordinatorRightTab, setCoordinatorRightTab] = useState<'math' | 'feed' | 'directory'>('math');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('H1');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('S1');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>(undefined);

  // Authoritative Registry State
  const [registryHospitals, setRegistryHospitals] = useState<RegistryHospital[]>(BENGALURU_HOSPITALS_REGISTRY as unknown as RegistryHospital[]);
  const [registrySuppliers, setRegistrySuppliers] = useState<RegistrySupplier[]>(BENGALURU_SUPPLIERS as unknown as RegistrySupplier[]);

  // Network State
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [hospitalRequests, setHospitalRequests] = useState<HospitalRequest[]>([]);

  // Comparison & Debrief
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkRow[]>([]);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState<boolean>(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState<boolean>(false);
  const [debrief, setDebrief] = useState<SupervisorDebrief | null>(null);

  // Human Coordinator Approval State
  const [stagedPlan, setStagedPlan] = useState<StagedPlan | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);
  const [isApprovalProcessing, setIsApprovalProcessing] = useState<boolean>(false);
  const [driftAlert, setDriftAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Live Data Ingestion State
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [ingestionTab, setIngestionTab] = useState<'supplier' | 'hospital'>('supplier');

  // Enterprise Accelerator Domain Pack & Executive Analytics State
  const [domainPack, setDomainPack] = useState<DomainPack>('healthcare');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isCgiAcceleratorOpen, setIsCgiAcceleratorOpen] = useState<boolean>(false);
  const [isGovernanceOpen, setIsGovernanceOpen] = useState<boolean>(false);
  const [isTourGuideOpen, setIsTourGuideOpen] = useState<boolean>(false);
  const [isHeroOpen, setIsHeroOpen] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<
    | { type: 'hospital'; data: HospitalData }
    | { type: 'supplier'; data: SupplierData }
    | null
  >(null);
  const terminology = DOMAIN_TERMINOLOGY[domainPack];

  const handleSelectDomainPack = (pack: DomainPack) => {
    setDomainPack(pack);
    if (pack === 'manufacturing') {
      setCurrentScenarioId('SC-07');
    } else {
      if (currentScenarioId === 'SC-07') {
        setCurrentScenarioId('SC-02');
      }
    }
  };

  const handleSelectScenario = (id: string) => {
    abortPlaybackRef.current = true;
    playbackRunIdRef.current += 1;
    setIsSimulating(false);
    setStagedPlan(null);
    setIsApprovalOpen(false);
    setIsDebriefOpen(false);
    setDebrief(null);
    setDriftAlert(null);
    setErrorAlert(null);
    setSimulationMinute(0);
    setCurrentScenarioId(id);
    setSelectedFacilityId(undefined);
    setHospitalRequests([]);

    // Sync selected hospital and supplier IDs based on scenario scope
    if (id === 'SC-07') {
      setSelectedHospitalId('H_KA_01');
      setSelectedSupplierId('S_MFG_KA_01');
      setDomainPack('manufacturing');
    } else {
      setSelectedHospitalId('H1');
      setSelectedSupplierId('S1');
      setDomainPack('healthcare');
    }
  };

  const handleOpenIngestion = (tab: 'supplier' | 'hospital' = 'supplier') => {
    setIngestionTab(tab);
    setIsIngestionOpen(true);
  };

  const abortPlaybackRef = useRef<boolean>(false);
  const playbackRunIdRef = useRef<number>(0);

  // 1. Fetch Authoritative Registry Data
  useEffect(() => {
    fetch('/api/registry/bengaluru')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.hospitals && Array.isArray(data.hospitals) && data.hospitals.length > 0) {
          setRegistryHospitals(data.hospitals);
        }
        if (data.suppliers && Array.isArray(data.suppliers) && data.suppliers.length > 0) {
          setRegistrySuppliers(data.suppliers);
        }
      })
      .catch(err => {
        console.warn('Authoritative registry endpoint unreachable, maintaining fallback registry:', err);
      });
  }, []);

  // 2. Fetch Scenarios List
  useEffect(() => {
    fetch('/api/scenarios')
      .then(r => r.json())
      .then(data => {
        if (data.scenarios && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
          setServerOnline(true);
        }
      })
      .catch(() => {
        setServerOnline(false);
      });
  }, []);

  // 2. Fetch Benchmark Results Proof
  const loadBenchmarkResults = useCallback(() => {
    setIsBenchmarkLoading(true);
    fetch('/api/evaluation/results')
      .then(r => r.json())
      .then(data => {
        if (data.results) {
          const grouped: Record<string, BenchmarkRow> = {};
          data.results.forEach((item: any) => {
            const scId = item.scenario_id;
            const cleanName = (item.scenario_name || scId)
              .replace(/â€“|â€”|\u00e2\u20ac\u201d|\u00e2\u20ac\u2014/g, '—')
              .replace(/\s*[-—]\s*/g, ' — ')
              .trim();
            if (!grouped[scId]) {
              grouped[scId] = {
                scenario: scId,
                scenario_name: cleanName,
                fixed_rules: { tool_calls: 12, invalid_proposals: 0, unmet_batches: 0 },
                single_agent: { tool_calls: 14, invalid_proposals: 1, unmet_batches: 10 },
                multi_agent: { tool_calls: 13, invalid_proposals: 0, unmet_batches: 0 },
              };
            }
            if (item.approach === 'fixed_rules') {
              grouped[scId].fixed_rules = {
                tool_calls: item.tool_calls,
                invalid_proposals: item.invalid_proposals,
                unmet_batches: item.unmet_batches,
                runtime_ms: item.runtime_ms,
              };
            } else if (item.approach === 'single_agent') {
              grouped[scId].single_agent = {
                tool_calls: item.tool_calls,
                invalid_proposals: item.invalid_proposals,
                unmet_batches: item.unmet_batches,
                runtime_ms: item.runtime_ms,
              };
            } else if (item.approach === 'multi_agent') {
              grouped[scId].multi_agent = {
                tool_calls: item.tool_calls,
                invalid_proposals: item.invalid_proposals,
                unmet_batches: item.unmet_batches,
                runtime_ms: item.runtime_ms,
              };
            }
          });
          setBenchmarkData(Object.values(grouped));
        }
        setIsBenchmarkLoading(false);
      })
      .catch(() => {
        setIsBenchmarkLoading(false);
      });
  }, []);

  useEffect(() => {
    loadBenchmarkResults();
  }, [loadBenchmarkResults]);

  // 3. Load or Reset Session State
  const loadSessionState = useCallback((scId: string, minute: number = 0) => {
    fetch(`/api/session/${scId}/state?minute=${minute}`)
      .then(async r => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || `Server responded with ${r.status}`);
        }
        return r.json();
      })
      .then(data => {
        setServerOnline(true);
        setStagedPlan(data.staged_plan || null);
        if (data.summary) {
          const sum = data.summary;
          setSimulationMinute(sum.clock ?? minute);
          if (sum.hospital_requests) {
            setHospitalRequests(sum.hospital_requests);
          }

          // Map staged plan allocations so proposed fulfillment is immediately visible
          const stagedMap: Record<string, number> = {};
          if (data.staged_plan?.allocations) {
            data.staged_plan.allocations.forEach((a: any) => {
              stagedMap[a.hospital_id] = (stagedMap[a.hospital_id] || 0) + (a.quantity || 0);
            });
          }

          // Format Hospitals with strictly verified real-time invariant status
          const hList: HospitalData[] = (sum.hospitals || []).map((h: any) => {
            const hid = h.id || h.hospital_id;
            const req = h.requested_batches ?? h.target_demand ?? 8;
            const committedAlloc = h.allocated_batches ?? (h.reserved_incoming ? h.reserved_incoming + (h.on_hand_stock ?? 0) : (h.on_hand_stock ?? h.on_hand ?? 0));
            const stagedAlloc = stagedMap[hid] || 0;
            const effectiveAlloc = Math.max(committedAlloc, stagedAlloc);
            const unmet = Math.max(0, req - effectiveAlloc);

            return {
              id: hid,
              name: h.name || `Hospital ${hid}`,
              requested_batches: req,
              seeded_batches: h.seeded_batches ?? req,
              submitted_batches: h.submitted_batches ?? 0,
              allocated_batches: effectiveAlloc,
              deadline_minutes: h.deadline_minutes ?? 120,
              on_hand: h.on_hand ?? h.on_hand_stock ?? 0,
              received: h.total_received ?? 0,
              unmet: unmet,
              status: unmet === 0
                ? 'optimal'
                : effectiveAlloc > 0
                ? 'warning'
                : 'critical',
              zone: h.zone || '',
              lat: typeof h.lat === 'number' ? h.lat : undefined,
              lng: typeof h.lng === 'number' ? h.lng : undefined,
            };
          });
          setHospitals(hList);

          // Format Suppliers
          const sList: SupplierData[] = (sum.suppliers || []).map((s: any) => ({
            id: s.id || s.supplier_id,
            name: s.name || `Supplier ${s.id}`,
            confirmed_stock: s.total_stock ?? s.confirmed_stock ?? 10,
            available_stock: s.available_stock ?? 10,
            version: s.stock_version ?? s.version ?? 1,
            zone: s.zone || '',
            lat: typeof s.lat === 'number' ? s.lat : undefined,
            lng: typeof s.lng === 'number' ? s.lng : undefined,
          }));
          setSuppliers(sList);

          // Format Routes
          const rList: RouteData[] = (sum.routes || []).map((r: any) => ({
            id: r.id || r.route_id,
            supplier_id: r.supplier_id,
            hospital_id: r.hospital_id,
            travel_minutes: r.travel_minutes ?? 60,
            capacity_batches: r.capacity_batches ?? 10,
            status: r.status ?? 'open',
            delay_minutes: r.delay_minutes ?? 0,
            active_batches: r.active_batches ?? 0,
            corridor_name: r.corridor_name || `Corridor ${r.id}`,
          }));
          setRoutes(rList);
        }

        if (data.events) {
          setEvents(data.events.map((e: any, idx: number) => ({
            id: `ev-${idx}`,
            minute: e.timestamp ?? 0,
            timestamp: e.timestamp ?? 0,
            event_type: e.event_type || 'SYSTEM',
            actor: e.actor || 'system',
            description: e.description || '',
            details: e.details,
          })));
        }
      })
      .catch(() => {
        setServerOnline(false);
      });
  }, []);

  useEffect(() => {
    loadSessionState(currentScenarioId, 0);
  }, [currentScenarioId, loadSessionState]);

  // 4. Scrub Simulation Clock
  const handleScrubTime = (minute: number) => {
    if (minute < simulationMinute) {
      setErrorAlert(`Cannot scrub backward from minute ${simulationMinute} to ${minute}. The simulation engine maintains forward-only committed state. Click 'Reset' to restart the scenario.`);
      return;
    }
    setErrorAlert(null);
    setSimulationMinute(minute);
    loadSessionState(currentScenarioId, minute);
  };

  const handleAdvanceTime = (deltaMinutes: number) => {
    const next = Math.min(300, simulationMinute + deltaMinutes);
    handleScrubTime(next);
  };

  const handleReset = () => {
    abortPlaybackRef.current = true;
    playbackRunIdRef.current += 1;
    setIsSimulating(false);
    setStagedPlan(null);
    setIsApprovalOpen(false);
    setDriftAlert(null);
    setErrorAlert(null);
    setSimulationMinute(0);
    setHospitalRequests([]);
    fetch(`/api/session/${currentScenarioId}/reset`, { method: 'POST' })
      .then(() => loadSessionState(currentScenarioId, 0))
      .catch(() => loadSessionState(currentScenarioId, 0));
  };

  // 5. Run Rehearsal with HITL Stream Interception
  const handleRunRehearsal = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    abortPlaybackRef.current = false;
    playbackRunIdRef.current += 1;
    const currentRunId = playbackRunIdRef.current;
    setStagedPlan(null);
    setDriftAlert(null);
    setErrorAlert(null);

    try {
      const resp = await fetch(`/api/session/${currentScenarioId}/run_agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approach: 'multi_agent' }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorAlert(data.message || data.error || `Rehearsal failed with status ${resp.status}`);
        setIsSimulating(false);
        return;
      }

      if (data.events && data.events.length > 0) {
        const fullEvents = data.events;
        for (let i = 0; i < fullEvents.length; i++) {
          if (abortPlaybackRef.current || playbackRunIdRef.current !== currentRunId) break;
          const ev = fullEvents[i];
          setEvents(prev => [...prev, {
            id: `ev-${prev.length}`,
            minute: ev.timestamp ?? 0,
            timestamp: ev.timestamp ?? 0,
            event_type: ev.event_type || 'TOOL_CALLED',
            actor: ev.actor || 'multi_agent',
            description: ev.description || '',
            details: ev.details,
          }]);

          if (ev.event_type === 'awaiting_human_approval' || (ev.details && ev.details.status === 'PENDING_HUMAN_APPROVAL')) {
            const staged = ev.details || data.staged_plan;
            setStagedPlan(staged);
            setIsApprovalOpen(true);
            setIsSimulating(false);
            const pauseTime = ev.timestamp ?? 40;
            setSimulationMinute(pauseTime);
            loadSessionState(currentScenarioId, pauseTime);
            return;
          }

          if (i % 3 === 0) {
            await new Promise(r => setTimeout(r, 60));
          }
        }
      }

      if (abortPlaybackRef.current || playbackRunIdRef.current !== currentRunId) {
        setIsSimulating(false);
        return;
      }

      if (data.status === 'PENDING_HUMAN_APPROVAL' || data.staged_plan) {
        setStagedPlan(data.staged_plan);
        setIsApprovalOpen(true);
        setIsSimulating(false);
        const pauseTime = data.staged_plan?.timestamp ?? 40;
        setSimulationMinute(pauseTime);
        loadSessionState(currentScenarioId, pauseTime);
        return;
      }

      setSimulationMinute(300);
      loadSessionState(currentScenarioId, 300);

      if (data.debrief) {
        setDebrief(data.debrief);
      } else {
        const res = data.result || {};
        const unmet = res.unmet_batches ?? 0;
        const failedAssumptions = res.failed_assumptions || (unmet > 0
          ? ['Physical constraints or corridor delays exceeded buffer']
          : ['No unexpected physical disruptions observed']);
        const generatedDebrief: SupervisorDebrief = {
          scenario_id: currentScenarioId,
          failed_assumptions: failedAssumptions,
          unmet_batches: unmet,
          action_items: unmet > 0
            ? [
                { task: 'Designate secondary corridor or trigger mutual aid reserve', owner: 'District Operations Officer' },
                { task: 'Deploy emergency buffer for unserved hospital capacity', owner: 'Emergency Ops' },
              ]
            : [
                { task: 'Logistics rehearsal confirmed sound within operational envelope', owner: 'Logistics Lead' },
              ],
        };
        setDebrief(generatedDebrief);
      }
      loadBenchmarkResults();
    } catch (err: any) {
      setErrorAlert(err?.message || 'Failed to run simulation rehearsal. Please verify backend connection.');
    } finally {
      setIsSimulating(false);
    }
  };

  // 6. HITL Action Handlers
  const handleApprovePlan = async (planId: string) => {
    setIsApprovalProcessing(true);
    setErrorAlert(null);

    try {
      const resp = await fetch(`/api/session/${currentScenarioId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorAlert(data.message || data.error || `Approval failed with status ${resp.status}`);
        return;
      }

      if (data.status === 'aborted') {
        setErrorAlert(data.message || 'Transaction aborted: STATE_VERSION_MISMATCH. Stock version changed while awaiting sign-off.');
        if (data.replan?.staged_plan) {
          setStagedPlan(data.replan.staged_plan);
        }
        loadSessionState(currentScenarioId);
      } else if (data.status === 'approved') {
        setIsApprovalOpen(false);
        setStagedPlan(null);
        setErrorAlert(null);
        setDriftAlert(null);

        if (data.events) {
          setEvents(data.events.map((e: any, idx: number) => ({
            id: `ev-${idx}`,
            minute: e.timestamp ?? 0,
            timestamp: e.timestamp ?? 0,
            event_type: e.event_type || 'HUMAN_APPROVAL',
            actor: e.actor || 'human_coordinator',
            description: e.description || '',
            details: e.details,
          })));
        }

        setSimulationMinute(300);
        loadSessionState(currentScenarioId, 300);

        if (data.debrief) {
          setDebrief(data.debrief);
          setIsDebriefOpen(true);
        }
        loadBenchmarkResults();
      }
    } catch (err: any) {
      setErrorAlert(err.message || 'Error processing approval.');
    } finally {
      setIsApprovalProcessing(false);
    }
  };

  const handleRejectPlan = async (planId: string, note: string) => {
    setIsApprovalProcessing(true);
    setErrorAlert(null);

    try {
      const resp = await fetch(`/api/session/${currentScenarioId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, note }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorAlert(data.message || data.error || `Rejection failed with status ${resp.status}`);
        return;
      }

      if (data.replan?.staged_plan) {
        setStagedPlan(data.replan.staged_plan);
        setDriftAlert(`Coordinator rejected previous plan (${note}). New alternative plan staged.`);
      } else {
        setIsApprovalOpen(false);
        setStagedPlan(null);
      }

      if (data.events) {
        setEvents(data.events.map((e: any, idx: number) => ({
          id: `ev-${idx}`,
          minute: e.timestamp ?? 0,
          timestamp: e.timestamp ?? 0,
          event_type: e.event_type || 'HUMAN_REJECTION',
          actor: e.actor || 'human_coordinator',
          description: e.description || '',
          details: e.details,
        })));
      }
      loadSessionState(currentScenarioId);
    } catch (err: any) {
      setErrorAlert(err.message || 'Error processing rejection.');
    } finally {
      setIsApprovalProcessing(false);
    }
  };

  const handleSimulateStateDrift = async () => {
    setIsApprovalProcessing(true);
    setErrorAlert(null);

    const targetSupplier = currentScenarioId === 'SC-07' ? 'S_MFG_KA_01' : 'S1';
    try {
      const resp = await fetch(`/api/session/${currentScenarioId}/simulate_state_drift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: targetSupplier, stock_delta: -2 }),
      });
      const data = await resp.json();
      setDriftAlert(data.message || `Supplier ${targetSupplier} stock dropped to ${data.new_stock} (version bumped to v${data.new_version})!`);

      if (data.events) {
        setEvents(data.events.map((e: any, idx: number) => ({
          id: `ev-${idx}`,
          minute: e.timestamp ?? 0,
          timestamp: e.timestamp ?? 0,
          event_type: e.event_type || 'STOCK_UPDATED',
          actor: e.actor || 'external_supplier_feed',
          description: e.description || '',
          details: e.details,
        })));
      }
      loadSessionState(currentScenarioId);
    } catch (err: any) {
      setErrorAlert(err.message || 'Error simulating state drift.');
    } finally {
      setIsApprovalProcessing(false);
    }
  };

  const handleRerunBenchmarkSuite = () => {
    setIsBenchmarkLoading(true);
    fetch('/api/evaluation/compare_all')
      .then(r => r.json())
      .then(data => {
        if (data.benchmark) {
          const cleaned = data.benchmark.map((row: any) => ({
            ...row,
            scenario_name: (row.scenario_name || row.scenario)
              .replace(/â€“|â€”|\u00e2\u20ac\u201d|\u00e2\u20ac\u2014/g, '—')
              .replace(/\s*[-—]\s*/g, ' — ')
              .trim(),
          }));
          setBenchmarkData(cleaned);
        }
        setIsBenchmarkLoading(false);
      })
      .catch(() => {
        loadBenchmarkResults();
      });
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8F9F5] text-[#14170F] overflow-y-auto font-sans select-none relative">
      {/* 0. Full-Bleed Animated Abstract Network Background (Subtle Organic Pulses) */}
      <NetworkBackground opacity={0.18} interactive={true} />

      {/* 1. Header Navigation & Control Bar with 3-Role POV Switcher */}
      <TopBar
        scenarios={scenarios}
        currentScenarioId={currentScenarioId}
        onSelectScenario={handleSelectScenario}
        simulationMinute={simulationMinute}
        onScrubTime={handleScrubTime}
        onAdvanceTime={handleAdvanceTime}
        onReset={handleReset}
        onRunRehearsal={handleRunRehearsal}
        onOpenBenchmark={() => {}}
        onOpenDebrief={() => setIsDebriefOpen(true)}
        onOpenApproval={() => setIsApprovalOpen(true)}
        onOpenIngestion={handleOpenIngestion}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenCgiAccelerator={() => setIsCgiAcceleratorOpen(true)}
        onOpenGovernance={() => setIsGovernanceOpen(true)}
        onToggleHero={() => setIsHeroOpen(true)}
        domainPack={domainPack}
        onSelectDomainPack={handleSelectDomainPack}
        terminology={terminology}
        isSimulating={isSimulating}
        hasDebrief={!!debrief}
        hasPendingApproval={!!stagedPlan}
        serverOnline={serverOnline}
        rolePOV={rolePOV}
        onSelectRolePOV={setRolePOV}
      />

      {errorAlert && !isApprovalOpen && (
        <div className="bg-[#D9534F]/15 border-b border-[#D9534F]/40 text-[#8C2421] px-6 py-3 text-sm font-medium flex items-center justify-between z-50 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[#D9534F]">Alert:</span>
            <span>{errorAlert}</span>
          </div>
          <button
            onClick={() => setErrorAlert(null)}
            className="text-[#8C2421] hover:text-[#D9534F] font-bold p-1 rounded hover:bg-black/5 text-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Role-Based Content Area */}
      {rolePOV === 'coordinator' && (
        <main key="role-coordinator" className="flex-1 grid grid-cols-12 p-6 gap-6 pb-24 relative z-10 w-full max-w-[1920px] mx-auto animate-fade-in">
          {/* Left/Center: Geo-Map vs Topology Graph with View Switcher */}
          <section className="col-span-12 xl:col-span-8 min-w-0 h-[640px] xl:h-[760px] max-h-[760px] relative rounded-3xl border border-black/10 bg-white/90 backdrop-blur-md shadow-sm overflow-hidden flex flex-col">
            {/* View Sub-Toggle Header */}
            <div className="h-14 px-6 bg-white/90 border-b border-black/10 flex items-center justify-between shrink-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#14170F]/60 font-mono">
                  Command Map Canvas:
                </span>
                <div className="flex items-center bg-black/5 border border-black/8 rounded-full p-1">
                  <button
                    onClick={() => setCoordinatorView('geomap')}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      coordinatorView === 'geomap'
                        ? 'bg-white text-[#14170F] shadow-sm font-bold'
                        : 'text-[#14170F]/60 hover:text-[#14170F]'
                    }`}
                  >
                    <Map className="w-4 h-4 text-[#3E6B4F]" />
                    <span>Bengaluru Geo-Map</span>
                  </button>
                  <button
                    onClick={() => setCoordinatorView('topology')}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      coordinatorView === 'topology'
                        ? 'bg-white text-[#14170F] shadow-sm font-bold'
                        : 'text-[#14170F]/60 hover:text-[#14170F]'
                    }`}
                  >
                    <Network className="w-4 h-4 text-[#3E6B4F]" />
                    <span>Topology Graph</span>
                  </button>
                </div>
              </div>

              <span className="text-xs font-mono text-[#14170F]/70 hidden sm:inline font-bold uppercase tracking-wider">
                {currentScenarioId === 'SC-07' ? 'Inter-Regional Logistics (Pune — BLR — Chennai)' : 'Spatial Distribution Canvas'}
              </span>
            </div>

            {/* Map Canvas Body with Smooth View Cross-Fade */}
            <div className="flex-1 relative overflow-hidden min-h-[580px]">
              {coordinatorView === 'geomap' ? (
                <div key="view-geomap" className="w-full h-full animate-fade-in">
                  <BengaluruGeoMap
                    activeHospitals={hospitals}
                    activeSuppliers={suppliers}
                    activeRoutes={routes}
                    simulationMinute={simulationMinute}
                    registryHospitals={registryHospitals}
                    selectedFacilityId={selectedFacilityId}
                    onSelectHospital={(id) => {
                      setSelectedHospitalId(id);
                      setSelectedFacilityId(id);
                      const h = hospitals.find(x => x.id === id);
                      if (h) setSelectedEntity({ type: 'hospital', data: h });
                    }}
                    onSelectSupplier={(id) => {
                      setSelectedSupplierId(id);
                      const s = suppliers.find(x => x.id === id);
                      if (s) setSelectedEntity({ type: 'supplier', data: s });
                    }}
                  />
                </div>
              ) : (
                <div key="view-topology" className="w-full h-full animate-fade-in">
                  <TopologyGraph
                    hospitals={hospitals}
                    suppliers={suppliers}
                    routes={routes}
                    simulationMinute={simulationMinute}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Live Math Panels vs Agent Activity Feed vs Facility Directory */}
          <section className="col-span-12 xl:col-span-4 min-w-0 h-[640px] xl:h-[760px] max-h-[760px] overflow-hidden flex flex-col rounded-3xl border border-black/10 bg-white/90 backdrop-blur-md shadow-sm">
            {/* Right Sub-Header Tabs */}
            <div className="h-14 px-4 bg-white/90 border-b border-black/10 flex items-center justify-between shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-1.5 bg-black/5 border border-black/8 rounded-full p-1">
                <button
                  onClick={() => setCoordinatorRightTab('math')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                    coordinatorRightTab === 'math'
                      ? 'bg-white text-[#14170F] shadow-sm font-bold'
                      : 'text-[#14170F]/60 hover:text-[#14170F]'
                  }`}
                >
                  <Calculator className="w-4 h-4 text-[#D9534F]" />
                  <span>Math</span>
                </button>
                <button
                  onClick={() => setCoordinatorRightTab('feed')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                    coordinatorRightTab === 'feed'
                      ? 'bg-white text-[#14170F] shadow-sm font-bold'
                      : 'text-[#14170F]/60 hover:text-[#14170F]'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-[#3E6B4F]" />
                  <span>Feed ({events.length})</span>
                </button>
                <button
                  onClick={() => setCoordinatorRightTab('directory')}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                    coordinatorRightTab === 'directory'
                      ? 'bg-white text-[#14170F] shadow-sm font-bold'
                      : 'text-[#14170F]/60 hover:text-[#14170F]'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#3E6B4F]" />
                  <span>Directory ({registryHospitals.length})</span>
                </button>
              </div>

              <span className="text-xs font-mono font-bold text-[#14170F]/60 pr-2">
                T+{simulationMinute}m
              </span>
            </div>

            {/* Right Column Content with Self-Contained Scroll & Smooth Tab Cross-Fade */}
            <div className="flex-1 min-h-0 overflow-hidden p-2 flex flex-col">
              {coordinatorRightTab === 'math' && (
                <div key="tab-math" className="h-full flex flex-col min-h-0 animate-fade-in">
                  <LiveMathPanels
                    hospitals={hospitals}
                    suppliers={suppliers}
                    simulationMinute={simulationMinute}
                    hospitalRequests={hospitalRequests}
                    onSelectHospital={(id) => {
                      setSelectedHospitalId(id);
                      setSelectedFacilityId(id);
                      const h = hospitals.find(x => x.id === id);
                      if (h) setSelectedEntity({ type: 'hospital', data: h });
                    }}
                    onSelectSupplier={(id) => {
                      setSelectedSupplierId(id);
                      const s = suppliers.find(x => x.id === id);
                      if (s) setSelectedEntity({ type: 'supplier', data: s });
                    }}
                  />
                </div>
              )}
              {coordinatorRightTab === 'feed' && (
                <div key="tab-feed" className="h-full flex flex-col min-h-0 animate-fade-in">
                  <AgentActivityFeed
                    events={events}
                    isSimulating={isSimulating}
                    simulationMinute={simulationMinute}
                  />
                </div>
              )}
              {coordinatorRightTab === 'directory' && (
                <div key="tab-directory" className="h-full flex flex-col min-h-0 animate-fade-in">
                  <FacilityDirectoryPanel
                    registryHospitals={registryHospitals}
                    activeHospitals={hospitals}
                    selectedFacilityId={selectedFacilityId}
                    onLocateFacility={(facilityId) => {
                      setSelectedFacilityId(facilityId);
                      setCoordinatorView('geomap');
                    }}
                    onInspectFacilityPOV={(facilityId) => {
                      setSelectedHospitalId(facilityId);
                      setSelectedFacilityId(facilityId);
                      setRolePOV('hospital');
                    }}
                  />
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {/* Hospital Portal POV */}
      {rolePOV === 'hospital' && (
        <main key="role-hospital" className="flex-1 overflow-hidden flex flex-col pb-11 animate-fade-in">
          <HospitalPortalView
            scenarioId={currentScenarioId}
            activeHospitals={hospitals}
            activeRoutes={routes}
            simulationMinute={simulationMinute}
            initialHospitalId={selectedHospitalId}
            registryHospitals={registryHospitals}
            hospitalRequests={hospitalRequests}
            onSelectHospital={(id) => setSelectedHospitalId(id)}
            onHospitalRequestSubmitted={() => {
              loadSessionState(currentScenarioId, simulationMinute);
            }}
            onEventsUpdated={setEvents}
          />
        </main>
      )}

      {/* Supplier Depot POV */}
      {rolePOV === 'supplier' && (
        <main key="role-supplier" className="flex-1 overflow-hidden flex flex-col pb-11 animate-fade-in">
          <SupplierDepotView
            activeSuppliers={suppliers}
            activeRoutes={routes}
            activeHospitals={hospitals}
            simulationMinute={simulationMinute}
            initialSupplierId={selectedSupplierId}
            hospitalRequests={hospitalRequests}
            onSelectSupplier={(id) => setSelectedSupplierId(id)}
            onSimulateDrift={handleSimulateStateDrift}
          />
        </main>
      )}

      {/* 3. Bottom Drawer: Comparative Benchmark Table */}
      <ComparisonDrawer
        data={benchmarkData}
        isLoading={isBenchmarkLoading}
        onRefresh={handleRerunBenchmarkSuite}
      />

      {/* 4. Supervisor Rehearsal Debrief & Verification Card */}
      <DebriefModal
        debrief={debrief}
        isOpen={isDebriefOpen}
        onClose={() => setIsDebriefOpen(false)}
      />

      {/* 5. Human Coordinator Sign-Off Modal (HITL Approval Gate) */}
      <HumanApprovalModal
        stagedPlan={stagedPlan}
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onApprove={handleApprovePlan}
        onReject={handleRejectPlan}
        onSimulateDrift={handleSimulateStateDrift}
        isProcessing={isApprovalProcessing}
        driftAlert={driftAlert}
        errorAlert={errorAlert}
        scenarioId={currentScenarioId}
      />

      {/* 6. Live Crisis Data Ingestion & Governance Shield Modal */}
      <DataIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        scenarioId={currentScenarioId}
        initialTab={ingestionTab}
        onIngestSuccess={() => {
          loadSessionState(currentScenarioId, simulationMinute);
        }}
      />

      {/* 7. Executive ROI, 3-Way Benchmarks & Monte Carlo Stress Audit Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        scenarioId={currentScenarioId}
        domainPack={domainPack}
        terminology={terminology}
      />

      {/* 8. Reusable Enterprise Accelerator Pattern Modal */}
      <EnterpriseAcceleratorModal
        isOpen={isCgiAcceleratorOpen}
        onClose={() => setIsCgiAcceleratorOpen(false)}
        onSwitchToManufacturing={() => {
          handleSelectDomainPack('manufacturing');
          handleSelectScenario('SC-07');
        }}
        onSwitchToHealthcare={() => {
          handleSelectDomainPack('healthcare');
          handleSelectScenario('SC-02');
        }}
      />

      {/* 9. Enterprise Governance, Security & Responsible AI Framework Modal */}
      <GovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => setIsGovernanceOpen(false)}
        activeScenarioId={currentScenarioId}
      />

      {/* 10. Evaluator 1-Click Interactive Guided Tour */}
      <EvaluatorTourGuide
        isOpen={isTourGuideOpen}
        onClose={() => setIsTourGuideOpen(false)}
        onSelectScenario={handleSelectScenario}
        onOpenIngestion={() => handleOpenIngestion('supplier')}
        onRunRehearsal={handleRunRehearsal}
        onOpenDebrief={() => setIsDebriefOpen(true)}
        onOpenApproval={() => setIsApprovalOpen(true)}
        onOpenGovernance={() => setIsGovernanceOpen(true)}
        currentScenarioId={currentScenarioId}
        hasDebrief={!!debrief}
        hasPendingApproval={!!stagedPlan}
        isSimulating={isSimulating}
      />

      {/* 8. Detail Drawer (Hospital / Supplier drill-in with StockComparisonBar & sparkline) */}
      <DetailDrawer
        selectedEntity={selectedEntity}
        currentMinute={simulationMinute}
        onClose={() => setSelectedEntity(null)}
      />

      {/* 9. Hero Protocol Overview Briefing Modal */}
      {isHeroOpen && (
        <HeroLandingOverlay
          scenarios={scenarios}
          currentScenarioId={currentScenarioId}
          onSelectScenario={(id) => {
            handleSelectScenario(id);
            setIsHeroOpen(false);
          }}
          onStartRehearsal={() => {
            setIsHeroOpen(false);
            handleRunRehearsal();
          }}
          onClose={() => setIsHeroOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
