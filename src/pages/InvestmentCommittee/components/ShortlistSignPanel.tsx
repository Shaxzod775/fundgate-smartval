import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Check, Database, Download, ExternalLink, FileText, Save } from 'lucide-react';
import styled from 'styled-components';
import { numberLocale } from '../../../utils/formatNumber';
import { hoverTooltip } from '../../../styles/tooltip';
import {
  type InvestmentCommitteeFileRef,
  type InvestmentCommitteeMeeting,
  type InvestmentCommitteeMeetingProject,
  type Startup,
} from '../../../services/api';
import { openDocPreview, previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { InvestMemoIcon, PitchDeckIcon, SignedDocIcon, UnsignedDocIcon } from '../../../components/ui/DocIcons';
import { investmentMemoPreviewUrl } from '../../../utils/investmentMemoLinks';
import { downloadCrmFile, safeCrmFileHref } from '../../../services/api';
import { useToast } from '../../../components/ui/Toast/useToast';
import FundingProgress, { localizedFundingProgressLabels } from './FundingProgress';
import {
  Button,
  COMMITTEE_DOCUMENT_ACCEPT,
  ErrorText,
  HiddenFileInput,
  InfoBanner,
  FactTile,
  FactTileInput,
  FactTileLabel,
  FactTiles,
  FactTileValue,
  Muted,
  Panel,
  fileToBase64,
} from './shared';

const MAX_INVESTMENT_AMOUNT = 1e15;

const DOC_FETCHED_KEY = 'ic-shortlist-doc-fetched';

function readFetchedExportId(): string {
  try {
    return window.localStorage.getItem(DOC_FETCHED_KEY) || '';
  } catch {
    return '';
  }
}

interface ShortlistSignPanelProps {
  meeting: InvestmentCommitteeMeeting;
  startups: Startup[];
  currentOrganizationId: string;
  currentOrganizationName: string;
  canReview: boolean;
  canReopen: boolean;
  busy: boolean;
  error?: string;
  onSaveAmounts: (payload: {
    expectedShortlistExportId: string;
    amounts: Record<string, number>;
  }) => Promise<boolean>;
  onUploadSigned: (payload: {
    fileBase64: string;
    fileName: string;
    contentType: string;
    shortlistExportId: string;
  }) => Promise<InvestmentCommitteeFileRef | void>;
  onReview: (action: 'approve' | 'request_changes', comment?: string) => Promise<void>;
  onReopen: () => Promise<void>;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value < MAX_INVESTMENT_AMOUNT) {
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isInteger(parsed) && parsed > 0 && parsed < MAX_INVESTMENT_AMOUNT ? parsed : undefined;
}

function amountDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15);
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString(numberLocale())}`;
}

function formatAmountInput(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function startupName(project: InvestmentCommitteeMeetingProject, startup?: Startup): string {
  const brief = startup?.brief as Record<string, unknown> | undefined;
  return String(project.startupName || brief?.companyName || brief?.startupName || project.startupId || 'Startup');
}

function startupLogoUrl(project: InvestmentCommitteeMeetingProject, startup?: Startup): string {
  const raw = startup as (Startup & { logo?: string; fileUrls?: { logo?: string } }) | undefined;
  return raw?.logo || raw?.fileUrls?.logo || project.logoUrl || '';
}

function requestedAmount(project: InvestmentCommitteeMeetingProject, startup?: Startup): number | undefined {
  const terms = (project.terms || {}) as Record<string, unknown>;
  const snapshot = positiveInteger(terms.requestedAmount);
  if (snapshot) return snapshot;
  const brief = (startup?.brief || {}) as Record<string, unknown>;
  return positiveInteger(brief.itpvFundingRequest ?? brief.fundingRequest ?? brief.fundingAsk);
}

function roundSizeOf(project: InvestmentCommitteeMeetingProject, startup?: Startup): number | undefined {
  const terms = (project.terms || {}) as Record<string, unknown>;
  const snapshot = positiveInteger(terms.totalRoundSize);
  if (snapshot) return snapshot;
  const brief = (startup?.brief || {}) as Record<string, unknown>;
  return positiveInteger(brief.totalRoundSize);
}

function serverAmount(project: InvestmentCommitteeMeetingProject): number | undefined {
  return positiveInteger((project.terms as Record<string, unknown> | undefined)?.investmentAmount);
}

function amountSignature(projects: InvestmentCommitteeMeetingProject[]): string {
  return JSON.stringify(projects.map((project) => [project.startupId || '', serverAmount(project) || null]));
}

function amountsFromSignature(signature: string): Record<string, string> {
  const rows = JSON.parse(signature) as Array<[string, number | null]>;
  return Object.fromEntries(rows.map(([startupId, amount]) => [startupId, amount ? String(amount) : '']));
}

export default function ShortlistSignPanel({
  meeting,
  startups,
  currentOrganizationId,
  currentOrganizationName,
  canReview,
  canReopen,
  busy,
  error,
  onSaveAmounts,
  onUploadSigned,
  onReview,
  onReopen,
}: ShortlistSignPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');
  const projects = useMemo(() => meeting.protocol?.presentedProjects || [], [meeting.protocol?.presentedProjects]);
  const startupById = useMemo(() => new Map(startups.map((startup) => [startup.id, startup])), [startups]);
  const exportId = meeting.shortlist?.latestExport?.id || '';
  const exportUrl = meeting.shortlist?.latestExport?.htmlUrl;
  const pendingDocument = meeting.shortlist?.pendingDocument;
  const serverSignature = amountSignature(projects);
  const [amounts, setAmounts] = useState<Record<string, string>>(() => amountsFromSignature(serverSignature));

  useEffect(() => {
    setAmounts(amountsFromSignature(serverSignature));
  }, [serverSignature]);

  const serverAmounts = amountsFromSignature(serverSignature);
  const parsedAmounts: Record<string, number> = {};
  let amountsValid = projects.length > 0;
  for (const project of projects) {
    const startupId = project.startupId || '';
    const amount = positiveInteger(amounts[startupId]);
    if (!startupId || !amount) amountsValid = false;
    else parsedAmounts[startupId] = amount;
  }
  const amountsDirty = projects.some((project) => {
    const startupId = project.startupId || '';
    return (amounts[startupId] || '') !== (serverAmounts[startupId] || '');
  });
  const confirmedExportId = meeting.shortlist?.amountsConfirmedExportId || '';
  const amountsConfirmed = Boolean(exportId && confirmedExportId === exportId);
  const amountsNeedSaving = amountsDirty || !amountsConfirmed;
  const canEditAmounts = canReview && !pendingDocument;
  const uploadReady = canReview
    && amountsValid
    && !amountsDirty
    && amountsConfirmed
    && Boolean(exportId);
  const exportCurrent = Boolean(exportUrl)
    && !amountsDirty
    && amountsConfirmed;
  const canUpload = uploadReady && !busy;
  const canOpenExport = exportCurrent && !busy;

  const exportBaseName = t('investmentCommittee.shortlistSign.step2Title', 'Документ на подпись');
  const exportExtension = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(exportUrl || '')?.[1];
  const exportFileName = exportExtension ? `${exportBaseName}.${exportExtension.toLowerCase()}` : exportBaseName;

  const [documentFetched, setDocumentFetched] = useState(() => readFetchedExportId() === exportId && Boolean(exportId));

  useEffect(() => {
    setDocumentFetched(Boolean(exportId) && readFetchedExportId() === exportId);
  }, [exportId]);

  const markDocumentFetched = () => {
    setDocumentFetched(true);
    if (!exportId) return;
    try {
      window.localStorage.setItem(DOC_FETCHED_KEY, exportId);
    } catch {
    }
  };

  const previewAndConfirm = (file: InvestmentCommitteeFileRef) => {
    if (!file.url) return;
    openDocPreview(file.url, file.fileName, {
      confirmLabel: t('investmentCommittee.shortlistSign.confirmAndContinue'),
      onConfirm: () => { void onReview('approve'); },
    });
  };

  const saveAmounts = async () => {
    setLocalError('');
    if (!exportId || !amountsValid || pendingDocument) {
      setLocalError(t('investmentCommittee.shortlistSign.amountsInvalid', 'Укажите положительную сумму фонда для каждого проекта.'));
      return;
    }
    const saved = await onSaveAmounts({
      expectedShortlistExportId: exportId,
      amounts: parsedAmounts,
    });
    if (!saved) {
      setLocalError(t('investmentCommittee.shortlistSign.amountsSaveFailed', 'Не удалось зафиксировать суммы. Обновите страницу и повторите.'));
      return;
    }
    toast.success(t('investmentCommittee.shortlistSign.amountsSaved', 'Шортлист переформирован — можно подписывать'));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError('');
    if (inputRef.current) inputRef.current.value = '';
    if (!canUpload) {
      setLocalError(t('investmentCommittee.shortlistSign.saveAmountsFirst', 'Сначала обновите шортлист с текущими суммами и скачайте его.'));
      return;
    }
    try {
      const fileBase64 = await fileToBase64(file);
      const uploadedFile = await onUploadSigned({
        fileBase64,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        shortlistExportId: exportId,
      });
      if (uploadedFile?.url) previewAndConfirm(uploadedFile);
    } catch {
      setLocalError(t('investmentCommittee.shortlistSign.uploadFailed'));
    }
  };

  const amountsStepDone = canReview && amountsValid && !amountsNeedSaving;
  const documentTaken = Boolean(pendingDocument) || documentFetched;
  const uploadStepState: 'done' | 'now' | 'todo' = pendingDocument
    ? 'done'
    : uploadReady && documentTaken ? 'now' : 'todo';
  const stepDesc = (state: 'done' | 'now' | 'todo', text: string) => ({
    inline: state === 'now' ? text : '',
    tooltip: state === 'now' ? undefined : text,
  });
  const step1State: 'done' | 'now' = amountsStepDone ? 'done' : 'now';
  const step2State: 'done' | 'now' | 'todo' = !exportCurrent
    ? 'todo'
    : documentTaken ? 'done' : 'now';
  const step1Desc = stepDesc(step1State, pendingDocument
    ? t('investmentCommittee.shortlistSign.pendingLocksAmounts', 'Подписанный файл уже загружен — суммы заблокированы.')
    : amountsStepDone
      ? t('investmentCommittee.shortlistSign.amountsConfirmed', 'Суммы фонда зафиксированы в текущей версии документа.')
      : t('investmentCommittee.shortlistSign.confirmAmountsHint', 'Проверьте и зафиксируйте суммы перед подписью.'));
  const step2Desc = stepDesc(step2State, t('investmentCommittee.shortlistSign.step2Desc', 'Откройте, распечатайте и подпишите.'));
  const step3Desc = stepDesc(uploadStepState, t('investmentCommittee.shortlistSign.step3Desc', 'После подтверждения заседание уйдёт на голосование.'));

  return (
    <FlatPanel>
      {!canReview ? (
        <InfoBanner $tone="amber">
          <AlertCircle />
          <span>{t('investmentCommittee.shortlistSign.waitingHint')}</span>
        </InfoBanner>
      ) : null}

      {meeting.shortlist?.finalizedByName ? (
        <Muted style={{ marginTop: 8 }}>
          {t('investmentCommittee.shortlistSign.finalizedBy', {
            name: meeting.shortlist.finalizedByName,
            date: (meeting.shortlist.finalizedAt || '').slice(0, 10),
          })}
        </Muted>
      ) : null}

      <Projects>
        {projects.map((project) => {
          const startupId = project.startupId || '';
          const startup = startupById.get(startupId);
          const request = requestedAmount(project, startup);
          const ourAmount = positiveInteger(amounts[startupId]);
          const fundName = currentOrganizationName
            || t('investmentCommittee.funding.currentFund', 'Текущий фонд');
          const roundSize = roundSizeOf(project, startup);
          const rawStartup = startup as (Startup & { fileUrls?: { pitchDeck?: string } }) | undefined;
          const pitchDeckUrl = rawStartup?.fileUrls?.pitchDeck || '';
          const memoUrl = project.investmentMemoUrl
            || investmentMemoPreviewUrl((startup as unknown as { investmentMemo?: Record<string, unknown> })?.investmentMemo)
            || '';
          const hasOtherFunds = (startup?.crossFundApplications?.length || 0) > 0;
          return (
            <ProjectCard key={startupId || startupName(project, startup)}>
              <ProjectHead>
                <ProjectLogo
                  src={startupLogoUrl(project, startup)}
                  name={startupName(project, startup)}
                  variant="sm"
                />
                <ProjectName title={startupName(project, startup)}>
                  {startupName(project, startup)}
                </ProjectName>
              </ProjectHead>

              <FactTiles>
                <FactTile>
                  <FactTileInput
                    id={`shortlist-fund-amount-${startupId}`}
                    aria-label={t('investmentCommittee.shortlist.fundAmountLabel', 'Наша инвестиция, USD')}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="50 000"
                    value={formatAmountInput(amounts[startupId] || '')}
                    disabled={!canEditAmounts || busy}
                    onChange={(event) => setAmounts((current) => ({
                    ...current,
                    [startupId]: amountDigits(event.target.value),
                  }))}
                  />
                  <FactTileLabel htmlFor={`shortlist-fund-amount-${startupId}`}>
                    {t('investmentCommittee.shortlist.fundAmountLabel', 'Наша инвестиция, USD')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!request}>
                    {request
                      ? formatMoney(request)
                      : t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.askFact', 'Запрос стартапа')}
                  </FactTileLabel>
                </FactTile>
                <FactTile>
                  <FactTileValue $empty={!roundSize}>
                    {roundSize
                      ? formatMoney(roundSize)
                      : t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                  </FactTileValue>
                  <FactTileLabel as="span">
                    {t('investmentCommittee.shortlist.roundFact', 'Размер раунда')}
                  </FactTileLabel>
                </FactTile>
              </FactTiles>

              <MaterialRow>
                {startup?.dataRoomUrl ? (
                  <MaterialChip $accent href={startup.dataRoomUrl} target="_blank" rel="noopener noreferrer">
                    <Database aria-hidden="true" />
                    {t('investmentCommittee.dataRoom.title', 'Data Room')}
                    <ExternalLink aria-hidden="true" />
                  </MaterialChip>
                ) : null}
                {pitchDeckUrl ? (
                  <MaterialChip
                    href={safeCrmFileHref(pitchDeckUrl, startupId)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => { event.preventDefault(); previewDocument(pitchDeckUrl, undefined, startupId); }}
                  >
                    <PitchDeckIcon />
                    {t('investmentCommittee.dossier.pitchDeck', 'Pitch deck')}
                    <ExternalLink aria-hidden="true" />
                  </MaterialChip>
                ) : null}
                {memoUrl ? (
                  <MaterialChip
                    href={safeCrmFileHref(memoUrl, startupId)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => { event.preventDefault(); previewDocument(memoUrl, undefined, startupId); }}
                  >
                    <InvestMemoIcon />
                    {t('investmentCommittee.dossier.meetingMemo', 'Инвест-мемо')}
                    <ExternalLink aria-hidden="true" />
                  </MaterialChip>
                ) : null}
              </MaterialRow>

              {hasOtherFunds ? (
                <FundingProgress
                  requestedAmount={request}
                  currentFundId={currentOrganizationId}
                  currentFundName={fundName}
                  currentFundAmount={ourAmount}
                  currentFundStatus="considering"
                  otherApplications={startup?.crossFundApplications}
                  labels={localizedFundingProgressLabels(t)}
                />
              ) : null}

              {hasOtherFunds ? null : (
                <Muted>{t('investmentCommittee.shortlistSign.noOtherFunds', 'Другие фонды в этом раунде не участвуют — разбивка появится, когда появятся.')}</Muted>
              )}
            </ProjectCard>
          );
        })}
      </Projects>

      {canReview ? (
        <Steps>
          <Step $state={step1State}>
            <StepMarker $state={step1State}>{amountsStepDone ? <Check /> : 1}</StepMarker>
            <StepBody>
              <StepTitle $state={step1State} data-tooltip={step1Desc.tooltip}>
                {t('investmentCommittee.shortlistSign.step1Title', 'Суммы фонда')}
              </StepTitle>
              {step1Desc.inline ? <StepDesc>{step1Desc.inline}</StepDesc> : null}
              {amountsNeedSaving ? (
                <Button
                  type="button"
                  $variant="primary"
                  disabled={busy || !canEditAmounts || !amountsValid}
                  onClick={() => { void saveAmounts(); }}
                >
                  <Save />
                  {t('investmentCommittee.shortlistSign.saveAmounts', 'Сформировать документ на подпись')}
                </Button>
              ) : null}
            </StepBody>
          </Step>

          <Step $state={step2State}>
            <StepMarker $state={step2State}>{step2State === 'done' ? <Check /> : 2}</StepMarker>
            <StepBody>
              <StepTitle $state={step2State} data-tooltip={step2Desc.tooltip}>
                {t('investmentCommittee.shortlistSign.step2Title', 'Документ на подпись')}
              </StepTitle>
              {step2Desc.inline ? <StepDesc>{step2Desc.inline}</StepDesc> : null}
              <StepActions>
                <Button
                  type="button"
                  $variant={step2State === 'now' ? 'primary' : undefined}
                  disabled={!exportUrl || !canOpenExport}
                  onClick={() => {
                    if (exportUrl && canOpenExport) {
                      previewDocument(exportUrl, exportFileName);
                      markDocumentFetched();
                    }
                  }}
                >
                  <UnsignedDocIcon />
                  {t('investmentCommittee.shortlistSign.openDocument', 'Открыть')}
                </Button>
                <Button
                  type="button"
                  disabled={!exportUrl || !canOpenExport}
                  onClick={() => {
                    if (exportUrl && canOpenExport) {
                      void downloadCrmFile(exportUrl, exportFileName);
                      markDocumentFetched();
                    }
                  }}
                >
                  <Download />
                  {t('investmentCommittee.shortlistSign.downloadDocument', 'Скачать')}
                </Button>
              </StepActions>
            </StepBody>
          </Step>

          <Step $state={uploadStepState}>
            <StepMarker $state={uploadStepState}>{pendingDocument ? <Check /> : 3}</StepMarker>
            <StepBody>
              <StepTitle $state={uploadStepState} data-tooltip={step3Desc.tooltip}>
                {t('investmentCommittee.shortlistSign.step3Title', 'Подписанный скан')}
              </StepTitle>
              {step3Desc.inline ? <StepDesc>{step3Desc.inline}</StepDesc> : null}
              {pendingDocument ? (
                <UploadedDocument>
                  <FileText />
                  <UploadedDocumentCopy>
                    <span>{t('investmentCommittee.shortlistSign.uploadedSignedFile', 'Загруженный подписанный шортлист')}</span>
                    <strong title={pendingDocument.fileName}>{pendingDocument.fileName || '—'}</strong>
                  </UploadedDocumentCopy>
                </UploadedDocument>
              ) : null}
              <StepActions>
                {pendingDocument?.url ? (
                  <Button type="button" $variant="primary" disabled={busy} onClick={() => previewAndConfirm(pendingDocument)}>
                    <FileText />
                    {t('investmentCommittee.shortlistSign.previewAndConfirm')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  $variant={uploadStepState === 'now' ? 'primary' : undefined}
                  disabled={!canUpload}
                  onClick={() => inputRef.current?.click()}
                >
                  <SignedDocIcon />
                  {pendingDocument
                    ? t('investmentCommittee.shortlistSign.uploadAnotherSigned', 'Загрузить другой подписанный шортлист')
                    : t('investmentCommittee.shortlistSign.uploadSigned')}
                </Button>
              </StepActions>
              <HiddenFileInput
                ref={inputRef}
                type="file"
                accept={COMMITTEE_DOCUMENT_ACCEPT}
                disabled={!canUpload}
                onChange={(event) => { void handleFile(event.target.files?.[0]); }}
              />
            </StepBody>
          </Step>
        </Steps>
      ) : exportUrl ? (
        <DocumentActions>
          <Button
            type="button"
            disabled={!canOpenExport}
            onClick={() => {
              if (canOpenExport) previewDocument(exportUrl, exportFileName);
            }}
          >
            <UnsignedDocIcon />
            {t('investmentCommittee.shortlistSign.openDocument')}
          </Button>
        </DocumentActions>
      ) : null}

      {canReopen ? (
        <DocumentActions>
          <Button type="button" disabled={busy} onClick={onReopen}>
            <ArrowLeft />
            {t('investmentCommittee.shortlistSign.backToDraft')}
          </Button>
        </DocumentActions>
      ) : null}

      {(error || localError) ? <ErrorText style={{ marginTop: 12 }}>{error || localError}</ErrorText> : null}
    </FlatPanel>
  );
}

const FlatPanel = styled(Panel)`
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;

  @media (max-width: 480px) {
    padding: 0;
  }
`;

const Projects = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const ProjectCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
`;

const ProjectHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const ProjectLogo = styled(StartupLogo)`
  width: 46px;
  height: 46px;
  border-radius: 11px;
  flex-shrink: 0;

  span { font-size: 18px; }
`;

const MaterialRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const MaterialChip = styled.a<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $accent, theme }) => ($accent ? theme.colors.accent.primary : theme.colors.border.primary)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ $accent, theme }) => ($accent ? theme.colors.accent.primary : theme.colors.text.primary)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 650;
  text-decoration: none;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const ProjectName = styled.h3`
  margin: 0;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;





const Steps = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const Step = styled.div<{ $state: 'done' | 'now' | 'todo' }>`
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} 0;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 41px;
    bottom: -19px;
    width: 2px;
    border-radius: ${({ theme }) => theme.radius.full};
    /* Пройденный отрезок — сплошной, впереди — пунктир: на тёмном фоне
       сплошная линия такой яркости почти не видна, а пунктир читается
       узором и без контраста. */
    background: ${({ theme, $state }) => (
      $state === 'done'
        ? 'rgba(16,185,129,0.4)'
        : `repeating-linear-gradient(to bottom, ${theme.colors.text.tertiary} 0 3px, transparent 3px 7px)`
    )};
  }
`;

const StepMarker = styled.div<{ $state: 'done' | 'now' | 'todo' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 3px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 800;
  border: 1px solid ${({ theme, $state }) => (
    $state === 'done' ? 'rgba(16,185,129,0.4)' : $state === 'now' ? theme.colors.accent.primary : 'transparent'
  )};
  background: ${({ theme, $state }) => (
    $state === 'done'
      ? 'rgba(16,185,129,0.16)'
      : $state === 'now'
        ? theme.colors.accent.primary
        : theme.colors.bg.secondary
  )};
  color: ${({ theme, $state }) => (
    $state === 'done' ? theme.colors.accent.primary : $state === 'now' ? '#04231a' : theme.colors.text.muted
  )};

  svg {
    width: 15px;
    height: 15px;
  }
`;

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const StepTitle = styled.h4<{ $state: 'done' | 'now' | 'todo' }>`
  align-self: flex-start;
  margin: 0;
  ${hoverTooltip({ wrap: true })}
  color: ${({ theme, $state }) => (
    $state === 'now' ? theme.colors.text.primary
      : $state === 'done' ? theme.colors.text.secondary
        : theme.colors.text.muted
  )};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 650;
`;

const StepDesc = styled.p`
  margin: 0;
  max-width: 640px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StepActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const DocumentActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const UploadedDocument = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};

  > svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const UploadedDocumentCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 0;

  span {
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }

  strong {
    overflow: hidden;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
