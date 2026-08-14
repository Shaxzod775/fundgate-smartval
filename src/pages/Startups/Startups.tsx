import { useState, useMemo, useEffect, useRef, useCallback, DragEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { organizationApi, startupsApi, teamApi, Startup as ApiStartup, type StartupBoardHistoryEntry, type StartupMaterialField, type Manager as TeamMember } from '../../services/api';
import { StartupStatus, Startup, StartupBrief, type StartupBoardColumn, type StartupBoardColumnStage, type StartupBoardLifecycleStatus, type StartupBoardSettings } from '../../types';
import {
  BOARD_COLUMN_LABEL_KEYS,
  BOARD_STAGE_PRESET_IDS,
  AVAILABLE_BOARD_STAGE_PRESETS,
  DEFAULT_BOARD_COLUMNS,
  buildBoardSettings,
  columnForStartup,
  columnIdForStartup,
  defaultStagesForLifecycle,
  normalizeBoardColumns,
  stagesForColumn,
} from './boardColumns';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import { StartupFilters, type ManagerFilterOption } from './components/StartupFilters';
import { StartupCard } from './components/StartupCard';
import { StartupListView } from './components/StartupListView';
import { AddStartupModal } from './components/AddStartupModal';
import { StartupDetailsSheet } from './components/StartupDetailsSheet';
import { unfinishedStageCountFor } from './components/StartupRoadmapPanel';
import { committeeGateFor, type CommitteeGateInfo } from './committeeGate';
import { ConfirmArchiveModal } from './components/ConfirmArchiveModal';
import { ConfirmPermanentDeleteModal } from './components/ConfirmPermanentDeleteModal';
import { AssignManagerModal } from './components/AssignManagerModal';
import { InvestmentAmountModal, ValuationType } from './components/InvestmentAmountModal';
import { CreateCabinetModal } from './components/CreateCabinetModal';
import { RejectReasonModal } from './components/RejectReasonModal';
import { ArrowRight, BellRing, ChevronDown, ChevronRight, ChevronUp, FileCheck2, History, Inbox, Plus, AlertTriangle, TrendingUp, Handshake, Archive, Trash2, X, Check } from 'lucide-react';
import { StartupsSkeleton } from './StartupsSkeleton';
import { PageTransition } from '../../styles/animations';
import { unreadFounderCommentsFor } from '../../utils/unreadComments';
import { useToast } from '../../components/ui/Toast';
import { useBoardEditor } from './board/useBoardEditor';
import { ColumnHeaderControls } from './board/ColumnHeaderControls';
import { ConfirmDeleteColumnModal } from './components/ConfirmDeleteColumnModal';
import { normalizeSmartValDetails } from '../../utils/smartValValuation';
import { dateValueToDate, dateValueToTimestamp } from '../../utils/dateValue';
import { formatShortDateTime } from '../../utils/formatDate';
import { numberLocale } from '../../utils/formatNumber';

type PermanentDeleteSuccess = {
  mode: 'single' | 'bulk';
  startupName?: string;
  startupCount: number;
};

const PageContainer = styled.div`
  width: 100%;
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-top: 72px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  ${PageTransition}

  @media (max-width: 768px) {
    padding-top: 72px;
  }

  @media (max-width: 640px) {
    padding-top: 130px;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
`;

const ControlsHeader = styled.div<{ $isCollapsed: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  left: ${({ $isCollapsed }) => ($isCollapsed ? '80px' : '260px')};
  z-index: 40;
  background: ${({ theme }) => theme.colors.bg.navbar};
  backdrop-filter: blur(10px);
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  box-shadow: ${({ theme }) =>
    theme.mode === 'light' ? '0 8px 24px rgba(15, 23, 42, 0.06)' : 'none'};
  display: flex;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  box-sizing: border-box;

  @media (max-width: 768px) {
    /* Hamburger button is fixed at top:16 left:16 size 48 — give the
       header padding-left so the search input doesn't end up beneath it. */
    left: 0;
    padding: ${({ theme }) => theme.spacing[3]};
    padding-left: 76px;
    width: 100%;
    max-width: 100vw;
  }

  @media (max-width: 640px) {
    padding: 12px;
    padding-left: 76px;
    height: auto;
    min-height: 64px;
  }
`;

const KanbanBoard = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
  min-height: calc(100vh - 140px);
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.colors.border.secondary} transparent`};

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 3px;
  }

  @media (max-width: 1200px) {
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
  }

  @media (max-width: 768px) {
    gap: 8px;
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const KanbanColumn = styled.div<{ $isOver?: boolean }>`
  flex: 0 0 280px;
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  background: ${({ $isOver, theme }) =>
    $isOver ? `${theme.colors.accent.primary}12` : `${theme.colors.bg.secondary}80`};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
  border: 2px solid ${({ $isOver, theme }) =>
    $isOver ? theme.colors.accent.primary : theme.mode === 'light' ? theme.colors.border.secondary : 'transparent'};
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};
  height: calc(100vh - 160px);
  max-height: calc(100vh - 160px);

  ${({ $isOver }) => $isOver && `
    transform: scale(1.01);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  `}

  @media (max-width: 1200px) {
    scroll-snap-align: start;
  }

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[2]};
  }
`;

const LinkedColumnGroup = styled.div`
  flex: 0 0 auto;
  display: flex;
  gap: 12px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => (theme.mode === 'light' ? theme.colors.bg.secondary : 'rgba(255, 255, 255, 0.035)')};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};

  ${KanbanColumn} {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  @media (max-width: 1200px) {
    scroll-snap-align: start;
  }

  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const PortfolioSubHeader = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: ${({ $accent }) => $accent};
  border-bottom: 1px solid ${({ $accent }) => `${$accent}22`};
  margin-bottom: 6px;
  white-space: nowrap;

  & > .count {
    margin-left: auto;
    background: ${({ $accent }) => `${$accent}22`};
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
  }
`;

const ColumnHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const ColumnTitle = styled.div`
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ColumnCount = styled.div`
  flex: 0 0 auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
`;

const ColumnCountGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
  flex: 0 0 auto;
`;

const ColumnCountTotal = styled.div`
  position: absolute;
  top: 50%;
  right: calc(100% + 4px);
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  letter-spacing: 0.3px;
  white-space: nowrap;
  opacity: 0;
  transform: translate(4px, -50%);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;

  ${ColumnCountGroup}:hover & {
    opacity: 1;
    transform: translate(0, -50%);
    pointer-events: auto;
  }
`;

const CountTooltip = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: normal;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 50;
  pointer-events: none;
  line-height: 1.5;
  width: 200px;

  & div {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  & div + div {
    margin-top: 4px;
  }

  & b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    flex-shrink: 0;
    min-width: 22px;
  }
`;

const ColumnHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const ColumnCards = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.md};
  min-height: 100px;
  transition: background 0.2s ease;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 4px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
  border: 2px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin: ${({ theme }) => theme.spacing[2]};
  min-height: 150px;

  svg {
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    opacity: 0.5;
  }
`;

const DraggableCardWrapper = styled.div<{ $isDragging: boolean }>`
  cursor: grab;
  transition: transform 0.1s, box-shadow 0.1s;

  ${({ $isDragging }) => $isDragging && `
    & > * {
      border: 2px dashed rgba(99, 102, 241, 0.5) !important;
    }
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  &:active {
    cursor: grabbing;
  }
`;

const ArchiveDropZone = styled.div<{ $isVisible: boolean; $isOver: boolean }>`
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 220;
  transform: translateX(-50%) translateY(${({ $isVisible }) => ($isVisible ? '0' : '18px')})
    scale(${({ $isOver }) => ($isOver ? 1.03 : 1)});
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: min(520px, calc(100vw - 32px));
  padding: 18px 24px;
  border-radius: 18px;
  border: 2px dashed ${({ $isOver, theme }) => ($isOver ? '#ef4444' : theme.colors.border.primary)};
  background: ${({ $isOver, theme }) =>
    $isOver
      ? (theme.mode === 'light' ? 'rgba(254, 242, 242, 0.98)' : 'rgba(69, 10, 10, 0.96)')
      : (theme.mode === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(17, 24, 39, 0.94)')};
  color: ${({ $isOver, theme }) => ($isOver ? '#ef4444' : theme.colors.text.primary)};
  box-shadow: ${({ $isOver, theme }) =>
    $isOver
      ? '0 18px 45px rgba(239, 68, 68, 0.28)'
      : theme.mode === 'light'
        ? '0 18px 45px rgba(15, 23, 42, 0.16)'
        : '0 18px 45px rgba(0, 0, 0, 0.5)'};
  backdrop-filter: blur(14px);
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  letter-spacing: 0.1px;
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;

  svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    bottom: 16px;
    min-width: calc(100vw - 24px);
    padding: 14px 16px;
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }
`;

const QuarterlyReportsAlert = styled.div`
  margin: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]} 0;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.mode === 'light' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(248, 113, 113, 0.32)'};
  background: ${({ theme }) => theme.mode === 'light' ? 'rgba(254, 242, 242, 0.96)' : 'rgba(69, 10, 10, 0.72)'};
  box-shadow: ${({ theme }) => theme.mode === 'light' ? '0 14px 34px rgba(185, 28, 28, 0.10)' : '0 18px 42px rgba(0, 0, 0, 0.36)'};
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;

  @media (max-width: 820px) {
    grid-template-columns: auto minmax(0, 1fr);
  }

  @media (max-width: 640px) {
    margin: 12px 12px 0;
    padding: 12px;
  }
`;

const QuarterlyReportsIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ theme }) => theme.mode === 'light' ? '#fee2e2' : 'rgba(248, 113, 113, 0.16)'};
  color: #dc2626;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const QuarterlyReportsAlertBody = styled.div`
  min-width: 0;
`;

const QuarterlyReportsAlertTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.mode === 'light' ? '#7f1d1d' : '#fecaca'};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  letter-spacing: -0.01em;
`;

const QuarterlyReportsAlertPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.08)'};
  border: 1px solid ${({ theme }) => theme.mode === 'light' ? '#fecaca' : 'rgba(248, 113, 113, 0.26)'};
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const QuarterlyReportsAlertText = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.mode === 'light' ? '#991b1b' : '#fca5a5'};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const QuarterlyReportsPreviewList = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const QuarterlyReportsStartupButton = styled.button`
  border: 1px solid ${({ theme }) => theme.mode === 'light' ? '#fecaca' : 'rgba(248, 113, 113, 0.26)'};
  background: ${({ theme }) => theme.mode === 'light' ? '#fff' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ theme }) => theme.mode === 'light' ? '#7f1d1d' : '#fee2e2'};
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: #ef4444;
    color: #dc2626;
  }
`;

const QuarterlyReportsAlertActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 820px) {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
`;

const QuarterlyReportsAlertButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => ($primary ? '#dc2626' : '#fecaca')};
  background: ${({ $primary }) => ($primary ? '#dc2626' : '#fff')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#991b1b')};
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    transform: translateY(-1px);
    background: ${({ $primary }) => ($primary ? '#b91c1c' : '#fff5f5')};
    border-color: #ef4444;
  }
`;

const ArchiveGrid = styled.div`
  display: grid;
  /* 1fr (not a fixed max) so the tracks always eat the whole row — a hard
     280px cap left a dead strip on the right of wide screens. */
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  min-height: calc(100vh - 140px);
  align-content: start;

  /* Не уже 240px: на более узкой карточке ряды чипов StartupCard начинают
     обрезаться (см. CHIP_ROW_WIDTH). */
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const ArchiveHeaderActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ArchiveSelectionCount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary}55;
  border-radius: ${({ theme }) => theme.radius.full};
  padding: 6px 10px;
`;

const ArchiveSelectionButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.status.dangerBorder : theme.colors.border.primary)};
  background: ${({ $danger, theme }) => ($danger ? theme.colors.status.dangerBg : theme.colors.bg.secondary)};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.status.danger : theme.colors.text.primary)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $danger, theme }) => ($danger ? theme.colors.status.danger : theme.colors.accent.primary)};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ArchiveSelectableCard = styled.div<{ $selected: boolean; $selectionMode: boolean }>`
  position: relative;
  height: 100%;
  min-height: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  user-select: none;
  touch-action: manipulation;
  cursor: ${({ $selectionMode }) => ($selectionMode ? 'pointer' : 'default')};

  ${({ $selected, theme }) => $selected ? `
    & > *:first-child {
      border-color: ${theme.colors.accent.primary} !important;
      box-shadow: 0 0 0 2px ${theme.colors.accent.primary}, 0 18px 36px rgba(16, 185, 129, 0.18) !important;
    }
  ` : ''}
`;

const ArchiveSelectionBadge = styled.div<{ $selected: boolean; $selectionMode: boolean }>`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 2px solid ${({ $selected, theme }) => ($selected ? theme.colors.accent.primary : theme.colors.border.primary)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.accent.primary : theme.colors.bg.card)};
  color: ${({ $selected, theme }) => ($selected ? 'white' : theme.colors.text.tertiary)};
  display: ${({ $selected, $selectionMode }) => ($selected || $selectionMode ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  pointer-events: none;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ArchiveEmptyState = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  text-align: center;

  svg {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
    opacity: 0.5;
  }
`;

const SingleStatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  min-height: calc(100vh - 140px);
  align-content: start;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    padding: ${({ theme }) => theme.spacing[3]};
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SingleStatusHeader = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const SingleStatusTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SingleStatusCount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: 4px 12px;
  border-radius: 12px;
`;

const MobileColumnTabs = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    overflow-x: auto;
    gap: 4px;
    padding: 6px 12px;
    background: ${({ theme }) => theme.colors.bg.secondary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    flex-shrink: 0;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const MobileColumnTab = styled.button<{ $active: boolean; $color: string }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  background: ${({ $active, $color }) => $active ? $color : 'transparent'};
  color: ${({ $active, theme }) => $active ? 'white' : theme.colors.text.secondary};

  &:hover {
    background: ${({ $active, $color, theme }) => $active ? $color : theme.colors.bg.tertiary};
  }
`;

const MobileTabCount = styled.span<{ $active: boolean }>`
  background: ${({ $active }) => $active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'};
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 11px;
`;

const MobileKanbanView = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    min-height: 0;
  }
`;

const MobileColumnContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
`;

const DesktopKanbanBoard = styled(KanbanBoard)`
  @media (max-width: 640px) {
    display: none;
  }
`;

const DesktopKanbanViewport = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;

  @media (max-width: 640px) {
    display: none;
  }
`;

const KanbanScrollFade = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 6px;
  width: 96px;
  pointer-events: none;
  z-index: 8;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity ${({ theme }) => theme.transitions.base};
  background: ${({ theme }) => `linear-gradient(90deg, transparent, ${theme.colors.bg.primary}E6 70%, ${theme.colors.bg.primary})`};
`;

const KanbanScrollRightButton = styled.button<{ $visible: boolean }>`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing[3]};
  z-index: 9;
  width: 44px;
  height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transform: translateY(-50%) ${({ $visible }) => ($visible ? 'scale(1)' : 'scale(0.92)')};
  transition: opacity ${({ theme }) => theme.transitions.base},
    transform ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base},
    color ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-50%) scale(1.04);
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

const BoardSettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const BoardSettingsModal = styled.div`
  width: min(1100px, 100%);
  max-height: min(800px, calc(100vh - 40px));
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.xl};
  /* bg.card is 5% white in the dark theme — translucent, the board bleeds
     through. Floating surfaces use the solid bg.primary like the shared Modal. */
  background: ${({ theme }) => theme.colors.bg.primary};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  display: flex;
  flex-direction: column;
`;

const BoardSettingsHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const BoardSettingsTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
`;

const BoardSettingsSubtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PendingStageLabel = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const PendingStageList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PendingStageChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }
`;

const DropConsequence = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CommitteeGateNotice = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.status.warning};
  }
`;

const CommitteeGateError = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.status.error};
`;

const BoardSettingsBody = styled.div`
  padding: ${({ theme }) => theme.spacing[5]};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const BoardSettingsFooter = styled.div`
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ColumnColorSwatch = styled.span<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 0 4px ${({ $color }) => `${$color}22`};
`;

const ColumnInput = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  min-height: 40px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font: inherit;
`;

const ColumnSelect = styled.select`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  min-height: 40px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font: inherit;
`;

const ColumnActionButton = styled.button<{ $danger?: boolean; $primary?: boolean }>`
  min-height: 40px;
  border: 1px solid ${({ $danger, $primary, theme }) => (
    $danger ? 'rgba(239, 68, 68, 0.45)' : $primary ? theme.colors.accent.primary : theme.colors.border.secondary
  )};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $danger, $primary, theme }) => (
    $danger ? 'rgba(239, 68, 68, 0.12)' : $primary ? theme.colors.accent.primary : theme.colors.bg.tertiary
  )};
  color: ${({ $danger, $primary, theme }) => ($danger ? '#ef4444' : $primary ? '#ffffff' : theme.colors.text.primary)};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font: inherit;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const LockedColumnPill = styled.span`
  justify-self: start;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 6px 10px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const ConstructorLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  min-height: 0;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const ConstructorPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const PaneTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
`;

const ConstructorColumnRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.accent.primary : theme.colors.border.secondary)};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ $selected, theme }) => ($selected ? `${theme.colors.accent.primary}14` : theme.colors.bg.secondary)};
  cursor: pointer;
`;

const SmallIconButton = styled.button`
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MoveButtonGroup = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;

  ${SmallIconButton} {
    width: 26px;
    height: 19px;
    border-radius: 6px;
  }
`;

const StageCountPill = styled.span`
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 4px 9px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  white-space: nowrap;
`;

const StageRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const StageInputs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

const StageDescriptionInput = styled.textarea`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  min-height: 44px;
  resize: vertical;
`;

const AddStageRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
`;

const ConstructorHint = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.5;
`;

const BoardSettingsError = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  padding: ${({ theme }) => theme.spacing[3]};
  font-weight: 700;
`;

const GREY_ZONE_ENABLED = false;
const GREY_ZONE_SCORE_THRESHOLD = 50;
const ACTIVE_KANBAN_STATUSES: StartupStatus[] = ['new', 'in_review', 'pipeline', 'portfolio'];
const MANAGER_FILTER_ROLES = new Set(['deputy_investment', 'deputy_ma', 'manager_investment', 'manager_ma']);
const QUARTERLY_REPORT_MANAGER_ACTION_STATUSES = new Set(['submitted', 'in_review']);
const STARTUPS_AUTO_REFRESH_MS = 20_000;

const isArchiveStartup = (startup: Startup) => Boolean(startup.isArchived || startup.status === 'rejected');

const searchText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(searchText).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(searchText).join(' ');
  return String(value);
};

const startupMatchesSearch = (startup: Startup, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const assignedManager = startup.assignedManager as (Startup['assignedManager'] & {
    login?: string;
    phone?: string;
  }) | undefined;

  const haystack = [
    startup.id,
    startup.platformIdentityKey,
    startup.status,
    startup.source,
    startup.assignedManagerId,
    assignedManager?.name,
    assignedManager?.email,
    assignedManager?.login,
    assignedManager?.phone,
    startup.brief.companyName,
    startup.brief.industry,
    startup.brief.description,
    startup.brief.stage,
    startup.brief.website,
    startup.brief.founderName,
    startup.brief.founderEmail,
    startup.brief.founderPhone,
    startup.brief.founderRole,
    startup.brief.founderLinkedin,
    startup.brief.country,
    startup.brief.businessModel,
    startup.brief.businessModelDescription,
    startup.brief.customBusinessModel,
    startup.brief.technologyDescription,
    startup.founder,
    startup.teamMembers,
  ].map(searchText).join(' ').toLowerCase();

  return haystack.includes(normalizedQuery);
};


const needsQuarterlyReportReview = (startup: Startup) => (
  !isArchiveStartup(startup) &&
  QUARTERLY_REPORT_MANAGER_ACTION_STATUSES.has(String(startup.lastQuarterlyReportStatus || ''))
);

const startupTimestamp = (value: unknown): number => dateValueToTimestamp(value);

const parseFirestoreDate = (date: any): Date => {
  return dateValueToDate(date) ?? new Date();
};

const STARTUP_MATERIAL_UPLOAD_ORDER: StartupMaterialField[] = ['pitchDeck', 'onePager', 'financialModel'];

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const convertApiStartup = (apiStartup: ApiStartup): Startup => {
  const raw = apiStartup as any;
  const briefRaw = apiStartup.brief as any;
  const smartValDetails = normalizeSmartValDetails(
    raw.smartValDetails,
    raw.smartValResult,
    raw.smartvalResult,
    raw.smartValEvaluation,
    raw.smartvalEvaluation,
    raw.smartVal,
    raw.smartval,
  );
  const rawAnalysisStatus = raw.analysisStatus as Startup['analysisStatus'] | undefined;
  const rawScoreCandidates = [
    apiStartup.aiAnalysis?.score,
    (apiStartup.aiAnalysis as any)?.totalScore,
    raw.aiScore,
    raw.fundGateScores?.total,
  ];
  const scoreCandidate =
    rawScoreCandidates.find((v) => typeof v === 'number' && v > 0) ??
    rawScoreCandidates.find((v) => typeof v === 'number');
  const hasPositiveScore = typeof scoreCandidate === 'number' && scoreCandidate > 0;
  const hasFundGateResult = Boolean(
    raw.fundGateEvaluation ||
    raw.aiAnalysis?.generatedAt ||
    raw.analysisCompletedAt ||
    rawAnalysisStatus === 'completed' ||
    hasPositiveScore
  );
  const analysisStatus = hasFundGateResult && rawAnalysisStatus !== 'failed'
    ? 'completed'
    : rawAnalysisStatus;

  return {
    id: apiStartup.id,
    platformIdentityKey: raw.platformIdentityKey,
    dataRoomUrl: raw.dataRoomUrl,
    logo: raw.logo || raw.fileUrls?.logo || '',
    brief: {
      companyName: String(briefRaw?.name || briefRaw?.companyName || 'Unknown'),
      industry: String(briefRaw?.industry || 'Technology'),
      website: briefRaw?.website || '',
      description: briefRaw?.description || '',
      stage: briefRaw?.stage || 'Pre-Seed',
      foundedYear: briefRaw?.foundedYear || new Date().getFullYear(),
      teamSize: briefRaw?.teamSize || 0,
      fundingRequest: briefRaw?.fundingRequest || 0,
      itpvFundingRequest: briefRaw?.itpvFundingRequest ?? briefRaw?.fundingRequest ?? 0,
      totalRoundSize: briefRaw?.totalRoundSize || 0,
      useOfFunds: briefRaw?.useOfFunds || '',
      revenue: briefRaw?.revenue,
      revenueGrowth: briefRaw?.revenueGrowth,
      previousFunding: briefRaw?.previousFunding,
      pitchDeckUrl: briefRaw?.pitchDeckUrl || raw.fileUrls?.pitchDeck,
      founderName: briefRaw?.founderName || raw.founderName,
      founderEmail: briefRaw?.founderEmail || raw.founderEmail,
      founderPhone: briefRaw?.founderPhone || raw.founderPhone,
      founderRole: briefRaw?.founderRole,
      country: briefRaw?.country,
      businessModel: briefRaw?.businessModel,
      businessModelDescription: briefRaw?.businessModelDescription,
      customBusinessModel: briefRaw?.customBusinessModel,
      hasTechnology: briefRaw?.hasTechnology,
      technologyDescription: briefRaw?.technologyDescription,
      customerAcquisitionCost: briefRaw?.customerAcquisitionCost,
      churnRate: briefRaw?.churnRate,
      hasUsers: briefRaw?.hasUsers,
      userCount: briefRaw?.userCount,
      activeUsersPerMonth: briefRaw?.activeUsersPerMonth,
      payingUsersPerMonth: briefRaw?.payingUsersPerMonth,
      hasPayingCustomers: briefRaw?.hasPayingCustomers,
    },
    status: apiStartup.status as StartupStatus,
    boardColumnId: apiStartup.boardColumnId,
    greyZone: typeof raw.greyZone === 'boolean' ? raw.greyZone : undefined,
    source: apiStartup.source as any,
    assignedManagerId: apiStartup.assignedManagerId || undefined,
    assignedManager: raw.assignedManager || undefined,
    fundConsiderationAmount: raw.fundConsiderationAmount,
    sentToCommittee: raw.sentToCommittee,
    portfolioPromotion: raw.portfolioPromotion,
    investmentCommitteeStatus: raw.investmentCommitteeStatus,
    investmentCommittee: raw.investmentCommittee,
    portfolioType: raw.portfolioType,
    investmentAmount: raw.investmentAmount,
    valuationType: raw.valuationType,
    valuation: raw.valuation,
    isCoInvestment: raw.isCoInvestment,
    isArchived: raw.isArchived,
    founder: raw.founder,
    teamMembers: raw.teamMembers || [],
    investments: raw.investments || [],
    fileUrls: raw.fileUrls,
    materials: raw.materials,
    comments: (apiStartup.comments || []) as any,
    activityLog: (apiStartup.activityLog || []) as any,
    documentRequests: ((apiStartup as any).documentRequests || raw.documentRequests || []) as any,
    roadmap: ((apiStartup as any).roadmap || raw.roadmap) as any,
    crossFundApplications: raw.crossFundApplications || [],
    ddReviews: raw.ddReviews,
    lastQuarterlyReportAt: raw.lastQuarterlyReportAt ? parseFirestoreDate(raw.lastQuarterlyReportAt) : undefined,
    lastQuarterlyReportReviewedAt: raw.lastQuarterlyReportReviewedAt ? parseFirestoreDate(raw.lastQuarterlyReportReviewedAt) : undefined,
    lastQuarterlyReportId: raw.lastQuarterlyReportId,
    lastQuarterlyReportPeriod: raw.lastQuarterlyReportPeriod,
    lastQuarterlyReportStatus: raw.lastQuarterlyReportStatus,
    quarterlyReportsCount: raw.quarterlyReportsCount,
    aiAnalysis: hasFundGateResult ? {
      score: scoreCandidate ?? 0,
      valuation: apiStartup.aiAnalysis?.valuation || 0,
      strengths: (apiStartup.aiAnalysis as any)?.strengths || [],
      weaknesses: (apiStartup.aiAnalysis as any)?.weaknesses || [],
      marketAnalysis: (apiStartup.aiAnalysis as any)?.marketAnalysis || '',
      teamAnalysis: (apiStartup.aiAnalysis as any)?.teamAnalysis || '',
      productAnalysis: (apiStartup.aiAnalysis as any)?.productAnalysis || '',
      financialAnalysis: (apiStartup.aiAnalysis as any)?.financialAnalysis || '',
      recommendation: (apiStartup.aiAnalysis as any)?.recommendation || 'hold',
      generatedAt: parseFirestoreDate((apiStartup.aiAnalysis as any)?.generatedAt),
    } : undefined,
    fundGateScores: raw.fundGateScores,
    smartValDetails,
    aiRecommendations: raw.aiRecommendations,
    analysisStatus,
    analysisError: raw.analysisError,
    createdAt: parseFirestoreDate(apiStartup.createdAt),
    updatedAt: parseFirestoreDate(apiStartup.updatedAt),
  };
};

const Startups = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isCollapsed } = useOutletContext<{ isCollapsed: boolean }>();
  const permissions = usePermissions();
  const { manager, organization, updateOrganization } = useAuth();
  const toast = useToast();
  const isDirector = permissions.isDirector;
  const [isLoading, setIsLoading] = useState(true);

  const statusLabels: Record<StartupStatus, string> = {
    new: t('startups.status.new'),
    in_review: t('startups.status.in_review'),
    pipeline: t('startups.status.pipeline'),
    portfolio: t('startups.status.portfolio'),
    rejected: t('startups.status.rejected'),
  };

  const localeCode = useMemo(() => {
    if (i18n.language?.startsWith('uz')) return 'uz-UZ';
    if (i18n.language?.startsWith('en')) return 'en-US';
    return 'ru-RU';
  }, [i18n.language]);

  const translatedText = useCallback((key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { defaultValue: fallback, ...(options || {}) });
    return typeof value === 'string' ? value : fallback;
  }, [t]);

  const displayColumnLabel = useCallback((column?: StartupBoardColumn | null) => {
    if (!column) return '';
    const key = BOARD_COLUMN_LABEL_KEYS[column.id] || (column.systemStatus ? `startups.status.${column.systemStatus}` : '');
    return key ? translatedText(key, column.label) : column.label;
  }, [translatedText]);

  const stagePresetId = (stage: StartupBoardColumnStage) => stage.presetId || stage.id;
  const displayStageLabel = useCallback((stage: StartupBoardColumnStage) => {
    const presetId = stagePresetId(stage);
    return BOARD_STAGE_PRESET_IDS.has(presetId)
      ? translatedText(`startups.boardStages.${presetId}.label`, stage.label)
      : stage.label;
  }, [translatedText]);

  const displayPresetLabel = useCallback((presetId: string, fallback: string) => (
    translatedText(`startups.boardStages.${presetId}.label`, fallback)
  ), [translatedText]);

  const [startups, setStartups] = useState<Startup[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [mobileActiveColumnId, setMobileActiveColumnId] = useState<string>('sys_new');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StartupStatus | 'all' | 'archived'>('all');
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [showQuarterlyReportsOnly, setShowQuarterlyReportsOnly] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [teamManagerOptions, setTeamManagerOptions] = useState<ManagerFilterOption[]>([]);
  const [boardColumns, setBoardColumns] = useState<StartupBoardColumn[]>(() => normalizeBoardColumns(organization?.startupBoardSettings));
  const [boardDraftColumns, setBoardDraftColumns] = useState<StartupBoardColumn[]>(() => normalizeBoardColumns(organization?.startupBoardSettings));
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
  const [isSavingBoardSettings, setIsSavingBoardSettings] = useState(false);
  const [boardSettingsError, setBoardSettingsError] = useState('');
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<Record<string, string>>({});
  const [selectedDraftColumnId, setSelectedDraftColumnId] = useState('sys_new');
  const [stagePresetPick, setStagePresetPick] = useState('');
  const [boardHistoryOpen, setBoardHistoryOpen] = useState(false);
  const [boardHistory, setBoardHistory] = useState<StartupBoardHistoryEntry[]>([]);
  const [boardHistoryLoading, setBoardHistoryLoading] = useState(false);
  const [restoringHistoryId, setRestoringHistoryId] = useState('');
  const boardEditingRef = useRef(false);
  const [deleteColumnState, setDeleteColumnState] = useState<{ column: StartupBoardColumn; targetId: string } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{
    startup: Startup;
    column: StartupBoardColumn;
    unfinished: number;
    total: number;
    pending: Array<{ id: string; label: string }>;
    fromLabel: string;
  } | null>(null);
  const [committeeGateDrop, setCommitteeGateDrop] = useState<{
    startup: Startup;
    gate: CommitteeGateInfo;
    resume: () => void;
  } | null>(null);
  const [isSendingToCommittee, setIsSendingToCommittee] = useState(false);
  const [committeeGateError, setCommitteeGateError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [startupToArchive, setStartupToArchive] = useState<Startup | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [startupsToPermanentDelete, setStartupsToPermanentDelete] = useState<Startup[]>([]);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [permanentDeleteSuccess, setPermanentDeleteSuccess] = useState<PermanentDeleteSuccess | null>(null);
  const [archiveSelectionMode, setArchiveSelectionMode] = useState(false);
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(() => new Set());

  const [assignManagerModalOpen, setAssignManagerModalOpen] = useState(false);
  const [reassignStartup, setReassignStartup] = useState<Startup | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    startup: Startup;
    newStatus: StartupStatus;
    boardColumnId?: string | null;
  } | null>(null);

  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  const [pendingPortfolioMove, setPendingPortfolioMove] = useState<{
    startup: Startup;
    managerId?: string;
    managerName?: string;
    portfolioType?: 'investment' | 'program';
  } | null>(null);
  const [isProcessingInvestment, setIsProcessingInvestment] = useState(false);

  const [cabinetModalOpen, setCabinetModalOpen] = useState(false);
  const [cabinetStartup, setCabinetStartup] = useState<Startup | null>(null);

  const [rejectModal, setRejectModal] = useState<{ startup: Startup } | null>(null);

  const [draggedStartup, setDraggedStartup] = useState<Startup | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverPortfolioSub, setDragOverPortfolioSub] = useState<'investment' | 'program' | null>(null);
  const [dragOverArchive, setDragOverArchive] = useState(false);

  const [tooltipColumn, setTooltipColumn] = useState<string | null>(null);
  const [canScrollKanbanRight, setCanScrollKanbanRight] = useState(false);
  const desktopKanbanRef = useRef<HTMLDivElement | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const archiveLongPressTimerRef = useRef<number | null>(null);
  const archiveLongPressTriggeredRef = useRef(false);

  const updateKanbanScrollHint = useCallback(() => {
    const board = desktopKanbanRef.current;
    if (!board) {
      setCanScrollKanbanRight(false);
      return;
    }

    setCanScrollKanbanRight(board.scrollLeft + board.clientWidth < board.scrollWidth - 8);
  }, []);

  const scrollKanbanRight = useCallback(() => {
    const board = desktopKanbanRef.current;
    if (!board) return;

    board.scrollBy({
      left: Math.max(292, Math.floor(board.clientWidth * 0.72)),
      behavior: 'smooth',
    });
    window.setTimeout(updateKanbanScrollHint, 380);
  }, [updateKanbanScrollHint]);

  const handleCountHoverEnter = (columnId: string) => {
    if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltipColumn(columnId);
    }, 700);
  };

  const handleCountHoverLeave = () => {
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setTooltipColumn(null);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
      if (archiveLongPressTimerRef.current) window.clearTimeout(archiveLongPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const nextColumns = normalizeBoardColumns(organization?.startupBoardSettings);
    setBoardColumns(nextColumns);
    if (!isBoardSettingsOpen) {
      setBoardDraftColumns(nextColumns);
    }
  }, [isBoardSettingsOpen, organization?.startupBoardSettings]);

  const boardColumnIds = useMemo(() => boardColumns.map((column) => column.id), [boardColumns]);

  useEffect(() => {
    if (!boardColumnIds.includes(mobileActiveColumnId)) {
      setMobileActiveColumnId(boardColumns[0]?.id || 'sys_new');
    }
  }, [boardColumnIds, boardColumns, mobileActiveColumnId]);

  const refreshStartups = useCallback(async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
    const organizationId = manager?.organizationId || '';
    if (!organizationId) {
      console.warn('No organizationId found');
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      const response = await startupsApi.getAll(organizationId);

      if (response.success && response.data) {
        const convertedStartups = response.data.map(convertApiStartup);
        setStartups(convertedStartups);
        setSelectedStartup((current) => {
          if (!current) return current;
          return convertedStartups.find((startup) => startup.id === current.id) || current;
        });
      }
    } catch (error) {
      console.error('Failed to fetch startups:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [manager?.organizationId]);

  useEffect(() => {
    refreshStartups({ showLoading: true });
  }, [refreshStartups]);

  useEffect(() => {
    if (!manager?.organizationId) return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible' || draggedStartup || boardEditingRef.current) return;
      void refreshStartups();
    };

    const intervalId = window.setInterval(refreshIfVisible, STARTUPS_AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [draggedStartup, manager?.organizationId, refreshStartups]);

  useEffect(() => {
    const fetchManagers = async () => {
      const organizationId = manager?.organizationId;
      if (!organizationId) {
        setTeamManagerOptions([]);
        return;
      }

      try {
        const response = await teamApi.getMembers(organizationId);
        if (response.success && response.data) {
          setTeamManagerOptions(
            response.data
              .filter((member: TeamMember) => member.isActive !== false && MANAGER_FILTER_ROLES.has(member.role))
              .map((member: TeamMember) => ({ id: member.id, name: member.name }))
              .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
          );
        }
      } catch (error) {
        console.error('Failed to fetch manager filters:', error);
      }
    };

    fetchManagers();
  }, [manager?.organizationId]);

  const openBoardSettings = () => {
    const nextColumns = normalizeBoardColumns(organization?.startupBoardSettings || buildBoardSettings(boardColumns))
      .map((column) => ({ ...column, stages: stagesForColumn(column) }));
    setBoardDraftColumns(nextColumns);
    setSelectedDraftColumnId(nextColumns[0]?.id || 'sys_new');
    setDeleteColumnTarget({});
    setBoardSettingsError('');
    setBoardHistoryOpen(false);
    setIsBoardSettingsOpen(true);
  };

  const loadBoardHistory = async () => {
    const organizationId = manager?.organizationId || organization?.id;
    if (!organizationId) return;
    setBoardHistoryLoading(true);
    try {
      const response = await organizationApi.getStartupBoardHistory(organizationId);
      setBoardHistory(response.success && response.data ? response.data : []);
    } catch {
      setBoardHistory([]);
    } finally {
      setBoardHistoryLoading(false);
    }
  };

  const toggleBoardHistory = () => {
    const next = !boardHistoryOpen;
    setBoardHistoryOpen(next);
    if (next) void loadBoardHistory();
  };

  const restoreBoardHistory = async (entryId: string) => {
    const organizationId = manager?.organizationId || organization?.id;
    if (!organizationId || restoringHistoryId) return;
    setRestoringHistoryId(entryId);
    setBoardSettingsError('');
    try {
      const response = await organizationApi.restoreStartupBoardHistory(organizationId, entryId);
      if (!response.success || !response.data) {
        setBoardSettingsError(response.message || response.error || t('startups.boardConstructor.restoreVersionError'));
        return;
      }
      const savedSettings = response.data.startupBoardSettings;
      updateOrganization({ startupBoardSettings: savedSettings });
      const normalized = normalizeBoardColumns(savedSettings).map((column) => ({ ...column, stages: stagesForColumn(column) }));
      setBoardColumns(normalizeBoardColumns(savedSettings));
      setBoardDraftColumns(normalized);
      setSelectedDraftColumnId(normalized[0]?.id || 'sys_new');
      setBoardHistoryOpen(false);
    } catch (error) {
      setBoardSettingsError(error instanceof Error ? error.message : t('startups.boardConstructor.restoreVersionError'));
    } finally {
      setRestoringHistoryId('');
    }
  };

  const moveDraftColumn = (columnId: string, direction: -1 | 1) => {
    setBoardDraftColumns((prev) => {
      const index = prev.findIndex((column) => column.id === columnId);
      const targetIndex = index + direction;
      if (index <= 0 || index >= prev.length - 1) return prev;
      if (targetIndex <= 0 || targetIndex >= prev.length - 1) return prev;
      const next = prev.map((column) => ({ ...column }));
      const order = next[index].order;
      next[index].order = next[targetIndex].order;
      next[targetIndex].order = order;
      return normalizeBoardColumns({ version: 1, columns: next });
    });
  };

  const updateDraftStages = (columnId: string, stages: StartupBoardColumnStage[]) => {
    setBoardDraftColumns((prev) => prev.map((column) => (
      column.id === columnId ? { ...column, stages } : column
    )));
  };

  const draftStagesOf = (columnId: string): StartupBoardColumnStage[] => {
    const column = boardDraftColumns.find((candidate) => candidate.id === columnId);
    return column ? (column.stages || []) : [];
  };

  const addPresetStage = (columnId: string, presetId: string) => {
    const preset = AVAILABLE_BOARD_STAGE_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    const stages = draftStagesOf(columnId);
    if (stages.length >= 12 || stages.some((stage) => stage.id === preset.id)) return;
    updateDraftStages(columnId, [...stages, { id: preset.id, label: preset.label, description: preset.description, presetId: preset.id }]);
  };

  const addCustomStage = (columnId: string) => {
    const stages = draftStagesOf(columnId);
    if (stages.length >= 12) return;
    updateDraftStages(columnId, [...stages, {
      id: `stage-${Date.now().toString(36)}`,
      label: t('startups.boardConstructor.newStage'),
      description: '',
    }]);
  };

  const updateDraftStage = (columnId: string, stageId: string, patch: Partial<StartupBoardColumnStage>) => {
    updateDraftStages(columnId, draftStagesOf(columnId).map((stage) => (
      stage.id === stageId ? { ...stage, ...patch, id: stage.id } : stage
    )));
  };

  const removeDraftStage = (columnId: string, stageId: string) => {
    updateDraftStages(columnId, draftStagesOf(columnId).filter((stage) => stage.id !== stageId));
  };

  const moveDraftStage = (columnId: string, stageId: string, direction: -1 | 1) => {
    const stages = [...draftStagesOf(columnId)];
    const index = stages.findIndex((stage) => stage.id === stageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) return;
    [stages[index], stages[targetIndex]] = [stages[targetIndex], stages[index]];
    updateDraftStages(columnId, stages);
  };

  const updateDraftColumn = (columnId: string, patch: Partial<StartupBoardColumn>) => {
    setBoardDraftColumns((prev) => normalizeBoardColumns({
      version: 1,
      columns: prev.map((column) => (
        column.id === columnId
          ? {
              ...column,
              ...patch,
              ...(column.locked ? { lifecycleStatus: column.lifecycleStatus, systemStatus: column.systemStatus, kind: 'system' as const } : {}),
            }
          : column
      )),
    }));
  };

  const addDraftColumn = () => {
    const nextIndex = boardDraftColumns.filter((column) => column.kind === 'custom').length + 1;
    setBoardDraftColumns((prev) => normalizeBoardColumns({
      version: 1,
      columns: [
        ...prev,
        {
          id: `custom_${Date.now().toString(36)}`,
          kind: 'custom',
          label: t('startups.boardConstructor.newColumn', { index: nextIndex }),
          color: '#06b6d4',
          order: 150 + nextIndex * 10,
          lifecycleStatus: 'pipeline',
        },
      ],
    }));
  };

  const saveBoardSettings = async (columns = boardDraftColumns) => {
    const organizationId = manager?.organizationId || organization?.id;
    if (!organizationId) return false;

    const settings = buildBoardSettings(columns);
    const labels = new Set<string>();
    for (const column of settings.columns) {
      const label = column.label.trim();
      if (!label) {
        setBoardSettingsError(t('startups.boardConstructor.emptyColumnName'));
        return false;
      }
      const key = label.toLocaleLowerCase(localeCode);
      if (labels.has(key)) {
        setBoardSettingsError(t('startups.boardConstructor.duplicateColumnName', { label }));
        return false;
      }
      labels.add(key);
    }

    setIsSavingBoardSettings(true);
    setBoardSettingsError('');
    try {
      const response = await organizationApi.updateStartupBoardSettings(organizationId, settings);
      if (!response.success || !response.data) {
        setBoardSettingsError(response.error || t('startups.boardConstructor.saveColumnsError'));
        return false;
      }
      const savedSettings = response.data.startupBoardSettings || settings;
      updateOrganization({ startupBoardSettings: savedSettings });
      const normalized = normalizeBoardColumns(savedSettings);
      setBoardColumns(normalized);
      setBoardDraftColumns(normalized);
      return true;
    } catch (error) {
      setBoardSettingsError(error instanceof Error ? error.message : t('startups.boardConstructor.saveColumnsError'));
      return false;
    } finally {
      setIsSavingBoardSettings(false);
    }
  };

  const deleteDraftColumn = async (column: StartupBoardColumn) => {
    if (column.locked) return;
    const organizationId = manager?.organizationId || organization?.id;
    const targetColumnId = deleteColumnTarget[column.id] ||
      boardDraftColumns.find((candidate) => candidate.id !== column.id && candidate.lifecycleStatus === column.lifecycleStatus)?.id ||
      boardDraftColumns.find((candidate) => candidate.id !== column.id && candidate.lifecycleStatus !== 'new' && candidate.lifecycleStatus !== 'portfolio')?.id ||
      'sys_new';
    const localColumns = normalizeBoardColumns({
      version: 1,
      columns: boardDraftColumns.filter((candidate) => candidate.id !== column.id),
    });

    if (!organizationId) {
      setBoardDraftColumns(localColumns);
      return;
    }

    setIsSavingBoardSettings(true);
    setBoardSettingsError('');
    try {
      const response = await organizationApi.deleteStartupBoardColumn(organizationId, column.id, targetColumnId);
      if (response.success && response.data?.organization) {
        const savedSettings = response.data.organization.startupBoardSettings || buildBoardSettings(localColumns);
        updateOrganization({ startupBoardSettings: savedSettings });
        const normalized = normalizeBoardColumns(savedSettings);
        setBoardColumns(normalized);
        setBoardDraftColumns(normalized);
        setStartups((prev) => prev.map((startup) => (
          startup.boardColumnId === column.id
            ? { ...startup, status: boardDraftColumns.find((candidate) => candidate.id === targetColumnId)?.lifecycleStatus || startup.status, boardColumnId: targetColumnId.startsWith('sys_') ? undefined : targetColumnId }
            : startup
        )));
      } else {
        setBoardSettingsError(response.error || t('startups.boardConstructor.deleteColumnError'));
      }
    } catch (error) {
      setBoardSettingsError(error instanceof Error ? error.message : t('startups.boardConstructor.deleteColumnError'));
    } finally {
      setIsSavingBoardSettings(false);
    }
  };

  const boardEditor = useBoardEditor({
    organizationId: manager?.organizationId || organization?.id || '',
    columns: boardColumns,
    setColumns: setBoardColumns,
    updateOrganization,
    startups,
    setStartups,
    toast,
    t,
    onEditingChange: (editing) => { boardEditingRef.current = editing; },
  });

  const boardDeleteTargets = (column: StartupBoardColumn): StartupBoardColumn[] =>
    [...boardColumns]
      .filter((candidate) => candidate.id !== column.id)
      .sort((a, b) => Number(b.lifecycleStatus === column.lifecycleStatus) - Number(a.lifecycleStatus === column.lifecycleStatus));

  const canDeleteBoardColumn = (column: StartupBoardColumn): boolean =>
    !column.locked && boardColumns.some(
      (candidate) => candidate.id !== column.id && candidate.lifecycleStatus === column.lifecycleStatus,
    );

  const handleRequestDeleteColumn = (column: StartupBoardColumn) => {
    const targets = boardDeleteTargets(column);
    setDeleteColumnState({ column, targetId: targets[0]?.id || '' });
  };

  const handleConfirmDeleteColumn = async () => {
    if (!deleteColumnState) return;
    const { column, targetId } = deleteColumnState;
    await boardEditor.deleteColumn(column, targetId);
    setDeleteColumnState(null);
  };

  const handleEditColumnStages = (column: StartupBoardColumn) => {
    openBoardSettings();
    setSelectedDraftColumnId(column.id);
  };

  const handleStartupClick = (startup: Startup) => {
    setSelectedStartup(startup);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSheetOpen(true);
      });
    });
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => {
      setSelectedStartup(null);
    }, 300);
  };

  const handleStartupUpdate = (updatedStartup: Startup) => {
    const normalizedStartup: Startup = {
      ...updatedStartup,
      createdAt: parseFirestoreDate(updatedStartup.createdAt),
      updatedAt: parseFirestoreDate(updatedStartup.updatedAt),
    };
    setStartups(prev =>
      prev.map(s => s.id === normalizedStartup.id ? normalizedStartup : s)
    );
    setSelectedStartup(normalizedStartup);
  };

  const quarterlyReportReviewStartups = useMemo(() => (
    startups
      .filter(needsQuarterlyReportReview)
      .sort((a, b) => (
        (startupTimestamp(b.lastQuarterlyReportAt) || startupTimestamp(b.updatedAt)) -
        (startupTimestamp(a.lastQuarterlyReportAt) || startupTimestamp(a.updatedAt))
      ))
  ), [startups]);

  const handleShowQuarterlyReports = () => {
    setShowQuarterlyReportsOnly(true);
    setSelectedStatus('all');
    setSearchQuery('');
  };

  const handleOpenFirstQuarterlyReport = () => {
    const firstStartup = quarterlyReportReviewStartups[0];
    if (!firstStartup) return;
    handleStartupClick(firstStartup);
  };

  const handleOpenArchiveModal = (startup: Startup) => {
    setStartupToArchive(startup);
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = async (reason: string) => {
    if (!startupToArchive) return;

    setIsArchiving(true);
    try {
      const response = await startupsApi.archive(
        startupToArchive.id,
        manager?.id,
        manager?.name,
        reason
      );

      if (response.success) {
        setStartups(prev => prev.map(s =>
          s.id === startupToArchive.id
            ? { ...s, status: 'rejected' as StartupStatus, isArchived: true, archivedAt: new Date(), rejectionReason: reason }
            : s
        ));
        if (selectedStartup?.id === startupToArchive.id) {
          setSelectedStartup(prev => prev ? {
            ...prev,
            status: 'rejected' as StartupStatus,
            isArchived: true,
            archivedAt: new Date(),
            rejectionReason: reason,
          } : null);
        }
        setArchiveModalOpen(false);
        setStartupToArchive(null);
      }
    } catch (error) {
      console.error('Failed to archive startup:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (startup: Startup) => {
    try {
      const response = await startupsApi.restore(startup.id);

      if (response.success) {
        setStartups(prev => prev.map(s =>
          s.id === startup.id
            ? { ...s, isArchived: false, archivedAt: undefined, status: 'pipeline' as StartupStatus }
            : s
        ));

        if (selectedStartup?.id === startup.id) {
          setSelectedStartup(prev => prev ? { ...prev, isArchived: false, archivedAt: undefined, status: 'pipeline' as StartupStatus } : null);
          handleCloseSheet();
        }
      }
    } catch (error) {
      console.error('Failed to restore startup:', error);
    }
  };

  const handleOpenPermanentDeleteModal = (startup: Startup) => {
    setPermanentDeleteSuccess(null);
    setStartupsToPermanentDelete([startup]);
    setPermanentDeleteModalOpen(true);
  };

  const handleConfirmPermanentDelete = async () => {
    const targets = startupsToPermanentDelete;
    if (targets.length === 0) return;

    setIsPermanentDeleting(true);
    try {
      const deleteResults = await Promise.allSettled(
        targets.map(async (startup) => {
          const response = await startupsApi.permanentlyDeleteArchived(startup.id);
          if (!response.success) {
            throw new Error(response.error || `Failed to delete startup ${startup.id}`);
          }
          return startup.id;
        })
      );
      const deletedIds = new Set(
        deleteResults
          .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
          .map(result => result.value)
      );

      if (deletedIds.size > 0) {
        setStartups(prev => prev.filter(s => !deletedIds.has(s.id)));
        setSelectedArchivedIds(prev => {
          const next = new Set(prev);
          deletedIds.forEach(id => next.delete(id));
          return next;
        });

        if (selectedStartup && deletedIds.has(selectedStartup.id)) {
          handleCloseSheet();
        }
      }

      if (deletedIds.size === targets.length) {
        setArchiveSelectionMode(false);
        setPermanentDeleteSuccess({
          mode: targets.length > 1 ? 'bulk' : 'single',
          startupName: targets[0]?.brief.companyName,
          startupCount: deletedIds.size,
        });
      } else {
        setPermanentDeleteSuccess(null);
        setStartupsToPermanentDelete(targets.filter(startup => !deletedIds.has(startup.id)));
        console.error('Some archived startups failed to delete permanently', deleteResults);
      }
    } catch (error) {
      console.error('Failed to permanently delete archived startup:', error);
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const filteredStartups = useMemo(() => {
    return startups.filter(startup => {
      const matchesSearch = startupMatchesSearch(startup, searchQuery);
      const matchesMyManager = !showMyOnly || startup.assignedManagerId === manager?.id;
      const matchesSelectedManager =
        selectedManagerId === 'all' ||
        (selectedManagerId === 'unassigned'
          ? !startup.assignedManagerId
          : startup.assignedManagerId === selectedManagerId);
      const matchesQuarterlyReports =
        !showQuarterlyReportsOnly || needsQuarterlyReportReview(startup);

      if (selectedStatus === 'archived') {
        return isArchiveStartup(startup) && matchesSearch && matchesMyManager && matchesSelectedManager && matchesQuarterlyReports;
      }

      if (isArchiveStartup(startup)) return false;

      const matchesStatus = selectedStatus === 'all' || startup.status === selectedStatus;

      return matchesSearch && matchesStatus && matchesMyManager && matchesSelectedManager && matchesQuarterlyReports;
    });
  }, [startups, searchQuery, selectedStatus, showMyOnly, selectedManagerId, showQuarterlyReportsOnly, manager?.id]);

  const selectedArchivedStartups = useMemo(() => (
    startups.filter(startup => selectedArchivedIds.has(startup.id) && isArchiveStartup(startup))
  ), [startups, selectedArchivedIds]);

  const clearArchiveSelection = useCallback(() => {
    setArchiveSelectionMode(false);
    setSelectedArchivedIds(new Set());
  }, []);

  const toggleArchiveSelection = useCallback((startup: Startup) => {
    const next = new Set(selectedArchivedIds);
    if (next.has(startup.id)) {
      next.delete(startup.id);
    } else {
      next.add(startup.id);
    }
    setSelectedArchivedIds(next);
    setArchiveSelectionMode(next.size > 0);
  }, [selectedArchivedIds]);

  const handleSelectAllVisibleArchived = () => {
    setSelectedArchivedIds(new Set(filteredStartups.map(startup => startup.id)));
    setArchiveSelectionMode(filteredStartups.length > 0);
  };

  const handleOpenBulkPermanentDeleteModal = () => {
    if (selectedArchivedStartups.length === 0) return;
    setPermanentDeleteSuccess(null);
    setStartupsToPermanentDelete(selectedArchivedStartups);
    setPermanentDeleteModalOpen(true);
  };

  const clearArchiveLongPressTimer = () => {
    if (archiveLongPressTimerRef.current) {
      window.clearTimeout(archiveLongPressTimerRef.current);
      archiveLongPressTimerRef.current = null;
    }
  };

  const shouldIgnoreArchiveSelectionTarget = (target: EventTarget | null) => (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, a, input, textarea, select, [role="button"]'))
  );

  const handleArchiveCardPressStart = (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    startup: Startup
  ) => {
    if (archiveSelectionMode || shouldIgnoreArchiveSelectionTarget(event.target)) return;

    archiveLongPressTriggeredRef.current = false;
    clearArchiveLongPressTimer();
    archiveLongPressTimerRef.current = window.setTimeout(() => {
      archiveLongPressTriggeredRef.current = true;
      setArchiveSelectionMode(true);
      setSelectedArchivedIds(prev => new Set(prev).add(startup.id));
    }, 450);
  };

  const handleArchiveCardPressEnd = () => {
    clearArchiveLongPressTimer();
  };

  const handleArchivedCardClick = (startup: Startup) => {
    if (archiveLongPressTriggeredRef.current) {
      archiveLongPressTriggeredRef.current = false;
      return;
    }

    if (archiveSelectionMode) {
      toggleArchiveSelection(startup);
      return;
    }

    handleStartupClick(startup);
  };

  useEffect(() => {
    if (selectedStatus !== 'archived') {
      clearArchiveSelection();
      return;
    }

    const visibleArchiveIds = new Set(filteredStartups.map(startup => startup.id));
    setSelectedArchivedIds(prev => {
      const next = new Set([...prev].filter(id => visibleArchiveIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [clearArchiveSelection, filteredStartups, selectedStatus]);

  useEffect(() => {
    if (selectedArchivedIds.size === 0) {
      setArchiveSelectionMode(false);
    }
  }, [selectedArchivedIds]);

  const managerFilterOptions = useMemo(() => {
    const options = new Map<string, ManagerFilterOption>();

    teamManagerOptions.forEach((option) => options.set(option.id, option));
    startups.forEach((startup) => {
      if (!startup.assignedManagerId) return;
      options.set(startup.assignedManagerId, {
        id: startup.assignedManagerId,
        name: startup.assignedManager?.name || startup.assignedManagerId,
      });
    });

    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [startups, teamManagerOptions]);

  const handleShowMyOnlyChange = (value: boolean) => {
    setShowMyOnly(value);
    if (value) setSelectedManagerId('all');
  };

  const handleManagerFilterChange = (managerId: string) => {
    setSelectedManagerId(managerId);
    if (managerId !== 'all') setShowMyOnly(false);
  };

  const archiveCount = useMemo(() => startups.filter(isArchiveStartup).length, [startups]);

  const getStartupScore = (startup: Startup): number => {
    return (startup.aiAnalysis?.score) || (startup as any).score || 0;
  };

  const greyZoneStartups = useMemo(() => {
    if (!GREY_ZONE_ENABLED) return [];
    return filteredStartups
      .filter(s => {
        if (s.status !== 'new') return false;
        if (s.greyZone === true) return true;
        if (s.greyZone === false) return false;
        const score = getStartupScore(s);
        return score > 0 && score < GREY_ZONE_SCORE_THRESHOLD;
      })
      .sort((a, b) => startupTimestamp(b.createdAt) - startupTimestamp(a.createdAt));
  }, [filteredStartups]);

  const greyZoneIds = useMemo(() => new Set(greyZoneStartups.map(s => s.id)), [greyZoneStartups]);

  useEffect(() => {
    if (viewMode !== 'kanban' || selectedStatus !== 'all') {
      setCanScrollKanbanRight(false);
      return;
    }

    const board = desktopKanbanRef.current;
    if (!board) {
      setCanScrollKanbanRight(false);
      return;
    }

    const rafId = window.requestAnimationFrame(updateKanbanScrollHint);
    const handleResize = () => updateKanbanScrollHint();
    window.addEventListener('resize', handleResize);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateKanbanScrollHint)
      : null;
    resizeObserver?.observe(board);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [
    boardColumns,
    filteredStartups.length,
    greyZoneStartups.length,
    selectedStatus,
    updateKanbanScrollHint,
    viewMode,
  ]);

  const getStartupsByStatus = (status: StartupStatus) => {
    const filtered = filteredStartups.filter(
      (s) => s.status === status && !greyZoneIds.has(s.id)
    );
    if (status === 'new') {
      return filtered.sort((a, b) => startupTimestamp(b.createdAt) - startupTimestamp(a.createdAt));
    }
    return filtered.sort((a, b) => getStartupScore(b) - getStartupScore(a));
  };

  const getStartupsByColumn = (column: StartupBoardColumn) => {
    const filtered = filteredStartups.filter((startup) => (
      startup.status === column.lifecycleStatus &&
      columnIdForStartup(startup, boardColumns) === column.id &&
      !greyZoneIds.has(startup.id)
    ));
    if (column.lifecycleStatus === 'new') {
      return filtered.sort((a, b) => startupTimestamp(b.createdAt) - startupTimestamp(a.createdAt));
    }
    return filtered.sort((a, b) => getStartupScore(b) - getStartupScore(a));
  };

  const cumulativeCountByStatus = useMemo(() => {
    const counts: Record<StartupStatus, number> = {
      new: 0, in_review: 0, pipeline: 0, portfolio: 0, rejected: 0,
    };
    for (const s of startups) {
      const visited = new Set<StartupStatus>();
      visited.add(s.status);
      const log = Array.isArray(s.activityLog) ? s.activityLog as Array<any> : [];
      for (const entry of log) {
        if (entry?.action === 'status_changed' || entry?.action === 'status_change') {
          if (entry.fromStatus) visited.add(entry.fromStatus as StartupStatus);
          if (entry.toStatus) visited.add(entry.toStatus as StartupStatus);
        }
      }
      visited.forEach((st) => {
        if (st in counts) counts[st] += 1;
      });
    }
    return counts;
  }, [startups]);

  const cumulativeCountByColumn = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const column of boardColumns) {
      const currentCount = startups.filter((startup) => (
        startup.status === column.lifecycleStatus &&
        columnIdForStartup(startup, boardColumns) === column.id
      )).length;
      counts[column.id] = column.kind === 'system' && column.systemStatus
        ? cumulativeCountByStatus[column.systemStatus as StartupStatus] || currentCount
        : currentCount;
    }
    return counts;
  }, [boardColumns, cumulativeCountByStatus, startups]);

  const getStatusVariant = (status: StartupStatus) => {
    switch (status) {
      case 'new': return 'info';
      case 'in_review': return 'warning';
      case 'pipeline': return 'purple';
      case 'portfolio': return 'success';
      case 'rejected': return 'danger';
      default: return 'neutral';
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, startup: Startup) => {
    if (!permissions.canModifyStartups) {
      e.preventDefault();
      return;
    }
    setDraggedStartup(startup);
    setDragOverArchive(false);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, column: StartupBoardColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverArchive(false);
    setDragOverColumn(column.id);
    setDragOverPortfolioSub(null);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
  };

  const handlePortfolioSubDragOver = (
    e: DragEvent<HTMLDivElement>,
    variant: 'investment' | 'program'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverArchive(false);
    setDragOverColumn('sys_portfolio');
    setDragOverPortfolioSub(variant);
  };

  const handlePortfolioSubDrop = async (
    e: DragEvent<HTMLDivElement>,
    variant: 'investment' | 'program'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);

    if (!draggedStartup) return;

    if (draggedStartup.status === 'portfolio') {
      const currentType = (draggedStartup as any).portfolioType;
      const newType = variant === 'investment' ? 'investment' : 'program';

      if (currentType === newType) {
        setDraggedStartup(null);
        return;
      }

      if (newType === 'program') {
        await startupsApi.update(draggedStartup.id, { portfolioType: newType } as any);
        setStartups(prev =>
          prev.map(s => (s.id === draggedStartup.id ? { ...s, portfolioType: newType } as any : s))
        );
        setDraggedStartup(null);
        return;
      }

      setPendingPortfolioMove({
        startup: draggedStartup,
        portfolioType: 'investment',
        managerId: draggedStartup.assignedManagerId,
        managerName: draggedStartup.assignedManager?.name,
      });
      setInvestmentModalOpen(true);
      setDraggedStartup(null);
      return;
    }

    const incoming = draggedStartup;
    setDraggedStartup(null);
    startPortfolioMove(incoming, variant);
  };

  const startPortfolioMove = (startup: Startup, portfolioType?: 'investment' | 'program') => {
    const resume = () => {
      if (!startup.assignedManagerId) {
        setPendingStatusChange({ startup, newStatus: 'portfolio', boardColumnId: null });
        setAssignManagerModalOpen(true);
        return;
      }
      setPendingPortfolioMove({ startup, portfolioType });
      setInvestmentModalOpen(true);
    };

    const gate = committeeGateFor(startup);
    if (gate.blocked) {
      setCommitteeGateError('');
      setCommitteeGateDrop({ startup, gate, resume });
      return;
    }
    resume();
  };

  const proceedWithDrop = async (startup: Startup, targetColumn: StartupBoardColumn) => {
    const newStatus = targetColumn.lifecycleStatus as StartupStatus;
    const targetBoardColumnId = targetColumn.kind === 'custom' ? targetColumn.id : null;

    if (newStatus === 'new') {
      await executeStatusChange(startup, newStatus, { assignedManagerId: '', boardColumnId: null, greyZone: false });
      return;
    }

    if (newStatus === 'rejected') {
      setRejectModal({ startup });
      return;
    }

    if (newStatus === 'portfolio') {
      startPortfolioMove(startup);
      return;
    }

    if (!startup.assignedManagerId) {
      setPendingStatusChange({ startup, newStatus, boardColumnId: targetBoardColumnId });
      setAssignManagerModalOpen(true);
      return;
    }

    await executeStatusChange(startup, newStatus, { boardColumnId: targetBoardColumnId });
  };

  const updateGreyZoneFlag = async (startup: Startup, value: boolean) => {
    const startupId = startup.id;
    const previous = startup.greyZone;
    if (previous === value) return;
    setStartups(prev => prev.map(s => (s.id === startupId ? { ...s, greyZone: value } : s)));
    if (selectedStartup?.id === startupId) {
      setSelectedStartup(prev => (prev ? { ...prev, greyZone: value } as any : prev));
    }
    try {
      await startupsApi.update(startupId, { greyZone: value } as any);
    } catch (error) {
      console.error('Failed to update grey zone flag:', error);
      setStartups(prev => prev.map(s => (s.id === startupId ? { ...s, greyZone: previous } : s)));
    }
  };

  const handleGreyZoneDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
    setDragOverArchive(false);

    const startup = draggedStartup;
    setDraggedStartup(null);
    if (!startup) return;
    if (!permissions.canModifyStartups) return;
    if (greyZoneIds.has(startup.id)) return; // already in grey zone

    if (startup.status === 'new') {
      await updateGreyZoneFlag(startup, true);
      return;
    }
    await executeStatusChange(startup, 'new', { assignedManagerId: '', boardColumnId: null, greyZone: true });
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetColumn: StartupBoardColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
    setDragOverArchive(false);

    const startup = draggedStartup;
    setDraggedStartup(null);
    if (!startup) return;
    if (!permissions.canModifyStartups) return;

    if (targetColumn.lifecycleStatus === 'new' && greyZoneIds.has(startup.id)) {
      await updateGreyZoneFlag(startup, false);
      return;
    }

    const currentColumnId = columnIdForStartup(startup, boardColumns);
    if (startup.status === targetColumn.lifecycleStatus && currentColumnId === targetColumn.id) {
      return;
    }

    const currentColumn = boardColumns.find((column) => column.id === currentColumnId);
    const movingForward = (targetColumn.order ?? 0) > (currentColumn?.order ?? 0);
    if (movingForward) {
      const { unfinished, total, pending } = unfinishedStageCountFor(startup, boardColumns);
      if (unfinished > 0) {
        setPendingDrop({
          startup,
          column: targetColumn,
          unfinished,
          total,
          pending: pending.map((stage) => ({ ...stage, label: displayStageLabel(stage as StartupBoardColumnStage) })),
          fromLabel: currentColumn ? displayColumnLabel(currentColumn) : t('startups.boardConstructor.currentColumnFallback'),
        });
        return;
      }
    }

    await proceedWithDrop(startup, targetColumn);
  };

  const handleArchiveDropDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!draggedStartup) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverArchive(true);
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
  };

  const handleArchiveDropDragLeave = (e: DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverArchive(false);
  };

  const handleArchiveDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startup = draggedStartup;
    setDraggedStartup(null);
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
    setDragOverArchive(false);

    if (!startup) return;

    handleOpenArchiveModal(startup);
  };

  const executeStatusChange = async (
    startup: Startup,
    newStatus: StartupStatus,
    additionalData?: { assignedManagerId?: string; assignedManagerName?: string; investmentAmount?: number; valuationType?: ValuationType; valuation?: number; isCoInvestment?: boolean; rejectionReason?: string; portfolioType?: 'investment' | 'program'; boardColumnId?: string | null; greyZone?: boolean }
  ) => {
    const startupId = startup.id;
    const oldStatus = startup.status;
    const oldAssignedManagerId = startup.assignedManagerId;
    const oldAssignedManager = startup.assignedManager;
    const startupName = startup.brief?.companyName || 'Unknown';

    const effectiveGrey: boolean | undefined =
      additionalData?.greyZone !== undefined
        ? additionalData.greyZone
        : (newStatus !== 'new' && startup.greyZone === true ? false : undefined);

    setStartups(prev =>
      prev.map(s =>
        s.id === startupId ? {
          ...s,
          status: newStatus,
          ...(additionalData?.assignedManagerId !== undefined && {
            assignedManagerId: additionalData.assignedManagerId || '',
            assignedManager: additionalData.assignedManagerId
              ? { id: additionalData.assignedManagerId, name: additionalData.assignedManagerName || s.assignedManager?.name || '' } as any
              : undefined
          }),
          ...(additionalData?.investmentAmount && { investmentAmount: additionalData.investmentAmount }),
          ...(additionalData?.valuationType && { valuationType: additionalData.valuationType }),
          ...(additionalData?.portfolioType && { portfolioType: additionalData.portfolioType }),
          ...(additionalData && 'boardColumnId' in additionalData && { boardColumnId: additionalData.boardColumnId || undefined }),
          ...(effectiveGrey !== undefined && { greyZone: effectiveGrey }),
        } : s
      )
    );

    try {
      const updateData: any = { status: newStatus };
      if (additionalData?.assignedManagerId !== undefined) {
        updateData.assignedManagerId = additionalData.assignedManagerId;
      }
      if (additionalData?.investmentAmount) {
        updateData.investmentAmount = additionalData.investmentAmount;
      }
      if (additionalData?.valuationType) {
        updateData.valuationType = additionalData.valuationType;
      }
      if (additionalData?.valuation) {
        updateData.valuation = additionalData.valuation;
      }
      if (additionalData?.isCoInvestment !== undefined) {
        updateData.isCoInvestment = additionalData.isCoInvestment;
      }
      if (additionalData?.portfolioType) {
        updateData.portfolioType = additionalData.portfolioType;
      }
      if (additionalData && 'boardColumnId' in additionalData) {
        updateData.boardColumnId = additionalData.boardColumnId || null;
      }
      if (effectiveGrey !== undefined) {
        updateData.greyZone = effectiveGrey;
      }
      if (additionalData?.rejectionReason) {
        updateData.rejectionReason = additionalData.rejectionReason;
      }

      const updateResponse = await startupsApi.update(startupId, updateData);
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || t('startups.updateError', 'Не удалось обновить стартап'));
      }

      let details = `${statusLabels[oldStatus]} → ${statusLabels[newStatus]}`;
      if (additionalData?.investmentAmount) {
        const valuationLabel = additionalData.valuationType === 'post-money' ? 'Post-money' : 'Pre-money';
        details += ` (${valuationLabel}: $${additionalData.investmentAmount.toLocaleString(numberLocale(i18n.language))})`;
      }
      if (additionalData?.rejectionReason) {
        details += ` — ${additionalData.rejectionReason}`;
      }
      if (additionalData && 'boardColumnId' in additionalData) {
        const targetColumn = boardColumns.find((column) => column.id === additionalData.boardColumnId);
        if (targetColumn) details += ` · ${displayColumnLabel(targetColumn)}`;
      }

      const activityResponse = await startupsApi.addActivity(startupId, {
        action: newStatus === 'portfolio' ? 'deal_closed' : 'status_change',
        managerId: manager?.id,
        managerName: manager?.name,
        details,
        ...(additionalData?.investmentAmount && { amount: additionalData.investmentAmount }),
      });

      if (activityResponse.success && activityResponse.data) {
        const newActivity = activityResponse.data as any;
        setStartups(prev =>
          prev.map(s =>
            s.id === startupId
              ? { ...s, activityLog: [...(s.activityLog || []), newActivity] } as any
              : s
          )
        );

        if (selectedStartup?.id === startupId) {
          setSelectedStartup(prev => prev ? {
            ...prev,
            status: newStatus,
            ...(additionalData && 'boardColumnId' in additionalData ? { boardColumnId: additionalData.boardColumnId || undefined } : {}),
            activityLog: [...(prev.activityLog || []), newActivity]
          } as any : null);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to update startup status:', error);
      setStartups(prev =>
        prev.map(s =>
          s.id === startupId
            ? {
                ...s,
                status: oldStatus,
                ...(additionalData?.assignedManagerId !== undefined && {
                  assignedManagerId: oldAssignedManagerId,
                  assignedManager: oldAssignedManager,
                }),
              }
            : s
        )
      );
      toast.error(error instanceof Error ? error.message : t('startups.updateError', 'Не удалось обновить стартап'));
      return false;
    }
  };

  const handleReassignManager = (startup: Startup) => {
    setReassignStartup(startup);
    setAssignManagerModalOpen(true);
  };

  const handleCreateCabinet = (startup: Startup) => {
    setCabinetStartup(startup);
    setCabinetModalOpen(true);
  };

  const canReassignStartup = (startup: Startup): boolean => {
    if (permissions.isDirector) return true;
    if (permissions.role === 'manager_investment') {
      return !startup.assignedManagerId || startup.assignedManagerId === manager?.id;
    }
    return false;
  };

  const handleAssignManagerConfirm = async (managerId: string, managerName: string) => {
    if (reassignStartup && !pendingStatusChange) {
      setAssignManagerModalOpen(false);
      try {
        const response = await startupsApi.update(reassignStartup.id, { assignedManagerId: managerId });
        if (!response.success) {
          toast.error(response.error || t('startups.assignManagerError', 'Не удалось назначить менеджера'));
          setReassignStartup(null);
          return;
        }
        setStartups(prev =>
          prev.map(s => s.id === reassignStartup.id
            ? { ...s, assignedManagerId: managerId, assignedManager: { id: managerId, name: managerName } as any }
            : s
          )
        );
        await startupsApi.addActivity(reassignStartup.id, {
          action: 'assigned',
          managerId: manager?.id,
          managerName: manager?.name,
          details: t('startups.activity.managerAssigned', { managerName }),
        });
      } catch (error) {
        console.error('Failed to reassign manager:', error);
      }
      setReassignStartup(null);
      return;
    }

    if (!pendingStatusChange) return;

    const { startup, newStatus, boardColumnId } = pendingStatusChange;

    if (newStatus === 'portfolio') {
      setPendingPortfolioMove({ startup, managerId, managerName });
      setAssignManagerModalOpen(false);
      setPendingStatusChange(null);
      setInvestmentModalOpen(true);
      return;
    }

    setAssignManagerModalOpen(false);
    const applied = await executeStatusChange(startup, newStatus, { assignedManagerId: managerId, assignedManagerName: managerName, boardColumnId });
    if (!applied) {
      setPendingStatusChange(null);
      return;
    }

    await startupsApi.addActivity(startup.id, {
      action: 'assigned',
      managerId: manager?.id,
      managerName: manager?.name,
      details: t('startups.activity.managerAssigned', { managerName }),
    });

    setPendingStatusChange(null);
  };

  const [portfolioTypeFilter, setPortfolioTypeFilter] = useState<'all' | 'investment' | 'program'>('all');

  const handleInvestmentConfirm = async (amount: number, valuationType: ValuationType, valuation?: number, isCoInvestment?: boolean, portfolioType?: 'investment' | 'program') => {
    if (!pendingPortfolioMove) return;

    setIsProcessingInvestment(true);
    const { startup, managerId, managerName } = pendingPortfolioMove;

    await executeStatusChange(startup, 'portfolio', {
      assignedManagerId: managerId,
      assignedManagerName: managerName,
      investmentAmount: amount,
      valuationType,
      valuation,
      isCoInvestment,
      portfolioType: portfolioType || 'investment',
      boardColumnId: null,
    });

    setIsProcessingInvestment(false);
    setInvestmentModalOpen(false);
    setPendingPortfolioMove(null);
  };

  const handleSendGateStartupToCommittee = async () => {
    if (!committeeGateDrop || isSendingToCommittee) return;
    const { startup } = committeeGateDrop;
    setIsSendingToCommittee(true);
    setCommitteeGateError('');
    try {
      const response = await startupsApi.sendToCommittee(startup.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || response.error || 'send_failed');
      }
      const sentToCommittee = (response.data as any).sentToCommittee;
      setStartups(prev => prev.map(s => (s.id === startup.id ? { ...s, sentToCommittee } : s)));
      setSelectedStartup(prev => (prev && prev.id === startup.id ? { ...prev, sentToCommittee } as Startup : prev));
      setCommitteeGateDrop(null);
      navigate('/investment-committee');
    } catch (error) {
      setCommitteeGateError(
        error instanceof Error ? error.message : t('startups.committeeGate.sendError')
      );
    } finally {
      setIsSendingToCommittee(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedStartup(null);
    setDragOverColumn(null);
    setDragOverPortfolioSub(null);
    setDragOverArchive(false);
  };

  const handleListStatusChange = (startupId: string, newStatus: StartupStatus) => {
    if (!permissions.canModifyStartups) return;
    const startup = startups.find(s => s.id === startupId);
    if (!startup || startup.status === newStatus) return;

    if (newStatus === 'new') {
      executeStatusChange(startup, newStatus, { assignedManagerId: '' });
      return;
    }

    if (newStatus === 'rejected') {
      setRejectModal({ startup });
      return;
    }

    if (newStatus === 'portfolio') {
      startPortfolioMove(startup);
      return;
    }

    if (!startup.assignedManagerId) {
      setPendingStatusChange({ startup, newStatus });
      setAssignManagerModalOpen(true);
      return;
    }

    executeStatusChange(startup, newStatus);
  };

  const handleAddStartup = async (brief: Record<string, any>) => {
    const organizationId = manager?.organizationId;
    if (!organizationId) {
      console.error('Cannot add startup: no organizationId');
      return;
    }

    const materialFiles = (brief.materialFiles || {}) as Partial<Record<StartupMaterialField, File | null>>;
    const selectedStatus = (brief.status as StartupStatus) || 'new';
    const shouldAssignManager = selectedStatus !== 'new';

    if (brief.submitViaSubmissionApi) {
      const pitchDeck = materialFiles.pitchDeck;
      if (!pitchDeck) {
        throw new Error('Pitch deck is required for submission API flow');
      }

      try {
        await startupsApi.submitStartup(
          brief.submissionApplication,
          (i18n.language || 'ru').split('-')[0],
          pitchDeck,
          brief.logoFile || undefined,
          materialFiles.onePager || undefined,
          materialFiles.financialModel || undefined,
        );

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const response = await startupsApi.getAll(organizationId);
        if (response.success && response.data) {
          setStartups(response.data.map(convertApiStartup));
        }
        return;
      } catch (error) {
        console.error('Failed to submit startup through submission API:', error);
        throw error;
      }
    }

    const newStartupData = {
      organizationId,
      logo: brief.logo || '',
      brief: {
        companyName: brief.companyName || 'New Venture',
        name: brief.companyName || 'New Venture',
        industry: brief.industry || 'Tech',
        website: brief.website || '',
        description: brief.description || '',
        stage: brief.stage || 'Pre-Seed',
        foundedYear: brief.foundedYear || new Date().getFullYear(),
        teamSize: brief.teamSize || 0,
        fundingRequest: brief.fundingRequest || 0,
        itpvFundingRequest: brief.itpvFundingRequest ?? brief.fundingRequest ?? 0,
        totalRoundSize: brief.totalRoundSize || 0,
        useOfFunds: '',
        pitchDeckUrl: brief.pitchDeckUrl,
        country: brief.country,
        founderName: brief.founderName,
        founderEmail: brief.founderEmail,
        founderPhone: brief.founderPhone,
        founderRole: brief.founderRole,
        founderLinkedin: brief.founderLinkedin,
        businessModel: brief.businessModel,
        businessModelDescription: brief.businessModelDescription,
        hasTechnology: brief.hasTechnology,
        technologyDescription: brief.technologyDescription,
        hasUsers: brief.hasUsers,
        userCount: brief.userCount,
        activeUsersPerMonth: brief.activeUsersPerMonth,
        payingUsersPerMonth: brief.payingUsersPerMonth,
        hasPayingCustomers: brief.hasPayingCustomers,
        customerAcquisitionCost: brief.customerAcquisitionCost,
        churnRate: brief.churnRate,
        founderBackground: brief.founderBackground,
        successfulProject: brief.successfulProject,
      },
      teamMembers: brief.teamMembers || [],
      investments: brief.investments || [],
      materials: brief.materials || {},
      status: selectedStatus,
      source: 'Fund' as const,
      managerId: shouldAssignManager ? brief.assignedManagerId || manager?.id : undefined,
      managerName: shouldAssignManager ? brief.assignedManagerName || manager?.name : undefined,
      managerAvatar: shouldAssignManager ? manager?.avatar : undefined,
      assignedManagerId: shouldAssignManager ? brief.assignedManagerId : undefined,
      analysisStatus: 'queued' as const,
    };

    try {
      const response = await startupsApi.create(newStartupData);
      if (response.success && response.data) {
        let apiStartup = response.data;
        let convertedStartup = convertApiStartup(apiStartup);

        setStartups((prev) => [convertedStartup, ...prev.filter((startup) => startup.id !== convertedStartup.id)]);

        for (const field of STARTUP_MATERIAL_UPLOAD_ORDER) {
          const file = materialFiles[field];
          if (!file) continue;

          const fileBase64 = await fileToDataUrl(file);
          const uploadResponse = await startupsApi.uploadMaterial(
            convertedStartup.id,
            field,
            fileBase64,
            file.name,
            file.type || 'application/octet-stream',
            { managerId: manager?.id, uploadedByName: manager?.name }
          );

          if (!uploadResponse.success || !uploadResponse.data) {
            throw new Error(uploadResponse.message || uploadResponse.error || `Failed to upload ${field}`);
          }

          apiStartup = uploadResponse.data;
          convertedStartup = convertApiStartup(apiStartup);
          setStartups((prev) => prev.map((startup) => (
            startup.id === convertedStartup.id ? convertedStartup : startup
          )));
        }

        const processingStartup = {
          ...convertedStartup,
          analysisStatus: 'processing' as const,
        };

        setStartups((prev) => {
          const exists = prev.some((startup) => startup.id === convertedStartup.id);
          if (!exists) return [processingStartup, ...prev];
          return prev.map((startup) => (
            startup.id === convertedStartup.id ? processingStartup : startup
          ));
        });

        void startupsApi.runFundGateScore(convertedStartup.id, manager?.id).then((scoreResponse) => {
          if (scoreResponse.success && scoreResponse.data) {
            const scoredStartup = convertApiStartup(scoreResponse.data);
            const completedStatus = scoredStartup.analysisStatus === 'failed'
              ? 'failed'
              : 'completed';
            setStartups((prev) => prev.map((startup) => (
              startup.id === convertedStartup.id
                ? {
                    ...startup,
                    ...scoredStartup,
                    assignedManager: scoredStartup.assignedManager || startup.assignedManager,
                    analysisStatus: completedStatus,
                  }
                : startup
            )));
            return;
          }

          setStartups((prev) => prev.map((startup) => (
            startup.id === convertedStartup.id
              ? {
                  ...startup,
                  analysisStatus: 'failed',
                  analysisError: scoreResponse.error || 'FundGate scoring failed',
                }
              : startup
          )));
        }).catch((error) => {
          setStartups((prev) => prev.map((startup) => (
            startup.id === convertedStartup.id
              ? {
                  ...startup,
                  analysisStatus: 'failed',
                  analysisError: error instanceof Error ? error.message : 'FundGate scoring failed',
                }
              : startup
          )));
        });
      }
    } catch (error) {
      console.error('Failed to create startup:', error);
      alert(t('startups.createError'));
    }
  };

  const getVisibleMobileStartups = (status: StartupStatus) => {
    const byStatus = getStartupsByStatus(status);
    if (status !== 'portfolio' || portfolioTypeFilter === 'all') return byStatus;

    return byStatus.filter((startup) => {
      const portfolioType = (startup as any).portfolioType;
      if (portfolioTypeFilter === 'investment') return !portfolioType || portfolioType === 'investment';
      return portfolioType === portfolioTypeFilter;
    });
  };

  if (isLoading) {
    return <StartupsSkeleton />;
  }

  const permanentDeleteMode = startupsToPermanentDelete.length > 1 ? 'bulk' : 'single';
  const permanentDeleteStartupName = startupsToPermanentDelete[0]?.brief.companyName || '';
  const permanentDeleteConfirmationText = permanentDeleteMode === 'bulk'
    ? t('startups.archive.permanentDeleteBulkConfirmationPhrase')
    : permanentDeleteStartupName;
  const activeMobileColumn = boardColumns.find((column) => column.id === mobileActiveColumnId) || boardColumns[0] || DEFAULT_BOARD_COLUMNS[0];

  return (
    <PageContainer>
      <ControlsHeader $isCollapsed={isCollapsed}>
        <StartupFilters
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onAddClick={permissions.canCreateStartup ? () => setIsAddModalOpen(true) : undefined}
          showMyOnly={showMyOnly}
          onShowMyOnlyChange={handleShowMyOnlyChange}
          managerOptions={managerFilterOptions}
          selectedManagerId={selectedManagerId}
          onManagerChange={handleManagerFilterChange}
          archiveCount={archiveCount}
        />
      </ControlsHeader>

      {isBoardSettingsOpen && (
        <BoardSettingsOverlay onClick={() => !isSavingBoardSettings && setIsBoardSettingsOpen(false)}>
          <BoardSettingsModal onClick={(event) => event.stopPropagation()}>
            <BoardSettingsHeader>
              <div>
                <BoardSettingsTitle>{t('startups.boardConstructor.title')}</BoardSettingsTitle>
                <BoardSettingsSubtitle>
                  {t('startups.boardConstructor.subtitle')}
                </BoardSettingsSubtitle>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ColumnActionButton type="button" onClick={toggleBoardHistory} disabled={isSavingBoardSettings}>
                  <History />
                  {boardHistoryOpen ? t('startups.boardConstructor.toConstructor') : t('startups.boardConstructor.history')}
                </ColumnActionButton>
                <ColumnActionButton type="button" onClick={() => setIsBoardSettingsOpen(false)} disabled={isSavingBoardSettings}>
                  <X />
                </ColumnActionButton>
              </div>
            </BoardSettingsHeader>
            <BoardSettingsBody>
              {boardSettingsError && <BoardSettingsError>{boardSettingsError}</BoardSettingsError>}
              {boardHistoryOpen ? (
                <ConstructorPane>
                  <PaneTitle>{t('startups.boardConstructor.historyTitle')}</PaneTitle>
                  {boardHistoryLoading && <ConstructorHint>{t('startups.boardConstructor.historyLoading')}</ConstructorHint>}
                  {!boardHistoryLoading && boardHistory.length === 0 && (
                    <ConstructorHint>{t('startups.boardConstructor.historyEmpty')}</ConstructorHint>
                  )}
                  {boardHistory.map((entry) => {
                    const actionLabel = entry.action === 'delete_column'
                      ? t('startups.boardConstructor.historyActions.delete_column')
                      : entry.action === 'restore'
                        ? t('startups.boardConstructor.historyActions.restore')
                        : t('startups.boardConstructor.historyActions.update');
                    const when = entry.replacedAt
                      ? formatShortDateTime(new Date(entry.replacedAt), i18n.language)
                      : '—';
                    return (
                      <StageRow key={entry.id}>
                        <StageInputs>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <StageCountPill>{when}</StageCountPill>
                            <StageCountPill>{t('startups.boardConstructor.beforeAction', { action: actionLabel })}</StageCountPill>
                            {entry.changedByName && <StageCountPill>{entry.changedByName}</StageCountPill>}
                          </div>
                          <ConstructorHint style={{ margin: 0 }}>
                            {t('startups.boardConstructor.columnsSummary', {
                              count: entry.columnsCount,
                              labels: entry.columnLabels.join(' · '),
                            })}
                          </ConstructorHint>
                        </StageInputs>
                        <ColumnActionButton
                          type="button"
                          onClick={() => restoreBoardHistory(entry.id)}
                          disabled={Boolean(restoringHistoryId)}
                        >
                          {restoringHistoryId === entry.id ? t('startups.boardConstructor.restoring') : t('startups.boardConstructor.restore')}
                        </ColumnActionButton>
                      </StageRow>
                    );
                  })}
                  <ConstructorHint>
                    {t('startups.boardConstructor.restoreHint')}
                  </ConstructorHint>
                </ConstructorPane>
              ) : (
              <ConstructorLayout>
                <ConstructorPane>
                  <PaneTitle>{t('startups.boardConstructor.columnsTitle')}</PaneTitle>
                  {boardDraftColumns.map((column, index) => {
                    const removableTargets = [...boardDraftColumns]
                      .filter((candidate) => candidate.id !== column.id)
                      .sort((a, b) => Number(b.lifecycleStatus === column.lifecycleStatus) - Number(a.lifecycleStatus === column.lifecycleStatus));
                    const lastOfLifecycle = !boardDraftColumns.some(
                      (candidate) => candidate.id !== column.id && candidate.lifecycleStatus === column.lifecycleStatus
                    );
                    const movable = index > 0 && index < boardDraftColumns.length - 1;
                    return (
                      <ConstructorColumnRow
                        key={column.id}
                        $selected={column.id === selectedDraftColumnId}
                        onClick={() => setSelectedDraftColumnId(column.id)}
                      >
                        <MoveButtonGroup onClick={(event) => event.stopPropagation()}>
                          <SmallIconButton
                            type="button"
                            onClick={() => moveDraftColumn(column.id, -1)}
                            disabled={!movable || index <= 1 || isSavingBoardSettings}
                            title={t('startups.boardConstructor.moveUp')}
                          >
                            <ChevronUp />
                          </SmallIconButton>
                          <SmallIconButton
                            type="button"
                            onClick={() => moveDraftColumn(column.id, 1)}
                            disabled={!movable || index >= boardDraftColumns.length - 2 || isSavingBoardSettings}
                            title={t('startups.boardConstructor.moveDown')}
                          >
                            <ChevronDown />
                          </SmallIconButton>
                        </MoveButtonGroup>
                        <ColumnColorSwatch $color={column.color} />
                        <ColumnInput
                          style={{ flex: 1, minWidth: 140 }}
                          value={column.label}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateDraftColumn(column.id, { label: event.target.value })}
                          disabled={isSavingBoardSettings}
                        />
                        <ColumnInput
                          type="color"
                          style={{ width: 52, flex: '0 0 auto', padding: 2 }}
                          value={column.color}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateDraftColumn(column.id, { color: event.target.value })}
                          disabled={isSavingBoardSettings}
                        />
                        {column.kind === 'custom' && (
                          <ColumnSelect
                            style={{ width: 150, flex: '0 0 auto' }}
                            value={column.lifecycleStatus}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateDraftColumn(column.id, { lifecycleStatus: event.target.value as StartupBoardLifecycleStatus })}
                            disabled={isSavingBoardSettings}
                            title={t('startups.boardConstructor.lifecycleTitle')}
                          >
                            <option value="in_review">{t('startups.boardEditor.lifecycle.in_review')}</option>
                            <option value="pipeline">{t('startups.boardEditor.lifecycle.pipeline')}</option>
                          </ColumnSelect>
                        )}
                        <StageCountPill>{t('startups.boardConstructor.stageCount', { count: (column.stages || []).length })}</StageCountPill>
                        {column.locked ? (
                          <LockedColumnPill>{t('startups.boardConstructor.required')}</LockedColumnPill>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }} onClick={(event) => event.stopPropagation()}>
                            <ColumnSelect
                              style={{ width: 150 }}
                              value={deleteColumnTarget[column.id] || removableTargets[0]?.id || ''}
                              onChange={(event) => setDeleteColumnTarget((prev) => ({ ...prev, [column.id]: event.target.value }))}
                              disabled={isSavingBoardSettings}
                              title={t('startups.boardConstructor.deleteTargetTitle')}
                            >
                              {removableTargets.map((target) => (
                                <option key={target.id} value={target.id}>→ {displayColumnLabel(target)}</option>
                              ))}
                            </ColumnSelect>
                            <SmallIconButton
                              type="button"
                              style={{ width: 40, height: 40, color: '#ef4444' }}
                              onClick={() => deleteDraftColumn(column)}
                              disabled={isSavingBoardSettings || removableTargets.length === 0 || lastOfLifecycle}
                              title={lastOfLifecycle
                                ? t('startups.boardConstructor.deleteLastLifecycleTitle')
                                : t('startups.boardConstructor.deleteTitle')}
                            >
                              <Trash2 />
                            </SmallIconButton>
                          </div>
                        )}
                      </ConstructorColumnRow>
                    );
                  })}
                  <ColumnActionButton type="button" onClick={addDraftColumn} disabled={isSavingBoardSettings}>
                    <Plus />
                    {t('startups.boardConstructor.addColumn')}
                  </ColumnActionButton>
                  <ConstructorHint>
                    {t('startups.boardConstructor.columnsHint')}
                  </ConstructorHint>
                </ConstructorPane>
                <ConstructorPane>
                  {(() => {
                    const selected = boardDraftColumns.find((column) => column.id === selectedDraftColumnId) || boardDraftColumns[0];
                    if (!selected) return null;
                    const stages = selected.stages || [];
                    const availablePresets = AVAILABLE_BOARD_STAGE_PRESETS.filter(
                      (preset) => !stages.some((stage) => stage.id === preset.id)
                    );
                    return (
                      <>
                        <PaneTitle>{t('startups.boardConstructor.stagesTitle', { label: displayColumnLabel(selected) })}</PaneTitle>
                        {stages.length === 0 && (
                          <ConstructorHint>{t('startups.boardConstructor.noStages')}</ConstructorHint>
                        )}
                        {stages.map((stage, stageIndex) => (
                          <StageRow key={stage.id}>
                            <MoveButtonGroup>
                              <SmallIconButton
                                type="button"
                                onClick={() => moveDraftStage(selected.id, stage.id, -1)}
                                disabled={stageIndex === 0 || isSavingBoardSettings}
                                title={t('startups.boardConstructor.moveUp')}
                              >
                                <ChevronUp />
                              </SmallIconButton>
                              <SmallIconButton
                                type="button"
                                onClick={() => moveDraftStage(selected.id, stage.id, 1)}
                                disabled={stageIndex === stages.length - 1 || isSavingBoardSettings}
                                title={t('startups.boardConstructor.moveDown')}
                              >
                                <ChevronDown />
                              </SmallIconButton>
                            </MoveButtonGroup>
                            <StageInputs>
                              <ColumnInput
                                value={stage.label}
                                maxLength={64}
                                onChange={(event) => updateDraftStage(selected.id, stage.id, { label: event.target.value })}
                                disabled={isSavingBoardSettings}
                                placeholder={t('startups.boardConstructor.stageNamePlaceholder')}
                              />
                              <StageDescriptionInput
                                value={stage.description || ''}
                                maxLength={240}
                                onChange={(event) => updateDraftStage(selected.id, stage.id, { description: event.target.value })}
                                disabled={isSavingBoardSettings}
                                placeholder={t('startups.boardConstructor.stageDescriptionPlaceholder')}
                                rows={2}
                              />
                            </StageInputs>
                            <SmallIconButton
                              type="button"
                              style={{ color: '#ef4444' }}
                              onClick={() => removeDraftStage(selected.id, stage.id)}
                              disabled={isSavingBoardSettings}
                              title={t('startups.boardConstructor.removeStage')}
                            >
                              <Trash2 />
                            </SmallIconButton>
                          </StageRow>
                        ))}
                        <AddStageRow>
                          <ColumnSelect
                            style={{ flex: 1, minWidth: 180 }}
                            value={stagePresetPick}
                            onChange={(event) => {
                              const presetId = event.target.value;
                              setStagePresetPick('');
                              if (presetId) addPresetStage(selected.id, presetId);
                            }}
                            disabled={isSavingBoardSettings || stages.length >= 12 || availablePresets.length === 0}
                          >
                            <option value="">{t('startups.boardConstructor.presetPlaceholder')}</option>
                            {availablePresets.map((preset) => (
                              <option key={preset.id} value={preset.id}>{displayPresetLabel(preset.id, preset.label)}</option>
                            ))}
                          </ColumnSelect>
                          <ColumnActionButton
                            type="button"
                            onClick={() => addCustomStage(selected.id)}
                            disabled={isSavingBoardSettings || stages.length >= 12}
                          >
                            <Plus />
                            {t('startups.boardConstructor.customStage')}
                          </ColumnActionButton>
                        </AddStageRow>
                        <ConstructorHint>
                          {t('startups.boardConstructor.stagesHint')}
                        </ConstructorHint>
                      </>
                    );
                  })()}
                </ConstructorPane>
              </ConstructorLayout>
              )}
            </BoardSettingsBody>
            <BoardSettingsFooter>
              <ColumnActionButton type="button" onClick={() => setIsBoardSettingsOpen(false)} disabled={isSavingBoardSettings}>
                {t('common.cancel')}
              </ColumnActionButton>
              <ColumnActionButton
                type="button"
                $primary
                disabled={isSavingBoardSettings}
                onClick={async () => {
                  const saved = await saveBoardSettings();
                  if (saved) setIsBoardSettingsOpen(false);
                }}
              >
                {isSavingBoardSettings ? t('startups.boardConstructor.saving') : t('common.save')}
              </ColumnActionButton>
            </BoardSettingsFooter>
          </BoardSettingsModal>
        </BoardSettingsOverlay>
      )}

      {pendingDrop && (
        <BoardSettingsOverlay onClick={() => setPendingDrop(null)}>
          <BoardSettingsModal style={{ width: 'min(500px, 100%)' }} onClick={(event) => event.stopPropagation()}>
            <BoardSettingsHeader>
              <div>
                <BoardSettingsTitle>{t('startups.boardConstructor.pendingDropTitle')}</BoardSettingsTitle>
                <BoardSettingsSubtitle>
                  {t('startups.boardConstructor.pendingDropSubtitle', {
                    startup: pendingDrop.startup.brief.companyName,
                    column: pendingDrop.fromLabel,
                    done: pendingDrop.total - pendingDrop.unfinished,
                    total: pendingDrop.total,
                  })}
                </BoardSettingsSubtitle>
              </div>
              <ColumnActionButton type="button" onClick={() => setPendingDrop(null)}>
                <X />
              </ColumnActionButton>
            </BoardSettingsHeader>
            <BoardSettingsBody>
              <PendingStageLabel>{t('startups.boardConstructor.pendingDropLabel')}</PendingStageLabel>
              <PendingStageList>
                {pendingDrop.pending.map((stage) => (
                  <PendingStageChip key={stage.id}>{stage.label}</PendingStageChip>
                ))}
              </PendingStageList>
              <DropConsequence>
                {t('startups.boardConstructor.pendingDropConsequence', { column: displayColumnLabel(pendingDrop.column) })}
              </DropConsequence>
            </BoardSettingsBody>
            <BoardSettingsFooter>
              <ColumnActionButton type="button" onClick={() => setPendingDrop(null)}>
                {t('common.cancel')}
              </ColumnActionButton>
              <ColumnActionButton
                type="button"
                $primary
                onClick={async () => {
                  const drop = pendingDrop;
                  setPendingDrop(null);
                  if (drop) await proceedWithDrop(drop.startup, drop.column);
                }}
              >
                {t('startups.boardConstructor.moveAnyway')}
              </ColumnActionButton>
            </BoardSettingsFooter>
          </BoardSettingsModal>
        </BoardSettingsOverlay>
      )}

      {committeeGateDrop && (
        <BoardSettingsOverlay onClick={() => setCommitteeGateDrop(null)}>
          <BoardSettingsModal style={{ width: 'min(520px, 100%)' }} onClick={(event) => event.stopPropagation()}>
            <BoardSettingsHeader>
              <div>
                <BoardSettingsTitle>{t('startups.committeeGate.title')}</BoardSettingsTitle>
                <BoardSettingsSubtitle>
                  {committeeGateDrop.gate.state === 'in_progress'
                    ? t('startups.committeeGate.subtitleInProgress', {
                        startup: committeeGateDrop.startup.brief?.companyName || '',
                      })
                    : t('startups.committeeGate.subtitleNotStarted', {
                        startup: committeeGateDrop.startup.brief?.companyName || '',
                      })}
                </BoardSettingsSubtitle>
              </div>
              <ColumnActionButton type="button" onClick={() => setCommitteeGateDrop(null)}>
                <X />
              </ColumnActionButton>
            </BoardSettingsHeader>
            <BoardSettingsBody>
              <CommitteeGateNotice>
                <AlertTriangle />
                <span>{t('startups.committeeGate.notice')}</span>
              </CommitteeGateNotice>
              {committeeGateDrop.gate.sentAt && (
                <DropConsequence>
                  {t('startups.committeeGate.sentAt', {
                    date: String(committeeGateDrop.gate.sentAt).slice(0, 10),
                  })}
                </DropConsequence>
              )}
              <DropConsequence>{t('startups.committeeGate.consequence')}</DropConsequence>
              {committeeGateError && <CommitteeGateError>{committeeGateError}</CommitteeGateError>}
            </BoardSettingsBody>
            <BoardSettingsFooter>
              <ColumnActionButton type="button" onClick={() => setCommitteeGateDrop(null)}>
                {t('common.cancel')}
              </ColumnActionButton>
              <ColumnActionButton
                type="button"
                onClick={() => {
                  const drop = committeeGateDrop;
                  setCommitteeGateDrop(null);
                  if (drop) drop.resume();
                }}
              >
                {t('startups.committeeGate.moveAnyway')}
              </ColumnActionButton>
              {permissions.isDirector && committeeGateDrop.gate.state === 'not_started' ? (
                <ColumnActionButton
                  type="button"
                  $primary
                  disabled={isSendingToCommittee}
                  onClick={handleSendGateStartupToCommittee}
                >
                  {isSendingToCommittee
                    ? t('startups.icPanel.sending')
                    : t('startups.committeeGate.sendToCommittee')}
                </ColumnActionButton>
              ) : (
                <ColumnActionButton
                  type="button"
                  $primary
                  onClick={() => {
                    setCommitteeGateDrop(null);
                    navigate('/investment-committee');
                  }}
                >
                  {t('startups.committeeGate.openCommittee')}
                </ColumnActionButton>
              )}
            </BoardSettingsFooter>
          </BoardSettingsModal>
        </BoardSettingsOverlay>
      )}

      <AddStartupModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStartup}
      />

      {quarterlyReportReviewStartups.length > 0 && (
        <QuarterlyReportsAlert>
          <QuarterlyReportsIcon>
            <BellRing />
          </QuarterlyReportsIcon>
          <QuarterlyReportsAlertBody>
            <QuarterlyReportsAlertTitle>
              {t('reports.quarterly.managerAlertTitle', 'Quarterly reports need review')}
              <QuarterlyReportsAlertPill>
                <FileCheck2 />
                {t('reports.quarterly.managerAlertCount', {
                  count: quarterlyReportReviewStartups.length,
                  defaultValue: `${quarterlyReportReviewStartups.length} reports`,
                })}
              </QuarterlyReportsAlertPill>
            </QuarterlyReportsAlertTitle>
            <QuarterlyReportsAlertText>
              {t(
                'reports.quarterly.managerAlertBody',
                'Founders submitted new quarterly updates. Review metrics, files and send approval or revision requests from the startup drawer.'
              )}
            </QuarterlyReportsAlertText>
            <QuarterlyReportsPreviewList>
              {quarterlyReportReviewStartups.slice(0, 3).map((startup) => {
                const period = startup.lastQuarterlyReportPeriod;
                const periodLabel = period ? `${period.quarter} ${period.year}` : t('reports.quarterly.untitled', 'Quarterly report');
                return (
                  <QuarterlyReportsStartupButton
                    key={startup.id}
                    type="button"
                    onClick={() => handleStartupClick(startup)}
                    title={`${startup.brief.companyName} · ${periodLabel}`}
                  >
                    {startup.brief.companyName} · {periodLabel}
                  </QuarterlyReportsStartupButton>
                );
              })}
            </QuarterlyReportsPreviewList>
          </QuarterlyReportsAlertBody>
          <QuarterlyReportsAlertActions>
            <QuarterlyReportsAlertButton
              type="button"
              $primary={!showQuarterlyReportsOnly}
              onClick={handleShowQuarterlyReports}
            >
              <FileCheck2 />
              {showQuarterlyReportsOnly
                ? t('reports.quarterly.managerAlertShowing', 'Showing reports')
                : t('reports.quarterly.managerAlertShow', 'Show reports')}
            </QuarterlyReportsAlertButton>
            {showQuarterlyReportsOnly && (
              <QuarterlyReportsAlertButton
                type="button"
                onClick={() => setShowQuarterlyReportsOnly(false)}
              >
                {t('reports.quarterly.managerAlertReset', 'Show all')}
              </QuarterlyReportsAlertButton>
            )}
            <QuarterlyReportsAlertButton
              type="button"
              onClick={handleOpenFirstQuarterlyReport}
            >
              {t('reports.quarterly.managerAlertOpenFirst', 'Open first')}
              <ArrowRight />
            </QuarterlyReportsAlertButton>
          </QuarterlyReportsAlertActions>
        </QuarterlyReportsAlert>
      )}

      {selectedStatus === 'archived' ? (
        <ArchiveGrid>
          <SingleStatusHeader>
            <SingleStatusTitle>{t('startups.status.archived')}</SingleStatusTitle>
            <SingleStatusCount>{filteredStartups.length}</SingleStatusCount>
            {archiveSelectionMode && (
              <ArchiveHeaderActions>
                <ArchiveSelectionCount>
                  {t('startups.archive.selectedCount', { count: selectedArchivedStartups.length })}
                </ArchiveSelectionCount>
                <ArchiveSelectionButton
                  type="button"
                  onClick={handleSelectAllVisibleArchived}
                  disabled={filteredStartups.length === 0 || selectedArchivedStartups.length === filteredStartups.length}
                >
                  {t('startups.archive.selectAllVisible')}
                </ArchiveSelectionButton>
                <ArchiveSelectionButton
                  type="button"
                  $danger
                  onClick={handleOpenBulkPermanentDeleteModal}
                  disabled={selectedArchivedStartups.length === 0}
                >
                  <Trash2 />
                  {t('startups.archive.deleteSelectedButton')}
                </ArchiveSelectionButton>
                <ArchiveSelectionButton type="button" onClick={clearArchiveSelection}>
                  <X />
                  {t('startups.archive.clearSelection')}
                </ArchiveSelectionButton>
              </ArchiveHeaderActions>
            )}
          </SingleStatusHeader>
          {filteredStartups.length > 0 ? (
            filteredStartups.map((startup) => {
              const isSelected = selectedArchivedIds.has(startup.id);
              return (
                <ArchiveSelectableCard
                  key={startup.id}
                  $selected={isSelected}
                  $selectionMode={archiveSelectionMode}
                  onMouseDown={(event) => handleArchiveCardPressStart(event, startup)}
                  onMouseUp={handleArchiveCardPressEnd}
                  onMouseLeave={handleArchiveCardPressEnd}
                  onTouchStart={(event) => handleArchiveCardPressStart(event, startup)}
                  onTouchEnd={handleArchiveCardPressEnd}
                  onTouchCancel={handleArchiveCardPressEnd}
                  onContextMenu={(event) => {
                    if (archiveSelectionMode || isSelected) event.preventDefault();
                  }}
                >
                  <StartupCard
                    startup={startup}
                    onClick={() => handleArchivedCardClick(startup)}
                    getStatusVariant={getStatusVariant}
                    onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                    onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                    onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                  />
                  <ArchiveSelectionBadge $selected={isSelected} $selectionMode={archiveSelectionMode}>
                    {isSelected && <Check />}
                  </ArchiveSelectionBadge>
                </ArchiveSelectableCard>
              );
            })
          ) : (
            <ArchiveEmptyState>
              <Inbox size={48} />
              <div>{t('startups.noStartups')}</div>
            </ArchiveEmptyState>
          )}
        </ArchiveGrid>
      ) : selectedStatus !== 'all' && (selectedStatus as string) !== 'archived' ? (
        <SingleStatusGrid>
          <SingleStatusHeader>
            <SingleStatusTitle>{statusLabels[selectedStatus]}</SingleStatusTitle>
            <SingleStatusCount>{filteredStartups.length}</SingleStatusCount>
          </SingleStatusHeader>
          {filteredStartups.length > 0 ? (
            filteredStartups.map((startup) => (
              <StartupCard
                key={startup.id}
                startup={startup}
                onClick={() => handleStartupClick(startup)}
                getStatusVariant={getStatusVariant}
                onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                onReassignManager={canReassignStartup(startup) ? handleReassignManager : undefined}
                onCreateCabinet={permissions.canModifyStartups ? handleCreateCabinet : undefined}
              />
            ))
          ) : (
            <ArchiveEmptyState>
              <Inbox size={48} />
              <div>{t('startups.noStartups')}</div>
            </ArchiveEmptyState>
          )}
        </SingleStatusGrid>
      ) : viewMode === 'kanban' ? (
        <>
          <MobileColumnTabs>
            {boardColumns.map((column) => {
              const count = column.lifecycleStatus === 'new'
                ? getStartupsByColumn(column).length + greyZoneStartups.length
                : getStartupsByColumn(column).length;
              return (
                <MobileColumnTab
                  key={column.id}
                  $active={mobileActiveColumnId === column.id}
                  $color={column.color}
                  onClick={() => {
                    setMobileActiveColumnId(column.id);
                  }}
                >
                  {displayColumnLabel(column)}
                  <MobileTabCount
                    $active={mobileActiveColumnId === column.id}
                    title={t('startups.columnCount.tooltip', {
                      current: count,
                      total: cumulativeCountByColumn[column.id] || count,
                    })}
                  >
                    {count}
                  </MobileTabCount>
                </MobileColumnTab>
              );
            })}
          </MobileColumnTabs>

          <MobileKanbanView>
            {activeMobileColumn?.lifecycleStatus === 'portfolio' && (
              <div style={{ display: 'flex', gap: 6, padding: '8px 12px 0', flexWrap: 'wrap' }}>
                {(['all', 'investment', 'program'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPortfolioTypeFilter(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: portfolioTypeFilter === f ? '#10b981' : 'rgba(255,255,255,0.08)',
                      color: portfolioTypeFilter === f ? '#fff' : 'rgba(255,255,255,0.55)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f === 'investment' && <TrendingUp size={12} strokeWidth={2.5} />}
                    {f === 'program' && <Handshake size={12} strokeWidth={2.5} />}
                    {f === 'all'
                      ? t('startups.portfolio.filterAll')
                      : f === 'investment'
                        ? t('startups.portfolio.investmentLabel')
                        : t('startups.portfolio.programLabel')}
                  </button>
                ))}
              </div>
            )}
            <MobileColumnContent>
              {activeMobileColumn?.lifecycleStatus === 'new' ? (
                <>
                  <PortfolioSubHeader $accent="#3b82f6">
                    <Inbox size={12} strokeWidth={2.5} />
                    <span>{displayColumnLabel(activeMobileColumn)}</span>
                    <span className="count">{getStartupsByColumn(activeMobileColumn).length}</span>
                  </PortfolioSubHeader>
                  {getStartupsByColumn(activeMobileColumn).map((startup) => (
                    <StartupCard
                      key={startup.id}
                      startup={startup}
                      onClick={() => handleStartupClick(startup)}
                      getStatusVariant={getStatusVariant}
                      onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                      onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                      onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                      onReassignManager={canReassignStartup(startup) ? handleReassignManager : undefined}
                      onCreateCabinet={permissions.canModifyStartups ? handleCreateCabinet : undefined}
                    />
                  ))}
                  {getStartupsByColumn(activeMobileColumn).length === 0 && (
                    <EmptyState>
                      <Inbox size={24} />
                      <div>{t('startups.noStartups')}</div>
                    </EmptyState>
                  )}

                  {GREY_ZONE_ENABLED && (
                    <>
                      <PortfolioSubHeader $accent="#94a3b8">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        <span>{t('startups.greyZone.title')}</span>
                        <span className="count">{greyZoneStartups.length}</span>
                      </PortfolioSubHeader>
                      {greyZoneStartups.map((startup) => (
                        <StartupCard
                          key={startup.id}
                          startup={startup}
                          onClick={() => handleStartupClick(startup)}
                          getStatusVariant={getStatusVariant}
                          onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                          onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                          onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                          onReassignManager={canReassignStartup(startup) ? handleReassignManager : undefined}
                          onCreateCabinet={permissions.canModifyStartups ? handleCreateCabinet : undefined}
                        />
                      ))}
                      {greyZoneStartups.length === 0 && (
                        <EmptyState>
                          <Inbox size={24} />
                          <div>{t('startups.noStartups')}</div>
                        </EmptyState>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {activeMobileColumn && getVisibleMobileStartups(activeMobileColumn.lifecycleStatus as StartupStatus)
                    .filter((startup) => columnIdForStartup(startup, boardColumns) === activeMobileColumn.id)
                    .map((startup) => (
                    <StartupCard
                      key={startup.id}
                      startup={startup}
                      onClick={() => handleStartupClick(startup)}
                      getStatusVariant={getStatusVariant}
                      onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                      onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                      onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                      onReassignManager={canReassignStartup(startup) ? handleReassignManager : undefined}
                      onCreateCabinet={permissions.canModifyStartups ? handleCreateCabinet : undefined}
                    />
                  ))}
                  {(!activeMobileColumn || getVisibleMobileStartups(activeMobileColumn.lifecycleStatus as StartupStatus)
                    .filter((startup) => columnIdForStartup(startup, boardColumns) === activeMobileColumn.id).length === 0) && (
                    <EmptyState>
                      <Inbox size={24} />
                      <div>{t('startups.noStartups')}</div>
                    </EmptyState>
                  )}
                </>
              )}
            </MobileColumnContent>
          </MobileKanbanView>

          <DesktopKanbanViewport>
            <DesktopKanbanBoard ref={desktopKanbanRef} onScroll={updateKanbanScrollHint}>
              {boardColumns.map((column) => {
              const status = column.lifecycleStatus as StartupStatus;
              const statusStartups = getStartupsByColumn(column);
              const renderCard = (startup: typeof statusStartups[number]) => (
                <DraggableCardWrapper
                  key={startup.id}
                  draggable={permissions.canModifyStartups}
                  onDragStart={(e) => handleDragStart(e, startup)}
                  onDragEnd={handleDragEnd}
                  $isDragging={draggedStartup?.id === startup.id}
                >
                  <StartupCard
                    startup={startup}
                    onClick={() => handleStartupClick(startup)}
                    getStatusVariant={getStatusVariant}
                    onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
                    onRestore={permissions.canModifyStartups ? handleRestore : undefined}
                    onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
                    onReassignManager={canReassignStartup(startup) ? handleReassignManager : undefined}
                  />
                </DraggableCardWrapper>
              );

              if (status === 'new') {
                const regularNewStartups = statusStartups;
                const greyStartups = GREY_ZONE_ENABLED ? greyZoneStartups : [];

                return (
                  <LinkedColumnGroup key={`linked-${column.id}`}>
                    <KanbanColumn
                    key={column.id}
                    $isOver={dragOverColumn === column.id}
                    onDragOver={(e) => handleDragOver(e, column)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column)}
                  >
                    <ColumnHeader>
                      <ColumnHeaderLeft>
                        <ColumnTitle>{displayColumnLabel(column)}</ColumnTitle>
                      </ColumnHeaderLeft>
                      <ColumnCountGroup
                        onMouseEnter={() => handleCountHoverEnter(column.id)}
                        onMouseLeave={handleCountHoverLeave}
                      >
                        <ColumnCountTotal>Σ {cumulativeCountByColumn[column.id] || regularNewStartups.length}</ColumnCountTotal>
                        <ColumnCount>{regularNewStartups.length}</ColumnCount>
                        {tooltipColumn === column.id && (
                          <CountTooltip>
                            <div><b>{regularNewStartups.length}</b> — {t('startups.columnCount.tooltipCurrent')}</div>
                            <div><b>Σ {cumulativeCountByColumn[column.id] || regularNewStartups.length}</b> — {t('startups.columnCount.tooltipTotal')}</div>
                          </CountTooltip>
                        )}
                      </ColumnCountGroup>
                    </ColumnHeader>
                    <ColumnCards>
                      {regularNewStartups.map(renderCard)}
                      {regularNewStartups.length === 0 && (
                        <EmptyState>
                          <Inbox size={24} />
                          <div>{t('startups.noStartups')}</div>
                        </EmptyState>
                      )}
                    </ColumnCards>
                    </KanbanColumn>
                    {GREY_ZONE_ENABLED ? (
                      <KanbanColumn
                      key={`${column.id}-grey-zone`}
                      $isOver={dragOverColumn === `${column.id}:grey-zone`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverArchive(false);
                        setDragOverColumn(`${column.id}:grey-zone`);
                        setDragOverPortfolioSub(null);
                      }}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleGreyZoneDrop(e)}
                    >
                      <ColumnHeader>
                        <ColumnHeaderLeft>
                          <AlertTriangle size={14} color="#94a3b8" />
                          <ColumnTitle>{t('startups.greyZone.title')}</ColumnTitle>
                        </ColumnHeaderLeft>
                        <ColumnCount>{greyStartups.length}</ColumnCount>
                      </ColumnHeader>
                      <ColumnCards>
                        {greyStartups.map(renderCard)}
                        {greyStartups.length === 0 && (
                          <EmptyState>
                            <AlertTriangle size={24} />
                            <div>{t('startups.noStartups')}</div>
                          </EmptyState>
                        )}
                      </ColumnCards>
                      </KanbanColumn>
                    ) : null}
                  </LinkedColumnGroup>
                );
              }

              if (status === 'portfolio') {
                const investmentStartups = statusStartups.filter(s => {
                  const pt = (s as any).portfolioType;
                  return !pt || pt === 'investment';
                });
                const programStartups = statusStartups.filter(s => (s as any).portfolioType === 'program');

                return (
                  <LinkedColumnGroup key={`linked-${column.id}`}>
                    <KanbanColumn
                    key={column.id}
                    $isOver={dragOverPortfolioSub === 'investment'}
                    onDragOver={(e) => handlePortfolioSubDragOver(e, 'investment')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handlePortfolioSubDrop(e, 'investment')}
                  >
                    <ColumnHeader>
                      <ColumnHeaderLeft>
                        <TrendingUp size={14} color="#10b981" />
                        <ColumnTitle>{displayColumnLabel(column)}</ColumnTitle>
                      </ColumnHeaderLeft>
                      <ColumnCount>{investmentStartups.length}</ColumnCount>
                    </ColumnHeader>
                    <ColumnCards>
                      {investmentStartups.map(renderCard)}
                      {investmentStartups.length === 0 && (
                        <EmptyState>
                          <Inbox size={24} />
                          <div>{t('startups.noStartups')}</div>
                        </EmptyState>
                      )}
                    </ColumnCards>
                    </KanbanColumn>
                    <KanbanColumn
                    key={`${column.id}-program`}
                    $isOver={dragOverPortfolioSub === 'program'}
                    onDragOver={(e) => handlePortfolioSubDragOver(e, 'program')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handlePortfolioSubDrop(e, 'program')}
                  >
                    <ColumnHeader>
                      <ColumnHeaderLeft>
                        <Handshake size={14} color="#a78bfa" />
                        <ColumnTitle>{t('startups.portfolio.programLabel')}</ColumnTitle>
                      </ColumnHeaderLeft>
                      <ColumnCount>{programStartups.length}</ColumnCount>
                    </ColumnHeader>
                    <ColumnCards>
                      {programStartups.map(renderCard)}
                      {programStartups.length === 0 && (
                        <EmptyState>
                          <Inbox size={24} />
                          <div>{t('startups.noStartups')}</div>
                        </EmptyState>
                      )}
                    </ColumnCards>
                    </KanbanColumn>
                  </LinkedColumnGroup>
                );
              }

              return (
                <KanbanColumn
                  key={column.id}
                  $isOver={dragOverColumn === column.id}
                  onDragOver={(e) => handleDragOver(e, column)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column)}
                >
                  <ColumnHeader>
                    <ColumnHeaderLeft>
                      {isDirector ? (
                        <ColumnHeaderControls
                          column={column}
                          editor={boardEditor}
                          canDelete={canDeleteBoardColumn(column)}
                          onRequestDelete={handleRequestDeleteColumn}
                          onEditStages={handleEditColumnStages}
                        />
                      ) : (
                        <ColumnTitle>{displayColumnLabel(column)}</ColumnTitle>
                      )}
                    </ColumnHeaderLeft>
                    <ColumnCountGroup
                      onMouseEnter={() => handleCountHoverEnter(column.id)}
                      onMouseLeave={handleCountHoverLeave}
                    >
                      <ColumnCountTotal>Σ {cumulativeCountByColumn[column.id] || statusStartups.length}</ColumnCountTotal>
                      <ColumnCount>{statusStartups.length}</ColumnCount>
                      {tooltipColumn === column.id && (
                        <CountTooltip>
                          <div><b>{statusStartups.length}</b> — {t('startups.columnCount.tooltipCurrent')}</div>
                          <div><b>Σ {cumulativeCountByColumn[column.id] || statusStartups.length}</b> — {t('startups.columnCount.tooltipTotal')}</div>
                        </CountTooltip>
                      )}
                    </ColumnCountGroup>
                  </ColumnHeader>
                  <ColumnCards>
                    {statusStartups.map(renderCard)}
                    {statusStartups.length === 0 && (
                      <EmptyState>
                        <Inbox size={24} />
                        <div>{t('startups.noStartups')}</div>
                      </EmptyState>
                    )}
                  </ColumnCards>
                </KanbanColumn>
              );
              })}
            </DesktopKanbanBoard>
            <KanbanScrollFade $visible={canScrollKanbanRight} />
            <KanbanScrollRightButton
              type="button"
              $visible={canScrollKanbanRight}
              onClick={scrollKanbanRight}
              aria-label={t('startups.kanban.scrollRight', 'Листать вправо')}
              title={t('startups.kanban.scrollRight', 'Листать вправо')}
            >
              <ChevronRight />
            </KanbanScrollRightButton>
          </DesktopKanbanViewport>
        </>
      ) : (
        <div style={{ padding: '16px', overflow: 'visible' }}>
          <StartupListView
            startups={filteredStartups}
            onClick={(id) => {
              const s = startups.find(x => x.id === id);
              if (s) handleStartupClick(s);
            }}
            getStatusVariant={getStatusVariant}
            onStatusChange={permissions.canModifyStartups ? handleListStatusChange : undefined}
            onReassignManager={(permissions.isDirector || permissions.role === 'manager_investment') ? handleReassignManager : undefined}
          />
        </div>
      )}

      <ArchiveDropZone
        $isVisible={Boolean(draggedStartup)}
        $isOver={dragOverArchive}
        onDragOver={handleArchiveDropDragOver}
        onDragLeave={handleArchiveDropDragLeave}
        onDrop={handleArchiveDrop}
        aria-hidden={!draggedStartup}
      >
        <Archive />
        <span>{t('startups.archive.dropToReject')}</span>
      </ArchiveDropZone>

      {selectedStartup && (
        <StartupDetailsSheet
          startup={selectedStartup}
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          onOpenFull={(id) => navigate(`/startups/${id}`, {})}
          onStartupUpdate={handleStartupUpdate}
          onArchive={permissions.canModifyStartups ? handleOpenArchiveModal : undefined}
          onRestore={permissions.canModifyStartups ? handleRestore : undefined}
          onPermanentDelete={permissions.canDeleteStartup ? handleOpenPermanentDeleteModal : undefined}
        />
      )}

      {deleteColumnState && (
        <ConfirmDeleteColumnModal
          isOpen
          column={deleteColumnState.column}
          targetColumnId={deleteColumnState.targetId}
          targetOptions={boardDeleteTargets(deleteColumnState.column)}
          affectedCount={startups.filter((s) => columnIdForStartup(s, boardColumns) === deleteColumnState.column.id).length}
          onChangeTarget={(id) => setDeleteColumnState((prev) => (prev ? { ...prev, targetId: id } : prev))}
          onConfirm={handleConfirmDeleteColumn}
          onCancel={() => setDeleteColumnState(null)}
          isLoading={boardEditor.isSaving}
        />
      )}
      <ConfirmArchiveModal
        isOpen={archiveModalOpen}
        startupName={startupToArchive?.brief.companyName || ''}
        onConfirm={handleConfirmArchive}
        onCancel={() => {
          setArchiveModalOpen(false);
          setStartupToArchive(null);
        }}
        isLoading={isArchiving}
      />

      <ConfirmPermanentDeleteModal
        isOpen={permanentDeleteModalOpen}
        mode={permanentDeleteMode}
        startupName={permanentDeleteStartupName}
        startupCount={startupsToPermanentDelete.length}
        confirmationText={permanentDeleteConfirmationText}
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => {
          setPermanentDeleteModalOpen(false);
          setStartupsToPermanentDelete([]);
          setPermanentDeleteSuccess(null);
        }}
        isLoading={isPermanentDeleting}
        successResult={permanentDeleteSuccess}
      />

      <AssignManagerModal
        isOpen={assignManagerModalOpen}
        startupName={pendingStatusChange?.startup.brief.companyName || reassignStartup?.brief.companyName || ''}
        currentAssignedManagerId={pendingStatusChange?.startup.assignedManagerId || reassignStartup?.assignedManagerId}
        targetStatusLabel={pendingStatusChange ? statusLabels[pendingStatusChange.newStatus] : undefined}
        onConfirm={handleAssignManagerConfirm}
        onCancel={() => {
          setAssignManagerModalOpen(false);
          setPendingStatusChange(null);
          setReassignStartup(null);
        }}
      />

      <InvestmentAmountModal
        isOpen={investmentModalOpen}
        startupName={pendingPortfolioMove?.startup.brief.companyName || ''}
        defaultPortfolioType={pendingPortfolioMove?.portfolioType}
        onConfirm={handleInvestmentConfirm}
        onCancel={() => {
          setInvestmentModalOpen(false);
          setPendingPortfolioMove(null);
        }}
        isLoading={isProcessingInvestment}
      />

      <RejectReasonModal
        open={!!rejectModal}
        startupName={rejectModal?.startup.brief.companyName || ''}
        onConfirm={(reason) => {
          if (rejectModal) {
            executeStatusChange(rejectModal.startup, 'rejected', { rejectionReason: reason });
          }
          setRejectModal(null);
        }}
        onCancel={() => setRejectModal(null)}
      />

      {cabinetStartup && (
        <CreateCabinetModal
          isOpen={cabinetModalOpen}
          onClose={() => {
            setCabinetModalOpen(false);
            setCabinetStartup(null);
          }}
          startupId={cabinetStartup.id}
          startupName={cabinetStartup.brief.companyName}
          founderEmail={cabinetStartup.brief.founderEmail}
        />
      )}
    </PageContainer>
  );
};

export default Startups;
