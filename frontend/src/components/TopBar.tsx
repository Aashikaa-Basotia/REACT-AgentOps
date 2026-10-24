import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  FastForward,
  Scale,
  FileSpreadsheet,
  Activity,
  Layers,
  ShieldAlert,
  Building2,
  Hospital,
  Factory,
  Database,
  TrendingUp,
  Settings,
  Upload,
  Clock,
  Compass,
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

  return (
    <header className="min-h-[82px] py-3 px-6 sm:px-8 border-b border-black/10 bg-white/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 z-30 shrink-0 text-[#14170F] shadow-sm">
      {/* Operational Role Switcher & Tactical Scope on Left */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <div className="flex items-center bg-black/[0.04] border border-black/10 p-1.5 rounded-full shadow-inner">
          <button
            onClick={() => onSelectRolePOV('coordinator')}
            className={cn(
              'px-4 sm:px-5 py-2.5 rounded-full text-sm sm:text-base transition-all flex items-center gap-2.5 active:scale-95',
              rolePOV === 'coordinator'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title="Regional Coordinator: Command & Geo-Map POV"
          >
            <Building2 className="w-5 h-5 text-[#2D5A1E]" />
            <span className="inline">Coordinator</span>
          </button>
          <button
            onClick={() => onSelectRolePOV('hospital')}
            className={cn(
              'px-4 sm:px-5 py-2.5 rounded-full text-sm sm:text-base transition-all flex items-center gap-2.5 active:scale-95',
              rolePOV === 'hospital'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title={`${terminology.facilitySingle} Portal`}
          >
            <Hospital className="w-5 h-5 text-[#2D5A1E]" />
            <span className="inline">
              {domainPack === 'manufacturing' ? 'Plant Fab' : 'Hospital Portal'}
            </span>
          </button>
          <button
            onClick={() => onSelectRolePOV('supplier')}
            className={cn(
              'px-4 sm:px-5 py-2.5 rounded-full text-sm sm:text-base transition-all flex items-center gap-2.5 active:scale-95',
              rolePOV === 'supplier'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title={`${terminology.supplierSingle} Ledger`}
          >
            <Factory className="w-5 h-5 text-[#2D5A1E]" />
            <span className="inline">
              {domainPack === 'manufacturing' ? 'Wafer Hub' : 'Supplier Depot'}
            </span>
          </button>
        </div>

        {/* Scenario Selector Dropdown */}
        <div className="relative shrink-0">
          <select
            value={currentScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            disabled={isSimulating}
            className="h-12 px-5 pr-10 rounded-full bg-white border border-black/15 text-sm sm:text-base font-display font-bold text-[#14170F] focus:outline-none focus:border-[#8FD13F] transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-50 min-w-[220px]"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.id} — {sc.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#14170F]/60 text-sm font-bold">
            ▾
          </div>
        </div>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-3.5 flex-wrap justify-center">
        {/* Settings button for domain pack */}
        <div className="relative">
          <button
            onClick={() => setShowDomainMenu(!showDomainMenu)}
            className="h-11 px-4 rounded-full bg-white border border-black/15 text-sm sm:text-base font-bold text-[#14170F] hover:bg-black/5 transition-all flex items-center shadow-sm active:scale-95"
            title="Enterprise Domain Pack Switcher"
          >
            <Settings className="w-4 h-4 mr-2 text-[#2D5A1E]" />
            <span>Domain: {domainPack === 'manufacturing' ? 'Semiconductor' : 'Healthcare'}</span>
          </button>
          {showDomainMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-black/15 rounded-2xl shadow-xl z-40 p-1.5 animate-scale-in">
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

        {rolePOV === 'coordinator' && (
          <>
            {/* Incident Chronometer HUD */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white border border-black/15 rounded-full shrink-0 font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2D5A1E]" />
                <span className="font-black text-base text-[#14170F] whitespace-nowrap">
                  T+{simulationMinute}m
                </span>
                <span className="text-sm text-[#14170F]/60 font-semibold hidden lg:inline">
                  ({String(Math.floor(simulationMinute / 60)).padStart(2, '0')}:{String(simulationMinute % 60).padStart(2, '0')}:00)
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border hidden xl:inline',
                  simulationMinute === 0
                    ? 'text-[#3E6B4F] bg-[#8FD13F]/20 border-[#8FD13F]/30'
                    : simulationMinute < 60
                    ? 'text-[#87550E] bg-[#E8A23D]/20 border-[#E8A23D]/40'
                    : simulationMinute < 180
                    ? 'text-[#2D5A1E] bg-[#8FD13F]/25 border-[#8FD13F]/50'
                    : simulationMinute < 300
                    ? 'text-[#14170F] bg-black/10 border-black/15'
                    : 'text-[#2D5A1E] bg-[#8FD13F]/30 border-[#8FD13F]/60'
                )}
              >
                {simulationMinute === 0
                  ? 'Baseline'
                  : simulationMinute < 60
                  ? 'Surge Onset'
                  : simulationMinute < 180
                  ? 'Re-Route'
                  : simulationMinute < 300
                  ? 'Dispatch'
                  : 'Debrief'}
              </span>
              <div className="flex items-center gap-2 pl-2.5 border-l border-black/10">
                <button
                  onClick={() => onAdvanceTime(15)}
                  disabled={isSimulating || simulationMinute >= 300}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                  title="Advance Simulation +15m"
                >
                  +15m
                </button>
                <button
                  onClick={() => onAdvanceTime(30)}
                  disabled={isSimulating || simulationMinute >= 300}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                  title="Advance Simulation +30m"
                >
                  +30m
                </button>
              </div>
            </div>

            {/* Rehearsal Reset Control */}
            <button
              onClick={onReset}
              disabled={isSimulating}
              className="h-11 px-4 rounded-full border border-black/15 bg-white hover:bg-black/5 text-sm sm:text-base font-bold text-[#14170F]/80 hover:text-[#14170F] disabled:opacity-40 transition-all flex items-center gap-2 shrink-0 shadow-sm active:scale-95"
              title="Reset Rehearsal to T+0m"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </>
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Official Project Badge with Full Form (Command Console Style) */}
        <div
          onClick={onToggleHero}
          className="hidden 2xl:flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-black/[0.04] border border-black/8 hover:bg-black/[0.07] transition-all cursor-pointer select-none group shadow-xs mr-1"
          title="Protocol Overview: Resource Evaluation Against Compound Threats"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#5B9C20] animate-pulse" />
          <span className="font-display font-black text-sm text-[#14170F] tracking-tight">
            REACT
          </span>
          <span className="text-black/20 text-xs">|</span>
          <span className="text-xs font-bold text-[#14170F]/70 truncate max-w-[280px]">
            Resource Evaluation Against Compound Threats
          </span>
        </div>
        {/* Human Sign-Off Required Button (Animated Pulse) */}
        {hasPendingApproval && onOpenApproval && (
          <button
            onClick={onOpenApproval}
            className="h-9 px-3.5 rounded-full border border-[#E8A23D] bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 text-xs font-bold text-[#87550E] transition-all flex items-center gap-1.5 shadow-sm animate-pulse active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-[#E8A23D]" />
            <span>Sign-Off Required</span>
          </button>
        )}

        {/* Data Ingestion Shield Button */}
        {onOpenIngestion && (
          <PillButton
            variant="secondary"
            size="md"
            onClick={() => onOpenIngestion('supplier')}
            icon={<Upload className="w-3.5 h-3.5 text-[#3E6B4F]" />}
            className="hidden xl:inline-flex"
            title="Ingest Live Crisis Telemetry & CSV"
          >
            Ingest
          </PillButton>
        )}

        {/* Debrief Card Button */}
        {hasDebrief && (
          <PillButton
            variant="secondary"
            size="md"
            onClick={onOpenDebrief}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#3E6B4F]" />}
            className="hidden sm:inline-flex"
          >
            Debrief
          </PillButton>
        )}

        {/* 1-Click Evaluator Guided Tour */}
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="h-10 px-4 rounded-full bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-600/50 hover:border-emerald-600 text-sm font-bold text-[#2D5A1E] transition-all flex items-center gap-2 shadow-sm active:scale-95"
            title="Start 1-Click Interactive Evaluator Walkthrough"
          >
            <Compass className="w-4 h-4 text-[#3E6B4F]" />
            <span className="font-mono">Guide Tour</span>
          </button>
        )}

        {/* Responsible AI & Governance Shield */}
        {onOpenGovernance && (
          <PillButton
            variant="secondary"
            size="md"
            onClick={onOpenGovernance}
            icon={<ShieldCheck className="w-4 h-4 text-[#3E6B4F]" />}
            title="NIST AI RMF Governance, RBAC Isolation & Prompt Firewall"
          >
            Governance & RBAC
          </PillButton>
        )}

        {/* Enterprise Accelerator Pattern */}
        {onOpenCgiAccelerator && (
          <PillButton
            variant="secondary"
            size="md"
            onClick={onOpenCgiAccelerator}
            icon={<Layers className="w-4 h-4 text-[#3E6B4F]" />}
            title="Enterprise Accelerator Pattern & Cross-Industry Blueprint"
          >
            Industry Patterns
          </PillButton>
        )}

        {/* Executive ROI & Stress Audit Button */}
        {onOpenAnalytics && rolePOV === 'coordinator' && (
          <PillButton
            variant="secondary"
            size="md"
            onClick={onOpenAnalytics}
            icon={<TrendingUp className="w-4 h-4 text-[#3E6B4F]" />}
            title="Executive ROI, 3-Way Benchmarks & Monte Carlo Stress Audit"
          >
            Audit & ROI
          </PillButton>
        )}

        {/* Primary CTA: Run Rehearsal */}
        {rolePOV === 'coordinator' && (
          <PillButton
            variant="primary"
            size="lg"
            onClick={onRunRehearsal}
            disabled={isSimulating}
            icon={
              isSimulating ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )
            }
          >
            {isSimulating ? 'Simulating...' : 'Run Rehearsal'}
          </PillButton>
        )}
      </div>
    </header>
  );
};
