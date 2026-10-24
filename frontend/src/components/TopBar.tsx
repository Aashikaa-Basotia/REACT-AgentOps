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
    <header className="min-h-[76px] py-2 px-4 sm:px-6 border-b border-black/10 bg-white/95 backdrop-blur-xl flex items-center justify-between gap-3 z-30 shrink-0 text-[#14170F] shadow-sm overflow-x-auto no-scrollbar">
      {/* 1. Left: Operational Role POV Switcher */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="flex items-center bg-black/[0.04] border border-black/10 p-1 sm:p-1.5 rounded-full shadow-inner">
          <button
            onClick={() => onSelectRolePOV('coordinator')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'coordinator'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title="Regional Coordinator: Command & Geo-Map POV"
          >
            <Building2 className="w-4 h-4 text-[#2D5A1E]" />
            <span className="inline">Coordinator</span>
          </button>
          <button
            onClick={() => onSelectRolePOV('hospital')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'hospital'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title={`${terminology.facilitySingle} Portal`}
          >
            <Hospital className="w-4 h-4 text-[#2D5A1E]" />
            <span className="hidden sm:inline">
              {domainPack === 'manufacturing' ? 'Plant Fab' : 'Hospital Portal'}
            </span>
            <span className="inline sm:hidden">
              {domainPack === 'manufacturing' ? 'Plant' : 'Hospital'}
            </span>
          </button>
          <button
            onClick={() => onSelectRolePOV('supplier')}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95',
              rolePOV === 'supplier'
                ? 'bg-white text-[#14170F] shadow-sm font-display font-black'
                : 'text-[#14170F]/65 hover:text-[#14170F] font-bold'
            )}
            title={`${terminology.supplierSingle} Ledger`}
          >
            <Factory className="w-4 h-4 text-[#2D5A1E]" />
            <span className="hidden sm:inline">
              {domainPack === 'manufacturing' ? 'Wafer Hub' : 'Supplier Depot'}
            </span>
            <span className="inline sm:hidden">
              {domainPack === 'manufacturing' ? 'Hub' : 'Supplier'}
            </span>
          </button>
        </div>

        {/* Domain Switcher */}
        {isCoordinator && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDomainMenu(!showDomainMenu)}
              className="h-10 px-3 sm:px-3.5 rounded-full bg-white border border-black/15 text-xs sm:text-sm font-bold text-[#14170F] hover:bg-black/5 transition-all flex items-center shadow-sm active:scale-95"
              title="Enterprise Domain Pack Switcher"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5 text-[#2D5A1E]" />
              <span className="hidden lg:inline">Domain: </span>
              <span>{domainPack === 'manufacturing' ? 'Semiconductor' : 'Healthcare'}</span>
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
        )}
      </div>

      {/* 2. Middle: Grand REACT Title Button (Expands to fill center space in Hospital/Supplier mode) */}
      <div className={cn(
        "flex items-center justify-center transition-all duration-500 ease-in-out shrink-0 mx-2",
        isCoordinator ? "gap-2.5" : "flex-1 px-4"
      )}>
        {/* Title Button with Big Fonts */}
        <button
          onClick={onToggleHero}
          className={cn(
            "flex items-center rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] border border-black/10 transition-all cursor-pointer group shadow-sm active:scale-95 select-none shrink-0",
            isCoordinator ? "gap-2.5 px-3.5 py-1.5" : "gap-3.5 px-6 py-2.5 animate-fadeIn"
          )}
          title="REACT: Resource Evaluation Against Compound Threats — Click for Interactive Protocol Overview"
        >
          <div className={cn("rounded-full bg-[#5B9C20] animate-pulse shrink-0", isCoordinator ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} />
          <span className={cn(
            "font-display font-black text-[#14170F] tracking-tight group-hover:text-[#2D5A1E] transition-colors shrink-0",
            isCoordinator ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
          )}>
            REACT
          </span>
          <span className="text-black/25 text-base sm:text-xl font-bold shrink-0">|</span>
          <span className={cn(
            "font-display font-extrabold text-[#14170F]/80 tracking-wide truncate",
            isCoordinator ? "text-xs sm:text-sm hidden lg:inline max-w-[220px] 2xl:max-w-none" : "text-sm sm:text-base inline"
          )}>
            Resource Evaluation Against Compound Threats
          </span>
        </button>

        {/* Incident Chronometer HUD */}
        {isCoordinator && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black/15 rounded-full shrink-0 font-mono shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#2D5A1E]" />
            <span className="font-black text-xs sm:text-sm text-[#14170F] whitespace-nowrap">
              T+{simulationMinute}m
            </span>
            <div className="flex items-center gap-1 pl-1.5 border-l border-black/10">
              <button
                onClick={() => onAdvanceTime(15)}
                disabled={isSimulating || simulationMinute >= 300}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                title="Advance Simulation +15m"
              >
                +15m
              </button>
              <button
                onClick={() => onAdvanceTime(30)}
                disabled={isSimulating || simulationMinute >= 300}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/5 hover:bg-black/10 text-[#14170F] transition-colors disabled:opacity-30 active:scale-95"
                title="Advance Simulation +30m"
              >
                +30m
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: Case Selection Dropdown + Contextual Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Case Selection Dropdown (Swapped to Right Section!) */}
        <div className="relative shrink-0">
          <select
            value={currentScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            disabled={isSimulating}
            className="h-10 px-3 pr-8 rounded-full bg-white border border-black/15 text-xs sm:text-sm font-display font-bold text-[#14170F] focus:outline-none focus:border-[#8FD13F] transition-all cursor-pointer appearance-none shadow-sm disabled:opacity-50 w-36 sm:w-44 md:w-48 truncate"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.id} — {sc.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#14170F]/60 text-xs font-bold">
            ▾
          </div>
        </div>

        {/* Action Buttons: Only Shown in Coordinator Mode; Removed in Hospital & Supplier Mode */}
        {isCoordinator && (
          <>
            {/* Human Sign-Off Required Button */}
            {hasPendingApproval && onOpenApproval && (
              <button
                onClick={onOpenApproval}
                className="h-10 px-3 rounded-full border border-[#E8A23D] bg-[#E8A23D]/20 hover:bg-[#E8A23D]/30 text-xs font-bold text-[#87550E] transition-all flex items-center gap-1.5 shadow-sm animate-pulse active:scale-95 shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#E8A23D]" />
                <span className="hidden sm:inline">Sign-Off</span>
              </button>
            )}

            {/* Data Ingestion Shield Button */}
            {onOpenIngestion && (
              <PillButton
                variant="secondary"
                size="sm"
                onClick={() => onOpenIngestion('supplier')}
                icon={<Upload className="w-3.5 h-3.5 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Ingest Live Crisis Telemetry & CSV"
              >
                <span className="hidden xl:inline">Ingest</span>
              </PillButton>
            )}

            {/* Debrief Card Button */}
            {hasDebrief && (
              <PillButton
                variant="secondary"
                size="sm"
                onClick={onOpenDebrief}
                icon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Operational Debrief Card"
              >
                <span className="hidden xl:inline">Debrief</span>
              </PillButton>
            )}

            {/* Responsible AI & Governance Shield */}
            {onOpenGovernance && (
              <PillButton
                variant="secondary"
                size="sm"
                onClick={onOpenGovernance}
                icon={<ShieldCheck className="w-3.5 h-3.5 text-[#3E6B4F]" />}
                className="shrink-0"
                title="NIST AI RMF Governance, RBAC Isolation & Prompt Firewall"
              >
                <span className="hidden 2xl:inline">Governance & RBAC</span>
                <span className="hidden xl:inline 2xl:hidden">Governance</span>
              </PillButton>
            )}

            {/* Enterprise Accelerator Pattern */}
            {onOpenCgiAccelerator && (
              <PillButton
                variant="secondary"
                size="sm"
                onClick={onOpenCgiAccelerator}
                icon={<Layers className="w-3.5 h-3.5 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Enterprise Accelerator Pattern & Cross-Industry Blueprint"
              >
                <span className="hidden 2xl:inline">Industry Patterns</span>
                <span className="hidden xl:inline 2xl:hidden">Patterns</span>
              </PillButton>
            )}

            {/* Executive ROI & Chaos Audit Button */}
            {onOpenAnalytics && (
              <PillButton
                variant="secondary"
                size="sm"
                onClick={onOpenAnalytics}
                icon={<TrendingUp className="w-3.5 h-3.5 text-[#3E6B4F]" />}
                className="shrink-0"
                title="Executive ROI, 3-Way Benchmarks & Crisis Chaos Audit"
              >
                <span className="hidden 2xl:inline">Audit & ROI</span>
                <span className="hidden xl:inline 2xl:hidden">Audit</span>
              </PillButton>
            )}
          </>
        )}

        {/* Rehearsal Reset Control (Placed right next to Run Simulation button!) */}
        <button
          onClick={onReset}
          disabled={isSimulating}
          className="h-10 px-3 sm:px-3.5 rounded-full border border-black/15 bg-white hover:bg-black/5 text-xs sm:text-sm font-bold text-[#14170F]/80 hover:text-[#14170F] disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95"
          title="Reset Rehearsal to T+0m"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Primary CTA: Run Simulation / Run Rehearsal */}
        <PillButton
          variant="primary"
          size="md"
          onClick={onRunRehearsal}
          disabled={isSimulating}
          className="shrink-0"
          icon={
            isSimulating ? (
              <Activity className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )
          }
        >
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </PillButton>
      </div>
    </header>
  );
};
