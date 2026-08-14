import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Construction,
  Crown,
  Eye,
  FileCheck2,
  FileText,
  FlaskConical,
  Gavel,
  Lock,
  Pencil,
  Scale,
  ChevronDown,
  MessageSquare,
  PenLine,
  Save,
  ScrollText,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
  Vote,
} from 'lucide-react';
import {
  investmentCommitteeApi,
  isTestEnvHost,
  startupsApi,
  teamApi,
  type DataRoomBlocker,
  type DataRoomBlockerReasonInput,
  type InvestmentCommitteeMeeting,
  type InvestmentCommitteeMeetingProject,
  type InvestmentCommitteeMeetingStage,
  type InvestmentCommitteeShortlistPatch,
  type InvestmentCommitteeSnapshotMember,
  type Manager,
  type Startup,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Actions,
  Badge,
  Button,
  Field,
  FieldLabel,
  InfoBanner,
  Input,
  Muted,
  Page,
  TextArea,
  Title,
  TitleBlock,
  decisionMeta,
  formatAmount,
  meetingInvestmentTotal,
  meetingStage,
  projectName,
  projectTerm,
  stageTone,
} from './components/shared';
import MeetingsListPanel from './components/MeetingsListPanel';
import MeetingCommentsPanel from './components/MeetingCommentsPanel';
import { previewDocument } from '../../components/ui/DocPreview/DocPreview';
import { CrmImage } from '../../components/ui/CrmImage';
import ConfirmDialog from './components/ConfirmDialog';
import ShortlistBuilder from './components/ShortlistBuilder';
import ShortlistSignPanel from './components/ShortlistSignPanel';
import DataRoomBlockersDialog from './components/DataRoomBlockersDialog';
import VotingMatrix from './components/VotingMatrix';
import CommitteeRoleVotingPanel from './components/CommitteeRoleVotingPanel';
import DataRoomPanel, { type DataRoomFocus } from './components/DataRoomPanel';
import TopToast from '../../components/ui/TopToast/TopToast';
import {
  meetingsAwaitingAction,
  notifyCommitteeMeetingsUpdated,
} from './awaitingActions';
import LegalReviewPanel from './components/LegalReviewPanel';
import DecisionPanel from './components/DecisionPanel';
import SigningPanel from './components/SigningPanel';
import ReturnsTimeline from './components/ReturnsTimeline';
import {
  CabinetGrid,
  CabinetContentArea,
  CabinetSidebar,
  CabinetSection,
  FullWidthStack,
  MeetingSummaryHeader,
  StageStrip,
  InvitedMembers,
} from './components/MeetingSummaryPage';
import { isCommitteeUnderDevelopment } from './underDevelopment';
import Modal from '../../components/ui/Modal/Modal';
import { InvestmentCommitteeSkeleton } from './InvestmentCommitteeSkeleton';
import { memberVoteProgress } from './voteProgress';
import { committeeChair, committeeVotingMembers, committeeVotingPhase } from './committeeRoles';
import { isDataRoomRequiredError } from './dataRoomGate';
import { canEditStartupDataRoomLink as canEditDataRoomLinkForRole } from '../../utils/startupDataRoom';

const STAFF_ROLES = ['manager_investment', 'manager_ma', 'deputy_investment', 'deputy_ma', 'ceo', 'admin'];

type CommandTone = 'green' | 'amber' | 'blue' | 'red';
type MeetingTab = 'process' | 'projects';
type PrimaryAction = {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  owner: string;
  cta?: string;
  protocolUrl?: string;
  tone: CommandTone;
};

interface DataRoomBlockersDialogState {
  meetingId: string;
  meetingUpdatedAt: string;
  blockers: DataRoomBlocker[];
  shortlistPatch?: InvestmentCommitteeShortlistPatch;
}

const CommandHeader = styled.section<{ $flush?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  align-items: center;
  ${({ $flush, theme }) => ($flush ? '' : `
    border: 1px solid ${theme.colors.border.secondary};
    background: ${theme.colors.bg.card};
    border-radius: ${theme.radius.md};
    padding: ${theme.spacing[5]};
    box-shadow: ${theme.shadows.sm};
  `)}

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing[3]};
  }

  @media (max-width: 480px) {
    padding: ${({ $flush, theme }) => ($flush ? '0' : `${theme.spacing[4]} ${theme.spacing[3]}`)};
  }
`;

const HeaderKicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const CommandTitleBlock = styled(TitleBlock)`
  gap: ${({ theme }) => theme.spacing[3]};
  /* База 320px: пока заголовку хватает ≥320px рядом с кнопками — одна строка,
     иначе flex-wrap уводит кнопки на следующую. min-width: 0 даёт мета-строке
     сворачиваться, не распирая шапку. */
  flex: 1 1 320px;
  min-width: 0;

  /* В column-раскладке телефонов flex-basis стал бы высотой — сбрасываем. */
  @media (max-width: 768px) {
    flex-basis: auto;
  }
`;

const CommandActions = styled(Actions)`
  align-items: center;

  /* На телефонах кнопки «назад»/«архивировать» переносятся и растягиваются */
  @media (max-width: 768px) {
    width: 100%;

    > * {
      flex: 1 1 auto;
    }
  }
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* Живёт в CommandHeader слева; действия шапки уходят вправо своим margin. */
  margin-right: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`;

const DetailStack = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  /* Внизу страницы стоит композер комментариев, а поверх него — плавающая
     кнопка обратной связи (bottom: 88px, ~44px). Оставляем ей полосу, иначе
     на полной прокрутке она накрывает кнопку отправки. */
  padding-bottom: 148px;
`;

const MetricIcon = styled.span<{ $tone?: CommandTone }>`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone, theme }) => (
    $tone === 'red'
      ? theme.colors.status.danger
      : $tone === 'amber'
        ? theme.colors.status.warning
        : $tone === 'blue'
          ? theme.colors.status.info
          : theme.colors.status.success
  )};
  background: ${({ $tone, theme }) => (
    $tone === 'red'
      ? theme.colors.status.dangerBg
      : $tone === 'amber'
        ? theme.colors.status.warningBg
        : $tone === 'blue'
          ? theme.colors.status.infoBg
          : theme.colors.status.successBg
  )};

  svg {
    width: 19px;
    height: 19px;
  }
`;

const MetricLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const MetricValue = styled.strong`
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  line-height: 1.15;
`;

const MetricHint = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.35;
`;

const ActionPanel = styled.section<{ $tone: CommandTone }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  border: 1px solid ${({ $tone, theme }) => (
    $tone === 'red'
      ? theme.colors.status.dangerBorder
      : $tone === 'amber'
        ? theme.colors.status.warningBorder
        : $tone === 'blue'
          ? theme.colors.status.infoBorder
          : theme.colors.status.successBorder
  )};
  background: ${({ $tone, theme }) => (
    $tone === 'red'
      ? theme.colors.status.dangerBg
      : $tone === 'amber'
        ? theme.colors.status.warningBg
        : $tone === 'blue'
          ? theme.colors.status.infoBg
          : theme.colors.status.successBg
  )};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};

    /* CTA-кнопка панели действия — на всю ширину */
    > button {
      width: 100%;
    }
  }
`;

const ActionIcon = styled(MetricIcon)`
  width: 44px;
  height: 44px;
`;

const ActionCopy = styled.div`
  min-width: 0;
`;

const ActionEyebrow = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const ActionTitle = styled.h2`
  margin: ${({ theme }) => theme.spacing[1]} 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  line-height: 1.2;
`;

const DotsBar = styled.div`
  display: grid;
  align-items: start;
`;

const DotCell = styled.button<{ $state: 'done' | 'current' | 'upcoming' | 'blocked' }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing[2]} 4px;
  border: none;
  background: transparent;
  min-width: 0;
  cursor: pointer;

  &:disabled { cursor: default; }

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: calc(${({ theme }) => theme.spacing[2]} + 7px);
    height: 2px;
    width: calc(50% - ${({ $state }) => ($state === 'current' ? '14px' : '12px')});
    background: ${({ $state, theme }) => ($state === 'done' || $state === 'current'
    ? theme.colors.status.success
    : theme.colors.border.secondary)};
  }

  &::before { left: 0; }
  &::after {
    right: 0;
    background: ${({ $state, theme }) => ($state === 'done'
    ? theme.colors.status.success
    : theme.colors.border.secondary)};
  }

  &:first-child::before,
  &:last-child::after { display: none; }
`;

const DotCircle = styled.span<{ $state: 'done' | 'current' | 'upcoming' | 'blocked'; $viewed?: boolean }>`
  width: ${({ $state }) => ($state === 'current' ? '16px' : '12px')};
  height: ${({ $state }) => ($state === 'current' ? '16px' : '12px')};
  margin: ${({ $state }) => ($state === 'current' ? '0' : '2px 0')};
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $state, theme }) => (
    $state === 'done'
      ? theme.colors.status.success
      : $state === 'current'
        ? theme.colors.bg.card
        : $state === 'blocked'
          ? theme.colors.status.danger
          : theme.colors.bg.tertiary
  )};
  border: ${({ $state, theme }) => ($state === 'current' ? `3px solid ${theme.colors.accent.primary}` : 'none')};
  box-shadow: ${({ $viewed, theme }) => ($viewed ? `0 0 0 3px ${theme.colors.accent.primary}44` : 'none')};
`;

const DotLabel = styled.span<{ $state: 'done' | 'current' | 'upcoming' | 'blocked' }>`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ $state }) => ($state === 'current' ? 800 : 500)};
  color: ${({ $state, theme }) => (
    $state === 'current'
      ? theme.colors.text.primary
      : $state === 'upcoming'
        ? theme.colors.text.tertiary
        : theme.colors.text.secondary
  )};

  @media (max-width: 640px) { display: none; }
`;

const WorkZone = styled.section<{ $current?: boolean }>`
  border: 1px solid ${({ $current, theme }) => ($current ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const WorkZoneHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const StepDot = styled.span<{ $state: 'done' | 'current' | 'upcoming' | 'blocked' }>`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: ${({ $state, theme }) => ($state === 'upcoming' ? theme.colors.text.tertiary : '#fff')};
  background: ${({ $state, theme }) => (
    $state === 'done'
      ? theme.colors.status.success
      : $state === 'current'
        ? theme.colors.accent.primary
        : $state === 'blocked'
          ? theme.colors.status.danger
          : theme.colors.bg.tertiary
  )};

  svg { width: 13px; height: 13px; }
`;

const StepCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StepTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StepMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  overflow-wrap: anywhere;
`;

const StepChevron = styled(ChevronDown)<{ $open?: boolean }>`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  transition: transform ${({ theme }) => theme.transitions.base};
`;

const AgendaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  flex-wrap: wrap;
`;

const MainColumn = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const RailPanel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const RailTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};

  svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CompactButton = styled(Button)`
  min-height: 34px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  svg {
    width: 15px;
    height: 15px;
  }
`;

const DialogStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const CommitteeMemberList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const CommitteeMemberOption = styled.label<{ $checked?: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  border: 1px solid ${({ $checked, theme }) => ($checked ? theme.colors.accent.primary : theme.colors.border.secondary)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $checked, theme }) => ($checked ? `${theme.colors.accent.primary}14` : theme.colors.bg.card)};
  padding: ${({ theme }) => theme.spacing[3]};
  cursor: pointer;
`;

const NativeCheckbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.accent.primary};
`;

const MemberRoleActions = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const ChairSelectButton = styled.button<{ $active: boolean }>`
  min-height: 30px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.status.warning : theme.colors.border.secondary)};
  background: ${({ $active, theme }) => ($active ? theme.colors.status.warningBg : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.status.warning : theme.colors.text.secondary)};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  cursor: pointer;

  &:disabled { opacity: 0.45; cursor: not-allowed; }
  svg { width: 14px; height: 14px; }
`;

const CommitteeMemberCopy = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  > strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const MemberEmail = styled.span`
  display: flex;
  min-width: 0;
  max-width: 100%;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;

  > .local {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  > .domain {
    flex: none;
    white-space: nowrap;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

function voteStats(meeting: InvestmentCommitteeMeeting | null | undefined) {
  const projects = meeting?.protocol?.presentedProjects || [];
  const members = committeeVotingMembers(meeting?.committee?.members || []);
  let forCount = 0;
  let againstCount = 0;
  let votedMembers = 0;
  members.forEach((member) => {
    let f = 0;
    let a = 0;
    projects.forEach((project) => {
      const entry = (project.memberVotes || []).find((vote) => vote.memberId === member.managerId);
      if (entry?.vote === 'for') f += 1;
      else if (entry?.vote === 'against') a += 1;
    });
    if (projects.length > 0 && f + a >= projects.length) votedMembers += 1;
    if (f > a) forCount += 1;
    else if (a > f) againstCount += 1;
  });
  return {
    forCount,
    againstCount,
    castCount: votedMembers,
    totalRequired: members.length,
  };
}

function withRequestTimeout<T>(request: Promise<T>, timeoutMs = 20_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('request_timeout')), timeoutMs);
    request.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}



function InvestmentCommitteeWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { meetingId } = useParams<{ meetingId?: string }>();
  const { manager, organization } = useAuth();
  const organizationId = organization?.id || manager?.organizationId || '';

  const role = manager?.role || '';
  const isCommitteeMember = role === 'committee_member';
  const isLawyer = role === 'lawyer';
  const isDeputy = role === 'deputy_investment' || role === 'deputy_ma';
  const isDirector = role === 'ceo' || role === 'deputy_investment';
  const isInvestmentManager = role === 'manager_investment' || role === 'manager_ma';
  const canReviewDocuments = isDirector || isDeputy;
  const canManageSignedProtocol = isInvestmentManager || canReviewDocuments;
  const isStaff = STAFF_ROLES.includes(role);
  const [prodView, setProdView] = useState(
    () => new URLSearchParams(window.location.search).get('view') === 'prod',
  );
  const uiTestMode = isTestEnvHost() && !prodView;
  const toggleProdView = useCallback(() => {
    setProdView((current) => {
      const next = !current;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set('view', 'prod');
      else url.searchParams.delete('view');
      window.history.replaceState(null, '', url.toString());
      return next;
    });
  }, []);
  const directorTestMode = uiTestMode && (isDirector || isDeputy);
  const directorOnlyTestMode = uiTestMode && isDirector;

  const [meetings, setMeetings] = useState<InvestmentCommitteeMeeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<InvestmentCommitteeMeeting | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [shortlistAcceptedToast, setShortlistAcceptedToast] = useState(false);
  const [dataRoomBlockersDialog, setDataRoomBlockersDialog] = useState<DataRoomBlockersDialogState | null>(null);
  const [dataRoomBlockersError, setDataRoomBlockersError] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{ type: 'archive' | 'delete'; ids: string[] } | null>(null);
  const [missingCommitteeOpen, setMissingCommitteeOpen] = useState(false);
  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [committeeOptions, setCommitteeOptions] = useState<Manager[]>([]);
  const [selectedCommitteeIds, setSelectedCommitteeIds] = useState<string[]>([]);
  const [selectedChairId, setSelectedChairId] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    run: () => void | Promise<void>;
  } | null>(null);
  const [committeeDialogError, setCommitteeDialogError] = useState('');
  const [activeMeetingTab, setActiveMeetingTab] = useState<MeetingTab>('process');
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [dataRoomFocus, setDataRoomFocus] = useState<DataRoomFocus | null>(null);
  const [viewedStepKey, setViewedStepKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    const meetingRequest = withRequestTimeout(investmentCommitteeApi.getMeetings(organizationId)).catch((requestError: unknown) => ({
      success: false as const,
      error: requestError instanceof Error && requestError.message !== 'request_timeout'
        ? requestError.message
        : t('common.requestTimeout', 'Сервер не ответил вовремя'),
    }));
    const startupRequest = withRequestTimeout(
      isStaff ? startupsApi.getAll(organizationId) : Promise.resolve({ success: true as const, data: [] as Startup[] })
    ).catch((requestError: unknown) => ({
      success: false as const,
      error: requestError instanceof Error && requestError.message !== 'request_timeout'
        ? requestError.message
        : t('common.requestTimeout', 'Сервер не ответил вовремя'),
    }));

    const meetingResponse = await meetingRequest;
    if (meetingResponse.success) {
      const nextMeetings = meetingResponse.data || [];
      setMeetings(nextMeetings);
      setSelectedMeeting(meetingId ? nextMeetings.find((meeting) => meeting.id === meetingId) || null : null);
    } else {
      setError(meetingResponse.error || t('investmentCommittee.errors.loadMeetings'));
    }
    setLoading(false);

    const startupResponse = await startupRequest;
    if (startupResponse.success) {
      setStartups(startupResponse.data || []);
    } else {
      setError((current) => current || startupResponse.error || t('common.error', 'Ошибка загрузки стартапов'));
    }
  }, [organizationId, meetingId, isStaff, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!meetingId || selectedMeeting?.id === meetingId || loading) return;
    let active = true;
    investmentCommitteeApi.getMeeting(meetingId).then((response) => {
      if (active && response.success && response.data) setSelectedMeeting(response.data);
    });
    return () => { active = false; };
  }, [meetingId, selectedMeeting?.id, loading]);

  useEffect(() => {
    setActiveMeetingTab('process');
    setViewedStepKey(null);
    setDataRoomFocus(null);
    setDataRoomBlockersDialog(null);
    setDataRoomBlockersError('');
  }, [selectedMeeting?.id, selectedMeeting?.stage]);

  const stage = meetingStage(selectedMeeting);
  const readOnly = stage === 'completed' || stage === 'cancelled';
  const [draftTitle, setDraftTitle] = useState('');
  const [draftMeetingDate, setDraftMeetingDate] = useState('');
  const selectedMeetingRef = useRef(selectedMeeting);
  selectedMeetingRef.current = selectedMeeting;
  useEffect(() => {
    setDraftTitle(selectedMeetingRef.current?.title || '');
    setDraftMeetingDate(selectedMeetingRef.current?.meetingDate || '');
  }, [selectedMeeting?.id]);
  const isEarlyStage = stage === 'draft' || stage === 'shortlist_signing';
  const showCabinet = ['draft', 'shortlist_signing', 'voting', 'signing', 'completed'].includes(stage);
  const awaitingMyVoteIds = useMemo(() => (
    meetingsAwaitingAction(meetings, manager?.id, manager?.role).map((meeting) => meeting.id)
  ), [meetings, manager?.id, manager?.role]);
  const projects = selectedMeeting?.protocol?.presentedProjects || [];
  const votes = useMemo(() => voteStats(selectedMeeting), [selectedMeeting]);
  const isSelectedCommitteeParticipant = useMemo(() => (
    Boolean(manager?.id)
    && Boolean(selectedMeeting?.committee?.members?.some((member) => member.managerId === manager?.id))
  ), [manager?.id, selectedMeeting]);
  const selectedCommitteeNames = useMemo(() => (
    (selectedMeeting?.committee?.members || [])
      .map((member) => member.name || member.managerId)
      .filter(Boolean)
      .join(', ')
  ), [selectedMeeting]);
  const selectedCommitteeLocked = selectedMeeting?.committee?.selectionLocked === true;
  const selectedChair = useMemo(() => (
    committeeChair(selectedMeeting?.committee?.members || [])
  ), [selectedMeeting]);
  const selectedVotingMembers = useMemo(() => (
    committeeVotingMembers(selectedMeeting?.committee?.members || [])
  ), [selectedMeeting]);
  const selectedVotingPhase = selectedMeeting ? committeeVotingPhase(selectedMeeting) : 'closed';
  const isSelectedChair = Boolean(selectedChair && selectedChair.managerId === manager?.id);
  const hasSequentialCommitteeFlow = Boolean(selectedChair);
  const canVoteInSelectedMeeting = isCommitteeMember
    && stage === 'voting'
    && !readOnly
    && !isSelectedChair
    && (!hasSequentialCommitteeFlow || selectedVotingPhase === 'members')
    && (isSelectedCommitteeParticipant || !selectedCommitteeLocked);
  const joinsSelectedMeetingOnVote = canVoteInSelectedMeeting && !isSelectedCommitteeParticipant;
  const currentMemberVoteProgress = useMemo(() => {
    if (!manager?.id || !selectedMeeting) return null;
    return memberVoteProgress(selectedVotingMembers, projects)
      .find((progress) => progress.managerId === manager.id) || null;
  }, [manager?.id, selectedMeeting, selectedVotingMembers, projects]);
  const startupLogoById = useMemo(() => Object.fromEntries(
    startups
      .map((startup) => {
        const raw = startup as unknown as { logo?: string; fileUrls?: { logo?: string } };
        return [startup.id, raw.logo || raw.fileUrls?.logo || ''];
      })
      .filter(([, logo]) => Boolean(logo)),
  ) as Record<string, string>, [startups]);
  const votedManagerIds = useMemo(() => new Set(
    memberVoteProgress(selectedVotingMembers, projects)
      .filter((progress) => progress.pendingCount === 0)
      .map((progress) => progress.managerId),
  ), [selectedVotingMembers, projects]);
  const currentMemberVotedAll = Boolean(
    isCommitteeMember
    && !isSelectedChair
    && stage === 'voting'
    && isSelectedCommitteeParticipant
    && projects.length > 0
    && currentMemberVoteProgress?.pendingCount === 0
  );
  const primaryAction = useMemo<PrimaryAction | null>(() => {
    if (!selectedMeeting) {
      return {
        icon: <ScrollText />,
        eyebrow: t('investmentCommittee.command.emptyEyebrow', 'Рабочий стол'),
        title: t('investmentCommittee.selectMeetingHint'),
        description: t('investmentCommittee.command.emptyDescription', 'Список заседаний слева покажет активные процессы, архив и текущего владельца следующего шага.'),
        owner: t('investmentCommittee.command.ownerTeam', 'Команда фонда'),
        cta: t('investmentCommittee.list.newMeeting'),
        tone: 'blue' as CommandTone,
      };
    }
    if (stage === 'completed') {
      const legacyProtocols = selectedMeeting.signatures?.remoteSignature?.signedProtocolFiles || [];
      const protocolUrl = selectedMeeting.signatures?.sharedProtocol?.url
        || legacyProtocols[legacyProtocols.length - 1]?.url;
      return {
        icon: <CheckCircle2 />,
        eyebrow: t('investmentCommittee.command.completedEyebrow', 'Завершено'),
        title: t('investmentCommittee.command.completedTitle', 'Протокол закрыт'),
        description: t('investmentCommittee.readOnlyCompleted'),
        owner: t('investmentCommittee.command.ownerArchive', 'Архив'),
        ...(protocolUrl ? { cta: t('investmentCommittee.signing.openProtocol'), protocolUrl } : {}),
        tone: 'green' as CommandTone,
      };
    }
    if (stage === 'cancelled') {
      return {
        icon: <Ban />,
        eyebrow: t('investmentCommittee.command.cancelledEyebrow', 'Отменено'),
        title: t('investmentCommittee.command.cancelledTitle', 'Заседание в архиве'),
        description: t('investmentCommittee.readOnlyCancelled', { reason: selectedMeeting.cancelReason || '' }),
        owner: t('investmentCommittee.command.ownerArchive', 'Архив'),
        cta: t('investmentCommittee.backToList'),
        tone: 'red' as CommandTone,
      };
    }
    if (stage === 'draft') {
      return {
        icon: <ClipboardCheck />,
        eyebrow: isStaff
          ? t('investmentCommittee.command.myActions', 'Мои действия')
          : t('investmentCommittee.command.statusEyebrow', 'Статус заседания'),
        title: isStaff
          ? t('investmentCommittee.command.shortlistTitle', 'Собрать повестку и тезисы')
          : t('investmentCommittee.command.shortlistWaitingTitle', 'Команда формирует повестку'),
        description: isStaff
          ? t('investmentCommittee.command.shortlistDescription', 'Выберите проекты, добавьте тезисы инвест-менеджера и зафиксируйте шортлист на подпись директору.')
          : t('investmentCommittee.command.shortlistWaitingDescription', 'Заседание откроется после фиксации и подписи шортлиста.'),
        owner: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
        ...(isStaff ? { cta: t('investmentCommittee.shortlist.finalize') } : {}),
        tone: 'amber' as CommandTone,
      };
    }
    if (stage === 'shortlist_signing') {
      return {
        icon: <PenLine />,
        eyebrow: isDirector
          ? t('investmentCommittee.command.myActions', 'Мои действия')
          : t('investmentCommittee.command.statusEyebrow', 'Статус заседания'),
        title: isDirector
          ? t('investmentCommittee.command.shortlistSignTitle', 'Подписать шортлист')
          : t('investmentCommittee.command.shortlistSignWaitingTitle', 'Ожидается подпись директора'),
        description: isDirector
          ? t('investmentCommittee.shortlistSign.directorHint')
          : t('investmentCommittee.shortlistSign.waitingHint'),
        owner: t('investmentCommittee.command.ownerDirector', 'Директор'),
        ...(isDirector ? { cta: t('investmentCommittee.shortlistSign.uploadSigned') } : {}),
        tone: 'amber' as CommandTone,
      };
    }
    if (stage === 'voting') {
      if (!isCommitteeMember) {
        return {
          icon: <Vote />,
          eyebrow: t('investmentCommittee.command.statusEyebrow', 'Статус заседания'),
          title: t('investmentCommittee.command.votingObserveTitle', 'Идёт голосование комитета'),
          description: t(
            'investmentCommittee.command.votingObserveDescription',
            'Голосовать могут только члены ИК. Вам доступен прогресс, голоса и комментарии участников.'
          ),
          owner: t('investmentCommittee.command.ownerCommittee', 'Члены ИК'),
          tone: 'blue',
        };
      }
      if (!isSelectedCommitteeParticipant) {
        if (selectedCommitteeLocked) {
          return {
            icon: <Lock />,
            eyebrow: t('investmentCommittee.command.statusEyebrow', 'Статус заседания'),
            title: t('investmentCommittee.command.votingNotInSnapshotTitle', 'Ваш аккаунт не включён в это заседание'),
            description: t(
              'investmentCommittee.command.votingNotInSnapshotDescription',
              'Голосовать может только член ИК, который выбран в составе этого заседания. Состав заседания: {{members}}',
              { members: selectedCommitteeNames || '—' }
            ),
            owner: t('investmentCommittee.command.ownerCommittee', 'Члены ИК'),
            tone: 'amber',
          };
        }
        return {
          icon: <Vote />,
          eyebrow: t('investmentCommittee.command.myVote', 'Моё голосование'),
          title: t('investmentCommittee.command.votingJoinTitle', 'Проголосовать как член ИК'),
          description: t(
            'investmentCommittee.command.votingJoinDescription',
            'Этот аккаунт не был в старом составе заседания, но он активный член ИК. При первом сохранённом голосе аккаунт будет добавлен в состав. Текущий состав: {{members}}',
            { members: selectedCommitteeNames || '—' }
          ),
          owner: t('investmentCommittee.command.ownerCommitteeMember', 'Член ИК'),
          cta: t('investmentCommittee.command.openVoting', 'Открыть голосование'),
          tone: 'blue',
        };
      }
      if (currentMemberVotedAll) {
        return null;
      }
      return {
        icon: <Vote />,
        eyebrow: t('investmentCommittee.command.myVote', 'Моё голосование'),
        title: t('investmentCommittee.command.votingTitle', 'Проголосовать по проектам'),
        description: t(
          'investmentCommittee.command.votingMemberDescription',
          'Откройте голосование и поставьте «За» или «Против» в своей строке по каждому проекту.'
        ),
        owner: t('investmentCommittee.command.ownerCommitteeMember', 'Член ИК'),
        cta: t('investmentCommittee.command.openVoting', 'Открыть голосование'),
        tone: 'blue',
      };
    }
    const sharedProtocolUploaded = Boolean(selectedMeeting.signatures?.sharedProtocol?.url);
    return {
      icon: <FileCheck2 />,
      eyebrow: t('investmentCommittee.command.statusEyebrow', 'Статус заседания'),
      title: sharedProtocolUploaded
        ? t('investmentCommittee.signing.signedProtocol', 'Подписанный протокол')
        : t('investmentCommittee.command.signingWaitingTitle', 'Ожидается итоговый протокол'),
      description: sharedProtocolUploaded
        ? (canManageSignedProtocol
          ? t('investmentCommittee.signing.previewHint')
          : t('investmentCommittee.signing.memberFileAvailable'))
        : (canManageSignedProtocol
          ? t('investmentCommittee.signing.sharedHint')
          : t('investmentCommittee.signing.memberHint')),
      owner: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
      ...(canManageSignedProtocol && !sharedProtocolUploaded
        ? { cta: t('investmentCommittee.signing.uploadProtocol', 'Загрузить подписанный протокол') }
        : {}),
      tone: 'blue' as CommandTone,
    };
  }, [
    selectedMeeting,
    stage,
    t,
    isStaff,
    isDirector,
    isCommitteeMember,
    isSelectedCommitteeParticipant,
    selectedCommitteeLocked,
    selectedCommitteeNames,
    currentMemberVotedAll,
    canManageSignedProtocol,
    isLawyer,
    isDeputy,
  ]);

  const openActionTab = () => {
    setActiveMeetingTab('process');
    setViewedStepKey(null);
    window.setTimeout(() => {
      document.getElementById('current-step')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const openEditMeeting = () => {
    if (!selectedMeeting) return;
    setEditTitle(selectedMeeting.title || '');
    setEditDate(selectedMeeting.meetingDate || '');
    setEditOpen(true);
  };

  const saveEditMeeting = async () => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.updateMeeting(selectedMeeting.id, {
        title: editTitle.trim(),
        meetingDate: editDate,
        managerId: manager?.id,
        managerName: manager?.name,
      } as Partial<InvestmentCommitteeMeeting> & { managerId?: string; managerName?: string });
      if (response.success) {
        applyMeetingResult(response.data);
        setEditOpen(false);
      }
      return response;
    });
  };

  const lockedStartupIds = useMemo(() => {
    const ids = new Set<string>();
    meetings.forEach((meeting) => {
      const st = meetingStage(meeting);
      if (st === 'completed' || st === 'cancelled') return;
      if (selectedMeeting && meeting.id === selectedMeeting.id) return;
      (meeting.protocol?.presentedProjects || []).forEach((project) => {
        if (project.startupId) ids.add(project.startupId);
      });
    });
    return ids;
  }, [meetings, selectedMeeting]);

  const candidateStartups = useMemo(() => {
    const candidates = startups.filter((startup) => (
      ['pipeline', 'investment_committee'].includes(startup.status as string)
      || Boolean((startup as unknown as { sentToCommittee?: unknown }).sentToCommittee)
      || Boolean((startup as unknown as { investmentMemo?: unknown }).investmentMemo)
      || Boolean((startup as unknown as { investmentCommittee?: unknown }).investmentCommittee)
    ));
    const candidateIds = new Set(candidates.map((startup) => startup.id));
    const currentProjectIds = new Set(
      (selectedMeeting?.protocol?.presentedProjects || [])
        .map((project) => project.startupId)
        .filter((startupId): startupId is string => Boolean(startupId)),
    );
    return startups.filter((startup) => (
      !lockedStartupIds.has(startup.id)
      && (candidates.length === 0 || candidateIds.has(startup.id) || currentProjectIds.has(startup.id))
    ));
  }, [startups, lockedStartupIds, selectedMeeting]);

  const applyMeetingResult = (meeting: InvestmentCommitteeMeeting | undefined | null) => {
    if (!meeting) return;
    setSelectedMeeting(meeting);
    setMeetings((current) => current.map((item) => (item.id === meeting.id ? meeting : item)));
    notifyCommitteeMeetingsUpdated();
  };

  const runAction = async (action: () => Promise<{ success: boolean; data?: unknown; error?: string; message?: string }>): Promise<boolean> => {
    setBusy(true);
    setActionError('');
    try {
      const response = await action();
      if (!response.success) {
        setActionError(response.message || response.error || t('investmentCommittee.errors.actionFailed'));
        return false;
      }
      return true;
    } catch {
      setActionError(t('investmentCommittee.errors.actionFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createMeeting = async () => {
    await runAction(async () => {
      const membersResponse = await teamApi.getMembers(organizationId);
      if (!membersResponse.success) {
        return {
          success: false,
          error: membersResponse.error || t('investmentCommittee.errors.loadTeam', 'Не удалось проверить состав команды фонда'),
        };
      }
      const activeCommitteeMembers = (membersResponse.data || []).filter((member) => (
        member.role === 'committee_member' && member.isActive !== false
      ));
      if (!activeCommitteeMembers.length) {
        setMissingCommitteeOpen(true);
        return { success: true };
      }
      setCommitteeOptions(activeCommitteeMembers);
      setSelectedCommitteeIds(activeCommitteeMembers.map((member) => member.id));
      setSelectedChairId(activeCommitteeMembers[0]?.id || '');
      setNewMeetingTitle('');
      setNewMeetingDate(new Date().toISOString().slice(0, 10));
      setCommitteeDialogError('');
      setCommitteeDialogOpen(true);
      return { success: true };
    });
  };

  const toggleCommitteeSelection = (memberId: string) => {
    setSelectedCommitteeIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
    if (selectedChairId === memberId) {
      const fallback = selectedCommitteeIds.find((id) => id !== memberId) || '';
      setSelectedChairId(fallback);
    } else if (!selectedChairId) {
      setSelectedChairId(memberId);
    }
  };

  const confirmCreateMeeting = async () => {
    const selectedMembers = committeeOptions.filter((member) => selectedCommitteeIds.includes(member.id));
    if (!selectedMembers.length) {
      setCommitteeDialogError(t('investmentCommittee.create.selectAtLeastOne', 'Выберите хотя бы одного участника ИК.'));
      return;
    }
    if (!selectedChairId || !selectedCommitteeIds.includes(selectedChairId)) {
      setCommitteeDialogError(t('investmentCommittee.create.selectChair', 'Назначьте председателя из выбранных участников.'));
      return;
    }
    setCommitteeDialogError('');
    await runAction(async () => {
      const response = await investmentCommitteeApi.createMeeting({
        organizationId,
        managerId: manager?.id,
        managerName: manager?.name,
        title: newMeetingTitle.trim() || undefined,
        meetingDate: newMeetingDate || undefined,
        committee: {
          capturedAt: new Date().toISOString(),
          selectionLocked: true,
          requiredCount: selectedMembers.length,
          chairId: selectedChairId,
          members: selectedMembers.map((member) => ({
            managerId: member.id,
            name: member.name,
            email: member.email || '',
            committeeRole: member.id === selectedChairId ? 'chair' : 'member',
          })),
        },
      });
      if (response.success && response.data) {
        setCommitteeDialogOpen(false);
        setMeetings((current) => [response.data!, ...current]);
        navigate(`/committee/sessions/${response.data.id}`);
      }
      return response;
    });
  };

  const editedTerm = (raw: string | undefined): number | undefined => {
    if (raw === undefined) return undefined;
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 && parsed < 1e15 ? parsed : undefined;
  };

  const projectWithPayload = (
    payload: {
      theses: Record<string, string>;
      amounts?: Record<string, string>;
      requestedAmounts?: Record<string, string>;
      roundSizes?: Record<string, string>;
    },
    startupId: string,
  ) => {
    const existing = (selectedMeeting?.protocol?.presentedProjects || [])
      .find((project) => project.startupId === startupId);
    const amountRaw = (payload.amounts?.[startupId] ?? '').trim();
    const parsed = amountRaw === '' ? 0 : Number(amountRaw);
    const amountValid = Number.isFinite(parsed) && parsed >= 0 && parsed < 1e15;
    const requestedAmount = editedTerm(payload.requestedAmounts?.[startupId]);
    const totalRoundSize = editedTerm(payload.roundSizes?.[startupId]);
    return {
      ...(existing || { startupId }),
      startupId,
      managerThesis: payload.theses[startupId] || existing?.managerThesis || '',
      terms: {
        ...(existing?.terms || {}),
        ...(payload.amounts && amountValid ? { investmentAmount: parsed } : {}),
        ...(requestedAmount !== undefined ? { requestedAmount } : {}),
        ...(totalRoundSize !== undefined ? { totalRoundSize } : {}),
      },
    };
  };

  const saveDraft = async (payload: { title?: string; meetingDate?: string; startupIds: string[]; theses: Record<string, string>; amounts?: Record<string, string>; requestedAmounts?: Record<string, string>; roundSizes?: Record<string, string> }) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const presentedProjects = payload.startupIds.map((startupId) => projectWithPayload(payload, startupId));
      const response = await investmentCommitteeApi.updateMeeting(selectedMeeting.id, {
        title: payload.title,
        meetingDate: payload.meetingDate,
        startupIds: payload.startupIds,
        protocol: { presentedProjects },
        managerId: manager?.id,
        managerName: manager?.name,
      } as Partial<InvestmentCommitteeMeeting> & { startupIds: string[]; managerId?: string; managerName?: string });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const openDataRoomBlockers = (
    meetingId: string,
    meetingUpdatedAt: string,
    blockers: DataRoomBlocker[],
    shortlistPatch?: InvestmentCommitteeShortlistPatch,
  ) => {
    setActionError('');
    setDataRoomBlockersError('');
    setDataRoomBlockersDialog({ meetingId, meetingUpdatedAt, blockers, shortlistPatch });
  };

  const finalizeShortlist = async (payload: { title?: string; meetingDate?: string; startupIds: string[]; theses: Record<string, string>; amounts?: Record<string, string> }) => {
    if (!selectedMeeting) return;
    setBusy(true);
    setActionError('');
    try {
      const presentedProjects = payload.startupIds.map((startupId) => projectWithPayload(payload, startupId));
      const shortlistPatch: InvestmentCommitteeShortlistPatch = {
        title: payload.title,
        meetingDate: payload.meetingDate,
        startupIds: payload.startupIds,
        protocol: { presentedProjects },
      };
      const response = await investmentCommitteeApi.finalizeShortlist(selectedMeeting.id, {
        ...shortlistPatch,
        managerId: manager?.id,
        managerName: manager?.name,
      } as Partial<InvestmentCommitteeMeeting> & { startupIds: string[]; managerId?: string; managerName?: string });
      if (isDataRoomRequiredError(response)) {
        openDataRoomBlockers(
          selectedMeeting.id,
          response.data.meetingUpdatedAt,
          response.data.blockers,
          shortlistPatch,
        );
        return;
      }
      if (!response.success) {
        setActionError(response.message || response.error || t('investmentCommittee.errors.actionFailed'));
        return;
      }
      applyMeetingResult(response.data);
    } catch {
      setActionError(t('investmentCommittee.errors.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const reopenShortlist = async () => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.reopenShortlist(selectedMeeting.id);
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const updateShortlistAmounts = async (payload: {
    expectedShortlistExportId: string;
    amounts: Record<string, number>;
  }): Promise<boolean> => {
    if (!selectedMeeting) return false;
    return runAction(async () => {
      const response = await investmentCommitteeApi.updateShortlistAmounts(selectedMeeting.id, payload);
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const uploadSignedShortlist = async (payload: {
    fileBase64: string;
    fileName: string;
    contentType: string;
    shortlistExportId: string;
  }) => {
    if (!selectedMeeting) return;
    setBusy(true);
    setActionError('');
    try {
      const response = await investmentCommitteeApi.uploadSignedShortlist(selectedMeeting.id, payload);
      if (isDataRoomRequiredError(response)) {
        openDataRoomBlockers(
          selectedMeeting.id,
          response.data.meetingUpdatedAt,
          response.data.blockers,
        );
        return undefined;
      }
      if (!response.success) {
        setActionError(response.message || response.error || t('investmentCommittee.errors.actionFailed'));
        return undefined;
      }
      applyMeetingResult(response.data?.meeting ?? response.data?.committee);
      return response.data?.file;
    } catch {
      setActionError(t('investmentCommittee.errors.actionFailed'));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const reviewSignedShortlist = async (action: 'approve' | 'request_changes', comment?: string) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.reviewSignedShortlist(selectedMeeting.id, { action, comment });
      if (response.success) {
        applyMeetingResult(response.data);
        if (action === 'approve') setShortlistAcceptedToast(true);
      }
      return response;
    });
  };

  const uploadApprovalDocument = (step: 'deputy' | 'director') => async (payload: { fileBase64: string; fileName: string; contentType: string }) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.uploadApprovalDocument(selectedMeeting.id, { step, ...payload });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const saveDataRoomBlockerReasons = async (reasons: DataRoomBlockerReasonInput[]) => {
    const dialog = dataRoomBlockersDialog;
    if (!dialog) return;
    setBusy(true);
    setDataRoomBlockersError('');
    try {
      const response = await investmentCommitteeApi.saveDataRoomBlockerReasons(dialog.meetingId, {
        expectedMeetingUpdatedAt: dialog.meetingUpdatedAt,
        ...(dialog.shortlistPatch ? { shortlistPatch: dialog.shortlistPatch } : {}),
        reasons,
      });
      if (isDataRoomRequiredError(response)) {
        setDataRoomBlockersDialog((current) => current ? {
          ...current,
          meetingUpdatedAt: response.data.meetingUpdatedAt,
          blockers: response.data.blockers,
        } : null);
        setDataRoomBlockersError(response.message || t(
          'investmentCommittee.dataRoomBlockers.changed',
          'Список блокировок изменился. Проверьте причины и сохраните ещё раз.',
        ));
        return;
      }
      if (!response.success) {
        setDataRoomBlockersError(response.message || response.error || t('investmentCommittee.errors.actionFailed'));
        return;
      }
      applyMeetingResult(response.data);
      setDataRoomBlockersDialog(null);
      setDataRoomBlockersError('');
    } catch {
      setDataRoomBlockersError(t('investmentCommittee.errors.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const applyStartupDataRoomLink = (startupId: string, dataRoomUrl: string | undefined) => {
    setStartups((current) => current.map((startup) => (
      startup.id === startupId ? { ...startup, dataRoomUrl } : startup
    )));
  };

  const saveDataRoomBlockerLink = async (startupId: string, dataRoomUrl: string) => {
    const response = await startupsApi.updateDataRoomUrl(startupId, dataRoomUrl);
    if (!response.success) {
      throw new Error(response.message || response.error || t(
        'startupDetail.dataRoomLink.errors.saveFailed',
        'Не удалось сохранить ссылку на Data Room.',
      ));
    }

    const savedUrl = response.data?.dataRoomUrl || dataRoomUrl;
    applyStartupDataRoomLink(startupId, savedUrl);
    setDataRoomBlockersDialog((current) => current ? {
      ...current,
      blockers: current.blockers.filter((blocker) => blocker.startupId !== startupId),
    } : null);
    setDataRoomBlockersError('');
  };

  const canEditStartupDataRoomLink = (startupId: string) => {
    if (!manager) return false;
    const startup = startups.find((candidate) => candidate.id === startupId);
    return Boolean(startup && canEditDataRoomLinkForRole(
      manager.role as Manager['role'] | 'admin',
      startup.assignedManagerId,
      manager.id,
    ));
  };

  const finishDataRoomBlockers = async () => {
    const dialog = dataRoomBlockersDialog;
    if (!dialog || dialog.blockers.length > 0) return;

    if (!dialog.shortlistPatch) {
      setDataRoomBlockersDialog(null);
      setDataRoomBlockersError('');
      return;
    }

    setBusy(true);
    setDataRoomBlockersError('');
    try {
      const response = await investmentCommitteeApi.updateMeeting(dialog.meetingId, {
        ...dialog.shortlistPatch,
        managerId: manager?.id,
        managerName: manager?.name,
      } as Partial<InvestmentCommitteeMeeting> & {
        startupIds: string[];
        managerId?: string;
        managerName?: string;
      });
      if (!response.success) {
        setDataRoomBlockersError(response.message || response.error || t(
          'investmentCommittee.errors.actionFailed',
          'Не удалось выполнить действие',
        ));
        return;
      }
      applyMeetingResult(response.data);
      setDataRoomBlockersDialog(null);
    } catch {
      setDataRoomBlockersError(t(
        'investmentCommittee.errors.actionFailed',
        'Не удалось выполнить действие',
      ));
    } finally {
      setBusy(false);
    }
  };

  const openDataRoom = (startupId: string) => {
    setActiveMeetingTab('projects');
    setDataRoomFocus({ startupId, token: Date.now() });
  };

  const uploadProjectFile = async (
    startupId: string,
    payload: { fileBase64: string; fileName: string; contentType: string },
    documentType: 'presentation' | 'invest_memo',
  ) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.uploadProjectFile(selectedMeeting.id, startupId, {
        ...payload,
        documentType,
      });
      if (response.success) applyMeetingResult(response.data?.meeting);
      return response;
    });
  };

  const updateProjectProtocol = async (
    startupId: string,
    payload: { decision?: string; conditions?: string; resolution?: string },
  ) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.updateProjectProtocol(selectedMeeting.id, startupId, payload);
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const voteOnProject = async (
    startupId: string,
    vote: 'for' | 'against',
    comment?: string,
    onBehalf?: { managerId: string; name?: string },
  ) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.voteOnProject(selectedMeeting.id, startupId, {
        vote,
        comment,
        ...(onBehalf ? { onBehalfOf: onBehalf.managerId, onBehalfOfName: onBehalf.name } : {}),
      });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const submitChairDecision = async (
    startupId: string,
    action: 'approve' | 'reject' | 'return',
    comment?: string,
  ) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.submitChairDecision(
        selectedMeeting.id,
        startupId,
        { action, comment },
      );
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const submitLegalConclusion = async (conclusion: string, doc: { fileBase64: string; fileName: string; contentType: string }) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.applyApproval(selectedMeeting.id, {
        step: 'lawyer',
        action: 'approve',
        conclusion,
        fileBase64: doc.fileBase64,
        fileName: doc.fileName,
        contentType: doc.contentType,
      });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const decide = (step: 'deputy' | 'director') => async (
    action: 'sign' | 'request_changes',
    comment?: string,
    doc?: { fileBase64: string; fileName: string; contentType: string },
  ) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.applyApproval(selectedMeeting.id, {
        step,
        action,
        comment,
        ...(doc ? { fileBase64: doc.fileBase64, fileName: doc.fileName, contentType: doc.contentType } : {}),
      });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const confirmCompleteMeeting = (proceed: () => void | Promise<void>) => {
    setPendingConfirm({
      title: t('investmentCommittee.confirm.completeTitle', 'Завершить заседание инвест комитета?'),
      message: t('investmentCommittee.confirm.completeMessage', 'Убедитесь, что preview подписанного протокола проверен. После завершения заседание станет доступно только для чтения.'),
      confirmLabel: t('investmentCommittee.confirm.completeConfirm', 'Завершить заседание'),
      run: proceed,
    });
  };

  const uploadFinalProtocol = async (payload: { fileBase64: string; fileName: string; contentType: string }) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.uploadSignedDocument(selectedMeeting.id, {
        ...payload,
        documentType: 'signed_protocol',
      });
      if (response.success) {
        const data = response.data as { meeting?: InvestmentCommitteeMeeting; file?: { url?: string; fileName?: string } };
        applyMeetingResult(data.meeting);
        previewDocument(data.file?.url, data.file?.fileName);
      }
      return response;
    });
  };

  const completeSharedProtocol = async () => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.completeSignedProtocol(selectedMeeting.id);
      if (response.success) applyMeetingResult(response.data?.meeting);
      return response;
    });
  };

  const advanceToSigning = async () => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.advanceMeeting(selectedMeeting.id, { to: 'signing' });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const sendComment = async (text: string) => {
    if (!selectedMeeting) return;
    await runAction(async () => {
      const response = await investmentCommitteeApi.addComment(selectedMeeting.id, { text });
      if (response.success) applyMeetingResult(response.data);
      return response;
    });
  };

  const confirmCancelMeeting = async () => {
    if (!cancelTargetId) return;
    const targetId = cancelTargetId;
    await runAction(async () => {
      const response = await investmentCommitteeApi.cancelMeeting(targetId, {
        comment: cancelReason.trim() || undefined,
      });
      if (response.success && response.data) {
        const meeting = response.data;
        setMeetings((current) => current.map((item) => (item.id === meeting.id ? meeting : item)));
        if (selectedMeeting?.id === meeting.id) setSelectedMeeting(meeting);
        setCancelTargetId(null);
      }
      return response;
    });
  };

  const doDeleteMeeting = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    await runAction(async () => {
      const response = await investmentCommitteeApi.deleteMeeting(id);
      if (response.success) {
        setMeetings((current) => current.filter((meeting) => meeting.id !== id));
        if (selectedMeeting?.id === id) {
          setSelectedMeeting(null);
          navigate('/committee/sessions');
        }
        setDeleteId(null);
      }
      return response;
    });
  };

  const confirmBulk = async () => {
    if (!bulkConfirm) return;
    const { type, ids } = bulkConfirm;
    await runAction(async () => {
      if (type === 'delete') {
        const results = await Promise.all(ids.map((id) => investmentCommitteeApi.deleteMeeting(id)));
        const removed = new Set(ids.filter((_, i) => results[i]?.success));
        if (removed.size) {
          setMeetings((current) => current.filter((meeting) => !removed.has(meeting.id)));
          if (selectedMeeting && removed.has(selectedMeeting.id)) {
            setSelectedMeeting(null);
            navigate('/committee/sessions');
          }
        }
        setBulkConfirm(null);
        return results.find((r) => !r.success) || { success: true };
      }
      const results = await Promise.all(ids.map((id) => investmentCommitteeApi.cancelMeeting(id, {})));
      setMeetings((current) => current.map((meeting) => {
        const idx = ids.indexOf(meeting.id);
        return idx >= 0 && results[idx]?.success && results[idx]?.data ? results[idx].data! : meeting;
      }));
      setBulkConfirm(null);
      return results.find((r) => !r.success) || { success: true };
    });
  };

  const preparationPanels = selectedMeeting && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {stage === 'draft' && isStaff && (
        <ShortlistBuilder
          meeting={selectedMeeting}
          draftTitle={draftTitle}
          draftMeetingDate={draftMeetingDate}
          candidates={candidateStartups}
          currentOrganizationId={organizationId}
          currentOrganizationName={organization?.name || ''}
          saving={busy}
          error={actionError}
          onSave={saveDraft}
          canEditDataRoomLink={canEditStartupDataRoomLink}
          onDataRoomLinkChange={applyStartupDataRoomLink}
          onUploadProjectFile={uploadProjectFile}
          onFinalize={async (payload) => { setPendingConfirm({
            title: t('investmentCommittee.confirm.finalizeTitle', 'Зафиксировать шортлист?'),
            message: t('investmentCommittee.confirm.finalizeMessage', 'Состав и тезисы будут зафиксированы и отправлены директору на подпись. Изменить можно будет только через переоткрытие шортлиста.'),
            confirmLabel: t('investmentCommittee.shortlist.finalize'),
            run: () => finalizeShortlist(payload),
          }); }}
        />
      )}

      {stage === 'shortlist_signing' && (
        <ShortlistSignPanel
          meeting={selectedMeeting}
          startups={startups}
          currentOrganizationId={organizationId}
          currentOrganizationName={organization?.name || ''}
          canReview={canReviewDocuments}
          canReopen={isInvestmentManager}
          busy={busy}
          error={actionError}
          onSaveAmounts={updateShortlistAmounts}
          onUploadSigned={uploadSignedShortlist}
          onReview={reviewSignedShortlist}
          onReopen={reopenShortlist}
        />
      )}
    </div>
  );

  const advanceToSigningButton = selectedMeeting && isStaff && stage === 'voting' && !hasSequentialCommitteeFlow ? (
    <Button type="button" $variant="primary" disabled={busy} onClick={() => { setPendingConfirm({
      title: t('investmentCommittee.confirm.advanceTitle', 'Перейти к подписанию протокола?'),
      message: t('investmentCommittee.confirm.advanceMessage', 'Голосование будет закрыто, заседание перейдёт на этап общей подписи протокола.'),
      confirmLabel: t('investmentCommittee.command.advanceToSigning', 'Перейти к подписанию'),
      run: advanceToSigning,
    }); }}>
      {t('investmentCommittee.command.advanceToSigning', 'Перейти к подписанию')}
    </Button>
  ) : null;

  const votingMatrixNode = selectedMeeting && (
    <VotingMatrix
      meeting={selectedMeeting}
      currentManagerId={manager?.id}
      currentManagerName={manager?.name}
      currentManagerEmail={manager?.email}
      canVote={canVoteInSelectedMeeting}
      currentUserIsCommitteeMember={isCommitteeMember}
      observerMode={!canVoteInSelectedMeeting}
      busy={busy}
      error={stage === 'voting' ? actionError : undefined}
      onVote={voteOnProject}
      onOpenDossier={(startupId) => openDataRoom(startupId)}
      logoByStartupId={startupLogoById}
      testMode={directorTestMode}
      hideHeader
    />
  );

  const roleVotingNode = selectedMeeting && hasSequentialCommitteeFlow && isCommitteeMember ? (
    <CommitteeRoleVotingPanel
      meeting={selectedMeeting}
      currentManagerId={manager?.id}
      busy={busy}
      error={stage === 'voting' ? actionError : undefined}
      onVote={voteOnProject}
      onChairDecision={submitChairDecision}
      onOpenDossier={(startupId) => openDataRoom(startupId)}
    />
  ) : null;

  const votingPanel = selectedMeeting && roleVotingNode ? (
    <div id="committee-voting-panel">{roleVotingNode}</div>
  ) : selectedMeeting && (
    <div id="committee-voting-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {(selectedMeeting.committee?.members?.length || 0) > 0 && stage !== 'draft' && stage !== 'shortlist_signing' ? (
        <>
          {canVoteInSelectedMeeting || isCommitteeMember ? (
            <InfoBanner $tone={canVoteInSelectedMeeting ? 'green' : 'amber'}>
              {canVoteInSelectedMeeting ? <Vote /> : <Lock />}
              <span>
                {canVoteInSelectedMeeting
                  ? joinsSelectedMeetingOnVote
                    ? t(
                      'investmentCommittee.command.votingMemberJoinBanner',
                      'Вы активный член ИК. При первом сохранённом голосе этот аккаунт будет добавлен в состав заседания.'
                    )
                    : t(
                      'investmentCommittee.command.votingMemberBanner',
                      'Вы голосуете как член ИК: выберите «За» или «Против» в своей строке по каждому проекту.'
                    )
                  : t(
                    'investmentCommittee.command.votingMemberNotIncludedBanner',
                    'Этот аккаунт не входит в состав данного заседания. Голосовать может только участник, зафиксированный при открытии голосования.'
                  )}
              </span>
            </InfoBanner>
          ) : null}
          {advanceToSigningButton}
          {votingMatrixNode}
        </>
      ) : (
        <InfoBanner $tone="blue">
          <Vote />
          <span>
            {stage === 'draft' || stage === 'shortlist_signing'
              ? t('investmentCommittee.matrix.notOpenedYet', 'Голосование откроется после фиксации шортлиста и подписи директора.')
              : t('investmentCommittee.matrix.empty')}
          </span>
        </InfoBanner>
      )}
    </div>
  );

  const undecidedProjects = projects.filter(
    (project) => project.decision !== 'selected' && project.decision !== 'rejected'
  ).length;

  const decisionPanel = (step: 'deputy' | 'director') => selectedMeeting && (
    <DecisionPanel
      key={`decision-${step}`}
      meeting={selectedMeeting}
      step={step}
      canDecide={step === 'deputy' ? (isDeputy || directorOnlyTestMode) : canReviewDocuments}
      canUpload={isInvestmentManager}
      active={stage === `${step}_review` && !readOnly}
      busy={busy}
      signDisabledReason={stage === `${step}_review` && undecidedProjects > 0
        ? t('investmentCommittee.decision.blockedByResolutions', 'Сначала примите решение по каждому проекту (осталось: {{count}})', { count: undecidedProjects })
        : undefined}
      error={stage === `${step}_review` ? actionError : undefined}
      onDecide={async (action, comment, doc) => {
        if (action !== 'sign') { await decide(step)(action, comment); return; }
        setPendingConfirm({
          title: step === 'deputy'
            ? t('investmentCommittee.confirm.deputyTitle', 'Подписать решение заместителя?')
            : t('investmentCommittee.confirm.directorTitle', 'Подписать решение директора?'),
          message: step === 'deputy'
            ? t('investmentCommittee.confirm.deputyMessage', 'Заседание перейдёт на этап решения директора.')
            : t('investmentCommittee.confirm.directorMessage', 'Заседание перейдёт на этап загрузки итогового подписанного протокола.'),
          confirmLabel: t('investmentCommittee.decision.sign'),
          run: () => decide(step)('sign', comment, doc),
        });
      }}
      onUpload={uploadApprovalDocument(step)}
    />
  );

  const resolutionsPanel = selectedMeeting && stage === 'signing' && !readOnly ? (
    <ProjectResolutionPanel
      meeting={selectedMeeting}
      canEdit={isStaff}
      busy={busy}
      onSave={updateProjectProtocol}
      onOpenProject={isStaff
                ? (startupId) => navigate(`/committee/sessions/${selectedMeeting.id}/projects/${startupId}`)
                : undefined}
    />
  ) : null;

  const legalPanel = selectedMeeting && (stage === 'legal_review' || selectedMeeting.legalReview?.status === 'submitted' || Boolean(selectedMeeting.legalReview?.conclusion)) ? (
    <LegalReviewPanel
      meeting={selectedMeeting}
      isLawyer={isLawyer}
      active={stage === 'legal_review' && !readOnly}
      busy={busy}
      error={stage === 'legal_review' ? actionError : undefined}
      onSubmit={async (conclusion, doc) => { setPendingConfirm({
        title: t('investmentCommittee.confirm.legalTitle', 'Отправить заключение юриста?'),
        message: t('investmentCommittee.confirm.legalMessage', 'Заключение уйдёт заместителю, заседание перейдёт на следующий этап. Отредактировать его здесь будет нельзя.'),
        confirmLabel: t('investmentCommittee.legal.submit'),
        run: () => submitLegalConclusion(conclusion, doc),
      }); }}
    />
  ) : null;

  const signingContent = selectedMeeting && (
    <SigningPanel
      meeting={selectedMeeting}
      canUpload={canManageSignedProtocol}
      readOnly={readOnly}
      busy={busy}
      error={stage === 'signing' ? actionError : undefined}
      onUploadProtocol={uploadFinalProtocol}
      onComplete={() => confirmCompleteMeeting(completeSharedProtocol)}
    />
  );

  const agendaSummaryList = selectedMeeting && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {projects.map((project) => {
        const requestedAmount = projectTerm(project, ['requestedAmount']);
        const fundAmount = projectTerm(project, ['investmentAmount', 'amount', 'ticketSize']);
        return (
          <AgendaRow key={project.startupId || projectName(project)}>
            <span>{projectName(project)}</span>
            <Muted as="span">
              {[
                project.assignedManagerName,
                requestedAmount
                  ? `${t('investmentCommittee.dataRoom.ask', 'Запрос')}: $${requestedAmount}`
                  : undefined,
                fundAmount
                  ? `${t('investmentCommittee.shortlist.fundAmountShort', 'Фонд')}: $${fundAmount}`
                  : undefined,
              ].filter(Boolean).join(' · ') || '—'}
            </Muted>
          </AgendaRow>
        );
      })}
    </div>
  );

  const signedShortlistDoc = selectedMeeting?.shortlist?.signedDocument;

  interface WizardStep {
    key: string;
    title: string;
    owner: string;
    summary?: string;
    lockedHint?: string;
    headerAction?: ReactNode;
    content?: ReactNode;
  }

  const meetingTotal = selectedMeeting ? meetingInvestmentTotal(selectedMeeting) : 0;
  const wizardSteps: WizardStep[] = selectedMeeting ? [
    {
      key: 'draft',
      title: t('investmentCommittee.process.stepAgenda', 'Повестка'),
      owner: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
      summary: `${t('investmentCommittee.list.projects', { count: projects.length })}${meetingTotal > 0 ? ` · ${formatAmount(meetingTotal)}` : ''}`,
      content: stage === 'draft' && isStaff ? preparationPanels : agendaSummaryList,
    },
    {
      key: 'shortlist_signing',
      title: t('investmentCommittee.process.stepDirectorSign', 'Подпись директора'),
      owner: t('investmentCommittee.command.ownerDirector', 'Директор'),
      summary: signedShortlistDoc?.url
        ? t('investmentCommittee.process.shortlistSigned', 'Шортлист подписан')
        : undefined,
      lockedHint: t('investmentCommittee.process.lockedAfter', 'Откроется после: {{step}}', { step: t('investmentCommittee.process.stepAgenda', 'Повестка') }),
      content: stage === 'shortlist_signing' ? preparationPanels : (
        signedShortlistDoc?.url ? (
          <Button as="a" href={signedShortlistDoc.url} target="_blank" rel="noreferrer" onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); previewDocument(signedShortlistDoc.url, signedShortlistDoc.fileName); }}>
            <FileText />
            {t('investmentCommittee.process.openSignedShortlist', 'Подписанный шортлист')}
          </Button>
        ) : undefined
      ),
    },
    {
      key: 'voting',
      title: t('investmentCommittee.process.stepVoting', 'Голосование'),
      owner: t('investmentCommittee.command.ownerCommittee', 'Члены ИК'),
      summary: votes.totalRequired
        ? `${votes.castCount}/${votes.totalRequired} · ${t('investmentCommittee.command.votesBreakdown', 'За {{forCount}} · Против {{againstCount}}', { forCount: votes.forCount, againstCount: votes.againstCount })}`
        : undefined,
      lockedHint: t('investmentCommittee.process.lockedAfter', 'Откроется после: {{step}}', { step: t('investmentCommittee.process.stepDirectorSign', 'Подпись директора') }),
      content: votingPanel,
    },
    {
      key: 'signing',
      title: t('investmentCommittee.process.stepSigning', 'Итоговый протокол'),
      owner: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
      summary: selectedMeeting.signatures?.sharedProtocol?.url
        ? t('investmentCommittee.signing.sharedCompleted', 'Подписанный протокол загружен')
        : undefined,
      lockedHint: t('investmentCommittee.process.lockedAfter', 'Откроется после: {{step}}', { step: t('investmentCommittee.process.stepVoting', 'Голосование') }),
      content: signingContent,
    },
  ] : [];

  const wizardCurrentIndex = stage === 'completed'
    ? wizardSteps.length
    : wizardSteps.findIndex((step) => step.key === stage);

  const wizardStepState = (index: number): 'done' | 'current' | 'upcoming' | 'blocked' => {
    if (stage === 'cancelled') return 'blocked';
    if (wizardCurrentIndex === -1) return 'upcoming';
    if (index < wizardCurrentIndex) return 'done';
    if (index === wizardCurrentIndex) return 'current';
    return 'upcoming';
  };

  const fallbackStepIndex = wizardCurrentIndex >= 0 && wizardCurrentIndex < wizardSteps.length
    ? wizardCurrentIndex
    : wizardSteps.length - 1;
  const viewedStepIndex = viewedStepKey ? wizardSteps.findIndex((step) => step.key === viewedStepKey) : -1;
  const activeStepIndex = viewedStepIndex >= 0 && wizardStepState(viewedStepIndex) !== 'upcoming'
    ? viewedStepIndex
    : fallbackStepIndex;
  const activeStep = wizardSteps[activeStepIndex];
  const activeStepState = activeStep ? wizardStepState(activeStepIndex) : 'upcoming';

  const cabinetActionByStage: Partial<Record<InvestmentCommitteeMeetingStage, { icon: ReactNode; title: string; content: ReactNode }>> = {
    draft: { icon: <ClipboardCheck />, title: t('investmentCommittee.command.shortlistTitle', 'Собрать повестку и тезисы'), content: preparationPanels },
    shortlist_signing: { icon: <PenLine />, title: t('investmentCommittee.command.shortlistSignTitle', 'Подписать шортлист'), content: preparationPanels },
    voting: { icon: <Vote />, title: t('investmentCommittee.process.stepVoting', 'Голосование'), content: votingPanel },
    signing: { icon: <FileCheck2 />, title: t('investmentCommittee.process.stepSigning', 'Итоговый протокол'), content: <>{resolutionsPanel}{legalPanel}{signingContent}</> },
    completed: { icon: <FileCheck2 />, title: t('investmentCommittee.process.stepSigning', 'Итоговый протокол'), content: signingContent },
  };
  const cabinetAction = cabinetActionByStage[stage];
  const votingUnderProjects = stage === 'voting' && !roleVotingNode && projects.length <= 2;
  const votingBelowFullWidth = stage === 'voting' && (Boolean(roleVotingNode) || projects.length >= 3);

  const meetingCabinet = selectedMeeting && (
    <>
      <MeetingSummaryHeader
        meeting={selectedMeeting}
        editable={stage === 'draft' && isStaff}
        draftTitle={draftTitle}
        draftMeetingDate={draftMeetingDate}
        onTitleChange={setDraftTitle}
        onMeetingDateChange={setDraftMeetingDate}
        votes={stage === 'voting' ? votes : undefined}
      />
      <StageStrip
        stage={stage}
        viewerRole={manager?.role}
        votingPhase={selectedMeeting.protocol?.voting?.phase}
        hasChair={hasSequentialCommitteeFlow}
        voting={stage === 'voting' && votes.totalRequired > 0 ? {
          castCount: votes.castCount,
          totalRequired: votes.totalRequired,
          canVote: canVoteInSelectedMeeting,
          hasVoted: currentMemberVotedAll,
          canOpenVoting: isCommitteeMember || isSelectedChair,
          onVote: () => navigate(`/committee/sessions/${selectedMeeting.id}/vote`),
        } : undefined}
      />

      <CabinetGrid $fullWidth={isEarlyStage}>
        <CabinetContentArea>
          {!isEarlyStage ? (
            <CabinetSection title={t('investmentCommittee.summary.startups', 'Стартапы')}>
              <DataRoomPanel
                meeting={selectedMeeting}
                startups={startups}
                scrollAfter={3}
                onOpenProject={isStaff
                  ? (startupId) => navigate(`/committee/sessions/${selectedMeeting.id}/projects/${startupId}`)
                  : undefined}
              />
            </CabinetSection>
          ) : null}
          {votingUnderProjects && cabinetAction ? (
            <div id="current-step" style={{ marginTop: 24 }}>
              <CabinetSection title={cabinetAction.title}>
                {cabinetAction.content}
              </CabinetSection>
            </div>
          ) : null}
        </CabinetContentArea>

        {!isEarlyStage ? (
          <CabinetSidebar>
            <CabinetSection title={t('investmentCommittee.summary.invited', 'Участники')}>
              <InvitedMembers
                members={selectedMeeting.committee?.members || []}
                showVoteStatus={stage === 'voting'}
                votedManagerIds={votedManagerIds}
              />
            </CabinetSection>
          </CabinetSidebar>
        ) : null}
      </CabinetGrid>

      {(votingBelowFullWidth || stage !== 'voting') ? (
        <FullWidthStack>
          {votingBelowFullWidth ? (
            <div id="current-step">
              <CabinetSection title={t('investmentCommittee.process.stepVoting', 'Голосование')}>
                {cabinetAction?.content}
              </CabinetSection>
            </div>
          ) : (
            <>
              {cabinetAction ? (
                <div id="current-step">
                  <CabinetSection title={cabinetAction.title}>
                    {cabinetAction.content}
                  </CabinetSection>
                </div>
              ) : null}

              {!isEarlyStage ? (
                <CabinetSection title={t('investmentCommittee.summary.voting', 'Голосование')}>
                  {votingMatrixNode}
                </CabinetSection>
              ) : null}
            </>
          )}
        </FullWidthStack>
      ) : null}

      <FullWidthStack>
        <CabinetSection title={t('investmentCommittee.comments.open', 'Комментарии')}>
          <MeetingCommentsPanel
            meeting={selectedMeeting}
            readOnly={readOnly}
            busy={busy}
            onSend={sendComment}
          />
        </CabinetSection>
      </FullWidthStack>
    </>
  );

  const meetingDetail = selectedMeeting && (
      <DetailStack key={selectedMeeting.id}>
        {primaryAction && !showCabinet ? (
          <ActionPanel $tone={primaryAction.tone}>
            <ActionIcon $tone={primaryAction.tone}>{primaryAction.icon}</ActionIcon>
            <ActionCopy>
              <ActionEyebrow>{primaryAction.eyebrow}{!isCommitteeMember && ` · ${primaryAction.owner}`}</ActionEyebrow>
              <ActionTitle>{primaryAction.title}</ActionTitle>
              <Muted>{primaryAction.description}</Muted>
            </ActionCopy>
            {primaryAction.cta ? (
              primaryAction.protocolUrl ? (
                <Button
                  as="a"
                  href={primaryAction.protocolUrl}
                  target="_blank"
                  rel="noreferrer"
                  $variant="primary"
                  onClick={(e: { preventDefault: () => void }) => { e.preventDefault(); previewDocument(primaryAction.protocolUrl!); }}
                >
                  <FileText />
                  {primaryAction.cta}
                </Button>
              ) : (
                <Button type="button" $variant={primaryAction.tone === 'red' ? 'danger' : 'primary'} onClick={openActionTab}>
                  {primaryAction.cta}
                  <ChevronRight />
                </Button>
              )
            ) : null}
          </ActionPanel>
        ) : null}

        {readOnly && (
          <InfoBanner $tone={stage === 'completed' ? 'green' : 'red'}>
            {stage === 'completed' ? <CheckCircle2 /> : <Ban />}
            <span>
              {stage === 'completed'
                ? t('investmentCommittee.readOnlyCompleted')
                : t('investmentCommittee.readOnlyCancelled', { reason: selectedMeeting.cancelReason || '' })}
            </span>
          </InfoBanner>
        )}

        {activeMeetingTab === 'process' && showCabinet && meetingCabinet}

        {activeMeetingTab === 'process' && !showCabinet && (
          <MainColumn>
            {!isEarlyStage && (
              <DotsBar style={{ gridTemplateColumns: `repeat(${Math.max(1, wizardSteps.length)}, 1fr)` }}>
                {wizardSteps.map((step, index) => {
                  const state = wizardStepState(index);
                  return (
                    <DotCell
                      key={step.key}
                      type="button"
                      $state={state}
                      disabled={state === 'upcoming'}
                      aria-current={index === activeStepIndex ? 'step' : undefined}
                      title={state === 'upcoming'
                        ? (step.lockedHint || step.owner)
                        : (step.summary ? `${step.owner} · ${step.summary}` : step.owner)}
                      onClick={() => setViewedStepKey(state === 'current' ? null : step.key)}
                    >
                      <DotCircle $state={state} $viewed={index === activeStepIndex} />
                      <DotLabel $state={state}>{step.title}</DotLabel>
                    </DotCell>
                  );
                })}
              </DotsBar>
            )}

            {activeStep ? (
              <WorkZone
                id={activeStepState === 'current' ? 'current-step' : `wizard-step-${activeStep.key}`}
                $current={activeStepState === 'current'}
              >
                <WorkZoneHead>
                  <StepDot $state={activeStepState}>
                    {activeStepState === 'done' ? '✓' : activeStepIndex + 1}
                  </StepDot>
                  <StepCopy>
                    <StepTitle>{activeStep.title}</StepTitle>
                    <StepMeta>
                      {activeStep.summary ? `${activeStep.owner} · ${activeStep.summary}` : activeStep.owner}
                    </StepMeta>
                  </StepCopy>
                  {activeStepState === 'done' ? (
                    <>
                      <Badge $tone="green">{t('investmentCommittee.process.stepDone', 'Пройден')}</Badge>
                      {wizardCurrentIndex >= 0 && wizardCurrentIndex < wizardSteps.length ? (
                        <CompactButton type="button" onClick={() => setViewedStepKey(null)}>
                          {t('investmentCommittee.process.backToCurrent', 'К текущему шагу')}
                        </CompactButton>
                      ) : null}
                    </>
                  ) : activeStepState === 'current' && activeStep.headerAction ? (
                    activeStep.headerAction
                  ) : null}
                </WorkZoneHead>
                {activeStep.content}
              </WorkZone>
            ) : null}

            {(selectedMeeting.returns?.length || 0) > 0 && !isCommitteeMember ? (
              <ReturnsTimeline meeting={selectedMeeting} />
            ) : null}
          </MainColumn>
        )}

        {activeMeetingTab === 'projects' && (
          <MainColumn>
            <div>
              <Button type="button" onClick={() => setActiveMeetingTab('process')}>
                <ArrowLeft />
                {t('investmentCommittee.command.tabProcess', 'Процесс')}
              </Button>
            </div>
            <DataRoomPanel
              meeting={selectedMeeting}
              startups={startups}
              focus={dataRoomFocus}
              onOpenProject={isStaff
                ? (startupId) => navigate(`/committee/sessions/${selectedMeeting.id}/projects/${startupId}`)
                : undefined}
            />
          </MainColumn>
        )}
      </DetailStack>
  );

  if (loading && meetings.length === 0 && !selectedMeeting) {
    return <InvestmentCommitteeSkeleton />;
  }

  return (
    <Page $capped>
      <CommandHeader $flush={Boolean(selectedMeeting && showCabinet)}>
        {selectedMeeting ? (
          <BackLink type="button" onClick={() => navigate('/committee/sessions')}>
            <ArrowLeft size={14} />
            {t('investmentCommittee.backToList')}
          </BackLink>
        ) : null}
        {!(selectedMeeting && showCabinet) && (
          <CommandTitleBlock>
            <HeaderKicker>
              <CircleDot />
              {t('investmentCommittee.command.workspace', 'Рабочий стол ИК')}
            </HeaderKicker>
            <Title>{t('investmentCommittee.title')}</Title>
            {selectedMeeting && (
              <HeaderMeta>
                <Badge $tone={stageTone(stage)}>{t(`investmentCommittee.stages.${stage}`)}</Badge>
                <Muted as="span">{selectedMeeting.title}</Muted>
                {selectedMeeting.meetingDate ? (
                  <Muted as="span">· {selectedMeeting.meetingDate}</Muted>
                ) : null}
                {selectedMeeting.protocolNumber ? (
                  <Muted as="span">· № {selectedMeeting.protocolNumber}</Muted>
                ) : null}
                {readOnly && <Lock size={14} />}
              </HeaderMeta>
            )}
          </CommandTitleBlock>
        )}
        <CommandActions>
          {selectedMeeting ? (
            <>
              {isStaff && !readOnly && stage !== 'signing' && (
                <Button
                  type="button"
                  onClick={openEditMeeting}
                  title={t('investmentCommittee.command.edit', 'Редактировать')}
                  aria-label={t('investmentCommittee.command.edit', 'Редактировать')}
                  style={{ width: 40, padding: 0 }}
                >
                  <Pencil />
                </Button>
              )}
              {isTestEnvHost() && (
                <Button
                  type="button"
                  $variant={prodView ? 'primary' : undefined}
                  aria-pressed={prodView}
                  onClick={toggleProdView}
                  title={t('investmentCommittee.prodView.hint', 'Только на тест-стенде: предпросмотр прод-вида (без тест-кнопок)')}
                  aria-label={prodView
                    ? t('investmentCommittee.prodView.toTest', 'Тест-режим')
                    : t('investmentCommittee.prodView.toProd', 'Прод-вид')}
                  style={{ width: 40, padding: 0 }}
                >
                  {prodView ? <FlaskConical /> : <Eye />}
                </Button>
              )}
              {isStaff && !readOnly && stage !== 'signing' && (
                <Button
                  type="button"
                  $variant="danger"
                  disabled={busy}
                  onClick={() => { setCancelReason(''); setCancelTargetId(selectedMeeting.id); }}
                  title={t('investmentCommittee.cancel.action')}
                  aria-label={t('investmentCommittee.cancel.action')}
                  style={{ width: 40, padding: 0 }}
                >
                  <Ban />
                </Button>
              )}
            </>
          ) : null}
        </CommandActions>
      </CommandHeader>

      {error && <InfoBanner $tone="red"><Ban /><span>{error}</span></InfoBanner>}

      {selectedMeeting ? (
        meetingDetail
      ) : (
        <MeetingsListPanel
          meetings={meetings}
          selectedId={meetingId}
          canCreate={isStaff}
          creating={busy}
          onSelect={(id) => navigate(`/committee/sessions/${id}`)}
          onCreate={createMeeting}
          onDelete={isStaff ? (id) => setDeleteId(id) : undefined}
          onArchive={isStaff ? (id) => { setCancelReason(''); setCancelTargetId(id); } : undefined}
          onBulkArchive={isStaff ? (ids) => setBulkConfirm({ type: 'archive', ids }) : undefined}
          onBulkDelete={isStaff ? (ids) => setBulkConfirm({ type: 'delete', ids }) : undefined}
          attentionIds={awaitingMyVoteIds}
        />
      )}

      <CommitteeCreateDialog
        open={committeeDialogOpen}
        members={committeeOptions}
        selectedIds={selectedCommitteeIds}
        selectedChairId={selectedChairId}
        busy={busy}
        error={committeeDialogError || actionError}
        title={newMeetingTitle}
        date={newMeetingDate}
        onTitleChange={setNewMeetingTitle}
        onDateChange={setNewMeetingDate}
        onToggle={toggleCommitteeSelection}
        onChairChange={setSelectedChairId}
        onConfirm={confirmCreateMeeting}
        onClose={() => {
          if (busy) return;
          setCommitteeDialogOpen(false);
          setCommitteeDialogError('');
        }}
      />

      <Modal
        isOpen={editOpen}
        onClose={() => { if (!busy) setEditOpen(false); }}
        title={t('investmentCommittee.command.editTitle', 'Редактировать заседание')}
        width="520px"
        disableBackdropClose={busy}
      >
        <DialogStack>
          <Field>
            <FieldLabel>{t('investmentCommittee.create.meetingTitleLabel', 'Название заседания')}</FieldLabel>
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} disabled={busy} maxLength={140} />
          </Field>
          <Field>
            <FieldLabel>{t('investmentCommittee.create.meetingDateLabel', 'Дата заседания')}</FieldLabel>
            <Input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} disabled={busy} />
          </Field>
          {actionError ? <Muted style={{ color: '#ef4444' }}>{actionError}</Muted> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Button type="button" onClick={() => setEditOpen(false)} disabled={busy}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button type="button" $variant="primary" onClick={saveEditMeeting} disabled={busy || !editTitle.trim()}>
              <Save />
              {t('common.save', 'Сохранить')}
            </Button>
          </div>
        </DialogStack>
      </Modal>

      <ConfirmDialog
        open={cancelTargetId !== null}
        title={t('investmentCommittee.cancel.confirmTitle', 'Архивировать комитет?')}
        message={t('investmentCommittee.cancel.confirmMessage', 'Комитет переместится в архив, откуда его можно удалить навсегда.')}
        confirmLabel={t('investmentCommittee.cancel.action')}
        danger
        busy={busy}
        reason={{ value: cancelReason, onChange: setCancelReason, placeholder: t('investmentCommittee.cancel.promptComment') }}
        onConfirm={confirmCancelMeeting}
        onClose={() => setCancelTargetId(null)}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title={t('investmentCommittee.archive.deleteTitle', 'Удалить заседание навсегда?')}
        message={t('investmentCommittee.archive.deleteMessage', 'Действие необратимо — заседание будет удалено полностью.')}
        confirmLabel={t('investmentCommittee.archive.deleteAction', 'Удалить навсегда')}
        danger
        busy={busy}
        onConfirm={doDeleteMeeting}
        onClose={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={bulkConfirm !== null}
        title={bulkConfirm?.type === 'delete'
          ? t('investmentCommittee.bulk.deleteTitle', 'Удалить выбранные заседания?')
          : t('investmentCommittee.bulk.archiveTitle', 'Архивировать выбранные заседания?')}
        message={bulkConfirm?.type === 'delete'
          ? t('investmentCommittee.bulk.deleteMessage', 'Действие необратимо — {{count}} заседаний будут удалены полностью.', { count: bulkConfirm?.ids.length || 0 })
          : t('investmentCommittee.bulk.archiveMessage', '{{count}} заседаний переместятся в архив, откуда их можно удалить навсегда.', { count: bulkConfirm?.ids.length || 0 })}
        confirmLabel={bulkConfirm?.type === 'delete'
          ? t('investmentCommittee.archive.deleteAction', 'Удалить навсегда')
          : t('investmentCommittee.cancel.action', 'Архивировать')}
        danger
        busy={busy}
        onConfirm={confirmBulk}
        onClose={() => setBulkConfirm(null)}
      />

      <ConfirmDialog
        open={missingCommitteeOpen}
        title={t('investmentCommittee.noCommitteeMembers.title', 'Нет аккаунта члена Инвесткомитета')}
        message={t(
          'investmentCommittee.noCommitteeMembers.message',
          'Создайте хотя бы один активный аккаунт с ролью «Член комитета». После этого можно создавать заседания Инвесткомитета.'
        )}
        confirmLabel={t('investmentCommittee.noCommitteeMembers.openSettings', 'Открыть настройки')}
        cancelLabel={t('common.close', 'Закрыть')}
        onConfirm={() => {
          setMissingCommitteeOpen(false);
          navigate('/settings');
        }}
        onClose={() => setMissingCommitteeOpen(false)}
      />

      {dataRoomBlockersDialog ? (
        <DataRoomBlockersDialog
          blockers={dataRoomBlockersDialog.blockers}
          busy={busy}
          error={dataRoomBlockersError}
          canEditLink={canEditStartupDataRoomLink}
          onSaveLink={saveDataRoomBlockerLink}
          onSave={saveDataRoomBlockerReasons}
          onDone={finishDataRoomBlockers}
          onClose={() => {
            if (busy) return;
            setDataRoomBlockersDialog(null);
            setDataRoomBlockersError('');
          }}
        />
      ) : null}

      {shortlistAcceptedToast ? (
        <TopToast
          tone="success"
          title={t('investmentCommittee.shortlistSign.acceptedTitle', 'Шортлист принят')}
          message={t('investmentCommittee.shortlistSign.acceptedMessage', 'Подписанный шортлист загружен — заседание открыто участникам ИК для голосования.')}
          autoHideMs={3000}
          onClose={() => setShortlistAcceptedToast(false)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message}
        confirmLabel={pendingConfirm?.confirmLabel || t('common.confirm', 'Подтвердить')}
        busy={busy}
        onConfirm={() => {
          const action = pendingConfirm;
          setPendingConfirm(null);
          void action?.run();
        }}
        onClose={() => setPendingConfirm(null)}
      />
    </Page>
  );
}

function CommitteeCreateDialog({
  open,
  members,
  selectedIds,
  selectedChairId,
  busy,
  error,
  title,
  date,
  onTitleChange,
  onDateChange,
  onToggle,
  onChairChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  members: Manager[];
  selectedIds: string[];
  selectedChairId: string;
  busy: boolean;
  error?: string;
  title: string;
  date: string;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onToggle: (memberId: string) => void;
  onChairChange: (memberId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const selectedCount = selectedIds.length;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('investmentCommittee.create.committeeTitle', 'Новое заседание Инвесткомитета')}
      width="620px"
      disableBackdropClose={busy}
    >
      <DialogStack>
        <Field>
          <FieldLabel>{t('investmentCommittee.create.meetingTitleLabel', 'Название заседания')}</FieldLabel>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('investmentCommittee.create.meetingTitlePlaceholder', 'Напр. Инвесткомитет Июль 2026 (по умолчанию — с датой)')}
            disabled={busy}
            maxLength={140}
          />
        </Field>
        <Field>
          <FieldLabel>{t('investmentCommittee.create.meetingDateLabel', 'Дата заседания')}</FieldLabel>
          <Input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            disabled={busy}
          />
        </Field>

        <InfoBanner $tone="blue">
          <Users />
          <span>
            {t(
              'investmentCommittee.create.committeeHint',
              'Выберите участников и назначьте одного председателя. Участники голосуют первыми, председатель фиксирует итог последним.'
            )}
          </span>
        </InfoBanner>

        <CommitteeMemberList>
          {members.map((member) => {
            const checked = selectedIds.includes(member.id);
            const isChair = selectedChairId === member.id;
            const email = member.email || member.login || '';
            const at = email.lastIndexOf('@');
            return (
              <CommitteeMemberOption key={member.id} $checked={checked}>
                <NativeCheckbox
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(member.id)}
                  disabled={busy}
                />
                <CommitteeMemberCopy>
                  <strong>{member.name || member.login}</strong>
                  {at > 0 ? (
                    <MemberEmail title={email}>
                      <span className="local">{email.slice(0, at)}</span>
                      <span className="domain">{email.slice(at)}</span>
                    </MemberEmail>
                  ) : (
                    <MemberEmail title={email}><span className="local">{email}</span></MemberEmail>
                  )}
                </CommitteeMemberCopy>
                <MemberRoleActions>
                  <ChairSelectButton
                    type="button"
                    $active={isChair}
                    aria-pressed={isChair}
                    disabled={busy || !checked}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onChairChange(member.id);
                    }}
                  >
                    <Crown />
                    {isChair
                      ? t('investmentCommittee.create.chairSelected', 'Председатель')
                      : t('investmentCommittee.create.makeChair', 'Назначить председателем')}
                  </ChairSelectButton>
                  <Badge $tone={checked ? 'green' : 'amber'}>
                    {checked
                      ? t('investmentCommittee.create.included', 'Включён')
                      : t('investmentCommittee.create.excluded', 'Не включён')}
                  </Badge>
                </MemberRoleActions>
              </CommitteeMemberOption>
            );
          })}
        </CommitteeMemberList>

        {error ? (
          <InfoBanner $tone="red">
            <AlertTriangle />
            <span>{error}</span>
          </InfoBanner>
        ) : null}

        <DialogActions>
          <Button type="button" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" $variant="primary" disabled={busy || selectedCount < 1 || !selectedChairId} onClick={onConfirm}>
            {t('investmentCommittee.create.createWithMembers', 'Создать с составом')} ({selectedCount})
          </Button>
        </DialogActions>
      </DialogStack>
    </Modal>
  );
}

const ResolutionProjectStrip = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  /* В одну строку с кнопками решения: полоска растёт слева, кнопки — справа. */
  flex: 1 1 200px;
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: left;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.base},
    transform 140ms cubic-bezier(0.2, 0.8, 0.3, 1),
    box-shadow 140ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  /* плавное «нажатие» при клике */
  &:active {
    transform: scale(0.985);
    box-shadow: none;
  }
`;

const StripLogo = styled(CrmImage)`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  flex-shrink: 0;
`;

const StripLogoFallback = styled.span`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => `${theme.colors.accent.primary}18`};
  flex-shrink: 0;
`;

const StripCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StripName = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StripMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ResolutionCard = styled.div<{ $decision?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ $decision, theme }) => (
    $decision === 'selected'
      ? theme.colors.status.successBorder
      : $decision === 'rejected'
        ? theme.colors.status.dangerBorder
        : theme.colors.border.secondary
  )};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  transition: border-color ${({ theme }) => theme.transitions.base};
`;

const ResolutionHead = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  /* На узкой карточке кнопки решения переносятся под название */
  flex-wrap: wrap;
`;

const ResolutionContext = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const ResolutionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DecisionSegment = styled.div`
  margin-left: auto;
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing[1]};

  @media (max-width: 640px) {
    margin-left: 0;
    width: 100%;

    & > button { flex: 1; }
  }
`;

const DecisionSegmentButton = styled.button<{ $kind: 'approve' | 'reject'; $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 34px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  font-weight: 800;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  border: 1px solid ${({ $kind, $active, theme }) => (
    $active
      ? ($kind === 'approve' ? theme.colors.status.success : theme.colors.status.danger)
      : theme.colors.border.secondary
  )};
  background: ${({ $kind, $active, theme }) => (
    $active
      ? ($kind === 'approve' ? theme.colors.status.successBg : theme.colors.status.dangerBg)
      : 'transparent'
  )};
  color: ${({ $kind, $active, theme }) => (
    $active
      ? ($kind === 'approve' ? theme.colors.status.success : theme.colors.status.danger)
      : theme.colors.text.secondary
  )};

  &:hover:not(:disabled) {
    border-color: ${({ $kind, theme }) => ($kind === 'approve' ? theme.colors.status.success : theme.colors.status.danger)};
    color: ${({ $kind, theme }) => ($kind === 'approve' ? theme.colors.status.success : theme.colors.status.danger)};
  }

  &:disabled { opacity: 0.55; cursor: not-allowed; }

  svg { width: 16px; height: 16px; }
`;

const PanelHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const detailsIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const DetailsBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  animation: ${detailsIn} 240ms cubic-bezier(0.2, 0.8, 0.3, 1);
`;

const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  cursor: pointer;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; color: ${({ theme }) => theme.colors.accent.primary}; }
`;

const ResolutionTextArea = styled(TextArea)`
  min-height: 56px;
`;

const SaveRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

function normalizeConditionsText(value: string): string {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function ProjectResolutionCard({
  project,
  members,
  canEdit,
  busy,
  onSave,
  onOpenProject,
}: {
  project: InvestmentCommitteeMeetingProject;
  members: InvestmentCommitteeSnapshotMember[];
  canEdit: boolean;
  busy: boolean;
  onSave: (startupId: string, payload: { decision?: string; conditions?: string; resolution?: string }) => Promise<void>;
  onOpenProject?: (startupId: string) => void;
}) {
  const { t } = useTranslation();
  const startupId = project.startupId || '';
  const serverDraft = useMemo(() => ({
    decision: String(project.decision || 'pending'),
    conditions: (project.conditions || []).join('\n'),
    resolution: project.resolution || '',
  }), [project.decision, project.conditions, project.resolution]);
  const [draft, setDraft] = useState(serverDraft);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const textDirty = normalizeConditionsText(draft.conditions) !== serverDraft.conditions
    || draft.resolution.trim() !== serverDraft.resolution;
  const dirtyRef = useRef(textDirty);
  dirtyRef.current = textDirty;

  useEffect(() => {
    if (!dirtyRef.current) setDraft(serverDraft);
    else setDraft((current) => ({ ...current, decision: serverDraft.decision }));
  }, [serverDraft]);

  const name = projectName(project);
  const requestedAmount = projectTerm(project, ['requestedAmount']);
  const amount = projectTerm(project, ['investmentAmount', 'amount', 'ticketSize']);
  const decision = draft.decision;
  const conditionsCount = draft.conditions.split('\n').map((line) => line.trim()).filter(Boolean).length;

  const pickDecision = (value: 'selected' | 'rejected') => {
    const next = decision === value ? 'pending' : value;
    setDraft((current) => ({ ...current, decision: next }));
    void onSave(startupId, { decision: next });
  };

  const saveText = () => {
    const payload: { conditions?: string; resolution?: string } = {};
    if (draft.conditions !== serverDraft.conditions) payload.conditions = draft.conditions;
    if (draft.resolution !== serverDraft.resolution) payload.resolution = draft.resolution;
    if (!Object.keys(payload).length) return;
    void onSave(startupId, payload);
  };

  return (
    <ResolutionCard $decision={canEdit || decision !== 'pending' ? decision : 'pending'}>
      <ResolutionHead>
        <ResolutionProjectStrip
          type="button"
          onClick={onOpenProject && startupId ? () => onOpenProject(startupId) : undefined}
          title={t('investmentCommittee.protocol.openProject', 'Открыть карточку проекта')}
        >
          {project.logoUrl
            ? <StripLogo src={project.logoUrl} startupId={startupId} alt="" />
            : <StripLogoFallback>{name.slice(0, 1).toUpperCase()}</StripLogoFallback>}
          <StripCopy>
            <StripName>{name}</StripName>
            <StripMeta>
              {[
                project.industry,
                project.stage,
                requestedAmount
                  ? `${t('investmentCommittee.dataRoom.ask', 'Запрос')}: $${requestedAmount}`
                  : undefined,
                amount
                  ? `${t('investmentCommittee.shortlist.fundAmountShort', 'Фонд')}: $${amount}`
                  : undefined,
                project.assignedManagerName,
              ]
                .filter(Boolean).join(' · ') || '—'}
            </StripMeta>
          </StripCopy>
        </ResolutionProjectStrip>

        <ResolutionContext>
          {canEdit ? (
            <DecisionSegment>
              <DecisionSegmentButton
                type="button"
                $kind="approve"
                $active={decision === 'selected'}
                aria-pressed={decision === 'selected'}
                disabled={busy}
                onClick={() => pickDecision('selected')}
              >
                <ThumbsUp />
                {decisionMeta('selected', t).label}
              </DecisionSegmentButton>
              <DecisionSegmentButton
                type="button"
                $kind="reject"
                $active={decision === 'rejected'}
                aria-pressed={decision === 'rejected'}
                disabled={busy}
                onClick={() => pickDecision('rejected')}
              >
                <ThumbsDown />
                {decisionMeta('rejected', t).label}
              </DecisionSegmentButton>
            </DecisionSegment>
          ) : (
            <Badge $tone={decisionMeta(decision, t).tone}>{decisionMeta(decision, t).label}</Badge>
          )}
        </ResolutionContext>
      </ResolutionHead>

      <DetailsToggle
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        aria-expanded={detailsOpen}
      >
        <span>
          {t('investmentCommittee.protocol.detailsConditions', 'Условия ({{count}})', { count: conditionsCount })}
          {' · '}
          {draft.resolution.trim()
            ? t('investmentCommittee.protocol.detailsFilled', 'формулировка заполнена')
            : t('investmentCommittee.protocol.detailsEmpty', 'формулировка не заполнена')}
        </span>
        <StepChevron $open={detailsOpen} />
      </DetailsToggle>

      {detailsOpen ? (
        canEdit ? (
          <DetailsBody>
            <Field>
              <FieldLabel>{t('investmentCommittee.protocol.conditions', 'Условия')}</FieldLabel>
              <ResolutionTextArea
                placeholder={t('investmentCommittee.protocol.conditionsPlaceholder', 'Каждое условие с новой строки')}
                value={draft.conditions}
                onChange={(event) => setDraft((current) => ({ ...current, conditions: event.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>{t('investmentCommittee.protocol.resolution', 'Заключение-формулировка')}</FieldLabel>
              <ResolutionTextArea
                placeholder={t('investmentCommittee.protocol.resolutionPlaceholder', 'Формулировка решения по проекту для протокола')}
                value={draft.resolution}
                onChange={(event) => setDraft((current) => ({ ...current, resolution: event.target.value }))}
              />
            </Field>
            <SaveRow>
              <Muted style={{ fontSize: 12 }}>
                {textDirty
                  ? t('investmentCommittee.protocol.unsavedHint', 'Есть несохранённые изменения.')
                  : t('investmentCommittee.protocol.savedHint', 'Все изменения сохранены.')}
              </Muted>
              <Button type="button" $variant="primary" disabled={busy || !textDirty} onClick={saveText}>
                <Save />
                {t('investmentCommittee.protocol.saveResolution', 'Сохранить')}
              </Button>
            </SaveRow>
          </DetailsBody>
        ) : (
          <DetailsBody>
            {(project.conditions || []).length ? (
              <MetricHint as="div">
                <strong>{t('investmentCommittee.protocol.conditions', 'Условия')}:</strong>
                <div style={{ whiteSpace: 'pre-wrap' }}>{(project.conditions || []).join('\n')}</div>
              </MetricHint>
            ) : null}
            {project.resolution ? (
              <MetricHint as="div">
                <strong>{t('investmentCommittee.protocol.resolution', 'Заключение-формулировка')}:</strong>
                <div style={{ whiteSpace: 'pre-wrap' }}>{project.resolution}</div>
              </MetricHint>
            ) : (
              <Muted style={{ fontSize: 12 }}>{t('investmentCommittee.protocol.noResolution', 'Формулировка по проекту пока не внесена.')}</Muted>
            )}
          </DetailsBody>
        )
      ) : null}
    </ResolutionCard>
  );
}

function ProjectResolutionPanel({
  meeting,
  canEdit,
  busy,
  onSave,
  onOpenProject,
}: {
  meeting: InvestmentCommitteeMeeting;
  canEdit: boolean;
  busy: boolean;
  onSave: (startupId: string, payload: { decision?: string; conditions?: string; resolution?: string }) => Promise<void>;
  onOpenProject?: (startupId: string) => void;
}) {
  const { t } = useTranslation();
  const projects = meeting.protocol?.presentedProjects || [];
  const members = meeting.committee?.members || [];
  const decidedCount = projects.filter((project) => project.decision === 'selected' || project.decision === 'rejected').length;

  if (!projects.length) return null;

  return (
    <RailPanel as="section">
      <PanelHeadRow>
        <RailTitle style={{ margin: 0 }}>
          <ClipboardCheck />
          {t('investmentCommittee.protocol.projectResolutionsTitle', 'Решения и условия по проектам')}
        </RailTitle>
        <Badge $tone={decidedCount >= projects.length ? 'green' : 'amber'}>
          {t('investmentCommittee.protocol.decisionsProgress', 'Решения приняты: {{done}} из {{total}}', { done: decidedCount, total: projects.length })}
        </Badge>
      </PanelHeadRow>
      <ResolutionGrid>
        {projects.map((project) => (
          <ProjectResolutionCard
            key={project.startupId || projectName(project)}
            project={project}
            members={members}
            canEdit={canEdit}
            busy={busy}
            onSave={onSave}
            onOpenProject={onOpenProject}
          />
        ))}
      </ResolutionGrid>
    </RailPanel>
  );
}

function CommitteeUnderDevelopment() {
  const { t } = useTranslation();

  return (
    <Page>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '55vh',
          gap: '14px',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Construction size={36} color="#10b981" />
        </div>
        <Title style={{ margin: 0 }}>{t('investmentCommittee.underDevelopment.title')}</Title>
        <Muted style={{ maxWidth: '460px', margin: 0 }}>
          {t('investmentCommittee.underDevelopment.description')}
        </Muted>
      </div>
    </Page>
  );
}

export default function InvestmentCommittee() {
  if (typeof window !== 'undefined' && isCommitteeUnderDevelopment(window.location.hostname)) {
    return <CommitteeUnderDevelopment />;
  }
  return <InvestmentCommitteeWorkspace />;
}
