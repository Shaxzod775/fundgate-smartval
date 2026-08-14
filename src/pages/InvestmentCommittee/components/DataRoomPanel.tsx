import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Database, ChevronDown, ChevronRight, ExternalLink, Globe } from 'lucide-react';
import {
  investmentCommitteeApi,
  safeCrmFileHref,
  type InvestmentCommitteeDossier,
  type InvestmentCommitteeMeeting,
  type InvestmentCommitteeMeetingProject,
  type Startup,
} from '../../../services/api';
import { previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import { investmentMemoPreviewFileName, investmentMemoPreviewUrl } from '../../../utils/investmentMemoLinks';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { InvestMemoIcon, PitchDeckIcon } from '../../../components/ui/DocIcons';
import { formatMediumDate } from '../../../utils/formatDate';
import { safeExternalHref } from '../../../utils/safeUrl';
import { hoverTooltip } from '../../../styles/tooltip';
import { ManagerAvatar } from '../../../components/ui/ManagerAvatar';
import {
  Badge,
  Button,
  EmptyState,
  FactTile,
  FactTileLabel,
  FactTileValue,
  FactTiles,
  Muted,
  decisionMeta,
  formatAmount,
} from './shared';
import {
  aiRecommendationKind,
  aiRecommendationTone,
  displayCountry,
  fileExtension,
  memoDecisionMeta,
  projectVoteStats,
  type ProjectVoteStats,
} from '../dossierMeta';

const WARN_COLOR = '#f59e0b';

const Cards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ScrollArea = styled.div`
  max-height: min(70vh, 720px);
  overflow-y: auto;
  overscroll-behavior: contain;

  /* Полосу прокрутки прячем: она шла вплотную к карточкам и читалась как
     чужой элемент внутри списка. Прокрутка остаётся — колесом, тачпадом,
     клавишами и перетаскиванием. */
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

const SmallButton = styled(Button)`
  min-height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;

  &:hover:not(:disabled) {
    background: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg { width: 14px; height: 14px; }
`;

const RowCard = styled.article<{ $flash?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.card};
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  scroll-margin-top: 90px;
  transition: border-color ${({ theme }) => theme.transitions.base}, box-shadow ${({ theme }) => theme.transitions.base};

  ${({ $flash, theme }) => ($flash
    ? css`
      border-color: ${theme.colors.accent.primary};
      box-shadow: 0 0 0 3px ${theme.colors.accent.primary}33;
    `
    : '')}

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const CollapseShell = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  transition: grid-template-rows 280ms ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CollapseInner = styled.div<{ $open: boolean }>`
  overflow: hidden;
  min-height: 0;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition: visibility 0s linear ${({ $open }) => ($open ? '0s' : '280ms')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const RowHead = styled.div<{ $interactive?: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 4px;
  }
`;

const Logo = styled(StartupLogo)`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  flex-shrink: 0;
`;

const TitleBlock = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Name = styled.h3`
  margin: 0;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;


const Facts = styled.p`
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.4;
`;

const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
  white-space: pre-line;
`;

const Responsible = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const ResponsibleCopy = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;

  span {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ScoreBadge = styled(Badge)`
  ${hoverTooltip({ placement: 'bottom', align: 'right', wrap: true })}
`;

const ExpandToggle = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 480px) {
    margin-left: 0;
  }
`;

const Chevron = styled(ChevronDown)<{ $open?: boolean }>`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform ${({ theme }) => theme.transitions.base};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
`;

const FactsFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[8]};

  > * {
    flex: 1 1 260px;
    min-width: 220px;
  }
`;

const NarrativeStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SectionHead = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Links = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const DocLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  overflow-wrap: anywhere;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const DataRoomLink = styled(DocLink)`
  border-color: ${({ theme }) => theme.colors.accent.primary};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-weight: 600;
`;

const DocTag = styled.span`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Thesis = styled.blockquote`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[3]};
  border-left: 3px solid ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: pre-wrap;
`;

const BodyText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const Prose = styled(Muted)`
  line-height: 1.6;
  white-space: pre-wrap;
`;

const VerdictNote = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${`${WARN_COLOR}3a`};
  background: ${`${WARN_COLOR}12`};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.55;
  white-space: pre-wrap;
`;

const MissingNote = styled.p`
  margin: 0;
  display: inline-flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${WARN_COLOR};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;

  svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; }
`;

const RowFooter = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const SkeletonCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SkeletonBar = styled.div<{ $w?: string }>`
  height: 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  width: ${({ $w }) => $w || '100%'};
`;

function dossierRequestedAmount(item: InvestmentCommitteeDossier): number | undefined {
  const terms = (item.terms || {}) as Record<string, unknown>;
  const raw = terms.requestedAmount;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

function dossierInvestmentAmount(item: InvestmentCommitteeDossier): number | undefined {
  const terms = (item.terms || {}) as Record<string, unknown>;
  const raw = terms.investmentAmount ?? terms.amount ?? terms.ticketSize;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

function dossierRoundSize(item: InvestmentCommitteeDossier): number | undefined {
  const raw = (item.terms as Record<string, unknown> | undefined)?.totalRoundSize;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

function formatDate(value: string | Date | undefined, language: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatMediumDate(date, language);
}

export interface DataRoomFocus {
  startupId: string;
  token: number;
}

interface DossierRowProps {
  item: InvestmentCommitteeDossier;
  voteStats: ProjectVoteStats;
  requiredCount?: number;
  expanded: boolean;
  flash: boolean;
  onToggle: () => void;
  onOpenProject?: (startupId: string) => void;
  startup?: Startup;
  currentOrganizationId?: string;
}

function DossierRow({
  item,
  voteStats,
  requiredCount,
  expanded,
  flash,
  onToggle,
  onOpenProject,
  startup,
  currentOrganizationId,
}: DossierRowProps) {
  const { t, i18n } = useTranslation();
  const expandable = !item.missing;
  const bodyId = `dataroom-body-${item.startupId}`;

  const requestedAmount = dossierRequestedAmount(item);
  const amount = dossierInvestmentAmount(item);
  const roundSize = dossierRoundSize(item);
  const metaLine = [item.industry, displayCountry(item.country), item.stage]
    .filter(Boolean).join(' · ');
  const managerName = item.assignedManager?.name
    || startup?.assignedManager?.name
    || item.assignedManagerName
    || '';
  const managerAvatar = item.assignedManager?.avatar || startup?.assignedManager?.avatar;

  const otherFundAmount = (status: 'approved' | 'considering') => (
    (startup?.crossFundApplications || [])
      .filter((application) => (
        application.organizationId !== currentOrganizationId
        && application.commitmentStatus === status
        && typeof application.investmentAmount === 'number'
        && application.investmentAmount > 0
      ))
      .reduce((sum, application) => sum + (application.investmentAmount || 0), 0)
  );
  const otherFundsCommitted = otherFundAmount('approved');
  const otherFundsConsidering = otherFundAmount('considering');
  const remainingToClose = otherFundsCommitted > 0
    ? Math.max(0, (Number(requestedAmount) || 0) - otherFundsCommitted)
    : 0;
  const factsLine = [
    item.smartVal?.valuation
      ? `${t('investmentCommittee.dataRoom.smartVal', 'SmartVal оценка')} ${formatAmount(item.smartVal.valuation)}`
      : '',
  ].filter(Boolean).join(' · ');
  const score = typeof item.fundGateScore === 'number' ? item.fundGateScore : undefined;
  const scoreTone: 'green' | 'amber' | 'red' = score === undefined || score >= 70
    ? 'green'
    : score >= 50 ? 'amber' : 'red';
  const notSpecified = t('investmentCommittee.shortlist.notSpecified', 'не указано');
  const decided = Boolean(item.decision && item.decision !== 'pending');

  const onHeadClick = () => {
    if (!expandable) return;
    if (window.getSelection()?.toString()) return;
    onToggle();
  };
  const onHeadKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  const openFile = (url?: string, fileName?: string) => (event: MouseEvent) => {
    event.preventDefault();
    previewDocument(url, fileName, item.startupId);
  };

  const materials: Array<{ key: string; label: string; url?: string; core: boolean; icon?: ReactNode }> = [
    { key: 'presentation', label: t('investmentCommittee.dossier.presentation', 'Презентация для защиты'), url: item.presentationUrl, core: false, icon: <PitchDeckIcon /> },
    { key: 'pitchDeck', label: t('investmentCommittee.dossier.pitchDeck', 'Pitch deck'), url: item.fileUrls?.pitchDeck, core: true, icon: <PitchDeckIcon /> },
    { key: 'onePager', label: t('investmentCommittee.dossier.onePager', 'One-pager'), url: item.fileUrls?.onePager, core: true },
    { key: 'financialModel', label: t('investmentCommittee.dossier.financialModel', 'Financial model'), url: item.fileUrls?.financialModel, core: true },
  ];
  const presentMaterials = materials.filter((m) => m.url);
  const missingCore = materials.filter((m) => m.core && !m.url);

  const docs = (item.documents || []).filter((d) => d.url);
  const aiRecommendation = (item.aiAnalysis?.recommendation || '').trim();
  const aiKind = aiRecommendationKind(aiRecommendation);
  const memoUrl = investmentMemoPreviewUrl(item.investmentMemo);
  const memoDate = formatDate(item.investmentMemo?.generatedAt, i18n.language);

  const hasSmartValNotes = Boolean(
    item.smartVal && (item.smartVal.recommendations?.length || item.smartVal.breakdown?.some((entry) => entry.comment)),
  );
  const hasDecisionDetails = decided && Boolean(item.resolution || (item.conditions || []).length);
  const hasNarrative = Boolean(hasDecisionDetails || item.managerThesis || item.aiAnalysis || hasSmartValNotes);

  const memoLinks: Array<{ key: string; label: string; url: string; fileName?: string }> = [];
  if (item.meetingMemoUrl) {
    memoLinks.push({
      key: 'meetingMemo',
      label: t('investmentCommittee.dossier.meetingMemo', 'Инвест-мемо'),
      url: item.meetingMemoUrl,
    });
  }
  if (memoUrl && memoUrl !== item.meetingMemoUrl) {
    memoLinks.push({
      key: 'investmentMemo',
      label: item.investmentMemo?.title || t('investmentCommittee.dossier.investmentMemo', 'Инвест-мемо'),
      url: memoUrl,
      fileName: investmentMemoPreviewFileName(item.investmentMemo),
    });
  }
  const websiteHref = safeExternalHref(item.website);
  const hasMaterials = Boolean(item.dataRoomUrl || websiteHref || presentMaterials.length || memoLinks.length || docs.length);

  const materialsSection = (
    <Section>
      <SectionHead>{t('investmentCommittee.dossier.materials', 'Материалы')}</SectionHead>
      {hasMaterials ? (
        <Links>
          {item.dataRoomUrl ? (
            <DataRoomLink href={item.dataRoomUrl} target="_blank" rel="noopener noreferrer">
              <Database />
              {t('investmentCommittee.dataRoom.title', 'Data Room')}
              <ExternalLink />
            </DataRoomLink>
          ) : null}
          {websiteHref ? (
            <DocLink href={websiteHref} target="_blank" rel="noopener noreferrer">
              <Globe />
              {t('investmentCommittee.dossier.website', 'Сайт')}
              <ExternalLink />
            </DocLink>
          ) : null}
          {presentMaterials.map((m) => {
            const ext = fileExtension(m.url);
            return (
              <DocLink key={m.key} href={safeCrmFileHref(m.url, item.startupId)} target="_blank" rel="noreferrer" onClick={openFile(m.url)}>
                {m.icon || null}{m.label}{ext ? <DocTag>{ext}</DocTag> : null}<ExternalLink />
              </DocLink>
            );
          })}
          {memoLinks.map((memo) => (
            <DocLink key={memo.key} href={safeCrmFileHref(memo.url, item.startupId)} target="_blank" rel="noreferrer" onClick={openFile(memo.url, memo.fileName)}>
              <InvestMemoIcon />
              {memo.label}<ExternalLink />
            </DocLink>
          ))}
          {docs.map((docItem) => {
            const ext = fileExtension(docItem.url, docItem.fileName);
            return (
              <DocLink key={docItem.id || docItem.url} href={safeCrmFileHref(docItem.url, item.startupId)} target="_blank" rel="noreferrer" onClick={openFile(docItem.url, docItem.fileName)}>
                {docItem.fileName || t('investmentCommittee.dossier.document', 'Документ')}{ext ? <DocTag>{ext}</DocTag> : null}<ExternalLink />
              </DocLink>
            );
          })}
        </Links>
      ) : null}
      {item.investmentMemo?.decision || memoDate ? (
        <Muted>
          {[
            item.investmentMemo?.decision ? memoDecisionMeta(item.investmentMemo.decision, t).label : '',
            memoDate ? t('investmentCommittee.dataRoom.memoGeneratedAt', { defaultValue: 'Сформировано {{date}}', date: memoDate }) : '',
          ].filter(Boolean).join(' · ')}
        </Muted>
      ) : null}
    </Section>
  );


  return (
    <RowCard id={`dataroom-${item.startupId}`} $flash={flash}>
      <RowHead
        $interactive={expandable}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable ? bodyId : undefined}
        onClick={onHeadClick}
        onKeyDown={expandable ? onHeadKeyDown : undefined}
      >
        <Logo src={item.logoUrl} name={item.name || '?'} variant="md" />
        <TitleBlock>
          <Name title={item.name}>{item.name}</Name>
          <Facts title={metaLine}>{metaLine || '—'}</Facts>
        </TitleBlock>
        {score !== undefined ? (
          <ScoreBadge
            $tone={scoreTone}
            data-tooltip={t(
              'investmentCommittee.dataRoom.fundGateHint',
              'Оценка FundGate — автоматический скоринг заявки по команде, рынку, продукту и финансам. От 0 до 100: чем выше, тем лучше проходит фильтр.',
            )}
          >
            {score}/100
          </ScoreBadge>
        ) : null}
        {decided ? (
          <Badge $tone={decisionMeta(item.decision, t).tone}>{decisionMeta(item.decision, t).label}</Badge>
        ) : null}
        {expandable ? (
          <ExpandToggle aria-hidden="true">
            <Chevron $open={expanded} />
          </ExpandToggle>
        ) : null}
      </RowHead>


      {item.missing ? (
        <Muted style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {t('investmentCommittee.dataRoom.missing', 'Стартап удалён — данные недоступны.')}
        </Muted>
      ) : null}

      {expandable ? (
        <CollapseShell $open={expanded} aria-hidden={!expanded}>
          <CollapseInner $open={expanded}>
        <Body id={bodyId}>
          <FactTiles>
                <FactTile>
                  <FactTileValue $empty={!amount}>
                    {amount ? formatAmount(amount) : notSpecified}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.fundAmountLabel', 'Наша инвестиция, USD')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!requestedAmount}>
                    {requestedAmount ? formatAmount(requestedAmount) : notSpecified}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.askFact', 'Запрос стартапа')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!roundSize}>
                    {roundSize ? formatAmount(roundSize) : notSpecified}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.roundFact', 'Размер раунда')}
                  </FactTileLabel>
                </FactTile>
                {otherFundsCommitted > 0 ? (
                  <FactTile>
                    <FactTileValue>{formatAmount(otherFundsCommitted)}</FactTileValue>
                    <FactTileLabel as="span">
                      {t('investmentCommittee.shortlist.otherFundsFact', 'Уже вложили другие фонды')}
                    </FactTileLabel>
                  </FactTile>
                ) : null}
                {otherFundsConsidering > 0 ? (
                  <FactTile>
                    <FactTileValue>{formatAmount(otherFundsConsidering)}</FactTileValue>
                    <FactTileLabel as="span">
                      {t('investmentCommittee.shortlist.consideringFact', 'На рассмотрении у других фондов')}
                    </FactTileLabel>
                  </FactTile>
                ) : null}
                {remainingToClose > 0 ? (
                  <FactTile>
                    <FactTileValue>{formatAmount(remainingToClose)}</FactTileValue>
                    <FactTileLabel as="span">
                      {t('investmentCommittee.shortlist.remainingFact', 'Осталось закрыть')}
                    </FactTileLabel>
                  </FactTile>
                ) : null}
              </FactTiles>

          {managerName ? (
            <Responsible>
              <ManagerAvatar name={managerName} avatar={managerAvatar} size={26} />
              <ResponsibleCopy>
                <span>{t('investmentCommittee.command.responsibleManager', 'Ответственный')}</span>
                <strong title={managerName}>{managerName}</strong>
              </ResponsibleCopy>
            </Responsible>
          ) : null}

          {factsLine ? <Facts>{factsLine}</Facts> : null}

          {item.description ? <Description>{item.description}</Description> : null}

          <FactsFlow>
            {materialsSection}
          </FactsFlow>

          {hasNarrative ? (
            <NarrativeStack>
              {hasDecisionDetails ? (
                <Section>
                  <SectionHead>{t('investmentCommittee.protocol.projectResolutionsTitle', 'Решения и условия по проектам')}</SectionHead>
                  {item.resolution ? <Prose>{item.resolution}</Prose> : null}
                  {(item.conditions || []).length ? (
                    <Prose>
                      <strong>{t('investmentCommittee.protocol.conditions', 'Условия')}:</strong> {(item.conditions || []).join('\n')}
                    </Prose>
                  ) : null}
                </Section>
              ) : null}

              {item.managerThesis ? (
                <Section>
                  <SectionHead>{t('investmentCommittee.dataRoom.thesis', 'Тезис менеджера')}</SectionHead>
                  <Thesis>{item.managerThesis}</Thesis>
                </Section>
              ) : null}

              {item.aiAnalysis ? (
                <Section>
                  <SectionHead>{t('investmentCommittee.dataRoom.aiAnalysis', 'AI-анализ FundGate')}</SectionHead>
                  {aiKind === 'enum' ? (
                    <div>
                      <Badge $tone={aiRecommendationTone(aiRecommendation)}>
                        {t(`investmentCommittee.dataRoom.recommendations.${aiRecommendation}`, aiRecommendation)}
                      </Badge>
                    </div>
                  ) : null}
                  {aiKind === 'text' ? <VerdictNote>{aiRecommendation}</VerdictNote> : null}
                  {item.aiAnalysis.strengths?.length ? (
                    <Prose>
                      <strong>{t('investmentCommittee.dataRoom.strengths', 'Сильные стороны')}:</strong> {item.aiAnalysis.strengths.join('; ')}
                    </Prose>
                  ) : null}
                  {item.aiAnalysis.weaknesses?.length ? (
                    <Prose>
                      <strong>{t('investmentCommittee.dataRoom.weaknesses', 'Слабые стороны')}:</strong> {item.aiAnalysis.weaknesses.join('; ')}
                    </Prose>
                  ) : null}
                  {([
                    ['marketAnalysis', t('investmentCommittee.dataRoom.marketAnalysis', 'Рынок')],
                    ['teamAnalysis', t('investmentCommittee.dataRoom.teamAnalysis', 'Команда')],
                    ['productAnalysis', t('investmentCommittee.dataRoom.productAnalysis', 'Продукт')],
                    ['financialAnalysis', t('investmentCommittee.dataRoom.financialAnalysis', 'Финансы')],
                  ] as const).map(([key, label]) => (
                    item.aiAnalysis?.[key] ? (
                      <Prose key={key}>
                        <strong>{label}:</strong> {item.aiAnalysis[key]}
                      </Prose>
                    ) : null
                  ))}
                </Section>
              ) : null}

              {item.smartVal && hasSmartValNotes ? (
                <Section>
                  <SectionHead>{t('investmentCommittee.dataRoom.smartValNotes', 'SmartVal — комментарии AI')}</SectionHead>
                  {item.smartVal.recommendations?.length ? (
                    <Prose>
                      <strong>{t('investmentCommittee.dataRoom.smartValRecommendations', 'Рекомендации')}:</strong> {item.smartVal.recommendations.join('; ')}
                    </Prose>
                  ) : null}
                  {(item.smartVal.breakdown || []).filter((entry) => entry.comment).map((entry) => (
                    <Prose key={entry.key}>
                      <strong>{entry.key}{typeof entry.score === 'number' ? ` (${entry.score})` : ''}:</strong> {entry.comment}
                    </Prose>
                  ))}
                </Section>
              ) : null}
            </NarrativeStack>
          ) : null}

          <RowFooter>
            {onOpenProject ? (
              <SmallButton type="button" onClick={() => onOpenProject(item.startupId)}>
                {t('investmentCommittee.dossier.openFull', 'Открыть карточку стартапа')}
                <ChevronRight />
              </SmallButton>
            ) : null}
          </RowFooter>
        </Body>
          </CollapseInner>
        </CollapseShell>
      ) : null}
    </RowCard>
  );
}

interface DataRoomPanelProps {
  meeting: InvestmentCommitteeMeeting;
  onOpenProject?: (startupId: string) => void;
  focus?: DataRoomFocus | null;
  scrollAfter?: number;
  startups?: Startup[];
}

export default function DataRoomPanel({ meeting, onOpenProject, focus, scrollAfter, startups }: DataRoomPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<InvestmentCommitteeDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [flashId, setFlashId] = useState<string | null>(null);

  const members = meeting.committee?.members || [];
  const requiredCount = meeting.committee?.requiredCount;
  const startupById = useMemo(
    () => new Map((startups || []).map((startup) => [startup.id, startup])),
    [startups],
  );
  const projectByStartup = useMemo(() => {
    const map = new Map<string, InvestmentCommitteeMeetingProject>();
    (meeting.protocol?.presentedProjects || []).forEach((project) => {
      if (project.startupId) map.set(project.startupId, project);
    });
    return map;
  }, [meeting.protocol?.presentedProjects]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    investmentCommitteeApi.getDataRoom(meeting.id)
      .then((response) => {
        if (!active) return;
        if (response.success && response.data) {
          setItems(response.data);
          const firstItem = response.data[0];
          const first = firstItem && !firstItem.missing ? firstItem.startupId : undefined;
          setExpandedIds(response.data.length >= 1 && response.data.length <= 2 && first
            ? new Set([first])
            : new Set());
        } else {
          setError(response.error || t('investmentCommittee.dataRoom.loadFailed', 'Не удалось загрузить data room'));
        }
      })
      .catch(() => active && setError(t('investmentCommittee.dataRoom.loadFailed', 'Не удалось загрузить data room')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  useEffect(() => {
    if (!focus || loading) return;
    if (!items.some((item) => item.startupId === focus.startupId)) return;
    setExpandedIds(new Set([focus.startupId]));
    setFlashId(focus.startupId);
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`dataroom-${focus.startupId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
    const flashTimer = window.setTimeout(() => setFlashId(null), 1800);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(flashTimer);
    };
  }, [focus, loading, items]);

  const toggleRow = (startupId: string) => {
    setExpandedIds((prev) => (prev.has(startupId) ? new Set() : new Set([startupId])));
  };

  const orderedItems = items;

  if (loading) {
    return (
      <Cards aria-busy="true">
        {[0, 1].map((index) => (
          <SkeletonCard key={index}>
            <SkeletonBar $w="45%" />
            <SkeletonBar $w="70%" />
            <SkeletonBar $w="30%" />
          </SkeletonCard>
        ))}
      </Cards>
    );
  }

  if (error) return <EmptyState>{error}</EmptyState>;
  if (items.length === 0) {
    return <EmptyState>{t('investmentCommittee.dataRoom.empty', 'В шортлисте пока нет проектов.')}</EmptyState>;
  }

  const capped = typeof scrollAfter === 'number' && items.length > scrollAfter;
  const rows = orderedItems.map((item) => (
    <DossierRow
      key={item.startupId}
      item={item}
      voteStats={projectVoteStats(projectByStartup.get(item.startupId), members)}
      requiredCount={requiredCount}
      expanded={expandedIds.has(item.startupId)}
      flash={flashId === item.startupId}
      onToggle={() => toggleRow(item.startupId)}
      onOpenProject={onOpenProject}
      startup={startupById.get(item.startupId)}
      currentOrganizationId={meeting.organizationId}
    />
  ));

  return capped
    ? <ScrollArea><Cards>{rows}</Cards></ScrollArea>
    : <Cards>{rows}</Cards>;
}
