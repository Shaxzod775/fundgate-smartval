import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Database, ExternalLink, FileSignature, Globe, Loader2, ThumbsDown, ThumbsUp, X,
} from 'lucide-react';
import {
  investmentCommitteeApi,
  safeCrmFileHref,
  type InvestmentCommitteeDossier,
  type InvestmentCommitteeMeeting,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast/useToast';
import { previewDocument } from '../../components/ui/DocPreview/DocPreview';
import { investmentMemoPreviewUrl } from '../../utils/investmentMemoLinks';
import { InvestMemoIcon, PitchDeckIcon } from '../../components/ui/DocIcons';
import { StartupLogo } from '../../components/ui/StartupLogo';
import { safeExternalHref } from '../../utils/safeUrl';
import { committeeChair, committeeVotingMembers } from './committeeRoles';
import { matrixCell } from './voteProgress';
import { displayCountry } from './dossierMeta';
import {
  Button,
  FactTile,
  FactTileLabel,
  FactTileValue,
  FactTiles,
  Muted,
  formatAmount,
} from './components/shared';

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg.primary};
`;

const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const TopTitle = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.base};
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const CloseButton = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
  svg { width: 18px; height: 18px; }
`;

const Progress = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[3]};
`;

const ProgressCell = styled.span<{ $state: 'done' | 'current' | 'todo' }>`
  height: 3px;
  flex: 1;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme, $state }) => (
    $state === 'todo' ? theme.colors.border.secondary : theme.colors.accent.primary
  )};
  opacity: ${({ $state }) => ($state === 'current' ? 1 : $state === 'done' ? 0.55 : 1)};
`;

const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  align-items: stretch;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Arrow = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;

  &:disabled { opacity: 0.25; cursor: default; }
  &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.accent.primary}; }
  svg { width: 26px; height: 26px; }

  @media (max-width: 768px) { display: none; }
`;

const Scroller = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
`;

const Card = styled.article`
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const Logo = styled(StartupLogo)`
  width: 72px;
  height: 72px;
  border-radius: 18px;
  flex-shrink: 0;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 800;
`;

const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Paragraph = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
  white-space: pre-line;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Chip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  svg { width: 15px; height: 15px; }
`;

const Block = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Bullets = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
`;

const VoteBar = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[4]} 0 0;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const VoteButton = styled(Button)<{ $tone: 'for' | 'against'; $active?: boolean }>`
  border-color: ${({ theme, $tone, $active }) => (
    $active ? ($tone === 'for' ? theme.colors.accent.primary : '#ef4444') : theme.colors.border.primary
  )};
  background: ${({ theme, $tone, $active }) => (
    $active ? ($tone === 'for' ? theme.colors.accent.primary : 'rgba(239, 68, 68, 0.16)') : theme.colors.bg.card
  )};
  color: ${({ theme, $tone, $active }) => (
    $active ? ($tone === 'for' ? '#fff' : '#ef4444') : theme.colors.text.primary
  )};
`;

const Done = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes['2xl']};
    font-weight: 800;
  }

  p {
    margin: 0;
    max-width: 460px;
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    line-height: 1.6;
  }

  > svg {
    width: 48px;
    height: 48px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const Center = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};

  svg { width: 28px; height: 28px; }
`;

function dossierAmount(item: InvestmentCommitteeDossier, key: string): number | undefined {
  const value = (item.terms as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'number' && value > 0 ? value : undefined;
}

export default function CommitteeVotingFlow() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { manager } = useAuth();
  const toast = useToast();

  const [meeting, setMeeting] = useState<InvestmentCommitteeMeeting | null>(null);
  const [dossiers, setDossiers] = useState<InvestmentCommitteeDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const backToMeeting = useCallback(() => {
    navigate(`/committee/sessions/${meetingId}`);
  }, [navigate, meetingId]);

  useEffect(() => {
    if (!meetingId) return;
    let active = true;
    setLoading(true);
    void Promise.all([
      investmentCommitteeApi.getMeeting(meetingId),
      investmentCommitteeApi.getDataRoom(meetingId),
    ]).then(([meetingRes, dataRoomRes]) => {
      if (!active) return;
      if (meetingRes.success && meetingRes.data) setMeeting(meetingRes.data);
      if (dataRoomRes.success && Array.isArray(dataRoomRes.data)) setDossiers(dataRoomRes.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [meetingId]);

  const projects = useMemo(() => meeting?.protocol?.presentedProjects || [], [meeting]);
  const chair = useMemo(() => committeeChair(meeting?.committee?.members || []), [meeting]);
  const votingMembers = useMemo(() => committeeVotingMembers(meeting?.committee?.members || []), [meeting]);
  const isChair = Boolean(chair && manager?.id && chair.managerId === manager.id);
  const isVoter = manager?.role === 'committee_member'
    || isChair
    || votingMembers.some((member) => member.managerId === manager?.id);

  useEffect(() => {
    if (!loading && meeting && !isVoter) backToMeeting();
  }, [loading, meeting, isVoter, backToMeeting]);

  const myVote = useCallback((startupId: string) => {
    const project = projects.find((candidate) => candidate.startupId === startupId);
    return manager?.id ? matrixCell(project, manager.id)?.vote : undefined;
  }, [projects, manager?.id]);

  const pendingCount = projects.filter((project) => !myVote(project.startupId || '')).length;
  const finished = projects.length > 0 && pendingCount === 0;

  const current = dossiers[index];
  const currentProject = projects[index];

  const go = useCallback((delta: number) => {
    setIndex((value) => Math.min(Math.max(value + delta, 0), Math.max(dossiers.length - 1, 0)));
  }, [dossiers.length]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'Escape') backToMeeting();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, backToMeeting]);

  const castVote = async (vote: 'for' | 'against') => {
    const startupId = currentProject?.startupId || current?.startupId;
    if (!meetingId || !startupId || busy) return;
    setBusy(true);
    try {
      const response = await investmentCommitteeApi.voteOnProject(meetingId, startupId, { vote });
      if (response.success && response.data) {
        setMeeting(response.data);
        if (index < dossiers.length - 1) setIndex(index + 1);
      } else {
        toast.error(t('investmentCommittee.voting.voteFailed', 'Не удалось отправить голос'));
      }
    } catch {
      toast.error(t('investmentCommittee.voting.voteFailed', 'Не удалось отправить голос'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Screen><Center><Loader2 /></Center></Screen>;
  }

  const memoUrl = current?.investmentMemo
    ? investmentMemoPreviewUrl(current.investmentMemo as Record<string, unknown>)
    : '';
  const pitchDeckUrl = current?.fileUrls?.pitchDeck;
  const dataRoomUrl = safeExternalHref(current?.dataRoomUrl);
  const vote = current ? myVote(current.startupId) : undefined;

  return (
    <Screen>
      <TopBar>
        <TopTitle>
          <strong>{meeting?.title || t('investmentCommittee.voting.title', 'Голосование')}</strong>
          <span>
            {finished
              ? t('investmentCommittee.voting.allDone', 'Все проекты пройдены')
              : t('investmentCommittee.voting.position', '{{current}} из {{total}}', {
                current: Math.min(index + 1, dossiers.length),
                total: dossiers.length,
              })}
          </span>
        </TopTitle>
        <CloseButton type="button" aria-label={t('common.close', 'Закрыть')} onClick={backToMeeting}>
          <X />
        </CloseButton>
      </TopBar>

      {dossiers.length > 1 ? (
        <Progress>
          {dossiers.map((item, position) => (
            <ProgressCell
              key={item.startupId}
              $state={position === index ? 'current' : myVote(item.startupId) ? 'done' : 'todo'}
            />
          ))}
        </Progress>
      ) : null}

      {finished ? (
        <Done>
          <CheckCircle2 />
          <h2>{t('investmentCommittee.voting.doneTitle', 'Вы завершили голосование')}</h2>
          <p>
            {t(
              'investmentCommittee.voting.doneHint',
              'Когда проголосуют остальные участники, подпишите, пожалуйста, итоговый протокол заседания.',
            )}
          </p>
          <Button type="button" $variant="primary" onClick={backToMeeting}>
            <FileSignature />
            {t('investmentCommittee.voting.backToMeeting', 'Вернуться к заседанию')}
          </Button>
        </Done>
      ) : !current ? (
        <Center><Muted>{t('investmentCommittee.voting.empty', 'В повестке нет проектов')}</Muted></Center>
      ) : (
        <Stage>
          <Arrow type="button" aria-label={t('common.back', 'Назад')} disabled={index === 0} onClick={() => go(-1)}>
            <ArrowLeft />
          </Arrow>

          <Scroller>
            <Card>
              <Head>
                <Logo src={current.logoUrl} name={current.name || '?'} startupId={current.startupId} />
                <div>
                  <Title>{current.name}</Title>
                  <Meta>
                    {[current.industry, displayCountry(current.country), current.stage].filter(Boolean).join(' · ')}
                  </Meta>
                </div>
              </Head>

              <FactTiles>
                <FactTile>
                  <FactTileValue $empty={!dossierAmount(current, 'investmentAmount')}>
                    {dossierAmount(current, 'investmentAmount')
                      ? formatAmount(dossierAmount(current, 'investmentAmount') as number)
                      : t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.fundAmountLabel', 'Наша инвестиция, USD')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!dossierAmount(current, 'requestedAmount')}>
                    {dossierAmount(current, 'requestedAmount')
                      ? formatAmount(dossierAmount(current, 'requestedAmount') as number)
                      : t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.askFact', 'Запрос стартапа')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!dossierAmount(current, 'totalRoundSize')}>
                    {dossierAmount(current, 'totalRoundSize')
                      ? formatAmount(dossierAmount(current, 'totalRoundSize') as number)
                      : t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.roundFact', 'Размер раунда')}
                  </FactTileLabel>
                </FactTile>
              </FactTiles>

              <Chips>
                {dataRoomUrl ? (
                  <Chip href={dataRoomUrl} target="_blank" rel="noopener noreferrer">
                    <Database />
                    Data Room
                    <ExternalLink />
                  </Chip>
                ) : null}
                {pitchDeckUrl ? (
                  <Chip
                    href={safeCrmFileHref(pitchDeckUrl) || '#'}
                    onClick={(event) => { event.preventDefault(); previewDocument(pitchDeckUrl, undefined, current.startupId); }}
                  >
                    <PitchDeckIcon />
                    Pitch deck
                  </Chip>
                ) : null}
                {memoUrl ? (
                  <Chip
                    href={safeCrmFileHref(memoUrl) || '#'}
                    onClick={(event) => { event.preventDefault(); previewDocument(memoUrl, undefined, current.startupId); }}
                  >
                    <InvestMemoIcon />
                    {t('investmentCommittee.shortlist.memoChip', 'Инвест-мемо')}
                  </Chip>
                ) : null}
                {current.website ? (
                  <Chip href={safeExternalHref(current.website) || '#'} target="_blank" rel="noopener noreferrer">
                    <Globe />
                    {t('investmentCommittee.dossier.website', 'Сайт')}
                    <ExternalLink />
                  </Chip>
                ) : null}
              </Chips>

              {current.description ? (
                <Block>
                  <SectionTitle>{t('investmentCommittee.dossier.about', 'О компании')}</SectionTitle>
                  <Paragraph>{current.description}</Paragraph>
                </Block>
              ) : null}

              {currentProject?.managerThesis ? (
                <Block>
                  <SectionTitle>{t('investmentCommittee.shortlist.thesisShort', 'Тезис')}</SectionTitle>
                  <Paragraph>{currentProject.managerThesis}</Paragraph>
                </Block>
              ) : null}

              {current.aiAnalysis?.strengths?.length ? (
                <Block>
                  <SectionTitle>{t('investmentCommittee.dossier.strengths', 'Сильные стороны')}</SectionTitle>
                  <Bullets>
                    {current.aiAnalysis.strengths.map((line) => <li key={line}>{line}</li>)}
                  </Bullets>
                </Block>
              ) : null}

              {current.aiAnalysis?.weaknesses?.length ? (
                <Block>
                  <SectionTitle>{t('investmentCommittee.dossier.weaknesses', 'Риски')}</SectionTitle>
                  <Bullets>
                    {current.aiAnalysis.weaknesses.map((line) => <li key={line}>{line}</li>)}
                  </Bullets>
                </Block>
              ) : null}

              <VoteBar>
                <VoteButton
                  type="button"
                  $tone="for"
                  $active={vote === 'for'}
                  disabled={busy}
                  onClick={() => { void castVote('for'); }}
                >
                  {vote === 'for' ? <Check /> : <ThumbsUp />}
                  {t('investmentCommittee.voting.for', 'За')}
                </VoteButton>
                <VoteButton
                  type="button"
                  $tone="against"
                  $active={vote === 'against'}
                  disabled={busy}
                  onClick={() => { void castVote('against'); }}
                >
                  {vote === 'against' ? <Check /> : <ThumbsDown />}
                  {t('investmentCommittee.voting.against', 'Против')}
                </VoteButton>
                <Muted>
                  {vote
                    ? t('investmentCommittee.voting.voteSaved', 'Голос сохранён — можно изменить')
                    : t('investmentCommittee.voting.pendingHint', 'Осталось проектов: {{count}}', { count: pendingCount })}
                </Muted>
              </VoteBar>
            </Card>
          </Scroller>

          <Arrow
            type="button"
            aria-label={t('common.next', 'Дальше')}
            disabled={index >= dossiers.length - 1}
            onClick={() => go(1)}
          >
            <ArrowRight />
          </Arrow>
        </Stage>
      )}
    </Screen>
  );
}
