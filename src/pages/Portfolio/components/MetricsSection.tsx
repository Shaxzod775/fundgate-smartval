import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Plus, Save, TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import { Startup, StartupMetrics, MetricSnapshot, HealthColor } from '../../../types';
import { startupsApi } from '../../../services/api';
import { Badge } from '../../../components/ui/Badge';
import { resolveStartupUnitEconomics } from '../portfolioUnitEconomics';
import { formatShortDate } from '../../../utils/formatDate';

interface MetricsSectionProps {
  startup: Startup;
  canEdit: boolean;
  onUpdate: (updated: Partial<Startup>) => void;
}

const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 24px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    padding: 16px;
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colors.accent.primary}; }
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  color: ${({ theme }) => theme.colors.accent.primary};
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { opacity: 0.85; }

  svg { width: 15px; height: 15px; }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const MetricCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const MetricValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MetricEmpty = styled.div`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const MetricInput = styled.input`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 600;
  outline: none;

  &:focus { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  &::placeholder { color: ${({ theme }) => theme.colors.text.tertiary}; }
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  -moz-appearance: textfield;
`;

const HealthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-top: 20px;

  @media (max-width: 1024px) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  @media (max-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 480px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const HealthItem = styled.div<{ $color?: HealthColor }>`
  background: ${({ $color }) =>
    $color === 'green' ? 'rgba(16, 185, 129, 0.1)' :
    $color === 'yellow' ? 'rgba(245, 158, 11, 0.1)' :
    $color === 'red' ? 'rgba(239, 68, 68, 0.1)' :
    'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${({ $color }) =>
    $color === 'green' ? 'rgba(16, 185, 129, 0.3)' :
    $color === 'yellow' ? 'rgba(245, 158, 11, 0.3)' :
    $color === 'red' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(255, 255, 255, 0.08)'};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px;
  text-align: center;
`;

const HealthLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 4px;
`;

const HealthBadge = styled.div<{ $color?: HealthColor }>`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ $color }) =>
    $color === 'green' ? '#10b981' :
    $color === 'yellow' ? '#f59e0b' :
    $color === 'red' ? '#ef4444' : 'rgba(255,255,255,0.4)'};
`;

const HistoryTable = styled.div`
  margin-top: 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  /* 9 columns — keep them readable and let HistoryTable scroll horizontally
     on narrow screens instead of crushing the cells. */
  min-width: 720px;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    padding: 10px 12px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }

  th {
    color: ${({ theme }) => theme.colors.text.muted};
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '--';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
};

const toMetricNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) && value.trim() !== '' ? parsed : undefined;
  }
  return undefined;
};

const resolveMetricValue = (startup: Startup, key: keyof StartupMetrics): number | undefined => {
  const direct = toMetricNumber(startup.metrics?.[key]);
  if (direct !== undefined) return direct;
  const brief = (startup.brief || {}) as unknown as Record<string, unknown>;
  const raw = startup as unknown as Record<string, unknown>;
  switch (key) {
    case 'cac': return resolveStartupUnitEconomics(startup).cac;
    case 'churnRate': return toMetricNumber(brief.churnRate ?? raw.churnRate);
    case 'arr': return toMetricNumber(brief.arr ?? raw.arr);
    case 'mrr': return toMetricNumber(brief.mrr ?? raw.mrr);
    case 'gmv': return toMetricNumber(brief.gmv ?? raw.gmv);
    case 'burnRate': return toMetricNumber(brief.burnRate ?? raw.burnRate ?? raw.monthlyBurn);
    case 'arpu': return toMetricNumber(brief.arpu);
    case 'ltv': return resolveStartupUnitEconomics(startup).ltv;
    case 'grossMargin': return toMetricNumber(brief.grossMargin);
    default: return undefined;
  }
};

const METRIC_FIELDS: { key: keyof StartupMetrics; label: string; format: 'currency' | 'percent' | 'months' }[] = [
  { key: 'arr', label: 'ARR', format: 'currency' },
  { key: 'mrr', label: 'MRR', format: 'currency' },
  { key: 'gmv', label: 'GMV', format: 'currency' },
  { key: 'arpu', label: 'ARPU', format: 'currency' },
  { key: 'ltv', label: 'LTV', format: 'currency' },
  { key: 'cac', label: 'CAC', format: 'currency' },
  { key: 'grossMargin', label: 'Gross Margin', format: 'percent' },
  { key: 'burnRate', label: 'Burn Rate', format: 'currency' },
  { key: 'churnRate', label: 'Churn Rate', format: 'percent' },
];

const HEALTH_FIELDS: { key: string; label: string }[] = [
  { key: 'revenueGrowth', label: 'Revenue Growth' },
  { key: 'grossMargin', label: 'Gross Margin' },
  { key: 'burnMultiple', label: 'Burn Multiple' },
  { key: 'runway', label: 'Runway' },
  { key: 'cashFlowTrend', label: 'Cash Flow' },
  { key: 'ltvCac', label: 'LTV/CAC' },
  { key: 'payback', label: 'Payback' },
];

export const MetricsSection = ({ startup, canEdit, onUpdate }: MetricsSectionProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editValues, setEditValues] = useState<StartupMetrics>(startup.metrics || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const metricsWithDate = { ...editValues, updatedAt: new Date().toISOString() };
      const res = await startupsApi.update(startup.id, { metrics: metricsWithDate } as any);
      if (res.success) {
        onUpdate({ metrics: metricsWithDate });
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save metrics:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (key: keyof StartupMetrics, val?: number) => {
    if (val === undefined || val === null) return '--';
    const field = METRIC_FIELDS.find(f => f.key === key);
    if (field?.format === 'currency') return formatCurrency(val);
    if (field?.format === 'percent') return `${val.toFixed(1)}%`;
    if (field?.format === 'months') return `${val} mo`;
    return String(val);
  };

  const ms = startup.monitoringScore;
  const history = startup.metricsHistory || [];
  const unitEconomics = resolveStartupUnitEconomics(
    startup,
    isEditing ? editValues as unknown as Record<string, unknown> : undefined,
  );

  return (
    <>
      <Section>
        <SectionHeader>
          <div>
            <SectionTitle>
              <TrendingUp />
              {t('portfolio.financialMetrics', 'Financial Metrics')}
            </SectionTitle>
            {(startup.metrics as any)?.updatedAt && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {t('portfolio.lastUpdated', 'Last updated')}: {formatShortDate(new Date((startup.metrics as any).updatedAt))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {history.length > 0 && (
              <ActionBtn onClick={() => setShowHistory(!showHistory)}>
                <History />
                {t('portfolio.history', 'History')}
              </ActionBtn>
            )}
            {canEdit && !isEditing && (
              <ActionBtn onClick={() => {
                const clean: StartupMetrics = {};
                if (startup.metrics) {
                  for (const [k, v] of Object.entries(startup.metrics)) {
                    (clean as any)[k] = (typeof v === 'number' && !isNaN(v)) ? v : undefined;
                  }
                }
                setEditValues(clean);
                setIsEditing(true);
              }}>
                <Plus />
                {t('portfolio.updateMetrics', 'Update Metrics')}
              </ActionBtn>
            )}
            {isEditing && (
              <ActionBtn onClick={handleSave} style={{ opacity: saving ? 0.5 : 1 }}>
                <Save />
                {saving ? '...' : t('common.save', 'Save')}
              </ActionBtn>
            )}
          </div>
        </SectionHeader>

        <MetricsGrid>
          {METRIC_FIELDS.map(field => (
            <MetricCard key={field.key}>
              <MetricLabel>{field.label}</MetricLabel>
              {isEditing ? (
                <MetricInput
                  type="text"
                  inputMode="decimal"
                  placeholder={field.label}
                  value={editValues[field.key] != null && !isNaN(editValues[field.key] as number) ? editValues[field.key] : ''}
                  onChange={e => {
                    const val = e.target.value.trim();
                    if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) {
                      const num = Number(val);
                      setEditValues(prev => ({
                        ...prev,
                        [field.key]: val === '' || val === '-' ? undefined : (isNaN(num) ? undefined : num),
                      }));
                    }
                  }}
                />
              ) : (
                resolveMetricValue(startup, field.key) !== undefined ? (
                  <MetricValue>{formatValue(field.key, resolveMetricValue(startup, field.key))}</MetricValue>
                ) : (
                  <MetricEmpty>--</MetricEmpty>
                )
              )}
            </MetricCard>
          ))}
          <MetricCard>
            <MetricLabel>LTV/CAC</MetricLabel>
            {unitEconomics.ltvCac !== undefined ? (
              <MetricValue>{unitEconomics.ltvCac.toFixed(1)}x</MetricValue>
            ) : (
              <MetricEmpty>--</MetricEmpty>
            )}
          </MetricCard>
        </MetricsGrid>

        {ms && (
          <>
            <SectionTitle style={{ marginTop: 24, marginBottom: 12 }}>
              {t('portfolio.monitoringHealth', 'Monitoring Health')}
              {ms.totalScore !== undefined && (
                <Badge
                  variant={ms.totalScore >= 9 ? 'success' : ms.totalScore >= 5 ? 'warning' : 'danger'}
                >
                  {ms.totalScore}/14
                </Badge>
              )}
            </SectionTitle>
            <HealthGrid>
              {HEALTH_FIELDS.map(field => {
                const color = ms[field.key as keyof typeof ms] as HealthColor | undefined;
                return (
                  <HealthItem key={field.key} $color={color}>
                    <HealthLabel>{field.label}</HealthLabel>
                    <HealthBadge $color={color}>{color || '--'}</HealthBadge>
                  </HealthItem>
                );
              })}
            </HealthGrid>
          </>
        )}
      </Section>

      {showHistory && history.length > 0 && (
        <Section>
          <SectionTitle style={{ marginBottom: 16 }}>
            <History />
            {t('portfolio.metricsHistory', 'Metrics History')}
          </SectionTitle>
          <HistoryTable>
            <Table>
              <thead>
                <tr>
                  <th>{t('portfolio.date', 'Date')}</th>
                  <th>ARR</th>
                  <th>MRR</th>
                  <th>ARPU</th>
                  <th>LTV</th>
                  <th>CAC</th>
                  <th>Gross Margin</th>
                  <th>Burn Rate</th>
                  <th>Churn</th>
                </tr>
              </thead>
              <tbody>
                {history.sort((a, b) => b.date.localeCompare(a.date)).map((snap, i) => (
                  <tr key={i}>
                    <td>{snap.date}</td>
                    <td>{formatCurrency(snap.metrics.arr)}</td>
                    <td>{formatCurrency(snap.metrics.mrr)}</td>
                    <td>{formatCurrency(snap.metrics.arpu)}</td>
                    <td>{formatCurrency(snap.metrics.ltv)}</td>
                    <td>{formatCurrency(snap.metrics.cac)}</td>
                    <td>{snap.metrics.grossMargin !== undefined ? `${snap.metrics.grossMargin}%` : '--'}</td>
                    <td>{formatCurrency(snap.metrics.burnRate)}</td>
                    <td>{snap.metrics.churnRate !== undefined ? `${snap.metrics.churnRate}%` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </HistoryTable>
        </Section>
      )}
    </>
  );
};
