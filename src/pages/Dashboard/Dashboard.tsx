import { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle, CardSubtitle } from '../../components/ui/Card';
import { CrmImage } from '../../components/ui/CrmImage';
import { dashboardApi, startupsApi, chartsApi, DashboardStats, DashboardCharts, Startup, RecentActivity } from '../../services/api';
import { PageTransition } from '../../styles/animations';
import { DashboardSkeleton } from './DashboardSkeleton';
import { ManagerDealsModal, type HonorBoardManager } from './ManagerDealsModal';
import DirectorDashboard from '../DirectorDashboard/DirectorDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Briefcase,
  DollarSign,
  Target,
  CheckCircle2,
  Zap,
  Clock,
} from 'lucide-react';

const PageContainer = styled.div`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[6]};
  ${PageTransition}
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
    max-width: 100vw;
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[2]};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const StatCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[3]};
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(16, 185, 129, 0.1);

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 10px 30px -10px rgba(16, 185, 129, 0.15);
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[2]};
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  @media (max-width: 480px) {
    margin-bottom: ${({ theme }) => theme.spacing[1]};
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color};

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 480px) {
    width: 28px;
    height: 28px;

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const StatTrend = styled.div<{ $up: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ $up }) => $up ? '#10b981' : '#ef4444'};
  background: ${({ $up }) => $up ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  padding: 2px 6px;
  border-radius: 6px;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};

  @media (max-width: 480px) {
    font-size: ${({ theme }) => theme.fontSizes.lg};
    margin-bottom: 2px;
  }
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};

  @media (max-width: 480px) {
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ActivityItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }
`;

const ActivityAvatar = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: white;
  flex-shrink: 0;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    border-radius: ${({ theme }) => theme.radius.full};
    object-fit: cover;
  }
`;

const ActivityBadge = styled.div<{ $type: string }>`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $type }) => {
    switch ($type) {
      case 'deal':
        return '#10b981';
      case 'started':
        return '#3b82f6';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  }};
  border: 2px solid #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 8px;
    height: 8px;
    color: white;
  }
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;

  strong {
    font-weight: 600;
  }
`;

const ActivityMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const PerformerItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background 0.2s;

  &:hover,
  &:focus-visible {
    background: ${({ theme }) => theme.colors.bg.secondary};
    outline: none;
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }
`;

const PerformerRank = styled.div<{ $rank: number }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $rank }) => {
    if ($rank === 1) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Gold -> Green Gold
    if ($rank === 2) return 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'; // Silver -> Light Green
    if ($rank === 3) return 'linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)'; // Bronze -> Pale Green
    return '#374151';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: white;
  flex-shrink: 0;
`;

const PerformerAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.full};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PerformerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PerformerName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PerformerStats = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const PerformerScore = styled.div`
  text-align: right;
`;

const PerformerScoreValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: #10b981;
`;

const PerformerScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartPeriodToggle = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 3px;
  width: fit-content;
`;

const PeriodButton = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $active }) => ($active ? 'rgba(16, 185, 129, 0.2)' : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#10b981' : theme.colors.text.secondary)};

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)')};
  }
`;

const ChartCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ChartHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const ChartSubtitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const dash = keyframes`
  to {
    stroke-dashoffset: 0;
  }
`;

const NeonLineChart = styled.div`
  height: 120px;
  position: relative;
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const NeonSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;

  .neon-line {
    filter: drop-shadow(0 0 4px #10b981) drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: ${dash} 2.5s ease-out forwards;
    vector-effect: non-scaling-stroke; /* Ensures stroke thickness remains constant */
  }

  .neon-glow {
    filter: blur(10px);
    opacity: 0.25;
  }
`;

const MonthLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[1]};
`;

const MonthLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`;

const ChartContainer = styled.div`
  position: relative;
`;

const YAxisLabels = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  pointer-events: none;
  z-index: 1;
`;

const YAxisLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
  min-width: 32px;
  text-align: right;
  padding-right: 4px;
`;

const ChartTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: rgba(16, 185, 129, 0.9);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s;
  white-space: nowrap;
  z-index: 10;
`;

const Dashboard = () => {
  const { t } = useTranslation();
  const { manager } = useAuth();
  const { can } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [managerActivity, setManagerActivity] = useState<any[]>([]);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [appTooltip, setAppTooltip] = useState<{ x: number; y: number; value: string; visible: boolean }>({ x: 0, y: 0, value: '', visible: false });
  const [dealsTooltip, setDealsTooltip] = useState<{ x: number; y: number; value: string; visible: boolean }>({ x: 0, y: 0, value: '', visible: false });
  const appChartRef = useRef<HTMLDivElement>(null);
  const dealsChartRef = useRef<HTMLDivElement>(null);
  const [selectedManager, setSelectedManager] = useState<HonorBoardManager | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const organizationId = manager?.organizationId || '';

        if (!organizationId) {
          console.warn('No organizationId found');
          setIsLoading(false);
          return;
        }

        const [statsResponse, startupsResponse, activityResponse, chartsResponse, recentActivitiesResponse] = await Promise.all([
          dashboardApi.getStats(organizationId),
          startupsApi.getAll(organizationId),
          dashboardApi.getManagerActivity(organizationId),
          chartsApi.getDashboardCharts(organizationId, chartPeriod),
          dashboardApi.getRecentActivities(organizationId, 10),
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }

        if (startupsResponse.success && startupsResponse.data) {
          setStartups(startupsResponse.data);
        }

        if (activityResponse.success && activityResponse.data) {
          setManagerActivity(activityResponse.data);
        }

        if (chartsResponse.success && chartsResponse.data) {
          setCharts(chartsResponse.data);
        }

        if (recentActivitiesResponse.success && recentActivitiesResponse.data) {
          setRecentActivities(recentActivitiesResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [manager?.organizationId, chartPeriod]);

  const displayStats = stats;

  const activeProjects = displayStats ? displayStats.inReview + displayStats.pipeline : 0;
  const totalValuation = displayStats?.totalValuation ?? 0;
  const trends = displayStats?.trends ?? { total: 0, inWork: 0, valuation: 0, score: 0 };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${t('dashboard.time.minAgo')}`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? t('dashboard.time.hourAgo') : (diffHours < 5 ? t('dashboard.time.hoursAgo') : t('dashboard.time.hoursAgo2'))}`;
    } else {
      return `${diffDays} ${diffDays === 1 ? t('dashboard.time.dayAgo') : (diffDays < 5 ? t('dashboard.time.daysAgo') : t('dashboard.time.daysAgo2'))}`;
    }
  };

  const getActionType = (action: string): string => {
    if (action === 'status_change') {
      return 'started';
    } else if (action === 'comment') {
      return 'review';
    } else if (action === 'created') {
      return 'started';
    } else if (action === 'updated') {
      return 'review';
    }
    return 'started';
  };

  const getActionText = (action: string, details?: string): string => {
    if (action === 'status_change') {
      return t('dashboard.actions.movedTo');
    } else if (action === 'comment') {
      return t('dashboard.actions.commented');
    } else if (action === 'created') {
      return t('dashboard.actions.created');
    } else if (action === 'updated') {
      return t('dashboard.actions.updated');
    }
    return action;
  };

  const activities = recentActivities.map((activity) => {
    const createdAt = activity.createdAt && typeof activity.createdAt === 'object' && '_seconds' in activity.createdAt
      ? new Date((activity.createdAt as any)._seconds * 1000)
      : new Date(activity.createdAt as any);

    return {
      id: activity.id,
      manager: {
        name: activity.managerName || t('common.manager'),
        avatar: '',
      },
      type: getActionType(activity.action),
      action: getActionText(activity.action, activity.details),
      project: activity.startupName,
      details: activity.details,
      time: formatTimeAgo(createdAt),
    };
  });

  const topPerformers = managerActivity
    .filter((activity: any) => activity.stats?.total > 0)
    .sort((a: any, b: any) => (b.stats?.portfolio || 0) - (a.stats?.portfolio || 0))
    .slice(0, 3)
    .map((activity: any, index) => ({
      id: activity.manager?.id || `mgr-${index}`,
      name: activity.manager?.name || t('common.manager'),
      avatar: activity.manager?.avatar || '',
      deals: activity.stats?.portfolio || 0,
      projects: activity.stats?.total || 0,
      volume: activity.stats?.volume || 0,
    }));

  const applicationsData = charts?.applicationsFlow || [];

  const dealsData = charts?.closedDeals?.map(d => ({ label: d.month, amount: d.value })) || [];

  const generatePath = (data: number[]) => {
    if (!data || data.length < 2) return '';

    const width = 100;
    const height = 100;
    const maxValue = Math.max(...data) * 1.1 || 1; // Prevent division by zero

    const points = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((val || 0) / maxValue) * height * 0.8 - 5,
    }));

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      const cp1x = current.x + (next.x - current.x) * 0.5;
      const cp1y = current.y;
      const cp2x = next.x - (next.x - current.x) * 0.5;
      const cp2y = next.y;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }

    return path;
  };

  const appPath = generatePath(applicationsData.map(d => d.value));
  const dealsPath = generatePath(dealsData.map(d => d.amount));

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deal': return <CheckCircle2 />;
      case 'started': return <Zap />;
      case 'rejected': return <Clock />;
      default: return <Briefcase />;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#064e3b', '#047857'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getYAxisValues = (data: number[]) => {
    if (!data.length) return [0, 0, 0];
    const max = Math.max(...data);
    if (max === 0) return [0, 0, 0];
    return [max, Math.round(max / 2), 0];
  };

  const handleChartHover = (
    e: React.MouseEvent<HTMLDivElement>,
    data: { label: string; value: number }[],
    setTooltip: typeof setAppTooltip,
    formatValue?: (v: number) => string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = x / rect.width;
    const index = Math.round(relX * (data.length - 1));
    if (index >= 0 && index < data.length) {
      const item = data[index];
      const val = formatValue ? formatValue(item.value) : String(item.value);
      setTooltip({ x, y: 10, value: `${item.label}: ${val}`, visible: true });
    }
  };

  const appYAxis = getYAxisValues(applicationsData.map(d => d.value));
  const dealsYAxis = getYAxisValues(dealsData.map(d => d.amount));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
    <PageContainer>
      <StatsGrid>
        <StatCard>
          <StatHeader>
            <StatIcon $color="rgba(16, 185, 129, 0.1)">
              <Briefcase style={{ color: '#10b981' }} />
            </StatIcon>
            <StatTrend $up={trends.total >= 0}>{trends.total >= 0 ? '+' : ''}{trends.total}%</StatTrend>
          </StatHeader>
          <StatValue>{displayStats?.totalStartups ?? '-'}</StatValue>
          <StatLabel>{t('dashboard.totalStartups')}</StatLabel>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $color="rgba(16, 185, 129, 0.1)">
              <Zap style={{ color: '#10b981' }} />
            </StatIcon>
            <StatTrend $up={trends.inWork >= 0}>{trends.inWork >= 0 ? '+' : ''}{trends.inWork}%</StatTrend>
          </StatHeader>
          <StatValue>{activeProjects}</StatValue>
          <StatLabel>{t('dashboard.inWork')}</StatLabel>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $color="rgba(16, 185, 129, 0.1)">
              <DollarSign style={{ color: '#10b981' }} />
            </StatIcon>
            <StatTrend $up={trends.valuation >= 0}>{trends.valuation >= 0 ? '+' : ''}{trends.valuation}%</StatTrend>
          </StatHeader>
          <StatValue>${(totalValuation / 1000000).toFixed(1)}M</StatValue>
          <StatLabel>{t('dashboard.totalValuation')}</StatLabel>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $color="rgba(16, 185, 129, 0.1)">
              <Target style={{ color: '#10b981' }} />
            </StatIcon>
            <StatTrend $up={trends.score >= 0}>{trends.score >= 0 ? '+' : ''}{trends.score}%</StatTrend>
          </StatHeader>
          <StatValue>{displayStats?.averageScore ?? '-'}</StatValue>
          <StatLabel>{t('dashboard.avgAiScore')}</StatLabel>
        </StatCard>
      </StatsGrid>

      <ChartPeriodToggle>
        <PeriodButton $active={chartPeriod === 'day'} onClick={() => setChartPeriod('day')}>
          {t('dashboard.periodDay')}
        </PeriodButton>
        <PeriodButton $active={chartPeriod === 'week'} onClick={() => setChartPeriod('week')}>
          {t('dashboard.periodWeek')}
        </PeriodButton>
        <PeriodButton $active={chartPeriod === 'month'} onClick={() => setChartPeriod('month')}>
          {t('dashboard.periodMonth')}
        </PeriodButton>
      </ChartPeriodToggle>

      <ChartsGrid>
        <ChartCard>
          <ChartHeader>
            <ChartTitle>{t('dashboard.applicationsFlow')}</ChartTitle>
            <ChartSubtitle>{t('dashboard.newStartupsCount')}</ChartSubtitle>
          </ChartHeader>
          <ChartContainer
            ref={appChartRef}
            onMouseMove={(e) =>
              handleChartHover(
                e,
                applicationsData.map(d => ({ label: d.month, value: d.value })),
                setAppTooltip
              )
            }
            onMouseLeave={() => setAppTooltip(prev => ({ ...prev, visible: false }))}
          >
            <YAxisLabels>
              {appYAxis.map((v, i) => (
                <YAxisLabel key={i}>{v}</YAxisLabel>
              ))}
            </YAxisLabels>
            <ChartTooltip $x={appTooltip.x} $y={appTooltip.y} $visible={appTooltip.visible}>
              {appTooltip.value}
            </ChartTooltip>
            <NeonLineChart style={{ marginLeft: 36 }}>
              <NeonSvg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="greenGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {appPath && (
                  <path
                    d={`${appPath} L 100,100 L 0,100 Z`}
                    fill="url(#greenGradient)"
                  />
                )}

                {appPath && (
                  <path
                    d={appPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="neon-line"
                  />
                )}
              </NeonSvg>
            </NeonLineChart>
          </ChartContainer>
          <MonthLabels style={{ marginLeft: 36 }}>
            {applicationsData.map((d, i) => (
              <MonthLabel key={i}>{d.month}</MonthLabel>
            ))}
          </MonthLabels>
        </ChartCard>

        <ChartCard>
          <ChartHeader>
            <ChartTitle>{t('dashboard.closedDeals')}</ChartTitle>
            <ChartSubtitle>{t('dashboard.investmentVolume')}</ChartSubtitle>
          </ChartHeader>
          <ChartContainer
            ref={dealsChartRef}
            onMouseMove={(e) =>
              handleChartHover(
                e,
                dealsData.map(d => ({ label: d.label, value: d.amount })),
                setDealsTooltip,
                (v) => `$${(v / 1000000).toFixed(1)}M`
              )
            }
            onMouseLeave={() => setDealsTooltip(prev => ({ ...prev, visible: false }))}
          >
            <YAxisLabels>
              {dealsYAxis.map((v, i) => (
                <YAxisLabel key={i}>{v > 0 ? `$${(v / 1000000).toFixed(1)}M` : '0'}</YAxisLabel>
              ))}
            </YAxisLabels>
            <ChartTooltip $x={dealsTooltip.x} $y={dealsTooltip.y} $visible={dealsTooltip.visible}>
              {dealsTooltip.value}
            </ChartTooltip>
            <NeonLineChart style={{ marginLeft: 52 }}>
              <NeonSvg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="greenGradient2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {dealsPath && (
                  <path
                    d={`${dealsPath} L 100,100 L 0,100 Z`}
                    fill="url(#greenGradient2)"
                  />
                )}

                {dealsPath && (
                  <path
                    d={dealsPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="neon-line"
                  />
                )}
              </NeonSvg>
            </NeonLineChart>
          </ChartContainer>
          <MonthLabels style={{ marginLeft: 52 }}>
            {dealsData.map((d, i) => (
              <MonthLabel key={i}>{d.label}</MonthLabel>
            ))}
          </MonthLabels>
        </ChartCard>
      </ChartsGrid>

      <ContentGrid>
        <Card>
          <CardTitle>{t('dashboard.recentActions')}</CardTitle>
          <CardSubtitle>{t('dashboard.teamActivity')}</CardSubtitle>
          <div style={{ marginTop: '16px' }}>
            {activities.map((activity) => (
              <ActivityItem key={activity.id}>
                <ActivityAvatar $color={getAvatarColor(activity.manager.name)}>
                  {activity.manager.avatar ? (
                    <CrmImage src={activity.manager.avatar} alt={activity.manager.name} />
                  ) : (
                    activity.manager.name[0]
                  )}
                  <ActivityBadge $type={activity.type}>
                    {getActivityIcon(activity.type)}
                  </ActivityBadge>
                </ActivityAvatar>
                <ActivityContent>
                  <ActivityText>
                    <strong>{activity.manager.name}</strong> {activity.action} <strong>{String(activity.project || '')}</strong>
                    {activity.details && <span style={{ color: '#6b7280' }}> ({activity.details})</span>}
                  </ActivityText>
                  <ActivityMeta>
                    <Clock />
                    {activity.time}
                  </ActivityMeta>
                </ActivityContent>
              </ActivityItem>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{t('dashboard.leaderboard')}</CardTitle>
          <CardSubtitle>{t('dashboard.topManagers')}</CardSubtitle>
          <div style={{ marginTop: '16px' }}>
            {topPerformers.map((performer, index) => (
              <PerformerItem
                key={performer.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedManager(performer)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedManager(performer);
                  }
                }}
              >
                <PerformerRank $rank={index + 1}>{index + 1}</PerformerRank>
                <PerformerAvatar>
                  {performer.avatar ? (
                    <CrmImage src={performer.avatar} alt={performer.name} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getAvatarColor(performer.name),
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'white',
                      }}
                    >
                      {performer.name[0]}
                    </div>
                  )}
                </PerformerAvatar>
                <PerformerInfo>
                  <PerformerName>{performer.name}</PerformerName>
                  <PerformerStats>
                    {performer.deals} {t('common.deals')} • {performer.projects} {t('common.projects')}
                  </PerformerStats>
                </PerformerInfo>
                <PerformerScore>
                  <PerformerScoreValue>
                    {performer.volume >= 1000000
                      ? `$${(performer.volume / 1000000).toFixed(1)}M`
                      : performer.volume >= 1000
                        ? `$${(performer.volume / 1000).toFixed(0)}K`
                        : `$${performer.volume}`}
                  </PerformerScoreValue>
                  <PerformerScoreLabel>{t('common.volume')}</PerformerScoreLabel>
                </PerformerScore>
              </PerformerItem>
            ))}
          </div>
        </Card>
      </ContentGrid>

      {can('director:view') && <DirectorDashboard />}

      <ManagerDealsModal
        manager={selectedManager}
        isOpen={!!selectedManager}
        onClose={() => setSelectedManager(null)}
      />
    </PageContainer>
    </>
  );
};

export default Dashboard;
