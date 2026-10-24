import React, { useState } from 'react';
import { HospitalData, RouteData, HospitalRequest } from '../types';
import { BENGALURU_HOSPITALS_REGISTRY, BengaluruHospitalRecord } from '../data/bengaluruRegistry';
import {
  Hospital,
  AlertTriangle,
  Clock,
  Droplet,
  Send,
  CheckCircle2,
  PhoneCall,
  UserCheck,
  Navigation,
  FileText,
} from 'lucide-react';

interface HospitalPortalViewProps {
  scenarioId: string;
  activeHospitals: HospitalData[];
  activeRoutes: RouteData[];
  simulationMinute: number;
  initialHospitalId?: string;
  registryHospitals?: any[];
  hospitalRequests?: HospitalRequest[];
  onSelectHospital?: (hospitalId: string) => void;
  onHospitalRequestSubmitted?: () => void;
  onEventsUpdated?: (events: any[]) => void;
}

export const HospitalPortalView: React.FC<HospitalPortalViewProps> = ({
  scenarioId,
  activeHospitals,
  activeRoutes,
  simulationMinute,
  initialHospitalId = 'H1',
  registryHospitals = [],
  hospitalRequests = [],
  onSelectHospital,
  onHospitalRequestSubmitted,
  onEventsUpdated,
}) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(initialHospitalId);

  // Form State
  const [formFacilityId, setFormFacilityId] = useState<string>(initialHospitalId);
  const [formResourceType, setFormResourceType] = useState<string>('liquid_oxygen');
  const [formQuantity, setFormQuantity] = useState<number>(4);
  const [formDeadline, setFormDeadline] = useState<number>(simulationMinute + 90);
  const [formPriority, setFormPriority] = useState<'CRITICAL' | 'URGENT' | 'ROUTINE'>('CRITICAL');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active scenario hospital or fallback to registry record
  const activeHospital = activeHospitals.find(h => h.id === selectedHospitalId);
  const registryList: BengaluruHospitalRecord[] =
    registryHospitals.length > 0 ? (registryHospitals as BengaluruHospitalRecord[]) : BENGALURU_HOSPITALS_REGISTRY;

  const registryRecord =
    registryList.find(h => h.id === selectedHospitalId || (h as any).scenario_id === selectedHospitalId || (h as any).scenarioId === selectedHospitalId) ||
    registryList[0];

  const displayName = activeHospital ? activeHospital.name : registryRecord?.name || selectedHospitalId;
  const requested = activeHospital?.requested_batches || registryRecord?.daily_consumption_batches || 8;
  const onHand = activeHospital?.on_hand || 0;
  const received = activeHospital?.received || 0;
  const allocated = activeHospital?.allocated_batches || 0;
  const currentTotal = onHand + received + allocated;
  const deficit = Math.max(0, requested - currentTotal);
  const deadline = activeHospital?.deadline_minutes || 120;
  const timeRemaining = Math.max(0, deadline - simulationMinute);
  const tankPercentage = Math.min(100, Math.round((currentTotal / Math.max(1, requested)) * 100));

  const inboundRoutes = activeRoutes.filter(r => r.hospital_id === selectedHospitalId);

  // Demands for active hospital
  const seededDemand = activeHospital?.seeded_batches ?? requested;
  const submittedDemand = activeHospital?.submitted_batches ?? 0;

  // Filter requests submitted specifically for this active facility
  const facilityRequests = hospitalRequests.filter(r => r.hospital_id === selectedHospitalId);

  // Check if current scenario contains facilities outside Bengaluru (e.g. SC-07)
  const isInterRegional = activeHospitals.some(h => (h.lat && h.lat > 14) || (h.lng && (h.lng > 78 || h.lng < 77)));

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const resp = await fetch(`/api/session/${scenarioId}/hospital_request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_id: formFacilityId,
          resource_type: formResourceType,
          quantity_batches: formQuantity,
          deadline_minutes: formDeadline,
          priority: formPriority,
          clinical_notes: formNotes,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitSuccess(data.request);
      setFormNotes('');

      if (data.events && onEventsUpdated) {
        onEventsUpdated(data.events);
      }

      if (onHospitalRequestSubmitted) {
        onHospitalRequestSubmitted();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error communicating with simulation backend');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex-1 flex flex-col p-6 sm:p-10 space-y-8 bg-transparent text-[#14170F] font-sans">
      {/* Top Hospital Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/90 backdrop-blur-md border border-black/10 p-7 sm:p-8 rounded-3xl shadow-md">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#8FD13F]/25 border border-[#8FD13F]/50 flex items-center justify-center text-[#2D5A1E] font-bold shadow-sm shrink-0">
            <Hospital className="w-7 h-7 text-[#2D5A1E]" />
          </div>
          <div>
            <div className="text-sm uppercase font-extrabold tracking-widest text-[#2E7D32]">
              Facility Command & Replenishment Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#14170F] flex items-center gap-3 mt-1 flex-wrap">
              <span>{displayName}</span>
              {activeHospital ? (
                <span className="text-sm font-mono font-bold bg-[#D9534F]/15 text-[#8C2421] border border-[#D9534F]/30 px-3.5 py-1 rounded-full">
                  Active Crisis Node ({activeHospital.id})
                </span>
              ) : (
                <span className="text-sm font-mono font-bold bg-[#8FD13F]/20 text-[#2D5A1E] border border-[#8FD13F]/40 px-3.5 py-1 rounded-full">
                  Nominal Registry ({registryRecord?.oxygen_buffer_hours ? `${registryRecord.oxygen_buffer_hours}h Buffer` : 'Nominal Buffer'})
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Right Facility POV Selector */}
        <div className="flex items-center gap-3.5">
          <label className="text-base font-bold text-[#14170F] whitespace-nowrap">Active Facility POV:</label>
          <select
            value={selectedHospitalId}
            onChange={e => {
              const val = e.target.value;
              setSelectedHospitalId(val);
              setFormFacilityId(val);
              setSubmitSuccess(null);
              setSubmitError(null);
              if (onSelectHospital) onSelectHospital(val);
            }}
            className="bg-white border border-black/20 text-[#14170F] text-base rounded-2xl px-4 py-3 focus:outline-none focus:border-[#8FD13F] font-bold shadow-sm min-w-[280px] max-w-[380px] h-13"
          >
            <optgroup label="Scenario Facilities">
              {activeHospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.id} — {h.name} ({h.zone})
                </option>
              ))}
            </optgroup>
            {!isInterRegional && (
              <optgroup label="Bengaluru City Registry (Nominal Buffer)">
                {registryList
                  .filter(h => {
                    const scId = (h as any).scenario_id || (h as any).scenarioId || '';
                    return !activeHospitals.some(ah => ah.id === h.id || ah.id === scId);
                  })
                  .map(h => (
                    <option key={h.id} value={h.id}>
                      {h.id} — {h.name} ({h.zone})
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* SECTION 1: Interactive Hospital Request Entry Form */}
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 sm:p-8 shadow-md">
        <div className="flex items-center justify-between border-b border-black/10 pb-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8FD13F]/25 border border-[#8FD13F]/50 flex items-center justify-center text-[#2D5A1E] shrink-0">
              <Send className="w-6 h-6 text-[#2D5A1E]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-black tracking-wide text-[#14170F] flex items-center gap-3">
                <span>Submit Hospital Resource Request</span>
                <span className="text-xs sm:text-sm font-mono bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40 px-3 py-1 rounded-full font-bold">
                  Authoritative Backend Persistence
                </span>
              </h2>
              <p className="text-base text-[#14170F]/70 mt-1">
                Directly enters urgent replenishment demand into the Regional Coordinator's planning pipeline.
              </p>
            </div>
          </div>
          <span className="text-base font-mono font-black text-[#14170F]/70 bg-black/5 px-3.5 py-1.5 rounded-xl border border-black/10">
            Clock: T+{simulationMinute}m
          </span>
        </div>

        {/* Feedback Banners */}
        {submitSuccess && (
          <div className="mb-5 p-4 rounded-xl bg-[#8FD13F]/20 border border-[#8FD13F]/50 text-[#2D5A1E] text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-[#5B9C20] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Request {submitSuccess.request_id} Successfully Persisted!</span>
                <span className="text-xs bg-[#8FD13F]/30 text-[#2D5A1E] px-2 py-0.5 rounded font-mono font-bold">
                  Status: {submitSuccess.status}
                </span>
              </div>
              <p className="text-xs text-[#2D5A1E]/90">
                Committed {submitSuccess.quantity_batches} batches of {submitSuccess.resource_type} for {submitSuccess.hospital_name} with deadline T+{submitSuccess.deadline_minutes}m. Coordinator queue updated.
              </p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 rounded-2xl bg-[#D9534F]/15 border border-[#D9534F]/40 text-[#8C2421] text-base flex items-start gap-3 shadow-xs animate-fadeIn">
            <AlertTriangle className="w-6 h-6 text-[#D9534F] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-base">Validation or Submission Failure</div>
              <p className="text-sm text-[#8C2421] mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Facility Selection */}
          <div className="col-span-12 sm:col-span-4">
            <label className="block text-base font-bold text-[#14170F] mb-2">
              Requesting Healthcare Facility
            </label>
            <select
              value={formFacilityId}
              onChange={e => setFormFacilityId(e.target.value)}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base font-bold text-[#14170F] focus:outline-none focus:border-[#8FD13F] shadow-sm"
            >
              <optgroup label="Active Scenario Facilities">
                {activeHospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.id} — {h.name}
                  </option>
                ))}
              </optgroup>
              {!isInterRegional && (
                <optgroup label="Registered Facilities">
                  {registryList
                    .filter(h => !activeHospitals.some(ah => ah.id === h.id))
                    .map(h => (
                      <option key={h.id} value={h.id}>
                        {h.id} — {h.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Resource Type */}
          <div className="col-span-12 sm:col-span-4">
            <label className="block text-base font-bold text-[#14170F] mb-2">
              Resource Commodity Type
            </label>
            <select
              value={formResourceType}
              onChange={e => setFormResourceType(e.target.value)}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base font-semibold text-[#14170F] focus:outline-none focus:border-[#8FD13F] shadow-sm"
            >
              <option value="liquid_oxygen">Liquid Medical Oxygen (Cryogenic Batches)</option>
              <option value="oxygen_batches">High-Pressure Oxygen Cylinders</option>
              {isInterRegional && (
                <option value="wafer_lots">Silicon Wafers (300mm Prime Lots)</option>
              )}
            </select>
          </div>

          {/* Quantity */}
          <div className="col-span-6 sm:col-span-2">
            <label className="block text-base font-bold text-[#14170F] mb-2">
              Required Batches
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={formQuantity}
              onChange={e => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base font-mono font-black text-[#14170F] focus:outline-none focus:border-[#8FD13F] shadow-sm"
            />
          </div>

          {/* Deadline */}
          <div className="col-span-12 sm:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-[#14170F]">
                Deadline (T+min)
              </label>
              <span className="text-sm font-mono text-[#87550E] font-bold">
                +{Math.max(0, formDeadline - simulationMinute)}m from now
              </span>
            </div>
            <input
              type="number"
              min={simulationMinute + 15}
              max={360}
              step={15}
              value={formDeadline}
              onChange={e => setFormDeadline(parseInt(e.target.value) || simulationMinute + 90)}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base font-mono font-black text-[#87550E] focus:outline-none focus:border-[#8FD13F] shadow-sm"
            />
            {/* Quick-Preset Chips */}
            <div className="flex items-center gap-2 mt-2.5">
              {[30, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setFormDeadline(simulationMinute + mins)}
                  className={`text-sm font-mono font-bold px-3 py-1 rounded-xl border transition-colors cursor-pointer ${
                    formDeadline === simulationMinute + mins
                      ? 'bg-[#E8A23D]/25 text-[#87550E] border-[#E8A23D] font-black'
                      : 'bg-black/5 text-[#14170F]/70 border-black/10 hover:text-[#14170F]'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Urgency / Priority */}
          <div className="col-span-12 sm:col-span-4">
            <label className="block text-base font-bold text-[#14170F] mb-2">
              Clinical Triage Priority
            </label>
            <select
              value={formPriority}
              onChange={e => setFormPriority(e.target.value as any)}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base font-semibold text-[#14170F] focus:outline-none focus:border-[#8FD13F] shadow-sm"
            >
              <option value="CRITICAL">CRITICAL — Depletion Imminent (&lt;60m margin)</option>
              <option value="URGENT">URGENT — Severe Deficit Predicted (&lt;120m margin)</option>
              <option value="ROUTINE">ROUTINE — Standard Scheduled Replenishment</option>
            </select>
          </div>

          {/* Clinical Notes */}
          <div className="col-span-12 sm:col-span-5">
            <label className="block text-base font-bold text-[#14170F] mb-2">
              Clinical Situation / Emergency Notes
            </label>
            <input
              type="text"
              placeholder="e.g. ICU burn rate surged 150%; road flooding isolated southern gate..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full h-13 px-4 bg-white border border-black/20 rounded-2xl text-base text-[#14170F] placeholder-[#14170F]/40 focus:outline-none focus:border-[#8FD13F] shadow-sm"
            />
          </div>

          {/* Submit Action */}
          <div className="col-span-12 sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 sm:h-14 bg-[#8FD13F] hover:bg-[#7ec032] disabled:opacity-50 text-[#14170F] font-black text-base sm:text-lg rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send className="w-5 h-5 text-[#2D5A1E]" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Active & Historical Requests Ledger */}
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-5 mb-5 gap-3">
          <h3 className="text-lg sm:text-xl font-display font-black tracking-wide text-[#14170F] flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#2D5A1E]" />
            <span>Submitted Hospital Requests for {displayName}</span>
            <span className="text-sm font-mono bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/40 px-3.5 py-1 rounded-full font-bold">
              {facilityRequests.length} Dynamic Requests Recorded
            </span>
          </h3>
          <span className="text-base font-mono font-semibold text-[#14170F]/70">
            Seeded Baseline: {seededDemand}b | Dynamic Submitted: {submittedDemand}b
          </span>
        </div>

        {facilityRequests.length === 0 ? (
          <div className="p-10 text-center text-[#14170F]/60 text-base bg-black/[0.02] rounded-2xl border border-dashed border-black/15">
            No dynamic requests submitted yet for this facility. Baseline scenario demand is {seededDemand} batches.
            Use the form above to submit additional emergency requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base font-mono">
              <thead>
                <tr className="border-b border-black/10 text-sm uppercase text-[#14170F]/70 bg-black/[0.03] font-bold">
                  <th className="py-4 px-4">Request ID</th>
                  <th className="py-4 px-4">Commodity</th>
                  <th className="py-4 px-4">Quantity</th>
                  <th className="py-4 px-4">Deadline</th>
                  <th className="py-4 px-4">Priority</th>
                  <th className="py-4 px-4">Submitted At</th>
                  <th className="py-4 px-4">Lifecycle Status</th>
                  <th className="py-4 px-4">Allocated Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {facilityRequests.map(r => (
                  <tr key={r.request_id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#2D5A1E]">{r.request_id}</td>
                    <td className="py-4 px-4 text-[#14170F] font-semibold">{r.resource_type}</td>
                    <td className="py-4 px-4 font-black text-[#14170F]">{r.quantity_batches} batches</td>
                    <td className="py-4 px-4 text-[#87550E] font-bold">T+{r.deadline_minutes}m</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        r.priority === 'CRITICAL'
                          ? 'bg-[#D9534F]/20 text-[#8C2421] border border-[#D9534F]/40'
                          : r.priority === 'URGENT'
                          ? 'bg-[#E8A23D]/20 text-[#87550E] border border-[#E8A23D]/40'
                          : 'bg-black/5 text-[#14170F]/80'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#14170F]/60">T+{r.created_at_minute}m</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        r.status === 'ALLOCATED'
                          ? 'bg-[#8FD13F]/25 text-[#2D5A1E] border border-[#8FD13F]/50'
                          : r.status === 'ALLOCATING' || r.status === 'PENDING_APPROVAL'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse'
                          : r.status === 'FULFILLED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-[#E8A23D]/25 text-[#87550E] border border-[#E8A23D]/40'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-[#2D5A1E] text-base">
                      {r.allocated_batches} / {r.quantity_batches} batches
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: Live Buffer Telemetry & Critical Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tank Level Gauge */}
        <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
            <h3 className="text-base font-display font-black uppercase tracking-wider text-[#14170F] flex items-center gap-2.5">
              <Droplet className="w-5 h-5 text-[#2D5A1E]" />
              <span>Cryogenic Tank Buffer</span>
            </h3>
            <span className={`text-sm font-mono font-bold px-3 py-1.5 rounded-full ${
              tankPercentage > 50 ? 'bg-[#8FD13F]/25 text-[#2D5A1E]' : 'bg-[#D9534F]/20 text-[#8C2421]'
            }`}>
              {tankPercentage}% Buffer
            </span>
          </div>

          <div className="my-auto py-3">
            <div className="flex items-center justify-between text-base font-mono text-[#14170F]/80 mb-2.5 font-bold">
              <span>On-Hand: {currentTotal} batches</span>
              <span>Total Demand: {requested} batches</span>
            </div>
            <div className="w-full h-9 bg-black/[0.04] rounded-2xl p-1 border border-black/10 relative overflow-hidden">
              <div
                className={`h-full rounded-xl transition-all duration-500 ${
                  tankPercentage > 50
                    ? 'bg-gradient-to-r from-[#8FD13F] to-[#5B9C20]'
                    : 'bg-gradient-to-r from-[#D9534F] to-[#E8A23D] animate-pulse'
                }`}
                style={{ width: `${Math.max(8, tankPercentage)}%` }}
              />
            </div>
            <div className="mt-3 text-center font-mono text-sm text-[#14170F]/70 font-semibold">
              Capacity: {registryRecord.bed_count} beds ({registryRecord.icu_beds} ICU Beds Active)
            </div>
          </div>

          <div className="border-t border-black/10 pt-4 text-base text-[#14170F]/70 flex items-center justify-between">
            <span className="font-semibold">Demand Composition:</span>
            <span className="font-mono text-sm font-bold text-[#14170F]">
              {seededDemand} seeded + {submittedDemand} submitted
            </span>
          </div>
        </div>

        {/* Depletion Countdown Clock */}
        <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
            <h3 className="text-base font-display font-black uppercase tracking-wider text-[#14170F] flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-[#87550E]" />
              <span>Deadline Window</span>
            </h3>
            <span className="text-sm font-mono bg-black/5 text-[#14170F]/70 px-3 py-1.5 rounded-full font-bold">
              T+{simulationMinute}m Current
            </span>
          </div>

          <div className="my-auto text-center py-4">
            <div className="text-5xl font-stat font-black text-[#87550E] tracking-tight">
              T+{deadline}m
            </div>
            <p className="text-base text-[#14170F]/70 mt-1.5 font-semibold">
              Replenishment Must Arrive Before Depletion
            </p>
            <div className="mt-3.5 inline-block bg-[#E8A23D]/20 border border-[#E8A23D]/40 px-4 py-1.5 rounded-full text-sm font-mono font-black text-[#87550E]">
              {timeRemaining > 0 ? `${timeRemaining} minutes remaining in margin` : 'DEADLINE REACHED'}
            </div>
          </div>

          <div className="border-t border-black/10 pt-4 text-base text-[#14170F]/70 flex items-center justify-between">
            <span className="font-semibold">Net Deficit:</span>
            <span className={`font-mono text-base font-black ${deficit > 0 ? 'text-[#8C2421]' : 'text-[#2D5A1E]'}`}>
              {deficit > 0 ? `-${deficit} batches needed` : 'Replenishment Fully Covered'}
            </span>
          </div>
        </div>

        {/* Nodal Officer Contact & Facility Vitals */}
        <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
            <h3 className="text-base font-display font-black uppercase tracking-wider text-[#14170F] flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-[#2D5A1E]" />
              <span>Facility Profile</span>
            </h3>
            <span className="text-sm font-mono text-[#14170F]/70 font-bold">
              {registryRecord.type}
            </span>
          </div>

          <div className="space-y-3 text-base text-[#14170F] py-1">
            <div>
              <span className="text-[#14170F]/60 block text-xs uppercase font-extrabold tracking-wider">Zone Location</span>
              <span className="font-black text-lg text-[#14170F]">{registryRecord.zone}</span>
            </div>
            <div>
              <span className="text-[#14170F]/60 block text-xs uppercase font-extrabold tracking-wider">Address</span>
              <span className="font-semibold text-[#14170F]/85 text-sm line-clamp-1">{registryRecord.address}</span>
            </div>
            <div>
              <span className="text-[#14170F]/60 block text-xs uppercase font-extrabold tracking-wider">Designated Nodal Officer</span>
              <span className="font-black text-lg text-[#2D5A1E]">{registryRecord.nodal_officer}</span>
            </div>
          </div>

          <div className="border-t border-black/10 pt-4 text-base text-[#14170F]/70 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <PhoneCall className="w-5 h-5 text-[#2D5A1E]" /> Emergency Ops:
            </span>
            <span className="font-mono font-black text-base sm:text-lg text-[#14170F]">{registryRecord.phone}</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Inbound Supply Corridors & Active Deliveries */}
      <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-3xl p-7 sm:p-8 shadow-md">
        <h3 className="text-lg sm:text-xl font-display font-black tracking-wide text-[#14170F] mb-5 flex items-center gap-3">
          <Navigation className="w-5 h-5 text-[#2D5A1E]" />
          <span>Inbound Supply Corridors & Delivery Reservations</span>
          <span className="text-sm font-mono bg-black/5 text-[#14170F]/70 px-3 py-1 rounded-full font-bold">
            {inboundRoutes.length} Connected Routes
          </span>
        </h3>

        {inboundRoutes.length === 0 ? (
          <div className="p-10 text-center text-[#14170F]/60 text-base bg-black/[0.02] rounded-2xl border border-dashed border-black/15">
            No active emergency routes connected in the current scenario.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {inboundRoutes.map(r => (
              <div
                key={r.id}
                className="p-5 rounded-2xl border border-black/10 bg-[#F8F9F5]/80 flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-base font-black text-[#14170F]">
                      {r.supplier_id} → {r.hospital_id}
                    </span>
                    <span className={`text-sm uppercase font-bold px-3 py-1 rounded-full ${
                      r.status === 'open' ? 'bg-[#8FD13F]/25 text-[#2D5A1E]' : 'bg-[#D9534F]/20 text-[#8C2421]'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-base font-bold text-[#14170F]/85">
                    {r.corridor_name || `Transit Route ${r.id}`}
                  </div>
                  <div className="text-sm font-mono text-[#14170F]/65 mt-1 font-semibold">
                    Travel Time: {r.travel_minutes} min {r.delay_minutes > 0 ? `(+${r.delay_minutes}m delay)` : ''} | Max Capacity: {r.capacity_batches} batches
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs block text-[#14170F]/60 uppercase font-extrabold tracking-wider">Allocated</span>
                  <span className="font-stat font-black text-xl sm:text-2xl text-[#2D5A1E]">
                    {r.active_batches ?? 0} batches
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
