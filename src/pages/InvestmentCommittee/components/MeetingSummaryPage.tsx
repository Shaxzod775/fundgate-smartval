import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Crown, Vote } from 'lucide-react';
import type {
  InvestmentCommitteeMeeting,
  InvestmentCommitteeMeetingStage,
  UserRole,
} from '../../../services/api';
import {
  Badge,
  Muted,
  STAGE_ORDER,
  formatAmount,
  meetingInvestmentTotal,
  stageOrderForViewerRole,
} from './shared';

export const CabinetGrid = styled.div<{ $fullWidth?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $fullWidth }) => ($fullWidth ? '1fr' : '2fr 1fr')};
  grid-template-areas: ${({ $fullWidth }) => ($fullWidth ? '"content"' : '"tabs ." "content sidebar"')};
  column-gap: ${({ theme }) => theme.spacing[6]};
  row-gap: 0;
  align-items: start;
  min-width: 0;

  /* Схлопнулись в одну колонку — работа идёт первой. Сайдбар стоял сверху с
     тех пор, когда в нём была карточка статуса; сейчас там состав ИК, и он
     отжимал список стартапов вниз. */
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-areas: ${({ $fullWidth }) => ($fullWidth ? '"content"' : '"tabs" "content" "sidebar"')};
    row-gap: ${({ theme }) => theme.spacing[5]};
  }
`;

export const CabinetTabsArea = styled.div`
  grid-area: tabs;
  min-width: 0;
`;

export const CabinetContentArea = styled.div`
  grid-area: content;
  min-width: 0;
`;

export const CabinetSidebar = styled.div`
  grid-area: sidebar;
  min-width: 0;
  position: sticky;
  top: 90px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  /* Карточка статуса + комментарии могут быть длинными — не выше вьюпорта,
     внутренний скролл, чтобы sticky не «убегал» за экран. */
  max-height: calc(100vh - 110px);
  overflow-y: auto;

  @media (max-width: 1024px) {
    position: static;
    top: auto;
    max-height: none;
    overflow: visible;
  }
`;

export const FullWidthStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  min-width: 0;
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  padding-bottom: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;

  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colors.accent.primary}; flex-shrink: 0; }

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes.lg};
    margin-bottom: ${({ theme }) => theme.spacing[2]};
  }
`;

const SectionTitleAction = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
`;

const Section = styled.section`
  min-width: 0;
`;


const TabsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active, theme }) => ($active ? theme.colors.accent.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  cursor: pointer;
  transition: color ${({ theme }) => theme.transitions.base};

  svg { width: 18px; height: 18px; color: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.text.tertiary)}; flex-shrink: 0; }

  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`;

export function SectionTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: T; icon: ReactNode; label: string; badge?: ReactNode }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <TabsRow role="tablist">
      {tabs.map((tab) => (
        <TabButton
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          $active={active === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon}
          {tab.label}
          {tab.badge}
        </TabButton>
      ))}
    </TabsRow>
  );
}

export function CabinetSection({
  icon,
  title,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Section>
      <SectionTitle>
        {icon || null}
        {title}
        {action ? <SectionTitleAction>{action}</SectionTitleAction> : null}
      </SectionTitle>
      {children}
    </Section>
  );
}

const HeaderCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
`;

const HeaderCopy = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const HeaderTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes.xl};
  }
`;

const HeaderMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const HeaderTitleInput = styled.input`
  width: 100%;
  margin: 0;
  padding: 2px 6px;
  margin-left: -6px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  line-height: 1.15;

  &:hover { border-color: ${({ theme }) => theme.colors.border.secondary}; }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.input};
  }

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes.xl};
  }
`;

const HeaderDateInput = styled.input`
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:hover { border-color: ${({ theme }) => theme.colors.border.secondary}; }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.input};
  }
`;

export function MeetingSummaryHeader({
  meeting,
  editable = false,
  draftTitle,
  draftMeetingDate,
  onTitleChange,
  onMeetingDateChange,
  votes,
}: {
  meeting: InvestmentCommitteeMeeting;
  editable?: boolean;
  draftTitle?: string;
  draftMeetingDate?: string;
  onTitleChange?: (value: string) => void;
  onMeetingDateChange?: (value: string) => void;
  votes?: { castCount: number; totalRequired: number };
}) {
  const { t } = useTranslation();
  const total = meetingInvestmentTotal(meeting);
  const projectCount = meeting.protocol?.presentedProjects?.length || 0;
  const memberCount = meeting.committee?.members?.length || 0;
  const canEdit = editable && Boolean(onTitleChange && onMeetingDateChange);
  const titleValue = canEdit ? (draftTitle ?? '') : (meeting.title || meeting.id);
  const meta = [
    canEdit ? '' : (meeting.meetingDate || ''),
    meeting.protocolNumber ? `№ ${meeting.protocolNumber}` : '',
    t('investmentCommittee.list.projects', { count: projectCount }),
    memberCount > 0
      ? `${t('investmentCommittee.summary.statMembers', 'Участники ИК')}: ${memberCount}`
      : '',
    votes && votes.totalRequired > 0
      ? `${t('investmentCommittee.summary.statVotes', 'Голоса')}: ${votes.castCount}/${votes.totalRequired}`
      : '',
    total > 0 ? formatAmount(total) : '',
  ].filter(Boolean).join(' · ');

  return (
    <HeaderCard>
      <HeaderCopy>
        {canEdit ? (
          <HeaderTitleInput
            value={titleValue}
            aria-label={t('investmentCommittee.shortlist.meetingTitle')}
            placeholder={t('investmentCommittee.shortlist.meetingTitle')}
            onChange={(event) => onTitleChange?.(event.target.value)}
          />
        ) : (
          <HeaderTitle>{titleValue}</HeaderTitle>
        )}
        <HeaderMetaRow>
          {canEdit ? (
            <HeaderDateInput
              type="date"
              value={draftMeetingDate ?? ''}
              aria-label={t('investmentCommittee.shortlist.meetingDate')}
              onChange={(event) => onMeetingDateChange?.(event.target.value)}
            />
          ) : null}
          {meta}
        </HeaderMetaRow>
      </HeaderCopy>
    </HeaderCard>
  );
}

type StepState = 'done' | 'current' | 'upcoming';

const TimelineScroll = styled.div`
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 2px;
`;

const Track = styled.ol`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(130px, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Step = styled.li<{ $state: StepState; $fillBefore: boolean; $fillAfter: boolean; $first: boolean; $last: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  text-align: center;
  min-width: 0;

  /* Соединительные отрезки слева/справа от точки; крайние половинки скрыты,
     чтобы линия не выходила за первую и последнюю стадию.
     top = (высота маркера − толщина линии) / 2, чтобы линия шла через центр. */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 8px;
    height: 3px;
  }

  &::before {
    left: 0;
    right: 50%;
    background: ${({ $fillBefore, theme }) => ($fillBefore ? theme.colors.accent.primary : theme.colors.border.secondary)};
    display: ${({ $first }) => ($first ? 'none' : 'block')};
  }

  &::after {
    left: 50%;
    right: 0;
    background: ${({ $fillAfter, theme }) => ($fillAfter ? theme.colors.accent.primary : theme.colors.border.secondary)};
    display: ${({ $last }) => ($last ? 'none' : 'block')};
  }
`;

const Marker = styled.span<{ $state: StepState }>`
  position: relative;
  z-index: 1;
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  border-radius: 50%;
  /* Точка лежит поверх соединительной линии, поэтому фон обязан быть solid:
     сквозь rgba-токены темы линия просвечивает насквозь. */
  background: ${({ $state, theme }) => (
    $state === 'upcoming' ? theme.colors.bg.dropdown : theme.colors.accent.primary
  )};
  border: ${({ $state, theme }) => (
    $state === 'upcoming' ? `2px solid ${theme.colors.border.secondary}` : 'none'
  )};
  box-shadow: ${({ $state, theme }) => (
    $state === 'current' ? `0 0 0 6px ${theme.colors.accent.primary}33` : 'none'
  )};
`;

const StepLabel = styled.span<{ $state: StepState }>`
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ $state }) => ($state === 'current' ? 700 : 500)};
  line-height: 1.3;
  color: ${({ $state, theme }) => (
    $state === 'upcoming' ? theme.colors.text.tertiary : theme.colors.text.primary
  )};
`;

function StageTimeline({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <TimelineScroll>
      <Track>
        {steps.map((label, index) => {
          const state: StepState = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
          return (
            <Step
              key={label}
              $state={state}
              $first={index === 0}
              $last={index === steps.length - 1}
              $fillBefore={index <= currentIndex}
              $fillAfter={index < currentIndex}
            >
              <Marker $state={state} />
              <StepLabel $state={state}>{label}</StepLabel>
            </Step>
          );
        })}
      </Track>
    </TimelineScroll>
  );
}

const StageStripCard = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  min-width: 0;
`;

const VotingBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.card};
`;

const VotingStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;

  svg { width: 18px; height: 18px; }
`;

const VotingCount = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.lg};
    font-weight: 800;
  }
`;

const VotingAction = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 36px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $primary }) => ($primary ? theme.colors.accent.primary : theme.colors.border.primary)};
  background: ${({ theme, $primary }) => ($primary ? theme.colors.accent.primary : theme.colors.bg.dropdown)};
  color: ${({ theme, $primary }) => ($primary ? '#fff' : theme.colors.text.primary)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }

  svg { width: 16px; height: 16px; }
`;

export interface StageStripVoting {
  castCount: number;
  totalRequired: number;
  canVote: boolean;
  hasVoted: boolean;
  canOpenVoting?: boolean;
  onVote: () => void;
}

export function StageStrip({
  stage,
  viewerRole,
  votingPhase,
  hasChair = false,
  voting,
}: {
  stage: InvestmentCommitteeMeetingStage;
  viewerRole?: UserRole;
  votingPhase?: 'members' | 'chair' | 'closed';
  hasChair?: boolean;
  voting?: StageStripVoting;
}) {
  const { t } = useTranslation();

  const sequential = viewerRole === 'committee_member' && hasChair;
  const steps = sequential
    ? [
      t('investmentCommittee.roleFlow.stepShortlist', 'Шортлист'),
      t('investmentCommittee.roleFlow.stepMembers', 'Голоса участников'),
      t('investmentCommittee.roleFlow.stepChair', 'Решение председателя'),
      t('investmentCommittee.roleFlow.stepProtocol', 'Итоговый протокол'),
    ]
    : stageOrderForViewerRole(viewerRole).map((st) => t(`investmentCommittee.stages.${st}`));
  const currentIndex = sequential
    ? (stage === 'draft' || stage === 'shortlist_signing'
      ? 0
      : stage === 'voting' ? (votingPhase === 'chair' ? 2 : 1) : 3)
    : (() => {
      const workflowIdx = STAGE_ORDER.indexOf(stage);
      if (workflowIdx === -1) return -1;
      return stageOrderForViewerRole(viewerRole)
        .findIndex((st) => STAGE_ORDER.indexOf(st) === workflowIdx);
    })();

  return (
    <StageStripCard>
      <StageTimeline steps={steps} currentIndex={currentIndex} />
      {voting ? (
        <VotingBar>
          <VotingStatus>
            {voting.hasVoted ? <CheckCircle2 /> : <Clock />}
            {voting.hasVoted
              ? t('investmentCommittee.summary.voteCounted', 'Ваш голос учтён')
              : voting.canVote
                ? t('investmentCommittee.summary.awaitingYourVote', 'Ожидает вашего голоса')
                : t('investmentCommittee.summary.awaitingVotes', 'Ожидает голосов участников')}
          </VotingStatus>
          <VotingCount>
            <strong>{voting.castCount}/{voting.totalRequired}</strong>
            {t('investmentCommittee.summary.votedOf', 'проголосовало')}
          </VotingCount>
          {voting.canOpenVoting ? (
            <VotingAction type="button" $primary={voting.canVote && !voting.hasVoted} onClick={voting.onVote}>
              <Vote />
              {voting.hasVoted
                ? t('investmentCommittee.summary.changeVote', 'Изменить голос')
                : voting.canVote
                  ? t('investmentCommittee.summary.voteNow', 'Проголосовать')
                  : t('investmentCommittee.summary.goToVoting', 'К голосованию')}
            </VotingAction>
          ) : null}
        </VotingBar>
      ) : null}
    </StageStripCard>
  );
}

const MemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const MemberCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const MemberBody = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MemberName = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MemberRole = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const MemberAvatar = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => `${theme.colors.accent.primary}1f`};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 800;
  text-transform: uppercase;
`;

const MemberVote = styled.span<{ $voted: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  color: ${({ theme, $voted }) => ($voted ? theme.colors.accent.primary : theme.colors.text.muted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;

  svg { width: 13px; height: 13px; }
`;

export function InvitedMembers({
  members,
  votedManagerIds,
  showVoteStatus = false,
}: {
  members: Array<{ managerId: string; name?: string; email?: string; isRemote?: boolean; committeeRole?: 'member' | 'chair' }>;
  votedManagerIds?: Set<string>;
  showVoteStatus?: boolean;
}) {
  const { t } = useTranslation();
  if (!members.length) {
    return <Muted>{t('investmentCommittee.summary.noMembers', 'Состав ИК ещё не зафиксирован.')}</Muted>;
  }
  return (
    <MemberGrid>
      {members.map((member) => {
        const label = member.name || member.email || member.managerId;
        return (
          <MemberCard key={member.managerId}>
            <MemberAvatar>{(label || '?').slice(0, 1)}</MemberAvatar>
            <MemberBody>
              <MemberName title={label}>{label}</MemberName>
              <MemberRole>
                {member.committeeRole === 'chair'
                  ? <Badge $tone="amber"><Crown />{t('investmentCommittee.summary.roleChair', 'Председатель ИК')}</Badge>
                  : t('investmentCommittee.summary.roleMember', 'Член ИК')}
                {member.isRemote ? <Badge $tone="blue">{t('investmentCommittee.remote.badge', 'Удалённо')}</Badge> : null}
              </MemberRole>
              {showVoteStatus && member.committeeRole !== 'chair' ? (
                <MemberVote $voted={Boolean(votedManagerIds?.has(member.managerId))}>
                  {votedManagerIds?.has(member.managerId) ? <CheckCircle2 /> : <Clock />}
                  {votedManagerIds?.has(member.managerId)
                    ? t('investmentCommittee.summary.memberVoted', 'Проголосовал')
                    : t('investmentCommittee.summary.memberPending', 'Ожидается голос')}
                </MemberVote>
              ) : null}
            </MemberBody>
          </MemberCard>
        );
      })}
    </MemberGrid>
  );
}
