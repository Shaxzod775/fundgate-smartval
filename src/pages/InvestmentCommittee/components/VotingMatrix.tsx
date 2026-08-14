import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import type { InvestmentCommitteeMeeting, InvestmentCommitteeMeetingProject } from '../../../services/api';
import { matrixCell, memberVoteProgress } from '../voteProgress';
import { projectVoteTally } from '../committeeRoles';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { Button, EmptyState, ErrorText, InfoBanner, Muted, Panel, PanelHeader, SectionTitle, TextArea } from './shared';

const MatrixPanel = styled(Panel)<{ $flush?: boolean }>`
  ${({ $flush }) => ($flush ? `
    border: 0;
    background: none;
    box-shadow: none;
    padding: 0;
  ` : '')}
`;

const ScrollBox = styled.div`
  overflow-x: auto;

  /* На телефонах вместо широкой таблицы — карточки проектов (MobileList) */
  @media (max-width: 640px) {
    display: none;
  }
`;

const MobileList = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const MobileCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MobileVoteChips = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MobileVoteChip = styled.span<{ $vote?: 'for' | 'against' }>`
  color: ${({ $vote, theme }) => (
    $vote === 'for' ? theme.colors.status.success
      : $vote === 'against' ? theme.colors.status.danger
        : theme.colors.text.secondary
  )};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const MatrixTable = styled.table`
  /* Ширина по содержимому, а не 100%: при 1–2 проектах таблица не растягивается
     на весь экран с огромными пустыми ячейками — она ужимается до реального
     размера кнопок. Прижата влево, а не отцентрирована: центрированная узкая
     таблица висела в стороне от заголовка секции. */
  width: auto;
  margin-inline: 0;
  border-collapse: collapse;

  th, td {
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
    text-align: center;
    vertical-align: middle;
  }

  /* Колонка «участник» липнет слева при горизонтальном скролле на мобильных.
     Фон — ТОЛЬКО solid (bg.dropdown): rgba-фоны темы просвечивают контентом. */
  /* Колонки проектов одной ширины: разнобой делал строку итогов лесенкой. */
  th:not(:first-child), td:not(:first-child) {
    min-width: 132px;
  }

  th:first-child, td:first-child {
    text-align: left;
    min-width: 180px;
    position: sticky;
    left: 0;
    z-index: 1;
    background: ${({ theme }) => theme.colors.bg.dropdown};
  }

  thead th {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  /* Зебра: соседние строки не сливаются при 4+ участниках. */
  tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.02); }
  tbody tr:nth-child(even) td:first-child { background: ${({ theme }) => theme.colors.bg.dropdown}; }

  /* Своя строка — акцентной рамкой слева: голосующий сразу находит себя. */
  tbody tr[data-self='true'] td { background: rgba(16, 185, 129, 0.07); }
  tbody tr[data-self='true'] td:first-child {
    background: ${({ theme }) => theme.colors.bg.dropdown};
    box-shadow: inset 3px 0 0 ${({ theme }) => theme.colors.accent.primary};
  }

  tfoot td {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
  tfoot td:first-child {
    background: ${({ theme }) => theme.colors.bg.dropdown};
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Заголовок первой колонки тоже sticky-слева — фон ОБЯЗАН быть solid
     (bg.dropdown), иначе заголовки проектов просвечивают под ним при
     горизонтальном скролле (rgba-фон bg.tertiary прозрачен). */
  thead th:first-child {
    z-index: 2;
    background: ${({ theme }) => theme.colors.bg.dropdown};
  }

  @media (max-width: 640px) {
    min-width: 640px;

    th, td {
      padding: ${({ theme }) => theme.spacing[2]};
    }

    th:first-child, td:first-child {
      min-width: 140px;
    }
  }
`;

const ProjectHeadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    text-decoration: underline;
  }
`;

const Logo = styled(StartupLogo)`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex-shrink: 0;
`;


const VoteMark = styled.span<{ $vote?: 'for' | 'against' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  min-height: 26px;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px ${({ $vote }) => ($vote ? 'solid' : 'dashed')} ${({ $vote, theme }) => (
    $vote === 'for' ? theme.colors.status.success
      : $vote === 'against' ? theme.colors.status.danger
        : theme.colors.border.primary
  )};
  background: ${({ $vote }) => (
    $vote === 'for' ? 'rgba(16, 185, 129, 0.14)'
      : $vote === 'against' ? 'rgba(239, 68, 68, 0.14)'
        : 'transparent'
  )};
  color: ${({ $vote, theme }) => (
    $vote === 'for' ? theme.colors.status.success
      : $vote === 'against' ? theme.colors.status.danger
        : theme.colors.text.tertiary
  )};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $vote }) => ($vote ? 800 : 400)};
  cursor: ${({ $vote }) => ($vote ? 'help' : 'default')};
`;

const TallyCell = styled.span`
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  b { color: ${({ theme }) => theme.colors.status.success}; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 800; }
  i { color: ${({ theme }) => theme.colors.status.danger}; font-style: normal; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 800; }
`;

const PendingBadge = styled.span<{ $done?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $done }) => ($done ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.06)')};
  color: ${({ $done, theme }) => ($done ? theme.colors.status.success : theme.colors.text.muted)};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const OwnVoteButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  /* Задаёт ширину колонки проекта в content-sized таблице: пара «За/Против»
     остаётся читаемой, но не расползается на пол-экрана. */
  min-width: 240px;

  @media (max-width: 480px) {
    min-width: 120px;
    gap: ${({ theme }) => theme.spacing[1]};
  }
`;

const OwnVoteButton = styled.button<{ $kind: 'for' | 'against'; $active?: boolean; $dimmed?: boolean }>`
  min-height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ $kind, $active, theme }) => {
    if (!$active) return theme.colors.border.secondary;
    return $kind === 'for' ? theme.colors.status.success : theme.colors.status.danger;
  }};
  background: transparent;
  color: ${({ $kind, $active, theme }) => {
    if (!$active) return theme.colors.text.secondary;
    return $kind === 'for' ? theme.colors.status.success : theme.colors.status.danger;
  }};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ $kind, theme }) => ($kind === 'for' ? theme.colors.status.success : theme.colors.status.danger)};
    color: ${({ $kind, theme }) => ($kind === 'for' ? theme.colors.status.success : theme.colors.status.danger)};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    min-height: 32px;
    padding: 0 ${({ theme }) => theme.spacing[1]};
  }
`;

const MemberCellName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
`;

const MemberStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const popoverIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const VoteComposer = styled.div`
  border: 1px solid ${({ theme }) => `${theme.colors.accent.primary}55`};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  box-shadow: ${({ theme }) => theme.shadows.md};
  animation: ${popoverIn} 220ms cubic-bezier(0.2, 0.8, 0.3, 1);
`;

const ComposerHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const ComposerVote = styled.span<{ $for: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 800;
  color: ${({ $for, theme }) => ($for ? theme.colors.status.success : theme.colors.status.danger)};
`;

const ComposerProject = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  overflow-wrap: anywhere;
`;

const ComposerActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  justify-content: flex-end;
  flex-wrap: wrap;
`;

interface PendingVote {
  startupId: string;
  vote: 'for' | 'against';
  onBehalf?: { managerId: string; name?: string };
}

interface VotingMatrixProps {
  meeting: InvestmentCommitteeMeeting;
  currentManagerId?: string;
  currentManagerName?: string;
  currentManagerEmail?: string;
  canVote: boolean;
  busy: boolean;
  error?: string;
  onVote: (
    startupId: string,
    vote: 'for' | 'against',
    comment?: string,
    onBehalf?: { managerId: string; name?: string },
  ) => Promise<void>;
  onOpenDossier: (startupId: string, startupName?: string) => void;
  observerMode?: boolean;
  currentUserIsCommitteeMember?: boolean;
  testMode?: boolean;
  hideHeader?: boolean;
  logoByStartupId?: Record<string, string>;
}

export default function VotingMatrix({
  meeting,
  currentManagerId,
  currentManagerName,
  currentManagerEmail,
  canVote,
  busy,
  error,
  onVote,
  onOpenDossier,
  observerMode = false,
  currentUserIsCommitteeMember = false,
  testMode = false,
  hideHeader = false,
  logoByStartupId,
}: VotingMatrixProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingVote | null>(null);
  const [comment, setComment] = useState('');

  const voteLabel = (vote?: 'for' | 'against') => (
    vote === 'for' ? t('investmentCommittee.matrix.voteFor')
      : vote === 'against' ? t('investmentCommittee.matrix.voteAgainst')
        : '—'
  );

  const projects = (meeting.protocol?.presentedProjects || []).map((project) => (
    project.logoUrl || !project.startupId || !logoByStartupId?.[project.startupId]
      ? project
      : { ...project, logoUrl: logoByStartupId[project.startupId] }
  ));
  const snapshotMembers = meeting.committee?.members || [];
  const currentSnapshotMember = snapshotMembers.find((member) => member.managerId === currentManagerId);
  const selfJoinMember = canVote && currentUserIsCommitteeMember && currentManagerId && !currentSnapshotMember
    ? {
      managerId: currentManagerId,
      name: currentManagerName || t('investmentCommittee.matrix.you', 'Вы'),
      email: currentManagerEmail,
      isRemote: false,
    }
    : null;
  const members = selfJoinMember ? [...snapshotMembers, selfJoinMember] : snapshotMembers;
  const progress = memberVoteProgress(members, projects);
  const committeeMemberNotInMeeting = Boolean(selfJoinMember);

  const submitPending = async () => {
    if (!pending) return;
    await onVote(pending.startupId, pending.vote, comment.trim() || undefined, pending.onBehalf);
    setPending(null);
    setComment('');
  };

  const projectName = (project: InvestmentCommitteeMeetingProject) => project.startupName || project.startupId || '';

  const ownVoteButtons = (
    project: InvestmentCommitteeMeetingProject,
    target?: { managerId: string; name?: string },
  ) => {
    const voterId = target?.managerId || currentManagerId;
    const cell = voterId ? matrixCell(project, voterId) : undefined;
    const setPendingVote = (vote: 'for' | 'against') => {
      setPending({ startupId: project.startupId || '', vote, onBehalf: target });
      setComment(cell?.comment || '');
    };
    return (
      <OwnVoteButtons>
        <OwnVoteButton
          type="button"
          $kind="for"
          $active={cell?.vote === 'for'}
          $dimmed={Boolean(cell?.vote && cell.vote !== 'for')}
          aria-pressed={cell?.vote === 'for'}
          disabled={busy}
          title={cell?.vote === 'against'
            ? t('investmentCommittee.matrix.changeVoteFor', 'Изменить голос на «За»')
            : t('investmentCommittee.matrix.voteForWithComment', 'За / добавить комментарий')}
          onClick={() => setPendingVote('for')}
        >
          {t('investmentCommittee.matrix.voteFor')}
        </OwnVoteButton>
        <OwnVoteButton
          type="button"
          $kind="against"
          $active={cell?.vote === 'against'}
          $dimmed={Boolean(cell?.vote && cell.vote !== 'against')}
          aria-pressed={cell?.vote === 'against'}
          disabled={busy}
          title={cell?.vote === 'for'
            ? t('investmentCommittee.matrix.changeVoteAgainst', 'Изменить голос на «Против»')
            : t('investmentCommittee.matrix.voteAgainstWithComment', 'Против / добавить комментарий')}
          onClick={() => setPendingVote('against')}
        >
          {t('investmentCommittee.matrix.voteAgainst')}
        </OwnVoteButton>
      </OwnVoteButtons>
    );
  };
  if (!projects.length || !members.length) {
    return (
      <MatrixPanel $flush={hideHeader}>
        {!hideHeader ? (
          <SectionTitle>
            {t('investmentCommittee.matrix.title')}
          </SectionTitle>
        ) : null}
        <EmptyState style={{ marginTop: hideHeader ? 0 : 12 }}>{t('investmentCommittee.matrix.empty')}</EmptyState>
      </MatrixPanel>
    );
  }

  const memberHint = canVote ? (
    <Muted>
      {t(
        'investmentCommittee.matrix.memberHintShort',
        'Выберите «За» или «Против» в своей строке — с комментарием, если нужно; голос можно изменить, пока голосование не завершено.'
      )}
    </Muted>
  ) : null;

  return (
    <MatrixPanel $flush={hideHeader}>
      {!hideHeader ? (
        <PanelHeader>
          <SectionTitle>
            {t('investmentCommittee.matrix.title')}
          </SectionTitle>
          {memberHint}
        </PanelHeader>
      ) : memberHint ? (
        <div style={{ marginBottom: 12 }}>{memberHint}</div>
      ) : null}

      {committeeMemberNotInMeeting ? (
        <InfoBanner $tone="blue" style={{ marginBottom: 16 }}>
          <span>
            {t(
              'investmentCommittee.matrix.selfJoinSnapshot',
              'Ваш аккаунт будет добавлен в состав этого заседания при сохранении первого голоса.'
            )}
          </span>
        </InfoBanner>
      ) : null}

      <ScrollBox>
        <MatrixTable>
          <thead>
            <tr>
              <th>{t('investmentCommittee.matrix.member')}</th>
              {projects.map((project) => (
                <th key={project.startupId}>
                  <ProjectHeadButton
                    type="button"
                    onClick={() => project.startupId && onOpenDossier(project.startupId, projectName(project))}
                    title={t('investmentCommittee.matrix.openDossier')}
                  >
                    <Logo src={project.logoUrl} startupId={project.startupId} name={projectName(project)} />
                    {projectName(project)}
                  </ProjectHeadButton>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = canVote && member.managerId === currentManagerId;
              const interactive = isSelf || testMode;
              const voteTarget = isSelf ? undefined : { managerId: member.managerId, name: member.name };
              const memberProgress = progress.find((item) => item.managerId === member.managerId);
              return (
                <tr key={member.managerId} data-self={isSelf ? 'true' : undefined}>
                  <td>
                    <MemberCellName>
                      <strong>{member.name || member.managerId}{isSelf ? ` (${t('investmentCommittee.matrix.you')})` : ''}</strong>
                      <MemberStatus>
                        <PendingBadge $done={!memberProgress || memberProgress.pendingCount === 0}>
                          {memberProgress && memberProgress.pendingCount > 0
                            ? t('investmentCommittee.matrix.notReviewed', { count: memberProgress.pendingCount })
                            : t('investmentCommittee.matrix.reviewedAll')}
                        </PendingBadge>
                        {member.isRemote ? (
                          <PendingBadge>{t('investmentCommittee.remote.badge', 'Удалённо')}</PendingBadge>
                        ) : null}
                      </MemberStatus>
                    </MemberCellName>
                  </td>
                  {projects.map((project) => {
                    const cell = matrixCell(project, member.managerId);
                    const cellTitle = cell?.comment
                      ? `${cell.vote === 'for' ? '✓' : '−'} ${cell.comment}`
                      : undefined;
                    if (interactive) {
                      return <td key={project.startupId}>{ownVoteButtons(project, voteTarget)}</td>;
                    }
                    return (
                      <td key={project.startupId} title={cellTitle}>
                        <VoteMark $vote={cell?.vote}>{voteLabel(cell?.vote)}</VoteMark>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{t('investmentCommittee.matrix.tally', 'Итог')}</td>
              {projects.map((project) => {
                const tally = projectVoteTally(project, members);
                return (
                  <td key={project.startupId}>
                    <TallyCell>
                      <b>{tally.forCount}</b>
                      <span>/</span>
                      <i>{tally.againstCount}</i>
                      {tally.pendingCount > 0 ? (
                        <span>· {t('investmentCommittee.matrix.tallyPending', 'ждём {{count}}', { count: tally.pendingCount })}</span>
                      ) : null}
                    </TallyCell>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </MatrixTable>
      </ScrollBox>

      <MobileList>
        {projects.map((project) => (
          <MobileCard key={project.startupId || projectName(project)}>
            <ProjectHeadButton
              type="button"
              onClick={() => project.startupId && onOpenDossier(project.startupId, projectName(project))}
              title={t('investmentCommittee.matrix.openDossier')}
            >
              <Logo src={project.logoUrl} startupId={project.startupId} name={projectName(project)} />
              {projectName(project)}
            </ProjectHeadButton>

            {canVote ? ownVoteButtons(project) : null}

            <MobileVoteChips>
              {members
                .filter((member) => !(canVote && member.managerId === currentManagerId))
                .map((member) => {
                  const cell = matrixCell(project, member.managerId);
                  return (
                    <MobileVoteChip
                      key={member.managerId}
                      $vote={cell?.vote}
                      title={cell?.comment || undefined}
                    >
                      {member.name || member.managerId}: {voteLabel(cell?.vote)}
                    </MobileVoteChip>
                  );
                })}
            </MobileVoteChips>
          </MobileCard>
        ))}
      </MobileList>

      {pending && (
        <VoteComposer>
          <ComposerHead>
            <ComposerVote $for={pending.vote === 'for'}>
              {pending.vote === 'for' ? t('investmentCommittee.matrix.voteFor') : t('investmentCommittee.matrix.voteAgainst')}
            </ComposerVote>
            <ComposerProject>
              {projectName(projects.find((project) => project.startupId === pending.startupId) || {})}
            </ComposerProject>
            {pending.onBehalf ? (
              <Muted as="span">· {t('investmentCommittee.matrix.testOnBehalf', 'от имени')} {pending.onBehalf.name || pending.onBehalf.managerId}</Muted>
            ) : null}
          </ComposerHead>
          <TextArea
            aria-label={t('investmentCommittee.matrix.commentLabel', 'Комментарий к голосу')}
            style={{ minHeight: 72, width: '100%' }}
            placeholder={t('investmentCommittee.matrix.commentPlaceholder')}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <ComposerActions>
            <Button type="button" onClick={() => { setPending(null); setComment(''); }}>
              {t('common.cancel')}
            </Button>
            <Button type="button" $variant="primary" disabled={busy} onClick={submitPending}>
              {t('investmentCommittee.matrix.submitVoteWithComment', 'Сохранить голос')}
            </Button>
          </ComposerActions>
        </VoteComposer>
      )}

      {error ? <ErrorText style={{ marginTop: 12 }}>{error}</ErrorText> : null}
    </MatrixPanel>
  );
}
