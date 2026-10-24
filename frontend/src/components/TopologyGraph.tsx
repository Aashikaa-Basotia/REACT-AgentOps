import React, { useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { HospitalNode } from './nodes/HospitalNode';
import { SupplierNode } from './nodes/SupplierNode';
import { RouteEdge } from './edges/RouteEdge';
import { HospitalData, SupplierData, RouteData } from '../types';
import { Network, Activity, Filter, Layers, Maximize2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TopologyGraphProps {
  hospitals: HospitalData[];
  suppliers: SupplierData[];
  routes: RouteData[];
  simulationMinute: number;
}

const nodeTypes = {
  hospitalNode: HospitalNode,
  supplierNode: SupplierNode,
};

const edgeTypes = {
  routeEdge: RouteEdge,
};

const TopologyGraphInner: React.FC<TopologyGraphProps> = ({
  hospitals,
  suppliers,
  routes,
  simulationMinute,
}) => {
  const { fitView } = useReactFlow();
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'disrupted'>('all');
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 400, y: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Filter routes based on mode
  const filteredRoutes = useMemo(() => {
    if (filterMode === 'active') {
      return routes.filter((r) => (r.active_batches ?? 0) > 0 || r.status === 'open');
    }
    if (filterMode === 'disrupted') {
      return routes.filter((r) => r.status === 'blocked' || r.status === 'delayed' || (r.delay_minutes ?? 0) > 0);
    }
    return routes;
  }, [routes, filterMode]);

  // Build React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const nodeList: Node[] = [];

    // Left Column: Suppliers
    suppliers.forEach((s, idx) => {
      nodeList.push({
        id: s.id,
        type: 'supplierNode',
        position: { x: 40, y: 80 + idx * 210 },
        data: s,
      });
    });

    // Right Column: Hospitals
    hospitals.forEach((h, idx) => {
      nodeList.push({
        id: h.id,
        type: 'hospitalNode',
        position: { x: 620, y: 50 + idx * 175 },
        data: h,
      });
    });

    return nodeList;
  }, [suppliers, hospitals]);

  // Build React Flow edges
  const edges: Edge[] = useMemo(() => {
    return filteredRoutes.map((r) => {
      const isAlt = r.id.includes('ALT');
      const hasActive = (r.active_batches ?? 0) > 0;
      const isBlocked = r.status === 'blocked';
      const isDelayed = r.status === 'delayed' || (r.delay_minutes ?? 0) > 0;

      return {
        id: r.id,
        source: r.supplier_id,
        target: r.hospital_id,
        type: 'routeEdge',
        data: r,
        animated: hasActive || isBlocked || isDelayed,
        style: isAlt
          ? { strokeDasharray: '5 5' }
          : undefined,
      };
    });
  }, [filteredRoutes]);

  // Aggregate metrics
  const totalDemand = useMemo(
    () => hospitals.reduce((sum, h) => sum + (h.requested_batches ?? 0), 0),
    [hospitals]
  );
  const totalAllocated = useMemo(
    () => hospitals.reduce((sum, h) => sum + (h.allocated_batches ?? 0), 0),
    [hospitals]
  );
  const totalAvailable = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.available_stock ?? s.confirmed_stock ?? 0), 0),
    [suppliers]
  );
  const disruptedCount = useMemo(
    () => routes.filter((r) => r.status === 'blocked' || (r.delay_minutes ?? 0) > 0).length,
    [routes]
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#F5F6F2] via-[#ECEEE7] to-[#F1F3EC]"
    >
      {/* 1. Dynamic Interactive Spotlight Bloom following cursor */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(143, 209, 63, 0.18), rgba(62, 107, 79, 0.06) 45%, transparent 75%)`,
        }}
      />

      {/* 2. Interactive SVG Blueprint Energy Grid & Radar Sweep */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-35">
        <defs>
          <radialGradient id="cursorGlow" cx={`${mousePos.x}`} cy={`${mousePos.y}`} r="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8FD13F" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3E6B4F" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3E6B4F" stopOpacity="0" />
          </radialGradient>
          <pattern id="blueprintGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(62, 107, 79, 0.08)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="rgba(62, 107, 79, 0.2)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprintGrid)" />
        <circle cx={mousePos.x} cy={mousePos.y} r="180" fill="url(#cursorGlow)" />
        {/* Dynamic vector ray from cursor to center */}
        <line
          x1={mousePos.x}
          y1={mousePos.y}
          x2="50%"
          y2="50%"
          stroke="#8FD13F"
          strokeWidth="1"
          strokeDasharray="4 6"
          strokeOpacity="0.35"
        />
      </svg>

      {/* 3. Stylish Architectural Blueprint Watermark of Project "REACT" */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none overflow-hidden">
        {/* Subtle decorative technical grid axes with real-time mouse coordinate trackers */}
        <div className="absolute inset-x-8 top-1/2 h-px bg-[#3E6B4F]/10 border-t border-dashed border-[#3E6B4F]/25" />
        <div className="absolute inset-y-8 left-1/2 w-px bg-[#3E6B4F]/10 border-l border-dashed border-[#3E6B4F]/25" />

        <div className="relative z-0 text-center transition-transform duration-500 hover:scale-[1.02]">
          <div className="text-[110px] sm:text-[150px] md:text-[210px] font-black tracking-[0.2em] font-display leading-none bg-gradient-to-b from-[#2D5A1E]/30 via-[#3E6B4F]/25 to-[#14170F]/15 bg-clip-text text-transparent transform -rotate-1 select-none drop-shadow-sm">
            REACT
          </div>
          <div className="flex items-center justify-center gap-3 text-xs md:text-sm font-display font-black tracking-[0.25em] text-[#3E6B4F]/60 uppercase mt-1">
            <span className="w-8 h-px bg-[#3E6B4F]/40" />
            <span>Resource Evaluation Against Compound Threats</span>
            <span className="w-8 h-px bg-[#3E6B4F]/40" />
          </div>
        </div>
      </div>

      {/* 4. Dynamic Floating Ambient Energy Nodes & Orbital Rings */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-44 h-44 rounded-full border border-[#8FD13F]/25 animate-ping" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-1/5 w-60 h-60 rounded-full border border-[#3E6B4F]/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-dashed border-[#3E6B4F]/10 pointer-events-none" />
      </div>

      {/* Ambient background light orbs for depth & luminosity */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#8FD13F]/12 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 rounded-full bg-[#3E6B4F]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full bg-[#E8A23D]/8 blur-3xl pointer-events-none" />

      {/* Floating Glassmorphic Top Controls Bar */}
      <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Topology Identity & Time */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-black/8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8FD13F] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5B9C20]"></span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14170F]">
              <Network className="w-3.5 h-3.5 text-[#3E6B4F]" />
              <span>Supply & Distribution Corridors</span>
            </div>
            <span className="text-[10px] font-mono text-[#14170F]/50 pl-1 border-l border-black/8">
              T+{simulationMinute}m
            </span>
          </div>

          {/* Aggregate metrics pill */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/70 backdrop-blur-md border border-black/8 text-[11px] font-mono">
            <span className="text-[#14170F]/60">Demand:</span>
            <span className="font-bold text-[#14170F]">{totalAllocated}/{totalDemand}b</span>
            <span className="text-black/20">|</span>
            <span className="text-[#14170F]/60">Stock:</span>
            <span className="font-bold text-[#2D5A1E]">{totalAvailable}b</span>
            {disruptedCount > 0 && (
              <>
                <span className="text-black/20">|</span>
                <span className="flex items-center gap-1 font-bold text-[#8C2421]">
                  <AlertTriangle className="w-3 h-3 text-[#D9534F]" />
                  {disruptedCount} Disrupted
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Filters and Canvas Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/85 backdrop-blur-md border border-black/8 p-1 rounded-xl shadow-sm">
          <div className="flex items-center gap-1 pr-1 border-r border-black/8">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-[#14170F] text-white shadow-sm'
                  : 'text-[#14170F]/60 hover:text-[#14170F]'
              }`}
            >
              All Routes ({routes.length})
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'active'
                  ? 'bg-[#14170F] text-white shadow-sm'
                  : 'text-[#14170F]/60 hover:text-[#14170F]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterMode('disrupted')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'disrupted'
                  ? 'bg-[#D9534F] text-white shadow-sm'
                  : 'text-[#14170F]/60 hover:text-[#14170F]'
              }`}
            >
              Disrupted
            </button>
          </div>

          <button
            onClick={() => fitView({ padding: 0.18, duration: 400 })}
            className="p-1.5 rounded-lg text-[#14170F]/60 hover:text-[#14170F] hover:bg-black/5 transition-colors"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* React Flow Graph Engine */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#3E6B4F"
          className="opacity-20"
        />
        <Controls
          className="!bottom-3 !left-3 !shadow-sm !border-black/8 !bg-white/80 !backdrop-blur-md !rounded-xl"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-black/8 shadow-sm flex items-center gap-3 text-[10px] font-mono text-[#14170F]/70">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-md bg-[#0F1714]"></span>
          <span>Supplier Depot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3E6B4F]"></span>
          <span>Hospital Facility</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#3E6B4F]"></span>
          <span>Open Corridor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#D9534F] border-b border-dashed border-[#D9534F]"></span>
          <span>Disrupted / Flood</span>
        </div>
      </div>
    </div>
  );
};

export const TopologyGraph: React.FC<TopologyGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <TopologyGraphInner {...props} />
    </ReactFlowProvider>
  );
};
