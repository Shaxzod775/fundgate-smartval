import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  Lock,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Users,
  Vote,
} from 'lucide-react';
import type {
  InvestmentCommitteeMeeting,
  InvestmentCommitteeMeetingProject,
  InvestmentCommitteeSnapshotMember,
} from '../../../services/api';
import {
  chairDecisionProgress,
  committeeChair,
  committeeVotingMembers,
  committeeVotingPhase,
  projectVoteTally,
} from '../committeeRoles';
import { memberVoteProgress } from '../voteProgress';
import {
  Badge,
  Button,
  ErrorText,
  InfoBanner,
  Muted,
  TextArea,
  projectName,
  projectTerm,
} from './shared';

const Shell = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;
`;

const TaskCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  }
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  svg { width: 15px; height: 15px; color: ${({ theme }) => theme.colors.accent.primary}; }
`;

const TaskHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const TaskTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  line-height: 1.2;
`;

const ProgressTrack = styled.div`
  height: 4px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  overflow: hidden;
`;

const ProgressValue = styled.div<{ $percent: number }>`
  width: ${({ $percent }) => `${Math.max(0, Math.min(100, $percent))}%`};
  height: 100%;
  background: ${({ theme }) => theme.colors.accent.primary};
  transition: width ${({ theme }) => theme.transitions.base};
`;

const ProjectCard = styled.article`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: hidden;
`;

const ProjectHead = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  text-align: left;

  &:hover { background: ${({ theme }) => theme.colors.bg.tertiary}; }
`;

const ProjectAvatar = styled.span`
  width: 42px;
  height: 42px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => `${theme.colors.accent.primary}16`};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  font-weight: 900;
`;

const ProjectCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong { font-size: ${({ theme }) => theme.fontSizes.lg}; }
  small { color: ${({ theme }) => theme.colors.text.secondary}; }
`;

const FactsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Fact = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};

  @media (max-width: 720px) {
    & + & { border-left: 0; border-top: 1px solid ${({ theme }) => theme.colors.border.secondary}; }
  }

  span { color: ${({ theme }) => theme.colors.text.muted}; font-size: ${({ theme }) => theme.fontSizes.xs}; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  strong { color: ${({ theme }) => theme.colors.text.primary}; font-size: ${({ theme }) => theme.fontSizes.md}; }
`;

const ProjectBody = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Thesis = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.55;
`;

const VoteButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const VoteChoice = styled.button<{ $kind: 'for' | 'against'; $active: boolean }>`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $kind, $active, theme }) => (
    $kind === 'for'
      ? ($active ? theme.colors.status.success : theme.colors.status.successBorder)
      : ($active ? theme.colors.status.danger : theme.colors.status.dangerBorder)
  )};
  color: ${({ $kind, theme }) => ($kind === 'for' ? theme.colors.status.success : theme.colors.status.danger)};
  background: ${({ $kind, $active, theme }) => (
    !$active ? 'transparent' : $kind === 'for' ? theme.colors.status.successBg : theme.colors.status.dangerBg
  )};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: 800;
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.55; }
  svg { width: 18px; height: 18px; }
`;

const SubmitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const PrivacyNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const TallyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};

  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const TallyCard = styled.div<{ $tone?: 'green' | 'red' }>`
  border: 1px solid ${({ $tone, theme }) => (
    $tone === 'green' ? theme.colors.status.successBorder
      : $tone === 'red' ? theme.colors.status.dangerBorder
        : theme.colors.border.secondary
  )};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: ${({ $tone, theme }) => (
      $tone === 'green' ? theme.colors.status.success
        : $tone === 'red' ? theme.colors.status.danger
          : theme.colors.text.primary
    )};
    font-size: ${({ theme }) => theme.fontSizes.xl};
  }
  span { color: ${({ theme }) => theme.colors.text.secondary}; font-size: ${({ theme }) => theme.fontSizes.xs}; }
`;

const CommentList = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const CommentRow = styled.div`
  display: grid;
  grid-template-columns: 30px 150px 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong { color: ${({ theme }) => theme.colors.text.primary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 640px) {
    grid-template-columns: 30px 1fr;
    strong { grid-column: 2; }
    span:last-child { grid-column: 2; }
  }
`;

const VoteMini = styled.span<{ $vote?: 'for' | 'against' }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $vote, theme }) => ($vote === 'for' ? theme.colors.status.success : theme.colors.status.danger)};
  background: ${({ $vote, theme }) => ($vote === 'for' ? theme.colors.status.successBg : theme.colors.status.dangerBg)};
  font-weight: 900;
`;

const ChairActions = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 620px) { grid-template-columns: 1fr; }
`;

const ReturnButton = styled(Button)`
  border-color: ${({ theme }) => theme.colors.status.warningBorder};
  color: ${({ theme }) => theme.colors.status.warning};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.status.warning};
    color: ${({ theme }) => theme.colors.status.warning};
    background: ${({ theme }) => theme.colors.status.warningBg};
  }
`;

interface CommitteeRoleVotingPanelProps {
  meeting: InvestmentCommitteeMeeting;
  currentManagerId?: string;
  busy: boolean;
  error?: string;
  onVote: (startupId: string, vote: 'for' | 'against', comment?: string) => Promise<void>;
  onChairDecision: (
    startupId: string,
    action: 'approve' | 'reject' | 'return',
    comment?: string,
  ) => Promise<void>;
  onOpenDossier: (startupId: string, startupName?: string) => void;
}

function projectSubtitle(project: InvestmentCommitteeMeetingProject): string {
  return [project.industry, project.stage].filter(Boolean).join(' · ') || '—';
}

function dollarAmount(value: string | undefined): string {
  if (!value) return '—';
  return value.trim().startsWith('$') ? value : `$${value}`;
}

function ParticipantVoting({
  meeting,
  currentManagerId,
  busy,
  error,
  onVote,
  onOpenDossier,
}: Omit<CommitteeRoleVotingPanelProps, 'onChairDecision'>) {
  const { t } = useTranslation();
  const projects = meeting.protocol?.presentedProjects || [];
  const members = committeeVotingMembers(meeting.committee?.members || []);
  const progress = memberVoteProgress(members, projects)
    .find((item) => item.managerId === currentManagerId);
  const currentProject = projects.find((project) => progress?.pendingStartupIds.includes(project.startupId || ''));
  const [vote, setVote] = useState<'for' | 'against' | null>(null);
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!currentProject || !progress) {
    return (
      <TaskCard>
        <Eyebrow><CheckCircle2 />{t('investmentCommittee.roleFlow.yourAction', 'Ваше действие')}</Eyebrow>
        <TaskTitle>{t('investmentCommittee.roleFlow.voteSent', 'Все ваши голоса отправлены')}</TaskTitle>
        <InfoBanner $tone="green">
          <CheckCircle2 />
          <span>{t('investmentCommittee.roleFlow.waitForOthers', 'Ожидаем остальных участников и финальное решение председателя.')}</span>
        </InfoBanner>
      </TaskCard>
    );
  }

  const submittedCount = projects.length - progress.pendingCount;
  const request = projectTerm(currentProject, ['requestedAmount', 'fundingRequest', 'roundSize']);
  const fundAmount = projectTerm(currentProject, ['investmentAmount', 'amount', 'ticketSize']);

  const submit = async () => {
    if (!vote) {
      setValidationError(t('investmentCommittee.roleFlow.chooseVote', 'Выберите «Поддержать» или «Не поддержать».'));
      return;
    }
    if (vote === 'against' && !comment.trim()) {
      setValidationError(t('investmentCommittee.roleFlow.againstComment', 'Для голоса «Не поддержать» добавьте короткий комментарий.'));
      return;
    }
    setValidationError('');
    await onVote(currentProject.startupId || '', vote, comment.trim() || undefined);
    setVote(null);
    setComment('');
  };

  return (
    <TaskCard>
      <TaskHead>
        <div>
          <Eyebrow><Vote />{t('investmentCommittee.roleFlow.yourAction', 'Ваше действие')}</Eyebrow>
          <TaskTitle>{t('investmentCommittee.roleFlow.voteProjects', 'Проголосуйте по проектам')}</TaskTitle>
          <Muted>{t('investmentCommittee.roleFlow.remaining', 'Осталось: {{count}} из {{total}}', { count: progress.pendingCount, total: projects.length })}</Muted>
        </div>
        <Badge $tone="green">{t('investmentCommittee.roleFlow.memberRole', 'Член инвесткомитета')}</Badge>
      </TaskHead>
      <ProgressTrack><ProgressValue $percent={projects.length ? (submittedCount / projects.length) * 100 : 0} /></ProgressTrack>

      <ProjectCard>
        <ProjectHead type="button" onClick={() => currentProject.startupId && onOpenDossier(currentProject.startupId, projectName(currentProject))}>
          <ProjectAvatar>{projectName(currentProject).slice(0, 1).toUpperCase()}</ProjectAvatar>
          <ProjectCopy>
            <strong>{projectName(currentProject)}</strong>
            <small>{projectSubtitle(currentProject)}</small>
          </ProjectCopy>
          <ChevronRight size={18} />
        </ProjectHead>
        <FactsGrid>
          <Fact><span>{t('investmentCommittee.roleFlow.request', 'Запрос')}</span><strong>{dollarAmount(request)}</strong></Fact>
          <Fact><span>{t('investmentCommittee.roleFlow.fundAmount', 'Сумма фонда')}</span><strong>{dollarAmount(fundAmount)}</strong></Fact>
          <Fact><span>{t('investmentCommittee.roleFlow.managerView', 'Рекомендация')}</span><strong>{currentProject.managerThesis ? t('investmentCommittee.roleFlow.reviewThesis', 'Изучить тезис') : '—'}</strong></Fact>
        </FactsGrid>
        <ProjectBody>
          {currentProject.managerThesis ? <Thesis>{currentProject.managerThesis}</Thesis> : null}
          <VoteButtons>
            <VoteChoice type="button" $kind="for" $active={vote === 'for'} disabled={busy} onClick={() => { setVote('for'); setValidationError(''); }}>
              <ThumbsUp />{t('investmentCommittee.roleFlow.support', 'Поддержать')}
            </VoteChoice>
            <VoteChoice type="button" $kind="against" $active={vote === 'against'} disabled={busy} onClick={() => { setVote('against'); setValidationError(''); }}>
              <ThumbsDown />{t('investmentCommittee.roleFlow.doNotSupport', 'Не поддержать')}
            </VoteChoice>
          </VoteButtons>
          <TextArea
            aria-label={t('investmentCommittee.roleFlow.comment', 'Комментарий к решению')}
            placeholder={t('investmentCommittee.roleFlow.commentPlaceholder', 'Комментарий к решению…')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={busy}
          />
          {validationError ? <ErrorText>{validationError}</ErrorText> : null}
          <SubmitRow>
            <PrivacyNote><Lock />{t('investmentCommittee.roleFlow.privateVotes', 'Голоса других участников откроются после завершения голосования')}</PrivacyNote>
            <Button type="button" $variant="primary" disabled={busy || !vote} onClick={submit}>
              <Check />{t('investmentCommittee.roleFlow.saveVote', 'Сохранить голос')}
            </Button>
          </SubmitRow>
        </ProjectBody>
      </ProjectCard>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </TaskCard>
  );
}

function ChairVoting({
  meeting,
  currentManagerId,
  busy,
  error,
  onChairDecision,
  onOpenDossier,
}: Omit<CommitteeRoleVotingPanelProps, 'onVote'>) {
  const { t } = useTranslation();
  const projects = meeting.protocol?.presentedProjects || [];
  const members = committeeVotingMembers(meeting.committee?.members || []);
  const phase = committeeVotingPhase(meeting);
  const memberProgress = memberVoteProgress(members, projects);
  const completedMembers = memberProgress.filter((progress) => progress.pendingCount === 0).length;
  const decisionProgress = chairDecisionProgress(projects);
  const currentProject = projects.find((project) => !project.chairDecision?.decision);
  const [comment, setComment] = useState('');
  const [validationError, setValidationError] = useState('');

  if (phase !== 'chair' || !currentProject) {
    return (
      <TaskCard>
        <TaskHead>
          <div>
            <Eyebrow><Crown />{t('investmentCommittee.roleFlow.yourAction', 'Ваше действие')}</Eyebrow>
            <TaskTitle>{t('investmentCommittee.roleFlow.waitingVotes', 'Ожидаем голоса участников')}</TaskTitle>
          </div>
          <Badge $tone="blue">{t('investmentCommittee.roleFlow.chairRole', 'Председатель инвесткомитета')}</Badge>
        </TaskHead>
        <InfoBanner $tone="blue">
          <Users />
          <span>{t('investmentCommittee.roleFlow.membersProgress', 'Проголосовали {{done}} из {{total}} участников', { done: completedMembers, total: members.length })}</span>
        </InfoBanner>
        <ProgressTrack><ProgressValue $percent={members.length ? (completedMembers / members.length) * 100 : 0} /></ProgressTrack>
        <PrivacyNote><Lock />{t('investmentCommittee.roleFlow.chairWaitHint', 'Ваше решение откроется после завершения первого раунда голосования.')}</PrivacyNote>
      </TaskCard>
    );
  }

  const tally = projectVoteTally(currentProject, members);
  const preliminaryAction = tally.preliminaryDecision;
  const oppositeAction = preliminaryAction === 'approve' ? 'reject' : 'approve';
  const request = projectTerm(currentProject, ['investmentAmount', 'amount', 'ticketSize', 'requestedAmount']);
  const voteComments = (currentProject.memberVotes || []).filter((vote) => Boolean(vote.comment));

  const submit = async (action: 'approve' | 'reject' | 'return') => {
    const requiresComment = action === 'return' || action !== preliminaryAction;
    if (requiresComment && !comment.trim()) {
      setValidationError(t('investmentCommittee.roleFlow.chairCommentRequired', 'Добавьте причину возврата или расхождения с большинством.'));
      return;
    }
    setValidationError('');
    await onChairDecision(currentProject.startupId || '', action, comment.trim() || undefined);
    setComment('');
  };

  return (
    <TaskCard>
      <TaskHead>
        <div>
          <Eyebrow><Crown />{t('investmentCommittee.roleFlow.yourAction', 'Ваше действие')}</Eyebrow>
          <TaskTitle>{t('investmentCommittee.roleFlow.finalDecision', 'Зафиксируйте итоговое решение')}</TaskTitle>
          <Muted>{t('investmentCommittee.roleFlow.chairRemaining', 'Осталось решений: {{count}} из {{total}}', { count: decisionProgress.pendingCount, total: projects.length })}</Muted>
        </div>
        <Badge $tone="blue">{t('investmentCommittee.roleFlow.chairRole', 'Председатель инвесткомитета')}</Badge>
      </TaskHead>
      <InfoBanner $tone="green"><CheckCircle2 /><span>{t('investmentCommittee.roleFlow.allMembersVoted', 'Все участники проголосовали · {{done}} из {{total}}', { done: members.length, total: members.length })}</span></InfoBanner>

      <ProjectCard>
        <ProjectHead type="button" onClick={() => currentProject.startupId && onOpenDossier(currentProject.startupId, projectName(currentProject))}>
          <ProjectAvatar>{projectName(currentProject).slice(0, 1).toUpperCase()}</ProjectAvatar>
          <ProjectCopy><strong>{projectName(currentProject)}</strong><small>{projectSubtitle(currentProject)}</small></ProjectCopy>
          <ChevronRight size={18} />
        </ProjectHead>
        <ProjectBody>
          <TallyGrid>
            <TallyCard $tone="green"><strong>{tally.forCount}</strong><span>{t('investmentCommittee.roleFlow.votesFor', 'За')}</span></TallyCard>
            <TallyCard $tone="red"><strong>{tally.againstCount}</strong><span>{t('investmentCommittee.roleFlow.votesAgainst', 'Против')}</span></TallyCard>
            <TallyCard><strong>{preliminaryAction === 'approve' ? t('investmentCommittee.roleFlow.support', 'Поддержать') : t('investmentCommittee.roleFlow.doNotSupport', 'Не поддержать')}</strong><span>{t('investmentCommittee.roleFlow.preliminary', 'Предварительный итог')}</span></TallyCard>
          </TallyGrid>

          {voteComments.length ? (
            <div>
              <Eyebrow style={{ marginBottom: 10 }}><MessageSquareText />{t('investmentCommittee.roleFlow.memberComments', 'Комментарии участников')}</Eyebrow>
              <CommentList>
                {voteComments.map((vote, index) => (
                  <CommentRow key={`${vote.memberId || index}-${vote.votedAt || index}`}>
                    <VoteMini $vote={vote.vote}>{vote.vote === 'for' ? '✓' : '−'}</VoteMini>
                    <strong>{vote.memberName || t('investmentCommittee.roleFlow.committeeMember', 'Член ИК')}</strong>
                    <span>{vote.comment}</span>
                  </CommentRow>
                ))}
              </CommentList>
            </div>
          ) : null}

          <Fact>
            <span>{t('investmentCommittee.roleFlow.recommendedInvestment', 'Рекомендуемая инвестиция, USD')}</span>
            <strong>{dollarAmount(request)}</strong>
          </Fact>
          <TextArea
            aria-label={t('investmentCommittee.roleFlow.chairComment', 'Комментарий председателя')}
            placeholder={t('investmentCommittee.roleFlow.chairCommentPlaceholder', 'Комментарий нужен при возврате или изменении предварительного итога…')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            disabled={busy}
          />
          {validationError ? <ErrorText>{validationError}</ErrorText> : null}
          <ChairActions>
            <Button type="button" $variant="primary" disabled={busy} onClick={() => submit(preliminaryAction)}>
              <CheckCircle2 />{t('investmentCommittee.roleFlow.confirmResult', 'Подтвердить итог')}
            </Button>
            <ReturnButton type="button" disabled={busy} onClick={() => submit('return')}>
              <RotateCcw />{t('investmentCommittee.roleFlow.returnDiscussion', 'Вернуть на обсуждение')}
            </ReturnButton>
          </ChairActions>
          <SubmitRow>
            <PrivacyNote><Lock />{t('investmentCommittee.roleFlow.protocolNote', 'Решение председателя будет зафиксировано в итоговом протоколе')}</PrivacyNote>
            <Button type="button" $variant="ghost" disabled={busy} onClick={() => submit(oppositeAction)}>
              <ShieldAlert />
              {oppositeAction === 'approve'
                ? t('investmentCommittee.roleFlow.changeToSupport', 'Изменить итог: поддержать')
                : t('investmentCommittee.roleFlow.changeToReject', 'Изменить итог: не поддержать')}
            </Button>
          </SubmitRow>
        </ProjectBody>
      </ProjectCard>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </TaskCard>
  );
}

export default function CommitteeRoleVotingPanel(props: CommitteeRoleVotingPanelProps) {
  const { t } = useTranslation();
  const members = props.meeting.committee?.members || [];
  const chair = committeeChair(members);
  const isChair = Boolean(chair && chair.managerId === props.currentManagerId);
  const isParticipant = members.some((member: InvestmentCommitteeSnapshotMember) => (
    member.managerId === props.currentManagerId
  ));

  if (!isParticipant) {
    return (
      <Shell>
        <InfoBanner $tone="amber"><Lock /><span>{t('investmentCommittee.roleFlow.notMember', 'Этот аккаунт не входит в состав данного заседания.')}</span></InfoBanner>
      </Shell>
    );
  }

  return (
    <Shell>
      {isChair
        ? <ChairVoting {...props} />
        : <ParticipantVoting {...props} />}
    </Shell>
  );
}
