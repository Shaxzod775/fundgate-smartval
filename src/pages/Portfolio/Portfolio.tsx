import { Fragment, createContext, useCallback, useContext, useMemo, useRef, useState, useEffect, useLayoutEffect, type KeyboardEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Calculator,
  Check,
  ChevronDown,
  Circle,
  Code,
  Columns3,
  Download,
  DollarSign,
  ExternalLink,
  FileText,
  Flame,
  Globe,
  History,
  ListChecks,
  Maximize2,
  Minimize2,
  PencilLine,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Startup } from '../../types';
import { CrmImage } from '../../components/ui/CrmImage';
import {
  cabinetApi,
  managerApi,
  openCrmFile,
  organizationApi,
  safeCrmFileHref,
  startupsApi,
  type PortfolioSettings,
  type QuarterlyReport,
  type QuarterlyReportDigest,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import { PortfolioSkeleton } from './PortfolioSkeleton';
import { formatCountryName, COUNTRIES_EN } from '../Startups/components/AddStartupWizard/constants';
import { QuarterlyMetricsCharts } from '../../components/charts/QuarterlyMetricsCharts';
import { safeExternalHref } from '../../utils/safeUrl';
import { formatDayMonthTime, formatLongDate, formatMonthYearShort } from '../../utils/formatDate';
import { numberLocale } from '../../utils/formatNumber';
import {
  calculatePortfolioScores,
  portfolioScoreStatusToHealthFlag,
  type PortfolioHealthFlag,
  type PortfolioScores,
} from './portfolioScoring';
import {
  calculateAnnualGrossMargin,
  calculateCurrentRatio,
  calculateDebtToEquity,
  calculateEbitda,
  calculateEbitdaMargin,
  calculateGrossMargin,
  calculateGrowthFromHistory,
  calculateMoic,
  calculateNetBurn,
  calculateNetProfit,
  calculateOwnership,
  calculatePostMoneyValuation,
  calculateProfitMargin,
  calculateRunway,
  deriveRecurringRevenue,
  type PortfolioGrowthPeriod,
} from './portfolioFormulas';
import {
  readStoredPortfolioRatio,
  resolveFundRoundValuations,
  withPortfolioInvestmentSourceIndices,
} from './portfolioCapTable';
import {
  firstStoredPortfolioRatio,
  parseLegacyPortfolioRatio,
} from './portfolioRatios';
import { resolveStartupUnitEconomics } from './portfolioUnitEconomics';
import {
  calculatePortfolioDashboardSummary,
  createEmptyPortfolioQuickFilters,
  filterPortfolioDashboardRows,
  getPortfolioDashboardFilterOptions,
  type PortfolioQuickFilters,
} from './portfolioDashboard';
import { PortfolioQuickFilters as PortfolioQuickFiltersControl } from './components/PortfolioQuickFilters';
import { PortfolioColumnManager } from './components/PortfolioColumnManager';
import {
  DEFAULT_PORTFOLIO_COLUMN_PREFERENCES,
  calculateVisiblePortfolioColumnsWidth,
  getPortfolioColumnWidth,
  getVisiblePortfolioColumnIds,
  normalizePortfolioColumnPreferences,
  type PortfolioColumnId,
  type PortfolioColumnPreferences,
} from './portfolioColumns';
import {
  buildPortfolioExportSheet,
  portfolioExportFileName,
  type PortfolioExportRow,
  type PortfolioExportValue,
} from './portfolioExport';
import {
  DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS,
  PORTFOLIO_SEGMENTS,
  classifyPortfolioSegment,
  getPortfolioSegmentFilter,
  getPortfolioSegmentLabel,
  normalizePortfolioSegmentThresholds,
  type PortfolioSegment,
  type PortfolioSegmentFilter,
  type PortfolioSegmentThresholds,
  type PortfolioSegmentThresholdSettings,
} from './portfolioSegments';
import { formatSmartValValuation } from '../../utils/smartValValuation';

export const DEFAULT_PORTFOLIO_SETTINGS = {
  fundDisplayName: 'FundGate Fund',
  reportingPeriod: '',
  baseCurrency: 'USD',
  usdToUzs: 12_700,
  usdToKzt: 450,
  runwayGreen: 12,
  runwayYellow: 6,
  momGreen: 0.1,
  momYellow: 0,
  moicGreen: 2,
  moicYellow: 1,
  churnGreen: 0.02,
  churnYellow: 0.05,
  followOnRunway: 9,
  followOnMoic: 3,
  segmentThresholds: DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS,
};

type EffectivePortfolioSettings = Omit<typeof DEFAULT_PORTFOLIO_SETTINGS, 'segmentThresholds'> & {
  segmentThresholds: PortfolioSegmentThresholdSettings;
};
type NumericPortfolioSetting = Exclude<
  keyof EffectivePortfolioSettings,
  'fundDisplayName' | 'reportingPeriod' | 'baseCurrency' | 'segmentThresholds'
>;

type TrafficStatus = 'green' | 'yellow' | 'red' | 'gray';
type PortfolioSection = 'dashboard' | 'startup-card' | 'cap-table' | 'traction' | 'settings';
type BubbleSizeMetric = 'invested' | 'valuation' | 'moic' | 'mrr';
type BubbleStatusFilter = 'all' | TrafficStatus;
type HealthOverrideValue = '' | Exclude<TrafficStatus, 'gray'>;

const PORTFOLIO_SECTIONS: Array<{
  id: PortfolioSection;
  labelKey: string;
  labelFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  icon: LucideIcon;
}> = [
  {
    id: 'dashboard',
    labelKey: 'portfolio.sections.dashboard.label',
    labelFallback: 'Portfolio Dashboard',
    descriptionKey: 'portfolio.sections.dashboard.description',
    descriptionFallback: 'Сводка, вложения, оценки и статус портфельных компаний',
    icon: BarChart3,
  },
  {
    id: 'startup-card',
    labelKey: 'portfolio.sections.startupCard.label',
    labelFallback: 'Карточка стартапа',
    descriptionKey: 'portfolio.sections.startupCard.description',
    descriptionFallback: 'Паспорт выбранной портфельной компании',
    icon: BriefcaseBusiness,
  },
  {
    id: 'cap-table',
    labelKey: 'portfolio.sections.capTable.label',
    labelFallback: 'Cap Table & Timeline',
    descriptionKey: 'portfolio.sections.capTable.description',
    descriptionFallback: 'Доля фонда, раунды и ключевые события',
    icon: Users,
  },
  {
    id: 'traction',
    labelKey: 'portfolio.sections.traction.label',
    labelFallback: 'Traction Tracker',
    descriptionKey: 'portfolio.sections.traction.description',
    descriptionFallback: 'MRR, клиенты, burn, runway и квартальная динамика',
    icon: Activity,
  },
  {
    id: 'settings',
    labelKey: 'portfolio.sections.settings.label',
    labelFallback: 'Настройки',
    descriptionKey: 'portfolio.sections.settings.description',
    descriptionFallback: 'Пороговые правила и источники данных',
    icon: Settings,
  },
];

const BUBBLE_SIZE_LABEL_KEYS: Record<BubbleSizeMetric, { key: string; fallback: string }> = {
  invested: { key: 'portfolio.bubble.size.invested', fallback: 'Вложено' },
  valuation: { key: 'portfolio.bubble.size.valuation', fallback: 'Текущая оценка' },
  moic: { key: 'portfolio.bubble.size.moic', fallback: 'MOIC' },
  mrr: { key: 'portfolio.bubble.size.mrr', fallback: 'MRR' },
};

const BUBBLE_STATUS_LABEL_KEYS: Record<BubbleStatusFilter, { key: string; fallback: string }> = {
  all: { key: 'portfolio.bubble.status.all', fallback: 'Все' },
  green: { key: 'portfolio.status.green', fallback: 'Зелёные' },
  yellow: { key: 'portfolio.status.yellow', fallback: 'Внимание' },
  red: { key: 'portfolio.status.red', fallback: 'Критично' },
  gray: { key: 'portfolio.status.gray', fallback: 'Нет данных' },
};

function getPortfolioSectionFromPath(pathname: string): PortfolioSection {
  const sectionSlug = pathname.split('/').filter(Boolean).pop();
  return PORTFOLIO_SECTIONS.some((section) => section.id === sectionSlug)
    ? sectionSlug as PortfolioSection
    : 'dashboard';
}

function getPortfolioSectionPath(section: PortfolioSection): string {
  return `/portfolio/${section}`;
}

function getCurrentQuarterLabel(date = new Date()): string {
  return `Q${Math.floor(date.getMonth() / 3) + 1}-${date.getFullYear()}`;
}

function coerceSettingNumber(value: unknown, fallback: number, min = 0): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(',', '.'))
      : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function normalizePortfolioSettings(
  settings?: PortfolioSettings,
  fallbackFundName = ''
): EffectivePortfolioSettings {
  return {
    ...DEFAULT_PORTFOLIO_SETTINGS,
    fundDisplayName: (settings?.fundDisplayName || fallbackFundName || DEFAULT_PORTFOLIO_SETTINGS.fundDisplayName).trim(),
    reportingPeriod: (settings?.reportingPeriod || getCurrentQuarterLabel()).trim(),
    baseCurrency: (settings?.baseCurrency || DEFAULT_PORTFOLIO_SETTINGS.baseCurrency).trim().toUpperCase() || 'USD',
    usdToUzs: coerceSettingNumber(settings?.usdToUzs, DEFAULT_PORTFOLIO_SETTINGS.usdToUzs, 1),
    usdToKzt: coerceSettingNumber(settings?.usdToKzt, DEFAULT_PORTFOLIO_SETTINGS.usdToKzt, 1),
    runwayGreen: coerceSettingNumber(settings?.runwayGreen, DEFAULT_PORTFOLIO_SETTINGS.runwayGreen),
    runwayYellow: coerceSettingNumber(settings?.runwayYellow, DEFAULT_PORTFOLIO_SETTINGS.runwayYellow),
    momGreen: coerceSettingNumber(settings?.momGreen, DEFAULT_PORTFOLIO_SETTINGS.momGreen),
    momYellow: coerceSettingNumber(settings?.momYellow, DEFAULT_PORTFOLIO_SETTINGS.momYellow, -100),
    moicGreen: coerceSettingNumber(settings?.moicGreen, DEFAULT_PORTFOLIO_SETTINGS.moicGreen),
    moicYellow: coerceSettingNumber(settings?.moicYellow, DEFAULT_PORTFOLIO_SETTINGS.moicYellow),
    churnGreen: coerceSettingNumber(settings?.churnGreen, DEFAULT_PORTFOLIO_SETTINGS.churnGreen),
    churnYellow: coerceSettingNumber(settings?.churnYellow, DEFAULT_PORTFOLIO_SETTINGS.churnYellow),
    followOnRunway: coerceSettingNumber(settings?.followOnRunway, DEFAULT_PORTFOLIO_SETTINGS.followOnRunway),
    followOnMoic: coerceSettingNumber(settings?.followOnMoic, DEFAULT_PORTFOLIO_SETTINGS.followOnMoic),
    segmentThresholds: normalizePortfolioSegmentThresholds(settings?.segmentThresholds),
  };
}

function toPercentInput(value: number): string {
  return String(Number((value * 100).toFixed(4)));
}

export interface PortfolioRow {
  startup: Startup;
  number: number;
  name: string;
  industry: string;
  segment: PortfolioSegment;
  segmentOverride?: PortfolioSegment;
  stage: string;
  country: string;
  reportDate: string;
  entryDate: Date | null;
  investmentType: string;
  investedUsd?: number;
  investedUzs?: number;
  ownership?: number;
  entryValuation?: number;
  currentValuation?: number;
  reportedValuationUsd?: number;
  explicitMoic?: number;
  moic?: number;
  mrr?: number;
  arr?: number;
  cac?: number;
  ltvCac?: number;
  yoyGrowth?: number;
  qoqGrowth?: number;
  runway?: number;
  runwayInfinite: boolean;
  momGrowth?: number;
  grossMargin?: number;
  ebitdaMargin?: number;
  currentRatio?: number;
  ebitda?: number;
  payingCustomers?: number;
  netProfit?: number;
  netMargin?: number;
  churnRate?: number;
  burnRate?: number;
  cashAtBank?: number;
  totalDebt?: number;
  debtToEquity?: number;
  scores: PortfolioScores;
  calculatedFields: Partial<Record<PortfolioColumnId, string>>;
  responsiblePerson: string;
  managerId?: string;
  managerName?: string;
  portfolioType: 'direct' | 'program';
  status: TrafficStatus;
  autoStatus: TrafficStatus;
  healthOverride?: Exclude<TrafficStatus, 'gray'>;
}

interface PortfolioDashboardChangeLogItem {
  id: string;
  activityId: string;
  fieldKey: string;
  startupId: string;
  startupName: string;
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  managerName: string;
  changedAt: Date | null;
}

const PORTFOLIO_FIELD_COLUMN_ID: Record<string, string> = {
  name: 'name', segment: 'segment', industry: 'industry', country: 'country', reportDate: 'reportDate',
  stage: 'stage', entryDate: 'entryDate', investmentType: 'investmentType',
  investedUsd: 'investedUsd', investedUzs: 'investedUzs', ownership: 'ownership',
  entryValuation: 'entryValuation', currentValuation: 'currentValuation', moic: 'moic',
  mrr: 'mrr', arr: 'arr', cac: 'cac', yoyGrowth: 'yoyGrowth', qoqGrowth: 'qoqGrowth',
  momGrowth: 'momGrowth', grossMargin: 'grossMargin', ebitdaMargin: 'ebitdaMargin',
  runway: 'runway', currentRatio: 'currentRatio', ebitda: 'ebitda',
  payingCustomers: 'payingCustomers', netProfit: 'netProfit', netMargin: 'netMargin',
  burnRate: 'burnRate', cashAtBank: 'cashAtBank', totalDebt: 'totalDebt',
  debtToEquity: 'debtToEquity', healthOverride: 'status', status: 'status',
  responsiblePerson: 'responsiblePerson',
};

interface CapTableWorkbookRow {
  id: string;
  startupId: string;
  startupName: string;
  investor: string;
  round: string;
  date: Date | null;
  amountUsd?: number;
  preMoney?: number;
  postMoney?: number;
  ownership?: number;
  currentValuation?: number;
  moic?: number;
  type: string;
  status: TrafficStatus;
  isFund: boolean;
  isFounder: boolean;
}

type TractionMetricId = 'mrr' | 'cogs' | 'arr' | 'activeClients' | 'burnRate' | 'runway' | 'churnRate';

interface TractionWorkbookRow {
  startupId: string;
  startupName: string;
  status: TrafficStatus;
  values: Record<string, number | undefined>;
  momGrowth?: number;
}

interface TractionWorkbookTable {
  id: TractionMetricId;
  title: string;
  subtitle: string;
  aggregate: 'sum' | 'average';
  rows: TractionWorkbookRow[];
  totals: Record<string, number | undefined>;
  totalMomGrowth?: number;
}

type EditableCellType = 'text' | 'number' | 'date' | 'select';

interface EditableCellOption {
  value: string;
  label: string;
}

interface EditableCellProps {
  value: string;
  displayValue?: string;
  type?: EditableCellType;
  options?: EditableCellOption[];
  align?: 'left' | 'center' | 'right';
  strong?: boolean;
  disabled?: boolean;
  formula?: string;
  tone?: 'default' | 'blue' | 'green' | 'warning' | 'danger';
  onSave: (value: string) => Promise<unknown> | void;
}

interface MetricDisplayRow {
  label: string;
  value: string;
  source?: string;
}

const INVESTMENT_TYPE_OPTIONS: EditableCellOption[] = [
  { value: 'Direct', label: 'Direct' },
  { value: 'Accelerator', label: 'Accelerator' },
];

const CAP_TABLE_TYPE_OPTIONS: EditableCellOption[] = [
  { value: 'Common', label: 'Common' },
  { value: 'Equity', label: 'Equity' },
  { value: 'SAFE', label: 'SAFE' },
  { value: 'Preferred', label: 'Preferred' },
  { value: 'Accelerator', label: 'Accelerator' },
];

const COUNTRY_OPTIONS: EditableCellOption[] = [
  { value: '', label: '—' },
  ...COUNTRIES_EN.map((name) => ({ value: name, label: name })),
];

function buildCountryOptions(current: string): EditableCellOption[] {
  if (current && !COUNTRY_OPTIONS.some((option) => option.value === current)) {
    return [
      { value: '', label: '—' },
      { value: current, label: current },
      ...COUNTRY_OPTIONS.slice(1),
    ];
  }
  return COUNTRY_OPTIONS;
}

function parseEditableNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[%$]/g, '')
    .replace(/\b(usd|uzs|kzt|мес\.?|x)\b/gi, '')
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (!cleaned || cleaned === '-' || cleaned === '—') return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) throw new Error('invalid_number');
  return parsed;
}

function sanitizeNumericInput(raw: string): string {
  const negative = raw.startsWith('-');
  let body = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const firstDot = body.indexOf('.');
  if (firstDot !== -1) {
    body = body.slice(0, firstDot + 1) + body.slice(firstDot + 1).replace(/\./g, '');
  }
  return (negative ? '-' : '') + body;
}

function groupNumericString(raw: string): string {
  if (!raw || raw === '-') return raw;
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const dotIndex = body.indexOf('.');
  const intPart = dotIndex === -1 ? body : body.slice(0, dotIndex);
  const rest = dotIndex === -1 ? '' : body.slice(dotIndex);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (negative ? '-' : '') + grouped + rest;
}

function caretPositionForDigits(formatted: string, digitsLeft: number): number {
  if (digitsLeft <= 0) return formatted.startsWith('-') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitsLeft) return i + 1;
    }
  }
  return formatted.length;
}

function toIsoDateInput(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
}

function getMetricFieldName(metricId: TractionMetricId): string {
  if (metricId === 'activeClients') return 'activeClients';
  return metricId;
}

const PortfolioReadOnlyContext = createContext(false);

export function EditableCell({
  value,
  displayValue,
  type = 'text',
  options = [],
  align = 'left',
  strong = false,
  disabled = false,
  formula,
  tone = 'default',
  onSave,
}: EditableCellProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const forceReadOnly = useContext(PortfolioReadOnlyContext);
  const fieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const caretRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditing) setDraft(type === 'number' ? groupNumericString(sanitizeNumericInput(value)) : value);
  }, [isEditing, value, type]);

  useLayoutEffect(() => {
    if (caretRef.current != null && fieldRef.current instanceof HTMLInputElement) {
      const pos = caretRef.current;
      caretRef.current = null;
      fieldRef.current.setSelectionRange(pos, pos);
    }
  });

  useEffect(() => {
    if (isEditing && hasError) {
      const el = fieldRef.current;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement && (type === 'text' || type === 'number')) {
          el.select();
        }
      }
    }
  }, [isEditing, hasError, type]);

  const handleChange = (next: string, caret: number | null = null) => {
    if (type === 'number') {
      const grouped = groupNumericString(sanitizeNumericInput(next));
      if (caret != null) {
        const digitsLeft = next.slice(0, caret).replace(/\D/g, '').length;
        caretRef.current = caretPositionForDigits(grouped, digitsLeft);
      }
      setDraft(grouped);
    } else {
      setDraft(next);
    }
    if (hasError) setHasError(false);
  };

  const close = () => {
    setDraft(value);
    setIsEditing(false);
    setHasError(false);
  };

  const commit = async () => {
    if (disabled || isSaving) return;
    const nextValue = type === 'number' ? sanitizeNumericInput(draft) : draft.trim();
    const baseline = type === 'number' ? sanitizeNumericInput(value) : value.trim();
    if (nextValue === baseline) {
      setIsEditing(false);
      setHasError(false);
      return;
    }
    if (type === 'number') {
      try {
        parseEditableNumber(nextValue);
      } catch {
        setHasError(true);
        return;
      }
    }
    setIsSaving(true);
    try {
      await onSave(nextValue);
      setIsEditing(false);
      setHasError(false);
    } catch (error) {
      console.error('Failed to save portfolio cell:', error);
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const titleIfClipped = (el: HTMLElement, fallback = '') => {
    const full = String(displayValue ?? value ?? '').trim();
    if (full && el.scrollWidth > el.clientWidth + 1) el.title = full;
    else if (fallback) el.title = fallback;
    else el.removeAttribute('title');
  };

  if (disabled || forceReadOnly) {
    return (
      <EditableCellStatic
        $align={align}
        $strong={strong}
        $tone={tone}
        data-formula={formula || undefined}
        onMouseEnter={(e) => titleIfClipped(e.currentTarget, formula ? `ƒx ${formula}` : '')}
      >
        {displayValue || value || '-'}
      </EditableCellStatic>
    );
  }

  if (isEditing) {
    if (type === 'select') {
      return (
        <EditableCellSelect
          ref={(el) => { fieldRef.current = el; }}
          value={draft}
          autoFocus
          $align={align}
          $hasError={hasError}
          disabled={isSaving}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKeyDown}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </EditableCellSelect>
      );
    }

    return (
      <EditableCellInput
        ref={(el) => { fieldRef.current = el; }}
        value={draft}
        type={type === 'number' ? 'text' : type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        autoFocus
        size={Math.max(String(draft).length + 1, 6)}
        $align={align}
        $hasError={hasError}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value, event.target.selectionStart)}
        onBlur={() => void commit()}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <EditableCellButton
      type="button"
      $align={align}
      $strong={strong}
      $tone={tone}
      $hasError={hasError}
      disabled={isSaving}
      onMouseEnter={(e) => titleIfClipped(e.currentTarget, t('portfolio.editable.clickToEdit', 'Нажмите, чтобы изменить'))}
      onClick={() => setIsEditing(true)}
    >
      {isSaving ? t('common.saving', 'Сохраняю...') : (displayValue || value || '-')}
    </EditableCellButton>
  );
}

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1860px;
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: visible;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 900px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 6px 0;
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  max-width: 760px;
  line-height: 1.55;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const MetricIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $color }) => `${$color}18`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    color: ${({ $color }) => $color};
  }
`;

const MetricInfo = styled.div`
  min-width: 0;
`;

const MetricValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
`;

const MetricLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  margin-top: 4px;
`;

const MetricMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SectionTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    display: flex;
    overflow-x: auto;
    padding-bottom: 4px;
  }
`;

const SectionTab = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.border.primary};
  background: ${({ $active, theme }) => $active ? theme.colors.accent.primaryLight : theme.colors.bg.card};
  color: ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 13px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  @media (max-width: 1200px) {
    min-width: 240px;
  }
`;

const TabTitle = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TabDescription = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const DashboardCard = styled.section<{ $fullscreen?: boolean; $flat?: boolean }>`
  background: ${({ theme, $flat }) => $flat ? 'transparent' : theme.colors.bg.card};
  border: ${({ theme, $flat }) => $flat ? '0' : `1px solid ${theme.colors.border.primary}`};
  border-radius: ${({ theme, $flat }) => $flat ? '0' : theme.radius.lg};
  overflow: ${({ $flat }) => $flat ? 'visible' : 'hidden'};

  ${({ $fullscreen, theme }) => $fullscreen ? `
    position: fixed;
    inset: 0;
    z-index: 110;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    border: 0;
    border-radius: 0;
    background: ${theme.mode === 'dark' ? '#111312' : '#ffffff'};
  ` : ''}
`;

const DashboardHeader = styled.div<{ $flat?: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: ${({ $flat }) => $flat ? '0 0 16px' : '20px'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  flex: 0 0 auto;

  @media (max-width: 820px) {
    flex-direction: column;
  }
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 18px;
  font-weight: 700;
`;

const SectionDescription = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  line-height: 1.55;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  flex: 0 0 auto;
`;

const SearchInput = styled.label`
  flex: 1 1 260px;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 15px;
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  input {
    width: 100%;
    height: 46px;
    padding: 0 16px 0 46px;
    background: ${({ theme }) => theme.colors.bg.input};
    border: 1px solid ${({ theme }) => theme.colors.border.input};
    border-radius: ${({ theme }) => theme.radius.md};
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: 14px;
    outline: none;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }

    &:focus {
      border-color: ${({ theme }) => theme.colors.border.inputFocus};
      box-shadow: ${({ theme }) => theme.shadows.focus};
    }
  }
`;

const ToolbarNote = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  white-space: nowrap;

  @media (max-width: 820px) {
    justify-content: flex-start;
    white-space: normal;
  }
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
`;

const DashboardWorkspace = styled.div`
  min-width: 0;
`;

const DashboardWorkspaceMain = styled.div`
  min-width: 0;
`;

const DashboardFiltersDrawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 150;
  width: min(390px, calc(100vw - 48px));
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-left: 1px solid ${({ theme }) => theme.colors.border.primary};
  box-shadow: -18px 0 44px rgba(0, 0, 0, 0.32);
  opacity: ${({ $open }) => $open ? 1 : 0};
  transform: translateX(${({ $open }) => $open ? '0' : '100%'});
  pointer-events: ${({ $open }) => $open ? 'auto' : 'none'};
  visibility: ${({ $open }) => $open ? 'visible' : 'hidden'};
  transition:
    opacity 180ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear ${({ $open }) => $open ? '0s' : '280ms'};

  & > * {
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
`;

const EditModeButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.border.primary)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.bg.card)};
  color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.text.primary)};
  padding: 0 13px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
  }

  svg {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
  }
`;

const TableScroller = styled.div<{ $editing?: boolean; $fullscreen?: boolean }>`
  width: 100%;
  min-width: 0;
  overflow: auto;
  /* Show 15 rows (~63px each) + the sticky 2-line header; the rest scroll
     inside the table. A sliver of row 16 stays visible as a scroll hint. */
  max-height: calc(15 * 63px + 50px);
  overflow-y: auto;
  box-shadow: ${({ $editing }) => ($editing ? 'inset 0 0 0 1px rgba(22, 192, 143, 0.22)' : 'none')};

  ${({ $fullscreen }) => $fullscreen ? `
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
  ` : ''}

  @media (max-width: 1100px) {
    overflow-x: auto;
  }
`;

const RiskMatrixEmpty = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
`;

const ChartLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
`;

const BubbleMapWrap = styled.div`
  padding: 20px;
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr) 280px;
  gap: 16px;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`;

const BubblePanel = styled.div`
  min-width: 0;
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : '#161918'};
  border: 1px solid ${({ theme }) => theme.mode === 'light' ? '#d7e1dc' : 'rgba(255, 255, 255, 0.09)'};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 16px;
`;

const BubblePanelTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
`;

const BubbleControlLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 16px 0 8px;
`;

const BubbleMetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const BubbleMetricButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.border.subtle};
  background: ${({ $active, theme }) => $active ? theme.colors.accent.primaryLight : theme.colors.bg.tertiary};
  color: ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const BubbleChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const BubbleChip = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.border.subtle};
  background: ${({ $active, theme }) => $active ? theme.colors.accent.primaryLight : theme.colors.bg.tertiary};
  color: ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.text.muted};
  border-radius: 999px;
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const BubbleRange = styled.input`
  width: 100%;
  accent-color: ${({ theme }) => theme.colors.accent.primary};
`;

const BubbleMapPanel = styled.div`
  min-width: 0;
  min-height: 590px;
  position: relative;
  overflow: visible;
  background:
    radial-gradient(circle at 70% 18%, rgba(20, 194, 139, 0.12), transparent 30%),
    ${({ theme }) => theme.mode === 'light' ? '#f8fbfa' : '#151a18'};
  border: 1px solid ${({ theme }) => theme.mode === 'light' ? '#d7e1dc' : 'rgba(255, 255, 255, 0.09)'};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 18px;
`;

const BubbleMapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

const BubbleMapTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 18px;
  font-weight: 700;
`;

const BubbleMapSubtitle = styled.p`
  margin: 5px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
`;

const BubbleSizePill = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const BubblePlot = styled.div`
  position: relative;
  min-height: 420px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: visible;
  background:
    linear-gradient(to right, ${({ theme }) => theme.colors.border.subtle} 1px, transparent 1px),
    linear-gradient(to bottom, ${({ theme }) => theme.colors.border.subtle} 1px, transparent 1px),
    ${({ theme }) => theme.mode === 'light' ? 'rgba(255, 255, 255, 0.66)' : 'rgba(255, 255, 255, 0.025)'};
  background-size: 25% 100%, 100% 25%, auto;
`;

const BubbleQuadrant = styled.div<{ $position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; $tone: TrafficStatus | 'blue' }>`
  position: absolute;
  ${({ $position }) => $position.includes('top') ? 'top: 14px;' : 'bottom: 18px;'}
  ${({ $position }) => $position.includes('left') ? 'left: 18px;' : 'right: 18px;'}
  color: ${({ $tone, theme }) => {
    if ($tone === 'green') return theme.colors.status.success;
    if ($tone === 'yellow') return theme.colors.status.warning;
    if ($tone === 'red') return theme.colors.status.danger;
    return theme.colors.status.info;
  }};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const BubbleAxisLabel = styled.div<{ $position: 'x' | 'y' }>`
  position: absolute;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  ${({ $position }) => $position === 'x'
    ? 'left: 16px; right: 16px; bottom: 8px; text-align: center;'
    : 'left: 11px; top: 50%; writing-mode: vertical-rl; transform: translateY(-50%) rotate(180deg);'}
`;

const BubbleDot = styled.button<{ $x: number; $y: number; $size: number; $status: TrafficStatus; $selected: boolean }>`
  position: absolute;
  left: ${({ $x }) => `${$x}%`};
  top: ${({ $y }) => `${$y}%`};
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 2px solid ${({ $selected, theme }) => $selected ? theme.colors.accent.primary : theme.mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.62)'};
  background: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.success;
    if ($status === 'yellow') return theme.colors.status.warning;
    if ($status === 'red') return theme.colors.status.danger;
    return theme.colors.status.info;
  }};
  box-shadow:
    0 0 0 7px ${({ $status, theme }) => {
      if ($status === 'green') return theme.colors.status.successBg;
      if ($status === 'yellow') return theme.colors.status.warningBg;
      if ($status === 'red') return theme.colors.status.dangerBg;
      return theme.mode === 'light' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.18)';
    }},
    0 10px 24px rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.mode === 'light' ? '#09251d' : '#06110e'};
  font-size: ${({ $size }) => `${Math.max(12, Math.min(22, $size / 3.2))}px`};
  font-weight: 700;
  cursor: pointer;
  z-index: ${({ $selected, $size }) => $selected ? 120 : Math.round($size)};
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    z-index: 140;
    transform: translate(-50%, -50%) scale(1.08);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 5px;
  }

`;

const BubbleTooltip = styled.span`
  position: absolute;
  left: 50%;
  bottom: calc(100% + 14px);
  width: 260px;
  transform: translate(-50%, 8px);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : '#101412'};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 12px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  z-index: 240;
  transition: opacity 150ms ease, transform 150ms ease, visibility 150ms ease;

  ${BubbleDot}:hover &,
  ${BubbleDot}:focus-visible & {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%, 0);
  }
`;

const BubbleTooltipTitle = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
`;

const BubbleTooltipMeta = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
`;

const BubbleTooltipMetrics = styled.span`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;
`;

const BubbleTooltipMetric = styled.span`
  display: block;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 7px 8px;
`;

const BubbleTooltipMetricLabel = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const BubbleTooltipMetricValue = styled.span`
  display: block;
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
`;

const BubbleStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const BubbleStat = styled.div`
  min-width: 0;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 10px;
`;

const BubbleStatValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 18px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BubbleStatLabel = styled.div`
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const BubbleSelectedCard = styled.div`
  margin-top: 12px;
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.035)'};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 13px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

const BubbleSelectedTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
  line-height: 1.25;
`;

const BubbleSelectedMeta = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.4;
`;

const BubbleSelectedMetrics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const BubbleSelectedMetric = styled.span`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 104px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px 10px;
`;

const BubbleSelectedMetricLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const BubbleSelectedMetricValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const BubbleSelectedActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 740px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const BubbleSelectedButton = styled.button`
  min-height: 34px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 999px;
  padding: 0 13px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }
`;

const BubbleTopList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BubbleTopCard = styled.button`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 12px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const BubbleTopCardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

const BubbleTopName = styled.div`
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BubbleTopMeta = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 11px;
  line-height: 1.35;
`;

const SheetBody = styled.div<{ $flat?: boolean }>`
  padding: ${({ $flat }) => $flat ? '18px 0 0' : '20px'};
`;

const SheetGrid = styled.div<{ $singleColumn?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $singleColumn }) => $singleColumn
    ? 'minmax(0, 1fr)'
    : 'minmax(260px, 0.75fr) minmax(0, 1.25fr)'};
  gap: 18px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

const DetailStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const DetailCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 18px;
`;

const DetailCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`;

const DetailTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
`;

const DetailHint = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 12px;
  min-width: 0;
`;

const InfoLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const InfoValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const InfoValueWrap = styled(InfoValue)`
  white-space: normal;
  overflow: visible;
  text-overflow: initial;
  overflow-wrap: anywhere;
  line-height: 1.45;
`;

const InlineLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.accent.primary};
  text-decoration: none;
  max-width: 100%;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
  }

  svg {
    width: 13px;
    height: 13px;
    flex: 0 0 auto;
  }
`;

const DetailTagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DetailTag = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
`;

const DocumentLinkGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const DocumentLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }
`;

const TeamGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const TeamMemberBox = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 12px;
  min-width: 0;
`;

const TeamMemberName = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const TeamMemberMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
  margin-top: 4px;
  overflow-wrap: anywhere;
`;

const DetailBulletList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.55;

  li + li {
    margin-top: 5px;
  }
`;

const SnapshotPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  ${DetailCard} {
    border: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: 0;
    background: transparent;
    padding: 18px 0 0;
  }
`;

const SnapshotHero = styled.section`
  min-width: 0;
`;

const SnapshotHeroTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
`;

const SnapshotIdentity = styled.div`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  flex: 1 0 420px;
  min-width: min(100%, 360px);
  max-width: 100%;

  @media (max-width: 560px) {
    grid-template-columns: 60px minmax(0, 1fr);
    gap: 12px;
    flex-basis: 100%;
    min-width: 0;
  }
`;

const SnapshotLogo = styled.div`
  width: 76px;
  height: 76px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.mode === 'light'
    ? '#ffffff'
    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(255, 255, 255, 0.06))'};
  color: ${({ theme }) => theme.colors.accent.primary};
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  flex: 0 0 auto;

  @media (max-width: 560px) {
    width: 60px;
    height: 60px;
  }
`;

const SnapshotLogoImg = styled(CrmImage)`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SnapshotLogoInitials = styled.span`
  font-size: 28px;
  font-weight: 700;
  line-height: 1;

  @media (max-width: 560px) {
    font-size: 24px;
  }
`;

const SnapshotTitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const SnapshotTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: clamp(24px, 2.1vw, 34px);
  font-weight: 700;
  line-height: 1.08;
  min-width: 0;
  overflow-wrap: break-word;
  word-break: normal;
`;

const SnapshotChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const SnapshotChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  max-width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.accent.primary};
    flex: 0 0 auto;
  }
`;

const SnapshotActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  flex: 0 1 auto;
  gap: 10px;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 1280px) {
    justify-content: flex-start;
    width: 100%;
  }
`;

const SnapshotPrimaryLink = styled.a`
  min-height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  color: ${({ theme }) => theme.colors.accent.primary};
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primary};
    color: #ffffff;
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

const SnapshotKpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  margin-top: 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 740px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SnapshotKpiCard = styled.div`
  min-height: 82px;
  padding: 14px 12px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;

  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }

  @media (max-width: 1180px) {
    &:nth-child(4) {
      border-left: 0;
    }

    &:nth-child(n + 4) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }

  @media (max-width: 740px) {
    border-left: 0;

    &:nth-child(even) {
      border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }

    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }

  @media (max-width: 520px) {
    border-left: 0;

    &:nth-child(even) {
      border-left: 0;
    }

    & + & {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }
`;

const SnapshotKpiIcon = styled.div<{ $tone?: 'green' | 'blue' | 'purple' | 'amber' }>`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.sm};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $tone, theme }) => {
    if ($tone === 'amber') return theme.colors.status.warningBg;
    if ($tone === 'blue') return 'rgba(59, 130, 246, 0.14)';
    if ($tone === 'purple') return 'rgba(139, 92, 246, 0.14)';
    return theme.colors.accent.primaryLight;
  }};
  color: ${({ $tone, theme }) => {
    if ($tone === 'amber') return theme.colors.status.warning;
    if ($tone === 'blue') return '#60a5fa';
    if ($tone === 'purple') return '#a78bfa';
    return theme.colors.accent.primary;
  }};
  flex: 0 0 auto;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const SnapshotKpiLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
`;

const SnapshotKpiValue = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: clamp(18px, 1.35vw, 24px);
  font-weight: 700;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SnapshotDetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  overflow: hidden;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const SnapshotDetailColumn = styled.div`
  min-width: 0;

  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }

  @media (max-width: 980px) {
    & + & {
      border-left: 0;
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }
`;

const SnapshotDetailItem = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 76px;
  padding: 14px 16px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
`;

const SnapshotDetailIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.sm};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.mode === 'light' ? '#eef4f1' : 'rgba(255, 255, 255, 0.045)'};
  flex: 0 0 auto;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const SnapshotDetailLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
`;

const SnapshotDetailValue = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SnapshotMetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
  white-space: normal;
`;

const SnapshotDescriptionCard = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  padding: 18px 0 0;
`;

const SnapshotDescriptionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SnapshotDescriptionText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
`;

const PortfolioContextBar = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 560px);
  justify-content: start;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
  padding: 0 0 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const StartupSelectWrap = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const StartupDropdown = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
`;

const StartupSelectButton = styled.button<{ $open: boolean }>`
  width: 100%;
  min-height: 38px;
  border: 1px solid ${({ $open, theme }) => $open ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ $open, theme }) => $open ? theme.colors.accent.primary : theme.colors.text.secondary};
    transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
    transition: transform 160ms ease, color 160ms ease;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const StartupSelectText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StartupSelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 30;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.mode === 'light' ? '#ffffff' : '#181818'};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 6px;
`;

const StartupSelectSearch = styled.input`
  width: 100%;
  height: 36px;
  margin-bottom: 6px;
  padding: 0 12px;
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;

  &::placeholder { color: ${({ theme }) => theme.colors.text.tertiary}; }
  &:focus { border-color: ${({ theme }) => theme.colors.border.inputFocus}; }
`;

const StartupSelectList = styled.div`
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StartupSelectEmpty = styled.div`
  padding: 12px 10px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  text-align: center;
`;

const StartupSelectOption = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $active, theme }) => {
    if ($active) return theme.mode === 'light' ? '#dff7ee' : '#103329';
    return theme.mode === 'light' ? '#ffffff' : '#181818';
  }};
  color: ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.text.primary};
  padding: 0 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.mode === 'light' ? '#f0f7f4' : '#222222'};
    color: ${({ theme }) => theme.colors.accent.primary};
    outline: none;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const DetailAnchorNav = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const DetailAnchorLink = styled.a`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 13px;
    height: 13px;
  }
`;

const NarrativeText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
  white-space: pre-line;
`;

const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 11px 10px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    color: ${({ theme }) => theme.colors.text.secondary};
    text-align: left;
  }

  th {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  td:last-child,
  th:last-child {
    text-align: right;
  }
`;

const WorkbookStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
`;

const WorkbookHero = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0;
`;

const WorkbookHeroIcon = styled.div`
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: ${({ theme }) => theme.radius.sm};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
`;

const WorkbookHeroTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
`;

const WorkbookHeroSubtitle = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  line-height: 1.5;
`;

const WorkbookSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const WorkbookStat = styled.div`
  padding: 16px 18px;
  min-width: 0;

  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }

  @media (max-width: 900px) {
    &:nth-child(3) {
      border-left: 0;
    }

    &:nth-child(n + 3) {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }

  @media (max-width: 560px) {
    border-left: 0;

    & + & {
      border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
    }
  }
`;

const WorkbookStatValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const WorkbookStatLabel = styled.div`
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const WorkbookSection = styled.section`
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: transparent;
  overflow: visible;
`;

const WorkbookSectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0 14px;
`;

const WorkbookSectionTitle = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;
`;

const WorkbookSectionSubtitle = styled.p`
  margin: 5px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
`;

const WorkbookTableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const WorkbookTable = styled.table<{ $minWidth?: number }>`
  width: 100%;
  min-width: ${({ $minWidth }) => $minWidth || 1180}px;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 10px 11px;
    border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: ${({ theme }) => theme.mode === 'light' ? '#102033' : '#0b1320'};
    color: ${({ theme }) => theme.mode === 'light' ? '#f8fafc' : theme.colors.text.primary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  td {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  tr.is-fund td {
    background: ${({ theme }) => theme.mode === 'light' ? '#e8f7ef' : 'rgba(16, 185, 129, 0.1)'};
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }

  tr.is-founder td {
    background: ${({ theme }) => theme.mode === 'light' ? '#f7f7f7' : 'rgba(255, 255, 255, 0.018)'};
  }

  tr.total-row td {
    background: ${({ theme }) => theme.mode === 'light' ? '#102033' : '#0b1320'};
    color: ${({ theme }) => theme.mode === 'light' ? '#f8fafc' : theme.colors.text.primary};
    font-weight: 700;
  }

  .numeric {
    text-align: right;
    white-space: nowrap;
  }
`;

const WorkbookBadge = styled.span<{ $status?: TrafficStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  border-radius: 999px;
  padding: 4px 8px;
  border: 1px solid ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.successBorder;
    if ($status === 'yellow') return theme.colors.status.warningBorder;
    if ($status === 'red') return theme.colors.status.dangerBorder;
    return theme.colors.border.subtle;
  }};
  background: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.successBg;
    if ($status === 'yellow') return theme.colors.status.warningBg;
    if ($status === 'red') return theme.colors.status.dangerBg;
    return theme.mode === 'light' ? '#eef4f1' : 'rgba(255, 255, 255, 0.06)';
  }};
  color: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.success;
    if ($status === 'yellow') return theme.colors.status.warning;
    if ($status === 'red') return theme.colors.status.danger;
    return theme.colors.text.secondary;
  }};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const WorkbookMomBadge = styled.span<{ $tone: 'positive' | 'warning' | 'negative' | 'neutral' }>`
  display: inline-flex;
  justify-content: center;
  min-width: 72px;
  border-radius: 6px;
  padding: 4px 7px;
  font-weight: 700;
  color: ${({ $tone, theme }) => {
    if ($tone === 'positive') return theme.colors.status.success;
    if ($tone === 'warning') return theme.colors.status.warning;
    if ($tone === 'negative') return theme.colors.status.danger;
    return theme.colors.text.muted;
  }};
  background: ${({ $tone, theme }) => {
    if ($tone === 'positive') return theme.colors.status.successBg;
    if ($tone === 'warning') return theme.colors.status.warningBg;
    if ($tone === 'negative') return theme.colors.status.dangerBg;
    return theme.mode === 'light' ? '#f3f4f6' : 'rgba(255, 255, 255, 0.06)';
  }};
`;

const WorkbookFundMark = styled.span<{ $muted?: boolean }>`
  color: ${({ $muted, theme }) => $muted ? 'inherit' : theme.colors.accent.primary};
  font-weight: 700;
`;

const WorkbookEmpty = styled.div`
  padding: 28px 20px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  line-height: 1.5;
`;

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TimelineItem = styled.div`
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  padding: 13px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`;

const TimelineDate = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 700;
`;

const TimelineTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const TimelineDesc = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
  margin-top: 4px;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SettingsSections = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
`;

const SettingsPanel = styled.div`
  min-width: 0;
`;

const SettingsBlock = styled.section`
  min-width: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const SettingsBlockHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0 12px;
`;

const SettingsBlockIcon = styled.div`
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
`;

const SettingsBlockTitle = styled.h4`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const SettingsRows = styled.div`
  display: flex;
  flex-direction: column;
`;

const SettingsRow = styled.div`
  display: grid;
  grid-template-columns: minmax(170px, 0.8fr) minmax(130px, 220px) minmax(0, 1.5fr);
  gap: 16px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
`;

const SettingsName = styled.div`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 700;
`;

const SettingsValue = styled.div`
  box-sizing: border-box;
  min-width: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;
`;

const SettingsInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent.primaryLight};
  }
`;

const SegmentThresholdTableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const SegmentThresholdTable = styled.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  td {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 13px;
    font-weight: 800;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  ${SettingsInput} {
    min-width: 112px;
    min-height: 36px;
  }
`;

const SegmentThresholdHelp = styled.div`
  padding: 12px 0 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.5;
`;

function SegmentThresholdPercentageInput({
  value,
  ariaLabel,
  onValidValue,
}: {
  value: number;
  ariaLabel: string;
  onValidValue: (value: string) => void;
}) {
  const formattedValue = toPercentInput(value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const updateDraft = (rawValue: string) => {
    const sanitized = sanitizeNumericInput(rawValue);
    setDraft(sanitized);
    if (!sanitized || sanitized === '-' || sanitized.endsWith('.')) return;

    const parsed = Number(sanitized);
    if (Number.isFinite(parsed) && parsed >= -1000 && parsed <= 1000) {
      onValidValue(sanitized);
    }
  };

  const resetInvalidDraft = () => {
    const parsed = Number(draft);
    if (
      !draft
      || draft === '-'
      || draft.endsWith('.')
      || !Number.isFinite(parsed)
      || parsed < -1000
      || parsed > 1000
    ) {
      setDraft(formattedValue);
    }
  };
  const numericDraft = draft && draft !== '-' && !draft.endsWith('.')
    ? Number(draft)
    : undefined;

  return (
    <SettingsInput
      type="text"
      inputMode="decimal"
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuemin={-1000}
      aria-valuemax={1000}
      aria-valuenow={Number.isFinite(numericDraft) ? numericDraft : undefined}
      value={draft}
      onChange={(event) => updateDraft(event.target.value)}
      onBlur={resetInvalidDraft}
    />
  );
}

const HealthOverrideControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  width: 100%;
`;

const InfoHintText = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const SettingsSelect = styled.select`
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent.primaryLight};
  }
`;

const SettingsFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const SettingsButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid ${({ theme, $primary }) => $primary ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $primary }) => $primary ? theme.colors.accent.primary : theme.colors.bg.card};
  color: ${({ theme, $primary }) => $primary ? '#ffffff' : theme.colors.text.primary};
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SettingsFeedback = styled.div<{ $type: 'success' | 'error' }>`
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.09)' : 'rgba(239, 68, 68, 0.09)'};
  color: ${({ $type }) => $type === 'success' ? '#10b981' : '#ef4444'};
  padding: 11px 13px;
  font-size: 14px;
  font-weight: 700;
  margin-top: 12px;
`;

const SettingsNote = styled.div`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: break-word;
`;

const PortfolioTable = styled.table<{ $minWidth: number }>`
  width: 100%;
  min-width: ${({ $minWidth }) => $minWidth}px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: clamp(9px, 0.62vw, 12px);

  @media (max-width: 1100px) {
    min-width: ${({ $minWidth }) => $minWidth}px;
    font-size: 11px;
  }
`;

const TableHead = styled.thead`
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1f1f1f' : theme.colors.bg.tertiary)};
`;

const Th = styled.th`
  padding: 10px 7px;
  position: sticky;
  top: 0;
  z-index: 3;
  /* Opaque (not the semi-transparent bg.tertiary) so body rows don't show
     through the sticky header while the table scrolls. */
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1f1f1f' : theme.colors.bg.tertiary)};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  /* border-collapse drops a sticky cell's own border on scroll — paint it as an
     inset shadow so the header keeps its divider while the body scrolls under. */
  box-shadow: inset 0 -1px 0 ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: clamp(8px, 0.56vw, 11px);
  font-weight: 700;
  text-align: left;
  line-height: 1.2;
  text-transform: uppercase;
  vertical-align: middle;
  /* Let long single-word headers (OWNERSHIP, VALUATION) wrap inside their fixed
     column instead of overflowing into the neighbouring header. */
  white-space: normal;
  overflow-wrap: anywhere;

  @media (max-width: 1100px) {
    padding: 10px 8px;
    font-size: 11px;
  }
`;

const Td = styled.td<{ $align?: 'left' | 'center' | 'right'; $strong?: boolean }>`
  padding: 11px 7px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ $strong }) => ($strong ? 800 : 500)};
  text-align: ${({ $align }) => $align || 'left'};
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* While a cell is being edited, let the (auto-grown) input/select show the
     full value instead of being clipped by the cell. */
  &:has(input),
  &:has(select) {
    overflow: visible;
  }

  tr:hover & {
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  @media (max-width: 1100px) {
    padding: 11px 8px;
  }
`;

const StickyNameTh = styled(Th)`
  left: 0;
  z-index: 6;
  box-shadow:
    inset 0 -1px 0 ${({ theme }) => theme.colors.border.primary},
    5px 0 8px -8px rgba(0, 0, 0, 0.65);
`;

const StickyNameTd = styled(Td)`
  position: sticky;
  left: 0;
  z-index: 2;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  box-shadow: 5px 0 8px -8px rgba(0, 0, 0, 0.65);

  tr:hover & {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#262626' : theme.colors.bg.cardHover)};
  }

  input,
  select {
    background: ${({ theme }) => theme.colors.bg.dropdown};
  }
`;

const editableToneColor = (tone: 'default' | 'blue' | 'green' | 'warning' | 'danger', theme: any) => {
  if (tone === 'blue') return theme.colors.status.info;
  if (tone === 'green') return theme.colors.status.success;
  if (tone === 'warning') return theme.colors.status.warning;
  if (tone === 'danger') return theme.colors.status.danger;
  return theme.colors.text.primary;
};

const EditableCellStatic = styled.span<{
  $align: 'left' | 'center' | 'right';
  $strong: boolean;
  $tone: 'default' | 'blue' | 'green' | 'warning' | 'danger';
}>`
  display: block;
  width: 100%;
  color: ${({ $tone, theme }) => editableToneColor($tone, theme)};
  font-weight: ${({ $strong }) => ($strong ? 850 : 700)};
  text-align: ${({ $align }) => $align};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &[data-formula] {
    cursor: help;
    text-decoration-line: underline;
    text-decoration-style: dotted;
    text-decoration-color: ${({ theme }) => theme.colors.text.tertiary};
    text-underline-offset: 3px;
  }
`;

const EditableCellButton = styled.button<{
  $align: 'left' | 'center' | 'right';
  $strong: boolean;
  $tone: 'default' | 'blue' | 'green' | 'warning' | 'danger';
  $hasError: boolean;
}>`
  width: 100%;
  min-width: 0;
  min-height: 26px;
  border: 1px solid ${({ $hasError, theme }) => ($hasError ? theme.colors.status.dangerBorder : 'transparent')};
  border-radius: 7px;
  background: ${({ $hasError, theme }) => ($hasError ? theme.colors.status.dangerBg : 'transparent')};
  color: ${({ $tone, theme }) => editableToneColor($tone, theme)};
  font: inherit;
  font-weight: ${({ $strong }) => ($strong ? 850 : 700)};
  text-align: ${({ $align }) => $align};
  padding: 2px 5px;
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }
`;

const EditableCellInput = styled.input<{
  $align: 'left' | 'center' | 'right';
  $hasError: boolean;
}>`
  min-width: 100%;
  width: auto;
  max-width: 360px;
  height: 30px;
  position: relative;
  z-index: 5;
  border: 1px solid ${({ $hasError, theme }) => ($hasError ? theme.colors.status.dangerBorder : theme.colors.accent.primary)};
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-weight: 700;
  text-align: ${({ $align }) => $align};
  padding: 4px 7px;
  outline: none;
`;

const EditableCellSelect = styled.select<{
  $align: 'left' | 'center' | 'right';
  $hasError: boolean;
}>`
  min-width: 100%;
  width: auto;
  max-width: 360px;
  height: 30px;
  position: relative;
  z-index: 5;
  border: 1px solid ${({ $hasError, theme }) => ($hasError ? theme.colors.status.dangerBorder : theme.colors.accent.primary)};
  border-radius: 7px;
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-weight: 700;
  text-align: ${({ $align }) => $align};
  padding: 4px 7px;
  outline: none;
`;

const MoneyText = styled.span<{ $tone?: 'blue' | 'green' | 'dark' }>`
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $tone, theme }) => {
    if ($tone === 'green') return theme.colors.status.success;
    if ($tone === 'blue') return theme.colors.status.info;
    return theme.colors.text.primary;
  }};
  font-weight: 700;
`;

const MoicCell = styled(Td)<{ $status: TrafficStatus }>`
  color: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.success;
    if ($status === 'yellow') return theme.colors.status.warning;
    if ($status === 'red') return theme.colors.status.danger;
    return theme.colors.text.secondary;
  }};
  font-weight: 700;
`;

const StatusPill = styled.span<{ $status: TrafficStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: clamp(9px, 0.55vw, 11px);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.success;
    if ($status === 'yellow') return theme.colors.status.warning;
    if ($status === 'red') return theme.colors.status.danger;
    return theme.colors.text.tertiary;
  }};
  background: ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.successBg;
    if ($status === 'yellow') return theme.colors.status.warningBg;
    if ($status === 'red') return theme.colors.status.dangerBg;
    return theme.mode === 'light' ? '#eef4f1' : 'rgba(255, 255, 255, 0.06)';
  }};
  border: 1px solid ${({ $status, theme }) => {
    if ($status === 'green') return theme.colors.status.successBorder;
    if ($status === 'yellow') return theme.colors.status.warningBorder;
    if ($status === 'red') return theme.colors.status.dangerBorder;
    return theme.colors.border.subtle;
  }};

  svg {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    fill: currentColor;
  }
`;

const TotalRow = styled.tr`
  td {
    background: ${({ theme }) => theme.colors.bg.tertiary} !important;
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
    border-color: ${({ theme }) => theme.colors.border.primary};
  }

  td[data-column-id='name'] {
    background: ${({ theme }) => theme.colors.bg.dropdown} !important;
  }
`;

const ChangeLogPanel = styled.div`
  margin: 16px 20px 0;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.mode === 'light' ? '#f8fbfa' : 'rgba(255, 255, 255, 0.025)'};
  overflow: hidden;
`;

const ChangeLogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const ChangeLogTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ChangeLogHint = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  line-height: 1.4;
`;

const ChangeLogList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ChangeLogItem = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 13px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ChangeLogMain = styled.div`
  min-width: 0;
`;

const ChangeLogMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;
`;

const ChangeLogSummary = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ChangeLogValues = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

const ChangeLogArrow = styled.span`
  color: ${({ theme }) => theme.colors.accent.primary};
  font-weight: 700;
  padding: 0 6px;
`;

const RollbackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  align-self: center;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 11px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.base};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ChangeLogEmpty = styled.div`
  padding: 14px 15px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
`;

const RollbackConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(4, 10, 8, 0.62);
  backdrop-filter: blur(2px);
`;

const RollbackConfirmCard = styled.div`
  width: 100%;
  max-width: 440px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  overflow: hidden;
`;

const RollbackConfirmBody = styled.div`
  padding: 20px 20px 16px;
`;

const RollbackConfirmIconTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-weight: 700;

  svg {
    width: 19px;
    height: 19px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const RollbackConfirmText = styled.p`
  margin: 11px 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.5;
`;

const RollbackConfirmPreview = styled.div`
  margin-top: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.mode === 'light' ? '#f8fbfa' : 'rgba(255, 255, 255, 0.025)'};
  padding: 12px 13px;
`;

const RollbackConfirmPreviewMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;
`;

const RollbackConfirmPreviewTitle = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;

  strong {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const RollbackConfirmPreviewValues = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

const RollbackConfirmOldValue = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  text-decoration: line-through;
`;

const RollbackConfirmNewValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
`;

const RollbackConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const RollbackConfirmButton = styled.button<{ $variant: 'primary' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.base};
  border: 1px solid ${({ theme, $variant }) => ($variant === 'primary' ? theme.colors.accent.primary : theme.colors.border.primary)};
  background: ${({ theme, $variant }) => ($variant === 'primary' ? theme.colors.accent.primary : theme.colors.bg.card)};
  color: ${({ theme, $variant }) => ($variant === 'primary' ? '#ffffff' : theme.colors.text.primary)};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => theme.colors.accent.primary};
    ${({ $variant, theme }) => ($variant === 'ghost' ? `color: ${theme.colors.accent.primary};` : '')}
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }

  svg {
    width: 15px;
    height: 15px;
    flex: 0 0 auto;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 14px 20px 18px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const LegendItem = styled.span<{ $status: TrafficStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  svg {
    width: 10px;
    height: 10px;
    color: ${({ $status, theme }) => {
      if ($status === 'green') return theme.colors.status.success;
      if ($status === 'yellow') return theme.colors.status.warning;
      if ($status === 'red') return theme.colors.status.danger;
      return theme.colors.text.tertiary;
    }};
    fill: currentColor;
  }
`;

const DigestActionButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const DigestSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DigestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

const DigestBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
`;

const DigestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const DigestBox = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 12px;
`;

const DigestBoxTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const DigestList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.5;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${({ theme }) => theme.colors.text.muted};

  h3 {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  p {
    font-size: 14px;
    margin: 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 60px 0;
`;

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    let normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace(/[^0-9.,%+-]/g, '')
      .replace(/%$/, '');
    if (!normalized) return undefined;

    const commaCount = (normalized.match(/,/g) || []).length;
    const dotCount = (normalized.match(/\./g) || []).length;
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');

    if (commaCount > 0 && dotCount > 0) {
      normalized = lastComma > lastDot
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
    } else if (commaCount > 0) {
      const parts = normalized.split(',');
      normalized = commaCount > 1 || parts[parts.length - 1].length === 3
        ? parts.join('')
        : parts.join('.');
    } else if (dotCount > 1) {
      normalized = normalized.replace(/\./g, '');
    } else if (dotCount === 1) {
      const parts = normalized.split('.');
      if (parts[1]?.length === 3 && parts[0].length <= 3) normalized = parts.join('');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed != null) return parsed;
  }
  return undefined;
}

function toRatio(value: unknown): number | undefined {
  return parseLegacyPortfolioRatio(value);
}

function firstRatio(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = toRatio(value);
    if (parsed != null) return parsed;
  }
  return undefined;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object') {
    const raw = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof raw.toDate === 'function') return raw.toDate();
    const seconds = raw.seconds ?? raw._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return null;
}

function formatCurrency(value?: number, compact = false): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) return `$ ${(value / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(value) >= 1_000_000) return `$ ${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$ ${(value / 1_000).toFixed(0)}K`;
  }
  return `$ ${Math.round(value).toLocaleString(numberLocale())}`;
}

function formatUzs(value?: number, compact = false, labels: { billion: string; million: string } = { billion: 'млрд', million: 'млн' }): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} ${labels.billion} UZS`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} ${labels.million} UZS`;
  }
  return `${Math.round(value).toLocaleString(numberLocale())} UZS`;
}

function formatPercent(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${(value * 100).toLocaleString(numberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatMultiple(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value.toLocaleString(numberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

function getBubbleMetricValue(row: PortfolioRow, metric: BubbleSizeMetric): number | undefined {
  if (metric === 'invested') return row.investedUsd;
  if (metric === 'valuation') return row.currentValuation;
  if (metric === 'moic') return row.moic;
  return row.mrr;
}

function formatBubbleMetricValue(row: PortfolioRow, metric: BubbleSizeMetric): string {
  const value = getBubbleMetricValue(row, metric);
  if (metric === 'moic') return formatMultiple(value);
  return formatCurrency(value, true);
}

function getInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatDate(value: Date | null): string {
  if (!value) return '-';
  return formatMonthYearShort(value);
}

function formatFullDate(value: Date | null): string {
  if (!value) return '-';
  return formatLongDate(value);
}

function cleanText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return undefined;
}

function toTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter((item): item is string => Boolean(item));
  }
  const text = cleanText(value);
  if (!text) return [];
  return text.includes(',')
    ? text.split(',').map((item) => item.trim()).filter(Boolean)
    : [text];
}

function formatNumber(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return Math.round(value).toLocaleString(numberLocale());
}

function normalizeMetricKey(value: string): string {
  return value.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
}

function formatUnknownMetric(value: unknown, mode: 'currency' | 'percent' | 'number' | 'text' = 'text'): string {
  if (value == null || value === '') return '-';
  if (mode === 'currency') return formatCurrency(toNumber(value));
  if (mode === 'percent') return formatPercent(toRatio(value));
  if (mode === 'number') {
    const parsed = toNumber(value);
    return parsed != null ? formatNumber(parsed) : cleanText(value) || '-';
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString(numberLocale());
  return cleanText(value) || '-';
}

function metricRow(label: string, value: unknown, mode: 'currency' | 'percent' | 'number' | 'text' = 'text', source?: string): MetricDisplayRow {
  return { label, value: formatUnknownMetric(value, mode), source };
}

function getPortfolioDashboardFieldLabel(field: string, translate: PortfolioTranslator): string {
  const labels: Record<string, { key: string; fallback: string }> = {
    name: { key: 'table.startup', fallback: 'Стартап' },
    startupName: { key: 'table.startup', fallback: 'Стартап' },
    segment: { key: 'table.segment', fallback: 'Направление' },
    industry: { key: 'table.sector', fallback: 'Сектор' },
    stage: { key: 'table.stage', fallback: 'Стадия' },
    country: { key: 'table.country', fallback: 'Страна' },
    reportDate: { key: 'table.reportDate', fallback: 'Report Date' },
    entryDate: { key: 'table.entryDate', fallback: 'Дата входа' },
    investmentType: { key: 'table.investmentType', fallback: 'Тип инвест.' },
    investedUsd: { key: 'table.investedUsd', fallback: 'Вложено USD' },
    investedUzs: { key: 'table.investedUzs', fallback: 'Вложено UZS' },
    ownership: { key: 'table.ownership', fallback: 'Доля' },
    entryValuation: { key: 'table.entryValuation', fallback: 'Оценка входа' },
    currentValuation: { key: 'table.currentValuation', fallback: 'Тек. оценка' },
    moic: { key: 'table.moic', fallback: 'MOIC' },
    mrr: { key: 'table.mrr', fallback: 'MRR' },
    arr: { key: 'table.arr', fallback: 'ARR' },
    cac: { key: 'table.cac', fallback: 'CAC' },
    ltvCac: { key: 'table.ltvCac', fallback: 'LTV/CAC' },
    yoyGrowth: { key: 'table.yoyGrowth', fallback: 'YoY рост' },
    qoqGrowth: { key: 'table.qoqGrowth', fallback: 'QoQ рост' },
    runway: { key: 'table.runway', fallback: 'Runway' },
    momGrowth: { key: 'table.momGrowth', fallback: 'MoM рост' },
    grossMargin: { key: 'table.grossMargin', fallback: 'Gross Margin' },
    ebitdaMargin: { key: 'table.ebitdaMargin', fallback: 'EBITDA Margin' },
    currentRatio: { key: 'table.currentRatio', fallback: 'Current Ratio' },
    ebitda: { key: 'table.ebitda', fallback: 'EBITDA' },
    payingCustomers: { key: 'table.payingCustomers', fallback: 'Paying Customers' },
    netProfit: { key: 'table.netProfit', fallback: 'Net Profit' },
    netMargin: { key: 'table.netMargin', fallback: 'Net Margin' },
    burnRate: { key: 'table.burnRate', fallback: 'Net Burn Rate' },
    cashAtBank: { key: 'table.cashAtBank', fallback: 'Cash at Bank' },
    totalDebt: { key: 'table.totalDebt', fallback: 'Total Debt' },
    debtToEquity: { key: 'table.debtToEquity', fallback: 'Debt / Equity' },
    responsiblePerson: { key: 'table.responsiblePerson', fallback: 'Ответственный' },
    healthOverride: { key: 'table.status', fallback: 'Статус' },
  };
  const label = labels[field];
  return label ? translate(label.key, label.fallback) : field;
}

function normalizePortfolioFieldChanges(activity: Record<string, any>): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const raw = activity.fieldChanges;
  if (Array.isArray(raw)) {
    return raw
      .map((change) => change && typeof change === 'object'
        ? {
            field: String((change as any).field || ''),
            oldValue: (change as any).oldValue,
            newValue: (change as any).newValue,
          }
        : null)
      .filter((change): change is { field: string; oldValue: unknown; newValue: unknown } => Boolean(change?.field));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([field, values]) => ({
      field,
      oldValue: values && typeof values === 'object' ? (values as any).oldValue : undefined,
      newValue: values && typeof values === 'object' ? (values as any).newValue : undefined,
    }));
  }
  return [];
}

function collectStartupDashboardChanges(startup: Startup, fallbackName: string, translate: PortfolioTranslator): PortfolioDashboardChangeLogItem[] {
  const out: PortfolioDashboardChangeLogItem[] = [];
  const activityLog = Array.isArray(startup.activityLog) ? startup.activityLog as Array<Record<string, any>> : [];
  activityLog.forEach((activity, activityIndex) => {
    normalizePortfolioFieldChanges(activity).forEach((change, changeIndex) => {
      if (!change.field.startsWith('portfolio.dashboard.')) return;
      const field = change.field.replace('portfolio.dashboard.', '');
      out.push({
        id: `${startup.id}-${activity.id || activityIndex}-${field}-${changeIndex}`,
        activityId: activity.id ? String(activity.id) : '',
        fieldKey: change.field,
        startupId: startup.id,
        startupName: activity.startupName || fallbackName,
        field,
        fieldLabel: getPortfolioDashboardFieldLabel(field, translate),
        oldValue: change.oldValue,
        newValue: change.newValue,
        managerName: activity.managerName || activity.managerLogin || activity.managerEmail || activity.managerId || 'Unknown',
        changedAt: toDate(activity.createdAt),
      });
    });
  });
  return out;
}

function buildPortfolioDashboardChangeLog(rows: PortfolioRow[], translate: PortfolioTranslator, excludeIds?: Set<string>): PortfolioDashboardChangeLogItem[] {
  return rows
    .flatMap((row) => collectStartupDashboardChanges(row.startup, row.name, translate))
    .filter((change) => !excludeIds || !excludeIds.has(change.id))
    .sort((a, b) => (b.changedAt?.getTime() || 0) - (a.changedAt?.getTime() || 0))
    .slice(0, 5);
}

function formatPortfolioAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (field === 'healthOverride') {
    const text = String(value).trim().toLowerCase();
    if (!text || text === 'auto') return 'Auto';
    if (text === 'green') return 'Green';
    if (text === 'yellow') return 'Attention';
    if (text === 'red') return 'Critical';
  }
  if (field === 'entryDate') {
    return formatFullDate(toDate(value));
  }
  const numeric = toNumber(value);
  if (['investedUsd', 'entryValuation', 'currentValuation', 'mrr', 'arr', 'cac', 'ebitda', 'netProfit', 'burnRate', 'cashAtBank', 'totalDebt'].includes(field) && numeric != null) {
    return formatCurrency(numeric);
  }
  if (field === 'investedUzs' && numeric != null) {
    return `${numeric.toLocaleString(numberLocale(), { maximumFractionDigits: 0 })} UZS`;
  }
  if (['ownership', 'yoyGrowth', 'qoqGrowth', 'momGrowth', 'grossMargin', 'ebitdaMargin', 'netMargin'].includes(field) && numeric != null) {
    return `${(numeric * 100).toLocaleString(numberLocale(), { maximumFractionDigits: 2 })}%`;
  }
  if (['moic', 'ltvCac', 'debtToEquity'].includes(field) && numeric != null) return formatMultiple(numeric);
  if (field === 'runway' && numeric != null) return numeric.toLocaleString(numberLocale(), { maximumFractionDigits: 1 });
  return cleanText(value) || '-';
}

function formatPortfolioChangeTime(value: Date | null): string {
  if (!value) return '-';
  return formatDayMonthTime(value);
}

function rollbackPortfolioCellValue(field: string, value: unknown): string {
  if (field === 'healthOverride' && String(value || '').toLowerCase() === 'auto') return '';
  if (value === null || value === undefined) return '';
  const date = field === 'entryDate' ? toDate(value) : null;
  if (date) return date.toISOString();
  return String(value);
}

function pickLooseMetricValue(records: Array<Record<string, unknown> | undefined>, patterns: string[]): unknown {
  const normalizedPatterns = patterns.map(normalizeMetricKey);
  for (const record of records) {
    if (!record) continue;
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = normalizeMetricKey(key);
      if (normalizedPatterns.some((pattern) => normalizedKey.includes(pattern))) return value;
    }
  }
  return undefined;
}

function normalizeExternalUrl(url?: string | null): string {
  return safeExternalHref(url) || '';
}

function normalizeFileUrl(url?: string | null, startupId?: string | null): string {
  return safeCrmFileHref(url, startupId);
}

function getFounderDisplayName(startup: Startup): string | undefined {
  const founder = startup.founder;
  return cleanText(startup.brief.founderName)
    || [founder?.firstName, founder?.lastName].map(cleanText).filter(Boolean).join(' ')
    || cleanText((startup as any).founderName);
}

function getPortfolioCogs(metrics: Record<string, unknown>): number | undefined {
  return firstNumber(
    metrics.cogs,
    metrics.costOfGoodsSold,
    metrics.costOfRevenue,
    metrics.costOfSales,
    pickLooseMetricValue(
      [metrics, metrics.customMetrics as Record<string, unknown> | undefined],
      ['cogs', 'costofgoods', 'costofrevenue', 'costofsales'],
    ),
  );
}

function getHistoricalGrowth(startup: Startup, comparison: PortfolioGrowthPeriod): number | undefined {
  const recurringRevenue = (startup.metricsHistory || []).map((snapshot) => {
    const rawSnapshotMetrics = snapshot.metrics as any;
    const values = deriveRecurringRevenue({
      mrr: firstNumber(rawSnapshotMetrics.mrr, rawSnapshotMetrics.monthlyRecurringRevenue),
      arr: firstNumber(rawSnapshotMetrics.arr, rawSnapshotMetrics.annualRecurringRevenue),
    });
    return {
      date: String(snapshot.date || ''),
      period: snapshot.period,
      value: values.mrr,
    };
  });
  const recurringGrowth = calculateGrowthFromHistory(recurringRevenue, comparison);
  if (recurringGrowth != null) return recurringGrowth;

  const revenue = (startup.metricsHistory || []).map((snapshot) => {
    const rawSnapshotMetrics = snapshot.metrics as any;
    return {
      date: String(snapshot.date || ''),
      period: snapshot.period,
      value: firstNumber(rawSnapshotMetrics.revenue, rawSnapshotMetrics.totalRevenue),
    };
  });
  return calculateGrowthFromHistory(revenue, comparison);
}

export function getMomGrowth(startup: Startup, historicalGrowth = getHistoricalGrowth(startup, 'mom')): number | undefined {
  const metrics = startup.metrics || {};
  const rawMetrics = metrics as any;
  const rawStartup = startup as any;
  const rawBrief = startup.brief as any;
  const importedGrowth = firstStoredPortfolioRatio(metrics.momGrowth)
    ?? firstRatio(
    rawMetrics.momGrowthRate,
    rawMetrics.momGrowthPercent,
    rawMetrics.momPercent,
    rawMetrics.mom,
    rawMetrics.monthlyGrowth,
    rawMetrics.monthlyGrowthRate,
    rawMetrics.monthlyRevenueGrowth,
    rawMetrics.monthOverMonthGrowth,
    rawMetrics.monthOverMonthGrowthRate,
    rawStartup.momGrowth,
    rawStartup.momGrowthRate,
    rawStartup.monthlyGrowth,
    rawStartup.monthlyRevenueGrowth,
    rawStartup.portfolioMomGrowth,
    rawBrief.momGrowth,
    rawBrief.monthlyGrowth
    );

  const quarterGrowth = firstRatio(rawBrief.revenueGrowth, rawStartup.revenueGrowth);
  const anketaMom = quarterGrowth != null && quarterGrowth > -1
    ? Math.pow(1 + quarterGrowth, 1 / 3) - 1
    : undefined;
  return historicalGrowth ?? importedGrowth ?? anketaMom;
}

function getLatestMetricSnapshots(startup: Startup) {
  return [...(startup.metricsHistory || [])]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 8);
}

type PortfolioTranslator = (key: string, fallback: string, values?: Record<string, unknown>) => string;

function buildTimelineEvents(row: PortfolioRow, translate: PortfolioTranslator) {
  const startup = row.startup;
  const founderName = getFounderDisplayName(startup) || translate('timeline.founders', 'Founders');
  const events = [
    {
      date: toDate(startup.createdAt),
      label: translate('timeline.createdLabel', 'Создание / заявка'),
      description: translate('timeline.createdDescription', '{{name}} · {{industry}} · initial shareholders: {{founderName}}', {
        name: startup.brief.companyName || row.name,
        industry: startup.brief.industry || row.industry,
        founderName,
      }),
    },
    {
      date: row.entryDate,
      label: translate('timeline.portfolioEntryLabel', 'Вход в портфель'),
      description: translate('timeline.portfolioEntryDescription', '{{investmentType}} · {{invested}} · оценка {{valuation}} · доля {{ownership}}', {
        investmentType: translate(`investmentType.${row.investmentType === 'Accelerator' ? 'accelerator' : 'direct'}`, row.investmentType),
        invested: formatCurrency(row.investedUsd),
        valuation: formatCurrency(row.entryValuation),
        ownership: formatPercent(row.ownership),
      }),
    },
    ...(startup.investments || []).map((round) => {
      const rawRound = round as any;
      const roundValuation = firstNumber(rawRound.valuation, rawRound.postMoney, rawRound.postMoneyValuation, rawRound.preMoney, rawRound.preMoneyValuation);
      const roundOwnership = firstStoredPortfolioRatio(rawRound.ownership, rawRound.equity, rawRound.share)
        ?? firstRatio(rawRound.ownershipPercent);
      return {
        date: toDate(round.date),
        label: translate('timeline.roundLabel', '{{round}}: {{investor}}', {
          round: round.source || translate('timeline.roundFallback', 'Раунд'),
          investor: round.investorName || translate('timeline.investorFallback', 'инвестор'),
        }),
        description: [
          `${formatCurrency(round.amount)} ${round.currency || 'USD'}`,
          roundValuation != null ? translate('timeline.valuationPart', 'оценка {{valuation}}', { valuation: formatCurrency(roundValuation) }) : '',
          roundOwnership != null ? translate('timeline.ownershipPart', 'доля {{ownership}}', { ownership: formatPercent(roundOwnership) }) : '',
        ].filter(Boolean).join(' · '),
      };
    }),
    ...getLatestMetricSnapshots(startup).map((snapshot) => ({
      date: toDate(snapshot.createdAt) || toDate(snapshot.date),
      label: translate('timeline.metricsLabel', 'Метрики {{date}}', { date: snapshot.date }),
      description: translate('timeline.metricsDescription', 'MRR {{mrr}} · Runway {{runway}} мес · Burn {{burn}}', {
        mrr: formatCurrency(snapshot.metrics.mrr),
        runway: snapshot.metrics.runway ?? '-',
        burn: formatCurrency(snapshot.metrics.burnRate),
      }),
    })),
    ...(startup.lastQuarterlyReportAt ? [{
      date: toDate(startup.lastQuarterlyReportAt),
      label: translate('timeline.latestQuarterlyReport', 'Последний квартальный отчёт'),
      description: startup.lastQuarterlyReportPeriod
        ? `${startup.lastQuarterlyReportPeriod.quarter} ${startup.lastQuarterlyReportPeriod.year} · ${startup.lastQuarterlyReportStatus || 'submitted'}`
        : startup.lastQuarterlyReportStatus || 'submitted',
    }] : []),
  ].filter((event) => event.date || event.label);

  return events.sort((a, b) => {
    const aTime = a.date?.getTime() || 0;
    const bTime = b.date?.getTime() || 0;
    return aTime - bTime;
  });
}

const MONTH_LABELS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function getMonthKey(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  const raw = String(value).trim();
  const monthMatch = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (year >= 2000 && month >= 1 && month <= 12) return `${year}-${String(month).padStart(2, '0')}`;
  }
  const quarterMatch = raw.match(/^(\d{4})-?Q([1-4])$/i);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const month = Number(quarterMatch[2]) * 3;
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  const parsed = toDate(raw);
  return parsed ? getMonthKey(parsed) : undefined;
}

function addMonthsToKey(monthKey: string, offset: number): string {
  const [yearPart, monthPart] = monthKey.split('-').map(Number);
  const date = new Date(yearPart, monthPart - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split('-').map(Number);
  const month = MONTH_LABELS_RU[Math.max(0, Math.min(11, monthPart - 1))];
  return `${month}-${String(yearPart).slice(-2)}`;
}

function buildWorkbookMonths(rows: PortfolioRow[]): string[] {
  const keys = rows.flatMap((row) => (row.startup.metricsHistory || [])
    .map((snapshot) => getMonthKey(snapshot.date))
    .filter((key): key is string => Boolean(key)));
  const fallbackKey = getMonthKey(new Date()) || '2026-06';
  const sortedKeys = [...keys].sort();
  const endKey = sortedKeys.length ? sortedKeys[sortedKeys.length - 1] : fallbackKey;
  return Array.from({ length: 12 }, (_, index) => addMonthsToKey(endKey, index - 11));
}

function normalizeAmountUsd(amount: unknown, currency: unknown, settings: EffectivePortfolioSettings): number | undefined {
  const value = toNumber(amount);
  if (value == null) return undefined;
  const normalizedCurrency = String(currency || 'USD').trim().toUpperCase();
  if (normalizedCurrency === 'UZS') return value / settings.usdToUzs;
  if (normalizedCurrency === 'KZT') return value / settings.usdToKzt;
  return value;
}

function getCapRowStatus(moic: number | undefined, settings: EffectivePortfolioSettings): TrafficStatus {
  if (moic == null) return 'gray';
  if (moic < settings.moicYellow) return 'red';
  if (moic >= settings.moicGreen) return 'green';
  return 'yellow';
}

type PortfolioWorkbookCellValue = string | number | null;
type PortfolioWorkbookCellEdits = Record<string, PortfolioWorkbookCellValue>;

function getCapTableEdits(startup: Startup, rowId: string): PortfolioWorkbookCellEdits {
  return startup.portfolioWorkbookEdits?.capTable?.[rowId] || {};
}

function readCapEditString(edits: PortfolioWorkbookCellEdits, field: string, fallback: string): string {
  const value = edits[field];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function readCapEditNumber(edits: PortfolioWorkbookCellEdits, field: string, fallback: number | undefined): number | undefined {
  const value = edits[field];
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCapEditRatio(edits: PortfolioWorkbookCellEdits, field: string, fallback: number | undefined): number | undefined {
  return readStoredPortfolioRatio(edits[field], fallback);
}

function readCapEditDate(edits: PortfolioWorkbookCellEdits, field: string, fallback: Date | null): Date | null {
  const value = edits[field];
  if (value === undefined) return fallback;
  if (value === null || value === '') return null;
  return toDate(value) || fallback;
}

function applyCapTableWorkbookEdits(
  capRow: CapTableWorkbookRow,
  startup: Startup,
  settings: EffectivePortfolioSettings
): CapTableWorkbookRow {
  const edits = getCapTableEdits(startup, capRow.id);
  const nextRow: CapTableWorkbookRow = {
    ...capRow,
    startupName: readCapEditString(edits, 'startupName', capRow.startupName),
    investor: readCapEditString(edits, 'investor', capRow.investor),
    round: readCapEditString(edits, 'round', capRow.round),
    date: readCapEditDate(edits, 'date', capRow.date),
    amountUsd: readCapEditNumber(edits, 'amountUsd', capRow.amountUsd),
    preMoney: readCapEditNumber(edits, 'preMoney', capRow.preMoney),
    postMoney: readCapEditNumber(edits, 'postMoney', capRow.postMoney),
    ownership: readCapEditRatio(edits, 'ownership', capRow.ownership),
    currentValuation: readCapEditNumber(edits, 'currentValuation', capRow.currentValuation),
    moic: readCapEditNumber(edits, 'moic', capRow.moic),
    type: readCapEditString(edits, 'type', capRow.type),
  };

  return {
    ...nextRow,
    status: nextRow.isFund ? capRow.status : getCapRowStatus(nextRow.moic, settings),
  };
}

function buildCapTableWorkbookRows(
  rows: PortfolioRow[],
  fundName: string | undefined,
  settings: EffectivePortfolioSettings,
  translate: PortfolioTranslator
): CapTableWorkbookRow[] {
  const fundLabel = fundName || settings.fundDisplayName || translate('capTable.fundFallback', 'Наш фонд');

  return rows.flatMap((row) => {
    const postMoney = row.entryValuation ?? row.currentValuation;
    const fundRoundValuations = resolveFundRoundValuations({
      valuationType: row.startup.valuationType,
      storedValuation: firstNumber(
        row.startup.valuation,
        (row.startup as any).preMoneyValuation,
      ),
      entryPostMoney: row.entryValuation,
      fundInvestment: row.investedUsd,
    });
    const otherInvestorOwnership = (row.startup.investments || []).reduce((sum, round) => {
      const investor = String(round.investorName || '').trim().toLowerCase();
      if (!investor || investor === fundLabel.trim().toLowerCase() || investor === translate('capTable.fundFallback', 'Наш фонд').trim().toLowerCase()) return sum;
      const o = firstStoredPortfolioRatio((round as any).ownership, (round as any).equity, (round as any).share)
        ?? firstRatio((round as any).ownershipPercent);
      return sum + (o || 0);
    }, 0);
    const founderOwnership = row.ownership != null ? Math.max(0, 1 - row.ownership - otherInvestorOwnership) : undefined;

    const founderRow: CapTableWorkbookRow = {
      id: `${row.startup.id}-founders`,
      startupId: row.startup.id,
      startupName: row.name,
      investor: translate('capTable.existingShareholders', 'Фаундеры / текущие акционеры'),
      round: translate('timeline.founders', 'Фаундеры'),
      date: null,
      postMoney,
      ownership: founderOwnership,
      currentValuation: row.currentValuation,
      type: 'Common',
      status: 'gray',
      isFund: false,
      isFounder: true,
    };

    const fundRow: CapTableWorkbookRow = {
      id: `${row.startup.id}-fund`,
      startupId: row.startup.id,
      startupName: row.name,
      investor: fundLabel,
      round: row.stage && row.stage !== '-' ? row.stage : row.investmentType,
      date: row.entryDate,
      amountUsd: row.investedUsd,
      preMoney: fundRoundValuations.preMoney,
      postMoney: fundRoundValuations.postMoney,
      ownership: row.ownership,
      currentValuation: row.currentValuation,
      moic: row.moic,
      type: row.investmentType === 'Accelerator' ? 'Accelerator' : 'Equity',
      status: row.status,
      isFund: true,
      isFounder: false,
    };

    const investorRows = withPortfolioInvestmentSourceIndices(row.startup.investments || [])
      .filter(({ investment: round }) => {
        const investor = String(round.investorName || '').trim().toLowerCase();
        return investor && investor !== fundLabel.trim().toLowerCase() && investor !== translate('capTable.fundFallback', 'Наш фонд').trim().toLowerCase();
      })
      .map(({ investment: round, sourceIndex }): CapTableWorkbookRow => {
        const amountUsd = normalizeAmountUsd(round.amount, round.currency, settings);
        const roundLabel = round.source || translate('capTable.round', 'Раунд');
        return {
          id: `${row.startup.id}-round-${sourceIndex}`,
          startupId: row.startup.id,
          startupName: row.name,
          investor: round.investorName || translate('capTable.investorFallback', 'Investor'),
          round: roundLabel,
          date: toDate(round.date),
          amountUsd,
          postMoney: firstNumber((round as any).valuation, (round as any).postMoney, (round as any).postMoneyValuation, (round as any).preMoney, (round as any).preMoneyValuation),
          currentValuation: row.currentValuation,
          type: /safe/i.test(roundLabel) ? 'SAFE' : 'Equity',
          status: 'gray',
          isFund: false,
          isFounder: false,
        };
      });

    return [founderRow, fundRow, ...investorRows].map((capRow) =>
      applyCapTableWorkbookEdits(capRow, row.startup, settings)
    );
  }).sort((a, b) => {
    const nameSort = a.startupName.localeCompare(b.startupName);
    if (nameSort) return nameSort;
    if (a.isFounder !== b.isFounder) return a.isFounder ? -1 : 1;
    if (a.isFund !== b.isFund) return a.isFund ? -1 : 1;
    return (a.date?.getTime() || 0) - (b.date?.getTime() || 0);
  });
}

function getMetricValueFromSnapshot(snapshot: { metrics: Record<string, unknown> }, metricId: TractionMetricId): number | undefined {
  const metrics = snapshot.metrics || {};
  if (metricId === 'mrr') return firstNumber(metrics.mrr, metrics.monthlyRecurringRevenue);
  if (metricId === 'cogs') return getPortfolioCogs(metrics);
  if (metricId === 'arr') {
    const arr = firstNumber(metrics.arr, metrics.annualRecurringRevenue);
    return arr ?? (firstNumber(metrics.mrr, metrics.monthlyRecurringRevenue) != null
      ? firstNumber(metrics.mrr, metrics.monthlyRecurringRevenue)! * 12
      : undefined);
  }
  if (metricId === 'activeClients') {
    return firstNumber(
      metrics.activeClients,
      metrics.clients,
      metrics.customers,
      metrics.payingCustomers,
      metrics.activeUsers,
      metrics.mau,
      metrics.users
    );
  }
  if (metricId === 'burnRate') return firstNumber(metrics.burnRate, metrics.burn, metrics.monthlyBurn, metrics.netBurn);
  if (metricId === 'runway') return firstNumber(metrics.runway, metrics.runwayMonths, metrics.cashRunway);
  return firstRatio(metrics.churnRate, metrics.churn, metrics.monthlyChurn);
}

function getCurrentMetricValue(row: PortfolioRow, metricId: TractionMetricId): number | undefined {
  const metrics = (row.startup.metrics || {}) as Record<string, unknown>;
  const rawStartup = row.startup as unknown as Record<string, unknown>;
  const rawBrief = row.startup.brief as unknown as Record<string, unknown>;
  if (metricId === 'mrr') return row.mrr;
  if (metricId === 'cogs') return getPortfolioCogs(metrics);
  if (metricId === 'arr') return firstNumber(metrics.arr, rawStartup.arr, rawBrief.arr) ?? (row.mrr != null ? row.mrr * 12 : undefined);
  if (metricId === 'activeClients') {
    return firstNumber(
      metrics.activeClients,
      metrics.clients,
      metrics.customers,
      metrics.payingCustomers,
      metrics.activeUsers,
      metrics.mau,
      rawStartup.activeClients,
      rawStartup.customers,
      rawStartup.userCount,
      rawBrief.activeUsersPerMonth,
      rawBrief.payingUsersPerMonth,
      rawBrief.users
    );
  }
  if (metricId === 'burnRate') return row.burnRate;
  if (metricId === 'runway') return row.runway;
  return firstRatio(metrics.churnRate, metrics.churn, metrics.monthlyChurn, rawStartup.churnRate, rawBrief.churnRate);
}

function getLatestMonthValue(values: Record<string, number | undefined>, months: string[], offset = 0): number | undefined {
  const available = months
    .map((month) => ({ month, value: values[month] }))
    .filter((item): item is { month: string; value: number } => item.value != null && Number.isFinite(item.value));
  if (!available.length || available.length <= offset) return undefined;
  return available[available.length - 1 - offset].value;
}

function calculateMonthlyGrowth(values: Record<string, number | undefined>, months: string[]): number | undefined {
  const latest = getLatestMonthValue(values, months, 0);
  const previous = getLatestMonthValue(values, months, 1);
  if (latest == null || previous == null || previous === 0) return undefined;
  return (latest - previous) / previous;
}

function buildTractionWorkbookTables(rows: PortfolioRow[], months: string[], translate: PortfolioTranslator): TractionWorkbookTable[] {
  const latestMonth = months[months.length - 1];
  const definitions: Array<Pick<TractionWorkbookTable, 'id' | 'title' | 'subtitle' | 'aggregate'>> = [
    { id: 'mrr', title: translate('traction.workbookMrrTitle', 'MRR (Monthly Recurring Revenue) — USD'), subtitle: translate('traction.workbookMrrSubtitle', 'Повторяющаяся месячная выручка по портфелю'), aggregate: 'sum' },
    { id: 'cogs', title: translate('traction.workbookCogsTitle', 'COGS (Cost of Goods Sold) — USD'), subtitle: translate('traction.workbookCogsSubtitle', 'Себестоимость по тем же периодам, что и MRR, для расчёта Gross Margin'), aggregate: 'sum' },
    { id: 'arr', title: translate('traction.workbookArrTitle', 'ARR (Annual Recurring Revenue) — USD'), subtitle: translate('traction.workbookArrSubtitle', 'Годовая повторяющаяся выручка по портфелю'), aggregate: 'sum' },
    { id: 'activeClients', title: translate('traction.workbookActiveClientsTitle', 'Активные клиенты (шт.)'), subtitle: translate('traction.workbookActiveClientsSubtitle', 'Платящие или активные клиенты по ежемесячным данным'), aggregate: 'sum' },
    { id: 'burnRate', title: translate('traction.workbookBurnTitle', 'Burn Rate (USD/мес.)'), subtitle: translate('traction.workbookBurnSubtitle', 'Месячный burn, где отрицательная динамика считается улучшением'), aggregate: 'sum' },
    { id: 'runway', title: translate('traction.workbookRunwayTitle', 'Runway (мес.)'), subtitle: translate('traction.workbookRunwaySubtitle', 'Средний запас денежных средств в месяцах'), aggregate: 'average' },
    { id: 'churnRate', title: translate('traction.workbookChurnTitle', 'Churn Rate (%)'), subtitle: translate('traction.workbookChurnSubtitle', 'Средний отток клиентов или выручки'), aggregate: 'average' },
  ];

  return definitions.map((definition) => {
    const tableRows = rows
      .map((row): TractionWorkbookRow => {
        const values: Record<string, number | undefined> = {};
        (row.startup.metricsHistory || []).forEach((snapshot) => {
          const key = getMonthKey(snapshot.date);
          if (!key || !months.includes(key)) return;
          const value = getMetricValueFromSnapshot(snapshot as unknown as { metrics: Record<string, unknown> }, definition.id);
          if (value != null) values[key] = value;
        });

        const currentValue = getCurrentMetricValue(row, definition.id);
        if (currentValue != null && values[latestMonth] == null) {
          values[latestMonth] = currentValue;
        }

        return {
          startupId: row.startup.id,
          startupName: row.name,
          status: row.status,
          values,
          momGrowth: calculateMonthlyGrowth(values, months),
        };
      })
      .sort((a, b) => a.startupName.localeCompare(b.startupName))
      .slice(0, 24);

    const totals = months.reduce<Record<string, number | undefined>>((acc, month) => {
      const values = tableRows
        .map((row) => row.values[month])
        .filter((value): value is number => value != null && Number.isFinite(value));
      if (!values.length) {
        acc[month] = undefined;
      } else if (definition.aggregate === 'sum') {
        acc[month] = values.reduce((sum, value) => sum + value, 0);
      } else {
        acc[month] = values.reduce((sum, value) => sum + value, 0) / values.length;
      }
      return acc;
    }, {});

    return {
      ...definition,
      rows: tableRows,
      totals,
      totalMomGrowth: calculateMonthlyGrowth(totals, months),
    };
  });
}

function formatWorkbookValue(metricId: TractionMetricId, value?: number): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (metricId === 'activeClients') return Math.round(value).toLocaleString(numberLocale());
  if (metricId === 'runway') return value.toLocaleString(numberLocale(), { maximumFractionDigits: 1 });
  if (metricId === 'churnRate') return formatPercent(value);
  return formatCurrency(value);
}

function getMomTone(metricId: TractionMetricId, value?: number): 'positive' | 'warning' | 'negative' | 'neutral' {
  if (value == null || !Number.isFinite(value)) return 'neutral';
  const inverse = metricId === 'cogs' || metricId === 'burnRate' || metricId === 'churnRate';
  if (inverse) {
    if (value < 0) return 'positive';
    if (value > 0.05) return 'negative';
    return 'warning';
  }
  if (value > 0.1) return 'positive';
  if (value < 0) return 'negative';
  return 'warning';
}

function formatWorkbookMom(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toLocaleString(numberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function safeStagedNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/[%$\s]/g, '').replace(',', '.');
  if (!cleaned || cleaned === '-' || cleaned === '—') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeStagedRatio(raw: string): number | null {
  const parsed = safeStagedNumber(raw);
  if (parsed == null) return null;
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
}

export function committedCellRaw(row: PortfolioRow, field: string): string {
  switch (field) {
    case 'name': return row.name === '-' ? '' : row.name;
    case 'segment': return row.segmentOverride || '';
    case 'industry': return row.industry === '-' ? '' : row.industry;
    case 'stage': return row.stage === '-' ? '' : row.stage;
    case 'country': return row.country === '-' ? '' : row.country;
    case 'investmentType': return row.investmentType;
    case 'entryDate': return toIsoDateInput(row.entryDate);
    case 'investedUsd': return row.investedUsd != null ? String(row.investedUsd) : '';
    case 'ownership': return row.ownership != null ? String(row.ownership * 100) : '';
    case 'entryValuation': return row.entryValuation != null ? String(row.entryValuation) : '';
    case 'currentValuation': return row.currentValuation != null ? String(row.currentValuation) : '';
    case 'moic': return row.moic != null ? String(row.moic) : '';
    case 'mrr': return row.mrr != null ? String(row.mrr) : '';
    case 'cac': return row.cac != null ? String(row.cac) : '';
    case 'churnRate': return row.churnRate != null ? String(row.churnRate * 100) : '';
    case 'runway': return row.runway != null ? String(row.runway) : '';
    case 'momGrowth': return row.momGrowth != null ? String(row.momGrowth * 100) : '';
    default: return '';
  }
}

export function applyStagedToRow(row: PortfolioRow, edits: Record<string, string> | undefined, usdToUzs: number): PortfolioRow {
  if (!edits || Object.keys(edits).length === 0) return row;
  const next: PortfolioRow = { ...row };
  for (const [field, raw] of Object.entries(edits)) {
    switch (field) {
      case 'name': next.name = raw || '-'; break;
      case 'segment': {
        const candidate = raw.trim().toLocaleLowerCase('en');
        const segment = PORTFOLIO_SEGMENTS.includes(candidate as PortfolioSegment)
          ? candidate as PortfolioSegment
          : undefined;
        next.segmentOverride = segment;
        if (segment) next.segment = segment;
        break;
      }
      case 'industry': next.industry = raw || '-'; break;
      case 'stage': next.stage = raw || '-'; break;
      case 'country': next.country = raw || '-'; break;
      case 'investmentType': next.investmentType = raw; break;
      case 'entryDate': { const d = raw ? new Date(raw) : null; next.entryDate = d && !Number.isNaN(d.getTime()) ? d : null; break; }
      case 'investedUsd': { const n = safeStagedNumber(raw); next.investedUsd = n ?? undefined; next.investedUzs = n != null ? n * usdToUzs : undefined; break; }
      case 'ownership': { const n = safeStagedRatio(raw); next.ownership = n ?? undefined; break; }
      case 'entryValuation': next.entryValuation = safeStagedNumber(raw) ?? undefined; break;
      case 'currentValuation': next.currentValuation = safeStagedNumber(raw) ?? undefined; break;
      case 'moic': next.moic = safeStagedNumber(raw) ?? undefined; break;
      case 'mrr': next.mrr = safeStagedNumber(raw) ?? undefined; break;
      case 'cac': next.cac = safeStagedNumber(raw) ?? undefined; break;
      case 'churnRate': next.churnRate = safeStagedRatio(raw) ?? undefined; break;
      case 'runway': next.runway = safeStagedNumber(raw) ?? undefined; break;
      case 'momGrowth': next.momGrowth = safeStagedRatio(raw) ?? undefined; break;
    }
  }
  return next;
}

function healthFlagToEditableTone(
  flag?: PortfolioHealthFlag,
): 'default' | 'green' | 'warning' | 'danger' {
  if (flag === 'green') return 'green';
  if (flag === 'yellow') return 'warning';
  if (flag === 'red') return 'danger';
  return 'default';
}

function segmentMarginThresholdTitle(
  segment: PortfolioSegment,
  thresholds: PortfolioSegmentThresholds,
  metric: 'grossMargin' | 'ebitdaMargin',
): string {
  const green = metric === 'grossMargin'
    ? thresholds.grossMarginGreen
    : thresholds.ebitdaMarginGreen;
  const yellow = metric === 'grossMargin'
    ? thresholds.grossMarginYellow
    : thresholds.ebitdaMarginYellow;
  const metricLabel = metric === 'grossMargin' ? 'Gross Margin' : 'EBITDA Margin';
  return `${getPortfolioSegmentLabel(segment)} · ${metricLabel}: green ≥ ${toPercentInput(green)}%, yellow ≥ ${toPercentInput(yellow)}%, red < ${toPercentInput(yellow)}%`;
}

export function buildPortfolioRow(startup: Startup, index: number, settings: EffectivePortfolioSettings): PortfolioRow {
  const metrics = startup.metrics || {};
  const rawMetrics = metrics as any;
  const rawStartup = startup as any;
  const rawBrief = startup.brief as any;
  const explicitSegment = (cleanText(
    rawStartup.portfolioSegment
    || rawBrief.portfolioSegment
    || rawMetrics.portfolioSegment,
  ) || '').toLocaleLowerCase('en');
  const segmentOverride = PORTFOLIO_SEGMENTS.includes(explicitSegment as PortfolioSegment)
    ? explicitSegment as PortfolioSegment
    : undefined;
  const segment = classifyPortfolioSegment({
    explicitSegment: segmentOverride,
    industry: startup.brief.industry,
    businessModel: [
      rawBrief.businessModel,
      rawBrief.customBusinessModel,
      rawStartup.businessModel,
    ].filter(Boolean).map(String),
    valueDeliveryModel: [
      rawBrief.valueDeliveryModel,
      rawStartup.valueDeliveryModel,
    ].filter(Boolean).map(String),
    description: [
      startup.brief.description,
      rawBrief.businessModelDescription,
      rawStartup.businessModelDescription,
    ].filter(Boolean).map(String).join(' '),
    tags: [
      ...toTextList(rawStartup.tags),
      ...toTextList(rawBrief.revenueModel),
      ...toTextList(rawStartup.revenueModel),
    ],
  });
  const segmentThresholds = settings.segmentThresholds[segment];
  const investedUsd = firstNumber(
    startup.investmentAmount,
    rawStartup.investedUsd,
    rawStartup.investmentUsd,
    rawStartup.amountInvested,
    rawStartup.investedAmount,
    rawMetrics.investedUsd,
    rawMetrics.investmentAmount
  );
  const investedUzs = investedUsd != null ? investedUsd * settings.usdToUzs : undefined;
  const explicitOwnership = firstStoredPortfolioRatio(
    rawStartup.ownership,
    rawMetrics.ownership,
  ) ?? firstRatio(
    rawStartup.ownershipPercent,
    rawStartup.equity,
    rawStartup.share,
    rawStartup.fundShare,
    rawStartup.dilutedOwnership,
    rawMetrics.ownershipPercent,
    rawMetrics.fundShare,
    rawBrief.ownership,
    rawBrief.ownershipPercent
  );
  const valuation = firstNumber(
    startup.valuation,
    rawStartup.entryValuation,
    rawStartup.entryValuationUsd,
    rawStartup.preMoneyValuation,
    rawStartup.postMoneyValuation,
    rawMetrics.entryValuation,
    rawMetrics.entryValuationUsd,
    rawMetrics.preMoneyValuation,
    rawMetrics.postMoneyValuation
  );
  const roundNewMoney = firstNumber(
    rawStartup.totalRoundSize,
    rawBrief.totalRoundSize,
    rawStartup.roundSize,
    rawMetrics.totalRoundSize,
    rawMetrics.roundSize,
    investedUsd,
  );
  const entryValuation = valuation != null && startup.valuationType === 'pre-money'
    ? calculatePostMoneyValuation(valuation, roundNewMoney)
    : valuation ?? (investedUsd != null && investedUsd > 0 && explicitOwnership ? investedUsd / explicitOwnership : undefined);
  const explicitMoic = firstNumber(
    rawMetrics.moic,
    rawMetrics.MOIC,
    rawMetrics.multiple,
    rawMetrics.investmentMultiple,
    rawMetrics.multipleOnInvestedCapital,
    rawStartup.moic,
    rawStartup.MOIC,
    rawStartup.portfolioMoic,
    rawBrief.moic
  );
  const explicitCurrentValuation = firstNumber(
    metrics.lastValuation,
    rawMetrics.currentValuation,
    rawMetrics.currentValuationUsd,
    rawMetrics.valuationCurrent,
    rawMetrics.fairValue,
    rawMetrics.markedValue,
    rawMetrics.latestValuation,
    rawBrief.lastValuation,
    rawBrief.currentValuation,
    rawStartup.currentValuation,
    rawStartup.lastValuation,
    rawStartup.currentValuationUsd,
    rawStartup.latestValuation
  );
  const currentValuation = explicitCurrentValuation ?? entryValuation;
  const ownershipRaw = explicitOwnership ?? calculateOwnership(investedUsd, entryValuation);
  const ownership = ownershipRaw != null ? Math.min(1, Math.max(0, ownershipRaw)) : undefined;
  const reportedPositionValue = explicitCurrentValuation != null
    ? (ownership != null ? explicitCurrentValuation * ownership : explicitCurrentValuation)
    : undefined;
  const reportedValuationMoic = calculateMoic(reportedPositionValue, investedUsd);
  const moic = reportedValuationMoic ?? explicitMoic;
  const moicDerived = reportedValuationMoic != null;
  const recurringRevenue = deriveRecurringRevenue({
    arr: firstNumber(metrics.arr, rawMetrics.annualRecurringRevenue, rawStartup.arr, rawBrief.arr),
    mrr: firstNumber(metrics.mrr, rawMetrics.monthlyRecurringRevenue, rawStartup.mrr, rawBrief.mrr),
  });
  const { arr, mrr } = recurringRevenue;
  const { cac, ltvCac, ltvCacDerived } = resolveStartupUnitEconomics(startup);
  const reportDate = cleanText(rawMetrics.reportDate)
    || cleanText(rawStartup.reportDate)
    || (startup.lastQuarterlyReportPeriod
      ? `${startup.lastQuarterlyReportPeriod.quarter}-${startup.lastQuarterlyReportPeriod.year}`
      : '-');
  const derivedYoyGrowth = getHistoricalGrowth(startup, 'yoy');
  const yoyGrowth = derivedYoyGrowth ?? firstStoredPortfolioRatio(rawMetrics.yoyGrowth) ?? firstRatio(
    rawMetrics.yearOverYearGrowth,
    rawStartup.yoyGrowth,
    rawBrief.yoyGrowth,
  );
  const derivedQoqGrowth = getHistoricalGrowth(startup, 'qoq');
  const qoqGrowth = derivedQoqGrowth ?? firstStoredPortfolioRatio(rawMetrics.qoqGrowth) ?? firstRatio(
    rawMetrics.quarterOverQuarterGrowth,
    rawStartup.qoqGrowth,
    rawBrief.qoqGrowth,
  );
  const derivedMomGrowth = getHistoricalGrowth(startup, 'mom');
  const momGrowth = getMomGrowth(startup, derivedMomGrowth);
  const latestSnapshotMetrics = (getLatestMetricSnapshots(startup)[0]?.metrics || {}) as Record<string, unknown>;
  const formulaRecords = [
    rawMetrics as Record<string, unknown>,
    latestSnapshotMetrics,
    rawMetrics.customMetrics as Record<string, unknown> | undefined,
    latestSnapshotMetrics.customMetrics as Record<string, unknown> | undefined,
  ];
  const revenue = firstNumber(
    rawMetrics.revenue,
    rawMetrics.totalRevenue,
    rawMetrics.periodRevenue,
    latestSnapshotMetrics.revenue,
    latestSnapshotMetrics.totalRevenue,
  );
  const cogs = firstNumber(
    getPortfolioCogs(rawMetrics as Record<string, unknown>),
    getPortfolioCogs(latestSnapshotMetrics),
  );
  const operatingExpenses = firstNumber(
    rawMetrics.operatingExpenses,
    rawMetrics.opex,
    rawMetrics.totalOperatingExpenses,
    latestSnapshotMetrics.operatingExpenses,
    latestSnapshotMetrics.opex,
    pickLooseMetricValue(formulaRecords, ['operatingexpenses', 'opex', 'operatingexpense']),
  );
  const reportedEbitda = firstNumber(rawMetrics.ebitda, latestSnapshotMetrics.ebitda, rawStartup.ebitda);
  const derivedEbitda = calculateEbitda(revenue, cogs, operatingExpenses);
  const ebitda = reportedEbitda ?? derivedEbitda;
  const reportedNetProfit = firstNumber(
    rawMetrics.netProfit,
    rawMetrics.netIncome,
    latestSnapshotMetrics.netProfit,
    latestSnapshotMetrics.netIncome,
    rawStartup.netProfit,
  );
  const taxes = firstNumber(
    rawMetrics.taxes,
    rawMetrics.taxExpense,
    latestSnapshotMetrics.taxes,
    latestSnapshotMetrics.taxExpense,
    pickLooseMetricValue(formulaRecords, ['taxes', 'taxexpense', 'incometax']),
  );
  const interestExpense = firstNumber(
    rawMetrics.interestExpense,
    latestSnapshotMetrics.interestExpense,
    pickLooseMetricValue(formulaRecords, ['interestexpense', 'financecost']),
  );
  const derivedNetProfit = calculateNetProfit(ebitda, taxes, interestExpense);
  const netProfit = reportedNetProfit ?? derivedNetProfit;
  const annualGrossMargin = calculateAnnualGrossMargin(
    (startup.metricsHistory || []).map((snapshot) => {
      const snapshotMetrics = snapshot.metrics as unknown as Record<string, unknown>;
      const snapshotRecurringRevenue = deriveRecurringRevenue({
        mrr: firstNumber(snapshotMetrics.mrr, snapshotMetrics.monthlyRecurringRevenue),
        arr: firstNumber(snapshotMetrics.arr, snapshotMetrics.annualRecurringRevenue),
      });
      return {
        date: String(snapshot.date || ''),
        mrr: snapshotRecurringRevenue.mrr,
        cogs: getPortfolioCogs(snapshotMetrics),
      };
    }),
  );
  const derivedGrossMargin = annualGrossMargin.value ?? calculateGrossMargin(mrr, cogs);
  const grossMargin = derivedGrossMargin
    ?? firstRatio(metrics.grossMargin, rawMetrics.grossMarginPercent, rawStartup.grossMargin);
  const derivedEbitdaMargin = calculateEbitdaMargin(ebitda, arr);
  const ebitdaMargin = derivedEbitdaMargin
    ?? firstRatio(rawMetrics.ebitdaMargin, rawMetrics.ebitdaMarginPercent, rawStartup.ebitdaMargin);
  const derivedNetMargin = calculateProfitMargin(netProfit, revenue);
  const netMargin = derivedNetMargin
    ?? firstRatio(rawMetrics.netMargin, rawMetrics.netProfitMargin, rawStartup.netMargin);
  const churnRate = firstRatio(
    rawMetrics.churnRate,
    latestSnapshotMetrics.churnRate,
    rawMetrics.churn,
    rawMetrics.monthlyChurn,
    rawMetrics.churnRatePercent,
    rawMetrics.customerChurnRate,
    rawMetrics.revenueChurnRate,
    latestSnapshotMetrics.churn,
    latestSnapshotMetrics.monthlyChurn,
    latestSnapshotMetrics.churnRatePercent,
    latestSnapshotMetrics.customerChurnRate,
    rawStartup.churnRate,
    rawBrief.churnRate,
  );
  const reportedRunway = firstNumber(
    metrics.runway,
    rawMetrics.runwayMonths,
    rawMetrics.monthsRunway,
    rawMetrics.cashRunway,
    rawMetrics.cashRunwayMonths,
    rawStartup.runway,
    rawStartup.runwayMonths,
    rawStartup.portfolioRunway,
    rawBrief.runway
  );
  const reportedRunwayInfinite = rawMetrics.runwayInfinite === true
    || [rawMetrics.runway, rawMetrics.runwayMonths, rawStartup.runway]
      .some((value) => /infinit|unlimited|бескон/i.test(String(value || '')));
  const payingCustomers = firstNumber(
    rawMetrics.payingCustomers,
    rawMetrics.payingUsers,
    rawMetrics.payingClients,
    rawStartup.payingCustomers,
    rawBrief.payingCustomers,
  );
  const reportedBurnRate = firstNumber(
    metrics.burnRate,
    rawMetrics.burn,
    rawMetrics.monthlyBurn,
    rawMetrics.netBurn,
    rawMetrics.burnUsd,
    rawStartup.burnRate,
    rawStartup.monthlyBurn,
    rawBrief.burnRate,
    latestSnapshotMetrics.burnRate,
    latestSnapshotMetrics.burn,
  );
  const derivedBurnRate = calculateNetBurn(revenue, cogs, operatingExpenses);
  const burnRate = reportedBurnRate ?? derivedBurnRate;
  const cashAtBank = firstNumber(
    rawMetrics.cashAtBank,
    rawMetrics.cashBalance,
    rawMetrics.cash,
    latestSnapshotMetrics.cashAtBank,
    latestSnapshotMetrics.cashBalance,
    rawStartup.cashAtBank,
  );
  const derivedRunway = calculateRunway(cashAtBank, burnRate);
  const hasDerivedRunway = derivedRunway.value != null || derivedRunway.infinite;
  const runway = hasDerivedRunway ? derivedRunway.value : reportedRunway;
  const runwayInfinite = hasDerivedRunway ? derivedRunway.infinite : reportedRunwayInfinite;
  const currentAssets = firstNumber(
    rawMetrics.currentAssets,
    latestSnapshotMetrics.currentAssets,
    pickLooseMetricValue(formulaRecords, ['currentassets', 'оборотныеактивы']),
  );
  const currentLiabilities = firstNumber(
    rawMetrics.currentLiabilities,
    latestSnapshotMetrics.currentLiabilities,
    pickLooseMetricValue(formulaRecords, ['currentliabilities', 'shorttermliabilities', 'краткосрочныеобязательства']),
  );
  const derivedCurrentRatio = calculateCurrentRatio(currentAssets, currentLiabilities);
  const currentRatio = derivedCurrentRatio
    ?? firstNumber(rawMetrics.currentRatio, rawMetrics.liquidityRatio, rawStartup.currentRatio);
  const totalDebt = firstNumber(
    rawMetrics.totalDebt,
    rawMetrics.debt,
    latestSnapshotMetrics.totalDebt,
    latestSnapshotMetrics.debt,
    rawStartup.totalDebt,
  );
  const bookEquity = firstNumber(
    rawMetrics.totalEquity,
    rawMetrics.bookEquity,
    rawMetrics.shareholdersEquity,
    rawMetrics.shareholderEquity,
    latestSnapshotMetrics.totalEquity,
    latestSnapshotMetrics.bookEquity,
    latestSnapshotMetrics.shareholdersEquity,
    pickLooseMetricValue(formulaRecords, ['bookequity', 'shareholdersequity', 'totalbookequity']),
  );
  const derivedDebtToEquity = calculateDebtToEquity(totalDebt, bookEquity);
  const debtToEquity = derivedDebtToEquity
    ?? firstNumber(rawMetrics.debtToEquity, rawMetrics.debtEquity, rawStartup.debtToEquity);
  const calculatedFields: PortfolioRow['calculatedFields'] = {
    investedUzs: investedUzs != null ? 'Вложено USD × курс UZS' : undefined,
    ownership: explicitOwnership == null && ownership != null ? 'Вложено USD ÷ оценка входа' : undefined,
    entryValuation: valuation == null && entryValuation != null
      ? 'Вложено USD ÷ доля фонда'
      : valuation != null && startup.valuationType === 'pre-money'
        ? 'Pre-money + новый капитал раунда'
        : undefined,
    moic: moicDerived ? '(Текущая оценка × доля фонда) ÷ вложено' : undefined,
    mrr: recurringRevenue.mrrDerived ? 'ARR ÷ 12' : undefined,
    arr: recurringRevenue.arrDerived ? 'MRR × 12' : undefined,
    ltvCac: ltvCacDerived ? 'LTV ÷ CAC' : undefined,
    yoyGrowth: derivedYoyGrowth != null ? 'Текущий период ÷ тот же период год назад − 1' : undefined,
    qoqGrowth: derivedQoqGrowth != null ? 'Текущий период ÷ предыдущий квартал − 1' : undefined,
    momGrowth: derivedMomGrowth != null ? 'Текущий месяц ÷ предыдущий месяц − 1' : undefined,
    grossMargin: annualGrossMargin.value != null
      ? `(Σ MRR ${annualGrossMargin.year} − Σ COGS ${annualGrossMargin.year}) ÷ Σ MRR ${annualGrossMargin.year}`
      : derivedGrossMargin != null
        ? '(MRR − COGS) ÷ MRR'
        : undefined,
    ebitdaMargin: derivedEbitdaMargin != null ? 'EBITDA ÷ ARR' : undefined,
    netMargin: derivedNetMargin != null ? 'Чистая прибыль ÷ выручка' : undefined,
    runway: hasDerivedRunway ? 'Cash at Bank ÷ Net Burn' : undefined,
    currentRatio: derivedCurrentRatio != null ? 'Оборотные активы ÷ краткосрочные обязательства' : undefined,
    ebitda: reportedEbitda == null && derivedEbitda != null ? 'Выручка − COGS − операционные расходы' : undefined,
    netProfit: reportedNetProfit == null && derivedNetProfit != null ? 'EBITDA − налоги − процентные расходы' : undefined,
    burnRate: reportedBurnRate == null && derivedBurnRate != null ? '−(Выручка − COGS − операционные расходы)' : undefined,
    debtToEquity: derivedDebtToEquity != null ? 'Общий долг ÷ собственный капитал' : undefined,
  };
  const scores = calculatePortfolioScores({
    yoyGrowth,
    qoqGrowth,
    momGrowth,
    grossMargin,
    ebitdaMargin,
    runway,
    runwayInfinite,
    currentRatio,
    segmentThresholds,
  });
  const assignedManagerName = cleanText(rawStartup.assignedManager?.name)
    || cleanText(rawStartup.assignedManagerName)
    || undefined;
  const responsiblePerson = cleanText(rawStartup.portfolioResponsiblePerson)
    || assignedManagerName
    || '-';
  const investmentType = startup.portfolioType === 'program' ? 'Accelerator' : 'Direct';
  const portfolioType = startup.portfolioType === 'program' ? 'program' : 'direct';
  const managerId = cleanText(rawStartup.assignedManagerId)
    || cleanText(rawStartup.managerId)
    || undefined;

  let status: TrafficStatus = portfolioScoreStatusToHealthFlag(scores.status) || 'gray';

  const autoStatus = status;
  const overrideRaw = String(rawStartup.portfolioHealthOverride || '').toLowerCase();
  const healthOverride = overrideRaw === 'green' || overrideRaw === 'yellow' || overrideRaw === 'red'
    ? (overrideRaw as Exclude<TrafficStatus, 'gray'>)
    : undefined;
  if (healthOverride) {
    status = healthOverride;
  }

  return {
    startup,
    number: index + 1,
    name: startup.brief.companyName || 'Без названия',
    industry: startup.brief.industry || '-',
    segment,
    segmentOverride,
    stage: startup.brief.stage || '-',
    country: startup.brief.country ? formatCountryName(startup.brief.country) : '-',
    reportDate,
    entryDate: toDate(startup.investmentDate) || toDate(startup.createdAt),
    investmentType,
    investedUsd,
    investedUzs,
    ownership,
    entryValuation,
    currentValuation,
    reportedValuationUsd: explicitCurrentValuation,
    explicitMoic,
    moic,
    mrr,
    arr,
    cac,
    ltvCac,
    yoyGrowth,
    qoqGrowth,
    runway,
    runwayInfinite,
    momGrowth,
    grossMargin,
    ebitdaMargin,
    currentRatio,
    ebitda,
    payingCustomers,
    netProfit,
    netMargin,
    churnRate,
    burnRate,
    cashAtBank,
    totalDebt,
    debtToEquity,
    scores,
    calculatedFields,
    responsiblePerson,
    managerId,
    managerName: assignedManagerName,
    portfolioType,
    status,
    autoStatus,
    healthOverride,
  };
}

function InfoCell({
  label,
  value,
  href,
  multiline = false,
}: {
  label: string;
  value?: ReactNode;
  href?: string;
  multiline?: boolean;
}) {
  if (value == null || value === false || value === '') return null;
  const ValueComponent = multiline ? InfoValueWrap : InfoValue;
  return (
    <InfoItem key={label}>
      <InfoLabel>{label}</InfoLabel>
      <ValueComponent>
        {href ? (
          <InlineLink href={href} target={href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer">
            <span>{value}</span>
            {!href.startsWith('mailto:') && !href.startsWith('tel:') && <ExternalLink />}
          </InlineLink>
        ) : value}
      </ValueComponent>
    </InfoItem>
  );
}

function DetailTags({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <DetailTagList>
      {items.map((item) => (
        <DetailTag key={item}>{item}</DetailTag>
      ))}
    </DetailTagList>
  );
}

function PortfolioStartupExtendedDetails({ row, reports = [] }: { row: PortfolioRow; reports?: QuarterlyReport[] }) {
  const { t } = useTranslation();
  const pf = useCallback((key: string, fallback: string, values?: Record<string, unknown>) => (
    t(`portfolio.${key}`, { defaultValue: fallback, ...(values || {}) }) as string
  ), [t]);
  const startup = row.startup;
  const brief = startup.brief || {};
  const rawStartup = startup as any;
  const rawBrief = brief as any;
  const metrics = startup.metrics || {};
  const rawMetrics = metrics as any;
  const unitEconomics = resolveStartupUnitEconomics(startup);
  const founder = startup.founder;
  const socialLinks = founder?.socialLinks || rawBrief.socialLinks || {};
  const fileUrls = startup.fileUrls || {};
  const materials = startup.materials || {};
  const moneyValue = (value?: number) => value != null ? formatCurrency(value) : undefined;
  const percentValue = (value?: number) => value != null ? formatPercent(value) : undefined;
  const numberValue = (value?: number) => value != null ? formatNumber(value) : undefined;
  const sourceLabel = useCallback((key: string, fallback: string) => pf(`fullCard.sources.${key}`, fallback), [pf]);
  const yesNo = useCallback((value: boolean) => pf(value ? 'common.yes' : 'common.no', value ? 'Да' : 'Нет'), [pf]);

  const founderName = getFounderDisplayName(startup);
  const founderEmail = cleanText(brief.founderEmail) || cleanText(founder?.email) || cleanText(rawStartup.founderEmail);
  const founderPhone = cleanText(brief.founderPhone) || cleanText(founder?.phone) || cleanText(rawStartup.founderPhone);
  const founderRole = cleanText(brief.founderRole) || cleanText(founder?.role);
  const founderLinkedin = cleanText(brief.founderLinkedin) || cleanText(socialLinks.linkedin);
  const website = cleanText(brief.website) || cleanText(founder?.website) || cleanText(rawStartup.website);
  const founderBackground = cleanText(founder?.background) || cleanText(rawBrief.founderBackground);
  const founderSuccessfulProject = cleanText(founder?.successfulProject) || cleanText(rawBrief.founderSuccessfulProject);

  const contactItems = [
    InfoCell({ label: founderRole || pf('fullCard.founder', 'Founder'), value: founderName }),
    InfoCell({ label: 'Email', value: founderEmail, href: founderEmail ? `mailto:${founderEmail}` : undefined }),
    InfoCell({ label: pf('fullCard.phone', 'Телефон'), value: founderPhone, href: founderPhone ? `tel:${founderPhone}` : undefined }),
    InfoCell({ label: pf('detail.website', 'Сайт'), value: website, href: website ? normalizeExternalUrl(website) : undefined }),
    InfoCell({ label: 'LinkedIn', value: founderLinkedin, href: founderLinkedin ? normalizeExternalUrl(founderLinkedin) : undefined }),
    InfoCell({ label: 'Telegram', value: cleanText(socialLinks.telegram), multiline: true }),
    InfoCell({ label: pf('fullCard.founderBackground', 'Founder background'), value: founderBackground, multiline: true }),
    InfoCell({ label: pf('fullCard.successfulProject', 'Успешный проект'), value: founderSuccessfulProject, multiline: true }),
  ];
  const hasContacts = contactItems.some(Boolean);

  const companyItems = [
    InfoCell({ label: pf('fullCard.foundedYear', 'Год основания'), value: cleanText(brief.foundedYear) }),
    InfoCell({ label: pf('fullCard.teamSize', 'Размер команды'), value: brief.teamSize ? pf('fullCard.peopleCount', '{{count}} чел.', { count: brief.teamSize }) : undefined }),
    InfoCell({ label: pf('detail.source', 'Источник'), value: startup.source }),
    InfoCell({ label: 'Cabinet login', value: startup.cabinetLogin }),
    InfoCell({ label: pf('fullCard.profileCompletion', 'Заполненность профиля'), value: startup.completionPercent != null ? `${startup.completionPercent}%` : undefined }),
    InfoCell({ label: pf('fullCard.latestQuarterlyReport', 'Последний quarterly report'), value: startup.lastQuarterlyReportPeriod ? `${startup.lastQuarterlyReportPeriod.quarter} ${startup.lastQuarterlyReportPeriod.year}` : undefined }),
  ];
  const hasCompanyItems = companyItems.some(Boolean);

  const businessModel = cleanText(rawBrief.customBusinessModel) || cleanText(brief.businessModel);
  const revenueModels = toTextList(brief.revenueModel);
  const valueDeliveryModel = cleanText(brief.valueDeliveryModel);
  const customerSegments = toTextList(brief.customerSegments);
  const businessDescription = cleanText(brief.businessModelDescription);
  const technologyDescription = cleanText(brief.technologyDescription);
  const hasBusinessDetails = Boolean(
    businessModel ||
    revenueModels.length ||
    valueDeliveryModel ||
    customerSegments.length ||
    businessDescription ||
    technologyDescription ||
    brief.hasTechnology != null
  );

  const tractionItems = [
    InfoCell({ label: 'Revenue', value: moneyValue(firstNumber(brief.revenue, rawBrief.annualRevenue, rawMetrics.revenue)) }),
    InfoCell({ label: 'Revenue growth', value: percentValue(firstRatio(brief.revenueGrowth, rawBrief.revenueGrowthPercent, rawMetrics.revenueGrowth)) }),
    InfoCell({ label: 'MRR', value: moneyValue(firstNumber(metrics.mrr, rawMetrics.monthlyRecurringRevenue, rawStartup.mrr, rawBrief.mrr)) }),
    InfoCell({ label: 'ARR', value: moneyValue(firstNumber(metrics.arr, rawMetrics.annualRecurringRevenue, rawStartup.arr, rawBrief.arr)) }),
    InfoCell({ label: 'GMV', value: moneyValue(firstNumber(metrics.gmv, rawMetrics.grossMerchandiseValue, rawStartup.gmv)) }),
    InfoCell({ label: 'ARPU', value: moneyValue(firstNumber(metrics.arpu, rawMetrics.averageRevenuePerUser)) }),
    InfoCell({ label: 'LTV', value: moneyValue(unitEconomics.ltv) }),
    InfoCell({ label: 'CAC', value: moneyValue(unitEconomics.cac) }),
    InfoCell({ label: 'LTV/CAC', value: unitEconomics.ltvCac != null ? formatMultiple(unitEconomics.ltvCac) : undefined }),
    InfoCell({ label: pf('table.grossMargin', 'Gross margin'), value: percentValue(firstRatio(metrics.grossMargin, rawMetrics.grossMarginPercent)) }),
    InfoCell({ label: pf('table.burnRate', 'Burn rate'), value: moneyValue(row.burnRate) }),
    InfoCell({ label: 'Runway', value: row.runway != null ? pf('fullCard.monthsValue', '{{value}} мес.', { value: row.runway.toLocaleString(numberLocale(), { maximumFractionDigits: 1 }) }) : undefined }),
    InfoCell({ label: `MoM ${pf('table.growth', 'рост')}`, value: row.momGrowth != null ? formatWorkbookMom(row.momGrowth) : undefined }),
    InfoCell({ label: 'Churn', value: percentValue(firstRatio(metrics.churnRate, brief.churnRate, rawMetrics.churnRatePercent)) }),
    InfoCell({ label: pf('fullCard.users', 'Пользователи'), value: cleanText(brief.userCount) || numberValue(firstNumber(rawBrief.users, rawMetrics.users, rawStartup.users)) }),
    InfoCell({ label: pf('fullCard.activeUsersPerMonth', 'Active users / month'), value: numberValue(firstNumber(brief.activeUsersPerMonth, rawMetrics.activeUsersPerMonth, rawMetrics.activeUsers)) }),
    InfoCell({ label: pf('fullCard.payingUsersPerMonth', 'Paying users / month'), value: numberValue(firstNumber(brief.payingUsersPerMonth, rawMetrics.payingUsersPerMonth, rawMetrics.payingUsers)) }),
  ];
  const hasTractionItems = tractionItems.some(Boolean);

  const fundingItems = [
    InfoCell({ label: pf('fullCard.fundingRequest', 'Funding request'), value: moneyValue(firstNumber(brief.fundingRequest, rawBrief.fundingNeeded)) }),
    InfoCell({ label: pf('fullCard.itpvRequest', 'ITPV request'), value: moneyValue(firstNumber(brief.itpvFundingRequest, rawBrief.itpvRequest)) }),
    InfoCell({ label: pf('fullCard.totalRoundSize', 'Total round size'), value: moneyValue(firstNumber(brief.totalRoundSize, rawBrief.roundSize)) }),
    InfoCell({ label: pf('fullCard.previousFunding', 'Previous funding'), value: moneyValue(firstNumber(brief.previousFunding, rawBrief.totalRaised)) }),
    InfoCell({ label: pf('lastValuation', 'Last valuation'), value: moneyValue(firstNumber(brief.lastValuation, metrics.lastValuation, rawStartup.lastValuation)) }),
    InfoCell({ label: pf('fullCard.useOfFunds', 'Use of funds'), value: cleanText(brief.useOfFunds), multiline: true }),
    InfoCell({ label: pf('fullCard.financialModelNotes', 'Financial model notes'), value: cleanText(materials.financialModelDescription), multiline: true }),
    InfoCell({ label: pf('fullCard.currentRevenueBurn', 'Current revenue / burn'), value: cleanText(materials.currentRevenueBurnRate), multiline: true }),
    InfoCell({ label: pf('fullCard.futurePlans', 'Future plans'), value: cleanText(materials.futurePlans), multiline: true }),
  ];
  const hasFundingItems = fundingItems.some(Boolean);

  const documentLinks = [
    { label: pf('fullCard.pitchDeck', 'Pitch deck'), url: cleanText(brief.pitchDeckUrl) || cleanText(fileUrls.pitchDeck), icon: FileText },
    { label: pf('fullCard.onePager', 'One pager'), url: cleanText(fileUrls.onePager), icon: FileText },
    { label: pf('fullCard.financialModel', 'Financial model'), url: cleanText(fileUrls.financialModel), icon: FileText },
    { label: pf('fullCard.logo', 'Logo'), url: cleanText(fileUrls.logo) || cleanText(startup.logo), icon: Globe },
    { label: pf('fullCard.video', 'Video'), url: cleanText(materials.videoLink), icon: Video },
  ]
    .map((item) => ({ ...item, url: normalizeFileUrl(item.url, startup.id) }))
    .filter((item) => item.url);

  const teamMembers = (startup.teamMembers || [])
    .map((member) => {
      const rawMember = member as any;
      const name = cleanText(rawMember.name) || [member.firstName, member.lastName].map(cleanText).filter(Boolean).join(' ');
      return {
        name,
        role: cleanText(member.role),
        email: cleanText(member.email),
        background: cleanText(member.background),
      };
    })
    .filter((member) => member.name || member.role || member.email || member.background);

  const investmentRounds = (startup.investments || []).filter((round) => round.amount || round.investorName || round.source);
  const latestReport = [...reports].sort((a, b) => reportTime(b) - reportTime(a))[0];
  const latestReportMetrics = latestReport?.metrics || {};
  const latestCustomMetrics = (latestReportMetrics.customMetrics || {}) as Record<string, unknown>;
  const dynamicLatestRecord = Array.isArray(rawStartup.dynamicMetrics)
    ? rawStartup.dynamicMetrics.reduce((acc: Record<string, unknown>, metric: any) => {
      const name = cleanText(metric?.name);
      const values = Array.isArray(metric?.values) ? metric.values : [];
      const latest = [...values].sort((a, b) => String(b?.period || '').localeCompare(String(a?.period || '')))[0];
      if (name && latest?.value != null) acc[name] = latest.value;
      return acc;
    }, {})
    : {};
  const looseMetricSources = [
    latestCustomMetrics,
    dynamicLatestRecord,
    rawMetrics as Record<string, unknown>,
    rawStartup as Record<string, unknown>,
    rawBrief as Record<string, unknown>,
  ];
  const looseValue = (patterns: string[]) => pickLooseMetricValue(looseMetricSources, patterns);
  const latestPeriod = latestReport ? reportPeriodLabel(latestReport) : sourceLabel('profile', 'Profile');
  const fixedMetricSource = latestReport ? latestPeriod : sourceLabel('profile', 'Profile');

  const pnlRows: MetricDisplayRow[] = [
    metricRow('Revenue', firstNumber(latestReportMetrics.revenue, brief.revenue, rawMetrics.revenue), 'currency', fixedMetricSource),
    metricRow('MRR', firstNumber(latestReportMetrics.mrr, metrics.mrr, rawMetrics.monthlyRecurringRevenue, rawStartup.mrr, rawBrief.mrr), 'currency', fixedMetricSource),
    metricRow('ARR', firstNumber(latestReportMetrics.arr, metrics.arr, rawMetrics.annualRecurringRevenue, rawStartup.arr, rawBrief.arr), 'currency', fixedMetricSource),
    metricRow(pf('fullCard.metrics.grossMargin', 'Gross margin'), firstRatio(metrics.grossMargin, rawMetrics.grossMarginPercent, looseValue(['grossmargin'])), 'percent', sourceLabel('metrics', 'Metrics')),
    metricRow(pf('fullCard.metrics.cogs', 'COGS / Cost of revenue'), looseValue(['cogs', 'costofgoods', 'costofrevenue']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.opex', 'OPEX / Operating expenses'), looseValue(['opex', 'operatingexpenses', 'expenses']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow('EBITDA', looseValue(['ebitda']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.netIncome', 'Net income / Profit'), looseValue(['netincome', 'netprofit', 'profit', 'pnl']), 'currency', sourceLabel('custom', 'Custom')),
  ];

  const balanceRows: MetricDisplayRow[] = [
    metricRow(pf('fullCard.metrics.cashBalance', 'Cash balance'), looseValue(['cashbalance', 'cashonhand', 'cashreserve']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('table.currentValuation', 'Current valuation'), row.currentValuation, 'currency', sourceLabel('portfolio', 'Portfolio')),
    metricRow(pf('table.entryValuation', 'Entry valuation'), row.entryValuation, 'currency', sourceLabel('portfolio', 'Portfolio')),
    metricRow(pf('detail.fundOwnership', 'Fund ownership'), row.ownership, 'percent', sourceLabel('portfolio', 'Portfolio')),
    metricRow(pf('fullCard.metrics.totalAssets', 'Total assets'), looseValue(['totalassets', 'assets']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.totalLiabilities', 'Total liabilities'), looseValue(['totalliabilities', 'liabilities']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.equityBookValue', 'Equity / Book value'), looseValue(['bookvalue', 'shareholdersequity', 'equityvalue']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow('Runway', firstNumber(latestReportMetrics.runway, row.runway, rawMetrics.runway), 'number', fixedMetricSource),
  ];

  const cashflowRows: MetricDisplayRow[] = [
    metricRow(pf('fullCard.metrics.burnPerMonth', 'Burn / month'), firstNumber(latestReportMetrics.burn, row.burnRate, rawMetrics.burnRate), 'currency', fixedMetricSource),
    metricRow(pf('fullCard.metrics.netCashFlow', 'Net cash flow'), looseValue(['netcashflow', 'cashflow']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.operatingCashFlow', 'Operating cash flow'), looseValue(['operatingcashflow', 'ocf']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.investingCashFlow', 'Investing cash flow'), looseValue(['investingcashflow']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.financingCashFlow', 'Financing cash flow'), looseValue(['financingcashflow']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.cashIn', 'Cash in'), looseValue(['cashin', 'cashreceived', 'inflow']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.metrics.cashOut', 'Cash out'), looseValue(['cashout', 'outflow']), 'currency', sourceLabel('custom', 'Custom')),
    metricRow(pf('fullCard.fundingRequest', 'Funding request'), firstNumber(brief.fundingRequest, rawBrief.fundingNeeded), 'currency', sourceLabel('application', 'Application')),
  ];

  const detailedCac = unitEconomics.cac ?? firstNumber(looseValue(['cac']));
  const detailedLtv = unitEconomics.ltv ?? firstNumber(looseValue(['ltv']));
  const detailedLtvCac = unitEconomics.ltvCac
    ?? (detailedLtv != null && detailedCac != null && detailedCac > 0
      ? detailedLtv / detailedCac
      : undefined);
  const clientRows: MetricDisplayRow[] = [
    metricRow(pf('fullCard.customerSegments', 'Customer segments'), customerSegments.length ? customerSegments.join(', ') : undefined, 'text', sourceLabel('application', 'Application')),
    metricRow(pf('fullCard.userCountRange', 'User count range'), brief.userCount, 'text', sourceLabel('application', 'Application')),
    metricRow(pf('fullCard.activeClientsUsers', 'Active clients / users'), firstNumber(
      brief.activeUsersPerMonth,
      rawMetrics.activeClients,
      rawMetrics.clients,
      rawMetrics.customers,
      rawMetrics.activeUsers,
      rawMetrics.mau,
      rawStartup.customers,
      looseValue(['activeclients', 'activecustomers', 'activeusers', 'mau'])
    ), 'number', sourceLabel('metrics', 'Metrics')),
    metricRow(pf('fullCard.payingCustomersUsers', 'Paying customers / users'), firstNumber(
      brief.payingUsersPerMonth,
      rawMetrics.payingCustomers,
      rawMetrics.payingUsers,
      looseValue(['payingcustomers', 'payingusers'])
    ), 'number', sourceLabel('metrics', 'Metrics')),
    metricRow('CAC', detailedCac, 'currency', sourceLabel('metrics', 'Metrics')),
    metricRow('ARPU', firstNumber(metrics.arpu, rawMetrics.averageRevenuePerUser, looseValue(['arpu'])), 'currency', sourceLabel('metrics', 'Metrics')),
    metricRow('LTV', detailedLtv, 'currency', sourceLabel('metrics', 'Metrics')),
    metricRow('LTV/CAC', detailedLtvCac != null ? formatMultiple(detailedLtvCac) : undefined, 'text', sourceLabel('metrics', 'Metrics')),
    metricRow('Churn', firstRatio(metrics.churnRate, brief.churnRate, rawMetrics.churnRatePercent, looseValue(['churn'])), 'percent', sourceLabel('metrics', 'Metrics')),
    metricRow(pf('fullCard.hasUsers', 'Has users'), typeof brief.hasUsers === 'boolean' ? yesNo(brief.hasUsers) : brief.hasUsers, 'text', sourceLabel('application', 'Application')),
    metricRow(pf('fullCard.hasPayingCustomers', 'Has paying customers'), typeof brief.hasPayingCustomers === 'boolean' ? yesNo(brief.hasPayingCustomers) : brief.hasPayingCustomers, 'text', sourceLabel('application', 'Application')),
  ];

  const allMetricRows = (() => {
    const rows: MetricDisplayRow[] = [];
    const seen = new Set<string>();
    const add = (label: string, value: unknown, source: string) => {
      if (value == null || value === '') return;
      const key = `${source}:${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(metricRow(label, value, 'text', source));
    };

    Object.entries(metrics as Record<string, unknown>).forEach(([key, value]) => add(key, value, 'startup.metrics'));
    Object.entries(latestReportMetrics as Record<string, unknown>).forEach(([key, value]) => {
      if (key !== 'customMetrics') add(key, value, latestReport ? `report ${reportPeriodLabel(latestReport)}` : 'latest report');
    });
    Object.entries(latestCustomMetrics).forEach(([key, value]) => add(key, value, latestReport ? `report custom ${reportPeriodLabel(latestReport)}` : 'report custom'));
    Object.entries(dynamicLatestRecord).forEach(([key, value]) => add(key, value, 'dynamic metrics'));
    return rows;
  })();

  const aiAnalysis = startup.aiAnalysis;
  const aiRecommendations = startup.aiRecommendations;
  const smartVal = startup.smartValDetails;
  const fundGateScores = startup.fundGateScores;
  const aiInfoItems = [
    InfoCell({ label: 'FundGate score', value: aiAnalysis?.score ?? startup.score ?? fundGateScores?.total }),
    InfoCell({ label: pf('fullCard.aiValuation', 'AI valuation'), value: moneyValue(aiAnalysis?.valuation) }),
    InfoCell({ label: pf('fullCard.recommendation', 'Recommendation'), value: aiAnalysis?.recommendation || aiRecommendations?.recommendation }),
    InfoCell({ label: pf('fullCard.analysisStatus', 'Analysis status'), value: startup.analysisStatus }),
    InfoCell({ label: pf('fullCard.smartValMethod', 'SmartVal method'), value: smartVal?.method }),
    InfoCell({ label: pf('fullCard.smartValConfidence', 'SmartVal confidence'), value: percentValue(smartVal?.confidence_score != null ? smartVal.confidence_score / 100 : undefined) }),
    InfoCell({ label: pf('fullCard.smartValValuation', 'SmartVal valuation'), value: formatSmartValValuation(smartVal) }),
    InfoCell({ label: pf('fullCard.analysisError', 'Analysis error'), value: startup.analysisError, multiline: true }),
  ];
  const scoreItems = Object.entries(fundGateScores || {})
    .filter(([key, value]) => value != null && ['A', 'B', 'C', 'D', 'E', 'F', 'total'].includes(key))
    .map(([key, value]) => InfoCell({
      label: key === 'total'
        ? pf('fullCard.totalScore', 'Total score')
        : pf('fullCard.scoreLetter', 'Score {{letter}}', { letter: key }),
      value: String(value),
    }));
  const aiTextBlocks = [
    { title: pf('fullCard.market', 'Market'), text: cleanText(aiAnalysis?.marketAnalysis) },
    { title: pf('fullCard.teamAnalysis', 'Team'), text: cleanText(aiAnalysis?.teamAnalysis) },
    { title: pf('fullCard.product', 'Product'), text: cleanText(aiAnalysis?.productAnalysis) },
    { title: pf('fullCard.financial', 'Financial'), text: cleanText(aiAnalysis?.financialAnalysis) },
    { title: pf('fullCard.overallComment', 'Overall comment'), text: cleanText(aiRecommendations?.overall_comment) },
    { title: pf('fullCard.detailedComment', 'Detailed comment'), text: cleanText(aiRecommendations?.detailed_comment) },
  ].filter((item) => item.text);
  const strengths = [...toTextList(aiAnalysis?.strengths), ...toTextList(aiRecommendations?.strengths)];
  const weaknesses = [...toTextList(aiAnalysis?.weaknesses), ...toTextList(aiRecommendations?.weaknesses)];
  const smartValRecommendations = toTextList(smartVal?.recommendations);
  const smartValBreakdown = Object.entries(smartVal?.breakdown || {});
  const hasAiDetails = aiInfoItems.some(Boolean) || scoreItems.some(Boolean) || aiTextBlocks.length || strengths.length || weaknesses.length || smartValRecommendations.length || smartValBreakdown.length;
  const renderMetricTable = (rows: MetricDisplayRow[]) => (
    <MiniTable>
      <thead>
        <tr>
          <th>{pf('fullCard.metric', 'Показатель')}</th>
          <th>{pf('fullCard.value', 'Значение')}</th>
          <th>{pf('detail.source', 'Источник')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => (
          <tr key={`${item.label}-${item.source || ''}`}>
            <td>{item.label}</td>
            <td>{item.value}</td>
            <td>{item.source || '-'}</td>
          </tr>
        ))}
      </tbody>
    </MiniTable>
  );

  return (
    <>
      {hasContacts && (
        <DetailCard id="contacts">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.contactsTitle', 'Контакты')}</DetailTitle>
              <DetailHint>{pf('fullCard.contactsHint', 'Контакты фаундера, социальные ссылки и публичное присутствие.')}</DetailHint>
            </div>
            <User />
          </DetailCardHeader>
          <InfoGrid>{contactItems}</InfoGrid>
        </DetailCard>
      )}

      {hasCompanyItems && (
        <DetailCard id="company-profile">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.companyProfileTitle', 'Профиль компании')}</DetailTitle>
              <DetailHint>{pf('fullCard.companyProfileHint', 'Операционные поля заявки без повторения инвестиционного summary.')}</DetailHint>
            </div>
            <BriefcaseBusiness />
          </DetailCardHeader>
          <InfoGrid>{companyItems}</InfoGrid>
        </DetailCard>
      )}

      {hasBusinessDetails && (
        <DetailCard id="business-model">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.businessProductTitle', 'Бизнес-модель и продукт')}</DetailTitle>
              <DetailHint>{pf('fullCard.businessProductHint', 'Клиентские сегменты, revenue logic и технологическая часть.')}</DetailHint>
            </div>
            <Code />
          </DetailCardHeader>
          <InfoGrid>
            {InfoCell({ label: pf('fullCard.businessModel', 'Business model'), value: businessModel })}
            {InfoCell({ label: pf('fullCard.valueDelivery', 'Value delivery'), value: valueDeliveryModel })}
            {InfoCell({ label: pf('fullCard.technology', 'Technology'), value: brief.hasTechnology != null ? (brief.hasTechnology ? pf('fullCard.hasOwnTechnology', 'Есть собственная технология') : pf('fullCard.notMarkedAsTechnology', 'Не указана как технологическая')) : undefined })}
            {InfoCell({ label: pf('fullCard.businessDescription', 'Business description'), value: businessDescription, multiline: true })}
            {InfoCell({ label: pf('fullCard.technologyDescription', 'Technology description'), value: technologyDescription, multiline: true })}
          </InfoGrid>
          {revenueModels.length > 0 && (
            <>
              <InfoLabel style={{ marginTop: 14, marginBottom: 8 }}>{pf('fullCard.revenueModels', 'Revenue models')}</InfoLabel>
              <DetailTags items={revenueModels} />
            </>
          )}
          {customerSegments.length > 0 && (
            <>
              <InfoLabel style={{ marginTop: 14, marginBottom: 8 }}>{pf('fullCard.customerSegments', 'Customer segments')}</InfoLabel>
              <DetailTags items={customerSegments} />
            </>
          )}
        </DetailCard>
      )}

      {hasTractionItems && (
        <DetailCard id="traction-metrics">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.tractionMetricsTitle', 'Traction и метрики')}</DetailTitle>
              <DetailHint>{pf('fullCard.tractionMetricsHint', 'Данные из заявки, portfolio metrics и последнего workbook состояния.')}</DetailHint>
            </div>
            <Activity />
          </DetailCardHeader>
          <InfoGrid>{tractionItems}</InfoGrid>
        </DetailCard>
      )}

      {hasFundingItems && (
        <DetailCard id="funding">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.fundingPlansTitle', 'Funding и планы')}</DetailTitle>
              <DetailHint>{pf('fullCard.fundingPlansHint', 'Запрос на финансирование, прошлые привлечения и use of funds.')}</DetailHint>
            </div>
            <DollarSign />
          </DetailCardHeader>
          <InfoGrid>{fundingItems}</InfoGrid>
          {investmentRounds.length > 0 && (
            <MiniTable style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>{pf('detail.source', 'Источник')}</th>
                  <th>{pf('capTable.investor', 'Инвестор')}</th>
                  <th>{pf('capTable.amount', 'Сумма')}</th>
                  <th>{pf('fullCard.date', 'Дата')}</th>
                </tr>
              </thead>
              <tbody>
                {investmentRounds.map((round, index) => (
                  <tr key={`${round.investorName || round.source}-${index}`}>
                    <td>{round.source || '-'}</td>
                    <td>{round.investorName || '-'}</td>
                    <td>{formatCurrency(round.amount)} {round.currency || 'USD'}</td>
                    <td>{formatFullDate(toDate(round.date))}</td>
                  </tr>
                ))}
              </tbody>
            </MiniTable>
          )}
        </DetailCard>
      )}

      <DetailCard id="financials">
        <DetailCardHeader>
          <div>
            <DetailTitle>{pf('fullCard.financialDataTitle', 'Финансовые данные')}</DetailTitle>
            <DetailHint>{pf('fullCard.financialDataHint', 'P&L, Balance Sheet и Cashflow. Если показатель пока не загружен, оставляем явный gap.')}</DetailHint>
          </div>
          <DollarSign />
        </DetailCardHeader>
        <DigestGrid>
          <DigestBox>
            <DigestBoxTitle>P&L</DigestBoxTitle>
            {renderMetricTable(pnlRows)}
          </DigestBox>
          <DigestBox>
            <DigestBoxTitle>Balance Sheet</DigestBoxTitle>
            {renderMetricTable(balanceRows)}
          </DigestBox>
          <DigestBox>
            <DigestBoxTitle>Cashflow</DigestBoxTitle>
            {renderMetricTable(cashflowRows)}
          </DigestBox>
          <DigestBox>
            <DigestBoxTitle>{pf('fullCard.reportNarrative', 'Report narrative')}</DigestBoxTitle>
            <NarrativeText>
              {latestReport?.narrative?.traction || latestReport?.narrative?.risks || latestReport?.narrative?.asks
                ? [
                  latestReport.narrative.traction ? `Traction: ${latestReport.narrative.traction}` : '',
                  latestReport.narrative.risks ? `Risks: ${latestReport.narrative.risks}` : '',
                  latestReport.narrative.asks ? `Asks: ${latestReport.narrative.asks}` : '',
                ].filter(Boolean).join('\n\n')
                : pf('fullCard.reportNarrativeEmpty', 'Квартальный narrative пока не заполнен.')}
            </NarrativeText>
          </DigestBox>
        </DigestGrid>
      </DetailCard>

      <DetailCard id="clients">
        <DetailCardHeader>
          <div>
            <DetailTitle>{pf('fullCard.clientBaseTitle', 'Клиентская база')}</DetailTitle>
            <DetailHint>{pf('fullCard.clientBaseHint', 'Сегменты, пользователи, платящие клиенты, CAC/LTV/ARPU и churn.')}</DetailHint>
          </div>
          <Users />
        </DetailCardHeader>
        {renderMetricTable(clientRows)}
      </DetailCard>

      {allMetricRows.length > 0 && (
        <DetailCard id="all-metrics">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.allMetricsTitle', 'Все показатели')}</DetailTitle>
              <DetailHint>{pf('fullCard.allMetricsHint', 'Все доступные startup metrics, quarterly custom metrics и dynamic metrics без скрытия отдельных значений.')}</DetailHint>
            </div>
            <BarChart3 />
          </DetailCardHeader>
          {renderMetricTable(allMetricRows)}
        </DetailCard>
      )}

      {documentLinks.length > 0 && (
        <DetailCard id="materials">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.materialsTitle', 'Материалы')}</DetailTitle>
              <DetailHint>{pf('fullCard.materialsHint', 'Файлы и ссылки, приложенные к заявке.')}</DetailHint>
            </div>
            <FileText />
          </DetailCardHeader>
          <DocumentLinkGrid>
            {documentLinks.map(({ label, url, icon: Icon }) => (
              <DocumentLink
                key={`${label}-${url}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  void openCrmFile(url);
                }}
              >
                <Icon />
                {label}
                <ExternalLink />
              </DocumentLink>
            ))}
          </DocumentLinkGrid>
        </DetailCard>
      )}

      {teamMembers.length > 0 && (
        <DetailCard id="team">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.teamTitle', 'Команда')}</DetailTitle>
              <DetailHint>{pf('fullCard.teamHint', 'Участники команды из заявки стартапа.')}</DetailHint>
            </div>
            <Users />
          </DetailCardHeader>
          <TeamGrid>
            {teamMembers.map((member, index) => (
              <TeamMemberBox key={`${member.name || member.email || member.role}-${index}`}>
                <TeamMemberName>{member.name || pf('fullCard.noName', 'Без имени')}</TeamMemberName>
                {member.role && <TeamMemberMeta>{member.role}</TeamMemberMeta>}
                {member.email && (
                  <TeamMemberMeta>
                    <InlineLink href={`mailto:${member.email}`}>{member.email}</InlineLink>
                  </TeamMemberMeta>
                )}
                {member.background && <TeamMemberMeta>{member.background}</TeamMemberMeta>}
              </TeamMemberBox>
            ))}
          </TeamGrid>
        </DetailCard>
      )}

      {hasAiDetails && (
        <DetailCard id="ai-scoring">
          <DetailCardHeader>
            <div>
              <DetailTitle>{pf('fullCard.aiScoringTitle', 'AI / Scoring')}</DetailTitle>
              <DetailHint>{pf('fullCard.aiScoringHint', 'FundGate score, SmartVal и аналитические выводы.')}</DetailHint>
            </div>
            <Sparkles />
          </DetailCardHeader>
          <InfoGrid>
            {aiInfoItems}
            {scoreItems}
          </InfoGrid>
          {aiTextBlocks.length > 0 && (
            <DigestGrid style={{ marginTop: 14 }}>
              {aiTextBlocks.map((block) => (
                <DigestBox key={block.title}>
                  <DigestBoxTitle>{block.title}</DigestBoxTitle>
                  <NarrativeText>{block.text}</NarrativeText>
                </DigestBox>
              ))}
            </DigestGrid>
          )}
          {(strengths.length > 0 || weaknesses.length > 0 || smartValRecommendations.length > 0) && (
            <DigestGrid style={{ marginTop: 14 }}>
              {strengths.length > 0 && (
                <DigestBox>
                  <DigestBoxTitle>{pf('fullCard.strengths', 'Strengths')}</DigestBoxTitle>
                  <DetailBulletList>{strengths.map((item) => <li key={item}>{item}</li>)}</DetailBulletList>
                </DigestBox>
              )}
              {weaknesses.length > 0 && (
                <DigestBox>
                  <DigestBoxTitle>{pf('fullCard.weaknesses', 'Weaknesses')}</DigestBoxTitle>
                  <DetailBulletList>{weaknesses.map((item) => <li key={item}>{item}</li>)}</DetailBulletList>
                </DigestBox>
              )}
              {smartValRecommendations.length > 0 && (
                <DigestBox>
                  <DigestBoxTitle>{pf('fullCard.smartValRecommendations', 'SmartVal recommendations')}</DigestBoxTitle>
                  <DetailBulletList>{smartValRecommendations.map((item) => <li key={item}>{item}</li>)}</DetailBulletList>
                </DigestBox>
              )}
            </DigestGrid>
          )}
          {smartValBreakdown.length > 0 && (
            <MiniTable style={{ marginTop: 14 }}>
              <thead>
                <tr>
                  <th>{pf('fullCard.factor', 'Фактор')}</th>
                  <th>{pf('fullCard.score', 'Score')}</th>
                  <th>{pf('fullCard.weight', 'Weight')}</th>
                  <th>{pf('fullCard.comment', 'Комментарий')}</th>
                </tr>
              </thead>
              <tbody>
                {smartValBreakdown.map(([factor, details]) => {
                  const typedDetails = details as { score?: number; weight?: number; comment?: string };
                  return (
                    <tr key={factor}>
                      <td>{factor}</td>
                      <td>{typedDetails.score ?? '-'}</td>
                      <td>{typedDetails.weight != null ? formatPercent(typedDetails.weight) : '-'}</td>
                      <td>{typedDetails.comment || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </MiniTable>
          )}
        </DetailCard>
      )}
    </>
  );
}

function getPortfolioMoic(rows: PortfolioRow[]): number | undefined {
  let positionTotal = 0;
  let investedTotal = 0;
  for (const row of rows) {
    if (row.investedUsd == null || row.moic == null) continue;
    positionTotal += row.moic * row.investedUsd;
    investedTotal += row.investedUsd;
  }
  return investedTotal ? positionTotal / investedTotal : undefined;
}

function averagePortfolioValue(rows: PortfolioRow[], getValue: (row: PortfolioRow) => number | undefined): number | undefined {
  const values = rows.map(getValue).filter((value): value is number => value != null && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function reportPeriodLabel(report?: Pick<QuarterlyReport, 'period'> | Pick<QuarterlyReportDigest, 'period'>): string {
  if (!report?.period) return 'Квартальный отчёт';
  return `${report.period.quarter} ${report.period.year}`;
}

function reportTime(report: QuarterlyReport): number {
  return (toDate(report.submittedAt) || toDate(report.updatedAt) || toDate(report.createdAt) || new Date(0)).getTime();
}

const PortfolioContent = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const segmentFilter = useMemo(
    () => getPortfolioSegmentFilter(location.search),
    [location.search],
  );
  const setSegmentFilter = useCallback((nextSegment: PortfolioSegmentFilter) => {
    const searchParams = new URLSearchParams(location.search);
    if (nextSegment === 'all') searchParams.delete('segment');
    else searchParams.set('segment', nextSegment);
    const nextSearch = searchParams.toString();
    navigate(
      `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash}`,
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);
  const { organization, updateOrganization, manager } = useAuth();
  const readOnly = useContext(PortfolioReadOnlyContext);
  const canManagePortfolioSettings = !readOnly
    && ['admin', 'ceo', 'deputy_investment'].includes(String(manager?.role || ''));
  const organizationSettings = useMemo(
    () => normalizePortfolioSettings(organization?.portfolioSettings, organization?.name),
    [organization?.id, organization?.name, organization?.portfolioSettings]
  );
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState<PortfolioQuickFilters>(() => createEmptyPortfolioQuickFilters());
  const [quickFiltersOpen, setQuickFiltersOpen] = useState(false);
  const [quickFiltersDrawerTarget, setQuickFiltersDrawerTarget] = useState<HTMLElement | null>(null);
  const [dashboardEditMode, setDashboardEditMode] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [savedColumnPreferences, setSavedColumnPreferences] = useState<PortfolioColumnPreferences>(
    () => normalizePortfolioColumnPreferences(DEFAULT_PORTFOLIO_COLUMN_PREFERENCES)
  );
  const [previewColumnPreferences, setPreviewColumnPreferences] = useState<PortfolioColumnPreferences>(
    () => normalizePortfolioColumnPreferences(DEFAULT_PORTFOLIO_COLUMN_PREFERENCES)
  );
  const [columnPreferencesSaving, setColumnPreferencesSaving] = useState(false);
  const [columnPreferencesError, setColumnPreferencesError] = useState<string | null>(null);
  const [rollbackingChangeId, setRollbackingChangeId] = useState<string | null>(null);
  const [pendingRollback, setPendingRollback] = useState<PortfolioDashboardChangeLogItem | null>(null);
  const [rolledBackChangeIds, setRolledBackChangeIds] = useState<Set<string>>(() => new Set());
  const [bubbleSizeMetric, setBubbleSizeMetric] = useState<BubbleSizeMetric>('valuation');
  const [bubbleSector, setBubbleSector] = useState('all');
  const [bubbleStage, setBubbleStage] = useState('all');
  const [bubbleStatus, setBubbleStatus] = useState<BubbleStatusFilter>('all');
  const [bubbleMinMoic, setBubbleMinMoic] = useState(0);
  const [selectedBubbleStartupId, setSelectedBubbleStartupId] = useState<string | null>(null);
  const activeSection = useMemo(() => getPortfolioSectionFromPath(location.pathname), [location.pathname]);
  const [selectedStartupId, setSelectedStartupId] = useState<string | undefined>();
  const [startupDropdownOpen, setStartupDropdownOpen] = useState(false);
  const [startupFilter, setStartupFilter] = useState('');
  const [healthDropdownOpen, setHealthDropdownOpen] = useState(false);
  const [quarterlyDigests, setQuarterlyDigests] = useState<QuarterlyReportDigest[]>([]);
  const [selectedReports, setSelectedReports] = useState<QuarterlyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [digestGeneratingId, setDigestGeneratingId] = useState<string | null>(null);
  const [portfolioSettings, setPortfolioSettings] = useState<EffectivePortfolioSettings>(organizationSettings);
  const [settingsDraft, setSettingsDraft] = useState<EffectivePortfolioSettings>(organizationSettings);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const tp = useCallback((key: string, fallback: string, values?: Record<string, unknown>) => (
    t(`portfolio.${key}`, { defaultValue: fallback, ...(values || {}) }) as string
  ), [t]);
  const navigateToPortfolioSection = useCallback((section: PortfolioSection) => {
    navigate(`${getPortfolioSectionPath(section)}${location.search}${location.hash}`);
  }, [location.hash, location.search, navigate]);
  useEffect(() => {
    if (activeSection === 'settings' && !canManagePortfolioSettings) {
      navigateToPortfolioSection('dashboard');
    }
  }, [activeSection, canManagePortfolioSettings, navigateToPortfolioSection]);
  useEffect(() => {
    if (activeSection !== 'dashboard' || readOnly) setDashboardEditMode(false);
  }, [activeSection, readOnly]);
  useEffect(() => {
    if (activeSection !== 'dashboard') {
      setIsTableFullscreen(false);
      setColumnManagerOpen(false);
    }
  }, [activeSection]);
  useEffect(() => {
    if (!isTableFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isTableFullscreen]);
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || columnManagerOpen || !isTableFullscreen) return;
      setIsTableFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [columnManagerOpen, isTableFullscreen]);
  useEffect(() => {
    if (!manager?.id) return undefined;
    let cancelled = false;
    setColumnPreferencesError(null);
    void managerApi.getMyPortfolioDashboardPreferences().then((response) => {
      if (cancelled || !response.success || !response.data) return;
      const normalized = normalizePortfolioColumnPreferences(response.data);
      setSavedColumnPreferences(normalized);
      setPreviewColumnPreferences(normalized);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [manager?.id]);
  const saveColumnPreferences = useCallback(async (preferences: PortfolioColumnPreferences) => {
    const normalized = normalizePortfolioColumnPreferences(preferences);
    setColumnPreferencesSaving(true);
    setColumnPreferencesError(null);
    try {
      const response = await managerApi.updateMyPortfolioDashboardPreferences({
        version: 1,
        columnOrder: [...normalized.columnOrder],
        hiddenColumnIds: [...normalized.hiddenColumnIds],
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'portfolio_column_preferences_save_failed');
      }
      const saved = normalizePortfolioColumnPreferences(response.data);
      setSavedColumnPreferences(saved);
      setPreviewColumnPreferences(saved);
      setColumnManagerOpen(false);
    } catch (error) {
      setColumnPreferencesError(error instanceof Error
        ? error.message
        : tp('columns.saveError', 'Не удалось сохранить настройки колонок'));
    } finally {
      setColumnPreferencesSaving(false);
    }
  }, [tp]);
  const closeColumnManager = useCallback(() => {
    setPreviewColumnPreferences(savedColumnPreferences);
    setColumnPreferencesError(null);
    setColumnManagerOpen(false);
  }, [savedColumnPreferences]);
  const toggleColumnManager = useCallback(() => {
    if (columnManagerOpen) {
      closeColumnManager();
      return;
    }
    setColumnPreferencesError(null);
    setColumnManagerOpen(true);
  }, [closeColumnManager, columnManagerOpen]);
  const toggleTableFullscreen = useCallback(() => {
    setShowChangeLog(false);
    setIsTableFullscreen((current) => !current);
  }, []);
  const monthShort = tp('units.monthShort', 'мес.');
  const perMonth = tp('units.perMonth', '/мес');
  const uzsBillionShort = tp('units.billionShort', 'млрд');
  const uzsMillionShort = tp('units.millionShort', 'млн');
  const formatUzsDisplay = useCallback((value?: number, compact = false) => (
    formatUzs(value, compact, { billion: uzsBillionShort, million: uzsMillionShort })
  ), [uzsBillionShort, uzsMillionShort]);
  const statusText = useCallback((status: TrafficStatus) => {
    const fallback: Record<TrafficStatus, string> = {
      green: 'Зелёный',
      yellow: 'Внимание',
      red: 'Критично',
      gray: 'Нет данных',
    };
    return tp(`status.${status}`, fallback[status]);
  }, [tp]);
  const scoreStatusText = useCallback((status: PortfolioScores['status']) => {
    if (!status) return statusText('gray');
    const key = {
      Strong: 'strong',
      Healthy: 'healthy',
      'Need attention': 'needAttention',
      'At Risk': 'atRisk',
      Critical: 'critical',
    }[status];
    return tp(`scoreStatus.${key}`, status);
  }, [statusText, tp]);
  const localizedAutoStatusLabel = useCallback((row: PortfolioRow) => {
    return scoreStatusText(row.scores.status);
  }, [scoreStatusText]);
  const rowStatusLabel = useCallback((row: PortfolioRow) => (
    row.healthOverride
      ? `${statusText(row.status)} · ${tp('status.manual', 'вручную')}`
      : localizedAutoStatusLabel(row)
  ), [localizedAutoStatusLabel, statusText, tp]);
  const rowAutoStatusLabel = localizedAutoStatusLabel;
  const healthOverrideOptions = useMemo<Array<{ value: HealthOverrideValue; label: string }>>(() => [
    { value: '', label: tp('detail.autoByMetrics', 'Авто (по метрикам)') },
    { value: 'green', label: tp('detail.greenManual', 'Зелёный — вручную') },
    { value: 'yellow', label: tp('detail.yellowManual', 'Внимание — вручную') },
    { value: 'red', label: tp('detail.redManual', 'Критично — вручную') },
  ], [tp]);
  const monthsLabel = useCallback((value: number | string) => `${value} ${monthShort}`, [monthShort]);
  const investmentTypeLabel = useCallback((value?: string) => {
    if (value === 'Accelerator') return tp('investmentType.accelerator', 'Акселератор');
    if (value === 'Direct') return tp('investmentType.direct', 'Прямые');
    return value || '-';
  }, [tp]);
  const localizedInvestmentTypeOptions = useMemo(() => (
    INVESTMENT_TYPE_OPTIONS.map((option) => ({
      ...option,
      label: investmentTypeLabel(option.value),
    }))
  ), [investmentTypeLabel]);
  const localizedSegmentOptions = useMemo<EditableCellOption[]>(() => (
    [
      { value: '', label: tp('segments.auto', 'Авто') },
      ...PORTFOLIO_SEGMENTS.map((segment) => ({
        value: segment,
        label: tp(`segments.${segment}`, getPortfolioSegmentLabel(segment)),
      })),
    ]
  ), [tp]);
  const dashboardColumnLabels = useMemo<Record<PortfolioColumnId, string>>(() => ({
    name: tp('table.startup', 'Стартап'),
    rowNumber: '#',
    segment: tp('table.segment', 'Направление'),
    industry: tp('table.sector', 'Сектор'),
    country: tp('table.country', 'Страна'),
    reportDate: tp('table.reportDate', 'Report Date'),
    stage: tp('table.stage', 'Стадия'),
    entryDate: `${tp('table.entryDateLine1', 'Дата')} ${tp('table.entryDateLine2', 'входа')}`,
    investmentType: `${tp('table.investmentTypeLine1', 'Тип')} ${tp('table.investmentTypeLine2', 'инвест.')}`,
    investedUsd: `${tp('table.invested', 'Вложено')} (USD)`,
    investedUzs: `${tp('table.invested', 'Вложено')} (UZS)`,
    ownership: `${tp('table.ownership', 'Доля')} %`,
    entryValuation: `${tp('table.entryValuation', 'Оценка входа')} (USD)`,
    currentValuation: `${tp('table.currentValuation', 'Тек. оценка')} (USD)`,
    moic: 'MOIC',
    mrr: 'MRR (USD)',
    arr: 'ARR (USD)',
    cac: 'CAC (USD)',
    ltvCac: 'LTV/CAC',
    yoyGrowth: `YoY ${tp('table.growth', 'рост')}`,
    qoqGrowth: `QoQ ${tp('table.growth', 'рост')}`,
    momGrowth: `MoM ${tp('table.growth', 'рост')}`,
    grossMargin: tp('table.grossMargin', 'Gross Margin'),
    ebitdaMargin: 'EBITDA Margin',
    runway: `Runway (${monthShort})`,
    currentRatio: 'Current Ratio',
    ebitda: 'EBITDA',
    payingCustomers: tp('table.payingCustomers', 'Paying Customers'),
    netProfit: tp('table.netProfit', 'Net Profit'),
    netMargin: tp('table.netMargin', 'Net Margin'),
    burnRate: tp('table.burnRate', 'Net Burn Rate'),
    cashAtBank: tp('table.cashAtBank', 'Cash at Bank'),
    totalDebt: tp('table.totalDebt', 'Total Debt'),
    debtToEquity: 'Debt / Equity',
    yoyScore: 'YoY Score',
    qoqScore: 'QoQ Score',
    momScore: 'MoM Score',
    grossMarginScore: 'Gross Margin Score',
    ebitdaScore: 'EBITDA Score',
    runwayScore: 'Runway Score',
    currentRatioScore: 'Current Ratio Score',
    totalScore: 'Total Score',
    status: tp('table.status', 'Статус'),
    responsiblePerson: tp('table.responsiblePerson', 'Ответственный'),
  }), [monthShort, tp]);
  const visibleDashboardColumnIds = useMemo(
    () => getVisiblePortfolioColumnIds(previewColumnPreferences),
    [previewColumnPreferences]
  );
  const dashboardTableMinWidth = useMemo(
    () => Math.max(170, calculateVisiblePortfolioColumnsWidth(previewColumnPreferences)),
    [previewColumnPreferences]
  );
  useEffect(() => {
    setPortfolioSettings(organizationSettings);
    setSettingsDraft(organizationSettings);
  }, [organizationSettings]);

  const reloadPortfolio = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [res, digestRes, organizationRes] = await Promise.all([
        startupsApi.getAll(organization.id),
        cabinetApi.getPortfolioQuarterlyDigests(organization.id),
        organizationApi.getById(organization.id),
      ]);
      if (res.success && res.data) {
        const portfolio = (res.data as unknown as Startup[]).filter((s) => {
          if (s.status !== 'portfolio' || s.isArchived) return false;
          const name = String(s.brief?.companyName || '').trim().toLowerCase();
          return name !== 'итого портфель' && name !== 'your fund name' && name !== 'total portfolio';
        });
        setStartups(portfolio);
      }
      if (digestRes.success && digestRes.data) setQuarterlyDigests(digestRes.data);
      if (organizationRes.success && organizationRes.data) {
        updateOrganization(organizationRes.data);
        const latestSettings = normalizePortfolioSettings(organizationRes.data.portfolioSettings, organizationRes.data.name);
        setPortfolioSettings(latestSettings);
        setSettingsDraft(latestSettings);
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    reloadPortfolio();
  }, [reloadPortfolio]);

  const flashPortfolioCell = useCallback((startupId: string, field: string) => {
    window.setTimeout(() => {
      const rowEl = document.querySelector<HTMLElement>(`tr[data-startup-id="${startupId}"]`);
      if (!rowEl) return;
      const columnId = PORTFOLIO_FIELD_COLUMN_ID[field];
      const cell = columnId
        ? rowEl.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`)
        : null;
      const flashEl: HTMLElement = cell || rowEl;
      flashEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      flashEl.style.transition = 'background-color 0.25s, box-shadow 0.25s';
      flashEl.style.backgroundColor = 'rgba(16, 185, 129, 0.32)';
      flashEl.style.boxShadow = 'inset 0 0 0 2px #10b981';
      window.setTimeout(() => {
        flashEl.style.backgroundColor = '';
        flashEl.style.boxShadow = '';
      }, 1800);
    }, 160);
  }, []);

  const rows = useMemo(
    () => startups.map((startup, index) => buildPortfolioRow(startup, index, portfolioSettings)),
    [portfolioSettings, startups]
  );

  const dashboardFilterOptions = useMemo(() => {
    const options = getPortfolioDashboardFilterOptions(rows, tp('filters.missing', 'Не указано'));
    return {
      ...options,
      statuses: options.statuses.map((option) => ({
        ...option,
        label: option.isMissing ? option.label : statusText(option.value as TrafficStatus),
      })),
      portfolioTypes: options.portfolioTypes.map((option) => ({
        ...option,
        label: option.isMissing
          ? option.label
          : investmentTypeLabel(option.value === 'program' ? 'Accelerator' : 'Direct'),
      })),
    };
  }, [investmentTypeLabel, rows, statusText, tp]);

  const dashboardRowsBeforeSegment = useMemo(
    () => filterPortfolioDashboardRows(rows, quickFilters, search),
    [quickFilters, rows, search]
  );
  const segmentFilterOptions = useMemo(() => {
    const counts = new Map<PortfolioSegment, number>(
      PORTFOLIO_SEGMENTS.map((segment) => [segment, 0]),
    );
    dashboardRowsBeforeSegment.forEach((row) => {
      counts.set(row.segment, (counts.get(row.segment) || 0) + 1);
    });

    return [
      {
        value: 'all' as const,
        label: tp('segments.all', 'Все направления'),
        count: dashboardRowsBeforeSegment.length,
        isMissing: false,
      },
      ...PORTFOLIO_SEGMENTS.map((segment) => ({
        value: segment,
        label: tp(`segments.${segment}`, getPortfolioSegmentLabel(segment)),
        count: counts.get(segment) || 0,
        isMissing: false,
      })),
    ];
  }, [dashboardRowsBeforeSegment, tp]);
  const filteredRows = useMemo(
    () => segmentFilter === 'all'
      ? dashboardRowsBeforeSegment
      : dashboardRowsBeforeSegment.filter((row) => row.segment === segmentFilter),
    [dashboardRowsBeforeSegment, segmentFilter]
  );

  const mergeStartupPatch = useCallback((startup: Startup, patch: Record<string, unknown>): Startup => ({
    ...startup,
    ...patch,
    brief: patch.brief
      ? { ...(startup.brief || {}), ...(patch.brief as Record<string, unknown>) }
      : startup.brief,
    metrics: patch.metrics
      ? { ...((startup.metrics || {}) as Record<string, unknown>), ...(patch.metrics as Record<string, unknown>) }
      : startup.metrics,
    metricsHistory: patch.metricsHistory
      ? patch.metricsHistory as unknown as Startup['metricsHistory']
      : startup.metricsHistory,
    investments: patch.investments
      ? patch.investments as unknown as Startup['investments']
      : startup.investments,
  }), []);

  const saveStartupPatch = useCallback(async (startupId: string, patch: Record<string, unknown>) => {
    const response = await startupsApi.update(startupId, {
      ...patch,
      suppressFounderNotification: true,
    } as never);

    if (!response.success) {
      throw new Error(response.error || 'portfolio_cell_update_failed');
    }

    setStartups((current) => current.map((startup) => {
      if (startup.id !== startupId) return startup;
      return response.data
        ? response.data as unknown as Startup
        : mergeStartupPatch(startup, patch);
    }));
  }, [mergeStartupPatch]);

  const savePortfolioCell = useCallback(async (
    row: PortfolioRow,
    field: string,
    rawValue: string,
    rollback?: { activityId: string; field: string },
  ): Promise<Startup | null> => {
    const response = await startupsApi.updatePortfolioCell(row.startup.id, {
      section: 'dashboard',
      field,
      value: rawValue,
      ...(rollback ? { rollback } : {}),
    });

    if (!response.success) {
      throw new Error(response.error || 'portfolio_cell_update_failed');
    }

    const updatedStartup = response.data ? (response.data as unknown as Startup) : null;
    setStartups((current) => current.map((startup) =>
      startup.id === row.startup.id && updatedStartup
        ? updatedStartup
        : startup
    ));
    return updatedStartup;
  }, []);

  const dashboardChangeLog = useMemo(
    () => buildPortfolioDashboardChangeLog(rows, tp, rolledBackChangeIds),
    [rows, tp, rolledBackChangeIds]
  );

  const requestRollbackChange = useCallback((change: PortfolioDashboardChangeLogItem) => {
    if (rollbackingChangeId) return;
    setPendingRollback(change);
  }, [rollbackingChangeId]);

  const cancelRollbackChange = useCallback(() => {
    if (rollbackingChangeId) return;
    setPendingRollback(null);
  }, [rollbackingChangeId]);

  const confirmRollbackChange = useCallback(async () => {
    const change = pendingRollback;
    if (!change) return;
    const row = rows.find((item) => item.startup.id === change.startupId);
    if (!row) {
      setPendingRollback(null);
      return;
    }
    setRollbackingChangeId(change.id);
    try {
      const updated = await savePortfolioCell(
        row,
        change.field,
        rollbackPortfolioCellValue(change.field, change.oldValue),
        change.activityId ? { activityId: change.activityId, field: change.fieldKey } : undefined,
      );
      setRolledBackChangeIds((current) => {
        const next = new Set(current);
        next.add(change.id);
        if (updated) {
          const reverseEntry = collectStartupDashboardChanges(updated, change.startupName, tp)
            .filter((item) => (
              item.field === change.field &&
              formatPortfolioAuditValue(item.field, item.oldValue) === formatPortfolioAuditValue(change.field, change.newValue) &&
              formatPortfolioAuditValue(item.field, item.newValue) === formatPortfolioAuditValue(change.field, change.oldValue)
            ))
            .sort((a, b) => (b.changedAt?.getTime() || 0) - (a.changedAt?.getTime() || 0))[0];
          if (reverseEntry) next.add(reverseEntry.id);
        }
        return next;
      });
      setPendingRollback(null);
    } catch (err) {
      console.error('portfolio rollback failed', err);
    } finally {
      setRollbackingChangeId(null);
    }
  }, [pendingRollback, rows, savePortfolioCell, tp]);

  const handleHealthOverrideChange = useCallback(async (row: PortfolioRow, rawValue: string) => {
    try {
      await savePortfolioCell(row, 'healthOverride', rawValue);
    } catch (err) {
      console.error('health override update failed', err);
    }
  }, [savePortfolioCell]);

  const saveCapTableCell = useCallback(async (capRow: CapTableWorkbookRow, field: string, rawValue: string) => {
    const response = await startupsApi.updatePortfolioCell(capRow.startupId, {
      section: 'cap_table',
      rowId: capRow.id,
      rowKind: capRow.isFounder ? 'founder' : capRow.isFund ? 'fund' : 'investment',
      field,
      value: rawValue,
    });

    if (!response.success) {
      throw new Error(response.error || 'portfolio_cell_update_failed');
    }

    setStartups((current) => current.map((startup) =>
      startup.id === capRow.startupId && response.data
        ? response.data as unknown as Startup
        : startup
    ));
  }, []);

  const saveTractionCell = useCallback(async (
    tractionRow: TractionWorkbookRow,
    metricId: TractionMetricId,
    month: string,
    rawValue: string
  ) => {
    const response = await startupsApi.updatePortfolioCell(tractionRow.startupId, {
      section: 'traction',
      field: getMetricFieldName(metricId),
      metricId,
      month,
      value: rawValue,
    });

    if (!response.success) {
      throw new Error(response.error || 'portfolio_cell_update_failed');
    }

    setStartups((current) => current.map((startup) =>
      startup.id === tractionRow.startupId && response.data
        ? response.data as unknown as Startup
        : startup
    ));
  }, []);

  const summary = useMemo(() => {
    const financial = calculatePortfolioDashboardSummary(filteredRows);
    const runwayRows = filteredRows.filter((row) => row.runway != null);
    const burnRows = filteredRows.filter((row) => row.burnRate != null);

    return {
      total: financial.total,
      direct: financial.direct,
      accelerator: financial.program,
      totalInvestedUsd: financial.totalInvestedUsd,
      totalInvestedUzs: financial.totalInvestedUsd * portfolioSettings.usdToUzs,
      totalPositionNavUsd: financial.totalPositionNavUsd,
      avgMoic: financial.weightedMoic,
      avgRunway: runwayRows.length ? runwayRows.reduce((sum, row) => sum + (row.runway || 0), 0) / runwayRows.length : undefined,
      avgBurn: burnRows.length ? burnRows.reduce((sum, row) => sum + (row.burnRate || 0), 0) / burnRows.length : undefined,
    };
  }, [portfolioSettings.usdToUzs, filteredRows]);

  const financialRows = useMemo(
    () => filteredRows.filter((row) => row.portfolioType !== 'program'),
    [filteredRows]
  );

  const renderDashboardCell = (row: PortfolioRow, columnId: PortfolioColumnId): ReactNode => {
    const dataProps = { 'data-column-id': columnId };
    switch (columnId) {
      case 'name':
        return (
          <StickyNameTd {...dataProps} $strong>
            <EditableCell
              value={row.name === '-' ? '' : row.name}
              displayValue={row.name}
              strong
              onSave={(value) => savePortfolioCell(row, 'name', value)}
            />
          </StickyNameTd>
        );
      case 'rowNumber':
        return <Td {...dataProps} $align="center">{row.number}</Td>;
      case 'segment':
        return (
          <Td {...dataProps}>
            <EditableCell
              type="select"
              value={row.segmentOverride || ''}
              displayValue={tp(`segments.${row.segment}`, getPortfolioSegmentLabel(row.segment))}
              options={localizedSegmentOptions}
              onSave={(value) => savePortfolioCell(row, 'segment', value)}
            />
          </Td>
        );
      case 'industry':
        return <Td {...dataProps}><EditableCell value={row.industry === '-' ? '' : row.industry} displayValue={row.industry} onSave={(value) => savePortfolioCell(row, 'industry', value)} /></Td>;
      case 'country':
        return <Td {...dataProps}><EditableCell type="select" value={row.country === '-' ? '' : row.country} displayValue={row.country} options={buildCountryOptions(row.country === '-' ? '' : row.country)} onSave={(value) => savePortfolioCell(row, 'country', value)} /></Td>;
      case 'reportDate':
        return <Td {...dataProps}><EditableCell value={row.reportDate === '-' ? '' : row.reportDate} displayValue={row.reportDate} onSave={(value) => savePortfolioCell(row, 'reportDate', value)} /></Td>;
      case 'stage':
        return <Td {...dataProps}><EditableCell value={row.stage === '-' ? '' : row.stage} displayValue={row.stage} onSave={(value) => savePortfolioCell(row, 'stage', value)} /></Td>;
      case 'entryDate':
        return <Td {...dataProps}><EditableCell type="date" value={toIsoDateInput(row.entryDate)} displayValue={formatDate(row.entryDate)} onSave={(value) => savePortfolioCell(row, 'entryDate', value)} /></Td>;
      case 'investmentType':
        return <Td {...dataProps}><EditableCell type="select" value={row.investmentType} displayValue={investmentTypeLabel(row.investmentType)} options={localizedInvestmentTypeOptions} onSave={(value) => savePortfolioCell(row, 'investmentType', value)} /></Td>;
      case 'investedUsd':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" tone="blue" value={row.investedUsd != null ? String(row.investedUsd) : ''} displayValue={formatCurrency(row.investedUsd)} onSave={(value) => savePortfolioCell(row, 'investedUsd', value)} /></Td>;
      case 'investedUzs':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" tone="green" disabled={Boolean(row.calculatedFields.investedUzs)} formula={row.calculatedFields.investedUzs} value={row.investedUzs != null ? String(row.investedUzs) : ''} displayValue={formatUzsDisplay(row.investedUzs)} onSave={(value) => savePortfolioCell(row, 'investedUzs', value)} /></Td>;
      case 'ownership':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.ownership)} formula={row.calculatedFields.ownership} value={row.ownership != null ? String(row.ownership * 100) : ''} displayValue={formatPercent(row.ownership)} onSave={(value) => savePortfolioCell(row, 'ownership', value)} /></Td>;
      case 'entryValuation':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.entryValuation)} formula={row.calculatedFields.entryValuation} value={row.entryValuation != null ? String(row.entryValuation) : ''} displayValue={formatCurrency(row.entryValuation)} onSave={(value) => savePortfolioCell(row, 'entryValuation', value)} /></Td>;
      case 'currentValuation':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" value={row.currentValuation != null ? String(row.currentValuation) : ''} displayValue={formatCurrency(row.currentValuation)} onSave={(value) => savePortfolioCell(row, 'currentValuation', value)} /></Td>;
      case 'moic':
        return <MoicCell {...dataProps} $align="right" $status={row.status}><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.moic)} formula={row.calculatedFields.moic} tone={row.status === 'red' ? 'danger' : row.status === 'yellow' ? 'warning' : row.status === 'green' ? 'green' : 'default'} value={row.moic != null ? String(row.moic) : ''} displayValue={formatMultiple(row.moic)} onSave={(value) => savePortfolioCell(row, 'moic', value)} /></MoicCell>;
      case 'mrr':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.mrr)} formula={row.calculatedFields.mrr} value={row.mrr != null ? String(row.mrr) : ''} displayValue={formatCurrency(row.mrr)} onSave={(value) => savePortfolioCell(row, 'mrr', value)} /></Td>;
      case 'arr':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.arr)} formula={row.calculatedFields.arr} value={row.arr != null ? String(row.arr) : ''} displayValue={formatCurrency(row.arr)} onSave={(value) => savePortfolioCell(row, 'arr', value)} /></Td>;
      case 'cac':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" value={row.cac != null ? String(row.cac) : ''} displayValue={formatCurrency(row.cac)} onSave={(value) => savePortfolioCell(row, 'cac', value)} /></Td>;
      case 'ltvCac':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled formula={row.calculatedFields.ltvCac || 'LTV/CAC'} value={row.ltvCac != null ? String(row.ltvCac) : ''} displayValue={row.ltvCac != null ? formatMultiple(row.ltvCac) : '-'} onSave={() => undefined} /></Td>;
      case 'yoyGrowth':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.yoyGrowth)} formula={row.calculatedFields.yoyGrowth} value={row.yoyGrowth != null ? String(row.yoyGrowth * 100) : ''} displayValue={formatPercent(row.yoyGrowth)} onSave={(value) => savePortfolioCell(row, 'yoyGrowth', value)} /></Td>;
      case 'qoqGrowth':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.qoqGrowth)} formula={row.calculatedFields.qoqGrowth} value={row.qoqGrowth != null ? String(row.qoqGrowth * 100) : ''} displayValue={formatPercent(row.qoqGrowth)} onSave={(value) => savePortfolioCell(row, 'qoqGrowth', value)} /></Td>;
      case 'momGrowth':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.momGrowth)} formula={row.calculatedFields.momGrowth} value={row.momGrowth != null ? String(row.momGrowth * 100) : ''} displayValue={formatPercent(row.momGrowth)} onSave={(value) => savePortfolioCell(row, 'momGrowth', value)} /></Td>;
      case 'grossMargin':
        return (
          <Td
            {...dataProps}
            $align="right"
            title={segmentMarginThresholdTitle(
              row.segment,
              portfolioSettings.segmentThresholds[row.segment],
              'grossMargin',
            )}
          >
            <EditableCell
              type="number"
              align="right"
              disabled={Boolean(row.calculatedFields.grossMargin)}
              formula={row.calculatedFields.grossMargin}
              tone={healthFlagToEditableTone(row.scores.grossMarginStatus)}
              value={row.grossMargin != null ? String(row.grossMargin * 100) : ''}
              displayValue={formatPercent(row.grossMargin)}
              onSave={(value) => savePortfolioCell(row, 'grossMargin', value)}
            />
          </Td>
        );
      case 'ebitdaMargin':
        return (
          <Td
            {...dataProps}
            $align="right"
            title={segmentMarginThresholdTitle(
              row.segment,
              portfolioSettings.segmentThresholds[row.segment],
              'ebitdaMargin',
            )}
          >
            <EditableCell
              type="number"
              align="right"
              disabled={Boolean(row.calculatedFields.ebitdaMargin)}
              formula={row.calculatedFields.ebitdaMargin}
              tone={healthFlagToEditableTone(row.scores.ebitdaMarginStatus)}
              value={row.ebitdaMargin != null ? String(row.ebitdaMargin * 100) : ''}
              displayValue={formatPercent(row.ebitdaMargin)}
              onSave={(value) => savePortfolioCell(row, 'ebitdaMargin', value)}
            />
          </Td>
        );
      case 'runway':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.runway)} formula={row.calculatedFields.runway} value={row.runway != null ? String(row.runway) : ''} displayValue={row.runwayInfinite ? '∞' : row.runway != null ? row.runway.toLocaleString(numberLocale()) : '-'} onSave={(value) => savePortfolioCell(row, 'runway', value)} /></Td>;
      case 'currentRatio':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.currentRatio) || row.currentRatio === Number.POSITIVE_INFINITY} formula={row.calculatedFields.currentRatio} value={Number.isFinite(row.currentRatio) ? String(row.currentRatio) : ''} displayValue={row.currentRatio === Number.POSITIVE_INFINITY ? '∞' : row.currentRatio != null ? row.currentRatio.toLocaleString(numberLocale(), { maximumFractionDigits: 2 }) : '-'} onSave={(value) => savePortfolioCell(row, 'currentRatio', value)} /></Td>;
      case 'ebitda':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.ebitda)} formula={row.calculatedFields.ebitda} value={row.ebitda != null ? String(row.ebitda) : ''} displayValue={formatCurrency(row.ebitda)} onSave={(value) => savePortfolioCell(row, 'ebitda', value)} /></Td>;
      case 'payingCustomers':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" value={row.payingCustomers != null ? String(row.payingCustomers) : ''} displayValue={row.payingCustomers != null ? row.payingCustomers.toLocaleString(numberLocale(), { maximumFractionDigits: 0 }) : '-'} onSave={(value) => savePortfolioCell(row, 'payingCustomers', value)} /></Td>;
      case 'netProfit':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.netProfit)} formula={row.calculatedFields.netProfit} value={row.netProfit != null ? String(row.netProfit) : ''} displayValue={formatCurrency(row.netProfit)} onSave={(value) => savePortfolioCell(row, 'netProfit', value)} /></Td>;
      case 'netMargin':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.netMargin)} formula={row.calculatedFields.netMargin} value={row.netMargin != null ? String(row.netMargin * 100) : ''} displayValue={formatPercent(row.netMargin)} onSave={(value) => savePortfolioCell(row, 'netMargin', value)} /></Td>;
      case 'burnRate':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.burnRate)} formula={row.calculatedFields.burnRate} value={row.burnRate != null ? String(row.burnRate) : ''} displayValue={formatCurrency(row.burnRate)} onSave={(value) => savePortfolioCell(row, 'burnRate', value)} /></Td>;
      case 'cashAtBank':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" value={row.cashAtBank != null ? String(row.cashAtBank) : ''} displayValue={formatCurrency(row.cashAtBank)} onSave={(value) => savePortfolioCell(row, 'cashAtBank', value)} /></Td>;
      case 'totalDebt':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" value={row.totalDebt != null ? String(row.totalDebt) : ''} displayValue={formatCurrency(row.totalDebt)} onSave={(value) => savePortfolioCell(row, 'totalDebt', value)} /></Td>;
      case 'debtToEquity':
        return <Td {...dataProps} $align="right"><EditableCell type="number" align="right" disabled={Boolean(row.calculatedFields.debtToEquity)} formula={row.calculatedFields.debtToEquity} value={row.debtToEquity != null ? String(row.debtToEquity) : ''} displayValue={row.debtToEquity != null ? formatMultiple(row.debtToEquity) : '-'} onSave={(value) => savePortfolioCell(row, 'debtToEquity', value)} /></Td>;
      case 'yoyScore': return <Td {...dataProps} $align="right" $strong>{row.scores.yoy ?? '-'}</Td>;
      case 'qoqScore': return <Td {...dataProps} $align="right" $strong>{row.scores.qoq ?? '-'}</Td>;
      case 'momScore': return <Td {...dataProps} $align="right" $strong>{row.scores.mom ?? '-'}</Td>;
      case 'grossMarginScore': return <Td {...dataProps} $align="right" $strong>{row.scores.grossMargin ?? '-'}</Td>;
      case 'ebitdaScore': return <Td {...dataProps} $align="right" $strong>{row.scores.ebitda ?? '-'}</Td>;
      case 'runwayScore': return <Td {...dataProps} $align="right" $strong>{row.scores.runway ?? '-'}</Td>;
      case 'currentRatioScore': return <Td {...dataProps} $align="right" $strong>{row.scores.currentRatio ?? '-'}</Td>;
      case 'totalScore': return (
        <Td
          {...dataProps}
          $align="right"
          $strong
          title={tp('formula.scoreCoverage', 'Покрытие данных: {{coverage}}%', {
            coverage: Math.round(row.scores.coverage * 100),
          })}
        >
          {formatPercent(row.scores.total)}
        </Td>
      );
      case 'status':
        return (
          <Td {...dataProps}>
            {dashboardEditMode && !readOnly ? (
              <EditableCell type="select" value={row.healthOverride || ''} displayValue={rowStatusLabel(row)} options={healthOverrideOptions} onSave={(value) => savePortfolioCell(row, 'healthOverride', value)} />
            ) : (
              <StatusPill
                $status={row.status}
                onMouseEnter={(event) => {
                  const element = event.currentTarget;
                  element.title = element.scrollWidth > element.clientWidth + 1 ? rowStatusLabel(row) : '';
                }}
              >
                <Circle />
                {rowStatusLabel(row)}
              </StatusPill>
            )}
          </Td>
        );
      case 'responsiblePerson':
        return <Td {...dataProps}><EditableCell value={row.responsiblePerson === '-' ? '' : row.responsiblePerson} displayValue={row.responsiblePerson} onSave={(value) => savePortfolioCell(row, 'responsiblePerson', value)} /></Td>;
      default:
        return null;
    }
  };

  const renderDashboardTotalCell = (columnId: PortfolioColumnId): ReactNode => {
    const sum = (getValue: (row: PortfolioRow) => number | undefined) => (
      financialRows.reduce((total, row) => total + (getValue(row) || 0), 0)
    );
    const dataProps = { 'data-column-id': columnId };

    switch (columnId) {
      case 'name': return <StickyNameTd {...dataProps} $strong>{tp('table.totalAverage', 'Итого / среднее')}</StickyNameTd>;
      case 'investedUsd': return <Td {...dataProps} $align="right">{formatCurrency(summary.totalInvestedUsd)}</Td>;
      case 'investedUzs': return <Td {...dataProps} $align="right">{formatUzsDisplay(summary.totalInvestedUzs)}</Td>;
      case 'entryValuation': return <Td {...dataProps} $align="right">-</Td>;
      case 'currentValuation': return (
        <Td
          {...dataProps}
          $align="right"
          title={tp('formula.portfolioNav', 'NAV портфеля: сумма стоимости долей фонда')}
        >
          {formatCurrency(summary.totalPositionNavUsd)}
        </Td>
      );
      case 'moic': return <Td {...dataProps} $align="right">{formatMultiple(summary.avgMoic)}</Td>;
      case 'mrr': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.mrr))}</Td>;
      case 'arr': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.arr))}</Td>;
      case 'cac': return <Td {...dataProps} $align="right">{formatCurrency(averagePortfolioValue(financialRows, (row) => row.cac))}</Td>;
      case 'ltvCac': return <Td {...dataProps} $align="right">{formatMultiple(averagePortfolioValue(financialRows, (row) => row.ltvCac))}</Td>;
      case 'yoyGrowth': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.yoyGrowth))}</Td>;
      case 'qoqGrowth': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.qoqGrowth))}</Td>;
      case 'momGrowth': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.momGrowth))}</Td>;
      case 'grossMargin': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.grossMargin))}</Td>;
      case 'ebitdaMargin': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.ebitdaMargin))}</Td>;
      case 'runway': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.runway)?.toLocaleString(numberLocale(), { maximumFractionDigits: 1 }) || '-'}</Td>;
      case 'currentRatio': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.currentRatio)?.toLocaleString(numberLocale(), { maximumFractionDigits: 2 }) || '-'}</Td>;
      case 'ebitda': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.ebitda))}</Td>;
      case 'payingCustomers': return <Td {...dataProps} $align="right">{Math.round(sum((row) => row.payingCustomers)).toLocaleString(numberLocale())}</Td>;
      case 'netProfit': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.netProfit))}</Td>;
      case 'netMargin': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.netMargin))}</Td>;
      case 'burnRate': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.burnRate))}</Td>;
      case 'cashAtBank': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.cashAtBank))}</Td>;
      case 'totalDebt': return <Td {...dataProps} $align="right">{formatCurrency(sum((row) => row.totalDebt))}</Td>;
      case 'debtToEquity': return <Td {...dataProps} $align="right">{formatMultiple(averagePortfolioValue(financialRows, (row) => row.debtToEquity))}</Td>;
      case 'yoyScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.yoy)?.toFixed(1) || '-'}</Td>;
      case 'qoqScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.qoq)?.toFixed(1) || '-'}</Td>;
      case 'momScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.mom)?.toFixed(1) || '-'}</Td>;
      case 'grossMarginScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.grossMargin)?.toFixed(1) || '-'}</Td>;
      case 'ebitdaScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.ebitda)?.toFixed(1) || '-'}</Td>;
      case 'runwayScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.runway)?.toFixed(1) || '-'}</Td>;
      case 'currentRatioScore': return <Td {...dataProps} $align="right">{averagePortfolioValue(financialRows, (row) => row.scores.currentRatio)?.toFixed(1) || '-'}</Td>;
      case 'totalScore': return <Td {...dataProps} $align="right">{formatPercent(averagePortfolioValue(financialRows, (row) => row.scores.total))}</Td>;
      default: return <Td {...dataProps} />;
    }
  };

  const handleExportPortfolio = useCallback(async () => {
    const avg = (getValue: (row: PortfolioRow) => number | undefined) =>
      averagePortfolioValue(financialRows, getValue);
    const sum = (getValue: (row: PortfolioRow) => number | undefined) =>
      financialRows.reduce((total, row) => total + (getValue(row) || 0), 0);

    const totals: Partial<Record<PortfolioColumnId, PortfolioExportValue>> = {
      investedUsd: summary.totalInvestedUsd,
      investedUzs: summary.totalInvestedUzs,
      currentValuation: summary.totalPositionNavUsd,
      moic: summary.avgMoic,
      mrr: sum((row) => row.mrr),
      arr: sum((row) => row.arr),
      cac: avg((row) => row.cac),
      ltvCac: avg((row) => row.ltvCac),
      yoyGrowth: avg((row) => row.yoyGrowth),
      qoqGrowth: avg((row) => row.qoqGrowth),
      momGrowth: avg((row) => row.momGrowth),
      grossMargin: avg((row) => row.grossMargin),
      ebitdaMargin: avg((row) => row.ebitdaMargin),
      runway: avg((row) => row.runway),
      entryValuation: null,
    };

    const exportRows: PortfolioExportRow[] = filteredRows.map((row) => ({
      name: row.name,
      number: row.number,
      industry: row.industry,
      segmentLabel: tp(`segments.${row.segment}`, getPortfolioSegmentLabel(row.segment)),
      stage: row.stage,
      country: row.country,
      reportDate: row.reportDate,
      entryDate: row.entryDate,
      investmentTypeLabel: investmentTypeLabel(row.investmentType),
      statusLabel: statusText(row.status),
      responsiblePerson: row.responsiblePerson,
      calculated: row.calculatedFields,
      values: {
        investedUsd: row.investedUsd,
        investedUzs: row.investedUzs,
        ownership: row.ownership,
        entryValuation: row.entryValuation,
        currentValuation: row.currentValuation,
        moic: row.moic,
        mrr: row.mrr,
        arr: row.arr,
        cac: row.cac,
        ltvCac: row.ltvCac,
        yoyGrowth: row.yoyGrowth,
        qoqGrowth: row.qoqGrowth,
        momGrowth: row.momGrowth,
        grossMargin: row.grossMargin,
        ebitdaMargin: row.ebitdaMargin,
        runway: row.runwayInfinite ? undefined : row.runway,
        currentRatio: row.currentRatio,
        ebitda: row.ebitda,
        payingCustomers: row.payingCustomers,
        netProfit: row.netProfit,
        netMargin: row.netMargin,
        burnRate: row.burnRate,
        cashAtBank: row.cashAtBank,
        totalDebt: row.totalDebt,
        debtToEquity: row.debtToEquity,
        yoyScore: row.scores.yoy,
        qoqScore: row.scores.qoq,
        momScore: row.scores.mom,
        grossMarginScore: row.scores.grossMargin,
        ebitdaScore: row.scores.ebitda,
        runwayScore: row.scores.runway,
        currentRatioScore: row.scores.currentRatio,
        totalScore: row.scores.total,
      },
    }));

    const sheet = buildPortfolioExportSheet({
      rows: exportRows,
      columnIds: visibleDashboardColumnIds,
      labels: dashboardColumnLabels,
      totals,
      totalsLabel: tp('table.totalAverage', 'Итого / среднее'),
    });

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.aoa);
    worksheet['!cols'] = sheet.colWidths;
    worksheet['!freeze'] = { xSplit: '1', ySplit: '1' };

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    sheet.numberFormats.forEach((format, columnIndex) => {
      if (!format) return;
      for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
        if (cell && cell.t === 'n') cell.z = format;
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, tp('export.sheetName', 'Портфель'));
    XLSX.writeFile(workbook, portfolioExportFileName(
      organization?.name || portfolioSettings.fundDisplayName,
      new Date(),
      { filtered: filteredRows.length !== rows.length },
    ));
  }, [
    dashboardColumnLabels,
    filteredRows,
    financialRows,
    investmentTypeLabel,
    organization?.name,
    portfolioSettings.fundDisplayName,
    rows.length,
    statusText,
    summary,
    tp,
    visibleDashboardColumnIds,
  ]);

  const bubbleData = useMemo(() => {
    const sectorOptions = [...new Set(filteredRows.map((row) => row.industry).filter((value) => value && value !== '-'))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8);
    const stageOptions = [...new Set(filteredRows.map((row) => row.stage).filter((value) => value && value !== '-'))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8);

    const completeRows = filteredRows.filter((row) => row.moic != null && row.runway != null);
    const selectedRows = completeRows.filter((row) => {
      if (bubbleSector !== 'all' && row.industry !== bubbleSector) return false;
      if (bubbleStage !== 'all' && row.stage !== bubbleStage) return false;
      if (bubbleStatus !== 'all' && row.status !== bubbleStatus) return false;
      if ((row.moic || 0) < bubbleMinMoic) return false;
      return true;
    });

    const maxMetric = Math.max(1, ...selectedRows.map((row) => getBubbleMetricValue(row, bubbleSizeMetric) || 0));
    const maxMoic = Math.max(10, ...selectedRows.map((row) => Math.min(row.moic || 0, 40)));
    const maxRunway = Math.max(12, ...selectedRows.map((row) => row.runway || 0), 24);

    const bubbles = selectedRows
      .map((row) => {
        const metricValue = getBubbleMetricValue(row, bubbleSizeMetric) || 0;
        const x = 8 + (Math.min(row.moic || 0, maxMoic) / maxMoic) * 84;
        const y = 86 - ((row.runway || 0) / maxRunway) * 72;
        const size = 34 + Math.sqrt(metricValue / maxMetric) * 54;
        return { row, metricValue, x, y, size };
      })
      .sort((a, b) => a.size - b.size)
      .slice(0, 42);

    const topRows = [...selectedRows]
      .sort((a, b) => (getBubbleMetricValue(b, bubbleSizeMetric) || 0) - (getBubbleMetricValue(a, bubbleSizeMetric) || 0))
      .slice(0, 5);

    return {
      sectorOptions,
      stageOptions,
      bubbles,
      topRows,
      selectedRows,
      dataGapCount: filteredRows.length - completeRows.length,
      valuation: selectedRows.reduce((sum, row) => sum + (row.currentValuation || 0), 0),
      invested: selectedRows.reduce((sum, row) => sum + (row.investedUsd || 0), 0),
      avgMoic: getPortfolioMoic(selectedRows),
      attentionCount: selectedRows.filter((row) => row.status === 'red' || row.status === 'yellow').length,
    };
  }, [
    bubbleMinMoic,
    bubbleSector,
    bubbleSizeMetric,
    bubbleStage,
    bubbleStatus,
    filteredRows,
  ]);

  const selectedBubbleRow = useMemo(() => {
    if (!selectedBubbleStartupId) return undefined;
    return bubbleData.selectedRows.find((row) => row.startup.id === selectedBubbleStartupId);
  }, [bubbleData.selectedRows, selectedBubbleStartupId]);

  useEffect(() => {
    if (selectedBubbleStartupId && !bubbleData.selectedRows.some((row) => row.startup.id === selectedBubbleStartupId)) {
      setSelectedBubbleStartupId(null);
    }
  }, [bubbleData.selectedRows, selectedBubbleStartupId]);

  const selectedRow = useMemo(() => {
    if (!rows.length) return undefined;
    return rows.find((row) => row.startup.id === selectedStartupId) || rows[0];
  }, [rows, selectedStartupId]);
  const selectedDetailRows = useMemo(() => selectedRow ? [selectedRow] : [], [selectedRow]);
  const selectedWorkbookMonths = useMemo(() => buildWorkbookMonths(selectedDetailRows), [selectedDetailRows]);
  const selectedCapTableWorkbookRows = useMemo(
    () => buildCapTableWorkbookRows(selectedDetailRows, organization?.name, portfolioSettings, tp),
    [organization?.name, portfolioSettings, selectedDetailRows, tp]
  );
  const selectedTractionWorkbookTables = useMemo(
    () => buildTractionWorkbookTables(selectedDetailRows, selectedWorkbookMonths, tp),
    [selectedDetailRows, selectedWorkbookMonths, tp]
  );
  const currentReportingPeriod = portfolioSettings.reportingPeriod || getCurrentQuarterLabel();

  const updateTextSetting = (field: 'fundDisplayName' | 'reportingPeriod' | 'baseCurrency', value: string) => {
    setSettingsDraft((prev) => ({
      ...prev,
      [field]: field === 'baseCurrency' ? value.toUpperCase() : value,
    }));
    setSettingsStatus(null);
    setSettingsError(null);
  };

  const updateNumericSetting = (field: NumericPortfolioSetting, value: string, percent = false) => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    setSettingsDraft((prev) => ({
      ...prev,
      [field]: percent ? parsed / 100 : parsed,
    }));
    setSettingsStatus(null);
    setSettingsError(null);
  };

  const updateSegmentThresholdSetting = (
    segment: PortfolioSegment,
    field: keyof PortfolioSegmentThresholds,
    value: string,
  ) => {
    const normalizedValue = value.trim().replace(',', '.');
    if (!normalizedValue || normalizedValue === '-' || normalizedValue.endsWith('.')) return;
    const parsed = Number(normalizedValue);
    if (!Number.isFinite(parsed)) return;
    setSettingsDraft((previous) => ({
      ...previous,
      segmentThresholds: {
        ...previous.segmentThresholds,
        [segment]: {
          ...previous.segmentThresholds[segment],
          [field]: parsed / 100,
        },
      },
    }));
    setSettingsStatus(null);
    setSettingsError(null);
  };

  const resetSettingsDraft = () => {
    setSettingsDraft(portfolioSettings);
    setSettingsStatus(null);
    setSettingsError(null);
  };

  const savePortfolioSettings = async () => {
    if (!organization?.id || !canManagePortfolioSettings) return;
    setSettingsSaving(true);
    setSettingsStatus(null);
    setSettingsError(null);

    const normalized = normalizePortfolioSettings(settingsDraft, organization.name);
    try {
      const response = await organizationApi.updatePortfolioSettings(organization.id, normalized);
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || tp('settings.saveError', 'Не удалось сохранить настройки портфеля'));
      }
      updateOrganization(response.data);
      const latest = normalizePortfolioSettings(response.data.portfolioSettings, response.data.name);
      setPortfolioSettings(latest);
      setSettingsDraft(latest);
      setSettingsStatus(tp('settings.saveSuccess', 'Настройки сохранены. Dashboard пересчитан.'));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : tp('settings.saveError', 'Не удалось сохранить настройки портфеля'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const selectedSnapshots = useMemo(
    () => selectedRow ? getLatestMetricSnapshots(selectedRow.startup) : [],
    [selectedRow]
  );

  const selectedTimeline = useMemo(
    () => selectedRow ? buildTimelineEvents(selectedRow, tp) : [],
    [selectedRow, tp]
  );

  const latestSelectedReport = useMemo(() => (
    [...selectedReports].sort((a, b) => reportTime(b) - reportTime(a))[0]
  ), [selectedReports]);

  const latestSelectedDigest = useMemo(() => (
    latestSelectedReport
      ? quarterlyDigests.find((digest) => digest.reportId === latestSelectedReport.id)
      : undefined
  ), [latestSelectedReport, quarterlyDigests]);

  const generateDigest = async (report: QuarterlyReport) => {
    if (!selectedRow) return;
    setDigestGeneratingId(report.id);
    try {
      const res = await cabinetApi.generateStartupReportDigest(selectedRow.startup.id, report.id);
      if (res.success && res.data) {
        setQuarterlyDigests((items) => [
          res.data!,
          ...items.filter((item) => item.reportId !== report.id),
        ]);
      }
    } catch (err) {
      console.error('Failed to generate quarterly digest:', err);
    } finally {
      setDigestGeneratingId(null);
    }
  };

  const openPortfolioRow = (row: PortfolioRow, section: PortfolioSection = 'startup-card') => {
    setSelectedStartupId(row.startup.id);
    navigateToPortfolioSection(section);
  };

  useEffect(() => {
    if (rows.length && !rows.some((row) => row.startup.id === selectedStartupId)) {
      setSelectedStartupId(rows[0].startup.id);
    }
  }, [rows, selectedStartupId]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!selectedRow?.startup.id || activeSection === 'dashboard' || activeSection === 'settings') {
        setSelectedReports([]);
        return;
      }
      setReportsLoading(true);
      try {
        const res = await cabinetApi.getStartupReports(selectedRow.startup.id);
        setSelectedReports(res.success && res.data ? res.data : []);
      } catch (err) {
        console.error('Failed to load quarterly reports:', err);
        setSelectedReports([]);
      } finally {
        setReportsLoading(false);
      }
    };
    fetchReports();
  }, [activeSection, selectedRow?.startup.id]);

  const activeSectionConfig = PORTFOLIO_SECTIONS.find((section) => section.id === activeSection) || PORTFOLIO_SECTIONS[0];
  const detailSection = activeSection as PortfolioSection;
  const showPortfolioContextBar = activeSection === 'startup-card' || activeSection === 'cap-table' || activeSection === 'traction';
  const selectedStartupLogo = selectedRow
    ? normalizeFileUrl(
      cleanText(selectedRow.startup.logo) || cleanText(selectedRow.startup.fileUrls?.logo),
      selectedRow.startup.id,
    )
    : '';
  const selectedFounderEmail = selectedRow
    ? cleanText(selectedRow.startup.brief.founderEmail) || cleanText(selectedRow.startup.founder?.email)
    : undefined;
  const selectedWebsite = selectedRow ? cleanText(selectedRow.startup.brief.website) : undefined;
  const selectedWebsiteHref = selectedWebsite ? normalizeExternalUrl(selectedWebsite) : '';
  const selectedHealthOverrideValue = (selectedRow?.healthOverride || '') as HealthOverrideValue;
  const selectedHealthOverrideLabel = healthOverrideOptions.find((option) => option.value === selectedHealthOverrideValue)?.label
    || healthOverrideOptions[0].label;

  if (loading) {
    return <PortfolioSkeleton />;
  }

  return (
    <PageContainer>
      <Header>
        <div>
          <PageTitle>{t('portfolio.title', 'Портфель')}</PageTitle>
          <PageSubtitle>
            {t('portfolio.subtitle', 'Отслеживайте показатели и метрики портфельных компаний')}
          </PageSubtitle>
        </div>
      </Header>

      <MetricsGrid>
        <MetricCard>
          <MetricIcon $color="#10b981">
            <BriefcaseBusiness />
          </MetricIcon>
          <MetricInfo>
            <MetricValue>{summary.total}</MetricValue>
            <MetricLabel>{t('portfolio.totalStartups', 'Компаний в портфеле')}</MetricLabel>
            <MetricMeta>{investmentTypeLabel('Direct')} {summary.direct} · {investmentTypeLabel('Accelerator')} {summary.accelerator}</MetricMeta>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#6366f1">
            <DollarSign />
          </MetricIcon>
          <MetricInfo>
            <MetricValue>{formatCurrency(summary.totalInvestedUsd, true)}</MetricValue>
            <MetricLabel>{t('portfolio.totalInvested', 'Всего инвестировано')}</MetricLabel>
            <MetricMeta>{formatUzsDisplay(summary.totalInvestedUzs, true)}</MetricMeta>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#3b82f6">
            <TrendingUp />
          </MetricIcon>
          <MetricInfo>
            <MetricValue>{formatCurrency(summary.totalPositionNavUsd, true)}</MetricValue>
            <MetricLabel>{tp('summary.portfolioNav', 'Стоимость портфеля')}</MetricLabel>
            <MetricMeta>
              {tp('summary.navHint', 'Стоимость долей фонда')} · {tp('summary.directPositions', '{{count}} прямых позиций', { count: summary.direct })}
            </MetricMeta>
          </MetricInfo>
        </MetricCard>

        <MetricCard>
          <MetricIcon $color="#f59e0b">
            <Zap />
          </MetricIcon>
          <MetricInfo>
            <MetricValue>{formatMultiple(summary.avgMoic)}</MetricValue>
            <MetricLabel>{tp('summary.avgMoic', 'Средний MOIC')}</MetricLabel>
            <MetricMeta>{summary.avgRunway != null ? `${summary.avgRunway.toFixed(1)} ${monthShort} runway` : tp('summary.runwayMissing', 'Runway не указан')} · {formatCurrency(summary.avgBurn, true)}{perMonth}</MetricMeta>
          </MetricInfo>
        </MetricCard>
      </MetricsGrid>

      {readOnly && (
        <div style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 14, fontWeight: 600 }}>
          {t('portfolio.readOnlyBanner', '📖 Режим просмотра — данные доступны только для чтения')}
        </div>
      )}
      <SectionTabs>
        {PORTFOLIO_SECTIONS.filter((section) => section.id !== 'settings' || canManagePortfolioSettings).map((section) => {
          const Icon = section.icon;
          return (
            <SectionTab
              key={section.id}
              $active={activeSection === section.id}
              onClick={() => navigateToPortfolioSection(section.id)}
            >
              <Icon />
              <span>
                <TabTitle>{t(section.labelKey, section.labelFallback)}</TabTitle>
                <TabDescription>{t(section.descriptionKey, section.descriptionFallback)}</TabDescription>
              </span>
            </SectionTab>
          );
        })}
      </SectionTabs>

      <DashboardCard $fullscreen={activeSection === 'dashboard' && isTableFullscreen} data-floating-panel={isTableFullscreen || undefined}>
        <DashboardHeader>
          <div>
            <SectionTitle>{t(activeSectionConfig.labelKey, activeSectionConfig.labelFallback)}</SectionTitle>
            <SectionDescription>{t(activeSectionConfig.descriptionKey, activeSectionConfig.descriptionFallback)}</SectionDescription>
          </div>
          <ToolbarNote>
            {activeSection === 'dashboard'
              ? tp('dashboard.shownCount', '{{shown}} показано из {{total}}', { shown: filteredRows.length, total: rows.length })
              : activeSection === 'settings'
                ? tp('dashboard.fundSettings', 'Настройки фонда')
                : selectedRow?.name || tp('dashboard.noStartupSelected', 'Стартап не выбран')}
          </ToolbarNote>
        </DashboardHeader>

        <PortfolioColumnManager
          open={activeSection === 'dashboard' && columnManagerOpen}
          preferences={savedColumnPreferences}
          columnLabels={dashboardColumnLabels}
          onPreview={setPreviewColumnPreferences}
          onCancel={closeColumnManager}
          onSave={saveColumnPreferences}
          isSaving={columnPreferencesSaving}
          error={columnPreferencesError}
          isFullscreen={isTableFullscreen}
          copy={{
            title: tp('columns.drawerTitle', 'Настройка колонок'),
            description: tp('columns.drawerDescription', 'Переставляйте колонки и выбирайте, какие показывать.'),
            close: tp('columns.close', 'Закрыть настройку колонок'),
            dragColumn: tp('columns.drag', 'Переместить колонку'),
            showColumn: tp('columns.show', 'Показывать колонку'),
            requiredColumn: tp('columns.required', 'Обязательная закреплённая колонка'),
            reset: tp('columns.reset', 'Сбросить'),
            cancel: tp('columns.cancel', 'Отмена'),
            save: tp('columns.save', 'Сохранить'),
            saving: tp('columns.saving', 'Сохранение…'),
            visibleCount: (visible, total) => tp('columns.visibleCount', 'Показано {{visible}} из {{total}}', { visible, total }),
          }}
        />

        {activeSection === 'dashboard' && (
          <>
            <Toolbar>
              <SearchInput>
                <Search />
                <input
                  placeholder={t('portfolio.dashboardSearchPlaceholder', 'Поиск по имени стартапа')}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </SearchInput>
              <ToolbarActions>
                <EditModeButton
                  type="button"
                  $active={columnManagerOpen}
                  aria-pressed={columnManagerOpen}
                  onClick={toggleColumnManager}
                >
                  <Columns3 />
                  {tp('columns.title', 'Колонки')}
                </EditModeButton>
                <EditModeButton
                  type="button"
                  $active={isTableFullscreen}
                  aria-pressed={isTableFullscreen}
                  aria-label={isTableFullscreen
                    ? tp('fullscreen.exit', 'Выйти из полного экрана')
                    : tp('fullscreen.enter', 'Таблица на весь экран')}
                  title={isTableFullscreen
                    ? tp('fullscreen.exit', 'Выйти из полного экрана')
                    : tp('fullscreen.enter', 'Таблица на весь экран')}
                  onClick={toggleTableFullscreen}
                >
                  {isTableFullscreen ? <Minimize2 /> : <Maximize2 />}
                  {isTableFullscreen
                    ? tp('fullscreen.exitShort', 'Свернуть')
                    : tp('fullscreen.enterShort', 'На весь экран')}
                </EditModeButton>
                <EditModeButton
                  type="button"
                  $active={showChangeLog}
                  aria-pressed={showChangeLog}
                  onClick={() => setShowChangeLog((current) => !current)}
                >
                  <History />
                  {tp('changes.title', 'Прошлые изменения')}
                </EditModeButton>
                {!readOnly && (
                  <EditModeButton
                    type="button"
                    $active={dashboardEditMode}
                    aria-pressed={dashboardEditMode}
                    onClick={() => setDashboardEditMode((current) => !current)}
                  >
                    {dashboardEditMode ? <Check /> : <PencilLine />}
                    {dashboardEditMode
                      ? tp('dashboard.editModeOn', 'Редактирование')
                      : tp('dashboard.editModeOff', 'Редактировать')}
                  </EditModeButton>
                )}
              </ToolbarActions>
              <PortfolioQuickFiltersControl
                value={quickFilters}
                options={dashboardFilterOptions}
                segmentFilter={{
                  value: segmentFilter,
                  allValue: 'all',
                  options: segmentFilterOptions,
                  onChange: (value) => setSegmentFilter(value as PortfolioSegmentFilter),
                }}
                resultCount={filteredRows.length}
                onChange={setQuickFilters}
                drawerTarget={quickFiltersDrawerTarget}
                onOpenChange={setQuickFiltersOpen}
                labels={{
                  industries: tp('filters.industry', 'Сектор'),
                  stages: tp('filters.stage', 'Стадия'),
                  statuses: tp('filters.status', 'Статус'),
                  portfolioTypes: tp('filters.portfolioType', 'Тип портфеля'),
                  managerIds: tp('filters.manager', 'Менеджер'),
                  segment: tp('filters.segment', 'Направление'),
                  filters: tp('filters.title', 'Фильтры'),
                  activeFilters: tp('filters.active', 'Активные фильтры'),
                  resetAll: tp('filters.resetAll', 'Сбросить все'),
                  close: tp('filters.close', 'Закрыть фильтры'),
                  noOptions: tp('filters.noOptions', 'Нет вариантов'),
                  showCount: (count) => tp('filters.showCount', 'Показать: {{count}}', { count }),
                  removeFilter: (group, option) => tp('filters.remove', 'Убрать фильтр {{group}}: {{option}}', { group, option }),
                }}
              />
            </Toolbar>

            <DashboardWorkspace>
              <DashboardWorkspaceMain>

            {showChangeLog && (
              <ChangeLogPanel>
                <ChangeLogHeader>
                  <div>
                    <ChangeLogTitle>
                      <History />
                      {tp('changes.title', 'Прошлые изменения')}
                    </ChangeLogTitle>
                    <ChangeLogHint>
                      {tp('changes.subtitle', 'Последние 5 редактирований таблицы с возможностью отката.')}
                    </ChangeLogHint>
                  </div>
                  <ChangeLogHint>
                    {tp('changes.auditHint', 'Кто, когда и какое поле изменил')}
                  </ChangeLogHint>
                </ChangeLogHeader>
                {dashboardChangeLog.length ? (
                  <ChangeLogList>
                    {dashboardChangeLog.map((change) => (
                      <ChangeLogItem key={change.id}>
                        <ChangeLogMain
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setShowChangeLog(false);
                            flashPortfolioCell(change.startupId, change.field);
                          }}
                        >
                          <ChangeLogMeta>
                            {change.managerName} · {formatPortfolioChangeTime(change.changedAt)}
                          </ChangeLogMeta>
                          <ChangeLogSummary>
                            <strong>{change.startupName}</strong> · {change.fieldLabel}
                          </ChangeLogSummary>
                          <ChangeLogValues>
                            {formatPortfolioAuditValue(change.field, change.oldValue)}
                            <ChangeLogArrow>→</ChangeLogArrow>
                            {formatPortfolioAuditValue(change.field, change.newValue)}
                          </ChangeLogValues>
                        </ChangeLogMain>
                        {!readOnly && (
                          <RollbackButton
                            type="button"
                            disabled={rollbackingChangeId !== null}
                            onClick={() => requestRollbackChange(change)}
                          >
                            <RotateCcw />
                            {rollbackingChangeId === change.id
                              ? tp('changes.rollbacking', 'Откатываю...')
                              : tp('changes.rollback', 'Откатить')}
                          </RollbackButton>
                        )}
                      </ChangeLogItem>
                    ))}
                  </ChangeLogList>
                ) : (
                  <ChangeLogEmpty>
                    {tp('changes.empty', 'Пока нет сохранённых изменений по таблице.')}
                  </ChangeLogEmpty>
                )}
              </ChangeLogPanel>
            )}

            {rows.length === 0 ? (
              <EmptyState>
                <h3>{t('portfolio.empty', 'Нет портфельных компаний')}</h3>
                <p>{t('portfolio.emptyDesc', 'Переведите стартапы в статус Portfolio со страницы Startups.')}</p>
              </EmptyState>
            ) : filteredRows.length === 0 ? (
              <EmptyState>
                <h3>{tp('filters.emptyTitle', 'Ничего не найдено')}</h3>
                <p>{tp('filters.emptyDescription', 'Измените условия поиска или сбросьте выбранные фильтры.')}</p>
                <EditModeButton
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setQuickFilters(createEmptyPortfolioQuickFilters());
                    setSegmentFilter('all');
                  }}
                >
                  <RotateCcw />
                  {tp('filters.resetAll', 'Сбросить все')}
                </EditModeButton>
              </EmptyState>
            ) : (
              <>
                {!showChangeLog && (
                <PortfolioReadOnlyContext.Provider value={readOnly || !dashboardEditMode}>
                  <TableScroller $editing={dashboardEditMode} $fullscreen={isTableFullscreen}>
                    <PortfolioTable $minWidth={dashboardTableMinWidth}>
                      <colgroup>
                        {visibleDashboardColumnIds.map((columnId) => (
                          <col key={columnId} style={{ width: `${getPortfolioColumnWidth(columnId)}px` }} />
                        ))}
                      </colgroup>
                      <TableHead>
                        <tr>
                          {visibleDashboardColumnIds.map((columnId) => (
                            columnId === 'name' ? (
                              <StickyNameTh key={columnId} data-column-id={columnId}>
                                {dashboardColumnLabels[columnId]}
                              </StickyNameTh>
                            ) : (
                              <Th key={columnId} data-column-id={columnId}>
                                {dashboardColumnLabels[columnId]}
                              </Th>
                            )
                          ))}
                        </tr>
                      </TableHead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.startup.id} data-startup-id={row.startup.id}>
                            {visibleDashboardColumnIds.map((columnId) => (
                              <Fragment key={columnId}>
                                {renderDashboardCell(row, columnId)}
                              </Fragment>
                            ))}
                          </tr>
                        ))}
                        <TotalRow>
                          {visibleDashboardColumnIds.map((columnId) => (
                            <Fragment key={columnId}>
                              {renderDashboardTotalCell(columnId)}
                            </Fragment>
                          ))}
                        </TotalRow>
                      </tbody>
                    </PortfolioTable>
                  </TableScroller>
                </PortfolioReadOnlyContext.Provider>
                )}

                {pendingRollback && (
                  <RollbackConfirmOverlay
                    role="dialog"
                    aria-modal="true"
                    onClick={() => { if (rollbackingChangeId === null) cancelRollbackChange(); }}
                  >
                    <RollbackConfirmCard onClick={(event) => event.stopPropagation()}>
                      <RollbackConfirmBody>
                        <RollbackConfirmIconTitle>
                          <RotateCcw />
                          {tp('changes.confirmTitle', 'Вы точно хотите откатить изменение?')}
                        </RollbackConfirmIconTitle>
                        <RollbackConfirmText>
                          {tp('changes.confirmText', 'Значение вернётся к прошлому. Это можно будет изменить снова вручную.')}
                        </RollbackConfirmText>
                        <RollbackConfirmPreview>
                          <RollbackConfirmPreviewMeta>
                            {pendingRollback.managerName} · {formatPortfolioChangeTime(pendingRollback.changedAt)}
                          </RollbackConfirmPreviewMeta>
                          <RollbackConfirmPreviewTitle>
                            <strong>{pendingRollback.startupName}</strong> · {pendingRollback.fieldLabel}
                          </RollbackConfirmPreviewTitle>
                          <RollbackConfirmPreviewValues>
                            <RollbackConfirmOldValue>
                              {formatPortfolioAuditValue(pendingRollback.field, pendingRollback.newValue)}
                            </RollbackConfirmOldValue>
                            <ChangeLogArrow>→</ChangeLogArrow>
                            <RollbackConfirmNewValue>
                              {formatPortfolioAuditValue(pendingRollback.field, pendingRollback.oldValue)}
                            </RollbackConfirmNewValue>
                          </RollbackConfirmPreviewValues>
                          <RollbackConfirmPreviewMeta style={{ marginTop: '6px' }}>
                            {tp('changes.confirmValuesHint', 'Сейчас → значение после отката')}
                          </RollbackConfirmPreviewMeta>
                        </RollbackConfirmPreview>
                      </RollbackConfirmBody>
                      <RollbackConfirmActions>
                        <RollbackConfirmButton
                          type="button"
                          $variant="ghost"
                          disabled={rollbackingChangeId !== null}
                          onClick={cancelRollbackChange}
                        >
                          {tp('changes.confirmNo', 'Нет')}
                        </RollbackConfirmButton>
                        <RollbackConfirmButton
                          type="button"
                          $variant="primary"
                          disabled={rollbackingChangeId !== null}
                          onClick={confirmRollbackChange}
                        >
                          <RotateCcw />
                          {rollbackingChangeId !== null
                            ? tp('changes.rollbacking', 'Откатываю...')
                            : tp('changes.confirmYes', 'Да, откатить')}
                        </RollbackConfirmButton>
                      </RollbackConfirmActions>
                    </RollbackConfirmCard>
                  </RollbackConfirmOverlay>
                )}

                {!showChangeLog && !isTableFullscreen && (
                  <Legend>
                    <LegendItem $status="gray"><Circle /> {tp('legend.gray', 'Нет данных / новый портфельный стартап')}</LegendItem>
                    <LegendItem $status="green"><Circle /> {tp('legend.green', 'Strong / Healthy по Total Score')}</LegendItem>
                    <LegendItem $status="yellow"><Circle /> {tp('legend.yellow', 'Need attention по Total Score')}</LegendItem>
                  <LegendItem $status="red"><Circle /> {tp('legend.red', 'At Risk / Critical по Total Score')}</LegendItem>
                  <span><Calculator size={13} /> {tp('legend.formulas', 'Пунктирное подчёркивание — рассчитано по формуле')}</span>
                  <span><Flame size={13} /> {tp('legend.metricsSource', 'Gross Margin — из годовых MRR и COGS; EBITDA Margin — из EBITDA и ARR')}</span>
                  </Legend>
                )}
                </>
            )}
              </DashboardWorkspaceMain>
              <DashboardFiltersDrawer
                ref={setQuickFiltersDrawerTarget}
                $open={quickFiltersOpen}
                aria-hidden={!quickFiltersOpen}
                data-floating-panel={quickFiltersOpen ? '' : undefined}
              />
            </DashboardWorkspace>
          </>
        )}

        {activeSection !== 'dashboard' && selectedRow && (
          <SheetBody>
            {showPortfolioContextBar && (
              <PortfolioContextBar>
                <StartupSelectWrap>
                  <BriefcaseBusiness />
                  <StartupDropdown
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                        setStartupDropdownOpen(false);
                        setStartupFilter('');
                      }
                    }}
                  >
                    <StartupSelectButton
                      type="button"
                      $open={startupDropdownOpen}
                      aria-haspopup="listbox"
                      aria-expanded={startupDropdownOpen}
                      aria-label={tp('detail.selectStartupAria', 'Выбрать портфельный стартап')}
                      onClick={() => { setStartupDropdownOpen((open) => !open); setStartupFilter(''); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setStartupDropdownOpen(false);
                      }}
                    >
                      <StartupSelectText>
                        {selectedRow.name} · {selectedRow.industry} · {selectedRow.stage}
                      </StartupSelectText>
                      <ChevronDown />
                    </StartupSelectButton>
                    {startupDropdownOpen && (() => {
                      const q = startupFilter.trim().toLowerCase();
                      const filtered = q
                        ? rows.filter((row) => `${row.name} ${row.industry} ${row.stage} ${row.country}`.toLowerCase().includes(q))
                        : rows;
                      return (
                      <StartupSelectMenu role="listbox" aria-label={tp('detail.selectStartupAria', 'Выбрать портфельный стартап')}>
                        <StartupSelectSearch
                          autoFocus
                          type="text"
                          placeholder={tp('detail.selectStartupSearch', 'Поиск по имени…')}
                          value={startupFilter}
                          onChange={(event) => setStartupFilter(event.target.value)}
                          onKeyDown={(event) => { if (event.key === 'Escape') { setStartupDropdownOpen(false); setStartupFilter(''); } }}
                        />
                        <StartupSelectList>
                          {filtered.map((row) => {
                            const active = row.startup.id === selectedRow.startup.id;
                            return (
                              <StartupSelectOption
                                key={row.startup.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                $active={active}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setSelectedStartupId(row.startup.id);
                                  setStartupDropdownOpen(false);
                                  setStartupFilter('');
                                }}
                              >
                                <span>
                                  {row.name} · {row.industry} · {row.stage}
                                </span>
                                {active && <Check />}
                              </StartupSelectOption>
                            );
                          })}
                          {filtered.length === 0 && (
                            <StartupSelectEmpty>{tp('detail.selectStartupEmpty', 'Ничего не найдено')}</StartupSelectEmpty>
                          )}
                        </StartupSelectList>
                      </StartupSelectMenu>
                      );
                    })()}
                  </StartupDropdown>
                </StartupSelectWrap>
              </PortfolioContextBar>
            )}
            {activeSection === 'cap-table' ? (
              <WorkbookStack>
                <WorkbookHero>
                  <WorkbookHeroIcon><Users size={22} /></WorkbookHeroIcon>
                  <div>
                    <WorkbookHeroTitle>{tp('capTable.heroTitle', 'Cap Table & Investor Timeline')}</WorkbookHeroTitle>
                    <WorkbookHeroSubtitle>
                      {tp('capTable.heroSubtitle', 'История раундов, инвесторов, оценок, доли фонда и MOIC для выбранного стартапа.')}
                    </WorkbookHeroSubtitle>
                  </div>
                </WorkbookHero>

                <WorkbookSummaryGrid>
                  <WorkbookStat>
                    <WorkbookStatValue>{selectedRow.name}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('workbook.selectedStartup', 'Выбранный стартап')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>{selectedCapTableWorkbookRows.filter((row) => row.isFund).length}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('capTable.fundInvestments', 'Инвестиций фонда')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>
                      {formatCurrency(selectedCapTableWorkbookRows.filter((row) => row.isFund).reduce((sum, row) => sum + (row.amountUsd || 0), 0), true)}
                    </WorkbookStatValue>
                    <WorkbookStatLabel>{tp('capTable.fundAmount', 'Сумма фонда')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>{formatMultiple(selectedRow.moic)}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('capTable.startupMoic', 'MOIC стартапа')}</WorkbookStatLabel>
                  </WorkbookStat>
                </WorkbookSummaryGrid>

                <WorkbookSection>
                  <WorkbookSectionHeader>
                    <div>
                      <WorkbookSectionTitle>{tp('capTable.roundsTitle', 'История раундов и инвесторов')}</WorkbookSectionTitle>
                      <WorkbookSectionSubtitle>
                        {tp('capTable.roundsSubtitle', 'Кто инвестировал, когда, по какой оценке, какую долю получил фонд и какой MOIC виден сейчас.')}
                      </WorkbookSectionSubtitle>
                    </div>
                    <WorkbookBadge $status="green">{tp('workbook.rowsCount', '{{count}} строк', { count: selectedCapTableWorkbookRows.length })}</WorkbookBadge>
                  </WorkbookSectionHeader>
                  {selectedCapTableWorkbookRows.length ? (
                    <WorkbookTableScroll>
                      <WorkbookTable $minWidth={1240}>
                        <thead>
                          <tr>
                            <th>{tp('table.startup', 'Стартап')}</th>
                            <th>{tp('capTable.investor', 'Инвестор')}</th>
                            <th>{tp('capTable.round', 'Раунд')}</th>
                            <th>{t('portfolio.date', 'Дата')}</th>
                            <th className="numeric">{tp('capTable.amountUsd', 'Сумма USD')}</th>
                            <th className="numeric">Pre-money</th>
                            <th className="numeric">Post-money</th>
                            <th className="numeric">{tp('table.ownership', 'Доля')} %</th>
                            <th className="numeric">{tp('table.currentValuation', 'Тек. оценка')}</th>
                            <th className="numeric">MOIC</th>
                            <th>{tp('table.type', 'Тип')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCapTableWorkbookRows.map((row) => (
                            <tr key={row.id} className={row.isFund ? 'is-fund' : row.isFounder ? 'is-founder' : undefined}>
                              <td>
                                <strong>
                                  <EditableCell
                                    value={row.startupName}
                                    strong
                                    onSave={(value) => saveCapTableCell(row, 'startupName', value)}
                                  />
                                </strong>
                              </td>
                              <td>
                                <WorkbookFundMark $muted={!row.isFund}>
                                  <EditableCell
                                    value={row.investor}
                                    strong={row.isFund}
                                    tone={row.isFund ? 'green' : 'default'}
                                    onSave={(value) => saveCapTableCell(row, 'investor', value)}
                                  />
                                </WorkbookFundMark>
                              </td>
                              <td>
                                <EditableCell
                                  value={row.round}
                                  onSave={(value) => saveCapTableCell(row, 'round', value)}
                                />
                              </td>
                              <td>
                                <EditableCell
                                  type="date"
                                  value={toIsoDateInput(row.date)}
                                  displayValue={formatDate(row.date)}
                                  onSave={(value) => saveCapTableCell(row, 'date', value)}
                                />
                              </td>
                              <td className="numeric">
                                <EditableCell
                                  type="number"
                                  align="right"
                                  tone="blue"
                                  value={row.amountUsd != null ? String(row.amountUsd) : ''}
                                  displayValue={formatCurrency(row.amountUsd)}
                                  onSave={(value) => saveCapTableCell(row, 'amountUsd', value)}
                                />
                              </td>
                              <td className="numeric">
                                <EditableCell
                                  type="number"
                                  align="right"
                                  value={row.preMoney != null ? String(row.preMoney) : ''}
                                  displayValue={formatCurrency(row.preMoney)}
                                  onSave={(value) => saveCapTableCell(row, 'preMoney', value)}
                                />
                              </td>
                              <td className="numeric">
                                <EditableCell
                                  type="number"
                                  align="right"
                                  value={row.postMoney != null ? String(row.postMoney) : ''}
                                  displayValue={formatCurrency(row.postMoney)}
                                  onSave={(value) => saveCapTableCell(row, 'postMoney', value)}
                                />
                              </td>
                              <td className="numeric">
                                <EditableCell
                                  type="number"
                                  align="right"
                                  value={row.ownership != null ? String(row.ownership * 100) : ''}
                                  displayValue={formatPercent(row.ownership)}
                                  onSave={(value) => saveCapTableCell(row, 'ownership', value)}
                                />
                              </td>
                              <td className="numeric">
                                <EditableCell
                                  type="number"
                                  align="right"
                                  value={row.currentValuation != null ? String(row.currentValuation) : ''}
                                  displayValue={formatCurrency(row.currentValuation)}
                                  onSave={(value) => saveCapTableCell(row, 'currentValuation', value)}
                                />
                              </td>
                              <td className="numeric">
                                <WorkbookBadge $status={row.status}>
                                  <EditableCell
                                    type="number"
                                    align="right"
                                    value={row.moic != null ? String(row.moic) : ''}
                                    displayValue={formatMultiple(row.moic)}
                                    onSave={(value) => saveCapTableCell(row, 'moic', value)}
                                  />
                                </WorkbookBadge>
                              </td>
                              <td>
                                <EditableCell
                                  type="select"
                                  value={row.type}
                                  options={CAP_TABLE_TYPE_OPTIONS}
                                  onSave={(value) => saveCapTableCell(row, 'type', value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </WorkbookTable>
                    </WorkbookTableScroll>
                  ) : (
                    <WorkbookEmpty>{tp('capTable.empty', 'В портфеле пока нет данных по cap table и раундам.')}</WorkbookEmpty>
                  )}
                </WorkbookSection>

                <WorkbookSection>
                  <WorkbookSectionHeader>
                    <div>
                      <WorkbookSectionTitle>{tp('capTable.timelineTitle', 'Timeline событий')}</WorkbookSectionTitle>
                      <WorkbookSectionSubtitle>
                        {tp('capTable.timelineSubtitle', 'Создание, вход фонда, раунды, метрики и квартальные отчеты выбранного стартапа.')}
                      </WorkbookSectionSubtitle>
                    </div>
                    <WorkbookBadge>{tp('capTable.eventsCount', '{{count}} событий', { count: selectedTimeline.length })}</WorkbookBadge>
                  </WorkbookSectionHeader>
                  {selectedTimeline.length ? (
                    <TimelineList>
                      {selectedTimeline.map((event, index) => (
                        <TimelineItem key={`${event.label}-${index}`}>
                          <TimelineDate>{event.date ? formatFullDate(event.date) : '-'}</TimelineDate>
                          <div>
                            <TimelineTitle>{event.label}</TimelineTitle>
                            <TimelineDesc>{event.description}</TimelineDesc>
                          </div>
                        </TimelineItem>
                      ))}
                    </TimelineList>
                  ) : (
                    <WorkbookEmpty>{tp('capTable.timelineEmpty', 'Timeline пока пустой.')}</WorkbookEmpty>
                  )}
                </WorkbookSection>
              </WorkbookStack>
            ) : activeSection === 'traction' ? (
              <WorkbookStack>
                <WorkbookHero>
                  <WorkbookHeroIcon><Activity size={22} /></WorkbookHeroIcon>
                  <div>
                    <WorkbookHeroTitle>Traction Tracker</WorkbookHeroTitle>
                    <WorkbookHeroSubtitle>
                      {tp('traction.heroSubtitle', 'Ежемесячные данные по MRR, COGS, ARR, клиентам, burn, runway и churn для выбранного стартапа.')}
                    </WorkbookHeroSubtitle>
                  </div>
                </WorkbookHero>

                <WorkbookSummaryGrid>
                  <WorkbookStat>
                    <WorkbookStatValue>{selectedTractionWorkbookTables.filter((table) => table.rows.length).length}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('traction.metricTables', 'Таблиц метрик')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>{selectedWorkbookMonths.length}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('traction.months', 'Месяцев')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>
                      {selectedRow.name}
                    </WorkbookStatValue>
                    <WorkbookStatLabel>{tp('workbook.selectedStartup', 'Выбранный стартап')}</WorkbookStatLabel>
                  </WorkbookStat>
                  <WorkbookStat>
                    <WorkbookStatValue>{formatMonthKey(selectedWorkbookMonths[selectedWorkbookMonths.length - 1])}</WorkbookStatValue>
                    <WorkbookStatLabel>{tp('traction.lastPeriod', 'Последний период')}</WorkbookStatLabel>
                  </WorkbookStat>
                </WorkbookSummaryGrid>

                <DetailAnchorNav>
                  {selectedTractionWorkbookTables.map((table) => (
                    <DetailAnchorLink key={`jump-${table.id}`} href={`#traction-${table.id}`}>
                      <BarChart3 />
                      {table.id === 'activeClients' ? 'Clients' : table.id.toUpperCase()}
                    </DetailAnchorLink>
                  ))}
                </DetailAnchorNav>

                {selectedTractionWorkbookTables.map((table) => (
                  <WorkbookSection key={table.id} id={`traction-${table.id}`}>
                    <WorkbookSectionHeader>
                      <div>
                        <WorkbookSectionTitle>{table.title}</WorkbookSectionTitle>
                        <WorkbookSectionSubtitle>{table.subtitle}</WorkbookSectionSubtitle>
                      </div>
                      <WorkbookBadge>{tp('workbook.companiesCount', '{{count}} компаний', { count: table.rows.length })}</WorkbookBadge>
                    </WorkbookSectionHeader>
                    {table.rows.length ? (
                      <WorkbookTableScroll>
                        <WorkbookTable $minWidth={1320}>
                          <thead>
                            <tr>
                              <th>{tp('table.startup', 'Стартап')}</th>
                              {selectedWorkbookMonths.map((month) => (
                                <th key={`${table.id}-${month}`} className="numeric">{formatMonthKey(month)}</th>
                              ))}
                              <th className="numeric">MoM {tp('table.growth', 'Рост')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row) => {
                              const portfolioRow = rows.find((item) => item.startup.id === row.startupId);
                              return (
                                <tr key={`${table.id}-${row.startupId}`}>
                                  <td>
                                    <strong>
                                      {portfolioRow ? (
                                        <EditableCell
                                          value={row.startupName}
                                          strong
                                          onSave={(value) => savePortfolioCell(portfolioRow, 'name', value)}
                                        />
                                      ) : row.startupName}
                                    </strong>
                                  </td>
                                  {selectedWorkbookMonths.map((month) => {
                                    const value = row.values[month];
                                    return (
                                      <td key={`${table.id}-${row.startupId}-${month}`} className="numeric">
                                        <EditableCell
                                          type="number"
                                          align="right"
                                          value={value != null ? String(table.id === 'churnRate' ? value * 100 : value) : ''}
                                          displayValue={formatWorkbookValue(table.id, value)}
                                          onSave={(nextValue) => saveTractionCell(row, table.id, month, nextValue)}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td className="numeric">
                                    <WorkbookMomBadge $tone={getMomTone(table.id, row.momGrowth)}>
                                      {formatWorkbookMom(row.momGrowth)}
                                    </WorkbookMomBadge>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="total-row">
                              <td>{table.aggregate === 'average' ? tp('traction.averageStartup', 'Среднее стартапа') : tp('traction.totalStartup', 'Итого стартап')}</td>
                              {selectedWorkbookMonths.map((month) => (
                                <td key={`${table.id}-total-${month}`} className="numeric">
                                  {formatWorkbookValue(table.id, table.totals[month])}
                                </td>
                              ))}
                              <td className="numeric">
                                <WorkbookMomBadge $tone={getMomTone(table.id, table.totalMomGrowth)}>
                                  {formatWorkbookMom(table.totalMomGrowth)}
                                </WorkbookMomBadge>
                              </td>
                            </tr>
                          </tbody>
                        </WorkbookTable>
                      </WorkbookTableScroll>
                    ) : (
                      <WorkbookEmpty>{tp('traction.metricEmpty', 'Для этой метрики пока нет помесячных данных.')}</WorkbookEmpty>
                    )}
                  </WorkbookSection>
                ))}
              </WorkbookStack>
            ) : activeSection === 'startup-card' ? (
              <SnapshotPanel>
                <SnapshotHero>
                  <SnapshotHeroTop>
                    <SnapshotIdentity>
                      <SnapshotLogo>
                        {selectedStartupLogo ? (
                          <SnapshotLogoImg src={selectedStartupLogo} alt={selectedRow.name} />
                        ) : (
                          <SnapshotLogoInitials>{getInitials(selectedRow.name).slice(0, 1)}</SnapshotLogoInitials>
                        )}
                      </SnapshotLogo>
                      <div>
                        <SnapshotTitleRow>
                          <SnapshotTitle>{selectedRow.name}</SnapshotTitle>
                          <StatusPill $status={selectedRow.status}>
                            <Circle />
                            {rowStatusLabel(selectedRow)}
                          </StatusPill>
                        </SnapshotTitleRow>
                        <SnapshotChips>
                          <SnapshotChip><Code /> {selectedRow.industry}</SnapshotChip>
                          <SnapshotChip><Calculator /> {tp(`segments.${selectedRow.segment}`, getPortfolioSegmentLabel(selectedRow.segment))}</SnapshotChip>
                          <SnapshotChip><TrendingUp /> {selectedRow.stage}</SnapshotChip>
                          <SnapshotChip><Globe /> {selectedRow.country}</SnapshotChip>
                        </SnapshotChips>
                      </div>
                    </SnapshotIdentity>

                    <SnapshotActions>
                      <SnapshotPrimaryLink href={`/startups/${selectedRow.startup.id}`}>
                        <ExternalLink /> {tp('detail.fullCard', 'Полная карточка')}
                      </SnapshotPrimaryLink>
                    </SnapshotActions>
                  </SnapshotHeroTop>

                  <SnapshotKpiGrid>
                    <SnapshotKpiCard>
                      <SnapshotKpiIcon><BriefcaseBusiness /></SnapshotKpiIcon>
                      <div>
                        <SnapshotKpiLabel>{tp('dashboard.bridgeInvested', 'Вложено')}</SnapshotKpiLabel>
                        <SnapshotKpiValue>{formatCurrency(selectedRow.investedUsd)}</SnapshotKpiValue>
                      </div>
                    </SnapshotKpiCard>
                    <SnapshotKpiCard>
                      <SnapshotKpiIcon $tone="blue"><BarChart3 /></SnapshotKpiIcon>
                      <div>
                        <SnapshotKpiLabel>{tp('dashboard.bridgeCurrent', 'Текущая оценка')}</SnapshotKpiLabel>
                        <SnapshotKpiValue>{formatCurrency(selectedRow.currentValuation)}</SnapshotKpiValue>
                      </div>
                    </SnapshotKpiCard>
                    <SnapshotKpiCard>
                      <SnapshotKpiIcon $tone="purple"><TrendingUp /></SnapshotKpiIcon>
                      <div>
                        <SnapshotKpiLabel>MOIC</SnapshotKpiLabel>
                        <SnapshotKpiValue>{formatMultiple(selectedRow.moic)}</SnapshotKpiValue>
                      </div>
                    </SnapshotKpiCard>
                    <SnapshotKpiCard>
                      <SnapshotKpiIcon $tone="amber"><CalendarClock /></SnapshotKpiIcon>
                      <div>
                        <SnapshotKpiLabel>Runway</SnapshotKpiLabel>
                        <SnapshotKpiValue>{selectedRow.runway != null ? monthsLabel(selectedRow.runway.toLocaleString(numberLocale(), { maximumFractionDigits: 1 })) : '-'}</SnapshotKpiValue>
                      </div>
                    </SnapshotKpiCard>
                    <SnapshotKpiCard>
                      <SnapshotKpiIcon><DollarSign /></SnapshotKpiIcon>
                      <div>
                        <SnapshotKpiLabel>MRR</SnapshotKpiLabel>
                        <SnapshotKpiValue>{formatCurrency(selectedRow.mrr)}</SnapshotKpiValue>
                      </div>
                    </SnapshotKpiCard>
                  </SnapshotKpiGrid>
                </SnapshotHero>

                <SnapshotDetailsGrid>
                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><CalendarClock /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('detail.entryDate', 'Дата входа')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{formatFullDate(selectedRow.entryDate)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><BriefcaseBusiness /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('detail.investmentType', 'Тип инвестиций')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{investmentTypeLabel(selectedRow.investmentType)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><TrendingUp /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('table.stage', 'Стадия')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedRow.stage}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><FileText /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('detail.source', 'Источник')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedRow.startup.source || '-'}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>

                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><DollarSign /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('dashboard.bridgeEntry', 'Оценка входа')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{formatCurrency(selectedRow.entryValuation)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><BarChart3 /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('dashboard.bridgeCurrent', 'Текущая оценка')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{formatCurrency(selectedRow.currentValuation)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Activity /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('detail.fundOwnership', 'Доля фонда')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{formatPercent(selectedRow.ownership)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Code /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('table.sector', 'Сектор')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedRow.industry}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>

                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><User /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('fullCard.founder', 'Фаундер')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{getFounderDisplayName(selectedRow.startup) || '-'}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><User /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>Email</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedFounderEmail || '-'}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Globe /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('detail.website', 'Сайт')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>
                          {selectedWebsite && selectedWebsiteHref ? (
                            <a href={selectedWebsiteHref} target="_blank" rel="noreferrer">{selectedWebsite}</a>
                          ) : '-'}
                        </SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Globe /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('table.country', 'Страна')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedRow.country}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>
                </SnapshotDetailsGrid>

                <SnapshotDetailsGrid>
                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Activity /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>{tp('table.status', 'Статус')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>
                          <SnapshotMetaRow>
                            <StatusPill $status={selectedRow.status}>
                              <Circle />
                              {rowStatusLabel(selectedRow)}
                            </StatusPill>
                            {selectedRow.healthOverride ? (
                              <InfoHintText>{tp('detail.autoCalculated', 'авторасчёт')}: {rowAutoStatusLabel(selectedRow)}</InfoHintText>
                            ) : null}
                          </SnapshotMetaRow>
                        </SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>
                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><Flame /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>Burn {perMonth}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{formatCurrency(selectedRow.burnRate)}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>
                  <SnapshotDetailColumn>
                    <SnapshotDetailItem>
                      <SnapshotDetailIcon><TrendingUp /></SnapshotDetailIcon>
                      <div>
                        <SnapshotDetailLabel>MoM {tp('table.growth', 'рост')}</SnapshotDetailLabel>
                        <SnapshotDetailValue>{selectedRow.momGrowth != null ? formatWorkbookMom(selectedRow.momGrowth) : '-'}</SnapshotDetailValue>
                      </div>
                    </SnapshotDetailItem>
                  </SnapshotDetailColumn>
                </SnapshotDetailsGrid>

                {!readOnly && (
                  <DetailCard>
                    <DetailCardHeader>
                      <div>
                        <DetailTitle>{tp('detail.healthOverrideTitleShort', 'Статус здоровья')}</DetailTitle>
                        <DetailHint>{tp('detail.healthOverrideTitle', 'Автоматический статус рассчитывается из Total Score по порогам ТЗ. Здесь можно выставить цвет статуса вручную.')}</DetailHint>
                      </div>
                      <Activity />
                    </DetailCardHeader>
                    <HealthOverrideControl
                      onBlur={(event) => {
                        const nextTarget = event.relatedTarget;
                        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                          setHealthDropdownOpen(false);
                        }
                      }}
                    >
                      <StartupDropdown>
                        <StartupSelectButton
                          type="button"
                          $open={healthDropdownOpen}
                          aria-haspopup="listbox"
                          aria-expanded={healthDropdownOpen}
                          aria-label={tp('detail.healthOverrideTitleShort', 'Статус здоровья')}
                          onClick={() => setHealthDropdownOpen((open) => !open)}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') setHealthDropdownOpen(false);
                          }}
                        >
                          <StartupSelectText>{selectedHealthOverrideLabel}</StartupSelectText>
                          <ChevronDown />
                        </StartupSelectButton>
                        {healthDropdownOpen && (
                          <StartupSelectMenu role="listbox" aria-label={tp('detail.healthOverrideTitleShort', 'Статус здоровья')}>
                            {healthOverrideOptions.map((option) => {
                              const active = option.value === selectedHealthOverrideValue;
                              return (
                                <StartupSelectOption
                                  key={option.value || 'auto'}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  $active={active}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    handleHealthOverrideChange(selectedRow, option.value);
                                    setHealthDropdownOpen(false);
                                  }}
                                >
                                  <span>{option.label}</span>
                                  {active && <Check />}
                                </StartupSelectOption>
                              );
                            })}
                          </StartupSelectMenu>
                        )}
                      </StartupDropdown>
                    </HealthOverrideControl>
                  </DetailCard>
                )}

                <SnapshotDescriptionCard>
                  <SnapshotDescriptionTitle><ListChecks /> {tp('detail.descriptionTitle', 'Описание')}</SnapshotDescriptionTitle>
                  <SnapshotDescriptionText>
                    {selectedRow.startup.brief.description || tp('detail.descriptionEmpty', 'Описание пока не заполнено.')}
                  </SnapshotDescriptionText>
                </SnapshotDescriptionCard>
              </SnapshotPanel>
            ) : (
            <SheetGrid $singleColumn={activeSection === 'settings'}>
              <DetailStack>
                {detailSection === 'cap-table' && (
                  <>
                    <DetailCard>
                      <DetailCardHeader>
                        <div>
                          <DetailTitle>{tp('sections.capTable.label', 'Cap Table')}</DetailTitle>
                          <DetailHint>{tp('capTable.v1Hint', 'В v1 считаем долю фонда из investment amount и valuation; детальный cap table подтянется из документов/Data Room.')}</DetailHint>
                        </div>
                        <Users />
                      </DetailCardHeader>
                      <MiniTable>
                        <thead>
                          <tr>
                            <th>{tp('capTable.participant', 'Участник')}</th>
                            <th>{tp('capTable.role', 'Роль')}</th>
                            <th>{tp('table.ownership', 'Доля')}</th>
                            <th>{tp('capTable.amount', 'Сумма')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{organization?.name || tp('capTable.fundFallback', 'Фонд')}</td>
                            <td>{investmentTypeLabel(selectedRow.investmentType)}</td>
                            <td>{formatPercent(selectedRow.ownership)}</td>
                            <td>{formatCurrency(selectedRow.investedUsd)}</td>
                          </tr>
                          <tr>
                            <td>{tp('capTable.existingShareholders', 'Founders / existing shareholders')}</td>
                            <td>{tp('capTable.remainingShares', 'Остальные доли')}</td>
                            <td>{selectedRow.ownership != null ? formatPercent(Math.max(0, 1 - selectedRow.ownership)) : '-'}</td>
                            <td>-</td>
                          </tr>
                        </tbody>
                      </MiniTable>
                    </DetailCard>
                    <DetailCard>
                      <DetailCardHeader>
                        <div>
                          <DetailTitle>{tp('capTable.timelineTitle', 'Timeline')}</DetailTitle>
                          <DetailHint>{tp('capTable.timelineEventsHint', 'Инвестиционные события, прошлые раунды, метрики и quarterly reports.')}</DetailHint>
                        </div>
                        <CalendarClock />
                      </DetailCardHeader>
                      {selectedTimeline.length ? (
                        <TimelineList>
                          {selectedTimeline.map((event, index) => (
                            <TimelineItem key={`${event.label}-${index}`}>
                              <TimelineDate>{event.date ? formatFullDate(event.date) : '-'}</TimelineDate>
                              <div>
                                <TimelineTitle>{event.label}</TimelineTitle>
                                <TimelineDesc>{event.description}</TimelineDesc>
                              </div>
                            </TimelineItem>
                          ))}
                        </TimelineList>
                      ) : (
                        <NarrativeText>{tp('capTable.timelineNoEvents', 'События пока не внесены.')}</NarrativeText>
                      )}
                    </DetailCard>
                  </>
                )}

                {detailSection === 'traction' && (
                  <>
                    <DetailCard>
                      <DetailCardHeader>
                        <div>
                          <DetailTitle>{tp('traction.currentTitle', 'Current Traction')}</DetailTitle>
                          <DetailHint>{tp('traction.currentHint', 'Последние метрики из портфельного блока и квартальных отчётов.')}</DetailHint>
                        </div>
                        <Activity />
                      </DetailCardHeader>
                      <InfoGrid>
                        <InfoItem><InfoLabel>MRR</InfoLabel><InfoValue>{formatCurrency(selectedRow.mrr)}</InfoValue></InfoItem>
                        <InfoItem><InfoLabel>ARR</InfoLabel><InfoValue>{formatCurrency(selectedRow.startup.metrics?.arr)}</InfoValue></InfoItem>
                        <InfoItem><InfoLabel>GMV</InfoLabel><InfoValue>{formatCurrency(selectedRow.startup.metrics?.gmv)}</InfoValue></InfoItem>
                        <InfoItem><InfoLabel>Burn</InfoLabel><InfoValue>{formatCurrency(selectedRow.burnRate)}</InfoValue></InfoItem>
                        <InfoItem><InfoLabel>Runway</InfoLabel><InfoValue>{selectedRow.runway != null ? monthsLabel(selectedRow.runway) : '-'}</InfoValue></InfoItem>
                        <InfoItem><InfoLabel>MoM {tp('table.growth', 'рост')}</InfoLabel><InfoValue>{formatPercent(selectedRow.momGrowth)}</InfoValue></InfoItem>
                      </InfoGrid>
                    </DetailCard>
                    <DetailCard>
                      <QuarterlyMetricsCharts
                        reports={selectedReports}
                        loading={reportsLoading}
                        surface="inline"
                        title={tp('traction.quarterlyMetricsTitle', 'Quarterly Metrics')}
                        subtitle={tp('traction.quarterlyMetricsSubtitle', 'Динамика MRR, revenue, burn и runway по отправленным квартальным отчётам.')}
                      />
                    </DetailCard>
                    <DetailCard>
                      <DigestHeader>
                        <div>
                          <DetailTitle>{tp('traction.digestTitle', 'Quarterly Digest')}</DetailTitle>
                          <DetailHint>{tp('traction.digestHint', 'AI-саммари последнего квартального отчёта: изменения, риски, asks и вопросы для review.')}</DetailHint>
                        </div>
                        {latestSelectedReport && !readOnly && (
                          <DigestActionButton
                            onClick={() => generateDigest(latestSelectedReport)}
                            disabled={digestGeneratingId === latestSelectedReport.id}
                          >
                            <Sparkles />
                            {digestGeneratingId === latestSelectedReport.id
                              ? tp('traction.generatingDigest', 'Генерируем...')
                              : latestSelectedDigest ? tp('traction.updateDigest', 'Обновить digest') : tp('traction.generateDigest', 'Сгенерировать digest')}
                          </DigestActionButton>
                        )}
                      </DigestHeader>

                      {reportsLoading ? (
                        <LoadingContainer><Spinner /></LoadingContainer>
                      ) : latestSelectedReport ? (
                        latestSelectedDigest ? (
                          <DigestSection>
                            <div>
                              <DigestBadge>
                                <Sparkles size={13} />
                                {reportPeriodLabel(latestSelectedDigest)} · {latestSelectedDigest.isAiGenerated ? 'AI' : 'Rules'}
                              </DigestBadge>
                            </div>
                            <NarrativeText>{latestSelectedDigest.summary}</NarrativeText>
                            <DigestGrid>
                              <DigestBox>
                                <DigestBoxTitle>{tp('traction.digestMetricsTitle', 'Метрики и динамика')}</DigestBoxTitle>
                                <DigestList>
                                  {latestSelectedDigest.metricChanges.map((item) => <li key={item}>{item}</li>)}
                                </DigestList>
                              </DigestBox>
                              <DigestBox>
                                <DigestBoxTitle>{tp('traction.digestRisksTitle', 'Риски')}</DigestBoxTitle>
                                <DigestList>
                                  {latestSelectedDigest.risks.map((item) => <li key={item}>{item}</li>)}
                                </DigestList>
                              </DigestBox>
                              <DigestBox>
                                <DigestBoxTitle>{tp('traction.digestAsksTitle', 'Запросы к фонду')}</DigestBoxTitle>
                                <DigestList>
                                  {latestSelectedDigest.asks.map((item) => <li key={item}>{item}</li>)}
                                </DigestList>
                              </DigestBox>
                              <DigestBox>
                                <DigestBoxTitle>{tp('traction.digestQuestionsTitle', 'Вопросы менеджеру')}</DigestBoxTitle>
                                <DigestList>
                                  {latestSelectedDigest.suggestedQuestions.map((item) => <li key={item}>{item}</li>)}
                                </DigestList>
                              </DigestBox>
                            </DigestGrid>
                            <DigestBox>
                              <DigestBoxTitle>{tp('traction.digestActionTitle', 'Рекомендуемое действие')}</DigestBoxTitle>
                              <NarrativeText>{latestSelectedDigest.recommendedAction}</NarrativeText>
                            </DigestBox>
                          </DigestSection>
                        ) : (
                          <NarrativeText>
                            {tp('traction.digestMissing', 'Есть отчёт {{period}}, но digest ещё не создан. Нажмите “Сгенерировать digest”.', { period: reportPeriodLabel(latestSelectedReport) })}
                          </NarrativeText>
                        )
                      ) : (
                        <NarrativeText>{tp('traction.noReports', 'Квартальных отчётов пока нет. После отправки стартапом отчёта здесь появится digest.')}</NarrativeText>
                      )}
                    </DetailCard>
                    <DetailCard>
                      <DetailCardHeader>
                        <div>
                          <DetailTitle>{tp('traction.metricsHistoryTitle', 'Metrics History')}</DetailTitle>
                          <DetailHint>{tp('traction.metricsHistoryHint', 'Аналог листа Traction Tracker из workbook.')}</DetailHint>
                        </div>
                        <TrendingUp />
                      </DetailCardHeader>
                      {selectedSnapshots.length ? (
                        <MiniTable>
                          <thead>
                            <tr><th>{tp('traction.period', 'Период')}</th><th>MRR</th><th>ARR</th><th>Burn</th><th>Runway</th></tr>
                          </thead>
                          <tbody>
                            {selectedSnapshots.map((snapshot) => (
                              <tr key={`${snapshot.id || snapshot.date}`}>
                                <td>{snapshot.date}</td>
                                <td>{formatCurrency(snapshot.metrics.mrr)}</td>
                                <td>{formatCurrency(snapshot.metrics.arr)}</td>
                                <td>{formatCurrency(snapshot.metrics.burnRate)}</td>
                                <td>{snapshot.metrics.runway != null ? monthsLabel(snapshot.metrics.runway) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </MiniTable>
                      ) : (
                        <NarrativeText>{tp('traction.metricsHistoryEmpty', 'История метрик пока пустая. Она будет пополняться из quarterly reports и ручных обновлений portfolio metrics.')}</NarrativeText>
                      )}
                    </DetailCard>
                  </>
                )}

                {activeSection === 'settings' && canManagePortfolioSettings && (
                  <SettingsPanel>
                    <DetailCardHeader>
                      <div>
                        <DetailTitle>{tp('settings.title', 'Настройки системы')}</DetailTitle>
                        <DetailHint>{tp('settings.hint', 'Параметры фонда и вспомогательные пороги метрик. Итоговый автоматический статус определяется только Total Score по формуле ТЗ.')}</DetailHint>
                      </div>
                      <Settings />
                    </DetailCardHeader>
                    <SettingsSections>
                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><DollarSign size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.currencyRates', 'Курсы валют')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.usdToUzs', 'Курс USD → UZS')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="1"
                              step="1"
                              value={settingsDraft.usdToUzs}
                              onChange={(event) => updateNumericSetting('usdToUzs', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.usdToUzsNote', 'Используется для dual currency и суммарных значений в UZS. Обновлять ежемесячно.')}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.usdToKzt', 'Курс USD → KZT')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="1"
                              step="1"
                              value={settingsDraft.usdToKzt}
                              onChange={(event) => updateNumericSetting('usdToKzt', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.usdToKztNote', 'Нужен для казахстанских портфельных компаний и будущего multi-currency режима.')}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><Calculator size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>
                            {tp('settings.segmentMarginThresholds', 'Маржинальность по направлениям')}
                          </SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SegmentThresholdTableScroll>
                          <SegmentThresholdTable>
                            <thead>
                              <tr>
                                <th scope="col">{tp('settings.segment', 'Направление')}</th>
                                <th scope="col">Gross Margin · green</th>
                                <th scope="col">Gross Margin · yellow</th>
                                <th scope="col">EBITDA Margin · green</th>
                                <th scope="col">EBITDA Margin · yellow</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PORTFOLIO_SEGMENTS.map((segment) => {
                                const thresholds = settingsDraft.segmentThresholds[segment];
                                const segmentLabel = tp(
                                  `segments.${segment}`,
                                  getPortfolioSegmentLabel(segment),
                                );
                                return (
                                  <tr key={segment}>
                                    <td>{segmentLabel}</td>
                                    {([
                                      ['grossMarginGreen', thresholds.grossMarginGreen],
                                      ['grossMarginYellow', thresholds.grossMarginYellow],
                                      ['ebitdaMarginGreen', thresholds.ebitdaMarginGreen],
                                      ['ebitdaMarginYellow', thresholds.ebitdaMarginYellow],
                                    ] as const).map(([field, value]) => (
                                      <td key={field}>
                                        <SegmentThresholdPercentageInput
                                          value={value}
                                          ariaLabel={`${segmentLabel} ${field}`}
                                          onValidValue={(nextValue) => updateSegmentThresholdSetting(
                                            segment,
                                            field,
                                            nextValue,
                                          )}
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </SegmentThresholdTable>
                        </SegmentThresholdTableScroll>
                        <SegmentThresholdHelp>
                          {tp(
                            'settings.segmentMarginThresholdsHelp',
                            'Значения указаны в процентах. Green применяется от заданного значения, yellow — от нижнего порога, ниже yellow — red. Направление можно выбрать в таблице; до ручного выбора оно определяется из industry и business model.',
                          )}
                        </SegmentThresholdHelp>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><CalendarClock size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.runwayThresholds', 'Пороги светофора — runway')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.runwayGreen', 'Runway: порог зелёного')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="1"
                              value={settingsDraft.runwayGreen}
                              onChange={(event) => updateNumericSetting('runwayGreen', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.runwayGreenNote', '≥ {{value}} месяцев считается устойчивым запасом денежных средств.', { value: settingsDraft.runwayGreen })}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.runwayYellow', 'Runway: порог жёлтого')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="1"
                              value={settingsDraft.runwayYellow}
                              onChange={(event) => updateNumericSetting('runwayYellow', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.runwayYellowNote', '≥ {{value}} месяцев = нужно внимание; ниже = красный риск капитала.', { value: settingsDraft.runwayYellow })}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><TrendingUp size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.momThresholds', 'Пороги светофора — MoM рост')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.momGreen', 'MoM рост: порог зелёного')}</SettingsName>
                            <SettingsInput
                              type="number"
                              step="1"
                              value={toPercentInput(settingsDraft.momGreen)}
                              onChange={(event) => updateNumericSetting('momGreen', event.target.value, true)}
                            />
                            <SettingsNote>{tp('settings.momGreenNote', '≥ {{value}}% месячного роста считается хорошей динамикой.', { value: toPercentInput(settingsDraft.momGreen) })}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.momYellow', 'MoM рост: порог жёлтого')}</SettingsName>
                            <SettingsInput
                              type="number"
                              step="1"
                              value={toPercentInput(settingsDraft.momYellow)}
                              onChange={(event) => updateNumericSetting('momYellow', event.target.value, true)}
                            />
                            <SettingsNote>{tp('settings.momYellowNote', '≥ 0% = рост есть, но слабый; ниже 0% = красный сигнал.')}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><Zap size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.moicThresholds', 'Пороги светофора — MOIC')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.moicGreen', 'MOIC: порог зелёного')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="0.1"
                              value={settingsDraft.moicGreen}
                              onChange={(event) => updateNumericSetting('moicGreen', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.moicGreenNote', '≥ {{value}}x = портфельная компания выглядит здоровой по мультипликатору.', { value: settingsDraft.moicGreen.toFixed(1) })}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.moicYellow', 'MOIC: порог жёлтого')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="0.1"
                              value={settingsDraft.moicYellow}
                              onChange={(event) => updateNumericSetting('moicYellow', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.moicYellowNote', '≥ {{value}}x = наблюдать; ниже = красный сигнал.', { value: settingsDraft.moicYellow.toFixed(1) })}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><Activity size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.churnThresholds', 'Пороги светофора — churn rate')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.churnGreen', 'Churn Rate: порог зелёного')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="1"
                              value={toPercentInput(settingsDraft.churnGreen)}
                              onChange={(event) => updateNumericSetting('churnGreen', event.target.value, true)}
                            />
                            <SettingsNote>{tp('settings.churnGreenNote', '≤ {{value}}% = хороший retention.', { value: toPercentInput(settingsDraft.churnGreen) })}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.churnYellow', 'Churn Rate: порог жёлтого')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="1"
                              value={toPercentInput(settingsDraft.churnYellow)}
                              onChange={(event) => updateNumericSetting('churnYellow', event.target.value, true)}
                            />
                            <SettingsNote>{tp('settings.churnYellowNote', '≤ {{value}}% = нужно внимание; выше = красный риск удержания.', { value: toPercentInput(settingsDraft.churnYellow) })}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><BarChart3 size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.scoringModel', 'Scoring model из Startup Monitoring')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>YoY Score</SettingsName>
                            <SettingsValue>10%</SettingsValue>
                            <SettingsNote>&gt;100% → 5 · 50–100% → 4 · 20–50% → 3 · 0–20% → 2 · negative → −1 · N/A → 0</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>QoQ Score</SettingsName>
                            <SettingsValue>20%</SettingsValue>
                            <SettingsNote>&gt;50% → 5 · 25–50% → 4 · 10–25% → 3 · 0–10% → 2 · negative → −1 · N/A → 0</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>MoM Score</SettingsName>
                            <SettingsValue>15%</SettingsValue>
                            <SettingsNote>&gt;20% → 5 · 10–20% → 4 · 5–10% → 3 · 0–5% → 2 · negative → −1 · N/A → 0</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>Gross Margin Score</SettingsName>
                            <SettingsValue>15%</SettingsValue>
                            <SettingsNote>&gt;80% → 5 · 60–80% → 4 · 40–60% → 3 · 20–40% → 2 · 0–20% → 1 · negative → −1</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>EBITDA Margin Score</SettingsName>
                            <SettingsValue>10%</SettingsValue>
                            <SettingsNote>&gt;20% → 5 · 0–20% → 4 · −20–0% → 3 · −50–−20% → 2 · −85–−50% → 1 · ниже −85% → −1</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>Runway Score</SettingsName>
                            <SettingsValue>15%</SettingsValue>
                            <SettingsNote>∞ / &gt;19 мес. → 5 · 12–19 → 4 · 6–12 → 3 · 3–6 → 2 · &lt;3 → 1 · N/A → 0</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>Current Ratio Score</SettingsName>
                            <SettingsValue>15%</SettingsValue>
                            <SettingsNote>&gt;2 → 5 · 1.5–2 → 4 · 1–1.5 → 3 · 0.7–1 → 2 · &lt;0.7 → 1 · N/A → 0</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>Total Score</SettingsName>
                            <SettingsValue>Score ÷ 4</SettingsValue>
                            <SettingsNote>{tp('settings.totalScoreNote', 'Σ(Score ÷ 4 × вес). Strong ≥ 80%; Healthy ≥ 50%; Need attention ≥ 35%; At Risk ≥ 15%; Critical < 15%. Score 5 даёт бонус выше 100%.')}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><BriefcaseBusiness size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.fundDefaults', 'Общие параметры фонда')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('settings.fundName', 'Название фонда')}</SettingsName>
                            <SettingsInput
                              type="text"
                              value={settingsDraft.fundDisplayName}
                              onChange={(event) => updateTextSetting('fundDisplayName', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.fundNameNote', 'Отображается в заголовках, отчётах и портфельных представлениях.')}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.reportingPeriod', 'Отчётный период')}</SettingsName>
                            <SettingsInput
                              type="text"
                              value={settingsDraft.reportingPeriod}
                              onChange={(event) => updateTextSetting('reportingPeriod', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.reportingPeriodNote', 'Текущий квартал для quarterly reports и traction tracker.')}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.baseCurrency', 'Базовая валюта')}</SettingsName>
                            <SettingsSelect
                              value={settingsDraft.baseCurrency}
                              onChange={(event) => updateTextSetting('baseCurrency', event.target.value)}
                            >
                              <option value="USD">USD</option>
                              <option value="UZS">UZS</option>
                              <option value="KZT">KZT</option>
                            </SettingsSelect>
                            <SettingsNote>{tp('settings.baseCurrencyNote', 'Основная валюта расчётов: investment, valuation, MOIC и value bridge.')}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.followOnCriterion', 'Follow-on критерий')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="0.1"
                              value={settingsDraft.followOnMoic}
                              onChange={(event) => updateNumericSetting('followOnMoic', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.followOnCriterionNote', 'MOIC ≥ {{moic}}x плюс runway ≥ {{runway}} мес. и неотрицательный MoM рост.', { moic: settingsDraft.followOnMoic, runway: settingsDraft.followOnRunway })}</SettingsNote>
                          </SettingsRow>
                          <SettingsRow>
                            <SettingsName>{tp('settings.followOnRunway', 'Follow-on runway')}</SettingsName>
                            <SettingsInput
                              type="number"
                              min="0"
                              step="1"
                              value={settingsDraft.followOnRunway}
                              onChange={(event) => updateNumericSetting('followOnRunway', event.target.value)}
                            />
                            <SettingsNote>{tp('settings.followOnRunwayNote', 'Минимальный runway для watchlist follow-on кандидатов.')}</SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                      <SettingsBlock>
                        <SettingsBlockHeader>
                          <SettingsBlockIcon><Download size={16} /></SettingsBlockIcon>
                          <SettingsBlockTitle>{tp('settings.dataExport', 'Экспорт данных')}</SettingsBlockTitle>
                        </SettingsBlockHeader>
                        <SettingsRows>
                          <SettingsRow>
                            <SettingsName>{tp('export.excel', 'Выгрузить в Excel')}</SettingsName>
                            <SettingsButton
                              type="button"
                              onClick={handleExportPortfolio}
                              disabled={filteredRows.length === 0}
                              title={tp('export.excelHint', 'Выгрузить видимые колонки и строки в .xlsx')}
                            >
                              <Download size={15} />
                              {tp('export.excelShort', 'Экспорт')}
                            </SettingsButton>
                            <SettingsNote>
                              {tp(
                                'export.settingsNote',
                                'Выгружает таблицу дашборда как она сейчас настроена: видимые колонки, поиск и фильтры. К выгрузке готово строк: {{count}} из {{total}}.',
                                { count: filteredRows.length, total: rows.length },
                              )}
                            </SettingsNote>
                          </SettingsRow>
                        </SettingsRows>
                      </SettingsBlock>

                    </SettingsSections>
                    <SettingsFooter>
                      <SettingsButton type="button" onClick={resetSettingsDraft} disabled={settingsSaving}>
                        <RotateCcw size={15} />
                        {tp('settings.resetChanges', 'Сбросить изменения')}
                      </SettingsButton>
                      <SettingsButton type="button" $primary onClick={savePortfolioSettings} disabled={settingsSaving}>
                        <Save size={15} />
                        {settingsSaving ? tp('settings.saving', 'Сохраняю...') : tp('settings.saveSettings', 'Сохранить настройки')}
                      </SettingsButton>
                    </SettingsFooter>
                    {settingsStatus && <SettingsFeedback $type="success">{settingsStatus}</SettingsFeedback>}
                    {settingsError && <SettingsFeedback $type="error">{settingsError}</SettingsFeedback>}
                  </SettingsPanel>
                )}
              </DetailStack>
            </SheetGrid>
            )}
          </SheetBody>
        )}
      </DashboardCard>
    </PageContainer>
  );
};

const Portfolio = () => {
  const { manager } = useAuth();
  const readOnly = manager?.role === 'committee_member';
  return (
    <PortfolioReadOnlyContext.Provider value={readOnly}>
      <PortfolioContent />
    </PortfolioReadOnlyContext.Provider>
  );
};

export default Portfolio;
