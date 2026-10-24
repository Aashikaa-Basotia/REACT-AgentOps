import React from 'react';
import { SupervisorDebrief } from '../types';
import { DebriefCard } from './DebriefCard';

interface DebriefModalProps {
  debrief: SupervisorDebrief | null;
  isOpen: boolean;
  onClose: () => void;
  onJumpToTimeline?: (minute: number) => void;
}

export const DebriefModal: React.FC<DebriefModalProps> = ({
  debrief,
  isOpen,
  onClose,
  onJumpToTimeline,
}) => {
  if (!isOpen || !debrief) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <DebriefCard
        debrief={debrief}
        onClose={onClose}
        onJumpToTimeline={(minute) => {
          if (onJumpToTimeline) onJumpToTimeline(minute);
          onClose();
        }}
      />
    </div>
  );
};
