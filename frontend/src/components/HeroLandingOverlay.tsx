import React from 'react';
import {
  Play,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { PillButton } from './PillButton';
import { ScenarioMeta } from '../types';
import { cn } from '../lib/utils';

export interface HeroLandingOverlayProps {
  scenarios: ScenarioMeta[];
  currentScenarioId: string;
  onSelectScenario: (id: string) => void;
  onStartRehearsal: () => void;
  onClose: () => void;
}

export const HeroLandingOverlay: React.FC<HeroLandingOverlayProps> = ({
  scenarios,
  currentScenarioId,
  onSelectScenario,
  onStartRehearsal,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <GlassPanel
        variant="light"
        elevation="elevated"
        rounded="panel"
        animateScaleIn
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-white/80 shadow-2xl relative flex flex-col gap-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#14170F] transition-colors"
          title="Return to Dashboard"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Section (§4.1) */}
        <div className="max-w-2xl space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8FD13F]/20 border border-[#8FD13F]/40 text-[#2D5A1E] text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-[#5B9C20] animate-pulse" />
            <span>REACT • Resource Evaluation Against Compound Threats</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-[#14170F] leading-[1.1]">
            Rehearse compound failure <br />
            <span className="text-[#3E6B4F]">before it happens.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#14170F]/70 leading-relaxed font-sans">
            A deterministic multi-agent logistics rehearsal platform for critical resource coordination
            under compound disruptions. Evaluates supply chains against acute shortages, stress-tests contingency plans,
            surfaces physical bottlenecks, and enforces mathematical zero-hallucination inventory invariants.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <PillButton
              variant="primary"
              size="lg"
              onClick={onStartRehearsal}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              Start Rehearsal Simulation
            </PillButton>

            <PillButton
              variant="secondary"
              size="lg"
              onClick={onClose}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Enter Live Dashboard
            </PillButton>
          </div>
        </div>

        {/* 3 Core Scientific Invariants Pill Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-black/8">
          <div className="p-3.5 rounded-card bg-white/70 border border-black/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14170F]">
              <Database className="w-3.5 h-3.5 text-[#3E6B4F]" />
              <span>Reported ≠ Confirmed ≠ Reserved</span>
            </div>
            <p className="text-[11px] text-[#14170F]/65 leading-normal">
              Tripartite inventory distinction preventing double-booking and phantom stock.
            </p>
          </div>

          <div className="p-3.5 rounded-card bg-white/70 border border-black/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14170F]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5B9C20]" />
              <span>Deterministic Verifier</span>
            </div>
            <p className="text-[11px] text-[#14170F]/65 leading-normal">
              Zero unverified allocations committed to hospitals. Rejections are mathematically enforced.
            </p>
          </div>

          <div className="p-3.5 rounded-card bg-white/70 border border-black/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14170F]">
              <Zap className="w-3.5 h-3.5 text-[#E8A23D]" />
              <span>Honest Gap Surfacing</span>
            </div>
            <p className="text-[11px] text-[#14170F]/65 leading-normal">
              When capacity is exceeded, unmet demand is stated plainly for human triage.
            </p>
          </div>
        </div>

        {/* Scenario Selection Cards Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#14170F] font-mono">
              Scenario Suite Library (SC-01 to SC-06)
            </h3>
            <span className="text-[10px] font-mono text-[#14170F]/50">
              Select scenario to initialize topology
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Array.from(new Map(scenarios.map((sc) => [sc.id, sc])).values()).map((sc) => {
              const isSelected = sc.id === currentScenarioId;
              const cleanName = (sc.name || '').replace(/â€”|—|–/g, '-').replace(/\s*-\s*/g, ' - ');
              return (
                <div
                  key={sc.id}
                  onClick={() => onSelectScenario(sc.id)}
                  className={cn(
                    'p-3 rounded-card border transition-all duration-200 cursor-pointer flex flex-col justify-between text-xs',
                    isSelected
                      ? 'bg-[#8FD13F]/15 border-[#8FD13F] shadow-sm'
                      : 'bg-white/60 border-black/5 hover:bg-white hover:border-black/15'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[11px] text-[#14170F]">
                        {sc.id}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-semibold text-[#2D5A1E] bg-[#8FD13F]/30 px-1.5 py-0.2 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[#14170F] text-xs leading-snug">
                      {cleanName}
                    </div>
                    <div className="text-[11px] text-[#14170F]/60 mt-1 line-clamp-2">
                      {sc.description}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] font-mono text-[#14170F]/50">
                    <span>{sc.hospitals_count} Hospitals</span>
                    <span>{sc.suppliers_count} Depots</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};
