import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Briefcase,
  PieChart,
  Handshake,
  ChevronLeft,
  MessageCircle,
  Lock,
  ScrollText,
  CheckCircle2,
  CircleDot,
  Vote,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserProfileBadge } from '../UserProfileBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { useChatStartups } from '../../../hooks/useChatStartups';
import { canUseChats, isChatRole } from '../../../utils/chatAccess';
import { investmentCommitteeApi, type InvestmentCommittee } from '../../../services/api';
import { committeeStage, stageIndex } from '../../../pages/InvestmentCommittee/components/shared';
import { IC_MEETINGS_UPDATED_EVENT } from '../../../pages/InvestmentCommittee/awaitingActions';
import logo from '../../../assets/logo.png';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileOpen?: boolean;
  closeMobileMenu?: () => void;
}

const COLLAPSED_WIDTH = '72px';
const EXPANDED_WIDTH = '260px';

function AIAssistantIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M8.4 15.8h7.2c1.5 0 2.7-1.2 2.7-2.7V9.7c0-1.5-1.2-2.7-2.7-2.7H8.4C6.9 7 5.7 8.2 5.7 9.7v3.4c0 1.5 1.2 2.7 2.7 2.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 18.6h6M12 7V4.5M8.2 4.5h7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.4 11.4h.1M14.5 11.4h.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M10.2 13.4c.5.4 1.1.6 1.8.6s1.3-.2 1.8-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.1 11.2H3M21 11.2h-1.1M5.8 8.5 4.6 7.3M18.2 8.5l1.2-1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SidebarContainer = styled.aside<{ $isCollapsed: boolean; $isMobileOpen: boolean }>`
  width: ${({ $isCollapsed }) => ($isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)};
  height: 100vh;
  background: ${({ theme }) => theme.colors.bg.navbar};
  backdrop-filter: blur(10px);
  border-right: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 768px) {
    width: ${EXPANDED_WIDTH};
    transform: translateX(${({ $isMobileOpen }) => ($isMobileOpen ? '0' : '-100%')});
    box-shadow: ${({ $isMobileOpen, theme }) => ($isMobileOpen ? theme.shadows.xl : 'none')};
  }
`;

const LogoContainer = styled.div<{ $isCollapsed: boolean }>`
  padding: ${({ theme }) => theme.spacing[6]};
  padding-left: ${({ $isCollapsed, theme }) => ($isCollapsed ? '0' : theme.spacing[6])};
  padding-right: ${({ $isCollapsed, theme }) => ($isCollapsed ? '0' : theme.spacing[6])};
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) => ($isCollapsed ? 'center' : 'flex-start')};
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  img {
    height: 30px;
    object-fit: contain;
    filter: ${({ theme }) => (theme.mode === 'light' ? 'brightness(0) saturate(100%)' : 'none')};
    opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
    width: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 'auto')};
    transform: ${({ $isCollapsed }) => ($isCollapsed ? 'translateX(10px)' : 'translateX(0)')};
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }
`;

const ToggleButton = styled.button<{ $isCollapsed: boolean }>`
  position: ${({ $isCollapsed }) => ($isCollapsed ? 'static' : 'absolute')};
  right: ${({ $isCollapsed }) => ($isCollapsed ? 'auto' : '20px')};
  width: ${({ $isCollapsed }) => ($isCollapsed ? '100%' : '28px')};
  height: ${({ $isCollapsed }) => ($isCollapsed ? '50px' : '28px')};
  background: ${({ $isCollapsed, theme }) => ($isCollapsed ? 'transparent' : theme.colors.bg.secondary)};
  border: ${({ $isCollapsed, theme }) => ($isCollapsed ? 'none' : `1px solid ${theme.colors.border.primary}`)};
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '6px')};

  @media (max-width: 768px) {
    display: none;
  }

  &:hover {
    background: ${({ $isCollapsed, theme }) => ($isCollapsed ? 'transparent' : theme.colors.bg.tertiary)};
    border-color: ${({ $isCollapsed, theme }) => ($isCollapsed ? 'transparent' : theme.colors.accent.primary)};

    svg {
      color: ${({ theme }) => theme.colors.accent.primary};
    }
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.text.muted};
    transform: ${({ $isCollapsed }) => ($isCollapsed ? 'rotate(180deg)' : 'rotate(0)')};
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;
  }
`;

const Nav = styled.nav<{ $isCollapsed: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
  overflow-y: ${({ $isCollapsed }) => ($isCollapsed ? 'hidden' : 'auto')};
  overflow-x: hidden;

  @media (max-width: 768px) {
    overflow-y: auto;
  }
`;

const NavItem = styled(NavLink) <{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '20px')};
  padding-right: ${({ $isCollapsed }) => ($isCollapsed ? '0' : undefined)};
  color: ${({ theme }) => theme.colors.text.muted};
  text-decoration: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: ${({ theme }) => theme.radius.lg};
  justify-content: ${({ $isCollapsed }) => ($isCollapsed ? 'center' : 'flex-start')};
  width: ${({ $isCollapsed }) => ($isCollapsed ? '100%' : 'calc(100% - 24px)')};
  margin: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '0 12px')};
  height: 50px;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  &.active {
    color: ${({ theme }) => theme.colors.accent.primary};
    background: transparent;
    font-weight: 600;
    box-shadow: none;
    
    &:hover {
       background: ${({ theme }) => theme.colors.bg.secondary};
    }
  }

  svg {
    width: 20px;
    height: 20px;
    min-width: 20px;
  }

  span {
    display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'block')};
    opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
    width: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 'auto')};
    overflow: hidden;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: ${({ $isCollapsed }) => ($isCollapsed ? 'translateX(10px)' : 'translateX(0)')};
  }
`;

const DisabledNavItem = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '20px')};
  padding-right: ${({ $isCollapsed }) => ($isCollapsed ? '0' : undefined)};
  color: ${({ theme }) => theme.colors.text.muted};
  text-decoration: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  border-radius: ${({ theme }) => theme.radius.lg};
  justify-content: ${({ $isCollapsed }) => ($isCollapsed ? 'center' : 'flex-start')};
  width: ${({ $isCollapsed }) => ($isCollapsed ? '100%' : 'calc(100% - 24px)')};
  margin: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '0 12px')};
  height: 50px;
  cursor: not-allowed;
  opacity: 0.48;
  position: relative;
  user-select: none;

  svg {
    width: 20px;
    height: 20px;
    min-width: 20px;
  }

  span {
    display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'block')};
    opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
    width: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 'auto')};
    overflow: hidden;
    white-space: nowrap;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: ${({ $isCollapsed }) => ($isCollapsed ? 'translateX(10px)' : 'translateX(0)')};
  }
`;

const NavLockIcon = styled(Lock)<{ $isCollapsed: boolean }>`
  margin-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : 'auto')};
  width: ${({ $isCollapsed }) => ($isCollapsed ? '12px' : '16px')};
  height: ${({ $isCollapsed }) => ($isCollapsed ? '12px' : '16px')};
  min-width: ${({ $isCollapsed }) => ($isCollapsed ? '12px' : '16px')};
  position: ${({ $isCollapsed }) => ($isCollapsed ? 'absolute' : 'static')};
  top: ${({ $isCollapsed }) => ($isCollapsed ? '9px' : 'auto')};
  right: ${({ $isCollapsed }) => ($isCollapsed ? '14px' : 'auto')};
`;

const NavBadge = styled.span<{ $isCollapsed: boolean }>`
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  font-size: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '11px')};
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: ${({ $isCollapsed }) => ($isCollapsed ? '8px' : '20px')};
  min-width: ${({ $isCollapsed }) => ($isCollapsed ? '8px' : '20px')};
  height: ${({ $isCollapsed }) => ($isCollapsed ? '8px' : '20px')};
  /* No horizontal padding for single-digit so the circle is symmetrical;
   * multi-digit grows the box via min-width overflow without shifting. */
  padding: 0 ${({ $isCollapsed }) => ($isCollapsed ? '0' : '4px')};
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* Expanded: sit immediately after the label with a small gap (no auto-push
   * to the far right). Collapsed: float as a dot on the icon's top-right. */
  margin-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '4px')};
  position: ${({ $isCollapsed }) => ($isCollapsed ? 'absolute' : 'static')};
  top: ${({ $isCollapsed }) => ($isCollapsed ? '8px' : 'auto')};
  right: ${({ $isCollapsed }) => ($isCollapsed ? '14px' : 'auto')};
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
`;

const CommitteeActionCenter = styled.section<{ $isCollapsed: boolean }>`
  display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'flex')};
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin: ${({ theme }) => theme.spacing[3]} 16px 0;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const CommitteePanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const CommitteePanelTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
`;

const CommitteeCountBadge = styled.span<{ $active?: boolean }>`
  min-width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.full};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  color: ${({ $active }) => ($active ? '#10b981' : '#f59e0b')};
  background: ${({ $active }) => ($active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)')};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)')};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const CommitteeActionButton = styled.button<{ $urgent?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  min-width: 0;
  border: 1px solid ${({ $urgent, theme }) => ($urgent ? theme.colors.accent.primary : theme.colors.border.secondary)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $urgent, theme }) => ($urgent ? `${theme.colors.accent.primary}14` : theme.colors.bg.card)};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: left;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  &:disabled {
    cursor: default;
    opacity: 0.82;
  }

  &:disabled:hover {
    border-color: ${({ theme }) => theme.colors.border.secondary};
    background: ${({ theme }) => theme.colors.bg.card};
  }

  svg {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    margin-top: 1px;
    color: ${({ $urgent, theme }) => ($urgent ? theme.colors.accent.primary : theme.colors.text.tertiary)};
  }
`;

const CommitteeActionCopy = styled.span`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`;

const CommitteeActionLabel = styled.span`
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const CommitteeActionTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const CommitteeActionMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.35;
`;

const CommitteeTimeline = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CommitteeTimelineStep = styled.div<{ $state: 'done' | 'current' | 'upcoming' }>`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: ${({ $state, theme }) => (
    $state === 'current'
      ? theme.colors.accent.primary
      : $state === 'done'
        ? theme.colors.text.secondary
        : theme.colors.text.tertiary
  )};
  font-size: 11px;
  font-weight: 700;
  text-align: center;
`;

const CommitteeTimelineDot = styled.span<{ $state: 'done' | 'current' | 'upcoming' }>`
  width: 22px;
  height: 22px;
  border-radius: ${({ theme }) => theme.radius.full};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $state, theme }) => ($state === 'current' ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ $state, theme }) => (
    $state === 'done'
      ? 'rgba(16,185,129,0.16)'
      : $state === 'current'
        ? `${theme.colors.accent.primary}18`
        : theme.colors.bg.card
  )};

  svg {
    width: 13px;
    height: 13px;
  }
`;

const UserProfileWrapper = styled.div<{ $isCollapsed: boolean }>`
  padding: 16px;
  padding-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '20px')};
  padding-right: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '20px')};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  justify-content: ${({ $isCollapsed }) => ($isCollapsed ? 'center' : 'flex-start')};
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
`;

const BottomSection = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
`;

const COMMITTEE_TIMELINE_STEPS = [
  { key: 'shortlist' },
  { key: 'voting' },
  { key: 'protocol' },
  { key: 'signing' },
] as const;

type TranslationFn = ReturnType<typeof useTranslation>['t'];

function committeeDisplayTitle(committee: InvestmentCommittee | undefined, t: TranslationFn): string {
  if (!committee) return t('sidebar.committeeAction.emptyTitle', 'Очередь пуста');
  const rawTitle = committee.title || committee.id;
  const systemTitleMatch = /^Инвесткомитет (\d{4}-\d{2}-\d{2})$/.exec(rawTitle || '');
  if (systemTitleMatch) {
    return t('sidebar.committeeAction.meetingTitle', 'Инвесткомитет {{date}}', { date: systemTitleMatch[1] });
  }
  return rawTitle;
}

function pendingVotesText(count: number, language: string, t: TranslationFn): string {
  const category = new Intl.PluralRules(language || 'ru').select(count);
  return t(`sidebar.committeeAction.pendingVotes.${category}`, {
    count,
    defaultValue: t('sidebar.committeeAction.pendingVotes.other', '{{count}} проектов ждут ваш голос', { count }),
  });
}

function countPendingVotesForMember(committee: InvestmentCommittee, managerId?: string): number {
  if (!managerId || committeeStage(committee) !== 'voting') return 0;
  if (committee.committee?.selectionLocked === true && !isCommitteeParticipant(committee, managerId)) return 0;
  const projects = committee.protocol?.presentedProjects || [];
  return projects.filter((project) => !(project.memberVotes || []).some((vote) => (
    vote.memberId === managerId && (vote.vote === 'for' || vote.vote === 'against')
  ))).length;
}

function isCommitteeParticipant(committee: InvestmentCommittee, managerId?: string): boolean {
  if (!managerId) return false;
  return Boolean((committee.committee?.members || []).some((member) => member.managerId === managerId));
}

function activeCommittees(committees: InvestmentCommittee[]): InvestmentCommittee[] {
  return committees.filter((committee) => {
    const stage = committeeStage(committee);
    return stage !== 'completed' && stage !== 'cancelled';
  });
}

function committeeTimelineState(
  stage: ReturnType<typeof committeeStage>,
  step: typeof COMMITTEE_TIMELINE_STEPS[number]['key']
): 'done' | 'current' | 'upcoming' {
  if (stage === 'completed') return 'done';
  if (stage === 'cancelled') return 'upcoming';
  const index = stageIndex(stage);
  if (step === 'shortlist') return index > 1 ? 'done' : 'current';
  if (step === 'voting') return index > 2 ? 'done' : index === 2 ? 'current' : 'upcoming';
  if (step === 'protocol') return index > 5 ? 'done' : index >= 3 && index <= 5 ? 'current' : 'upcoming';
  if (step === 'signing') return index > 6 ? 'done' : index === 6 ? 'current' : 'upcoming';
  return 'upcoming';
}

export const Sidebar = ({ isCollapsed, toggleSidebar, isMobileOpen = false, closeMobileMenu }: SidebarProps) => {
  const { t, i18n } = useTranslation();
  const { manager, organization } = useAuth();
  const navigate = useNavigate();
  const chatsEnabled = canUseChats(manager, organization);
  const chatRole = isChatRole(manager);
  const isCommitteeMember = manager?.role === 'committee_member';
  const { totalUnread } = useChatStartups(30000, chatsEnabled);
  const [committees, setCommittees] = useState<InvestmentCommittee[]>([]);
  const [committeeLoading, setCommitteeLoading] = useState(false);

  useEffect(() => {
    if (!isCommitteeMember || !organization?.id) {
      setCommittees([]);
      setCommitteeLoading(false);
      return;
    }

    let cancelled = false;
    const loadCommittees = async () => {
      setCommitteeLoading(true);
      const response = await investmentCommitteeApi.getCommittees(organization.id);
      if (!cancelled) {
        setCommittees(response.success ? response.data || [] : []);
        setCommitteeLoading(false);
      }
    };

    loadCommittees();
    const handleMeetingsUpdated = () => { void loadCommittees(); };
    window.addEventListener(IC_MEETINGS_UPDATED_EVENT, handleMeetingsUpdated);
    const timer = window.setInterval(loadCommittees, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener(IC_MEETINGS_UPDATED_EVENT, handleMeetingsUpdated);
      window.clearInterval(timer);
    };
  }, [isCommitteeMember, organization?.id]);

  const committeeAction = useMemo(() => {
    const activeItems = activeCommittees(committees);
    const enriched = activeItems.map((committee) => ({
      committee,
      stage: committeeStage(committee),
      isParticipant: isCommitteeParticipant(committee, manager?.id),
      pendingVotes: countPendingVotesForMember(committee, manager?.id),
    }));
    const selected = enriched.find((item) => item.pendingVotes > 0)
      || enriched.find((item) => item.stage === 'voting' && item.isParticipant)
      || enriched.find((item) => item.stage === 'signing' && item.isParticipant)
      || enriched[0];
    const pendingVoteTotal = enriched.reduce((sum, item) => sum + item.pendingVotes, 0);
    return { selected, pendingVoteTotal, activeCount: activeItems.length };
  }, [committees, manager?.id]);

  const handleNavClick = () => {
    if (closeMobileMenu) {
      closeMobileMenu();
    }
  };

  const openCommitteeAction = (committeeId?: string) => {
    if (!committeeId) return;
    if (closeMobileMenu) closeMobileMenu();
    navigate(`/committee/meetings/${committeeId}`);
  };

  const selectedCommitteeStage = committeeAction.selected?.stage;
  const selectedIsParticipant = Boolean(committeeAction.selected?.isParticipant);
  const selectedCommitteeLocked = committeeAction.selected?.committee.committee?.selectionLocked === true;
  const selectedPendingVotes = committeeAction.selected?.pendingVotes || 0;
  const committeeActionLabel = selectedPendingVotes > 0
    ? t('sidebar.committeeAction.labels.needVote', 'Нужно проголосовать')
    : selectedCommitteeStage === 'voting' && !selectedIsParticipant && !selectedCommitteeLocked
      ? t('sidebar.committeeAction.labels.canVote', 'Можно проголосовать')
    : selectedCommitteeStage === 'voting' && !selectedIsParticipant
      ? t('sidebar.committeeAction.labels.readOnly', 'Только просмотр')
    : selectedCommitteeStage === 'voting'
      ? t('sidebar.committeeAction.labels.votingInProgress', 'Голосование идёт')
      : selectedCommitteeStage === 'signing'
        ? t('investmentCommittee.command.signingWaitingTitle', 'Ожидается итоговый протокол')
      : committeeAction.activeCount > 0
          ? t('sidebar.committeeAction.labels.nextStep', 'Следующий этап')
          : t('sidebar.committeeAction.labels.noTasks', 'Нет задач');
  const committeeActionMeta = selectedPendingVotes > 0
    ? pendingVotesText(selectedPendingVotes, i18n.language, t)
    : selectedCommitteeStage === 'voting' && !selectedIsParticipant && !selectedCommitteeLocked
      ? t('sidebar.committeeAction.meta.canJoin', 'Аккаунт добавится в состав при первом голосе')
    : selectedCommitteeStage === 'voting' && !selectedIsParticipant
      ? t('sidebar.committeeAction.meta.notIncluded', 'Этот аккаунт не в составе инвесткомитета')
    : selectedCommitteeStage === 'voting'
      ? t('sidebar.committeeAction.meta.voteSaved', 'Ваш голос сохранён, ждём остальных участников')
      : selectedCommitteeStage === 'signing'
        ? t('investmentCommittee.signing.memberHint', 'Итоговый подписанный протокол загрузит ответственный сотрудник фонда')
      : committeeAction.activeCount > 0
        ? t(`investmentCommittees.stages.${selectedCommitteeStage}`)
      : committeeLoading
            ? t('sidebar.committeeAction.meta.checking', 'Проверяем активные инвесткомитеты')
            : t('sidebar.committeeAction.meta.empty', 'Новые голосования появятся здесь');
  const committeeActionTitle = committeeDisplayTitle(committeeAction.selected?.committee, t);
  const CommitteeActionIcon = selectedPendingVotes > 0 || selectedCommitteeStage === 'voting'
    ? Vote
    : ScrollText;

  return (
    <SidebarContainer $isCollapsed={isCollapsed} $isMobileOpen={isMobileOpen}>
      <LogoContainer $isCollapsed={isCollapsed}>
        <img src={logo} alt="FundGate" />
        <ToggleButton onClick={toggleSidebar} $isCollapsed={isCollapsed} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          <ChevronLeft />
        </ToggleButton>
      </LogoContainer>

      <Nav $isCollapsed={isCollapsed}>
        {isCommitteeMember ? (
          <>
            <NavItem to="/portfolio/dashboard" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.portfolio') : ""} onClick={handleNavClick}>
              <PieChart />
              <span>{t('nav.portfolio')}</span>
            </NavItem>
            <NavItem to="/committee/sessions" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.investmentCommittee') : ""} onClick={handleNavClick}>
              <ScrollText />
              <span>{t('nav.investmentCommittee')}</span>
            </NavItem>
            <CommitteeActionCenter $isCollapsed={isCollapsed}>
              <CommitteePanelHeader>
                <CommitteePanelTitle>{t('sidebar.committeeAction.title', 'Мои действия')}</CommitteePanelTitle>
                <CommitteeCountBadge $active={committeeAction.pendingVoteTotal === 0}>
                  {committeeAction.pendingVoteTotal || '0'}
                </CommitteeCountBadge>
              </CommitteePanelHeader>

              <CommitteeActionButton
                type="button"
                $urgent={selectedPendingVotes > 0}
                disabled={!committeeAction.selected?.committee.id}
                onClick={() => openCommitteeAction(committeeAction.selected?.committee.id)}
              >
                <CommitteeActionIcon />
                <CommitteeActionCopy>
                  <CommitteeActionLabel>{committeeActionLabel}</CommitteeActionLabel>
                  <CommitteeActionTitle>
                    {committeeActionTitle}
                  </CommitteeActionTitle>
                  <CommitteeActionMeta>{committeeActionMeta}</CommitteeActionMeta>
                </CommitteeActionCopy>
              </CommitteeActionButton>

              {committeeAction.selected ? (
                <CommitteeTimeline>
                  {COMMITTEE_TIMELINE_STEPS.map((step) => {
                    const state = committeeTimelineState(committeeAction.selected.stage, step.key);
                    return (
                      <CommitteeTimelineStep key={step.key} $state={state}>
                        <CommitteeTimelineDot $state={state}>
                          {state === 'done' ? <CheckCircle2 /> : <CircleDot />}
                        </CommitteeTimelineDot>
                        {t(`sidebar.committeeAction.steps.${step.key}`)}
                      </CommitteeTimelineStep>
                    );
                  })}
                </CommitteeTimeline>
              ) : null}
            </CommitteeActionCenter>
          </>
        ) : (
        <>
        <NavItem to="/" end $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.home') : ""} onClick={handleNavClick}>
          <Home />
          <span>{t('nav.home')}</span>
        </NavItem>
        <NavItem to="/dashboard" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.dashboard') : ""} onClick={handleNavClick}>
          <LayoutDashboard />
          <span>{t('nav.dashboard')}</span>
        </NavItem>
        <NavItem to="/startups" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.startups') : ""} onClick={handleNavClick}>
          <Briefcase />
          <span>{t('nav.startups')}</span>
        </NavItem>
        <NavItem to="/portfolio/dashboard" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.portfolio') : ""} onClick={handleNavClick}>
          <PieChart />
          <span>{t('nav.portfolio')}</span>
        </NavItem>
        <NavItem to="/committee/sessions" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.investmentCommittee') : ""} onClick={handleNavClick}>
          <ScrollText />
          <span>{t('nav.investmentCommittee')}</span>
        </NavItem>
        {chatRole && (chatsEnabled ? (
          <NavItem to="/chats" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.chats') : ""} onClick={handleNavClick}>
            <MessageCircle />
            <span>{t('nav.chats')}</span>
            {totalUnread > 0 && <NavBadge $isCollapsed={isCollapsed}>{totalUnread > 99 ? '99+' : totalUnread}</NavBadge>}
          </NavItem>
        ) : (
          <DisabledNavItem
            $isCollapsed={isCollapsed}
            title={t('nav.chatsLocked')}
            aria-disabled="true"
          >
            <MessageCircle />
            <span>{t('nav.chats')}</span>
            <NavLockIcon $isCollapsed={isCollapsed} />
          </DisabledNavItem>
        ))}
        <NavItem to="/investor-applications" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.investorApplications') : ""} onClick={handleNavClick}>
          <Handshake />
          <span>{t('nav.investorApplications')}</span>
        </NavItem>
        <NavItem to="/ai-assistant" $isCollapsed={isCollapsed} title={isCollapsed ? t('nav.aiAssistant') : ""} onClick={handleNavClick}>
          <AIAssistantIcon />
          <span>{t('nav.aiAssistant')}</span>
        </NavItem>
        </>
        )}
      </Nav>

      <BottomSection>
        <UserProfileWrapper $isCollapsed={isCollapsed}>
          <UserProfileBadge isCollapsed={isCollapsed} />
        </UserProfileWrapper>
      </BottomSection>
    </SidebarContainer>
  );
};

export default Sidebar;
