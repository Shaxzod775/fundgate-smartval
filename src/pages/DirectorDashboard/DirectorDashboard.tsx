import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users, Briefcase, Activity, Target, Loader2, Phone, FileText, CalendarCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { directorApi, type DirectorKpis } from '../../services/api';
import { CrmImage } from '../../components/ui/CrmImage';

const PageContainer = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  container-type: inline-size;
  padding-top: ${({ theme }) => theme.spacing[6]};
  padding-bottom: ${({ theme }) => theme.spacing[10]};
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const TitleGroup = styled.div`
  min-width: 0;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
`;

const PeriodToggle = styled.div`
  display: inline-flex;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 2px;
`;

const PeriodButton = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  transition: all ${({ theme }) => theme.transitions.base};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'transparent')};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text.secondary)};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @container (max-width: 800px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
  @container (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;
`;

const StatIcon = styled.div<{ $tone: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `${$tone}1a`};
`;

const StatBody = styled.div`
  min-width: 0;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.1;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 2px;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: minmax(0, 1fr);
  }
  @container (max-width: 800px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ChartCard = styled(Card)`
  min-width: 0;
`;

const ChartTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
`;

const ChartHint = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const ManagerLegend = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px ${({ theme }) => theme.spacing[4]};
  max-height: 104px;
  overflow-y: auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 380px;
  min-width: 0;
`;

const LegendItem = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LegendIdx = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  margin-right: 6px;
`;

const TableCard = styled(Card)`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Th = styled.th<{ $center?: boolean }>`
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  white-space: nowrap;
`;

const ManagerCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: ${({ $bg }) => $bg};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ManagerMeta = styled.div`
  min-width: 0;
`;

const ManagerName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ManagerRole = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ConversionPill = styled.span<{ $tone: 'up' | 'mid' | 'down' }>`
  display: inline-block;
  min-width: 48px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $tone }) =>
    $tone === 'up' ? theme.colors.status.success : $tone === 'down' ? theme.colors.status.danger : theme.colors.status.warning};
  background: ${({ theme, $tone }) =>
    $tone === 'up' ? theme.colors.status.successBg : $tone === 'down' ? theme.colors.status.dangerBg : theme.colors.status.warningBg};
`;

const CenterState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;

  svg {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.muted};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PERIODS: Array<{ value: 7 | 30 | 90; labelKey: string }> = [
  { value: 7, labelKey: 'directorDashboard.periods.7' },
  { value: 30, labelKey: 'directorDashboard.periods.30' },
  { value: 90, labelKey: 'directorDashboard.periods.90' },
];

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899'];
const avatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const shortName = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length > 1 && parts[1]) return `${parts[0]} ${parts[1][0]}.`;
  return name || '—';
};

const conversionTone = (rate: number): 'up' | 'mid' | 'down' => {
  if (rate >= 40) return 'up';
  if (rate >= 15) return 'mid';
  return 'down';
};

export default function DirectorDashboard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { manager } = useAuth();
  const { can } = usePermissions();
  const organizationId = manager?.organizationId || '';

  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<DirectorKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const canView = can('director:view');

  useEffect(() => {
    if (!organizationId || !canView) {
      setLoading(false); // otherwise an org-less leadership account spins forever
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    const to = new Date();
    const from = new Date(to.getTime() - period * 24 * 60 * 60 * 1000);
    directorApi
      .getKpis(organizationId, { from: from.toISOString(), to: to.toISOString() })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else setError(true);
      })
      .catch(() => {
        if (active) setError(true); // network/JSON failure — don't mask as "no data"
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, period, canView]);

  const tooltipStyle = useMemo(
    () => ({
      background: theme.colors.bg.dropdown,
      border: `1px solid ${theme.colors.border.primary}`,
      borderRadius: theme.radius.md,
      color: theme.colors.text.primary,
    }),
    [theme],
  );

  const managerChartData = useMemo(
    () =>
      (data?.managers || []).map((m) => ({
        name: shortName(m.manager.name),
        new: m.workload.new,
        in_review: m.workload.in_review,
        pipeline: m.workload.pipeline,
        portfolio: m.workload.portfolio,
        contacted: m.interactions.contacted,
        meeting: m.interactions.meeting,
        documents: m.interactions.documents,
        conversion: m.conversion.rate,
      })),
    [data],
  );

  if (!canView) return <Navigate to="/" replace />;

  const axisProps = {
    stroke: theme.colors.text.tertiary,
    tick: { fontSize: 11 },
  };

  return (
    <PageContainer>
      <PageHeader>
        <TitleGroup>
          <PageTitle>{t('directorDashboard.title')}</PageTitle>
          <PageSubtitle>
            {t('directorDashboard.subtitle')}
          </PageSubtitle>
        </TitleGroup>
        <PeriodToggle>
          {PERIODS.map((p) => (
            <PeriodButton key={p.value} $active={period === p.value} onClick={() => setPeriod(p.value)}>
              {t(p.labelKey)}
            </PeriodButton>
          ))}
        </PeriodToggle>
      </PageHeader>

      {loading ? (
        <CenterState>
          <Loader2 size={28} />
          <span>{t('directorDashboard.loading')}</span>
        </CenterState>
      ) : error ? (
        <EmptyState>{t('directorDashboard.error')}</EmptyState>
      ) : !data || data.managers.length === 0 ? (
        <EmptyState>
          {t('directorDashboard.empty')}
        </EmptyState>
      ) : (
        <>
          <StatsGrid>
            <StatCard>
              <StatIcon $tone={theme.colors.chart.blue}>
                <Users size={22} />
              </StatIcon>
              <StatBody>
                <StatValue>{data.totals.managers}</StatValue>
                <StatLabel>{t('directorDashboard.stats.managers')}</StatLabel>
              </StatBody>
            </StatCard>
            <StatCard>
              <StatIcon $tone={theme.colors.chart.purple}>
                <Briefcase size={22} />
              </StatIcon>
              <StatBody>
                <StatValue>{data.totals.activeStartups}</StatValue>
                <StatLabel>{t('directorDashboard.stats.activeStartups')}</StatLabel>
              </StatBody>
            </StatCard>
            <StatCard>
              <StatIcon $tone={theme.colors.chart.green}>
                <Activity size={22} />
              </StatIcon>
              <StatBody>
                <StatValue>{data.totals.interactions}</StatValue>
                <StatLabel>{t('directorDashboard.stats.interactions')}</StatLabel>
              </StatBody>
            </StatCard>
            <StatCard>
              <StatIcon $tone={theme.colors.chart.amber}>
                <Target size={22} />
              </StatIcon>
              <StatBody>
                <StatValue>{data.totals.avgConversion}%</StatValue>
                <StatLabel>{t('directorDashboard.stats.avgConversion')}</StatLabel>
              </StatBody>
            </StatCard>
          </StatsGrid>

          <ChartsGrid>
            <ChartCard>
              <CardHeaderRow>
                <div>
                  <ChartTitle>{t('directorDashboard.charts.workload.title')}</ChartTitle>
                  <ChartHint>{t('directorDashboard.charts.workload.hint')}</ChartHint>
                </div>
                {(data?.managers?.length || 0) > 0 && (
                  <ManagerLegend>
                    {data!.managers.map((m, i) => (
                      <LegendItem key={m.manager.id || i} title={m.manager.name}>
                        <LegendIdx>{i + 1}.</LegendIdx>
                        {m.manager.name}
                      </LegendItem>
                    ))}
                  </ManagerLegend>
                )}
              </CardHeaderRow>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={managerChartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="name" {...axisProps} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.bg.tertiary }} />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  <Bar dataKey="new" stackId="w" name={t('directorDashboard.status.new')} fill={theme.colors.chart.blue} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in_review" stackId="w" name={t('directorDashboard.status.inReview')} fill={theme.colors.chart.amber} />
                  <Bar dataKey="pipeline" stackId="w" name={t('directorDashboard.status.pipeline')} fill={theme.colors.chart.purple} />
                  <Bar dataKey="portfolio" stackId="w" name={t('directorDashboard.status.portfolio')} fill={theme.colors.chart.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('directorDashboard.charts.actions.title')}</ChartTitle>
              <ChartHint>{t('directorDashboard.charts.actions.hint')}</ChartHint>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={managerChartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="name" {...axisProps} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.bg.tertiary }} />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  <Bar dataKey="contacted" name={t('directorDashboard.metrics.contacts')} fill={theme.colors.chart.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meeting" name={t('directorDashboard.metrics.meetings')} fill={theme.colors.chart.purple} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="documents" name={t('directorDashboard.metrics.documents')} fill={theme.colors.chart.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('directorDashboard.charts.timeline.title')}</ChartTitle>
              <ChartHint>{t('directorDashboard.charts.timeline.hint')}</ChartHint>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.timeline} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.bg.tertiary }} />
                  <Legend wrapperStyle={{ color: theme.colors.text.secondary, fontSize: 11 }} />
                  <Bar dataKey="contacted" stackId="t" name={t('directorDashboard.metrics.contacts')} fill={theme.colors.chart.blue} />
                  <Bar dataKey="meeting" stackId="t" name={t('directorDashboard.metrics.meetings')} fill={theme.colors.chart.purple} />
                  <Bar dataKey="documents" stackId="t" name={t('directorDashboard.metrics.documents')} fill={theme.colors.chart.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>{t('directorDashboard.charts.conversion.title')}</ChartTitle>
              <ChartHint>{t('directorDashboard.charts.conversion.hint')}</ChartHint>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={managerChartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border.subtle} />
                  <XAxis dataKey="name" {...axisProps} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} unit="%" {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.colors.bg.tertiary }} formatter={(v) => [`${v}%`, t('directorDashboard.metrics.conversion')]} />
                  <Bar dataKey="conversion" name={t('directorDashboard.metrics.conversion')} fill={theme.colors.chart.cyan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartsGrid>

          <TableCard>
            <ChartTitle>{t('directorDashboard.table.title')}</ChartTitle>
            <ChartHint>{t('directorDashboard.table.hint')}</ChartHint>
            <Table>
              <thead>
                <tr>
                  <Th>{t('directorDashboard.table.manager')}</Th>
                  <Th $center>{t('directorDashboard.table.active')}</Th>
                  <Th $center>{t('directorDashboard.metrics.contacts')}</Th>
                  <Th $center>{t('directorDashboard.metrics.meetings')}</Th>
                  <Th $center>{t('directorDashboard.metrics.documents')}</Th>
                  <Th $center>{t('directorDashboard.metrics.conversion')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.managers.map((m) => (
                  <tr key={m.manager.id}>
                    <Td>
                      <ManagerCell>
                        <Avatar $bg={avatarColor(m.manager.id)}>
                          {m.manager.avatar ? (
                            <CrmImage src={m.manager.avatar} alt={m.manager.name} />
                          ) : (
                            (m.manager.name || '?').charAt(0).toUpperCase()
                          )}
                        </Avatar>
                        <ManagerMeta>
                          <ManagerName>{m.manager.name}</ManagerName>
                          <ManagerRole>{t(`roles.${m.manager.role}`, { defaultValue: m.manager.role })}</ManagerRole>
                        </ManagerMeta>
                      </ManagerCell>
                    </Td>
                    <Td $center>{m.workload.active}</Td>
                    <Td $center>{m.interactions.contacted}</Td>
                    <Td $center>{m.interactions.meeting}</Td>
                    <Td $center>{m.interactions.documents}</Td>
                    <Td $center>
                      <ConversionPill $tone={conversionTone(m.conversion.rate)}>{m.conversion.rate}%</ConversionPill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        </>
      )}
    </PageContainer>
  );
}
