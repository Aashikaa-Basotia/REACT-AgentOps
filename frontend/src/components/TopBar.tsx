import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  FastForward,
  Rewind,
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
        <header className="min-h-[76px] py-3 px-4 lg:px-6 border-b border-black/10 bg-white/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-x-6 gap-y-3 z-30 shrink-0 text-[#14170F] shadow-sm select-none">
      {/* 1. Left Group: Stylish Brand & Operational Role Switcher */}
      <div className="flex items-center gap-3.5 flex-wrap">
        {/* Stylish Futuristic REACT Command Brand Button (Light Executive Theme) */}
        <button
          onClick={onToggleHero}
          className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white hover:bg-emerald-50/50 border-2 border-[#8FD13F]/60 hover:border-[#8FD13F] shadow-[0_2px_14px_rgba(143,209,63,0.22)] hover:shadow-[0_4px_22px_rgba(143,209,63,0.4)] transition-all cursor-pointer select-none group active:scale-95 text-left shrink-0"
          title="REACT: Resource Evaluation Against Compound Threats — Click for Executive Overview"
        >
          <div className="relative flex items-center justify-center pl-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B9C20] animate-ping absolute opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B9C20]" />
          </div>
          <span className="px-2.5 py-0.5 rounded-lg bg-[#8FD13F]/20 border border-[#8FD13F]/50 font-['Orbitron',sans-serif] font-black text-base sm:text-lg tracking-[0.22em] text-[#1B4D20] group-hover:text-[#113814] group-hover:bg-[#8FD13F]/35 transition-all">
            REACT
          </span>
          <span className="text-black/20 text-sm hidden sm:inline">|</span>
          <span className="text-xs font-bold tracking-tight text-[#14170F]/80 group-hover:text-[#14170F] truncate max-w-[280px] lg:max-w-[340px] hidden md:inline transition-colors">
            Resource Evaluation Against Compound Threats
          </span>
        </button>

        {/* 3-Role Operational POV Switcher */}
        <div className="flex items-center bg-black/[0.04] border border-black/10 p-1 rounded-full shadow-inner">
          <button
            onClick={() => onSelectRolePOV('coordinator')}
            className={cn(
              'px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'coordinator'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-semibold'
            )}
            title="Regional Coordinator: Command & Geo-Map POV"
          >
            <Building2 className="w-4 h-4 text-[#3E6B4F]" />
            <span className="inline">Coordinator</span>
          </button>
          <button
            onClick={() => onSelectRolePOV('hospital')}
            className={cn(
              'px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'hospital'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-semibold'
            )}
            title={`${terminology.facilitySingle} Portal`}
          >
            <Hospital className="w-4 h-4 text-[#3E6B4F]" />
            <span className="inline">
              {domainPack === 'manufacturing' ? 'Plant Fab' : 'Hospital Portal'}
            </span>
          </button>
          <button
            onClick={() => onSelectRolePOV('supplier')}
            className={cn(
              'px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'supplier'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-semibold'
            )}
            title={`${terminology.supplierSingle} Ledger`}
          >
            <Factory className="w-4 h-4 text-[#3E6B4F]" />
            <span className="inline">
              {domainPack === 'manufacturing' ? 'Wafer Hub' : 'Supplier Depot'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Center Group: Domain Menu & Simulation Chronometer HUD */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {/* Domain Pack Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDomainMenu(!showDomainMenu)}
            className="h-10 px-4 rounded-full bg-white border border-black/15 text-sm font-bold text-[#14170F] hover:bg-black/5 transition-all flex items-center shadow-sm active:scale-95"
            title="Enterprise Domain Pack Switcher"
          >
            <Settings className="w-4 h-4 mr-1.5 text-[#3E6B4F]" />
            <span>Domain: {domainPack === 'manufacturing' ? 'Semiconductor JIT' : 'Healthcare (Oxygen)'}</span>
          </button>
          {showDomainMenu && (
            <div className="absolute left-0 mt-2 w-60 bg-white border border-black/15 rounded-2xl shadow-xl z-40 p-1.5 animate-scale-in">
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
                <span>Healthcare: Oxygen Replenishment</span>
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
                <span>Mfg JIT: Silicon Wafer Logistics</span>
              </button>
            </div>
          )}
        </div>

        {rolePOV === 'coordinator' && (
          <>
            {/* Incident Chronometer HUD */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-black/15 rounded-full shrink-0 font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3E6B4F]" />
                <span className="font-bold text-sm text-[#14170F] whitespace-nowrap">
                  T+{simulationMinute}m
                </span>
                <span className="text-xs text-[#14170F]/60 font-medium hidden lg:inline">
                  (of 300m)
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border hidden xl:inline',
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
              <div className="flex items-center gap-1.5 pl-2 border-l border-black/10">
                <button
                  onClick={() => onAdvanceTime(-15)}
                  disabled={isSimulating || simulationMinute <= 0}
                  className="p-1 rounded-full hover:bg-black/5 text-[#14170F]/70 hover:text-[#14170F] disabled:opacity-30 transition-colors"
                  title="Rewind 15 minutes"
                >
                  <Rewind className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAdvanceTime(15)}
                  disabled={isSimulating || simulationMinute >= 300}
                  className="p-1 rounded-full hover:bg-black/5 text-[#14170F]/70 hover:text-[#14170F] disabled:opacity-30 transition-colors"
                  title="Fast forward 15 minutes"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="hidden 2xl:flex items-center gap-1.5 bg-black/5 border border-black/8 p-1 rounded-full">
              <span className="text-[11px] font-mono font-bold text-[#14170F]/60 px-2 uppercase">Jump:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAdvanceTime(15)}
                  disabled={isSimulating || simulationMinute >= 300}
                  className="text-xs font-bold px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                  title="Advance Simulation +15m"
                >
                  +15m
                </button>
                <button
                  onClick={() => onAdvanceTime(30)}
                  disabled={isSimulating || simulationMinute >= 300}
                  className="text-xs font-bold px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                  title="Advance Simulation +30m"
                >
                  +30m
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Right Group: Scenario Selection, Modals, Reset & Primary Run Rehearsal */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Scenario Selector Dropdown */}
        <div className="relative shrink-0">
          <select
            value={currentScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            disabled={isSimulating}
            className="h-11 px-4 pr-9 rounded-full bg-white border border-black/15 text-sm font-display font-bold text-[#14170F] focus:outline-none focus:border-[#8FD13F] transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-50 min-w-[210px]"
          >
            {Array.from(new Map(scenarios.map((sc) => [sc.id, sc])).values()).map((sc) => {
              const cleanName = (sc.name || '').replace(/â€”|—|–/g, '-').replace(/\s*-\s*/g, ' - ');
              return (
                <option key={sc.id} value={sc.id}>
                  {sc.id} - {cleanName}
                </option>
              );
            })}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#14170F]/60 text-sm font-bold">
            ▾
          </div>
        </div>

        {/* Human Sign-Off Required Button (Animated Pulse) */}
        {hasPendingApproval && onOpenApproval && (
          <button
            onClick={onOpenApproval}
            className="h-10 px-4 rounded-full border border-[#E8A23D] bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 text-xs sm:text-sm font-bold text-[#87550E] transition-all flex items-center gap-1.5 shadow-sm animate-pulse active:scale-95"
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
            className="hidden lg:inline-flex"
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

        {/* Rehearsal Reset Control */}
        {rolePOV === 'coordinator' && (
          <button
            onClick={onReset}
            disabled={isSimulating}
            className="h-11 px-4 rounded-full border border-black/15 bg-white hover:bg-black/5 text-sm font-bold text-[#14170F]/80 hover:text-[#14170F] disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95"
            title="Reset Rehearsal to T+0m"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
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
