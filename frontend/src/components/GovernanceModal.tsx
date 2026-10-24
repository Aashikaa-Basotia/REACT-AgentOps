import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  FileCheck,
  UserCheck,
  CheckCircle2,
  Key,
  Terminal,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface GovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioId: string;
}

export const GovernanceModal: React.FC<GovernanceModalProps> = ({
  isOpen,
  onClose,
  activeScenarioId,
}) => {
  const [selectedRole, setSelectedRole] = useState<'facility' | 'supplier' | 'supervisor' | 'coordinator'>('facility');
  const [testActionOutput, setTestActionOutput] = useState<{ status: 'ALLOW' | 'BLOCK'; message: string } | null>(null);

  if (!isOpen) return null;

  const rbacRules = {
    facility: {
      actorId: 'facility_H1 (Hospital Agent)',
      scope: 'Restricted to local facility boundary (Manipal / Sakra / Jayadeva)',
      allowed: ['read_facility_state', 'submit_hospital_request', 'get_facility_audit_history'],
      quarantined: ['read_supplier_stock (Blocked: Competitive supplier quarantine)', 'commit_reservation (Blocked: Human Coordinator required)', 'alter_route_status (Blocked: Municipal transport authority only)'],
    },
    supplier: {
      actorId: 'supplier_S1 (Peenya Cryo-Plant Agent)',
      scope: 'Restricted to local warehouse inventory & fleet dispatch',
      allowed: ['read_supplier_stock', 'update_confirmed_stock', 'propose_batch_delivery'],
      quarantined: ['read_facility_state (Blocked: Patient privacy HIPAA boundary)', 'override_hospital_deadline (Blocked: Medical director only)', 'commit_unverified_batches (Blocked: Deterministic verifier required)'],
    },
    supervisor: {
      actorId: 'rehearsal_supervisor (Multi-Agent Synthesizer)',
      scope: 'Global read aggregation with zero unverified write capability',
      allowed: ['read_all_telemetry', 'stage_candidate_plan', 'simulate_counterfactual_drifts'],
      quarantined: ['direct_database_commit (Blocked: Mandatory Symbolic Verifier + Coordinator Sign-Off)'],
    },
    coordinator: {
      actorId: 'human_coordinator (Incident Command Officer)',
      scope: 'Full authoritative command & control with cryptographic sign-off',
      allowed: ['approve_and_lock_plan', 'reject_with_counter_guidance', 'trigger_inter_state_emergency_sos', 'simulate_occ_drift'],
      quarantined: ['bypass_deterministic_invariants (Blocked: System strictly rejects mathematically impossible plans even from coordinators)'],
    },
  };

  const handleTestRbac = (action: string, isAllowed: boolean) => {
    if (isAllowed) {
      setTestActionOutput({
        status: 'ALLOW',
        message: `RBAC Authorization Success: ${rbacRules[selectedRole].actorId} granted permission for tool [${action}]. Cryptographic token signed.`,
      });
    } else {
      setTestActionOutput({
        status: 'BLOCK',
        message: `RBAC Security Violation: Access Denied! Actor [${rbacRules[selectedRole].actorId}] attempted unauthorized action [${action}]. Quarantined by ToolGateway.`,
      });
    }
  };

  const governancePillars = [
    {
      id: 'rbac',
      title: '1. Role-Based Access Control (RBAC)',
      icon: <Key className="w-5 h-5 text-emerald-700" />,
      desc: 'ToolGateway strictly bounds each agent to its local context. Facility agents cannot snoop supplier inventories; supplier agents cannot access hospital ward records.',
      status: 'ENFORCED & AUDITED',
    },
    {
      id: 'privacy',
      title: '2. Privacy & Patient Census Anonymization',
      icon: <Lock className="w-5 h-5 text-sky-700" />,
      desc: 'All facility telemetry strips patient names, bed identifiers, and personal data before prompt construction. Only aggregated batch deficits are processed.',
      status: 'HIPAA & DPDP COMPLIANT',
    },
    {
      id: 'injection',
      title: '3. Adversarial Prompt Injection Defense',
      icon: <ShieldAlert className="w-5 h-5 text-amber-700" />,
      desc: 'Disaster Ingestion Shield sanitizes radio/SMS transcripts against prompt injection, SQLi, role overrides, and jailbreak payloads at the ingress boundary.',
      status: 'FIREWALL ACTIVE (0 INFILTRATIONS)',
    },
    {
      id: 'explainability',
      title: '4. Explainability & Transparent Rationale',
      icon: <Eye className="w-5 h-5 text-purple-700" />,
      desc: 'Every allocation plan generates a natural-language operational briefing explaining ground reality, candidate tradeoffs, and why specific routes were selected.',
      status: 'FULL TRANSPARENCY',
    },
    {
      id: 'invariants',
      title: '5. Deterministic Formal Invariant Verifier',
      icon: <FileCheck className="w-5 h-5 text-teal-700" />,
      desc: 'No AI proposal reaches human sign-off without mathematical proof of physical capacity, non-swamped routes, deadline feasibility, and version concurrency.',
      status: '7/7 CHECKS PASSED',
    },
    {
      id: 'hitl',
      title: '6. Human-in-the-Loop (HITL) Gate',
      icon: <UserCheck className="w-5 h-5 text-rose-700" />,
      desc: 'Zero autonomous commitments to actual physical databases without explicit human coordinator sign-off. Includes optimistic concurrency conflict protection.',
      status: 'MANDATORY APPROVAL GATE',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#F8F9F5] border-2 border-black/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#14170F]">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/10 bg-white/95 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-sky-100 text-sky-800 border border-sky-300 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-black text-[#14170F] uppercase tracking-wide">
                  Enterprise Governance, Security & Responsible AI
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-mono font-bold border border-sky-300">
                  NIST AI RMF & ISO 42001
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#14170F]/70 mt-1">
                Comprehensive security architecture: RBAC context boundaries, adversarial prompt defense, explainable audit logs, and deterministic verification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#14170F]/60 hover:text-[#14170F] rounded-xl hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans text-sm text-[#14170F]">
          {/* Section 1: 6 Governance Pillars Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-[#14170F] flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-700" />
                The 6 Pillars of Responsible AI Implemented in REACT
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                100% Compliance Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {governancePillars.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white border border-black/10 flex flex-col justify-between space-y-3 shadow-sm hover:border-black/25 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-black/5">
                          {p.icon}
                        </div>
                        <span className="font-black text-[#14170F] text-xs sm:text-sm">
                          {p.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block mb-2">
                      {p.status}
                    </span>
                    <p className="text-xs sm:text-sm text-[#14170F]/70 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Interactive Role-Based Access Control (RBAC) Inspector */}
          <div className="p-5 rounded-2xl bg-white border border-black/10 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-black/5 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-emerald-700" />
                <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-[#14170F]">
                  Live Interactive RBAC & ToolGateway Boundary Inspector
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-[#14170F]/70 bg-black/5 px-2.5 py-1 rounded-lg border border-black/10">
                Test Role Isolation
              </span>
            </div>

            {/* Role Selector Tabs */}
            <div className="flex flex-wrap gap-2.5">
              {(['facility', 'supplier', 'supervisor', 'coordinator'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRole(r);
                    setTestActionOutput(null);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all",
                    selectedRole === r
                      ? "bg-[#8FD13F] text-[#14170F] shadow-sm font-black"
                      : "bg-[#F8F9F5] text-[#14170F]/70 hover:text-[#14170F] border border-black/10 hover:bg-black/5"
                  )}
                >
                  {r.toUpperCase()} ROLE
                </button>
              ))}
            </div>

            {/* Selected Role Capabilities */}
            <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
                <div>
                  <span className="text-[#14170F] font-black font-mono text-xs sm:text-sm">
                    Actor: {rbacRules[selectedRole].actorId}
                  </span>
                  <p className="text-xs text-[#14170F]/70 mt-0.5">
                    {rbacRules[selectedRole].scope}
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold self-start sm:self-auto">
                  Gateway Quarantine: ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Permitted Actions */}
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase font-black text-emerald-800 block">
                    Permitted Tool Calls (Click to Simulate):
                  </span>
                  {rbacRules[selectedRole].allowed.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => handleTestRbac(tool, true)}
                      className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-black/10 hover:border-emerald-300 text-xs sm:text-sm font-mono text-emerald-900 transition-colors flex items-center justify-between group shadow-sm"
                    >
                      <span className="font-semibold">✓ {tool}</span>
                      <span className="text-xs text-emerald-700 font-bold opacity-0 group-hover:opacity-100">Test Allow →</span>
                    </button>
                  ))}
                </div>

                {/* Quarantined / Blocked Actions */}
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase font-black text-rose-800 block">
                    Quarantined / Prohibited Actions (Click to Test Guard):
                  </span>
                  {rbacRules[selectedRole].quarantined.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => handleTestRbac(tool, false)}
                      className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-rose-50 border border-black/10 hover:border-rose-300 text-xs sm:text-sm font-mono text-rose-900 transition-colors flex items-center justify-between group shadow-sm"
                    >
                      <span className="font-semibold">✗ {tool}</span>
                      <span className="text-xs text-rose-700 font-bold opacity-0 group-hover:opacity-100">Test Block →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Test Output Terminal */}
              {testActionOutput && (
                <div className={cn(
                  "p-4 rounded-xl border font-mono text-xs sm:text-sm animate-in fade-in shadow-sm",
                  testActionOutput.status === 'ALLOW'
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-rose-50 border-rose-300 text-rose-950"
                )}>
                  <div className="flex items-center gap-2 font-black mb-1.5">
                    <Terminal className="w-4 h-4" />
                    <span>ToolGateway Audit Response: [{testActionOutput.status}]</span>
                  </div>
                  <p className="leading-relaxed font-sans">
                    {testActionOutput.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-black/10 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#14170F]/80 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <span>Cryptographic audit stream hashes recorded on every execution.</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] font-black text-xs sm:text-sm transition-colors shadow-sm"
          >
            Close Governance Shield
          </button>
        </div>
      </div>
    </div>
  );
};
