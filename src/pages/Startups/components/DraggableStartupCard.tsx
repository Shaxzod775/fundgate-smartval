import { DragEvent } from 'react';
import styled from 'styled-components';
import { StartupCard } from './StartupCard';
import { Startup, StartupStatus } from '../../../types';

const DraggableWrapper = styled.div<{ $isDragging: boolean }>`
  cursor: grab;
  transition: transform 0.1s, box-shadow 0.1s, opacity 0.2s;
  opacity: ${({ $isDragging }) => $isDragging ? 0.5 : 1};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    cursor: grabbing;
  }
`;

interface DraggableStartupCardProps {
  startup: Startup;
  isDragging: boolean;
  onClick: (id: string) => void;
  onDragStart: (e: DragEvent, startup: Startup) => void;
  onDragEnd: () => void;
  getStatusVariant: (status: StartupStatus) => 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export const DraggableStartupCard = ({
  startup,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
  getStatusVariant
}: DraggableStartupCardProps) => {
  return (
    <DraggableWrapper
      draggable
      $isDragging={isDragging}
      onDragStart={(e) => onDragStart(e, startup)}
      onDragEnd={onDragEnd}
    >
      <StartupCard
        startup={startup}
        onClick={() => onClick(startup.id)}
        getStatusVariant={getStatusVariant}
      />
    </DraggableWrapper>
  );
};
