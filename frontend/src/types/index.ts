export type SystemStatus = 'FEASIBLE' | 'AT RISK' | 'INFEASIBLE' | 'PENDING' | 'REJECTED';

export type RolePOV = 'coordinator' | 'hospital' | 'supplier';
export type CoordinatorViewMode = 'geomap' | 'topology';
export type DomainPack = 'healthcare' | 'manufacturing';

export interface DomainTerminology {
  facilityLabel: string;
  facilitySingle: string;
  resourceBatch: string;
  resourceUnit: string;
  bufferLabel: string;
  leadRole: string;
  supplierLabel: string;
  supplierSingle: string;
  depotTitle: string;
  platformSubtitle: string;
}

export const DOMAIN_TERMINOLOGY: Record<DomainPack, DomainTerminology> = {
  healthcare: {
    facilityLabel: "Hospitals",
    facilitySingle: "Hospital",
    resourceBatch: "Oxygen Batches",
    resourceUnit: "batches",
    bufferLabel: "Cryogenic Buffer",
    leadRole: "Hospital Nodal Officer",
    supplierLabel: "Suppliers",
    supplierSingle: "Supplier",
    depotTitle: "Liquid Oxygen Depot",
    platformSubtitle: "Crisis Logistics Platform",
  },
  manufacturing: {
    facilityLabel: "Assembly Plants",
    facilitySingle: "Assembly Plant",
    resourceBatch: "Wafer Lots",
    resourceUnit: "lots",
    bufferLabel: "Silicon Buffer",
    leadRole: "Plant Logistics Controller",
    supplierLabel: "Wafer Hubs",
    supplierSingle: "Wafer Hub",
    depotTitle: "Chip Packaging Depot",
    platformSubtitle: "JIT Supply Chain Accelerator",
  },
};

export interface RegistryHospital {
  id: string;
  scenario_id?: string;
  scenarioId?: string;
  name: string;
  zone: string;
  address: string;
  lat: number;
  lng: number;
  bed_count: number;
  icu_beds: number;
  daily_consumption_batches: number;
  oxygen_buffer_hours: number;
  status: string;
  nodal_officer: string;
  phone: string;
  type: string;
}

export interface RegistrySupplier {
  id: string;
  name: string;
  zone: string;
  address: string;
  lat: number;
  lng: number;
  cryo_capacity_batches: number;
  fleet_count: number;
  dispatch_manager: string;
  phone: string;
}

export interface ScenarioMeta {
  id: string;
  filename: string;
  name: string;
  description: string;
  hospitals_count: number;
  suppliers_count: number;
  routes_count: number;
  total_demand: number;
  total_supply: number;
}

export interface HospitalRequest {
  request_id: string;
  scenario_id: string;
  hospital_id: string;
  hospital_name: string;
  resource_type: string;
  quantity_batches: number;
  deadline_minutes: number;
  priority: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  notes?: string;
  status: 'SUBMITTED' | 'ALLOCATING' | 'PENDING_APPROVAL' | 'ALLOCATED' | 'FULFILLED' | 'REJECTED';
  created_at_minute: number;
  allocated_batches: number;
  fulfilled_at_minute?: number | null;
  supplier_allocations?: Array<{
    supplier_id: string;
    route_id: string;
    quantity: number;
  }>;
}

export interface HospitalData extends Record<string, unknown> {
  id: string;
  name: string;
  requested_batches: number;
  seeded_batches?: number;
  submitted_batches?: number;
  deadline_minutes: number;
  allocated_batches?: number;
  on_hand?: number;
  received?: number;
  unmet?: number;
  status?: 'optimal' | 'warning' | 'critical';
  zone?: string;
  lat?: number;
  lng?: number;
  burn_rate?: number;
  min_reserve?: number;
  hospital_requests?: HospitalRequest[];
}

export interface SupplierData extends Record<string, unknown> {
  id: string;
  name: string;
  confirmed_stock: number;
  available_stock: number;
  reported_stock?: number;
  reserved_stock?: number;
  version: number;
  active_reservations_count?: number;
  zone?: string;
  lat?: number;
  lng?: number;
}

export interface RouteData extends Record<string, unknown> {
  id: string;
  supplier_id: string;
  hospital_id: string;
  travel_minutes: number;
  capacity_batches: number;
  status: 'open' | 'delayed' | 'blocked';
  delay_minutes: number;
  active_batches?: number;
  corridor_name?: string;
}

export interface EventLogEntry {
  id?: string;
  minute: number;
  timestamp: number;
  event_type: string;
  actor: string;
  description: string;
  details?: Record<string, any>;
  verification_status?: string;
  rejection_reason?: string;
  is_stale?: boolean;
}

export interface BenchmarkRow {
  scenario: string;
  scenario_name: string;
  fixed_rules: {
    tool_calls: number;
    invalid_proposals: number;
    unmet_batches: number;
    runtime_ms?: number;
  };
  single_agent: {
    tool_calls: number;
    invalid_proposals: number;
    unmet_batches: number;
    runtime_ms?: number;
  };
  multi_agent: {
    tool_calls: number;
    invalid_proposals: number;
    unmet_batches: number;
    runtime_ms?: number;
  };
}

export interface SupervisorDebrief {
  scenario_id: string;
  scenario_name?: string;
  status?: string;
  failed_assumptions: string[];
  unmet_batches: number;
  action_items: Array<{
    task: string;
    owner: string;
  }>;
  prevented_failures?: string[];
  root_causes?: string[];
}

export interface StagedDelivery {
  supplier_id: string;
  supplier_name: string;
  hospital_id: string;
  hospital_name: string;
  route_id: string;
  quantity: number;
  unit: string;
  eta_minutes: number;
  deadline_minutes: number;
  margin_minutes: number;
  plan_version: number;
  route_status: string;
  route_capacity: number;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface StagedPlan {
  plan_id: string;
  status: string;
  allocations: Array<{
    supplier_id: string;
    hospital_id: string;
    route_id: string;
    quantity: number;
    plan_version: number;
  }>;
  expected_stock_versions: Record<string, number>;
  checks: VerificationCheck[];
  deliveries: StagedDelivery[];
  timestamp?: number;
  summary?: string;
}

export interface StressAuditResult {
  total_simulations: number;
  successful_runs: number;
  failed_runs: number;
  resilience_score_pct: number;
  primary_bottleneck: string;
  sla_recommendation: string;
  runtime_ms: number;
  run_results: Array<{
    run_id: number;
    passed: boolean;
    unmet_batches: number;
    stock_drop_pct: number;
    perturbed_supplier: string;
    route_delay_mins: number;
    delayed_route_ids: string[];
    bottleneck: string;
  }>;
  bottleneck_breakdown: Record<string, number>;
}

