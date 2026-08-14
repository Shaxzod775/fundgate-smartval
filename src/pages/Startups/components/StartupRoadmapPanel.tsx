import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  FileCheck2,
  Save,
} from 'lucide-react';
import { startupsApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { BOARD_COLUMN_LABEL_KEYS, columnForStartup, normalizeBoardColumns, stagesForColumn } from '../boardColumns';
import type {
  DocumentRequest,
  Startup,
  StartupBoardColumn,
  StartupRoadmap,
  StartupRoadmapDecision,
  StartupRoadmapStep,
  StartupRoadmapStepId,
  StartupRoadmapStepStatus,
  StartupStatus,
} from '../../../types';

const ROADMAP_STEP_IDS: StartupRoadmapStepId[] = [
  'incoming',
  'pitch',
  'kyc',
  'data_room',
  'screening',
  'ic_prep',
  'investment_committee',
  'closing',
  'portfolio',
];

const GROUPS: Array<{
  title: string;
  subtitle: string;
  column: StartupStatus;
  steps: StartupRoadmapStepId[];
  focus: string;
}> = [
  {
    title: 'Новые заявки',
    subtitle: 'Канал входа, pitch deck и первичная оценка',
    column: 'new',
    steps: ['incoming'],
    focus: 'Понять, стоит ли брать стартап в проверку: рынок, продукт, команда и первичные материалы.',
  },
  {
    title: 'На проверке',
    subtitle: 'KYC, Data Room и короткая справка для решения',
    column: 'in_review',
    steps: ['kyc', 'data_room', 'screening'],
    focus: 'Закрыть базовую проверку, собрать Data Room и подготовить вывод: переводить в пайплайн или отклонять.',
  },
  {
    title: 'Пайплайн',
    subtitle: 'Инвестмемо, подготовка к ИК, комитет и closing',
    column: 'pipeline',
    steps: ['ic_prep', 'investment_committee', 'closing'],
    focus: 'Довести сделку до решения: инвестмемо, ИК, финальные условия и legal closing.',
  },
  {
    title: 'Портфель',
    subtitle: 'Сделка завершена, компания в портфеле фонда',
    column: 'portfolio',
    steps: ['portfolio'],
    focus: 'Зафиксировать статус портфельной компании, сумму инвестиций и дальнейший режим сопровождения.',
  },
];

type StageGroup = (typeof GROUPS)[number];

const ARCHIVE_GROUP: StageGroup = {
  title: 'Архив',
  subtitle: 'Проект отклонён или снят с активного рассмотрения',
  column: 'rejected',
  steps: ['incoming'],
  focus: 'Сохранить причину отказа и контекст, чтобы команда могла вернуться к истории решения позже.',
};

const STEP_META: Record<StartupRoadmapStepId, { label: string; hint: string }> = {
  incoming: {
    label: 'Входящий канал',
    hint: 'Источник проекта: сайт, акселератор, мероприятие, встреча или поручение руководства.',
  },
  pitch: {
    label: 'Pitch',
    hint: 'Получить питч-дек и провести первичную оценку продукта, рынка и команды.',
  },
  kyc: {
    label: 'KYC',
    hint: 'Собрать базовую форму и контактные данные для проверки.',
  },
  data_room: {
    label: 'Data Room',
    hint: 'Запросить и проверить презентацию, финансы, legal, команду, продукт и бренд-материалы.',
  },
  screening: {
    label: 'Внутренний скрининг',
    hint: 'Подготовить краткую справку по продукту, рынку, traction и условиям сделки.',
  },
  ic_prep: {
    label: 'Подготовка к ИК',
    hint: 'Собрать инвестмемо, презентацию для защиты и структурированный Data Room.',
  },
  investment_committee: {
    label: 'Инвесткомитет',
    hint: 'Назначить заседание, провести защиту и зафиксировать решение.',
  },
  closing: {
    label: 'Closing / Legal',
    hint: 'Согласовать финальные условия, подписать документы и подготовить перевод средств.',
  },
  portfolio: {
    label: 'Портфель',
    hint: 'Стартап принят в портфель как инвестиция или программный участник.',
  },
};

const STATUS_LABELS: Record<StartupRoadmapStepStatus, string> = {
  todo: 'План',
  in_progress: 'В работе',
  done: 'Готово',
  blocked: 'Блокер',
};

const DECISION_LABELS: Record<StartupRoadmapDecision, string> = {
  pending: 'Ожидает',
  approved: 'Одобрено',
  rejected: 'Отказ',
  rework: 'Доработка',
};

const DECISION_OPTIONS: StartupRoadmapDecision[] = ['pending', 'approved', 'rejected', 'rework'];

type TranslateFn = (key: string, options?: Record<string, unknown>) => unknown;

const translateText = (
  t: TranslateFn | undefined,
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) => {
  if (!t) return fallback;
  const value = t(key, { defaultValue: fallback, ...(options || {}) });
  return typeof value === 'string' ? value : fallback;
};

const groupTitle = (group: StageGroup, t?: TranslateFn) => (
  group.column === 'rejected'
    ? translateText(t, 'startups.roadmap.groups.rejected.title', group.title)
    : translateText(t, `startups.status.${group.column}`, group.title)
);

const groupSubtitle = (group: StageGroup, t?: TranslateFn) => (
  translateText(t, `startups.roadmap.groups.${group.column}.subtitle`, group.subtitle)
);

const groupFocus = (group: StageGroup, t?: TranslateFn) => (
  translateText(t, `startups.roadmap.groups.${group.column}.focus`, group.focus)
);

const stepLabel = (id: string, fallback: string, t?: TranslateFn) => (
  translateText(t, `startups.boardStages.${id}.label`, fallback)
);

const stepHint = (id: string, fallback: string, t?: TranslateFn) => (
  translateText(t, `startups.boardStages.${id}.description`, fallback)
);

const statusLabel = (status: StartupRoadmapStepStatus, t?: TranslateFn) => (
  translateText(t, `startups.roadmap.status.${status}`, STATUS_LABELS[status])
);

const decisionLabel = (decision: StartupRoadmapDecision, t?: TranslateFn) => (
  translateText(t, `startups.roadmap.decision.${decision}`, DECISION_LABELS[decision])
);

const columnDisplayLabel = (column: StartupBoardColumn, t?: TranslateFn) => {
  const key = BOARD_COLUMN_LABEL_KEYS[column.id] || (column.systemStatus ? `startups.status.${column.systemStatus}` : '');
  return key ? translateText(t, key, column.label) : column.label;
};

const STATUS_TONE: Record<StartupRoadmapStepStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  todo: 'neutral',
  in_progress: 'warning',
  done: 'success',
  blocked: 'danger',
};

const DOCUMENT_GROUPS: Record<'data_room' | 'investment_committee' | 'closing', string[]> = {
  data_room: ['basic', 'due_diligence', 'fundgate_full'],
  investment_committee: ['investment_memo', 'investment_committee'],
  closing: ['closing'],
};

export interface RoadmapCardChip {
  label: string;
  tone: 'neutral' | 'warning' | 'success' | 'danger' | 'info';
}

const Panel = styled.section`
  margin-bottom: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: visible;
`;

const StageHeader = styled.div`
  padding: 16px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StageEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.7px;
  text-transform: uppercase;
`;

const StageTitle = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 18px;
  font-weight: 700;
`;

const StageSubtitle = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
  line-height: 1.45;
`;

const StageFocus = styled.div`
  margin-top: 11px;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.55;
`;

const StageStats = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    justify-content: flex-start;
  }
`;

const StatPill = styled.div<{ $tone?: 'neutral' | 'warning' | 'success' | 'danger' | 'info' }>`
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ $tone }) => {
    if ($tone === 'success') return 'rgba(16,185,129,0.12)';
    if ($tone === 'warning') return 'rgba(245,158,11,0.12)';
    if ($tone === 'danger') return 'rgba(239,68,68,0.12)';
    if ($tone === 'info') return 'rgba(56,189,248,0.10)';
    return 'rgba(255,255,255,0.05)';
  }};
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'success') return 'rgba(16,185,129,0.26)';
    if ($tone === 'warning') return 'rgba(245,158,11,0.26)';
    if ($tone === 'danger') return 'rgba(239,68,68,0.26)';
    if ($tone === 'info') return 'rgba(56,189,248,0.22)';
    return 'rgba(255,255,255,0.08)';
  }};
`;

const Body = styled.div`
  padding: 12px 14px 14px;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StepRow = styled.div<{ $active?: boolean }>`
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.08)')};
  background: ${({ $active }) => ($active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.025)')};

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;

const StepTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const StatusIcon = styled.span<{ $status: StartupRoadmapStepStatus }>`
  display: inline-flex;
  color: ${({ $status }) => {
    if ($status === 'done') return '#10b981';
    if ($status === 'in_progress') return '#f59e0b';
    if ($status === 'blocked') return '#ef4444';
    return 'rgba(255,255,255,0.35)';
  }};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const StepLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const StepHint = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  line-height: 1.4;
`;

const StatusControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;

  @media (max-width: 780px) {
    justify-content: flex-start;
  }
`;

const StatusButton = styled.button<{ $active: boolean; $tone: 'neutral' | 'warning' | 'success' | 'danger' }>`
  border: 1px solid ${({ $active, $tone }) => {
    if (!$active) return 'rgba(255,255,255,0.1)';
    if ($tone === 'success') return 'rgba(16, 185, 129, 0.55)';
    if ($tone === 'warning') return 'rgba(245, 158, 11, 0.55)';
    if ($tone === 'danger') return 'rgba(239, 68, 68, 0.55)';
    return 'rgba(148, 163, 184, 0.38)';
  }};
  background: ${({ $active, $tone }) => {
    if (!$active) return 'rgba(255,255,255,0.035)';
    if ($tone === 'success') return 'rgba(16, 185, 129, 0.12)';
    if ($tone === 'warning') return 'rgba(245, 158, 11, 0.12)';
    if ($tone === 'danger') return 'rgba(239, 68, 68, 0.12)';
    return 'rgba(148, 163, 184, 0.12)';
  }};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
`;

const DecisionDropdownRoot = styled.div<{ $open: boolean }>`
  position: relative;
  z-index: ${({ $open }) => ($open ? 30 : 1)};
  min-width: 128px;
`;

const DecisionDropdownButton = styled.button<{ $open: boolean }>`
  width: 100%;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.accent.primary : theme.colors.border.input)};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $open }) => ($open ? theme.colors.bg.inputFocus : theme.colors.bg.input)};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 6px 10px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.focus : 'none')};
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: transform 0.16s ease;
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const DecisionDropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 168px;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const DecisionDropdownOption = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $active }) => ($active ? 'rgba(16, 185, 129, 0.12)' : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
  padding: 7px 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  svg,
  span:first-child {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ theme, $active }) => ($active ? 'rgba(16, 185, 129, 0.16)' : theme.colors.bg.tertiary)};
  }
`;

const StepActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 780px) {
    justify-content: flex-start;
  }
`;

const DocChip = styled.div<{ $tone: 'neutral' | 'warning' | 'success' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $tone }) => ($tone === 'success' ? '#10b981' : $tone === 'warning' ? '#f59e0b' : 'rgba(255,255,255,0.58)')};
  background: ${({ $tone }) => ($tone === 'success' ? 'rgba(16,185,129,0.1)' : $tone === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)')};
  border: 1px solid ${({ $tone }) => ($tone === 'success' ? 'rgba(16,185,129,0.24)' : $tone === 'warning' ? 'rgba(245,158,11,0.24)' : 'rgba(255,255,255,0.08)')};

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const Footer = styled.div`
  padding: 13px 14px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const SaveStatus = styled.div<{ $error?: boolean }>`
  color: ${({ $error, theme }) => ($error ? theme.colors.status.danger : theme.colors.text.tertiary)};
  font-size: 12px;
`;

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const statusIconFor = (status: StartupRoadmapStepStatus) => {
  if (status === 'done') return <CheckCircle2 />;
  if (status === 'in_progress') return <Clock3 />;
  if (status === 'blocked') return <AlertTriangle />;
  return <Circle />;
};

const validStatus = (value: unknown): value is StartupRoadmapStepStatus => (
  value === 'todo' || value === 'in_progress' || value === 'done' || value === 'blocked'
);

const validDecision = (value: unknown): value is StartupRoadmapDecision => (
  value === 'pending' || value === 'approved' || value === 'rejected' || value === 'rework'
);

const doneStepsForStatus = (status: StartupStatus): StartupRoadmapStepId[] => {
  if (status === 'portfolio') return ROADMAP_STEP_IDS;
  if (status === 'pipeline') return ['incoming', 'pitch', 'kyc', 'data_room', 'screening'];
  if (status === 'in_review') return ['incoming', 'pitch'];
  if (status === 'rejected') return ['incoming'];
  return ['incoming'];
};

const progressStepsForStatus = (status: StartupStatus): StartupRoadmapStepId[] => {
  if (status === 'pipeline') return ['ic_prep'];
  if (status === 'in_review') return ['kyc', 'data_room'];
  if (status === 'new') return ['pitch'];
  return [];
};

const createDefaultRoadmap = (status: StartupStatus): StartupRoadmap => {
  const done = new Set(doneStepsForStatus(status));
  const inProgress = new Set(progressStepsForStatus(status));
  const steps = ROADMAP_STEP_IDS.reduce<StartupRoadmap['steps']>((acc, id) => {
    acc[id] = {
      id,
      status: done.has(id) ? 'done' : inProgress.has(id) ? 'in_progress' : 'todo',
      ...(id === 'investment_committee' ? { decision: 'pending' as StartupRoadmapDecision } : {}),
    };
    return acc;
  }, {});

  return { steps };
};

export const buildStartupRoadmap = (startup: Startup): StartupRoadmap => {
  const defaults = createDefaultRoadmap(startup.status);
  const existing = startup.roadmap?.steps || {};
  const steps = ROADMAP_STEP_IDS.reduce<StartupRoadmap['steps']>((acc, id) => {
    const current = existing[id];
    const fallback = defaults.steps[id]!;
    acc[id] = {
      ...fallback,
      ...(current || {}),
      id,
      status: validStatus(current?.status) ? current.status : fallback.status,
      ...(id === 'investment_committee'
        ? { decision: validDecision(current?.decision) ? current?.decision : current?.decision ? 'pending' : fallback.decision }
        : {}),
    };
    return acc;
  }, {});

  for (const [id, current] of Object.entries(existing)) {
    if (!current || ROADMAP_STEP_IDS.includes(id as StartupRoadmapStepId)) continue;
    steps[id] = {
      ...current,
      id,
      status: validStatus(current.status) ? current.status : 'todo',
    };
  }

  return {
    steps,
    updatedAt: startup.roadmap?.updatedAt,
  };
};

const documentProgressFor = (
  requests: DocumentRequest[] | undefined,
  group: keyof typeof DOCUMENT_GROUPS,
): { done: number; total: number } => {
  const templateIds = new Set(DOCUMENT_GROUPS[group]);
  const matched = (requests || []).filter((request) => templateIds.has(request.templateId));
  const items = matched.flatMap((request) => request.items || []);
  const tracked = items.filter((item) => item.required || item.status !== 'waived');
  const total = tracked.length;
  const done = tracked.filter((item) => (
    item.status === 'uploaded' ||
    item.status === 'approved' ||
    item.status === 'waived'
  )).length;

  return { done, total };
};

const documentChipForStep = (startup: Startup, stepId: string, t?: TranslateFn): RoadmapCardChip | null => {
  if (stepId !== 'data_room' && stepId !== 'investment_committee' && stepId !== 'closing') return null;
  const progress = documentProgressFor(startup.documentRequests, stepId);
  if (progress.total === 0) return null;
  const label = stepId === 'data_room'
    ? translateText(t, 'startups.roadmap.documentChips.dataRoom', 'Data Room {{done}}/{{total}}', progress)
    : stepId === 'investment_committee'
      ? translateText(t, 'startups.roadmap.documentChips.investmentCommittee', 'ИК docs {{done}}/{{total}}', progress)
      : translateText(t, 'startups.roadmap.documentChips.closing', 'Closing {{done}}/{{total}}', progress);

  return {
    label,
    tone: progress.done >= progress.total ? 'success' : progress.done > 0 ? 'warning' : 'neutral',
  };
};

export const getRoadmapCardChips = (startup: Startup, t?: TranslateFn): RoadmapCardChip[] => {
  const roadmap = buildStartupRoadmap(startup);
  const chips: RoadmapCardChip[] = [];
  const blocked = ROADMAP_STEP_IDS.find((id) => roadmap.steps[id]?.status === 'blocked');
  if (blocked) {
    chips.push({
      label: translateText(t, 'startups.roadmap.chips.blockedStep', '{{step}} blocked', {
        step: stepLabel(blocked, STEP_META[blocked].label, t),
      }),
      tone: 'danger',
    });
  }

  const dataRoom = documentChipForStep(startup, 'data_room', t);
  if (dataRoom) chips.push(dataRoom);

  const icStep = roadmap.steps.investment_committee;
  if (startup.status === 'pipeline' || icStep?.status === 'in_progress' || icStep?.status === 'blocked') {
    const decision = icStep?.decision && icStep.decision !== 'pending'
      ? decisionLabel(icStep.decision, t)
      : statusLabel(icStep?.status || 'todo', t);
    chips.push({
      label: translateText(t, 'startups.roadmap.chips.ic', 'ИК {{decision}}', { decision }),
      tone: icStep?.status === 'blocked' ? 'danger' : icStep?.status === 'done' ? 'success' : 'info',
    });
  }

  const closing = roadmap.steps.closing;
  if (closing?.status === 'blocked' || closing?.status === 'in_progress') {
    chips.push({
      label: closing.status === 'blocked'
        ? translateText(t, 'startups.roadmap.chips.closingBlocked', 'Closing blocked')
        : translateText(t, 'startups.roadmap.chips.closingInProgress', 'Closing in progress'),
      tone: closing.status === 'blocked' ? 'danger' : 'warning',
    });
  }

  return chips.slice(0, 3);
};

const activeGroupForStatus = (status: StartupStatus): StageGroup => (
  GROUPS.find((group) => group.column === status) || ARCHIVE_GROUP
);

export interface ActiveStageView {
  title: string;
  subtitle: string;
  focus: string;
  column: StartupStatus;
  stages: Array<{ id: string; label: string; hint: string }>;
}

const legacyStageViewForStatus = (status: StartupStatus, t?: TranslateFn): ActiveStageView => {
  const group = activeGroupForStatus(status);
  return {
    title: groupTitle(group, t),
    subtitle: groupSubtitle(group, t),
    focus: groupFocus(group, t),
    column: group.column,
    stages: group.steps.map((id) => ({
      id,
      label: stepLabel(id, STEP_META[id].label, t),
      hint: stepHint(id, STEP_META[id].hint, t),
    })),
  };
};

export const resolveActiveStageView = (
  startup: Startup,
  boardColumns: StartupBoardColumn[],
  t?: TranslateFn,
): ActiveStageView => {
  if (startup.status === 'rejected' || startup.isArchived) {
    return legacyStageViewForStatus('rejected', t);
  }
  const column = columnForStartup(startup, boardColumns);
  if (!column || column.stages === undefined) {
    return legacyStageViewForStatus(startup.status, t);
  }
  const legacy = legacyStageViewForStatus(column.lifecycleStatus, t);
  const stages = stagesForColumn(column);
  return {
    title: columnDisplayLabel(column, t),
    subtitle: legacy.subtitle,
    focus: legacy.focus,
    column: column.lifecycleStatus,
    stages: stages.map((stage) => ({
      id: stage.id,
      label: stepLabel(stage.presetId || stage.id, stage.label, t),
      hint: stage.description
        ? stepHint(stage.presetId || stage.id, stage.description, t)
        : (stage.id in STEP_META ? stepHint(stage.id, STEP_META[stage.id as StartupRoadmapStepId].hint, t) : ''),
    })),
  };
};

export const unfinishedStageCountFor = (
  startup: Startup,
  boardColumns: StartupBoardColumn[],
): { unfinished: number; total: number; pending: Array<{ id: string; label: string }> } => {
  const view = resolveActiveStageView(startup, boardColumns);
  const roadmap = buildStartupRoadmap(startup);
  const pending = view.stages
    .filter(({ id }) => (roadmap.steps[id]?.status || 'todo') !== 'done')
    .map(({ id, label }) => ({ id, label }));
  return { unfinished: pending.length, total: view.stages.length, pending };
};

const stageProgressFor = (
  roadmap: StartupRoadmap,
  stageIds: string[],
): { done: number; total: number; nextStepId: string } => {
  const done = stageIds.filter((id) => roadmap.steps[id]?.status === 'done').length;
  const nextStepId = stageIds.find((id) => roadmap.steps[id]?.status !== 'done') || stageIds[stageIds.length - 1];
  return { done, total: stageIds.length, nextStepId };
};

const toneForProgress = (done: number, total: number): RoadmapCardChip['tone'] => {
  if (done >= total) return 'success';
  if (done > 0) return 'warning';
  return 'neutral';
};

const cleanRoadmapForSave = (roadmap: StartupRoadmap): StartupRoadmap => {
  const ids = [
    ...ROADMAP_STEP_IDS,
    ...Object.keys(roadmap.steps).filter((id) => !ROADMAP_STEP_IDS.includes(id as StartupRoadmapStepId)),
  ];
  const steps = ids.reduce<StartupRoadmap['steps']>((acc, id) => {
    const step = roadmap.steps[id];
    if (!step) return acc;
    const cleanStep: StartupRoadmapStep = {
      id,
      status: validStatus(step.status) ? step.status : 'todo',
    };
    if (step.owner?.trim()) cleanStep.owner = step.owner.trim();
    if (step.dueDate?.trim()) cleanStep.dueDate = step.dueDate.trim();
    if (step.note?.trim()) cleanStep.note = step.note.trim();
    if (step.completedAt) cleanStep.completedAt = step.completedAt;
    if (id === 'investment_committee' && validDecision(step.decision)) cleanStep.decision = step.decision;
    if (step.updatedAt) cleanStep.updatedAt = step.updatedAt;
    acc[id] = cleanStep;
    return acc;
  }, {});

  return {
    steps,
    updatedAt: new Date().toISOString(),
  };
};

interface DecisionDropdownProps {
  value?: StartupRoadmapDecision;
  onChange: (decision: StartupRoadmapDecision) => void;
}

const DecisionDropdown = ({ value, onChange }: DecisionDropdownProps) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const currentValue = validDecision(value) ? value : 'pending';

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <DecisionDropdownRoot ref={rootRef} $open={isOpen}>
      <DecisionDropdownButton
        type="button"
        $open={isOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{decisionLabel(currentValue, t)}</span>
        <ChevronDown />
      </DecisionDropdownButton>
      {isOpen && (
        <DecisionDropdownMenu role="listbox">
          {DECISION_OPTIONS.map((decision) => {
            const isActive = decision === currentValue;
            return (
              <DecisionDropdownOption
                key={decision}
                type="button"
                role="option"
                aria-selected={isActive}
                $active={isActive}
                onClick={() => {
                  onChange(decision);
                  setIsOpen(false);
                }}
              >
                {isActive ? <Check /> : <span aria-hidden="true" />}
                {decisionLabel(decision, t)}
              </DecisionDropdownOption>
            );
          })}
        </DecisionDropdownMenu>
      )}
    </DecisionDropdownRoot>
  );
};

interface StartupRoadmapPanelProps {
  startup: Startup;
  onStartupUpdate?: (startup: Startup) => void;
  canModify?: boolean;
}

export const StartupRoadmapPanel = ({ startup, onStartupUpdate, canModify = true }: StartupRoadmapPanelProps) => {
  const { t } = useTranslation();
  const { organization } = useAuth();
  const [draft, setDraft] = useState<StartupRoadmap>(() => buildStartupRoadmap(startup));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(buildStartupRoadmap(startup));
    setIsDirty(false);
    setError('');
  }, [startup.id, startup.roadmap]);

  const boardColumns = useMemo(
    () => normalizeBoardColumns(organization?.startupBoardSettings),
    [organization?.startupBoardSettings]
  );
  const activeView = useMemo(
    () => resolveActiveStageView(startup, boardColumns, t),
    [startup, boardColumns, t]
  );
  const stageIds = useMemo(() => activeView.stages.map((stage) => stage.id), [activeView]);
  const stageProgress = useMemo(() => stageProgressFor(draft, stageIds), [draft, stageIds]);
  const stageDocChips = useMemo(() => (
    stageIds
      .map((stepId) => documentChipForStep(startup, stepId, t))
      .filter((chip): chip is RoadmapCardChip => Boolean(chip))
  ), [stageIds, startup, t]);
  const icStep = draft.steps.investment_committee;
  const icDecisionLabel = stageIds.includes('investment_committee') && icStep?.decision
    ? decisionLabel(icStep.decision, t)
    : '';

  const updateStep = (id: string, patch: Partial<StartupRoadmapStep>) => {
    setDraft((current) => {
      const previous = current.steps[id] || { id, status: 'todo' as StartupRoadmapStepStatus };
      const nextStatus = patch.status || previous.status;
      const nextStep: StartupRoadmapStep = {
        ...previous,
        ...patch,
        id,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      if (patch.status === 'done' && !previous.completedAt) {
        nextStep.completedAt = new Date().toISOString();
      }
      if (patch.status && patch.status !== 'done') {
        delete nextStep.completedAt;
      }
      return {
        ...current,
        steps: {
          ...current.steps,
          [id]: nextStep,
        },
      };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setError('');
    const roadmap = cleanRoadmapForSave(draft);

    try {
      const response = await startupsApi.update(startup.id, { roadmap } as any);
      if (!response.success) {
        throw new Error(response.error || t('startups.roadmap.saveError'));
      }
      setDraft(roadmap);
      setIsDirty(false);
      onStartupUpdate?.({ ...startup, roadmap, updatedAt: new Date() });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startups.roadmap.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel>
      <StageHeader>
        <div>
          <StageEyebrow>{t('startups.roadmap.currentStage')}</StageEyebrow>
          <StageTitle>{activeView.title}</StageTitle>
          <StageSubtitle>{activeView.subtitle}</StageSubtitle>
          <StageFocus>{activeView.focus}</StageFocus>
        </div>
        <StageStats>
          <StatPill $tone={toneForProgress(stageProgress.done, stageProgress.total)}>
            {t('startups.roadmap.progressDone', { done: stageProgress.done, total: stageProgress.total })}
          </StatPill>
          {stageDocChips.map((chip) => (
            <StatPill key={chip.label} $tone={chip.tone}>
              {chip.label}
            </StatPill>
          ))}
          {icDecisionLabel && (
            <StatPill $tone={icStep?.decision === 'approved' ? 'success' : icStep?.decision === 'rejected' ? 'danger' : 'info'}>
              {t('startups.roadmap.icDecision', { decision: icDecisionLabel })}
            </StatPill>
          )}
        </StageStats>
      </StageHeader>

      <Body>
        <Steps>
          {activeView.stages.map(({ id: stepId, label, hint }) => {
            const step = draft.steps[stepId] || { id: stepId, status: 'todo' as StartupRoadmapStepStatus };
            const docChip = documentChipForStep(startup, stepId, t);
            return (
              <StepRow key={stepId} $active={stepId === stageProgress.nextStepId && step.status !== 'done'}>
                <div>
                  <StepTitle>
                    <StatusIcon $status={step.status}>
                      {statusIconFor(step.status)}
                    </StatusIcon>
                    <StepLabel>{label}</StepLabel>
                  </StepTitle>
                  {hint && <StepHint>{hint}</StepHint>}
                  {docChip && (
                    <DocChip $tone={docChip.tone === 'success' ? 'success' : docChip.tone === 'warning' ? 'warning' : 'neutral'}>
                      <FileCheck2 />
                      {docChip.label}
                    </DocChip>
                  )}
                </div>

                <StepActions>
                  {canModify ? (
                    <>
                      {stepId === 'investment_committee' && (
                        <DecisionDropdown
                          value={step.decision || 'pending'}
                          onChange={(decision) => updateStep(stepId, {
                            decision,
                          })}
                        />
                      )}
                      <StatusControls>
                        {(['todo', 'in_progress', 'done', 'blocked'] as StartupRoadmapStepStatus[]).map((status) => (
                          <StatusButton
                            key={status}
                            type="button"
                            $active={step.status === status}
                            $tone={STATUS_TONE[status]}
                            onClick={() => updateStep(stepId, { status })}
                          >
                            {statusLabel(status, t)}
                          </StatusButton>
                        ))}
                      </StatusControls>
                    </>
                  ) : (
                    <StatusControls>
                      <StatusButton
                        type="button"
                        $active
                        $tone={STATUS_TONE[step.status]}
                        disabled
                        style={{ cursor: 'default' }}
                      >
                        {statusLabel(step.status, t)}
                      </StatusButton>
                    </StatusControls>
                  )}
                </StepActions>
              </StepRow>
            );
          })}
        </Steps>
      </Body>

      {canModify && (
        <Footer>
          <SaveStatus $error={Boolean(error)}>
            {error || (isDirty ? t('startups.roadmap.unsaved') : t('startups.roadmap.upToDate'))}
          </SaveStatus>
          <SaveButton type="button" disabled={!isDirty || isSaving} onClick={handleSave}>
            <Save />
            {isSaving ? t('startups.roadmap.saving') : t('startups.roadmap.save')}
          </SaveButton>
        </Footer>
      )}
    </Panel>
  );
};
