import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  ShieldCheck,
  Activity,
  Flame,
  Filter,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { EventLogEntry } from '../types';
import { AgentFeedCard } from './AgentFeedCard';

interface AgentActivityFeedProps {
  events: EventLogEntry[];
  isSimulating: boolean;
  simulationMinute: number;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  events,
  isSimulating,
  simulationMinute,
}) => {
  const [actorFilter, setActorFilter] = useState<string>('all');
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSimulating && feedContainerRef.current) {
      feedContainerRef.current.scrollTo({
        top: feedContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [events.length, isSimulating]);

  const filteredEvents = events.filter(e => {
    if (actorFilter === 'all') return true;
    if (actorFilter === 'facility' && e.actor.toLowerCase().includes('facility')) return true;
    if (actorFilter === 'supply' && e.actor.toLowerCase().includes('supply')) return true;
    if (actorFilter === 'verifier' && (e.actor.toLowerCase().includes('verifier') || e.event_type.includes('VERIF'))) return true;
    if (actorFilter === 'supervisor' && (e.actor.toLowerCase().includes('supervisor') || e.actor.toLowerCase().includes('system'))) return true;
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-md rounded-2xl border border-black/8 shadow-sm overflow-hidden text-[#14170F]">
      {/* Feed Header */}
      <div className="p-3.5 border-b border-black/8 flex items-center justify-between bg-white/60 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#3E6B4F]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#14170F] font-mono">
            Agent & Verifier Audit Stream
          </h2>
          {isSimulating && (
            <span className="flex items-center gap-1 text-[10px] text-[#2D5A1E] bg-[#8FD13F]/25 border border-[#8FD13F]/50 px-2 py-0.5 rounded-full animate-pulse font-mono">
              <Flame className="w-3 h-3 animate-spin text-[#5B9C20]" />
              <span>T+{simulationMinute}m</span>
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-[#14170F]/60 bg-black/5 px-2 py-0.5 rounded-full">
          {events.length} records
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 border-b border-black/6 bg-white/40 flex items-center gap-1.5 overflow-x-auto shrink-0">
        <Filter className="w-3 h-3 text-[#14170F]/40 mr-1 shrink-0" />
        {[
          { id: 'all', label: 'All Feeds' },
          { id: 'facility', label: 'Facility' },
          { id: 'supply', label: 'Coordinator' },
          { id: 'verifier', label: 'Verifier' },
          { id: 'supervisor', label: 'Supervisor' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActorFilter(tab.id)}
            className={cn(
              "text-[10px] font-medium px-2.5 py-1 rounded-full transition-all whitespace-nowrap active:scale-95",
              actorFilter === tab.id
                ? "bg-[#14170F] text-white shadow-sm font-semibold"
                : "text-[#14170F]/65 hover:bg-black/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div ref={feedContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#14170F]/50 gap-2 p-6 text-center">
            <Activity className="w-8 h-8 text-[#14170F]/30" />
            <p className="text-xs font-sans max-w-xs leading-relaxed">
              {isSimulating
                ? "Streaming agent execution and deterministic verifier checks..."
                : 'Click "Run Rehearsal" to execute multi-agent coordination.'}
            </p>
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <AgentFeedCard key={ev.id || idx} event={ev} index={idx} />
          ))
        )}
        
      </div>

      {/* Footer System Status */}
      <div className="p-2.5 border-t border-black/8 bg-white/60 flex items-center justify-between text-[11px] font-mono text-[#14170F]/70">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5B9C20]" />
          <span>Strict Invariants Enforced</span>
        </div>
        <span className="text-[10px] text-[#14170F]/50">Two-Phase Lock</span>
      </div>
    </div>
  );
};
