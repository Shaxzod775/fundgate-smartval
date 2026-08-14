import styled from 'styled-components';
import { numberLocale } from '../../../utils/formatNumber';
import type {
  InvestmentCommitteeMeeting,
  InvestmentCommitteeMeetingProject,
  InvestmentCommitteeMeetingStage,
} from '../../../services/api';
import type { TFunction } from 'i18next';

export const STAGE_ORDER: InvestmentCommitteeMeetingStage[] = [
  'draft',
  'shortlist_signing',
  'voting',
  'signing',
  'completed',
];

const COMMITTEE_MEMBER_HIDDEN_STAGES = new Set<InvestmentCommitteeMeetingStage>([
  'completed',
]);

export function stageOrderForViewerRole(role: string | null | undefined): InvestmentCommitteeMeetingStage[] {
  return role === 'committee_member'
    ? STAGE_ORDER.filter((stage) => !COMMITTEE_MEMBER_HIDDEN_STAGES.has(stage))
    : STAGE_ORDER;
}

const RETIRED_REVIEW_STAGES: InvestmentCommitteeMeetingStage[] = ['legal_review', 'deputy_review', 'director_review'];

export function meetingStage(meeting: InvestmentCommitteeMeeting | null | undefined): InvestmentCommitteeMeetingStage {
  const stage = (meeting?.stage as InvestmentCommitteeMeetingStage) || 'draft';
  return RETIRED_REVIEW_STAGES.includes(stage) ? 'signing' : stage;
}

export function committeeStage(meeting: InvestmentCommitteeMeeting | null | undefined): InvestmentCommitteeMeetingStage {
  return (meeting?.stage as InvestmentCommitteeMeetingStage) || 'draft';
}

export function stageIndex(stage: InvestmentCommitteeMeetingStage): number {
  const sidebarStageOrder: InvestmentCommitteeMeetingStage[] = [
    'draft',
    'shortlist_signing',
    'voting',
    'legal_review',
    'deputy_review',
    'director_review',
    'signing',
    'completed',
  ];
  const index = sidebarStageOrder.indexOf(stage);
  return index === -1 ? 0 : index;
}

export function stageTone(stage: InvestmentCommitteeMeetingStage): 'green' | 'amber' | 'blue' | 'red' {
  if (stage === 'completed') return 'green';
  if (stage === 'cancelled') return 'red';
  if (stage === 'draft' || stage === 'shortlist_signing') return 'amber';
  return 'blue';
}

export function decisionMeta(
  decision: string | undefined,
  t: TFunction,
): { tone: 'green' | 'red' | 'blue'; label: string } {
  if (decision === 'selected') {
    return { tone: 'green', label: t('investmentCommittee.protocol.decisionSelected', 'Одобрен') };
  }
  if (decision === 'rejected') {
    return { tone: 'red', label: t('investmentCommittee.protocol.decisionRejected', 'Отклонён') };
  }
  return { tone: 'blue', label: t('investmentCommittee.command.pendingDecision', 'на рассмотрении') };
}

export function projectName(project: InvestmentCommitteeMeetingProject): string {
  return project.startupName || project.startupId || 'Project';
}

export function stringTerm(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Intl.NumberFormat(numberLocale()).format(value);
  }
  return undefined;
}

export function projectTerm(project: InvestmentCommitteeMeetingProject, keys: string[]): string | undefined {
  const terms = project.terms || {};
  for (const key of keys) {
    const value = stringTerm(terms[key]);
    if (value) return value;
  }
  return undefined;
}

export function formatAmount(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function meetingInvestmentTotal(meeting: InvestmentCommitteeMeeting): number {
  return (meeting.protocol?.presentedProjects || []).reduce((sum, project) => {
    const terms = (project.terms || {}) as Record<string, unknown>;
    const raw = terms.investmentAmount ?? terms.amount ?? terms.ticketSize;
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? sum + raw : sum;
  }, 0);
}

export function votingProgress(meeting: InvestmentCommitteeMeeting): { voted: number; total: number } | null {
  const total = meeting.committee?.members?.length || 0;
  if (!total) return null;
  const voted = new Set<string>();
  for (const project of meeting.protocol?.presentedProjects || []) {
    for (const vote of project.memberVotes || []) {
      if (vote.vote && vote.memberId) voted.add(vote.memberId);
    }
  }
  return { voted: voted.size, total };
}

export interface MeetingVoteComment {
  id: string;
  memberName: string;
  projectName: string;
  vote?: string;
  comment: string;
  votedAt?: string;
}

export function collectVoteComments(meeting: InvestmentCommitteeMeeting, t: TFunction): MeetingVoteComment[] {
  return (meeting.protocol?.presentedProjects || []).flatMap((project) => (project.memberVotes || [])
    .filter((vote) => (vote.comment || '').trim())
    .map((vote) => ({
      id: `${project.startupId || projectName(project)}-${vote.memberId || vote.memberName || vote.votedAt || 'vote'}`,
      memberName: vote.memberName || vote.memberId || t('common.notSpecified'),
      projectName: projectName(project),
      vote: vote.vote,
      comment: (vote.comment || '').trim(),
      votedAt: vote.votedAt,
    })));
}

export const COMMITTEE_DOCUMENT_ACCEPT = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

export interface SignedDocPayload {
  fileBase64: string;
  fileName: string;
  contentType: string;
}

export const Page = styled.div<{ $capped?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  ${({ $capped }) => ($capped ? 'width: 100%; max-width: 1040px; margin: 0 auto;' : '')}
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background:
    linear-gradient(135deg, ${({ theme }) => theme.colors.accent.primary}20, rgba(59, 130, 246, 0.12)),
    ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.md};

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

export const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  line-height: 1.1;
  overflow-wrap: anywhere;

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizes.xl};
  }
`;

export const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  max-width: 760px;
  line-height: 1.55;
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`;

export const Panel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 40px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $variant, theme }) => (
    $variant === 'primary'
      ? theme.colors.accent.primary
      : $variant === 'danger'
        ? '#ef4444'
        : theme.colors.border.primary
  )};
  background: ${({ $variant, theme }) => (
    $variant === 'primary'
      ? theme.colors.accent.primary
      : $variant === 'danger'
        ? 'rgba(239, 68, 68, 0.12)'
        : theme.colors.bg.card
  )};
  color: ${({ $variant, theme }) => ($variant === 'primary' ? '#fff' : $variant === 'danger' ? '#ef4444' : theme.colors.text.primary)};
  font-weight: 700;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  box-shadow: ${({ $variant, theme }) => ($variant === 'primary' ? theme.shadows.sm : 'none')};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ $variant, theme }) => ($variant === 'primary' ? theme.colors.accent.primaryHover : theme.colors.bg.cardHover)};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 1;
    border-color: ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.bg.card};
    color: ${({ theme }) => theme.colors.text.tertiary};
    box-shadow: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

export const Badge = styled.span<{ $tone?: 'green' | 'amber' | 'blue' | 'red' }>`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  /* Пилюля всегда в одну строку: перенос внутри неё («Итоговый / протокол»)
     делал бейдж в два этажа и заодно ломал соседний заголовок, оставляя
     пустоту справа. Не влезает — переносится целиком на свою строку. */
  white-space: nowrap;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  color: ${({ $tone }) => (
    $tone === 'red' ? '#ef4444' : $tone === 'amber' ? '#f59e0b' : $tone === 'blue' ? '#3b82f6' : '#10b981'
  )};
  background: ${({ $tone }) => (
    $tone === 'red'
      ? 'rgba(239,68,68,0.12)'
      : $tone === 'amber'
        ? 'rgba(245,158,11,0.12)'
        : $tone === 'blue'
          ? 'rgba(59,130,246,0.12)'
          : 'rgba(16,185,129,0.12)'
  )};
  border: 1px solid ${({ $tone }) => (
    $tone === 'red'
      ? 'rgba(239,68,68,0.22)'
      : $tone === 'amber'
        ? 'rgba(245,158,11,0.24)'
        : $tone === 'blue'
          ? 'rgba(59,130,246,0.24)'
          : 'rgba(16,185,129,0.24)'
  )};
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 0;
`;

export const FieldLabel = styled.span<{ $required?: boolean }>`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 0;
  overflow-wrap: anywhere;

  ${({ $required, theme }) => $required && `
    &::after {
      content: ' *';
      color: ${theme.colors.status.error};
    }
  `}
`;

export const Input = styled.input`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }
`;

export const RequiredHint = styled.span`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`;

export const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 110px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }
`;

export const HiddenFileInput = styled.input`
  display: none;
`;

export const EmptyState = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const ErrorText = styled.p`
  margin: 0;
  color: #ef4444;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const SuccessText = styled.p`
  margin: 0;
  color: #10b981;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const InfoBanner = styled.div<{ $tone?: 'amber' | 'blue' | 'green' | 'red' }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ $tone }) => (
    $tone === 'red'
      ? 'rgba(239,68,68,0.25)'
      : $tone === 'blue'
        ? 'rgba(59,130,246,0.25)'
        : $tone === 'green'
          ? 'rgba(16,185,129,0.25)'
          : 'rgba(245,158,11,0.25)'
  )};
  background: ${({ $tone }) => (
    $tone === 'red'
      ? 'rgba(239,68,68,0.08)'
      : $tone === 'blue'
        ? 'rgba(59,130,246,0.08)'
        : $tone === 'green'
          ? 'rgba(16,185,129,0.08)'
          : 'rgba(245,158,11,0.08)'
  )};

  svg {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

export const FactTiles = styled.div`
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
`;

export const FactTile = styled.div`
  /* В узкой карточке ряд не помещается в одну линию: тогда наша инвестиция
     занимает верхнюю строку целиком, а справочные цифры встают парой под ней.
     Контейнерный запрос, а не медиа: один и тот же блок стоит и в широкой
     панели подписи, и в узкой карточке шортлиста на одном экране. */
  @container (max-width: 520px) {
    &:first-child { grid-column: 1 / -1; }
  }

  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
`;

export const FactTileLabel = styled.label<{ $required?: boolean }>`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ $required, theme }) => $required && `
    &::after {
      content: ' *';
      color: ${theme.colors.status.error};
    }
  `}
`;

export const FactTileValue = styled.span<{ $empty?: boolean }>`
  color: ${({ $empty, theme }) => ($empty ? theme.colors.text.tertiary : theme.colors.text.primary)};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ $empty }) => ($empty ? 400 : 700)};
  font-style: ${({ $empty }) => ($empty ? 'italic' : 'normal')};
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const FactTileInput = styled.input`
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  line-height: 22px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-weight: 400;
    font-style: italic;
  }

  &:hover:not(:disabled) { border-bottom-color: ${({ theme }) => theme.colors.border.secondary}; }

  &:focus {
    outline: none;
    border-bottom-color: ${({ theme }) => theme.colors.border.inputFocus};
  }

  &:disabled { cursor: not-allowed; }
`;
