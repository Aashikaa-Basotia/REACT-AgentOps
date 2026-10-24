import React, { useState } from 'react';
import {
  Compass,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Play,
  ShieldCheck,
  Zap,
  Layers,
  Upload,
  FileCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EvaluatorTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (id: string) => void;
  onOpenIngestion: () => void;
  onRunRehearsal: () => void;
  onOpenDebrief: () => void;
  onOpenApproval: () => void;
  onOpenGovernance: () => void;
  currentScenarioId: string;
  hasDebrief: boolean;
  hasPendingApproval: boolean;
  isSimulating: boolean;
}

export const EvaluatorTourGuide: React.FC<EvaluatorTourGuideProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  onOpenIngestion,
  onRunRehearsal,
  onOpenDebrief,
  onOpenApproval,
  currentScenarioId,
  hasDebrief,
  hasPendingApproval,
  isSimulating,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Step 1: Compound Crisis Induction',
      subtitle: 'Load Scenario SC-02 (Flash Flood Disrupts East Arterial Corridor)',
      desc: 'Observe the Bellandur flood corridor turn red on the GIS map. The low-lying eastern route from Hoskote depot is blocked, stranding conventional dispatches.',
      actionLabel: '1. Load Scenario SC-02 Now',
      actionIcon: <Layers className="w-5 h-5 text-emerald-800" />,
      onExecute: () => onSelectScenario('SC-02'),
      isCompleted: currentScenarioId === 'SC-02',
    },
    {
      title: 'Step 2: Adversarial Emergency Ingestion',
      subtitle: 'Ingest Unstructured Crisis Dispatch & Verify Prompt Firewall',
      desc: 'Open the Live Crisis Data Ingestion Shield. Observe how the governance shield sanitizes incoming unstructured radio/SMS dispatches and shields against adversarial prompt injection.',
      actionLabel: '2. Open Ingestion & Governance Shield',
      actionIcon: <Upload className="w-5 h-5 text-sky-800" />,
      onExecute: () => onOpenIngestion(),
      isCompleted: false,
    },
    {
      title: 'Step 3: Multi-Agent Rehearsal Synthesis',
      subtitle: 'Google Gemini Sub-Agents Deliberate & Formulate Feasible Plan',
      desc: 'Trigger the Multi-Agent Rehearsal Engine. Facility, Supply, and Supervisor agents negotiate across reachable corridors to eliminate hospital deficits without overcommitting supply.',
      actionLabel: '3. Run Multi-Agent Rehearsal',
      actionIcon: <Play className="w-5 h-5 fill-current text-emerald-800" />,
      onExecute: () => onRunRehearsal(),
      isCompleted: hasDebrief || hasPendingApproval,
    },
    {
      title: 'Step 4: Formal Invariant Verification',
      subtitle: 'Inspect Mathematical Invariant Proof: A_s = Q_s - ∑ q_r ≥ 0',
      desc: 'Open the Verification Debrief. Review the 7 deterministic mathematical invariant proofs confirming zero overcommitment, unswamped routes, and arrival prior to hospital exhaustion deadlines.',
      actionLabel: '4. View Formal Invariant Debrief',
      actionIcon: <FileCheck className="w-5 h-5 text-teal-800" />,
      onExecute: () => onOpenDebrief(),
      isCompleted: hasDebrief,
    },
    {
      title: 'Step 5: Optimistic Concurrency & Sign-Off',
      subtitle: 'Test Real-World Stock Drift & Commit Final Allocations',
      desc: 'Open the Coordinator Sign-Off Gate. Click "Simulate State Drift" to test optimistic concurrency protection (OCC), then approve the verified allocation to lock physical inventory reservations.',
      actionLabel: '5. Open Coordinator Sign-Off Gate',
      actionIcon: <ShieldCheck className="w-5 h-5 text-amber-800" />,
      onExecute: () => onOpenApproval(),
      isCompleted: false,
    },
  ];

  const step = steps[currentStep];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-lg bg-white/95 border-2 border-[#8FD13F] rounded-3xl shadow-2xl p-5 backdrop-blur-xl animate-in slide-in-from-bottom-5 text-[#14170F] font-sans">
      {/* Tour Header */}
      <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#8FD13F]/20 border border-[#8FD13F]/40 text-[#2D5A1E]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wide text-[#2D5A1E] block font-mono">
              Evaluator Guided Walkthrough ({currentStep + 1} of {steps.length})
            </span>
            <h4 className="font-black text-sm sm:text-base text-[#14170F]">
              {step.title}
            </h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-[#14170F]/50 hover:text-[#14170F] rounded-xl hover:bg-black/5 transition-colors"
          title="Exit Walkthrough"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tour Body */}
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-black/10 space-y-1.5">
          <div className="font-bold text-xs sm:text-sm text-sky-800">
            {step.subtitle}
          </div>
          <p className="text-xs sm:text-sm text-[#14170F]/80 leading-relaxed">
            {step.desc}
          </p>
        </div>

        {/* Primary Interactive 1-Click Action Button */}
        <button
          onClick={() => {
            step.onExecute();
          }}
          disabled={isSimulating}
          className="w-full h-12 px-5 rounded-2xl bg-[#8FD13F] hover:bg-[#80bd38] text-[#14170F] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#8FD13F]/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {step.actionIcon}
          <span>{step.actionLabel}</span>
          <ArrowRight className="w-4 h-4 ml-1 text-[#14170F]" />
        </button>
      </div>

      {/* Tour Navigation Controls */}
      <div className="flex items-center justify-between border-t border-black/10 pt-3 mt-3">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-[#14170F] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                currentStep === idx
                  ? "w-6 bg-[#2D5A1E]"
                  : idx < currentStep
                  ? "w-2.5 bg-[#8FD13F]"
                  : "w-2.5 bg-black/15 hover:bg-black/30"
              )}
              title={`Jump to Step ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStep === steps.length - 1}
          className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-[#14170F] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
