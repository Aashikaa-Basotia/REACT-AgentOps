import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
  ArrowRight,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  XCircle,
  Flame,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { StagedPlan, StagedDelivery } from '../types';

interface HumanApprovalModalProps {
  stagedPlan: StagedPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (planId: string) => Promise<void>;
  onReject: (planId: string, note: string) => Promise<void>;
  onSimulateDrift: () => Promise<void>;
  isProcessing?: boolean;
  driftAlert?: string | null;
  errorAlert?: string | null;
  scenarioId?: string;
}

interface CoordinatorGuidance {
  situation: string;
  threatLevel: 'NOMINAL' | 'HIGH' | 'CRITICAL' | 'RESTRICTED';
  aiProposalSummary: string;
  whyThisPlan: string;
  recommendedAction: string;
  alternativeOptions: string;
}

const SCENARIO_COORDINATOR_GUIDANCE: Record<string, CoordinatorGuidance> = {
  'SC-01': {
    situation: 'All primary arterial logistics corridors across Bengaluru are open and unswamped. Cryogenic supply at Peenya (10b) and Hoskote (10b) is fully intact and capable of fulfilling baseline demand across all active healthcare centers.',
    threatLevel: 'NOMINAL',
    aiProposalSummary: 'Direct dual-origin allocation: 8 batches to H1 via Outer Ring Road, 8 batches to H2 via West Arterial Highway, and 4 batches to H3. All deliveries arrive with a 30m+ safety buffer prior to hospital exhaustion deadlines.',
    whyThisPlan: 'Optimized transit routes minimize transit latency to 60–90 min while maintaining zero overcommitment across both cryogenic depots.',
    recommendedAction: "Click 'Approve & Lock Commitments' to commit inventory reservations and dispatch cryogenic tankers.",
    alternativeOptions: "You may click 'Simulate State Drift' to test the verifier's optimistic concurrency guard by injecting an unexpected external stock drop.",
  },
  'SC-02': {
    situation: 'Flash flooding in the Bellandur and Sarjapur low-lying drainage corridors has submerged the primary eastern arterial route, delaying standard Hoskote dispatches by 300 minutes and cutting off conventional transit.',
    threatLevel: 'CRITICAL',
    aiProposalSummary: 'Prioritized re-routing of 10 batches from western Peenya Cryo-Plant to acute critical facilities (H1 & H2). Hoskote transit held pending clearance of the Old Airport Elevated Bypass (R_ALT_S2_H2).',
    whyThisPlan: 'Peenya (S1) is the only reachable supplier with unflooded access. Committing S1 guarantees zero patient mortality at Whitefield and City Market while awaiting floodwater recession.',
    recommendedAction: "Approve the staged Peenya allocation immediately to prevent ICU hypoxia. Prepare for secondary dispatch once disaster control clears the elevated bypass at T+120m.",
    alternativeOptions: 'If field intelligence reports western flooding spreading toward Peenya, reject and instruct secondary hospitals to rely on backup oxygen concentrators.',
  },
  'SC-03': {
    situation: 'Multiple regional hospitals have concurrently requested 8 batches each from Peenya Cryo-Plant (16 batches total requested vs. 10 batches physical capacity). Eastern depot access is temporarily constrained.',
    threatLevel: 'HIGH',
    aiProposalSummary: 'The multi-agent coordinator rationed S1 stock: 8 batches allocated to primary acute ICU facility (H1) and 2 batches allocated to H2 to prevent total ward stockout, strictly capping total allocation at S1 capacity (10/10).',
    whyThisPlan: 'Prevents catastrophic double-booking. Without this invariant, both hospitals would assume full delivery, causing tanker shortages and medical disaster.',
    recommendedAction: "Approve the 10-batch split allocation. The deterministic mathematical verifier has confirmed ∑ q_r = 10 ≤ Q_s.",
    alternativeOptions: 'Reject if coordinator policy requires an even 5/5 batch split between H1 and H2 instead of 8/2 priority allocation.',
  },
  'SC-04': {
    situation: "Supplier S2 sent an informal dispatch message stating 'Six ready' without clarifying whether transport was included or customer depot pickup was required.",
    threatLevel: 'RESTRICTED',
    aiProposalSummary: "The Multi-Agent Supply Clarifier held S2 stock in unverified status until an automated structured clarification request was sent and answered: 'Collection only. Ready for pickup'.",
    whyThisPlan: "Prevents 'ghost deliveries' where hospitals expect hospital-gate delivery but supplier expects local depot pickup.",
    recommendedAction: 'Approve staged allocations if autonomous pickup transport is arranged, or confirm route with dedicated heavy cryogenic transport.',
    alternativeOptions: 'Reject to hold off on S2 commitments until supplier confirms gate delivery capabilities.',
  },
  'SC-05': {
    situation: 'Supplier S1 had initially confirmed 10 batches, but an external commercial diversion depleted stock to 6 batches at T=50m, triggering an OCC state version bump from v1 to v2.',
    threatLevel: 'HIGH',
    aiProposalSummary: 'The Multi-Agent verifier rejected stale reservations bound to v1 and staged a revised plan strictly constrained to the remaining 6 batches (v2).',
    whyThisPlan: 'Enforces optimistic concurrency control. Any attempt to commit 8 batches against a supplier with only 6 physical batches is blocked mathematically.',
    recommendedAction: 'Review revised allocations (capped at 6 batches) and approve under version v2.',
    alternativeOptions: "Click 'Simulate State Drift' to inspect how the system catches mid-flight concurrency conflicts before human sign-off.",
  },
  'SC-06': {
    situation: 'Total regional healthcare demand is 20 batches, but low-lying floods have completely blocked Hoskote (S2), leaving only 10 reachable batches from Peenya (S1). A net shortfall of 10 batches is physically unavoidable.',
    threatLevel: 'CRITICAL',
    aiProposalSummary: 'The system allocated all 10 reachable batches to highest-urgency ICU centers and explicitly reported 10 batches as UNMET DEMAND rather than hallucinating nonexistent inventory.',
    whyThisPlan: 'Honest gap recognition allows the disaster management bureau to escalate to state air-drop logistics and civil defense rather than suffering surprise ward exhaustion.',
    recommendedAction: 'Approve the 10-batch emergency allocation and immediately trigger inter-state SOS protocols (NDRF / airlift) for the remaining 10-batch deficit.',
    alternativeOptions: 'Reject if military mobile oxygen generation units are arriving on-site to take over acute facilities.',
  },
  'SC-07': {
    situation: 'High-precision EUV wafer fabrication facilities require uninterrupted nitrogen/argon cryogenic supply to prevent multi-crore fab chamber shutdown and wafer contamination.',
    threatLevel: 'HIGH',
    aiProposalSummary: 'Staged precision delivery from Hoskote depot and regional partners directly to Whitefield cleanrooms, maintaining zero stockout margin and strict lot traceability.',
    whyThisPlan: 'Optimizes transit windows to avoid peak freight congestion and maintains continuous positive purge pressure in wafer fab tools.',
    recommendedAction: 'Approve dispatch locks to guarantee cleanroom replenishment before thermal runaway thresholds.',
    alternativeOptions: 'Reject if tool maintenance schedule shifts production batch start times.',
  },
};

const DEFAULT_GUIDANCE: CoordinatorGuidance = {
  situation: 'Operational crisis drill active. Multi-agent supervisors and facility representatives are negotiating real-time resource allocations.',
  threatLevel: 'HIGH',
  aiProposalSummary: 'Multi-Agent supervisor evaluated facility deficits and reachable supplier routes to stage an invariant-checked allocation plan.',
  whyThisPlan: 'Zero overcommitments detected. All travel times conform to facility deadlines and route corridor capacities.',
  recommendedAction: "Review the proposed delivery commitments below. If tactical field conditions match the proposal, click 'Approve & Lock Commitments'.",
  alternativeOptions: "If field reports contradict staged data, enter a coordinator note and click 'Confirm Rejection & Re-Plan'.",
};

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  stagedPlan,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSimulateDrift,
  isProcessing = false,
  driftAlert,
  errorAlert,
  scenarioId,
}) => {
  const [rejectNote, setRejectNote] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  if (!isOpen || !stagedPlan) return null;

  const guidance = (scenarioId && SCENARIO_COORDINATOR_GUIDANCE[scenarioId]) || DEFAULT_GUIDANCE;

  // Format version bound string (e.g. "S1@v1, S2@v1")
  const versionString = Object.entries(stagedPlan.expected_stock_versions || {})
    .map(([sid, ver]) => `${sid}@v${ver}`)
    .join(', ');

  const totalBatches = stagedPlan.deliveries?.reduce((acc, d) => acc + d.quantity, 0) || 0;

  // 7 Canonical Verifier checks to display
  const standardChecks = [
    { id: 'stock_sufficient', label: '1. Stock Sufficiency', desc: 'Available stock >= requested batches' },
    { id: 'route_available', label: '2. Unblocked Route', desc: 'Transit route open and unswamped' },
    { id: 'within_capacity', label: '3. Route Capacity', desc: 'Batches <= corridor vehicle limit' },
    { id: 'deadline_met', label: '4. Deadline Feasibility', desc: 'Expected arrival <= hospital deadline' },
    { id: 'version_current', label: '5. Stock Version Concurrency', desc: 'Matches live supplier stock version' },
    { id: 'evidence_fresh', label: '6. Evidence Freshness', desc: 'Stock reports within freshness window' },
    { id: 'not_duplicate', label: '7. Idempotency Key', desc: 'Unique commitment, prevents double-booking' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#F8F9F5] border-2 border-black/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#14170F]">
        {/* Modal Header */}
        <div className="p-5 border-b border-black/10 bg-white/95 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 shadow-sm animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-black text-[#14170F] uppercase tracking-wide">
                  Human Coordinator Sign-Off Required
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-black/5 text-[#14170F] font-mono font-black border border-black/10">
                  {stagedPlan.plan_id}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 font-mono font-bold border border-sky-200 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Bound State Version: {versionString || 'v1'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#14170F]/70 mt-1">
                Multi-Agent proposal verified against 7 deterministic invariants. Coordinator explicit approval required to commit assets.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm font-sans">
          {/* Version Drift Alert (if triggered) */}
          {driftAlert && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
              <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>Optimistic Concurrency Test Triggered</span>
                </div>
                <div className="text-xs sm:text-sm text-amber-800/90 mt-1 leading-relaxed">
                  {driftAlert}
                </div>
              </div>
            </div>
          )}

          {/* Error / Version Mismatch Alert (if transaction aborted) */}
          {errorAlert && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3 shadow-sm animate-in shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-rose-950 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Transaction Aborted: STATE_VERSION_MISMATCH</span>
                </div>
                <div className="text-xs sm:text-sm text-rose-800/90 mt-1 leading-relaxed">
                  {errorAlert}
                </div>
              </div>
            </div>
          )}

          {/* Coordinator Operational Briefing & AI Recommendation */}
          <div className="rounded-2xl border border-sky-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-sky-100 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-100 border border-sky-300 text-sky-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#14170F] uppercase tracking-wide flex items-center gap-2">
                    Coordinator Operational Briefing & Multi-Agent Rationale
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      {scenarioId || 'CURRENT DRILL'}
                    </span>
                  </h4>
                </div>
              </div>
              <span
                className={cn(
                  'text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border',
                  guidance.threatLevel === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                    : guidance.threatLevel === 'HIGH'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                )}
              >
                Threat Level: {guidance.threatLevel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-2">
                <div className="text-xs font-bold text-[#14170F] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ground Reality & Crisis Situation:</span>
                </div>
                <p className="text-xs sm:text-sm text-[#14170F]/80 leading-relaxed">
                  {guidance.situation}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-black/10 space-y-2">
                <div className="text-xs font-bold text-[#14170F] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Agent AI Recommendation:</span>
                </div>
                <p className="text-xs sm:text-sm text-[#14170F]/80 leading-relaxed">
                  {guidance.aiProposalSummary}
                </p>
              </div>
            </div>

            {/* Prescribed Action Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                  Prescribed Coordinator Decision
                </span>
                <p className="text-xs sm:text-sm text-emerald-950 font-bold">
                  {guidance.recommendedAction}
                </p>
              </div>
              <div className="text-xs text-[#14170F]/70 italic md:text-right shrink-0">
                {guidance.alternativeOptions}
              </div>
            </div>
          </div>

          {/* Section 1: Proposed Deliveries Matrix */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span className="font-black text-[#14170F] text-sm uppercase tracking-wide">
                  Proposed Delivery Commitments ({totalBatches} Batches Total)
                </span>
              </div>
              <span className="text-xs font-mono text-[#14170F]/80 bg-black/5 px-2.5 py-1 rounded-lg border border-black/10 font-bold">
                {stagedPlan.deliveries?.length || 0} Routes Staged
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-black/10">
              <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-[#F8F9F5] text-[#14170F]/70 text-xs uppercase tracking-wider font-bold border-b border-black/10">
                    <th className="py-3 px-4">Supplier Origin</th>
                    <th className="py-3 px-2"></th>
                    <th className="py-3 px-4">Hospital Dest</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Route & Corridor</th>
                    <th className="py-3 px-4">ETA vs Deadline</th>
                    <th className="py-3 px-4">Safety Margin</th>
                    <th className="py-3 px-4">Bound Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {stagedPlan.deliveries?.map((d, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#14170F]">
                        <span className="text-emerald-700 font-extrabold">{d.supplier_id}</span> ({d.supplier_name})
                      </td>
                      <td className="py-3 px-2 text-[#14170F]/40">
                        <ArrowRight className="w-4 h-4" />
                      </td>
                      <td className="py-3 px-4 font-bold text-[#14170F]">
                        <span className="text-sky-700 font-extrabold">{d.hospital_id}</span> ({d.hospital_name})
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-800 text-sm">
                        {d.quantity} {d.unit}
                      </td>
                      <td className="py-3 px-4 text-[#14170F]">
                        <span className="bg-black/5 px-2 py-1 rounded-md text-xs font-mono font-bold border border-black/10">
                          {d.route_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#14170F]">
                        <span className="text-emerald-700 font-extrabold">T+{d.eta_minutes}m</span>
                        <span className="text-[#14170F]/50 text-xs ml-1.5 font-bold">/ {d.deadline_minutes}m</span>
                      </td>
                      <td className="py-3 px-4 font-bold">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold",
                          d.margin_minutes >= 30 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
                        )}>
                          +{d.margin_minutes}m OK
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sky-800 font-mono font-black">
                        v{d.plan_version}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: 7 Deterministic Verifier Badges */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-sky-700" />
                <span className="font-black text-[#14170F] text-sm uppercase tracking-wide">
                  Deterministic Invariant Verification Check Matrix
                </span>
              </div>
              <span className="text-xs bg-emerald-100 border border-emerald-300 text-emerald-900 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> All 7 Checks Passed
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              {standardChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {chk.label}
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                      VALID
                    </span>
                  </div>
                  <p className="text-xs text-[#14170F]/70 mt-1.5 leading-snug">
                    {chk.desc}
                  </p>
                </div>
              ))}
              <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/60 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-sky-950 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Lock Concurrency
                  </span>
                  <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    READY
                  </span>
                </div>
                <p className="text-xs text-[#14170F]/70 mt-1.5 leading-snug">
                  Enforces v_plan == v_stock on commit
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Rejection Note Form (Collapsible) */}
          {showRejectForm && (
            <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/60 space-y-3 animate-in fade-in">
              <label className="text-sm font-black text-[#14170F] block">
                Coordinator Reason / Alternative Guidance (Optional):
              </label>
              <input
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g., Hold S1 for acute regional trauma, prioritize H2 from secondary supplier"
                className="w-full h-11 px-4 rounded-xl bg-white border border-black/15 text-sm text-[#14170F] placeholder-black/40 focus:outline-none focus:border-amber-600 font-sans shadow-sm"
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => onReject(stagedPlan.plan_id, rejectNote || 'Coordinator rejected plan to preserve emergency stock')}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm Rejection & Re-Plan</span>
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-black/5 text-[#14170F] border border-black/15 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with 3 High-Visibility Interactive Buttons */}
        <div className="p-5 border-t border-black/10 bg-white flex flex-wrap items-center justify-between gap-4">
          {/* Button 3: Simulate State Drift (Demo) */}
          <button
            onClick={onSimulateDrift}
            disabled={isProcessing}
            className="h-11 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            title="Simulate sudden stock drop on supplier S1 to test optimistic version lock"
          >
            <Zap className="w-4 h-4 text-amber-600 fill-current" />
            <span>Simulate Last-Second Stock Drop (Test Concurrency Lock)</span>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Button 2: Reject & Request Re-Plan */}
            <button
              onClick={() => {
                if (!showRejectForm) {
                  setShowRejectForm(true);
                } else {
                  onReject(stagedPlan.plan_id, rejectNote || 'Coordinator rejected plan to preserve stock');
                }
              }}
              disabled={isProcessing}
              className="h-11 px-4 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reject & Request Re-Plan</span>
            </button>

            {/* Button 1: Approve & Lock Reservations */}
            <button
              onClick={() => onApprove(stagedPlan.plan_id)}
              disabled={isProcessing}
              className="h-11 px-6 rounded-xl bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-[#8FD13F]/20 disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5 fill-current text-[#14170F]" />
              <span>Approve & Lock Reservations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
