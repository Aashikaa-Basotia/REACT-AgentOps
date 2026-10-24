import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertOctagon,
  Clock,
  UserCheck,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { SupervisorDebrief } from '../types';
import { GlassPanel } from './GlassPanel';
import { PillButton } from './PillButton';
import { StatusBadge } from './StatusBadge';
import { cn } from '../lib/utils';

export interface DebriefCardProps {
  debrief: SupervisorDebrief;
  onJumpToTimeline?: (minute: number) => void;
  onClose?: () => void;
}

export const DebriefCard: React.FC<DebriefCardProps> = ({
  debrief,
  onJumpToTimeline,
  onClose,
}) => {
  const isInfeasible = debrief.unmet_batches > 0;
  const status = isInfeasible ? 'INFEASIBLE' : 'FEASIBLE';

  return (
    <GlassPanel
      variant="light"
      elevation="elevated"
      rounded="panel"
      animateScaleIn
      className="p-6 sm:p-8 border-2 border-black/10 shadow-2xl flex flex-col gap-6 max-w-4xl w-full mx-auto text-sm text-[#14170F]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-black/10 gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F1714] text-[#8FD13F] flex items-center justify-center shadow-md">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-black text-[#14170F]">
                Rehearsal Finding & Operational Debrief
              </h3>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-black/5 text-[#14170F] font-bold border border-black/10">
                {debrief.scenario_id}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#14170F]/70 mt-1">
              Deterministic Invariant Verification and Compound Hazard Synthesis
            </p>
          </div>
        </div>

        <StatusBadge status={status} size="lg" />
      </div>

      {/* Metric Strip (Staggered Item 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up stagger-1">
        <div className="p-4 rounded-2xl bg-white border border-black/10 shadow-sm">
          <span className="text-xs text-[#14170F]/60 uppercase tracking-wide font-black">
            Invariant Violations
          </span>
          <div className="mt-1.5 flex items-center gap-2 text-[#2D5A1E] font-black text-base">
            <ShieldCheck className="w-5 h-5 text-[#5B9C20]" />
            <span>0 Illegal Commitments</span>
          </div>
          <div className="text-xs text-[#14170F]/60 mt-1">Two-phase idempotency verified</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/10 shadow-sm">
          <span className="text-xs text-[#14170F]/60 uppercase tracking-wide font-black">
            Unmet Demand Shortfall
          </span>
          <div
            className={cn(
              'mt-1.5 flex items-center gap-2 font-black text-base',
              isInfeasible ? 'text-[#8C2421]' : 'text-[#2D5A1E]'
            )}
          >
            {isInfeasible ? (
              <AlertOctagon className="w-5 h-5 text-[#D9534F]" />
            ) : (
              <CheckCircle className="w-5 h-5 text-[#5B9C20]" />
            )}
            <span>{debrief.unmet_batches} Batches</span>
          </div>
          <div className="text-xs text-[#14170F]/60 mt-1">
            {isInfeasible ? 'Surfaced honestly without false optimization' : 'All facility demand fulfilled'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/10 shadow-sm">
          <span className="text-xs text-[#14170F]/60 uppercase tracking-wide font-black">
            Verifier Verdict
          </span>
          <div className="mt-1.5 flex items-center gap-2 font-black text-base">
            {isInfeasible ? (
              <span className="text-[#8C2421] flex items-center gap-1.5">
                <AlertOctagon className="w-5 h-5 text-[#D9534F]" />
                Constrained Shortfall
              </span>
            ) : (
              <span className="text-[#2D5A1E] flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-[#5B9C20]" />
                Mathematically Feasible
              </span>
            )}
          </div>
          <div className="text-xs text-[#14170F]/60 mt-1">
            {isInfeasible
              ? 'Physical constraint barrier detected'
              : 'All 7 mathematical invariants satisfied'}
          </div>
        </div>
      </div>

      {/* Unresolved Findings Cards with Timeline links (Staggered Item 2) */}
      <div className="space-y-3 animate-fade-up stagger-2">
        <h4 className="text-xs sm:text-sm font-black text-[#14170F] uppercase tracking-wide flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#E8A23D]" />
          <span>Disruption Findings & Evidence Trail</span>
        </h4>
        <div className="space-y-2.5">
          {debrief.failed_assumptions.map((finding, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-black/10 flex items-center justify-between gap-4 hover:border-black/25 transition-all shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8A23D] mt-1.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-[#14170F]">{finding}</div>
                  <div className="text-xs text-[#14170F]/60 mt-0.5">
                    Triggered during compounding environmental disruption event
                  </div>
                </div>
              </div>

              {onJumpToTimeline && (
                <PillButton
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs font-mono font-bold"
                  onClick={() => onJumpToTimeline(idx === 0 ? 30 : 120)}
                >
                  <span>Inspect T+{idx === 0 ? 30 : 120}m</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </PillButton>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Items & Operational Roles (Staggered Item 3) */}
      <div className="space-y-3 animate-fade-up stagger-3">
        <h4 className="text-xs sm:text-sm font-black text-[#14170F] uppercase tracking-wide flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#3E6B4F]" />
          <span>Human Supervisor Hand-off & Actionable Tasks</span>
        </h4>
        <div className="rounded-2xl bg-white border border-black/10 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F8F9F5] text-[#14170F]/70 text-xs uppercase font-bold border-b border-black/10">
                <th className="py-3 px-4">Protocol Directive</th>
                <th className="py-3 px-4">Designated Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {debrief.action_items.map((item, idx) => (
                <tr key={idx} className="hover:bg-black/[0.02]">
                  <td className="py-3 px-4 text-[#14170F] font-semibold">{item.task}</td>
                  <td className="py-3 px-4 text-[#3E6B4F] font-mono font-bold">
                    {item.owner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="flex justify-end pt-2 border-t border-black/8">
          <PillButton variant="dark" size="md" onClick={onClose}>
            Acknowledge & Close Debrief
          </PillButton>
        </div>
      )}
    </GlassPanel>
  );
};
