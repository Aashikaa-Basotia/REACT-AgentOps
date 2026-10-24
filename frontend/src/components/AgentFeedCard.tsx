import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  FileCode2,
  Clock,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { EventLogEntry } from '../types';

export interface AgentFeedCardProps {
  event: EventLogEntry;
  index: number;
}

export const AgentFeedCard: React.FC<AgentFeedCardProps> = ({ event, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine verification status
  const rawStatus = (
    event.verification_status ||
    (event.details?.status as string) ||
    (event.description.includes('REJECTED') || event.event_type.includes('REJECT')
      ? 'REJECTED'
      : event.description.includes('VERIFIED') || event.event_type.includes('VERIF')
      ? 'VERIFIED'
      : event.description.includes('UNVERIFIED') || event.description.includes('STALE')
      ? 'UNVERIFIED'
      : event.description.includes('AWAITING') || event.event_type.includes('AWAITING')
      ? 'AWAITING_APPROVAL'
      : event.description.includes('ALLOCATED') || event.event_type.includes('ALLOCATED')
      ? 'COMMITTED'
      : 'RECORDED')
  ).toUpperCase();

  const isRejected = rawStatus.includes('REJECT');
  const isVerified = rawStatus.includes('VERIF');
  const isUnverified = rawStatus.includes('UNVERIF') || rawStatus.includes('STALE');
  const isAwaiting = rawStatus.includes('AWAITING');
  const isCommitted = rawStatus.includes('COMMIT') || rawStatus.includes('ALLOCAT');

  const isStale = event.is_stale || event.description.toLowerCase().includes('stale');

  // Reason extraction for rejections
  const rejectionReason =
    event.rejection_reason ||
    event.details?.reason ||
    (isRejected ? 'Safety invariant violation: inventory mismatch or severed transit corridor' : null);

  // Actor Badge Styling
  const actorConfig = (() => {
    const act = event.actor.toLowerCase();
    if (act.includes('verifier') || act.includes('invariant')) {
      return {
        label: 'Deterministic Verifier',
        badge: 'bg-[#3E6B4F]/15 text-[#1E3B29] border-[#3E6B4F]/30',
      };
    }
    if (act.includes('supply') || act.includes('coord')) {
      return {
        label: 'Supply Coordinator',
        badge: 'bg-black/8 text-[#14170F] border-black/15',
      };
    }
    if (act.includes('facility') || act.includes('hospital')) {
      return {
        label: 'Facility Agent',
        badge: 'bg-[#8FD13F]/25 text-[#2D5A1E] border-[#8FD13F]/40',
      };
    }
    return {
      label: event.actor,
      badge: 'bg-black/5 text-[#4A5240] border-black/10',
    };
  })();

  return (
    <div
      className={cn(
        'group rounded-card border transition-all duration-200 bg-white/70 backdrop-blur-md p-3.5 shadow-sm text-xs',
        isRejected
          ? 'border-[#D9534F] bg-[#D9534F]/5 animate-shake shadow-[0_4px_16px_rgba(217,83,79,0.12)]'
          : isVerified
          ? 'border-[#8FD13F]/50 hover:border-[#8FD13F] bg-white/80'
          : isUnverified
          ? 'border-[#E8A23D]/60 bg-[#E8A23D]/5'
          : 'border-white/60 hover:border-black/15'
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timestamp */}
          <span
            className={cn(
              'font-mono text-[11px] font-bold text-[#14170F]/70 flex items-center gap-1',
              isStale && 'animate-pulse-stale text-[#87550E]'
            )}
            title={isStale ? 'Stale evidence: timestamp exceeds Δt freshness envelope' : undefined}
          >
            <Clock className="w-3 h-3 text-[#14170F]/50" />
            T+{event.minute ?? event.timestamp}m
          </span>

          {/* Actor */}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium border font-sans',
              actorConfig.badge
            )}
          >
            {actorConfig.label}
          </span>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/50">
              <ShieldCheck className="w-3 h-3 text-[#5B9C20]" />
              VERIFIED
            </span>
          )}
          {isCommitted && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#3E6B4F]/20 text-[#2D5A1E] border border-[#3E6B4F]/40">
              COMMITTED
            </span>
          )}
          {isAwaiting && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/40 animate-pulse">
              AWAITING SIGN-OFF
            </span>
          )}
          {isUnverified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E8A23D]/20 text-[#87550E] border border-[#E8A23D]/45">
              UNVERIFIED
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#8C2421] border border-[#D9534F]/60">
              <AlertOctagon className="w-3 h-3 text-[#D9534F]" />
              REJECTED
            </span>
          )}
          {!isVerified && !isCommitted && !isAwaiting && !isUnverified && !isRejected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/[0.04] text-[#14170F]/70 border border-black/8">
              RECORDED
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 text-[#14170F] text-xs leading-relaxed font-sans font-normal">
        {event.description}
      </div>

      {/* Rejection Explicit Reason (Per §4.2.C: visibly show WHY, not just a red X) */}
      {isRejected && rejectionReason && (
        <div className="mt-2.5 p-2 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/30 text-[11px] text-[#8C2421] font-mono flex items-start gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-[#D9534F] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Violation Cause: </span>
            <span>{rejectionReason}</span>
          </div>
        </div>
      )}

      {/* Stale Evidence Warning */}
      {isStale && !isRejected && (
        <div className="mt-2 p-1.5 rounded-lg bg-[#E8A23D]/10 border border-[#E8A23D]/30 text-[10px] text-[#87550E] font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E8A23D] animate-ping" />
          <span>Evidence age exceeds freshness threshold (Δt &gt; 15m)</span>
        </div>
      )}
    </div>
  );
};
