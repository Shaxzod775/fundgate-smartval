import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  DollarSign,
  MoreHorizontal,
  Calendar,
  Archive,
  RotateCcw,
  User,
  UserCog,
  KeyRound,
  MessageSquare,
  Handshake,
  FileCheck2,
  Scale,
  Cpu,
  Building2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Startup, StartupStatus } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { formatCountryName, getCountryFlag } from './AddStartupWizard/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { unreadFounderCommentsFor } from '../../../utils/unreadComments';
import { getRoadmapCardChips } from './StartupRoadmapPanel';
import { formatStartupStatusLabel } from '../../../utils/startupStatusDisplay';
import { getStartupAnalysisDisplay } from '../../../utils/analysisDisplay';
import { formatSmartValAmount, formatSmartValValuation } from '../../../utils/smartValValuation';
import { CrmImage } from '../../../components/ui/CrmImage';
import { formatDayMonth } from '../../../utils/formatDate';
import { numberLocale } from '../../../utils/formatNumber';

const stageTranslationKeys: Record<string, string> = {
  'Идея': 'startupDetail.sheet.stages.idea',
  MVP: 'startupDetail.sheet.stages.mvp',
  'MVP готов': 'startupDetail.sheet.stages.mvpReady',
  'MVP ready': 'startupDetail.sheet.stages.mvpReady',
  Прототип: 'startupDetail.sheet.stages.prototype',
  Prototype: 'startupDetail.sheet.stages.prototype',
  'Есть первые клиенты': 'startupDetail.sheet.stages.firstCustomers',
  'First customers': 'startupDetail.sheet.stages.firstCustomers',
  'Растущий бизнес': 'startupDetail.sheet.stages.growthBusiness',
  'Growing business': 'startupDetail.sheet.stages.growthBusiness',
  'Pre-Seed': 'startupDetail.sheet.stages.preSeed',
  Seed: 'startupDetail.sheet.stages.seed',
  'Series A': 'startupDetail.sheet.stages.roundA',
  'Series B': 'startupDetail.sheet.stages.roundB',
  'Series C': 'startupDetail.sheet.stages.roundC',
};

const CHIP_ROW_HEIGHT = 24;
const CHIP_GAP = 6;
const STATUS_CHIP_ROWS = 1;
const DD_CHIP_ROWS = 2;
const CHIP_ROW_WIDTH = 200;
const VISIBLE_METRICS = 3;
const DASH = '—';

const chipAreaHeight = (rows: number): number => rows * CHIP_ROW_HEIGHT + (rows - 1) * CHIP_GAP;

export interface PackableChip {
  key: string;
  label: string;
  withIcon?: boolean;
}

const CHIP_CHAR_WIDTH = 7.2; // ширина глифа 11px/700, замерена по кириллице в чипах
const CHIP_BOX_WIDTH = 16; // padding 7px × 2 + border 1px × 2
const CHIP_ICON_WIDTH = 17; // иконка 12px + gap 5px

export const estimateChipWidth = (label: string, withIcon?: boolean): number =>
  CHIP_BOX_WIDTH + (withIcon ? CHIP_ICON_WIDTH : 0) + Math.ceil(label.length * CHIP_CHAR_WIDTH);

const chipsThatFit = (chips: PackableChip[], rows: number, width: number): number => {
  let row = 1;
  let used = 0;
  let fitted = 0;
  for (const chip of chips) {
    const chipWidth = estimateChipWidth(chip.label, chip.withIcon);
    const needed = used === 0 ? chipWidth : used + CHIP_GAP + chipWidth;
    if (needed <= width) {
      used = needed;
    } else {
      row += 1;
      if (row > rows) break;
      used = chipWidth;
    }
    fitted += 1;
  }
  return fitted;
};

export function packCardChips<T extends PackableChip>(
  chips: T[],
  rows: number,
  width: number = CHIP_ROW_WIDTH,
): { visible: T[]; hidden: T[] } {
  const fitted = chipsThatFit(chips, rows, width);
  if (fitted >= chips.length) return { visible: chips, hidden: [] };

  for (let take = fitted; take > 0; take -= 1) {
    const counter: PackableChip = { key: '__more__', label: `+${chips.length - take}` };
    if (chipsThatFit([...chips.slice(0, take), counter], rows, width) === take + 1) {
      return { visible: chips.slice(0, take), hidden: chips.slice(take) };
    }
  }
  return { visible: chips.slice(0, 1), hidden: chips.slice(1) };
}

type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
type FinancialsTone = 'neutral' | 'investment' | 'program';

interface StatusChipModel extends PackableChip {
  tone: ChipTone;
  icon?: LucideIcon;
  title?: string;
}

const CardContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  will-change: transform;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) =>
      theme.mode === 'light'
        ? theme.shadows.md
        : '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'};

    .actions-btn {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const CardHeader = styled.div`
  flex: none;
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  height: 48px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
`;

const StartupName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  height: 20px;
  line-height: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  /* Место под «⋯»-кнопку в правом верхнем углу карточки. */
  padding-right: 22px;
  /* Truncate the company name itself (first child span / text node) but
     keep trailing badges (NEW, etc.) fully visible. */
  & > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
`;

const StartupIndustry = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  height: 16px;
  line-height: 16px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

const UnreadCommentsPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
  animation: pulse-unread 1.6s ease-in-out infinite;

  svg {
    width: 12px;
    height: 12px;
  }

  @keyframes pulse-unread {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  }
`;

const DocumentsReadyPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55);
  animation: pulse-documents-ready 1.8s ease-in-out infinite;

  svg {
    width: 12px;
    height: 12px;
  }

  @keyframes pulse-documents-ready {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
    50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
  }
`;

const ChipArea = styled.div<{ $rows: number; $last?: boolean }>`
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  gap: ${CHIP_GAP}px;
  height: ${({ $rows }) => chipAreaHeight($rows)}px;
  overflow: hidden;
  margin-bottom: ${({ $last, theme }) => ($last ? '0' : theme.spacing[2])};
`;

const chipColor = (tone: ChipTone): string => {
  if (tone === 'success') return '#10b981';
  if (tone === 'warning') return '#f59e0b';
  if (tone === 'danger') return '#ef4444';
  if (tone === 'info') return '#38bdf8';
  return 'rgba(148, 163, 184, 0.9)';
};

const chipBackground = (tone: ChipTone): string => {
  if (tone === 'success') return 'rgba(16,185,129,0.1)';
  if (tone === 'warning') return 'rgba(245,158,11,0.1)';
  if (tone === 'danger') return 'rgba(239,68,68,0.1)';
  if (tone === 'info') return 'rgba(56,189,248,0.1)';
  return 'rgba(148,163,184,0.08)';
};

const chipBorder = (tone: ChipTone): string => {
  if (tone === 'success') return 'rgba(16,185,129,0.24)';
  if (tone === 'warning') return 'rgba(245,158,11,0.24)';
  if (tone === 'danger') return 'rgba(239,68,68,0.24)';
  if (tone === 'info') return 'rgba(56,189,248,0.24)';
  return 'rgba(148,163,184,0.14)';
};

const StatusChip = styled.span<{ $tone: ChipTone; $capped?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  /* Когда рядом есть счётчик «+N», чип не имеет права занять весь ряд. */
  max-width: ${({ $capped }) => ($capped ? 'calc(100% - 44px)' : '100%')};
  height: ${CHIP_ROW_HEIGHT}px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $tone }) => chipColor($tone)};
  background: ${({ $tone }) => chipBackground($tone)};
  border: 1px solid ${({ $tone }) => chipBorder($tone)};

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const MoreChip = styled(StatusChip)`
  flex: none;
  cursor: help;
`;

const DDChip = styled.span<{ $tone: 'idle' | 'active' | 'done' | 'risk' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: ${CHIP_ROW_HEIGHT}px;
  /* Ровно два чипа в ряду при любой ширине карточки: три трека всегда дают
     два ряда, а на узкой карточке подпись урезается вместо переноса в
     обрезанный третий ряд. */
  max-width: calc(50% - 3px);
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $tone, theme }) => {
    if ($tone === 'done') return theme.colors.status.success;
    if ($tone === 'risk') return theme.colors.status.danger;
    if ($tone === 'active') return theme.colors.status.info;
    return theme.colors.text.tertiary;
  }};
  background: ${({ $tone }) => {
    if ($tone === 'done') return 'rgba(16,185,129,0.1)';
    if ($tone === 'risk') return 'rgba(239,68,68,0.1)';
    if ($tone === 'active') return 'rgba(56,189,248,0.1)';
    return 'rgba(148,163,184,0.08)';
  }};
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'done') return 'rgba(16,185,129,0.22)';
    if ($tone === 'risk') return 'rgba(239,68,68,0.24)';
    if ($tone === 'active') return 'rgba(56,189,248,0.22)';
    return 'rgba(148,163,184,0.12)';
  }};

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const EmptySlotHint = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.6;
`;

const NewBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #8CC63F 0%, #6BA82C 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  line-height: 1.4;
  white-space: nowrap;
  vertical-align: middle;
  text-transform: uppercase;
  box-shadow: 0 1px 4px rgba(140, 198, 63, 0.45);
  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
    animation: newBadgePulse 1.6s ease-in-out infinite;
  }
  @keyframes newBadgePulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.4; }
  }
`;

const NEW_BADGE_TTL_MS = 24 * 60 * 60 * 1000;
function isFreshlyCreated(createdAt: string | Date | undefined | null): boolean {
  if (!createdAt) return false;
  const ts = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < NEW_BADGE_TTL_MS;
}

const CountryRow = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 18px;
  line-height: 18px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
`;

const CardBadgeRow = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
  height: 24px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const CardBadge = styled(Badge)`
  display: block;
  flex: 0 1 auto;
  max-width: 100%;
  min-width: 0;
  height: 22px;
  line-height: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Стадия важнее бизнес-модели: она держит ширину, урезается вторая. */
  &:first-child {
    flex: 0 0 auto;
    max-width: 65%;
  }
`;

const FinancialsBox = styled.div<{ $tone: FinancialsTone }>`
  flex: none;
  height: 52px;
  padding: 7px 10px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: ${({ $tone, theme }) => {
    if ($tone === 'investment') return 'rgba(16, 185, 129, 0.1)';
    if ($tone === 'program') return 'rgba(139, 92, 246, 0.12)';
    return theme.colors.bg.tertiary;
  }};
  border: 1px solid ${({ $tone, theme }) => {
    if ($tone === 'investment') return 'rgba(16, 185, 129, 0.3)';
    if ($tone === 'program') return 'rgba(139, 92, 246, 0.3)';
    return theme.colors.border.secondary;
  }};
`;

const FinancialsHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  height: 18px;
  line-height: 18px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const FinancialsLabel = styled.span<{ $tone: FinancialsTone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: ${({ $tone, theme }) => {
    if ($tone === 'investment') return '#10b981';
    if ($tone === 'program') return '#a78bfa';
    return theme.colors.text.muted;
  }};

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const FinancialsValue = styled.span<{ $tone: FinancialsTone }>`
  flex: none;
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
  color: ${({ $tone, theme }) => ($tone === 'neutral' ? theme.colors.accent.primary : theme.colors.text.primary)};
`;

const MetricsLine = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  height: 16px;
  line-height: 16px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

const MetricsList = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;

  b {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`;

const MetricsMore = styled.span`
  flex: none;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const CardMeta = styled.div`
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  height: 34px;
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const MetaGroup = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: nowrap;
  overflow: hidden;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ActionsButton = styled.button<{ $active?: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  right: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.muted};
  /* Кнопка «⋯» проявляется только при наведении на карточку (см. CardContainer). */
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: all 0.2s;
  cursor: pointer;
  padding: 5px;
  border-radius: 8px;
  z-index: 10;
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover,
  &:focus-visible {
    opacity: 1;
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* На тач-устройствах hover не бывает — там кнопка видна всегда. */
  @media (hover: none) {
    opacity: 1;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 36px;
  right: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 180px;
  z-index: 100;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-8px)')};
  transition: all 0.15s ease;
  overflow: hidden;
`;

const DropdownItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  color: ${({ theme, $danger }) => $danger ? theme.colors.status.danger : theme.colors.text.primary};
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme, $danger }) => $danger ? theme.colors.status.danger : theme.colors.text.muted};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const Score = styled.div<{ $score: number }>`
  flex: 0 0 auto;
  height: 24px;
  min-width: 38px;
  background: ${({ $score }) => {
    if ($score >= 80) return 'rgba(16, 185, 129, 0.1)';
    if ($score >= 60) return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  }};
  padding: 0 7px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  border: 1px solid ${({ $score }) => {
    if ($score >= 80) return 'rgba(16, 185, 129, 0.24)';
    if ($score >= 60) return 'rgba(245, 158, 11, 0.24)';
    return 'rgba(239, 68, 68, 0.24)';
  }};
  color: ${({ $score, theme }) => {
    if ($score >= 80) return theme.colors.status.success;
    if ($score >= 60) return theme.colors.status.warning;
    return theme.colors.status.danger;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  &::before {
    content: '★';
    font-size: 11px;
    opacity: 0.8;
  }
`;

const ScoreStatus = styled.div<{ $tone: 'pending' | 'failed' | 'empty' }>`
  flex: 0 0 auto;
  height: 24px;
  max-width: 104px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'pending') return 'rgba(56, 189, 248, 0.35)';
    if ($tone === 'empty') return 'rgba(148, 163, 184, 0.28)';
    return 'rgba(239, 68, 68, 0.35)';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'pending') return '#38bdf8';
    if ($tone === 'empty') return '#94a3b8';
    return '#ef4444';
  }};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ManagerRow = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ManagerAvatar = styled.div<{ $empty?: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1.5px solid ${({ $empty, theme }) => ($empty ? theme.colors.border.secondary : theme.colors.accent.primary)};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 12px;
    height: 12px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ManagerName = styled.span<{ $empty?: boolean }>`
  font-size: 11px;
  color: ${({ $empty, theme }) => ($empty ? theme.colors.text.tertiary : theme.colors.text.muted)};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value.toLocaleString(numberLocale())}`;
};

const documentRequestsNeedingReviewCount = (startup: Startup): number => (
  (startup.documentRequests || []).filter((request) => (
    request.status === 'submitted' ||
    request.items.some((item) => item.status === 'uploaded')
  )).length
);

const ddTone = (track?: { status?: string; riskLevel?: string }) => {
  if (!track || track.status === 'not_started') return 'idle' as const;
  if (track.riskLevel === 'high' || track.riskLevel === 'critical' || track.status === 'blocked') return 'risk' as const;
  if (track.status === 'completed') return 'done' as const;
  return 'active' as const;
};

const quarterlyReportTone = (status?: string): ChipTone => {
  if (status === 'approved') return 'success';
  if (status === 'changes_requested') return 'danger';
  if (status === 'requested') return 'neutral';
  return 'info';
};

interface StartupCardProps {
  startup: Startup;
  onClick: (id: string) => void;
  getStatusVariant: (status: StartupStatus) => 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  onArchive?: (startup: Startup) => void;
  onRestore?: (startup: Startup) => void;
  onPermanentDelete?: (startup: Startup) => void;
  onReassignManager?: (startup: Startup) => void;
  onCreateCabinet?: (startup: Startup) => void;
}

export const StartupCard = ({ startup, onClick, getStatusVariant, onArchive, onRestore, onPermanentDelete, onReassignManager, onCreateCabinet }: StartupCardProps) => {
  const { t, i18n } = useTranslation();
  const { manager } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const language = i18n.resolvedLanguage || i18n.language;

  const fallbackValuation = startup.aiAnalysis?.valuation || startup.metrics?.lastValuation;
  const valuationDisplay = formatSmartValValuation(startup.smartValDetails)
    || (fallbackValuation ? formatSmartValAmount(fallbackValuation) : '');
  const logoSrc = startup.logo || startup.fileUrls?.logo;
  const analysisDisplay = getStartupAnalysisDisplay(startup);
  const unreadCount = unreadFounderCommentsFor(startup, manager?.commentsSeen);
  const documentsReadyCount = documentRequestsNeedingReviewCount(startup);
  const roadmapChips = getRoadmapCardChips(startup, t);
  const crossFundApplications = (startup.crossFundApplications || []).filter(
    (a) => a.organizationId !== 'org-platform',
  );
  const crossFundTitle = crossFundApplications
    .map((application) => `${application.organizationName}: ${formatStartupStatusLabel(application.status, t)}`)
    .join('\n');
  const crossFundLabel = crossFundApplications.length === 1
    ? `${crossFundApplications[0].organizationName}: ${formatStartupStatusLabel(crossFundApplications[0].status, t)}`
    : t('startups.card.crossFundMore', { count: crossFundApplications.length });
  const ddTracks = [
    { key: 'finance', label: t('startups.dd.finance', 'Finance'), icon: DollarSign, track: startup.ddReviews?.finance },
    { key: 'legal', label: t('startups.dd.legal', 'Legal'), icon: Scale, track: startup.ddReviews?.legal },
    { key: 'technical', label: t('startups.dd.technical', 'Tech'), icon: Cpu, track: startup.ddReviews?.technical },
  ];
  const stageLabel = stageTranslationKeys[startup.brief.stage]
    ? t(stageTranslationKeys[startup.brief.stage])
    : startup.brief.stage;
  const reportPeriod = startup.lastQuarterlyReportPeriod;
  const reportLabel = reportPeriod
    ? `${reportPeriod.quarter} ${reportPeriod.year}`
    : t('reports.quarterly.untitled', 'Quarterly report');

  const statusChips: StatusChipModel[] = roadmapChips.map((chip, index) => ({
    key: `roadmap-${index}-${chip.label}`,
    label: chip.label,
    tone: chip.tone as ChipTone,
  }));
  if (crossFundApplications.length > 0) {
    statusChips.push({
      key: 'cross-fund',
      label: crossFundLabel,
      tone: 'success',
      icon: Building2,
      withIcon: true,
      title: crossFundTitle,
    });
  }
  if ((startup.pendingChangeCount || 0) > 0) {
    statusChips.push({
      key: 'pending-approvals',
      label: t('startups.approvals.pendingShort', {
        count: startup.pendingChangeCount,
        defaultValue: `${startup.pendingChangeCount} pending`,
      }),
      tone: 'warning',
      icon: FileCheck2,
      withIcon: true,
    });
  }
  if (startup.lastQuarterlyReportStatus) {
    const reportStatusLabel = t(`reports.status.${startup.lastQuarterlyReportStatus}`, startup.lastQuarterlyReportStatus);
    statusChips.push({
      key: 'quarterly-report',
      label: `${reportLabel}: ${reportStatusLabel}`,
      tone: quarterlyReportTone(startup.lastQuarterlyReportStatus),
      icon: FileCheck2,
      withIcon: true,
      title: reportStatusLabel,
    });
  }
  if (startup.resubmissionCount && startup.resubmissionCount > 0) {
    statusChips.push({
      key: 'previously-rejected',
      label: t('startups.card.previouslyRejected', { count: startup.resubmissionCount }),
      tone: 'warning',
      icon: RotateCcw,
      withIcon: true,
    });
  }
  const packedStatusChips = packCardChips(statusChips, STATUS_CHIP_ROWS);
  const hiddenChipsTitle = packedStatusChips.hidden.map((chip) => chip.label).join('\n');

  const metrics = startup.metrics;
  const metricEntries: Array<{ key: string; short: string; full: string; value: string }> = [];
  if (metrics) {
    if (metrics.arr != null && metrics.arr > 0) metricEntries.push({ key: 'arr', short: 'ARR', full: 'ARR', value: formatCurrency(metrics.arr) });
    if (metrics.mrr != null && metrics.mrr > 0) metricEntries.push({ key: 'mrr', short: 'MRR', full: 'MRR', value: formatCurrency(metrics.mrr) });
    if (metrics.grossMargin != null) metricEntries.push({ key: 'gm', short: 'GM', full: t('portfolio.grossMargin'), value: `${metrics.grossMargin}%` });
    if (metrics.burnRate != null && metrics.burnRate > 0) metricEntries.push({ key: 'burn', short: 'Burn', full: t('portfolio.burnRate'), value: `${formatCurrency(metrics.burnRate)}/mo` });
    if (metrics.churnRate != null) metricEntries.push({ key: 'churn', short: 'Churn', full: t('portfolio.churnRate'), value: `${metrics.churnRate}%` });
    if (metrics.arpu != null && metrics.arpu > 0) metricEntries.push({ key: 'arpu', short: 'ARPU', full: 'ARPU', value: formatCurrency(metrics.arpu) });
    if (metrics.ltv != null && metrics.ltv > 0) metricEntries.push({ key: 'ltv', short: 'LTV', full: 'LTV', value: formatCurrency(metrics.ltv) });
    if (metrics.cac != null && metrics.cac > 0) metricEntries.push({ key: 'cac', short: 'CAC', full: 'CAC', value: formatCurrency(metrics.cac) });
  }
  const visibleMetrics = metricEntries.slice(0, VISIBLE_METRICS);
  const hiddenMetricsCount = metricEntries.length - visibleMetrics.length;
  const metricsTitle = metricEntries.map((entry) => `${entry.full}: ${entry.value}`).join('\n');

  const isProgramParticipant = startup.status === 'portfolio' && (startup as any).portfolioType === 'program';
  const investmentAmount = startup.status === 'portfolio' && !isProgramParticipant
    ? Number((startup as any).investmentAmount) || 0
    : 0;
  const financialsTone: FinancialsTone = isProgramParticipant
    ? 'program'
    : investmentAmount > 0
      ? 'investment'
      : 'neutral';
  const financialsLabel = isProgramParticipant
    ? t('startups.portfolio.programParticipant')
    : investmentAmount > 0
      ? t('startups.investment.fundInvestment')
      : t('startups.card.lastValuation');
  const financialsValue = isProgramParticipant
    ? ''
    : investmentAmount > 0
      ? `$${investmentAmount.toLocaleString(numberLocale(language))} ${(startup as any).valuationType === 'post-money' ? 'Post' : 'Pre'}`
      : valuationDisplay || DASH;

  const fundingRequest = (startup.brief.itpvFundingRequest ?? startup.brief.fundingRequest) || 0;
  const fundingLabel = fundingRequest > 0
    ? (fundingRequest >= 1000000
      ? `${(fundingRequest / 1000000).toFixed(1)}M`
      : `${(fundingRequest / 1000).toFixed(0)}k`)
    : DASH;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onArchive?.(startup);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onRestore?.(startup);
  };

  const handlePermanentDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onPermanentDelete?.(startup);
  };

  const handleReassign = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onReassignManager?.(startup);
  };

  const handleCreateCabinet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onCreateCabinet?.(startup);
  };

  const scoreElement = analysisDisplay.isPending ? (
    <ScoreStatus $tone="pending">{t('startups.card.analysisPending')}</ScoreStatus>
  ) : analysisDisplay.isFailed ? (
    <ScoreStatus $tone="failed">{t('common.error')}</ScoreStatus>
  ) : analysisDisplay.isBlocked ? (
    <ScoreStatus $tone="failed" title={analysisDisplay.blockReason || undefined}>{t('startups.card.blocked', 'Spam / Blocked')}</ScoreStatus>
  ) : analysisDisplay.hasScore ? (
    <Score $score={analysisDisplay.score!}>
      {analysisDisplay.score}
    </Score>
  ) : analysisDisplay.isScoreMissing ? (
    <ScoreStatus $tone="empty">{t('startups.card.noScore', 'No score')}</ScoreStatus>
  ) : (
    <ScoreStatus $tone="empty">{DASH}</ScoreStatus>
  );

  const hasMenuActions = startup.isArchived
    ? Boolean(onRestore || onPermanentDelete)
    : Boolean(onReassignManager || onCreateCabinet || onArchive);

  return (
    <CardContainer onClick={() => onClick(startup.id)}>
      {hasMenuActions && (
      <div ref={menuRef}>
        <ActionsButton className="actions-btn" $active={isMenuOpen} onClick={handleMenuClick}>
          <MoreHorizontal size={16} />
        </ActionsButton>
        <DropdownMenu $isOpen={isMenuOpen}>
          {onReassignManager && !startup.isArchived && (
            <DropdownItem onClick={handleReassign}>
              <UserCog />
              {t('startups.assign.change')}
            </DropdownItem>
          )}
          {onCreateCabinet && !startup.isArchived && (
            <DropdownItem onClick={handleCreateCabinet}>
              <KeyRound />
              {t('cabinet.createButton', 'Create Cabinet')}
            </DropdownItem>
          )}
          {startup.isArchived ? (
            <>
              {onRestore && (
                <DropdownItem onClick={handleRestore}>
                  <RotateCcw />
                  {t('startups.archive.restoreButton')}
                </DropdownItem>
              )}
              {onPermanentDelete && (
                <DropdownItem onClick={handlePermanentDelete} $danger>
                  <Trash2 />
                  {t('startups.archive.permanentDeleteButton')}
                </DropdownItem>
              )}
            </>
          ) : (
            onArchive && (
              <DropdownItem onClick={handleArchive}>
                <Archive />
                {t('startups.archive.rejectAction')}
              </DropdownItem>
            )
          )}
        </DropdownMenu>
      </div>
      )}

      <CardHeader>
        <StartupLogo
          variant="md"
          src={logoSrc}
          startupId={startup.id}
          name={startup.brief?.companyName || ''}
        />
        <CardInfo>
          <StartupName>
            <span>{startup.brief.companyName}</span>
            {isFreshlyCreated(startup.createdAt) && <NewBadge>{t('startups.card.new')}</NewBadge>}
            {unreadCount > 0 && (
              <UnreadCommentsPill
                title={t('startups.card.unreadComments', {
                  count: unreadCount,
                  defaultValue: `${unreadCount} new comment${unreadCount === 1 ? '' : 's'} from founder`,
                })}
              >
                <MessageSquare />
                {unreadCount}
              </UnreadCommentsPill>
            )}
            {documentsReadyCount > 0 && (
              <DocumentsReadyPill
                title={t('startups.card.documentsReady', {
                  count: documentsReadyCount,
                  defaultValue: `${documentsReadyCount} document package ready for review`,
                })}
              >
                <FileCheck2 />
                {documentsReadyCount}
              </DocumentsReadyPill>
            )}
          </StartupName>
          <StartupIndustry title={startup.brief.industry}>
            {startup.brief.industry || DASH}
          </StartupIndustry>
        </CardInfo>
      </CardHeader>

      <CountryRow>
        {startup.brief.country ? (
          <>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{getCountryFlag(startup.brief.country)}</span>
            {formatCountryName(startup.brief.country)}
          </>
        ) : (
          <EmptySlotHint>{DASH}</EmptySlotHint>
        )}
      </CountryRow>

      <CardBadgeRow>
        <CardBadge variant={getStatusVariant(startup.status)} title={stageLabel}>
          {stageLabel}
        </CardBadge>
        {startup.brief.businessModel && (
          <CardBadge variant="neutral" title={startup.brief.businessModel}>
            {startup.brief.businessModel}
          </CardBadge>
        )}
      </CardBadgeRow>

      <FinancialsBox $tone={financialsTone}>
        <FinancialsHead title={financialsValue ? `${financialsLabel}: ${financialsValue}` : financialsLabel}>
          <FinancialsLabel $tone={financialsTone}>
            {isProgramParticipant && <Handshake />}
            {financialsLabel}
          </FinancialsLabel>
          {financialsValue && (
            <FinancialsValue $tone={financialsTone}>{financialsValue}</FinancialsValue>
          )}
        </FinancialsHead>
        <MetricsLine title={metricsTitle || undefined}>
          {visibleMetrics.length > 0 ? (
            <>
              <MetricsList>
                {visibleMetrics.map((entry, index) => (
                  <span key={entry.key}>
                    {index > 0 ? ' · ' : ''}
                    {entry.short} <b>{entry.value}</b>
                  </span>
                ))}
              </MetricsList>
              {hiddenMetricsCount > 0 && <MetricsMore>+{hiddenMetricsCount}</MetricsMore>}
            </>
          ) : (
            <EmptySlotHint>{DASH}</EmptySlotHint>
          )}
        </MetricsLine>
      </FinancialsBox>

      <ChipArea $rows={STATUS_CHIP_ROWS}>
        {packedStatusChips.visible.map((chip) => {
          const Icon = chip.icon;
          return (
            <StatusChip
              key={chip.key}
              $tone={chip.tone}
              $capped={packedStatusChips.hidden.length > 0}
              title={chip.title || chip.label}
            >
              {Icon && <Icon />}
              {chip.label}
            </StatusChip>
          );
        })}
        {packedStatusChips.hidden.length > 0 && (
          <MoreChip $tone="neutral" title={hiddenChipsTitle}>
            +{packedStatusChips.hidden.length}
          </MoreChip>
        )}
        {statusChips.length === 0 && <EmptySlotHint>{DASH}</EmptySlotHint>}
      </ChipArea>

      <ChipArea $rows={DD_CHIP_ROWS} $last>
        {ddTracks.map(({ key, label, icon: Icon, track }) => (
          <DDChip
            key={key}
            $tone={ddTone(track)}
            title={track?.conclusion || track?.reviewerName || t('startups.dd.notStarted', 'Not started')}
          >
            <Icon />
            {label}
            {typeof track?.score === 'number' ? ` ${track.score}` : ''}
          </DDChip>
        ))}
      </ChipArea>

      <CardMeta>
        <MetaGroup>
          <MetaItem title={t('startups.card.openRound')}>
            <DollarSign />
            {fundingLabel}
          </MetaItem>
          <MetaItem>
            <Calendar />
            {formatDayMonth(new Date(startup.createdAt), language)}
          </MetaItem>
        </MetaGroup>
        {scoreElement}
      </CardMeta>

      <ManagerRow>
        {startup.assignedManager ? (
          <>
            <ManagerAvatar>
              {startup.assignedManager.avatar ? (
                <CrmImage src={startup.assignedManager.avatar} alt={startup.assignedManager.name} />
              ) : (
                <User />
              )}
            </ManagerAvatar>
            <ManagerName title={startup.assignedManager.name}>{startup.assignedManager.name}</ManagerName>
          </>
        ) : (
          <>
            <ManagerAvatar $empty>
              <User />
            </ManagerAvatar>
            <ManagerName $empty>{t('startups.card.noManager', 'Менеджер не назначен')}</ManagerName>
          </>
        )}
      </ManagerRow>
    </CardContainer>
  );
};
