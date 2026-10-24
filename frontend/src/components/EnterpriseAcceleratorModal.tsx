import React from 'react';
import {
  X,
  Layers,
  Building2,
  Cpu,
  Truck,
  Shield,
  Download,
  CheckCircle2,
  ArrowRight,
  Server,
  Zap,
  Globe2,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EnterpriseAcceleratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToManufacturing?: () => void;
  onSwitchToHealthcare?: () => void;
}

export const EnterpriseAcceleratorModal: React.FC<EnterpriseAcceleratorModalProps> = ({
  isOpen,
  onClose,
  onSwitchToManufacturing,
  onSwitchToHealthcare,
}) => {
  if (!isOpen) return null;

  const handleDownloadBlueprint = () => {
    const blueprintContent = `# Enterprise Delivery Pattern: Autonomous Invariant Allocation Pattern (AIAP)
## Reference Architecture & Cross-Industry Deployment Specification

### 1. Executive Summary
The Autonomous Invariant Allocation Pattern (AIAP) is a repeatable enterprise solution asset engineered for high-consequence supply chain orchestration, disaster response, and just-in-time manufacturing logistics.

### 2. The Core Problem
Conventional enterprise resource planning (ERP) systems and static Linear Programming (LP) solvers are brittle to real-world chaos:
- Unstructured, ambiguous communication (field SMS, phone calls, dispatch memos).
- Fast-moving disruptions (flash floods, route washouts, supplier diversion).
- High-consequence safety requirements where algorithmic hallucination or overcommitment results in catastrophic loss of life or multi-crore asset scrap.

### 3. Neuro-Symbolic Architecture
AIAP couples probabilistic AI with deterministic formal verification:
- **Cognitive Layer**: Google Gemini Multi-Agent System (Facility Agents, Supplier Agents, Rehearsal Supervisor) negotiates under ambiguity.
- **Symbolic Gate**: Deterministic Invariant Verifier enforces mathematical conservation of assets:
  A_s = Q_s - sum(q_r) >= 0  AND  ETA_r <= Deadline_h
- **Governance Gate**: Optimistic Concurrency Control (OCC) version locking (v_plan == v_stock) and ToolGateway Role-Based Access Control (RBAC).
- **Human-in-the-Loop**: Coordinator cryptographic approval gate.

### 4. Cross-Industry Reusability Matrix
1. **Healthcare & Life Sciences**: Liquid medical oxygen, blood bank logistics, cold-chain vaccines under climate disruptions.
2. **Advanced High-Tech Manufacturing**: Cryogenic purge gases (argon/nitrogen), EUV wafer chemicals, precision silicon supply.
3. **Retail & FMCG Cold Chain**: Perishable produce, cold storage distribution centers, emergency bypass routing.
4. **Energy & Emergency Utilities**: Grid transformer replacement, diesel generator deployment during regional blackouts.

### 5. Enterprise Integration Connectors
- **SAP S/4HANA**: OData / BAPI material document reservations.
- **Oracle SCM Cloud**: Inventory reservation webhooks.
- **Epic / Cerner Healthcare EHR**: HL7 / FHIR inventory consumption feeds.
- **GIS / Telematics**: Leaflet, Esri ArcGIS, and OpenStreetMap GPS integration.

© 2026 Enterprise Delivery Pattern Specification.
`;

    const blob = new Blob([blueprintContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Enterprise_Autonomous_Invariant_Allocation_Pattern_Blueprint.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const verticals = [
    {
      id: 'healthcare',
      title: 'Healthcare & Disaster Response',
      icon: <Building2 className="w-6 h-6 text-emerald-700" />,
      tag: 'LIVE DRILL (SC-01 to SC-06)',
      desc: 'Liquid medical oxygen, emergency blood products, and vaccine cold chain triage across regional hospital networks.',
      kpis: ['Zero ward hypoxia incidents', '100% Invariant adherence', '18s coordination vs 4h manual war room'],
      active: true,
      onAction: onSwitchToHealthcare,
      actionLabel: 'Load Healthcare Scenarios',
    },
    {
      id: 'manufacturing',
      title: 'Advanced Semiconductor JIT',
      icon: <Cpu className="w-6 h-6 text-amber-700" />,
      tag: 'LIVE DRILL (SC-07)',
      desc: 'High-purity argon/nitrogen purge gases, photolithography chemicals, and silicon wafer stock for high-density cleanroom fabs.',
      kpis: ['₹40 Crore wafer scrap loss prevented', 'Zero thermal runway risk', 'Positive tool purge pressure sustained'],
      active: true,
      onAction: onSwitchToManufacturing,
      actionLabel: 'Load Semiconductor Scenario',
    },
    {
      id: 'coldchain',
      title: 'Retail & Cold-Chain FMCG',
      icon: <Truck className="w-6 h-6 text-sky-700" />,
      tag: 'REPEATABLE PATTERN READY',
      desc: 'Perishable foods, temperature-sensitive pharmaceuticals, and regional distribution center balancing during transit culvert floods.',
      kpis: ['32% transit distance reduction', 'Zero spoilage from expired transit windows', 'Automated detour rerouting'],
      active: false,
    },
    {
      id: 'defense',
      title: 'Emergency Energy & Defense Logistics',
      icon: <Globe2 className="w-6 h-6 text-purple-700" />,
      tag: 'ENTERPRISE EXTENSION',
      desc: 'Emergency mobile fuel depots, heavy grid substation transformers, and tactical disaster relief staging across civil defense sectors.',
      kpis: ['Decentralized peer-to-peer depot quorum', 'Zero phantom dispatches', 'Optimistic Concurrency Control across air drops'],
      active: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#F8F9F5] border-2 border-black/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#14170F]">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/10 bg-white/95 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#8FD13F]/20 text-[#2D5A1E] border border-[#8FD13F]/40 shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-black text-[#14170F] uppercase tracking-wide">
                  Enterprise Accelerator Architecture Pattern
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold border border-emerald-300">
                  AIAP Pattern v2.4
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-black/5 text-[#14170F] font-mono font-bold border border-black/10">
                  Cross-Industry Asset
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#14170F]/70 mt-1">
                Repeatable enterprise delivery pattern for high-consequence resource contention and autonomous coordination.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadBlueprint}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-black/5 text-[#14170F] border border-black/15 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
              title="Download Reference Architecture Specification (Markdown)"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Export Architecture Blueprint</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#14170F]/60 hover:text-[#14170F] rounded-xl hover:bg-black/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans text-sm text-[#14170F]">
          {/* Section 1: Executive Architectural Overview */}
          <div className="p-5 rounded-2xl bg-white border border-black/10 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-black/5 pb-2.5 gap-2">
              <span className="font-black text-[#14170F] uppercase tracking-wide text-xs sm:text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-700" />
                Why This Is A Repeatable Enterprise Client Accelerator
              </span>
              <span className="text-xs font-mono font-bold text-[#14170F]/60 bg-black/5 px-2.5 py-0.5 rounded-md">
                Core IP: Neuro-Symbolic Invariant Gate
              </span>
            </div>
            <p className="text-[#14170F]/80 text-xs sm:text-sm leading-relaxed">
              Enterprise clients in high-stakes sectors cannot deploy pure GenAI chatbots because LLMs hallucinate numbers and fail mathematical conservation laws. Simultaneously, classical Linear Programming (LP) solvers fail because field intelligence arrives as unstructured radio chatter, ambiguous phone transcripts, and unexpected route delays.
            </p>
            <p className="text-[#14170F]/80 text-xs sm:text-sm leading-relaxed">
              The <strong className="text-[#14170F] font-bold">Autonomous Invariant Allocation Pattern (AIAP)</strong> decouples the intelligence layer (multi-agent qualitative negotiation) from the safety verification layer (7 deterministic mathematical invariants). The same core engine deploys horizontally across healthcare, semiconductor manufacturing, FMCG, and disaster logistics without touching backend solver logic.
            </p>
          </div>

          {/* Section 2: 4-Industry Cross-Domain Matrix */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-[#14170F] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-700" />
                Cross-Industry Horizontal Deployment Showcase
              </h4>
              <span className="text-xs font-mono font-bold text-[#14170F]/60">
                Validated Across 4 Enterprise Verticals
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {verticals.map((v) => (
                <div
                  key={v.id}
                  className="p-5 rounded-2xl bg-white border border-black/10 hover:border-black/25 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-black/5 border border-black/10">
                          {v.icon}
                        </div>
                        <div>
                          <h5 className="font-black text-[#14170F] text-sm sm:text-base">
                            {v.title}
                          </h5>
                          <span className={cn(
                            "text-xs font-mono font-bold px-2 py-0.5 rounded-md uppercase mt-1 inline-block",
                            v.active ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-black/5 text-[#14170F]/60 border border-black/10"
                          )}>
                            {v.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#14170F]/70 leading-relaxed mb-3">
                      {v.desc}
                    </p>
                    <div className="space-y-1.5 bg-[#F8F9F5] p-3 rounded-xl border border-black/10">
                      <span className="text-xs font-mono text-[#14170F]/60 uppercase block font-bold">
                        Measurable Enterprise Outcomes:
                      </span>
                      {v.kpis.map((kpi, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#14170F]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>{kpi}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {v.onAction && (
                    <button
                      onClick={() => {
                        v.onAction?.();
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <span>{v.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 text-[#14170F]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Enterprise Integration Blueprint */}
          <div className="p-5 rounded-2xl bg-white border border-black/10 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
              <span className="font-black text-[#14170F] uppercase tracking-wide text-xs sm:text-sm flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-700" />
                Enterprise Integration Connectors (Turnkey Architecture)
              </span>
              <span className="text-xs font-mono text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 font-bold">
                Standards-Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-1.5">
                <span className="font-mono text-xs text-amber-800 uppercase font-black block">
                  ERP & SCM Connectors
                </span>
                <p className="text-sm font-bold text-[#14170F]">
                  SAP S/4HANA & Oracle SCM
                </p>
                <p className="text-xs text-[#14170F]/70 leading-relaxed">
                  Direct BAPI and OData connectors stage warehouse stock reservations into SAP without manual intervention.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-1.5">
                <span className="font-mono text-xs text-emerald-800 uppercase font-black block">
                  Healthcare & Life Sciences
                </span>
                <p className="text-sm font-bold text-[#14170F]">
                  Epic / Cerner EHR (FHIR/HL7)
                </p>
                <p className="text-xs text-[#14170F]/70 leading-relaxed">
                  Real-time ICU ward telemetry and oxygen consumption burn rates stream via standard HL7 v2 and FHIR APIs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-1.5">
                <span className="font-mono text-xs text-sky-800 uppercase font-black block">
                  Spatial Telematics & IoT
                </span>
                <p className="text-sm font-bold text-[#14170F]">
                  Esri ArcGIS & OpenStreetMap
                </p>
                <p className="text-xs text-[#14170F]/70 leading-relaxed">
                  Dynamic transit corridor monitoring recalculates truck traversal times as flood sensors trigger road closures.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-black/10 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#14170F]/80 font-medium">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>Ready for executive showcase and enterprise client RFP delivery.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] font-black text-xs sm:text-sm transition-colors shadow-sm"
          >
            Close Accelerator Showcase
          </button>
        </div>
      </div>
    </div>
  );
};
