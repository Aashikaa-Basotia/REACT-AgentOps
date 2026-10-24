import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RouteData } from '../../types';

export const RouteEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const routeData = (data as unknown as RouteData) || {
    id,
    status: 'open',
    travel_minutes: 60,
    capacity_batches: 10,
    delay_minutes: 0,
    active_batches: 0,
  };

  const isBlocked = routeData.status === 'blocked';
  const isDelayed = routeData.status === 'delayed' || (routeData.delay_minutes && routeData.delay_minutes > 0);
  const hasActive = (routeData.active_batches ?? 0) > 0;

  // Exact color tokens from design system
  let strokeColor = '#3E6B4F'; // deep forest green
  if (isBlocked) strokeColor = '#D9534F'; // ruby
  else if (isDelayed) strokeColor = '#E8A23D'; // amber
  else if (hasActive) strokeColor = '#5B9C20'; // lively lime/green

  return (
    <>
      {/* Background shadow stroke for depth */}
      <BaseEdge
        path={edgePath}
        style={{
          strokeWidth: isBlocked ? 5 : 4,
          stroke: isBlocked ? 'rgba(217, 83, 79, 0.2)' : 'rgba(62, 107, 79, 0.15)',
          fill: 'none',
        }}
      />

      {/* Main Corridor Bezier Stroke */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isBlocked ? 3.5 : hasActive ? 3 : 2.5,
          stroke: strokeColor,
          strokeDasharray: isBlocked ? '6 5' : isDelayed ? '5 3' : undefined,
          opacity: 0.95,
        }}
        className={cn(
          'transition-all duration-300',
          isBlocked && 'animate-pulse',
          hasActive && 'animate-edge-flow'
        )}
      />

      {/* Animated Flow Particle for Active Deliveries */}
      {hasActive && (
        <svg className="pointer-events-none absolute inset-0 overflow-visible z-10">
          <circle r="4" fill="#8FD13F" className="filter drop-shadow-[0_0_6px_#8FD13F]">
            <animateMotion
              path={edgePath}
              dur="2.4s"
              repeatCount="indefinite"
              rotate="auto"
            />
          </circle>
          <circle r="2" fill="#FFFFFF">
            <animateMotion
              path={edgePath}
              dur="2.4s"
              repeatCount="indefinite"
              rotate="auto"
            />
          </circle>
        </svg>
      )}

      {/* Floating Glassmorphic Corridor Badge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            'group rounded-full px-2.5 py-1 text-[10px] font-mono border backdrop-blur-md shadow-sm transition-all duration-300 flex items-center gap-1.5',
            'hover:scale-105 hover:shadow-md cursor-pointer',
            isBlocked
              ? 'bg-[#D9534F]/15 border-[#D9534F]/60 text-[#8C2421] font-bold animate-pulse'
              : isDelayed
              ? 'bg-[#E8A23D]/15 border-[#E8A23D]/50 text-[#87550E] font-medium'
              : 'bg-white/90 border-black/8 text-[#14170F]'
          )}
        >
          {isBlocked ? (
            <>
              <AlertCircle className="w-3 h-3 text-[#D9534F]" />
              <span>BLOCKED (+{routeData.delay_minutes}m)</span>
            </>
          ) : isDelayed ? (
            <>
              <Clock className="w-3 h-3 text-[#E8A23D]" />
              <span>+{routeData.delay_minutes}m DELAY ({routeData.travel_minutes}m)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-[#3E6B4F]" />
              <span>
                {routeData.travel_minutes}m • Cap: {routeData.capacity_batches}
              </span>
            </>
          )}

          {routeData.active_batches && routeData.active_batches > 0 ? (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#8FD13F] text-[#14170F] font-bold text-[9px] shadow-xs">
              {routeData.active_batches}b in transit
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
