import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Check, CheckCircle2, ChevronDown, ExternalLink, FileText, PenLine, RefreshCcw, Save, ScrollText, Send, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { Startup } from '../../../types';
import {
  startupsApi,
  openCrmFile,
  type InvestmentCommitteeSignatureStatus,
  type InvestmentCommitteeTrackStatus,
  type InvestmentCommitteeWorkflow,
} from '../../../services/api';

interface InvestmentCommitteePanelProps {
  startup: Startup;
  onStartupUpdate?: (startup: Startup) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  screening: 'Preliminary analysis',
  documentation: 'Document package',
  protocol: 'Protocol',
  signing: 'Signing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  not_started: 'Not started',
  in_progress: 'In progress',
  completed_track: 'Completed',
  blocked: 'Blocked',
  pending: 'Pending',
  selected: 'Selected',
  rejected: 'Rejected',
  rework: 'Rework',
  deferred: 'Deferred',
  ready: 'Ready',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  signed: 'Signed',
  scan_received: 'Scan received',
  original_received: 'Original received',
  declined: 'Declined',
};

const trackStatusOptions: InvestmentCommitteeTrackStatus[] = ['not_started', 'in_progress', 'completed', 'blocked'];
const signatureStatusOptions: InvestmentCommitteeSignatureStatus[] = ['pending', 'signed', 'scan_received', 'original_received', 'declined'];

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const Title = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const Subtitle = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  line-height: 1.5;
  margin-top: 4px;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 8px 11px;
  border-radius: 9px;
  border: 1px solid ${({ theme, $variant }) => (
    $variant === 'primary' ? theme.colors.accent.primary : theme.colors.border.primary
  )};
  background: ${({ theme, $variant }) => (
    $variant === 'primary' ? theme.colors.accent.primary : theme.colors.bg.tertiary
  )};
  color: ${({ theme, $variant }) => ($variant === 'primary' ? '#fff' : theme.colors.text.secondary)};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease, border-color 0.18s ease;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const StageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StagePill = styled.div<{ $active?: boolean; $done?: boolean }>`
  min-width: 0;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 12px;
  border: 1px solid ${({ theme, $active, $done }) => (
    $done || $active ? theme.colors.accent.primary : theme.colors.border.secondary
  )};
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.inputFocus : theme.colors.bg.tertiary)};
  padding: 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
`;

const StageStepNumber = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
`;

const StageStepTitle = styled.strong`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
  word-break: normal;
  hyphens: auto;
`;

const StageStepDescription = styled.small`
  display: block;
  margin-top: auto;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
`;

const Block = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg.primary};
  padding: 13px;
`;

const BlockTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.35px;

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 14px;
    font-weight: 700;
    outline: none;
    text-transform: none;
    letter-spacing: 0;

    &:focus {
      border-color: ${({ theme }) => theme.colors.accent.primary};
    }
  }

  textarea {
    min-height: 76px;
    resize: vertical;
  }
`;

const InlineList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const Chip = styled.span<{ $done?: boolean; $warning?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  border-radius: 999px;
  border: 1px solid ${({ theme, $done, $warning }) => {
    if ($done) return theme.colors.accent.primary;
    if ($warning) return theme.colors.status.warningBorder;
    return theme.colors.border.secondary;
  }};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 6px 9px;
  font-size: 11px;
  font-weight: 700;

  a {
    color: inherit;
    text-decoration: none;
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const SignatureTable = styled.div`
  display: grid;
  gap: 8px;
`;

const SignatureRow = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 0.9fr;
  gap: 8px;
  align-items: center;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Alert = styled.div<{ $tone?: 'error' | 'info' }>`
  border: 1px solid ${({ theme, $tone }) => ($tone === 'error' ? theme.colors.status.dangerBorder : theme.colors.border.secondary)};
  background: ${({ theme, $tone }) => ($tone === 'error' ? theme.colors.status.dangerBg : theme.colors.bg.tertiary)};
  color: ${({ theme, $tone }) => ($tone === 'error' ? theme.colors.status.danger : theme.colors.text.secondary)};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
`;

const SelectWrap = styled.div`
  position: relative;
  width: 100%;
`;

const SelectButton = styled.button<{ $open: boolean }>`
  width: 100%;
  min-height: 41px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  outline: none;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
    transition: transform 0.16s ease;
  }
`;

const SelectMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 90;
  display: ${({ $open }) => ($open ? 'grid' : 'none')};
  gap: 2px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  background: ${({ theme }) => (theme.mode === 'light' ? '#ffffff' : '#181818')};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 6px;
`;

const SelectOptionButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 36px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.accent.primary : 'transparent')};
  color: ${({ theme, $selected }) => ($selected ? '#ffffff' : theme.colors.text.primary)};
  padding: 8px 10px;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme, $selected }) => ($selected ? theme.colors.accent.primary : theme.colors.bg.tertiary)};
  }

  svg {
    width: 16px;
    height: 16px;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

function dateInputValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value && '_seconds' in value) {
    return new Date(Number((value as { _seconds: number })._seconds) * 1000).toISOString().slice(0, 10);
  }
  return '';
}

function splitLines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function lines(value?: string[]): string {
  return (value || []).join('\n');
}

function currentStage(workflow: InvestmentCommitteeWorkflow): string {
  if (workflow.status === 'completed') return 'completed';
  if (workflow.status === 'signing') return 'signing';
  if (workflow.protocol?.status === 'ready') return 'protocol';
  if (workflow.documentationPackage?.status === 'completed') return 'protocol';
  if (workflow.preliminaryAnalysis?.shortlistDecision?.decision === 'selected') return 'documentation';
  return 'screening';
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => unknown;

function translatedText(t: TranslateFn | undefined, key: string, fallback: string, options?: Record<string, unknown>): string {
  if (!t) return fallback;
  const value = t(key, { defaultValue: fallback, ...(options || {}) });
  return typeof value === 'string' ? value : fallback;
}

function statusLabel(value?: string, t?: TranslateFn): string {
  if (!value) return translatedText(t, 'common.notSpecified', 'Не указано');
  const fallback = STATUS_LABELS[value] || STATUS_LABELS[`${value}_track`] || value;
  return translatedText(t, `startups.icPanel.status.${value}`, fallback);
}

type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

interface CustomSelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}

function CustomSelect<T extends string>({ value, options, onChange, ariaLabel }: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <SelectWrap
      ref={wrapRef}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <SelectButton
        type="button"
        $open={open}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || value}</span>
        <ChevronDown />
      </SelectButton>
      <SelectMenu $open={open} role="listbox">
        {options.map((option) => {
          const selectedOption = option.value === value;
          return (
            <SelectOptionButton
              key={option.value}
              type="button"
              role="option"
              aria-selected={selectedOption}
              $selected={selectedOption}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {selectedOption ? <Check /> : <span />}
              <span>{option.label}</span>
            </SelectOptionButton>
          );
        })}
      </SelectMenu>
    </SelectWrap>
  );
}

function cloneWorkflow(workflow: InvestmentCommitteeWorkflow): InvestmentCommitteeWorkflow {
  return JSON.parse(JSON.stringify(workflow));
}

export function InvestmentCommitteePanel({ startup, onStartupUpdate }: InvestmentCommitteePanelProps) {
  const { t } = useTranslation();
  const { manager } = useAuth();
  const [workflow, setWorkflow] = useState<InvestmentCommitteeWorkflow | null>(startup.investmentCommittee || null);
  const [draft, setDraft] = useState<InvestmentCommitteeWorkflow | null>(startup.investmentCommittee || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingToCommittee, setIsSendingToCommittee] = useState(false);
  const [error, setError] = useState('');

  const managerRole = String(manager?.role || '');
  const isDirector = managerRole === 'ceo' || managerRole === 'deputy_investment' || managerRole === 'admin';
  const sentToCommitteeAt = startup.sentToCommittee?.at;

  useEffect(() => {
    let cancelled = false;
    setWorkflow(startup.investmentCommittee || null);
    setDraft(startup.investmentCommittee || null);
    setError('');

    const loadWorkflow = async () => {
      setIsLoading(true);
      try {
        const response = await startupsApi.getInvestmentCommittee(startup.id);
        if (cancelled) return;
        if (response.success && response.data) {
          setWorkflow(response.data);
          setDraft(response.data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('startups.icPanel.errors.load'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadWorkflow();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startup.id]);

  const stage = useMemo(() => draft ? currentStage(draft) : 'screening', [draft]);
  const conditionsText = useMemo(() => lines(draft?.protocol?.conditions), [draft?.protocol?.conditions]);
  const committeeChangesText = useMemo(() => lines(draft?.protocol?.committeeChanges), [draft?.protocol?.committeeChanges]);

  const applyDraft = (updater: (current: InvestmentCommitteeWorkflow) => InvestmentCommitteeWorkflow) => {
    setDraft((current) => current ? updater(cloneWorkflow(current)) : current);
  };

  const handlePrepare = async () => {
    setIsPreparing(true);
    setError('');
    try {
      const response = await startupsApi.prepareInvestmentCommittee(startup.id, {
        managerId: manager?.id,
        managerName: manager?.name,
      });
      if (!response.success || !response.data) throw new Error(response.message || response.error || 'prepare_failed');
      setWorkflow(response.data.investmentCommittee);
      setDraft(response.data.investmentCommittee);
      onStartupUpdate?.(response.data.startup as unknown as Startup);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startups.icPanel.errors.prepare'));
    } finally {
      setIsPreparing(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await startupsApi.updateInvestmentCommittee(startup.id, {
        ...draft,
        managerId: manager?.id,
        managerName: manager?.name,
      });
      if (!response.success || !response.data) throw new Error(response.message || response.error || 'save_failed');
      setWorkflow(response.data.investmentCommittee);
      setDraft(response.data.investmentCommittee);
      onStartupUpdate?.(response.data.startup as unknown as Startup);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startups.icPanel.errors.save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToCommittee = async () => {
    if (isSendingToCommittee) return;
    setIsSendingToCommittee(true);
    setError('');
    try {
      const response = await startupsApi.sendToCommittee(startup.id);
      if (!response.success || !response.data) throw new Error(response.message || response.error || 'send_failed');
      onStartupUpdate?.(response.data as unknown as Startup);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startups.icPanel.errors.send'));
    } finally {
      setIsSendingToCommittee(false);
    }
  };

  const handleExport = async () => {
    if (!draft) return;
    setIsExporting(true);
    setError('');
    try {
      const response = await startupsApi.exportInvestmentCommitteeProtocol(startup.id, {
        workflow: draft,
        managerId: manager?.id,
        managerName: manager?.name,
      });
      if (!response.success || !response.data) throw new Error(response.message || response.error || 'export_failed');
      setWorkflow(response.data.investmentCommittee);
      setDraft(response.data.investmentCommittee);
      onStartupUpdate?.(response.data.startup as unknown as Startup);
      const url = response.data.protocol?.htmlUrl || response.data.investmentCommittee.protocol?.latestExport?.htmlUrl;
      if (url) void openCrmFile(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startups.icPanel.errors.export'));
    } finally {
      setIsExporting(false);
    }
  };

  if (!draft) {
    return (
      <Panel>
        <Header>
          <div>
            <Title><ScrollText /> {t('navigation.investmentCommittee')}</Title>
            <Subtitle>
              {t('startups.icPanel.emptySubtitle')}
            </Subtitle>
          </div>
          <Actions>
            <ActionButton type="button" $variant="primary" onClick={handlePrepare} disabled={isPreparing || isLoading}>
              <RefreshCcw />
              {isPreparing ? t('startups.icPanel.preparing') : t('startups.icPanel.createProcess')}
            </ActionButton>
          </Actions>
        </Header>
        {error && <Body><Alert $tone="error">{error}</Alert></Body>}
      </Panel>
    );
  }

  const signatureMembers = draft.signatures?.members || [];
  const signedCount = signatureMembers.filter((member) => (
    member.status === 'signed' || member.status === 'scan_received' || member.status === 'original_received'
  )).length;
  const latestExportUrl = draft.protocol?.latestExport?.htmlUrl;
  const trackSelectOptions = trackStatusOptions.map((status) => ({ value: status, label: statusLabel(status, t) }));
  const decisionSelectOptions = (['pending', 'selected', 'rejected', 'rework', 'deferred'] as const)
    .map((status) => ({ value: status, label: statusLabel(status, t) }));
  const signatureSelectOptions = signatureStatusOptions.map((status) => ({ value: status, label: statusLabel(status, t) }));
  const scanSelectOptions: SelectOption<'no' | 'yes'>[] = [
    { value: 'no', label: t('startups.icPanel.options.notReceived') },
    { value: 'yes', label: t('startups.icPanel.options.received') },
  ];
  const originalSelectOptions: SelectOption<'pending' | 'received' | 'not_required'>[] = [
    { value: 'pending', label: t('startups.icPanel.options.originalPending') },
    { value: 'received', label: t('startups.icPanel.options.originalReceived') },
    { value: 'not_required', label: t('startups.icPanel.options.notRequired') },
  ];

  return (
    <Panel>
      <Header>
        <div>
          <Title><ScrollText /> {t('navigation.investmentCommittee')}</Title>
          <Subtitle>
            {t('startups.icPanel.headerMeta', {
              status: statusLabel(draft.status, t),
              signed: signedCount,
              required: draft.signatures?.requiredCount || 5,
            })}
          </Subtitle>
        </div>
        <Actions>
          {latestExportUrl && (
            <ActionButton
              as="a"
              href={latestExportUrl}
              target="_blank"
              rel="noopener noreferrer"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                void openCrmFile(latestExportUrl);
              }}
            >
              <FileText />
              {t('startups.icPanel.protocol')}
              <ExternalLink />
            </ActionButton>
          )}
          {isDirector && !sentToCommitteeAt && (
            <ActionButton type="button" $variant="primary" onClick={handleSendToCommittee} disabled={isSendingToCommittee}>
              <Send />
              {isSendingToCommittee ? t('startups.icPanel.sending') : t('startups.icPanel.sendToCommittee')}
            </ActionButton>
          )}
          {sentToCommitteeAt && (
            <ActionButton as="span" type="button" title={t('startups.icPanel.sentTitle', { date: String(sentToCommitteeAt).slice(0, 10) })}>
              <CheckCircle2 />
              {t('startups.icPanel.sentShort', { date: String(sentToCommitteeAt).slice(0, 10) })}
            </ActionButton>
          )}
          <ActionButton type="button" onClick={handleSave} disabled={isSaving}>
            <Save />
            {isSaving ? t('common.saving') : t('common.save')}
          </ActionButton>
          <ActionButton type="button" $variant="primary" onClick={handleExport} disabled={isExporting}>
            <PenLine />
            {isExporting ? t('startups.icPanel.exporting') : t('startups.icPanel.exportProtocol')}
          </ActionButton>
        </Actions>
      </Header>

      <StageGrid>
        <StagePill $active={stage === 'screening'} $done={stage !== 'screening'}>
          <StageStepNumber>1.</StageStepNumber>
          <StageStepTitle>{t('startups.icPanel.stages.screening.title')}</StageStepTitle>
          <StageStepDescription>{t('startups.icPanel.stages.screening.description')}</StageStepDescription>
        </StagePill>
        <StagePill $active={stage === 'documentation'} $done={['protocol', 'signing', 'completed'].includes(stage)}>
          <StageStepNumber>2.</StageStepNumber>
          <StageStepTitle>{t('startups.icPanel.stages.documentation.title')}</StageStepTitle>
          <StageStepDescription>{t('startups.icPanel.stages.documentation.description')}</StageStepDescription>
        </StagePill>
        <StagePill $active={stage === 'protocol'} $done={['signing', 'completed'].includes(stage)}>
          <StageStepNumber>3.</StageStepNumber>
          <StageStepTitle>{t('startups.icPanel.stages.protocol.title')}</StageStepTitle>
          <StageStepDescription>{t('startups.icPanel.stages.protocol.description')}</StageStepDescription>
        </StagePill>
        <StagePill $active={stage === 'signing'} $done={stage === 'completed'}>
          <StageStepNumber>4.</StageStepNumber>
          <StageStepTitle>{t('startups.icPanel.stages.signing.title')}</StageStepTitle>
          <StageStepDescription>{t('startups.icPanel.stages.signing.description')}</StageStepDescription>
        </StagePill>
        <StagePill $active={stage === 'completed'}>
          <StageStepNumber>5.</StageStepNumber>
          <StageStepTitle>{t('startups.icPanel.stages.originals.title')}</StageStepTitle>
          <StageStepDescription>{t('startups.icPanel.stages.originals.description')}</StageStepDescription>
        </StagePill>
      </StageGrid>

      <Body>
        {error && <Alert $tone="error">{error}</Alert>}

        <Block>
          <BlockTitle><ShieldCheck /> {t('startups.icPanel.blocks.screening')}</BlockTitle>
          <FieldGrid>
            <Field>
              <span>{t('startups.icPanel.fields.financeAnalysis')}</span>
              <CustomSelect
                value={draft.preliminaryAnalysis?.finance?.status || 'not_started'}
                options={trackSelectOptions}
                ariaLabel={t('startups.icPanel.fields.financeAnalysis')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    finance: { ...current.preliminaryAnalysis?.finance, status: value },
                  },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.technicalAnalysis')}</span>
              <CustomSelect
                value={draft.preliminaryAnalysis?.technical?.status || 'not_started'}
                options={trackSelectOptions}
                ariaLabel={t('startups.icPanel.fields.technicalAnalysis')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    technical: { ...current.preliminaryAnalysis?.technical, status: value },
                  },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.discussion')}</span>
              <textarea
                value={draft.preliminaryAnalysis?.anastasiaDiscussion?.notes || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    anastasiaDiscussion: { ...current.preliminaryAnalysis?.anastasiaDiscussion, status: 'completed', notes: event.target.value },
                  },
                }))}
                placeholder={t('startups.icPanel.placeholders.discussion')}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.shortlistDecision')}</span>
              <CustomSelect
                value={draft.preliminaryAnalysis?.shortlistDecision?.decision || 'pending'}
                options={decisionSelectOptions}
                ariaLabel={t('startups.icPanel.fields.shortlistDecision')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  status: value === 'selected' ? 'documentation' : current.status,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    shortlistDecision: {
                      ...current.preliminaryAnalysis?.shortlistDecision,
                      decision: value,
                      selected: value === 'selected',
                    },
                  },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.retainedProjects')}</span>
              <input
                type="number"
                min="0"
                value={draft.preliminaryAnalysis?.shortlistDecision?.retainedProjectCount ?? ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    shortlistDecision: {
                      ...current.preliminaryAnalysis?.shortlistDecision,
                      retainedProjectCount: event.target.value ? Number(event.target.value) : undefined,
                    },
                  },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.shortlistComment')}</span>
              <textarea
                value={draft.preliminaryAnalysis?.shortlistDecision?.rationale || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  preliminaryAnalysis: {
                    ...current.preliminaryAnalysis,
                    shortlistDecision: { ...current.preliminaryAnalysis?.shortlistDecision, rationale: event.target.value },
                  },
                }))}
              />
            </Field>
          </FieldGrid>
        </Block>

        <Block>
          <BlockTitle><FileText /> {t('startups.icPanel.blocks.documents')}</BlockTitle>
          <FieldGrid>
            <Field>
              <span>{t('startups.icPanel.fields.packageStatus')}</span>
              <CustomSelect
                value={draft.documentationPackage?.status || 'not_started'}
                options={trackSelectOptions}
                ariaLabel={t('startups.icPanel.fields.packageStatus')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  status: value === 'completed' ? 'protocol' : current.status,
                  documentationPackage: { ...current.documentationPackage, status: value },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.startupFolder')}</span>
              <input
                value={draft.documentationPackage?.folderName || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  documentationPackage: { ...current.documentationPackage, folderName: event.target.value },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.folderLink')}</span>
              <input
                value={draft.documentationPackage?.folderPath || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  documentationPackage: { ...current.documentationPackage, folderPath: event.target.value },
                }))}
              />
            </Field>
          </FieldGrid>
          <InlineList style={{ marginTop: 10 }}>
            {(draft.documentationPackage?.checklist || []).map((item) => (
              <Chip key={item.id} $done={item.status === 'done'} $warning={item.status === 'blocked'}>
                {item.status === 'done' && <CheckCircle2 />}
                {item.title}
              </Chip>
            ))}
          </InlineList>
          <InlineList style={{ marginTop: 10 }}>
            {(draft.documentationPackage?.documents || []).map((doc) => (
              <Chip key={doc.id} $done={Boolean(doc.url)}>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.preventDefault();
                      void openCrmFile(doc.url);
                    }}
                  >
                    {doc.title}
                  </a>
                ) : doc.title}
              </Chip>
            ))}
          </InlineList>
        </Block>

        <Block>
          <BlockTitle><ScrollText /> {t('startups.icPanel.blocks.protocol')}</BlockTitle>
          <FieldGrid>
            <Field>
              <span>{t('startups.icPanel.fields.protocolNumber')}</span>
              <input
                value={draft.protocol?.protocolNumber || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, protocolNumber: event.target.value },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.meetingDate')}</span>
              <input
                type="date"
                value={dateInputValue(draft.protocol?.meetingDate)}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, meetingDate: event.target.value },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.votesFor')}</span>
              <input
                type="number"
                min="0"
                value={draft.protocol?.voting?.for ?? 0}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, voting: { ...current.protocol?.voting, for: Number(event.target.value || 0) } },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.votesAgainst')}</span>
              <input
                type="number"
                min="0"
                value={draft.protocol?.voting?.against ?? 0}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, voting: { ...current.protocol?.voting, against: Number(event.target.value || 0) } },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.votesAbstain')}</span>
              <input
                type="number"
                min="0"
                value={draft.protocol?.voting?.abstain ?? 0}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, voting: { ...current.protocol?.voting, abstain: Number(event.target.value || 0) } },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.result')}</span>
              <CustomSelect
                value={draft.protocol?.voting?.result || 'pending'}
                options={decisionSelectOptions}
                ariaLabel={t('startups.icPanel.fields.result')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  status: value === 'selected' ? 'signing' : current.status,
                  protocol: { ...current.protocol, voting: { ...current.protocol?.voting, result: value } },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.conditions')}</span>
              <textarea
                value={conditionsText}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, conditions: splitLines(event.target.value) },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.adjustments')}</span>
              <textarea
                value={draft.protocol?.adjustments || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, adjustments: event.target.value },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.committeeChanges')}</span>
              <textarea
                value={committeeChangesText}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  protocol: { ...current.protocol, committeeChanges: splitLines(event.target.value) },
                }))}
              />
            </Field>
          </FieldGrid>
        </Block>

        <Block>
          <BlockTitle><Users /> {t('startups.icPanel.blocks.signing')}</BlockTitle>
          <SignatureTable>
            {signatureMembers.map((member, index) => (
              <SignatureRow key={member.id}>
                <Field>
                  <span>{t('startups.icPanel.fields.committeeMember', { index: index + 1 })}</span>
                  <input
                    value={member.name || ''}
                    onChange={(event) => applyDraft((current) => ({
                      ...current,
                      signatures: {
                        ...current.signatures,
                        members: (current.signatures?.members || []).map((item) => (
                          item.id === member.id ? { ...item, name: event.target.value } : item
                        )),
                      },
                    }))}
                    placeholder={member.isRemote ? t('startups.icPanel.placeholders.remoteMember') : t('startups.icPanel.placeholders.fullName')}
                  />
                </Field>
                <Field>
                  <span>{t('startups.icPanel.fields.signatureStatus')}</span>
                  <CustomSelect
                    value={member.status || 'pending'}
                    options={signatureSelectOptions}
                    ariaLabel={t('startups.icPanel.fields.signatureStatus')}
                    onChange={(value) => applyDraft((current) => ({
                      ...current,
                      status: value === 'pending' ? current.status : 'signing',
                      signatures: {
                        ...current.signatures,
                        members: (current.signatures?.members || []).map((item) => (
                          item.id === member.id ? { ...item, status: value } : item
                        )),
                      },
                    }))}
                  />
                </Field>
                <Field>
                  <span>{t('startups.icPanel.fields.signatureType')}</span>
                  <input
                    value={member.signatureType || ''}
                    onChange={(event) => applyDraft((current) => ({
                      ...current,
                      signatures: {
                        ...current.signatures,
                        members: (current.signatures?.members || []).map((item) => (
                          item.id === member.id ? { ...item, signatureType: event.target.value } : item
                        )),
                      },
                    }))}
                  />
                </Field>
              </SignatureRow>
            ))}
          </SignatureTable>
        </Block>

        <Block>
          <BlockTitle><PenLine /> {t('startups.icPanel.blocks.remoteMember')}</BlockTitle>
          <FieldGrid>
            <Field>
              <span>{t('startups.icPanel.fields.signatureScan')}</span>
              <CustomSelect
                value={draft.signatures?.remoteSignature?.scanReceived ? 'yes' : 'no'}
                options={scanSelectOptions}
                ariaLabel={t('startups.icPanel.fields.signatureScan')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  signatures: {
                    ...current.signatures,
                    remoteSignature: {
                      ...current.signatures?.remoteSignature,
                      scanReceived: value === 'yes',
                    },
                  },
                }))}
              />
            </Field>
            <Field>
              <span>{t('startups.icPanel.fields.original')}</span>
              <CustomSelect
                value={draft.signatures?.remoteSignature?.originalStatus || 'pending'}
                options={originalSelectOptions}
                ariaLabel={t('startups.icPanel.fields.original')}
                onChange={(value) => applyDraft((current) => ({
                  ...current,
                  signatures: {
                    ...current.signatures,
                    remoteSignature: {
                      ...current.signatures?.remoteSignature,
                      originalStatus: value,
                    },
                  },
                }))}
              />
            </Field>
            <Field $wide>
              <span>{t('startups.icPanel.fields.scanLink')}</span>
              <input
                value={draft.signatures?.remoteSignature?.scanUrl || ''}
                onChange={(event) => applyDraft((current) => ({
                  ...current,
                  signatures: {
                    ...current.signatures,
                    remoteSignature: {
                      ...current.signatures?.remoteSignature,
                      scanUrl: event.target.value,
                    },
                  },
                }))}
              />
            </Field>
          </FieldGrid>
          <Alert $tone="info" style={{ marginTop: 10 }}>
            {draft.signatures?.remoteSignature?.legalNote}
          </Alert>
        </Block>
      </Body>
    </Panel>
  );
}
