import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Clock,
} from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { EventChip } from './EventChip';
import { EventLogEntry } from '../types';
import { cn } from '../lib/utils';

export interface TimelineScrubberProps {
  currentMinute: number;
  maxMinutes?: number;
  events: EventLogEntry[];
  isPlaying: boolean;
  onScrubTime: (minute: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepTime: (delta: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentMinute,
  maxMinutes = 300,
  events,
  isPlaying,
  onScrubTime,
  onTogglePlay,
  onReset,
  onStepTime,
}) => {
  const percentage = Math.min(100, (currentMinute / maxMinutes) * 100);

  // Group events by minute or sample landmark ticks
  const landmarkTicks = [0, 30, 60, 120, 180, 240, 300];

  return (
    <GlassPanel
      variant="light"
      elevation="default"
      rounded="panel"
      className="p-4 border border-white/70 shadow-glass flex flex-col gap-3 relative"
    >
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14170F]/70 hover:text-[#14170F] transition-all active:scale-95"
            title="Reset to T+0m"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStepTime(-30)}
            disabled={currentMinute <= 0}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14170F]/70 hover:text-[#14170F] transition-all active:scale-95 disabled:opacity-30"
            title="Step Back -30m"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95',
              isPlaying
                ? 'bg-[#E8A23D] text-[#14170F]'
                : 'bg-[#8FD13F] text-[#14170F] hover:bg-[#7ec032]'
            )}
            title={isPlaying ? 'Pause Simulation' : 'Play Timeline'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={() => onStepTime(30)}
            disabled={currentMinute >= maxMinutes}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14170F]/70 hover:text-[#14170F] transition-all active:scale-95 disabled:opacity-30"
            title="Step Forward +30m"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Time Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 border border-black/8 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#3E6B4F]" />
            <span className="text-xs font-bold text-[#14170F]">
              T+{currentMinute}m
            </span>
            <span className="text-[10px] text-[#14170F]/50">/ {maxMinutes}m</span>
          </div>
          <span className="text-xs text-[#14170F]/60 font-medium hidden sm:inline">
            Deterministic Evidence Playhead
          </span>
        </div>
      </div>

      {/* Scrubber Track Container */}
      <div className="relative pt-6 pb-2 select-none">
        {/* Event Ticks as Small Glass Chips placed on track (§4.2.B) */}
        <div className="absolute top-0 left-0 right-0 h-6 pointer-events-auto">
          {events.map((ev, idx) => {
            const evMin = ev.minute ?? ev.timestamp ?? 0;
            const leftPct = Math.min(96, Math.max(2, (evMin / maxMinutes) * 100));

            return (
              <div
                key={idx}
                style={{ left: `${leftPct}%` }}
                className="absolute -translate-x-1/2 -top-1 cursor-pointer transition-transform hover:scale-110 z-10"
                onClick={() => onScrubTime(evMin)}
                title={`T+${evMin}m: ${ev.description}`}
              >
                <EventChip eventType={ev.event_type} size="xs" />
              </div>
            );
          })}
        </div>

        {/* Track Slider Base */}
        <div className="relative w-full h-2 bg-black/8 rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-[#8FD13F] rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native range input for accessible dragging */}
        <input
          type="range"
          min="0"
          max={maxMinutes}
          step="1"
          value={currentMinute}
          onChange={(e) => onScrubTime(Number(e.target.value))}
          className="absolute inset-x-0 bottom-1 w-full h-4 opacity-0 cursor-pointer z-20"
        />

        {/* Thin Playhead Line Tracking Position (§5) */}
        <div
          style={{ left: `${percentage}%` }}
          className="absolute top-4 bottom-1 w-0.5 bg-[#14170F] -translate-x-1/2 pointer-events-none transition-all duration-75 z-10"
        >
          <div className="w-3 h-3 rounded-full bg-[#14170F] border-2 border-white -translate-x-[5px] -translate-y-1 shadow-sm" />
        </div>

        {/* Landmark minute ticks */}
        <div className="flex justify-between items-center text-[10px] font-mono text-[#14170F]/50 pt-2">
          {landmarkTicks.map((tick) => (
            <span
              key={tick}
              className={cn(
                'cursor-pointer hover:text-[#14170F] transition-colors',
                currentMinute === tick && 'text-[#14170F] font-bold'
              )}
              onClick={() => onScrubTime(tick)}
            >
              +{tick}m
            </span>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
};
