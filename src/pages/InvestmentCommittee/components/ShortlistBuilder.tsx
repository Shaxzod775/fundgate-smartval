import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Building2, ClipboardCheck, ExternalLink, FileText, FileUp, Plus, Presentation, Search, X } from 'lucide-react';
import { type InvestmentCommitteeMeeting, type Startup } from '../../../services/api';
import { previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import {
  investmentMemoPreviewFileName,
  investmentMemoPreviewUrl,
  type InvestmentMemoLinkFields,
} from '../../../utils/investmentMemoLinks';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { DataRoomLinkCard } from '../../Startups/components/DataRoomLinkCard';
import { validateDataRoomUrl } from '../../../utils/startupDataRoom';
import { hoverTooltip } from '../../../styles/tooltip';
import {
  Badge,
  Button,
  COMMITTEE_DOCUMENT_ACCEPT,
  EmptyState,
  ErrorText,
  FactTile,
  FactTileInput,
  FactTileLabel,
  FactTiles,
  Field,
  FieldLabel,
  HiddenFileInput,
  Input,
  Muted,
  Panel,
  PanelHeader,
  RequiredHint,
  SectionTitle,
  TextArea,
  fileToBase64,
  formatAmount,
} from './shared';

const FlatPanel = styled(Panel)`
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;

  @media (max-width: 480px) {
    padding: 0;
  }
`;

const CANDIDATE_SEARCH_THRESHOLD = 6;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};

  &:focus-within { border-color: ${({ theme }) => theme.colors.border.inputFocus}; }

  svg { width: 15px; height: 15px; flex-shrink: 0; color: ${({ theme }) => theme.colors.text.muted}; }
`;

const SearchInput = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:focus { outline: none; }
`;

const PickList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin: ${({ theme }) => theme.spacing[3]} 0;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const Pick = styled.label<{ $checked?: boolean }>`
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $checked, theme }) => ($checked ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ $checked, theme }) => ($checked ? `${theme.colors.accent.primary}10` : theme.colors.bg.card)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color ${({ theme }) => theme.transitions.base};

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }

  input { flex-shrink: 0; }
`;

const PickBody = styled.div`
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PickName = styled.span`
  /* Имя не должно усыхать раньше меты — сжимается именно мета. */
  flex: 0 0 auto;
  max-width: 55%;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PickMeta = styled.span`
  flex: 1 1 0;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PickLogo = styled(StartupLogo)`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;

  span { font-size: 13px; }
`;

const SelectedHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;

  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colors.accent.primary}; flex-shrink: 0; }
`;

const SelectedCount = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const SelectedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: stretch;
  max-width: 1320px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ProjectRow = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  // Панель вокруг стала прозрачной, поэтому подложка нужна самой карточке —
  // иначе выбранные проекты сливаются со страницей.
  background: ${({ theme }) => theme.colors.bg.card};
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ProjectRowHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 0;
`;

const ProjectTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const RowLogo = styled(StartupLogo)`
  width: 46px;
  height: 46px;
  border-radius: 11px;
  flex-shrink: 0;

  span { font-size: 18px; }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MaterialRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const MaterialChip = styled.button<{ $missing?: boolean; $iconOnly?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 32px;
  padding: 0 ${({ $iconOnly, theme }) => ($iconOnly ? theme.spacing[2] : theme.spacing[3])};
  border: 1px ${({ $missing }) => ($missing ? 'dashed' : 'solid')}
    ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $missing, theme }) => ($missing ? 'transparent' : theme.colors.bg.tertiary)};
  color: ${({ $missing, theme }) => ($missing ? theme.colors.text.muted : theme.colors.text.primary)};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 650;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled { cursor: not-allowed; opacity: 0.5; }

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;





const FactList = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px ${({ theme }) => theme.spacing[3]};
  margin: 0;
  align-items: baseline;
`;

const FactTerm = styled.dt`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const FactValue = styled.dd`
  margin: 0;
  text-align: right;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const GroupCaption = styled.span`
  margin-top: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`;

const FieldLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const CollapseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }

  svg { width: 14px; height: 14px; }
`;

const SplitChip = styled.div`
  display: inline-flex;
  align-items: stretch;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
`;

const SplitChipMain = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 32px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border: 0;
  border-radius: ${({ theme }) => `${theme.radius.md} 0 0 ${theme.radius.md}`};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 650;
  cursor: pointer;

  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const SplitChipAside = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  border: 0;
  border-left: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => `0 ${theme.radius.md} ${theme.radius.md} 0`};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;

  &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.text.primary}; }
  &:disabled { cursor: not-allowed; opacity: 0.5; }

  svg { width: 14px; height: 14px; }

  /* Иконка без подписи — поясняем при наведении. */
  ${hoverTooltip({ align: 'right' })}
`;

const MissingLine = styled.p`
  margin: auto 0 0;
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`;

const ProjectName = styled.h4`
  margin: 0;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProjectMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const InputsRow = styled.div`
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;





const RowFieldLabel = styled(FieldLabel)`
  text-transform: none;
  letter-spacing: normal;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
`;

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

export interface ShortlistPayload {
  title?: string;
  meetingDate?: string;
  startupIds: string[];
  theses: Record<string, string>;
  amounts: Record<string, string>;
  requestedAmounts?: Record<string, string>;
  roundSizes?: Record<string, string>;
}

interface ShortlistBuilderProps {
  meeting: InvestmentCommitteeMeeting;
  draftTitle: string;
  draftMeetingDate: string;
  candidates: Startup[];
  currentOrganizationId: string;
  currentOrganizationName: string;
  saving: boolean;
  error?: string;
  onSave: (payload: ShortlistPayload) => Promise<void>;
  onFinalize: (payload: ShortlistPayload) => Promise<void>;
  canEditDataRoomLink?: (startupId: string) => boolean;
  onDataRoomLinkChange?: (startupId: string, dataRoomUrl: string | undefined) => void;
  onUploadProjectFile?: (
    startupId: string,
    payload: { fileBase64: string; fileName: string; contentType: string },
    documentType: 'presentation' | 'invest_memo'
  ) => Promise<void>;
}

function startupDisplayName(startup: Startup): string {
  const brief = (startup as unknown as { brief?: { companyName?: string; startupName?: string } }).brief;
  return brief?.companyName || brief?.startupName || (startup as unknown as { name?: string }).name || startup.id;
}

function startupMemo(startup: Startup | undefined): InvestmentMemoLinkFields | undefined {
  return (startup as unknown as { investmentMemo?: InvestmentMemoLinkFields })?.investmentMemo;
}

function startupMemoUrl(startup: Startup | undefined): string {
  return investmentMemoPreviewUrl(startupMemo(startup));
}

function startupBriefNumber(startup: Startup | undefined, ...keys: string[]): number | undefined {
  const brief = (startup as unknown as { brief?: Record<string, unknown> })?.brief || {};
  for (const key of keys) {
    const raw = brief[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = Number(raw.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

function sanitizeAmountDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15);
}

function groupAmountDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function projectAmount(terms: Record<string, unknown> | undefined): string {
  const raw = terms?.investmentAmount;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return String(Math.round(raw));
  if (typeof raw === 'string' && raw.trim()) return sanitizeAmountDigits(raw);
  return '';
}

export function resolveRequestedAmount(
  terms: Record<string, unknown> | undefined,
  startup: Startup | undefined
): string {
  const raw = terms?.requestedAmount;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return String(Math.round(raw));
  if (typeof raw === 'string' && raw.trim()) return sanitizeAmountDigits(raw);
  const fromBrief = startupBriefNumber(startup, 'itpvFundingRequest', 'fundingRequest', 'fundingAsk');
  return fromBrief ? String(Math.round(fromBrief)) : '';
}

function resolveReviewAmount(
  terms: Record<string, unknown> | undefined,
  startup?: Startup,
): string {
  if (terms && Object.prototype.hasOwnProperty.call(terms, 'investmentAmount')) {
    return projectAmount(terms);
  }
  const raw = startup?.fundConsiderationAmount;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? String(Math.round(raw))
    : '';
}

function resolveRoundSize(terms: Record<string, unknown> | undefined, startup: Startup | undefined): number | undefined {
  const raw = terms?.totalRoundSize;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return startupBriefNumber(startup, 'totalRoundSize');
}

export default function ShortlistBuilder({
  meeting,
  draftTitle,
  draftMeetingDate,
  candidates,
  currentOrganizationId,
  currentOrganizationName,
  saving,
  error,
  onSave,
  onFinalize,
  canEditDataRoomLink,
  onDataRoomLinkChange,
  onUploadProjectFile,
}: ShortlistBuilderProps) {
  const { t } = useTranslation();
  const projects = useMemo(
    () => meeting.protocol?.presentedProjects || [],
    [meeting.protocol?.presentedProjects],
  );
  const [candidateQuery, setCandidateQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => projects.map((project) => project.startupId || '').filter(Boolean)
  );
  const [theses, setTheses] = useState<Record<string, string>>(() => Object.fromEntries(
    projects.map((project) => [project.startupId || '', project.managerThesis || ''])
  ));
  const [requestedAmounts, setRequestedAmounts] = useState<Record<string, string>>({});
  const [roundSizes, setRoundSizes] = useState<Record<string, string>>({});
  const [openTheses, setOpenTheses] = useState<Set<string>>(() => new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(
    projects.map((project) => [
      project.startupId || '',
      resolveReviewAmount(
        project.terms as Record<string, unknown>,
        candidates.find((startup) => startup.id === project.startupId),
      ),
    ])
  ));
  const [uploadError, setUploadError] = useState('');
  const [dataRoomSavingIds, setDataRoomSavingIds] = useState<Set<string>>(() => new Set());
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ startupId: string; documentType: 'presentation' | 'invest_memo' } | null>(null);

  const toggle = (startupId: string) => {
    setSelectedIds((current) => (
      current.includes(startupId) ? current.filter((id) => id !== startupId) : [...current, startupId]
    ));
    setAmounts((current) => {
      if (current[startupId] || selectedIds.includes(startupId)) return current;
      const seeded = resolveReviewAmount(
        projectById.get(startupId)?.terms as Record<string, unknown>,
        candidateById.get(startupId),
      );
      return seeded ? { ...current, [startupId]: seeded } : current;
    });
  };

  const allOptions = useMemo(() => {
    const byId = new Map<string, string>();
    candidates.forEach((startup) => byId.set(startup.id, startupDisplayName(startup)));
    projects.forEach((project) => {
      if (project.startupId && !byId.has(project.startupId)) {
        byId.set(project.startupId, project.startupName || project.startupId);
      }
    });
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [candidates, projects]);

  const candidateById = useMemo(() => new Map(candidates.map((startup) => [startup.id, startup])), [candidates]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.startupId || '', project])), [projects]);
  const optionById = useMemo(() => new Map(allOptions.map((option) => [option.id, option])), [allOptions]);
  const isDataRoomSaving = dataRoomSavingIds.size > 0;
  const hasMissingDataRoom = selectedIds.some((startupId) => {
    const startup = candidateById.get(startupId);
    return !startup || !validateDataRoomUrl(startup.dataRoomUrl || '').ok;
  });
  const isInvestmentAmountMissing = (startupId: string) => {
    const value = Number(amounts[startupId]);
    return !Number.isSafeInteger(value) || value <= 0 || value >= 1e15;
  };
  const hasMissingInvestmentAmount = selectedIds.some(isInvestmentAmountMissing);
  const visibleOptions = useMemo(() => {
    const query = candidateQuery.trim().toLocaleLowerCase();
    if (!query) return allOptions;
    return allOptions.filter((option) => {
      const startup = candidateById.get(option.id);
      const industry = typeof startup?.brief?.industry === 'string' ? startup.brief.industry : '';
      return [option.name, industry]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(query));
    });
  }, [allOptions, candidateQuery, candidateById]);

  const payload = (): ShortlistPayload => ({
    title: draftTitle,
    meetingDate: draftMeetingDate,
    startupIds: selectedIds,
    theses,
    amounts,
    requestedAmounts,
    roundSizes,
  });

  const setDataRoomSaving = (startupId: string, isSaving: boolean) => {
    setDataRoomSavingIds((current) => {
      const alreadyTracked = current.has(startupId);
      if (alreadyTracked === isSaving) return current;
      const next = new Set(current);
      if (isSaving) next.add(startupId);
      else next.delete(startupId);
      return next;
    });
  };

  const pickInfo = (id: string) => {
    const startup = candidateById.get(id) as (Startup & {
      logo?: string;
      fileUrls?: { logo?: string };
      sentToCommittee?: { byName?: string };
    }) | undefined;
    const project = projectById.get(id);
    const askNum = startupBriefNumber(startup, 'itpvFundingRequest', 'fundingRequest', 'fundingAsk');
    return {
      name: optionById.get(id)?.name || project?.startupName || id,
      logo: startup?.logo || startup?.fileUrls?.logo || project?.logoUrl || '',
      industry: startup?.brief?.industry || project?.industry || '',
      ask: askNum ? formatAmount(askNum) : '',
      manager: project?.assignedManagerName || startup?.sentToCommittee?.byName || '',
    };
  };

  const requestUpload = (startupId: string, documentType: 'presentation' | 'invest_memo') => {
    pendingUploadRef.current = { startupId, documentType };
    uploadInputRef.current?.click();
  };

  const handleUploadFile = async (file: File | undefined) => {
    const pending = pendingUploadRef.current;
    pendingUploadRef.current = null;
    if (!file || !pending || !onUploadProjectFile) return;
    setUploadError('');
    try {
      if (!projectById.has(pending.startupId)) {
        await onSave(payload());
      }
      const fileBase64 = await fileToBase64(file);
      await onUploadProjectFile(
        pending.startupId,
        { fileBase64, fileName: file.name, contentType: file.type || 'application/octet-stream' },
        pending.documentType
      );
    } catch {
      setUploadError(t('investmentCommittee.shortlist.uploadFailed', 'Не удалось загрузить файл'));
    } finally {
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  return (
    <FlatPanel>
      {allOptions.length > CANDIDATE_SEARCH_THRESHOLD ? (
        <SearchRow>
          <Search aria-hidden="true" />
          <SearchInput
            type="search"
            value={candidateQuery}
            placeholder={t('investmentCommittee.shortlist.searchPlaceholder', 'Поиск по стартапам')}
            aria-label={t('investmentCommittee.shortlist.searchPlaceholder', 'Поиск по стартапам')}
            onChange={(event) => setCandidateQuery(event.target.value)}
          />
        </SearchRow>
      ) : null}

      {allOptions.length === 0 ? (
        <EmptyState style={{ marginTop: 16 }}>{t('investmentCommittee.shortlist.noCandidates')}</EmptyState>
      ) : visibleOptions.length === 0 ? (
        <EmptyState style={{ marginTop: 16 }}>{t('investmentCommittee.shortlist.noMatches', 'Ничего не найдено')}</EmptyState>
      ) : (
        <PickList>
          {visibleOptions.map((option) => {
            const info = pickInfo(option.id);
            const meta = [
              info.industry,
              info.ask ? `${t('investmentCommittee.dataRoom.ask', 'Запрос')}: ${info.ask}` : '',
              info.manager ? `${t('investmentCommittee.shortlist.manager', 'Менеджер')}: ${info.manager}` : '',
            ].filter(Boolean).join(' · ');
            return (
              <Pick key={option.id} $checked={selectedIds.includes(option.id)}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  disabled={saving || isDataRoomSaving}
                  onChange={() => toggle(option.id)}
                />
                <PickLogo src={info.logo} name={info.name} variant="sm" />
                <PickBody>
                  <PickName title={info.name}>{info.name}</PickName>
                  {meta ? <PickMeta title={meta}>{meta}</PickMeta> : null}
                </PickBody>
              </Pick>
            );
          })}
        </PickList>
      )}

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SelectedHeader>
            <Building2 />
            {t('investmentCommittee.shortlist.selectedTitle', 'Выбранные стартапы')}
            <SelectedCount>{selectedIds.length}</SelectedCount>
          </SelectedHeader>
          <SelectedGrid>
          {selectedIds.map((startupId) => {
            const project = projectById.get(startupId);
            const info = pickInfo(startupId);
            const startup = candidateById.get(startupId);
            const terms = project?.terms as Record<string, unknown> | undefined;
            const requestedAmount = resolveRequestedAmount(terms, startup);
            const memoUrl = project?.investmentMemoUrl || startupMemoUrl(candidateById.get(startupId));
            const presentationUrl = project?.presentationUrl || '';
            const canUpload = Boolean(onUploadProjectFile) && !saving && !isDataRoomSaving;
            const amountMissing = isInvestmentAmountMissing(startupId);
            const thesisOpen = openTheses.has(startupId) || Boolean(theses[startupId]);
            const roundSizeSource = resolveRoundSize(terms, startup);
            const roundSizeEdited = roundSizes[startupId];
            const roundSizeValue = roundSizeEdited !== undefined
              ? roundSizeEdited
              : (roundSizeSource ? String(Math.round(roundSizeSource)) : '');
            const roundSize = Number(roundSizeValue) || 0;
            const requestedEdited = requestedAmounts[startupId];
            const requestedValue = requestedEdited !== undefined ? requestedEdited : requestedAmount;
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
            const requestedTotal = Number(requestedAmount) || 0;
            const remainingToClose = otherFundsCommitted > 0
              ? Math.max(0, requestedTotal - otherFundsCommitted)
              : 0;
            const metaParts = [
              project?.assignedManagerName
                ? `${t('investmentCommittee.shortlist.manager', 'Менеджер')}: ${project.assignedManagerName}`
                : '',
            ].filter(Boolean);
            const missingParts = [
              amountMissing ? t('investmentCommittee.shortlist.missingAmount', 'наша инвестиция') : '',
              memoUrl ? '' : t('investmentCommittee.shortlist.missingMemo', 'инвест-мемо'),
              validateDataRoomUrl(startup?.dataRoomUrl || '').ok
                ? ''
                : t('investmentCommittee.shortlist.missingDataRoom', 'ссылка на Data Room'),
            ].filter(Boolean);
            return (
              <ProjectRow key={startupId}>
                <ProjectRowHeader>
                  <ProjectTitle>
                    <RowLogo src={info.logo} name={info.name} variant="sm" />
                    <ProjectName title={info.name}>{info.name}</ProjectName>
                  </ProjectTitle>
                  <ProjectMeta>{metaParts.join(' · ')}</ProjectMeta>
                </ProjectRowHeader>


                <FactTiles>
                  <FactTile>
                    <FactTileInput
                      id={`shortlist-draft-amount-${startupId}`}
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      aria-required="true"
                      aria-invalid={amountMissing || undefined}
                      placeholder="500 000"
                      data-tooltip={t('investmentCommittee.shortlist.fundAmountHint', 'Сколько рассматриваем вложить в этот стартап')}
                      value={amounts[startupId] ? `$${groupAmountDigits(amounts[startupId])}` : ''}
                      onChange={(event) => setAmounts((current) => ({
                        ...current,
                        [startupId]: sanitizeAmountDigits(event.target.value),
                      }))}
                    />
                    <FactTileLabel htmlFor={`shortlist-draft-amount-${startupId}`} $required>
                      {t('investmentCommittee.shortlist.fundAmountLabel', 'Наша инвестиция, USD')}
                    </FactTileLabel>
                  </FactTile>
                  <FactTile>
                    <FactTileInput
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={t('investmentCommittee.shortlist.askFact', 'Запрос стартапа')}
                      placeholder={t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                      value={requestedValue ? `$${groupAmountDigits(requestedValue)}` : ''}
                      onChange={(event) => setRequestedAmounts((current) => ({
                        ...current,
                        [startupId]: sanitizeAmountDigits(event.target.value),
                      }))}
                    />
                    <FactTileLabel>{t('investmentCommittee.shortlist.askFact', 'Запрос стартапа')}</FactTileLabel>
                  </FactTile>
                  <FactTile>
                    <FactTileInput
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={t('investmentCommittee.shortlist.roundFact', 'Размер раунда')}
                      placeholder={t('investmentCommittee.shortlist.notSpecified', 'не указано')}
                      value={roundSizeValue ? `$${groupAmountDigits(roundSizeValue)}` : ''}
                      onChange={(event) => setRoundSizes((current) => ({
                        ...current,
                        [startupId]: sanitizeAmountDigits(event.target.value),
                      }))}
                    />
                    <FactTileLabel>{t('investmentCommittee.shortlist.roundFact', 'Размер раунда')}</FactTileLabel>
                  </FactTile>
                </FactTiles>

                {(otherFundsCommitted > 0 || otherFundsConsidering > 0 || remainingToClose > 0) ? (
                  <FactList>
                    {otherFundsCommitted > 0 ? (
                      <>
                        <FactTerm>{t('investmentCommittee.shortlist.otherFundsFact', 'Уже вложили другие фонды')}</FactTerm>
                        <FactValue>{formatAmount(otherFundsCommitted)}</FactValue>
                      </>
                    ) : null}
                    {otherFundsConsidering > 0 ? (
                      <>
                        <FactTerm>{t('investmentCommittee.shortlist.consideringFact', 'На рассмотрении у других фондов')}</FactTerm>
                        <FactValue>{formatAmount(otherFundsConsidering)}</FactValue>
                      </>
                    ) : null}
                    {remainingToClose > 0 ? (
                      <>
                        <FactTerm>{t('investmentCommittee.shortlist.remainingFact', 'Осталось закрыть')}</FactTerm>
                        <FactValue>{formatAmount(remainingToClose)}</FactValue>
                      </>
                    ) : null}
                  </FactList>
                ) : null}

                {startup ? (
                  <GroupCaption>{t('investmentCommittee.shortlist.groupDataRoom', 'Data Room стартапа')}</GroupCaption>
                ) : null}
                {startup ? (
                  <DataRoomLinkCard
                    startupId={startupId}
                    dataRoomUrl={startup.dataRoomUrl}
                    canEdit={canEditDataRoomLink?.(startupId) ?? false}
                    disabled={saving || dataRoomSavingIds.has(startupId)}
                    compact
                    ariaLabel={`Data Room — ${info.name}`}
                    onChange={(dataRoomUrl) => onDataRoomLinkChange?.(startupId, dataRoomUrl)}
                    onSavingChange={(isSaving) => setDataRoomSaving(startupId, isSaving)}
                  />
                ) : null}

                <GroupCaption>{t('investmentCommittee.shortlist.groupMeeting', 'К заседанию')}</GroupCaption>
                <MaterialRow>
                  {thesisOpen ? null : (
                    <MaterialChip
                      type="button"
                      $missing
                      aria-expanded={false}
                      onClick={() => setOpenTheses((current) => new Set(current).add(startupId))}
                    >
                      <Plus />
                      {t('investmentCommittee.shortlist.thesisShort', 'Тезис')}
                    </MaterialChip>
                  )}

                  {memoUrl ? (
                    <SplitChip>
                      <SplitChipMain
                        type="button"
                        onClick={() => previewDocument(
                          memoUrl,
                          investmentMemoPreviewFileName(startupMemo(candidateById.get(startupId))),
                          startupId,
                        )}
                      >
                        <FileText />
                        {t('investmentCommittee.shortlist.memoChip', 'Инвест-мемо')}
                        <ExternalLink />
                      </SplitChipMain>
                      <SplitChipAside
                        type="button"
                        disabled={!canUpload}
                        data-tooltip={t('investmentCommittee.shortlist.replaceMemo', 'Заменить мемо')}
                        aria-label={t('investmentCommittee.shortlist.replaceMemo', 'Заменить мемо')}
                        onClick={() => requestUpload(startupId, 'invest_memo')}
                      >
                        <FileUp aria-hidden="true" />
                      </SplitChipAside>
                    </SplitChip>
                  ) : (
                    <MaterialChip
                      type="button"
                      $missing
                      disabled={!canUpload}
                      onClick={() => requestUpload(startupId, 'invest_memo')}
                    >
                      <Plus />
                      {t('investmentCommittee.shortlist.memoChip', 'Инвест-мемо')}
                    </MaterialChip>
                  )}

                  {presentationUrl ? (
                    <SplitChip>
                      <SplitChipMain
                        type="button"
                        onClick={() => previewDocument(presentationUrl)}
                      >
                        <Presentation />
                        {t('investmentCommittee.shortlist.presentationChip', 'Pitch deck')}
                        <ExternalLink />
                      </SplitChipMain>
                      <SplitChipAside
                        type="button"
                        disabled={!canUpload}
                        data-tooltip={t('investmentCommittee.shortlist.replacePitchDeck', 'Заменить pitch deck')}
                        aria-label={t('investmentCommittee.shortlist.replacePitchDeck', 'Заменить pitch deck')}
                        onClick={() => requestUpload(startupId, 'presentation')}
                      >
                        <FileUp aria-hidden="true" />
                      </SplitChipAside>
                    </SplitChip>
                  ) : (
                    <MaterialChip
                      type="button"
                      $missing
                      disabled={!canUpload}
                      onClick={() => requestUpload(startupId, 'presentation')}
                    >
                      <Plus />
                      {t('investmentCommittee.shortlist.presentationChip', 'Презентация')}
                    </MaterialChip>
                  )}
                </MaterialRow>

                {thesisOpen ? (
                  <Field>
                    <FieldLabelRow>
                      <RowFieldLabel>{t('investmentCommittee.shortlist.thesisShort', 'Тезис')}</RowFieldLabel>
                      {theses[startupId] ? null : (
                        <CollapseButton
                          type="button"
                          title={t('investmentCommittee.shortlist.collapseThesis', 'Свернуть')}
                          aria-label={t('investmentCommittee.shortlist.collapseThesis', 'Свернуть')}
                          onClick={() => setOpenTheses((current) => {
                            const next = new Set(current);
                            next.delete(startupId);
                            return next;
                          })}
                        >
                          <X aria-hidden="true" />
                        </CollapseButton>
                      )}
                    </FieldLabelRow>
                    <TextArea
                      autoFocus={!theses[startupId]}
                      style={{ minHeight: 64 }}
                      placeholder={t('investmentCommittee.shortlist.thesisPlaceholder')}
                      value={theses[startupId] || ''}
                      onChange={(event) => setTheses((current) => ({ ...current, [startupId]: event.target.value }))}
                    />
                  </Field>
                ) : null}

                {missingParts.length ? (
                  <MissingLine>
                    {t('investmentCommittee.shortlist.missingLine', 'Не хватает: {{list}}', {
                      list: missingParts.join(', '),
                    })}
                  </MissingLine>
                ) : null}
              </ProjectRow>
            );
          })}
          </SelectedGrid>
        </div>
      )}

      <HiddenFileInput
        ref={uploadInputRef}
        type="file"
        accept={COMMITTEE_DOCUMENT_ACCEPT}
        onChange={(event) => handleUploadFile(event.target.files?.[0])}
      />

      {(error || uploadError) ? (
        <ErrorText style={{ marginTop: 12 }}>{error || uploadError}</ErrorText>
      ) : null}

      <FooterRow>
        <Button
          type="button"
          onClick={() => onSave(payload())}
          disabled={saving || isDataRoomSaving}
        >
          {t('investmentCommittee.shortlist.save')}
        </Button>
        <Button
          type="button"
          $variant="primary"
          onClick={() => onFinalize(payload())}
          disabled={saving || isDataRoomSaving || selectedIds.length === 0 || hasMissingDataRoom || hasMissingInvestmentAmount}
          title={hasMissingDataRoom
            ? t('investmentCommittee.shortlist.dataRoomRequired', 'Добавьте ссылку на Data Room для каждого выбранного стартапа')
            : hasMissingInvestmentAmount
              ? t('investmentCommittee.shortlist.amountRequired', 'Укажите сумму фонда для каждого выбранного стартапа')
              : undefined}
        >
          <ClipboardCheck />
          {t('investmentCommittee.shortlist.finalize')}
        </Button>
      </FooterRow>
    </FlatPanel>
  );
}
