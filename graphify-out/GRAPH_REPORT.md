# Graph Report - REACT  (2026-10-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 846 nodes · 2275 edges · 45 communities (16 shown, 29 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 291 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- simulator.py
- App.tsx
- EvidenceStore
- package.json
- EventLog
- SimulationEngine
- ConstraintVerifier
- ToolGateway
- RehearsalSupervisor
- routes.py
- TestFoundation
- Route
- AllocationEntry
- ingest_preview
- Reservation
- compilerOptions
- .reserve_allocation
- server.py
- InventoryManager
- HospitalStock
- get_or_create_session
- RunMetrics
- ._assess_deterministic
- ingestion.py
- test_hospital_requests.py
- models/__init__.py
- SupplyAgent
- run_monte_carlo_stress_audit
- resolve_scenario_file
- approve_plan
- VerificationResult
- get_session_state
- TestIntegrationStability
- compilerOptions
- ReactApiHandler
- TestEndToEndWorkflow
- ExpectedInvariant

## God Nodes (most connected - your core abstractions)
1. `SimulationEngine` - 110 edges
2. `ReservationService` - 74 edges
3. `ToolGateway` - 57 edges
4. `load_scenario()` - 46 edges
5. `RehearsalSupervisor` - 43 edges
6. `AllocationEntry` - 42 edges
7. `AgentIdentity` - 40 edges
8. `ConstraintVerifier` - 33 edges
9. `MultiAgentSystem` - 28 edges
10. `EventType` - 26 edges

## Surprising Connections (you probably didn't know these)
- `RehearsalSupervisor` --uses--> `EventType`  [INFERRED]
  backend/agents/supervisor.py → backend/models/events.py
- `ToolGateway` --uses--> `EventType`  [INFERRED]
  backend/agents/tools.py → backend/models/events.py
- `ingest_confirm()` --uses--> `EventType`  [INFERRED]
  backend/api/routes.py → backend/models/events.py
- `ingest_preview()` --uses--> `EventType`  [INFERRED]
  backend/api/routes.py → backend/models/events.py
- `ReservationService` --uses--> `EventType`  [INFERRED]
  backend/engine/reservation.py → backend/models/events.py

## Import Cycles
- None detected.

## Communities (45 total, 29 thin omitted)

### Community 0 - "simulator.py"
Cohesion: 0.07
Nodes (7): SupplyFeasibilityReport, EventType, EvidenceType, VerificationState, ResourceState, EventType, RouteStatus

### Community 1 - "App.tsx"
Cohesion: 0.08
Nodes (64): App(), DEFAULT_SCENARIOS, AgentActivityFeed(), AgentActivityFeedProps, AnalyticsModal(), AnalyticsModalProps, BengaluruGeoMap(), BengaluruGeoMapProps (+56 more)

### Community 2 - "EvidenceStore"
Cohesion: 0.06
Nodes (3): Evidence, EvidenceStore, ScenarioEvent

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (39): dependencies, clsx@^2.1.1, leaflet@^1.9.4, lucide-react@^0.475.0, react@^18.3.1, react-dom@^18.3.1, tailwind-merge@^2.6.0, @types/leaflet@^1.9.22 (+31 more)

### Community 5 - "SimulationEngine"
Cohesion: 0.16
Nodes (9): FixedRulesBaseline, MultiAgentSystem, SingleAgent, run_evaluation_benchmark(), ReservationService, SimulationEngine, evaluate_approach(), load_scenario() (+1 more)

### Community 7 - "ToolGateway"
Cohesion: 0.20
Nodes (5): FacilityAgent, AgentIdentity, ToolGateway, ToolResult, ToolSpec

### Community 8 - "RehearsalSupervisor"
Cohesion: 0.13
Nodes (3): RehearsalSupervisor, TestHumanInTheLoop, TestRehearsalSupervisor

### Community 9 - "routes.py"
Cohesion: 0.14
Nodes (11): advance_session_clock(), AdvanceClockRequest, get_or_create_session(), ingest_confirm(), IngestConfirmRequest, IngestPreviewRequest, run_agent_simulation(), simulate_state_drift() (+3 more)

### Community 13 - "ingest_preview"
Cohesion: 0.12
Nodes (3): ingest_preview(), GovernanceShield, TestIngestionAndGovernance

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 21 - "RunMetrics"
Cohesion: 0.15
Nodes (5): RunMetrics, main(), print_comparison_table(), run_all_benchmarks(), save_results()

### Community 23 - "ingestion.py"
Cohesion: 0.23
Nodes (4): _extract_deterministic(), extract_supplier_message(), _extract_with_gemini(), parse_hospital_csv()

### Community 25 - "models/__init__.py"
Cohesion: 0.14
Nodes (3): Hospital, Supplier, SupplierResponse

### Community 31 - "approve_plan"
Cohesion: 0.22
Nodes (4): approve_plan(), PlanApprovalRequest, reject_staged_plan(), RejectPlanRequest

### Community 33 - "get_session_state"
Cohesion: 0.22
Nodes (4): get_benchmarks_summary(), get_bengaluru_registry(), get_session_state(), list_scenarios()

### Community 35 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

## Knowledge Gaps
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulationEngine` connect `SimulationEngine` to `simulator.py`, `EvidenceStore`, `EventLog`, `ConstraintVerifier`, `ToolGateway`, `RehearsalSupervisor`, `routes.py`, `TestFoundation`, `Route`, `ingest_preview`, `.reserve_allocation`, `server.py`, `InventoryManager`, `HospitalStock`, `get_or_create_session`, `test_hospital_requests.py`, `.state_summary`, `run_monte_carlo_stress_audit`, `approve_plan`, `get_session_state`, `.compute_arrival`, `ReactApiHandler`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Are the 35 inferred relationships involving `SimulationEngine` (e.g. with `FixedRulesBaseline` and `MultiAgentSystem`) actually correct?**
  _`SimulationEngine` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Should `simulator.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06832298136645963 - nodes in this community are weakly interconnected._
- **Why does `ReservationService` connect `SimulationEngine` to `simulator.py`, `ReactApiHandler`, `ConstraintVerifier`, `ToolGateway`, `RehearsalSupervisor`, `routes.py`, `TestFoundation`, `AllocationEntry`, `.reserve_allocation`, `server.py`, `get_or_create_session`, `test_hospital_requests.py`, `run_monte_carlo_stress_audit`, `approve_plan`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `ReservationService` (e.g. with `FixedRulesBaseline` and `MultiAgentSystem`) actually correct?**
  _`ReservationService` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0774281805745554 - nodes in this community are weakly interconnected._
- **Why does `RehearsalSupervisor` connect `RehearsalSupervisor` to `simulator.py`, `SimulationEngine`, `ConstraintVerifier`, `ToolGateway`, `ReactApiHandler`, `routes.py`, `AllocationEntry`, `server.py`, `SupplyAgent`, `approve_plan`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._