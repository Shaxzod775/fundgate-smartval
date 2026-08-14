import { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { numberLocale } from '../../utils/formatNumber';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { QuarterlyReport } from '../../services/api';

type MetricKey = 'revenue' | 'mrr' | 'arr' | 'burn' | 'runway';

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface QuarterlyMetricsChartsProps {
  reports: QuarterlyReport[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
  loading?: boolean;
  surface?: 'panel' | 'inline';
}

interface QuarterlyChartPoint {
  id: string;
  label: string;
  sortKey: number;
  revenue?: number;
  mrr?: number;
  arr?: number;
  burn?: number;
  runway?: number;
}

const QUARTER_ORDER: Record<string, number> = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
};

const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: 'Revenue',
  mrr: 'MRR',
  arr: 'ARR',
  burn: 'Burn',
  runway: 'Runway',
};

const ChartShell = styled.div<{ $surface: 'panel' | 'inline' }>`
  background: ${({ theme, $surface }) => ($surface === 'panel' ? theme.colors.bg.secondary : 'transparent')};
  border: 1px solid ${({ theme, $surface }) => ($surface === 'panel' ? theme.colors.border.secondary : 'transparent')};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme, $surface }) => ($surface === 'panel' ? theme.spacing[4] : 0)};
  min-width: 0;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ChartTitleGroup = styled.div`
  min-width: 0;
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
`;

const ChartSubtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.45;
`;

const ReportCountPill = styled.span`
  flex: 0 0 auto;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.full};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  padding: 6px 10px;
`;

const SnapshotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SnapshotCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const SnapshotLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const SnapshotValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SnapshotDelta = styled.div<{ $tone: 'up' | 'down' | 'flat' }>`
  color: ${({ theme, $tone }) => (
    $tone === 'up'
      ? theme.colors.status.success
      : $tone === 'down'
        ? theme.colors.status.danger
        : theme.colors.text.tertiary
  )};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  margin-top: 4px;
`;

const ChartGrid = styled.div<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? '1fr' : 'minmax(0, 1.25fr) minmax(280px, 0.75fr)')};
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const ChartBox = styled.div`
  min-width: 0;
`;

const ChartBoxTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const EmptyState = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: ${({ theme }) => theme.spacing[5]};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
`;

const SingleReportHint = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.45;
`;

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const formatCompactCurrency = (value?: number): string => {
  if (value === undefined) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  return `$${value.toLocaleString(numberLocale(), { maximumFractionDigits: 0 })}`;
};

const formatRunway = (value: number | undefined, monthLabel: string): string => {
  if (value === undefined) return '-';
  return `${value.toLocaleString(numberLocale(), { maximumFractionDigits: 1 })} ${monthLabel}`;
};

const formatPercentDelta = (
  current: number | undefined,
  previous: number | undefined,
  translate: Translate
): { text: string; tone: 'up' | 'down' | 'flat' } => {
  if (current === undefined || previous === undefined || previous === 0) {
    return { text: translate('quarterlyCharts.delta.noComparison'), tone: 'flat' };
  }
  const delta = (current - previous) / Math.abs(previous);
  if (Math.abs(delta) < 0.005) return { text: translate('quarterlyCharts.delta.noChange'), tone: 'flat' };
  return {
    text: translate('quarterlyCharts.delta.vsPrevious', {
      value: `${delta > 0 ? '+' : ''}${(delta * 100).toLocaleString(numberLocale(), { maximumFractionDigits: 1 })}`,
    }),
    tone: delta > 0 ? 'up' : 'down',
  };
};

const buildPoint = (report: QuarterlyReport): QuarterlyChartPoint | null => {
  const quarter = report.period?.quarter;
  const year = report.period?.year;
  if (!quarter || !year) return null;

  const metrics = report.metrics || {};
  return {
    id: report.id,
    label: `${quarter} ${year}`,
    sortKey: Number(year) * 10 + (QUARTER_ORDER[quarter] || 0),
    revenue: toNumber(metrics.revenue),
    mrr: toNumber(metrics.mrr),
    arr: toNumber(metrics.arr),
    burn: toNumber(metrics.burn),
    runway: toNumber(metrics.runway),
  };
};

const hasMetric = (points: QuarterlyChartPoint[], key: MetricKey): boolean => (
  points.some((point) => point[key] !== undefined)
);

const previousValueFor = (points: QuarterlyChartPoint[], key: MetricKey): number | undefined => {
  for (let index = points.length - 2; index >= 0; index -= 1) {
    const value = points[index][key];
    if (value !== undefined) return value;
  }
  return undefined;
};

const tooltipFormatter = (name: unknown, value: unknown, monthLabel: string): string => {
  const key = String(name) as MetricKey;
  const numeric = toNumber(value);
  if (key === 'runway') return formatRunway(numeric, monthLabel);
  return formatCompactCurrency(numeric);
};

export const QuarterlyMetricsCharts = ({
  reports,
  title,
  subtitle,
  compact = false,
  loading = false,
  surface = 'panel',
}: QuarterlyMetricsChartsProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const translate: Translate = (key, options) => String(t(key, options));
  const monthLabel = translate('portfolio.units.monthShort');
  const chartTitle = title ?? translate('quarterlyCharts.title');
  const chartSubtitle = subtitle ?? translate('quarterlyCharts.subtitle');
  const points = useMemo(() => (
    reports
      .map(buildPoint)
      .filter((point): point is QuarterlyChartPoint => Boolean(point))
      .sort((a, b) => a.sortKey - b.sortKey)
  ), [reports]);

  const latestPoint = points[points.length - 1];
  const hasFinancialData = hasMetric(points, 'revenue') || hasMetric(points, 'mrr') || hasMetric(points, 'arr');
  const hasOperatingData = hasMetric(points, 'burn') || hasMetric(points, 'runway');
  const reportCount = reports.length;

  const snapshotMetrics: Array<{ key: MetricKey; label: string; value: string; delta: { text: string; tone: 'up' | 'down' | 'flat' } }> = latestPoint ? [
    {
      key: 'revenue',
      label: 'Revenue',
      value: formatCompactCurrency(latestPoint.revenue),
      delta: formatPercentDelta(latestPoint.revenue, previousValueFor(points, 'revenue'), translate),
    },
    {
      key: 'mrr',
      label: 'MRR',
      value: formatCompactCurrency(latestPoint.mrr),
      delta: formatPercentDelta(latestPoint.mrr, previousValueFor(points, 'mrr'), translate),
    },
    {
      key: 'arr',
      label: 'ARR',
      value: formatCompactCurrency(latestPoint.arr),
      delta: formatPercentDelta(latestPoint.arr, previousValueFor(points, 'arr'), translate),
    },
    {
      key: 'burn',
      label: 'Burn',
      value: formatCompactCurrency(latestPoint.burn),
      delta: formatPercentDelta(latestPoint.burn, previousValueFor(points, 'burn'), translate),
    },
    {
      key: 'runway',
      label: 'Runway',
      value: formatRunway(latestPoint.runway, monthLabel),
      delta: formatPercentDelta(latestPoint.runway, previousValueFor(points, 'runway'), translate),
    },
  ] : [];

  if (loading) {
    return (
      <ChartShell $surface={surface}>
        <EmptyState>{translate('quarterlyCharts.loading')}</EmptyState>
      </ChartShell>
    );
  }

  if (!points.length || (!hasFinancialData && !hasOperatingData)) {
    return (
      <ChartShell $surface={surface}>
        <ChartHeader>
          <ChartTitleGroup>
            <ChartTitle>{chartTitle}</ChartTitle>
            <ChartSubtitle>{chartSubtitle}</ChartSubtitle>
          </ChartTitleGroup>
          <ReportCountPill>{translate('quarterlyCharts.reportsCount', { value: reportCount })}</ReportCountPill>
        </ChartHeader>
        <EmptyState>
          {translate('quarterlyCharts.empty')}
        </EmptyState>
      </ChartShell>
    );
  }

  return (
    <ChartShell $surface={surface}>
      <ChartHeader>
        <ChartTitleGroup>
          <ChartTitle>{chartTitle}</ChartTitle>
          <ChartSubtitle>{chartSubtitle}</ChartSubtitle>
        </ChartTitleGroup>
        <ReportCountPill>{translate('quarterlyCharts.reportsCount', { value: reportCount })}</ReportCountPill>
      </ChartHeader>

      <SnapshotGrid>
        {snapshotMetrics.map((metric) => (
          <SnapshotCard key={metric.key}>
            <SnapshotLabel>{metric.label}</SnapshotLabel>
            <SnapshotValue>{metric.value}</SnapshotValue>
            <SnapshotDelta $tone={metric.delta.tone}>{metric.delta.text}</SnapshotDelta>
          </SnapshotCard>
        ))}
      </SnapshotGrid>

      {points.length < 2 ? (
        <EmptyState>
          {translate('quarterlyCharts.singleReport', { period: latestPoint.label })}
        </EmptyState>
      ) : (
        <ChartGrid $compact={compact}>
          {hasFinancialData && (
            <ChartBox>
              <ChartBoxTitle>{translate('quarterlyCharts.sections.revenue')}</ChartBoxTitle>
              <ResponsiveContainer width="100%" height={compact ? 210 : 280}>
                <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                  <Tooltip
                    formatter={(value, name) => [tooltipFormatter(name, value, monthLabel), METRIC_LABELS[String(name) as MetricKey] || String(name)]}
                    contentStyle={{
                      background: theme.colors.bg.dropdown,
                      border: `1px solid ${theme.colors.border.primary}`,
                      borderRadius: theme.radius.md,
                      color: theme.colors.text.primary,
                    }}
                    labelStyle={{ color: theme.colors.text.secondary }}
                  />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  {hasMetric(points, 'revenue') && <Line type="monotone" dataKey="revenue" name="revenue" stroke={theme.colors.chart.green} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                  {hasMetric(points, 'mrr') && <Line type="monotone" dataKey="mrr" name="mrr" stroke={theme.colors.chart.blue} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                  {hasMetric(points, 'arr') && <Line type="monotone" dataKey="arr" name="arr" stroke={theme.colors.chart.purple} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          )}

          {hasOperatingData && (
            <ChartBox>
              <ChartBoxTitle>{translate('quarterlyCharts.sections.burnRunway')}</ChartBoxTitle>
              <ResponsiveContainer width="100%" height={compact ? 210 : 280}>
                <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="burn" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} tickFormatter={(value) => formatCompactCurrency(Number(value))} />
                  <YAxis yAxisId="runway" orientation="right" stroke={theme.colors.text.tertiary} tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}${translate('quarterlyCharts.axis.monthSuffix')}`} />
                  <Tooltip
                    formatter={(value, name) => [tooltipFormatter(name, value, monthLabel), METRIC_LABELS[String(name) as MetricKey] || String(name)]}
                    contentStyle={{
                      background: theme.colors.bg.dropdown,
                      border: `1px solid ${theme.colors.border.primary}`,
                      borderRadius: theme.radius.md,
                      color: theme.colors.text.primary,
                    }}
                    labelStyle={{ color: theme.colors.text.secondary }}
                  />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  {hasMetric(points, 'burn') && <Line yAxisId="burn" type="monotone" dataKey="burn" name="burn" stroke={theme.colors.chart.amber} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                  {hasMetric(points, 'runway') && <Line yAxisId="runway" type="monotone" dataKey="runway" name="runway" stroke={theme.colors.chart.cyan} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </ChartGrid>
      )}

      {points.length === 1 && (
        <SingleReportHint>
          {translate('quarterlyCharts.singleReportHint')}
        </SingleReportHint>
      )}
    </ChartShell>
  );
};
