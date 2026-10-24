import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  FileSpreadsheet,
  Activity,
  Layers,
  ShieldAlert,
  Building2,
  Hospital,
  Factory,
  TrendingUp,
  Settings,
  Upload,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ScenarioMeta, RolePOV, DomainPack, DomainTerminology } from '../types';
import { PillButton } from './PillButton';

interface TopBarProps {
  scenarios: ScenarioMeta[];
  currentScenarioId: string;
  onSelectScenario: (id: string) => void;
  simulationMinute: number;
  onScrubTime: (minute: number) => void;
  onAdvanceTime: (deltaMinutes: number) => void;
  onReset: () => void;
  onRunRehearsal: () => void;
  onOpenBenchmark: () => void;
  onOpenDebrief: () => void;
  onOpenApproval?: () => void;
  onOpenIngestion?: (tab?: 'supplier' | 'hospital') => void;
  onOpenAnalytics?: () => void;
  onOpenCgiAccelerator?: () => void;
  onOpenGovernance?: () => void;
  onStartTour?: () => void;
  onToggleHero?: () => void;
  domainPack: DomainPack;
  onSelectDomainPack: (pack: DomainPack) => void;
  terminology: DomainTerminology;
  isSimulating: boolean;
  hasDebrief: boolean;
  hasPendingApproval?: boolean;
  serverOnline: boolean;
  rolePOV: RolePOV;
  onSelectRolePOV: (role: RolePOV) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  scenarios,
  currentScenarioId,
  onSelectScenario,
  simulationMinute,
  onScrubTime,
  onAdvanceTime,
  onReset,
  onRunRehearsal,
  onOpenBenchmark,
  onOpenDebrief,
  onOpenApproval,
  onOpenIngestion,
  onOpenAnalytics,
  onOpenCgiAccelerator,
  onOpenGovernance,
  onStartTour,
  onToggleHero,
  domainPack,
  onSelectDomainPack,
  terminology,
  isSimulating,
  hasDebrief,
  hasPendingApproval = false,
  serverOnline,
  rolePOV,
  onSelectRolePOV,
}) => {
  const [showDomainMenu, setShowDomainMenu] = useState(false);

  const isCoordinator = rolePOV === 'coordinator';

  return (
    <header className="border-b border-black/10 bg-white/95 backdrop-blur-xl z-30 shrink-0 text-[#14170F] shadow-sm transition-all duration-300">
      {/* TIER 1: Primary Brand, Role POV & Global Crisis Context */}
      <div className={cn(
        "px-6 sm:px-8 flex items-center justify-between gap-4 transition-all duration-300",
        isCoordinator ? "py-3 border-b border-black/5" : "py-4 min-h-[82px]"
      )}>
        {/* 1. Left: Role POV Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-black/[0.04] border border-black/10 p-1.5 rounded-full shadow-inner">
            <button
              onClick={() => onSelectRolePOV('coordinator')}
              className={cn(
                'px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2.5 active:scale-95',
                rolePOV === 'coordinator'
                  ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                  : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
              )}
              title="Regional Coordinator: Command & Geo-Map POV"
            >
              <Building2 className="w-4 h-4 text-[#2D5A1E]" />
              <span>Coordinator</span>
            </button>
            <button
              onClick={() => onSelectRolePOV('hospital')}
              className={cn(
                'px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2.5 active:scale-95',
                rolePOV === 'hospital'
                  ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                  : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
              )}
              title={`${terminology.facilitySingle} Portal`}
            >
              <Hospital className="w-4 h-4 text-[#2D5A1E]" />
              <span>{domainPack === 'manufacturing' ? 'Plant Fab' : 'Hospital Portal'}</span>
            </button>
            <button
              onClick={() => onSelectRolePOV('supplier')}
              className={cn(
                'px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2.5 active:scale-95',
                rolePOV === 'supplier'
                  ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                  : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
              )}
              title={`${terminology.supplierSingle} Ledger`}
            >
              <Factory className="w-4 h-4 text-[#2D5A1E]" />
              <span>{domainPack === 'manufacturing' ? 'Wafer Hub' : 'Supplier Depot'}</span>
            </button>
          </div>
        </div>

        {/* 2. Middle: Grand Prestigious REACT Title Button */}
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            onClick={onToggleHero}
            className={cn(
              "flex items-center rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] border border-black/10 transition-all cursor-pointer group shadow-sm active:scale-95 select-none",
              isCoordinator ? "gap-3 px-6 py-2" : "gap-4 px-8 py-3 animate-fadeIn"
            )}
            title="REACT: Resource Evaluation Against Compound Threats — Click for Interactive Protocol Overview"
          >
            <div className={cn("rounded-full bg-[#5B9C20] animate-pulse shrink-0", isCoordinator ? "w-3 h-3" : "w-4 h-4")} />
            <span className={cn(
              "font-display font-black text-[#14170F] tracking-tight group-hover:text-[#2D5A1E] transition-colors shrink-0",
              isCoordinator ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
            )}>
              REACT
            </span>
            <span className={cn("text-black/25 font-bold shrink-0", isCoordinator ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl")}>|</span>
            <span className={cn(
              "font-display font-extrabold text-[#14170F]/85 tracking-wide",
              isCoordinator ? "text-xs sm:text-sm hidden md:inline" : "text-base sm:text-lg inline"
            )}>
              Resource Evaluation Against Compound Threats
            </span>
          </button>
        </div>

        {/* 3. Right: Chronometer HUD + Domain Switcher (Coordinator) OR Quick CTA (Hospital/Supplier) */}
        <div className="flex items-center gap-3 shrink-0">
          {isCoordinator ? (
            <>
              {/* Incident Chronometer HUD */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-black/15 rounded-full shrink-0 font-mono shadow-sm">
                <Clock className="w-4 h-4 text-[#2D5A1E]" />
                <span className="font-black text-sm text-[#14170F] whitespace-nowrap">
                  T+{simulationMinute}m
                </span>
                <span className="text-xs text-[#14170F]/60 font-semibold hidden lg:inline">
                  ({String(Math.floor(simulationMinute / 60)).padStart(2, '0')}:{String(simulationMinute % 60).padStart(2, '0')}:00)
                </span>
                <span
                  className={cn(
                    'text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border hidden xl:inline',
                    simulationMinute === 0
                      ? 'text-[#3E6B4F] bg-[#8FD13F]/20 border-[#8FD13F]/30'
                      : simulationMinute < 60
                      ? 'text-[#87550E] bg-[#E8A23D]/20 border-[#E8A23D]/40'
                      : simulationMinute < 180
                      ? 'text-[#2D5A1E] bg-[#8FD13F]/25 border-[#8FD13F]/50'
                      : 'text-[#14170F] bg-black/10 border-black/15'
                  )}
                >
                  {simulationMinute === 0 ? 'Baseline' : simulationMinute < 60 ? 'Surge Onset' : simulationMinute < 180 ? 'Re-Route' : 'Dispatch'}
                </span>
                <div className="flex items-center gap-1.5 pl-2 border-l border-black/10">
                  <button
                    onClick={() => onAdvanceTime(15)}
                    disabled={isSimulating || simulationMinute >= 300}
                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                    title="Advance Simulation +15m"
                  >
                    +15m
                  </button>
                  <button
                    onClick={() => onAdvanceTime(30)}
                    disabled={isSimulating || simulationMinute >= 300}
                    className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                    title="Advance Simulation +30m"
                  >
                    +30m
                  </button>
                </div>
              </div>

              {/* Domain Switcher */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowDomainMenu(!showDomainMenu)}
                  className="h-10 px-4 rounded-full bg-white border border-black/15 text-xs sm:text-sm font-bold text-[#14170F] hover:bg-black/5 transition-all flex items-center shadow-sm active:scale-95"
                  title="Enterprise Domain Pack Switcher"
                >
                  <Settings className="w-3.5 h-3.5 mr-2 text-[#2D5A1E]" />
                  <span>Domain: {domainPack === 'manufacturing' ? 'Semiconductor' : 'Healthcare'}</span>
                </button>
                {showDomainMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-black/15 rounded-2xl shadow-xl z-50 p-1.5 animate-scale-in">
                    <button
                      onClick={() => {
                        onSelectDomainPack('healthcare');
                        setShowDomainMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2.5',
                        domainPack === 'healthcare'
                          ? 'bg-[#8FD13F]/20 text-[#2D5A1E] font-bold'
                          : 'hover:bg-black/5 text-[#14170F]'
                      )}
                    >
                      <Hospital className="w-4 h-4 text-[#3E6B4F]" />
                      <span>Healthcare: Oxygen</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectDomainPack('manufacturing');
                        setShowDomainMenu(false);
                      }}
                      className={cn(
                        'w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2.5',
                        domainPack === 'manufacturing'
                          ? 'bg-[#E8A23D]/20 text-[#87550E] font-bold'
                          : 'hover:bg-black/5 text-[#14170F]'
                      )}
                    >
                      <Factory className="w-4 h-4 text-[#E8A23D]" />
                      <span>Mfg JIT: Silicon Wafer</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Hospital and Supplier Portal: Reset & Run Simulation CTAs */
            <div className="flex items-center gap-3">
              <button
                onClick={onReset}
                disabled={isSimulating}
                className="h-10 px-4 rounded-full border border-black/15 bg-white hover:bg-black/5 text-xs sm:text-sm font-bold text-[#14170F]/80 hover:text-[#14170F] disabled:opacity-40 transition-all flex items-center gap-2 shrink-0 shadow-sm active:scale-95"
                title="Reset Rehearsal to T+0m"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <PillButton
                variant="primary"
                size="md"
                onClick={onRunRehearsal}
                disabled={isSimulating}
                className="shrink-0"
                icon={
                  isSimulating ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )
                }
              >
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </PillButton>
            </div>
          )}
        </div>
      </div>

      {/* TIER 2: Tactical Action & Simulation Control Bar (Only in Coordinator Mode) */}
      {isCoordinator && (
        <div className="px-6 sm:px-8 py-2.5 bg-[#F8F9F5]/80 flex flex-wrap items-center justify-between gap-4 text-[#14170F] animate-fade-in">
          {/* Left: Case / Scenario Dropdown Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14170F]/60 font-mono">
              Drill Scenario:
            </span>
            <div className="relative">
              <select
                value={currentScenarioId}
                onChange={(e) => onSelectScenario(e.target.value)}
                disabled={isSimulating}
                className="h-10 px-4 pr-10 rounded-full bg-white border border-black/15 text-xs sm:text-sm font-display font-bold text-[#14170F] focus:outline-none focus:border-[#8FD13F] transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-50 min-w-[280px] sm:min-w-[340px]"
              >
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.id} — {sc.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#14170F]/60 text-xs font-bold">
                ▾
              </div>
            </div>
          </div>

          {/* Center: Evenly Spaced Operational Action Buttons with Full Text Labels */}
          <div className="flex items-center gap-2.5">
            {/* Human Sign-Off Required Button */}
            {hasPendingApproval && onOpenApproval && (
              <button
                onClick={onOpenApproval}
                className="h-10 px-4 rounded-full border border-[#E8A23D] bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 text-xs font-bold text-[#87550E] transition-all flex items-center gap-2 shadow-sm animate-pulse active:scale-95 shrink-0"
              >
                <ShieldAlert className="w-4 h-4 text-[#E8A23D]" />
                <span>Sign-Off Required</span>
              </button>
            )}

            {/* Ingest Button */}
            {onOpenIngestion && (
              <PillButton
                variant="secondary"
                size="md"
                onClick={() => onOpenIngestion('supplier')}
                icon={<Upload className="w-4 h-4 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Ingest Live Crisis Telemetry & CSV"
              >
                <span>Ingest</span>
              </PillButton>
            )}

            {/* Debrief Button */}
            {hasDebrief && (
              <PillButton
                variant="secondary"
                size="md"
                onClick={onOpenDebrief}
                icon={<FileSpreadsheet className="w-4 h-4 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Operational Debrief Card"
              >
                <span>Debrief</span>
              </PillButton>
            )}

            {/* Governance & RBAC Shield Button */}
            {onOpenGovernance && (
              <PillButton
                variant="secondary"
                size="md"
                onClick={onOpenGovernance}
                icon={<ShieldCheck className="w-4 h-4 text-[#3E6B4F]" />}
                className="shrink-0"
                title="NIST AI RMF Governance, RBAC Isolation & Prompt Firewall"
              >
                <span>Governance & RBAC</span>
              </PillButton>
            )}

            {/* Industry Patterns Button */}
            {onOpenCgiAccelerator && (
              <PillButton
                variant="secondary"
                size="md"
                onClick={onOpenCgiAccelerator}
                icon={<Layers className="w-4 h-4 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Enterprise Accelerator Pattern & Cross-Industry Blueprint"
              >
                <span>Industry Patterns</span>
              </PillButton>
            )}

            {/* Audit & ROI Button */}
            {onOpenAnalytics && (
              <PillButton
                variant="secondary"
                size="md"
                onClick={onOpenAnalytics}
                icon={<TrendingUp className="w-4 h-4 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Executive ROI, 3-Way Benchmarks & Crisis Chaos Audit"
              >
                <span>Audit & ROI</span>
              </PillButton>
            )}
          </div>

          {/* Right: Simulation Controls (Reset & Run Simulation) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onReset}
              disabled={isSimulating}
              className="h-10 px-4 rounded-full border border-black/15 bg-white hover:bg-black/5 text-xs sm:text-sm font-bold text-[#14170F]/80 hover:text-[#14170F] disabled:opacity-40 transition-all flex items-center gap-2 shrink-0 shadow-sm active:scale-95"
              title="Reset Rehearsal to T+0m"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <PillButton
              variant="primary"
              size="md"
              onClick={onRunRehearsal}
              disabled={isSimulating}
              className="shrink-0"
              icon={
                isSimulating ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )
              }
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </PillButton>
          </div>
        </div>
      )}
    </header>
  );
};
