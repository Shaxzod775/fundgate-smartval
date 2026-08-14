import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Target, Award, BarChart3, Mail, Calendar, Briefcase, Loader2, User, DollarSign, Globe, Building2 } from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { managerApi, startupsApi, Startup } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import DirectorDashboard from '../DirectorDashboard/DirectorDashboard';
import { DirectorEventLog } from '../DirectorDashboard/DirectorEventLog';
import { Badge } from '../../components/ui/Badge';
import { StartupLogo as StartupLogoUI } from '../../components/ui/StartupLogo';
import { formatDayMonth, formatMonthYear } from '../../utils/formatDate';
import { numberLocale } from '../../utils/formatNumber';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PageContainer = styled.div<{ $embedded?: boolean }>`
  padding: ${({ $embedded, theme }) => ($embedded ? '0' : theme.spacing[6])};
  max-width: ${({ $embedded }) => ($embedded ? 'none' : '1600px')};
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ $embedded, theme }) => ($embedded ? '0' : `${theme.spacing[4]} ${theme.spacing[3]}`)};
  }

  @media (max-width: 480px) {
    padding: ${({ $embedded, theme }) => ($embedded ? '0' : `${theme.spacing[3]} ${theme.spacing[2]}`)};
  }
`;

const ProfileSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const ProfileCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[8]};
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors.bg.card} 0%,
    ${({ theme }) => theme.colors.bg.tertiary} 100%
  );
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg,
      ${({ theme }) => theme.colors.accent.primary},
      ${({ theme }) => theme.colors.accent.primaryHover}
    );
  }

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[5]};
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ProfileImageContainer = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ProfileImage = styled.img`
  width: 120px;
  height: 120px;
  min-width: 120px;
  min-height: 120px;
  border-radius: 50%;
  border: 4px solid ${({ theme }) => theme.colors.accent.primary};
  box-shadow: 0 8px 32px -8px ${({ theme }) => theme.colors.accent.primary}60;
  object-fit: cover;
`;

const ProfileImagePlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid ${({ theme }) => theme.colors.accent.primary};
  box-shadow: 0 8px 32px -8px ${({ theme }) => theme.colors.accent.primary}60;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 48px;
    height: 48px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const RankBadge = styled.div<{ $rank: number }>`
  position: absolute;
  bottom: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ $rank }) =>
    $rank === 1 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
    $rank === 2 ? 'linear-gradient(135deg, #C0C0C0, #808080)' :
    $rank === 3 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' :
    'linear-gradient(135deg, #6b7280, #4b5563)'
  };
  color: white;
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  box-shadow: ${({ theme }) => theme.shadows.md};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
  line-height: 1.2;
`;

const ProfileRole = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ProfileDetails = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const ProfileDetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ProfileStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.spacing[3]};
    padding-top: ${({ theme }) => theme.spacing[4]};
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatItem = styled.div`
  text-align: center;

  @media (max-width: 768px) {
    text-align: center;
  }
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const SectionIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.accent.primary}, ${({ theme }) => theme.colors.accent.primaryHover});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary}40;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -8px ${({ theme }) => theme.colors.accent.primary}30;
  }
`;

const KPIHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const KPILabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`;

const KPIIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $color }) => $color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const KPIValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  line-height: 1;
`;

const KPISubtext = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const GoalCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const GoalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const GoalTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const GoalProgress = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const ProgressBarContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ProgressBarBg = styled.div`
  width: 100%;
  height: 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 99px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
  width: ${({ $progress }) => Math.min(100, $progress)}%;
  height: 100%;
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.accent.primary}, ${({ theme }) => theme.colors.accent.primaryHover});
  border-radius: 99px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${({ theme }) => theme.shadows.glow};
`;

const GoalDetails = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 768px) {
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const ChartCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FunnelCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const FunnelItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.card};
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const FunnelBar = styled.div<{ $width: number; $color: string }>`
  flex: 1;
  height: 36px;
  background: ${({ $color }) => $color}30;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px solid ${({ $color }) => $color};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ $width }) => $width}%;
    background: ${({ $color }) => $color};
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const FunnelLabel = styled.div`
  min-width: 120px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FunnelValue = styled.div`
  min-width: 50px;
  text-align: right;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MyStartupsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const MyStartupCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary}60;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
  }
`;

const StartupCardHeader = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const StartupCardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const StartupCardName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StartupCardIndustry = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

const StartupCardDesc = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const StartupCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const StartupCardMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const StartupCardBadges = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const StartupScore = styled.div<{ $score: number }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  color: ${({ $score }) => {
    if ($score >= 80) return '#10b981';
    if ($score >= 60) return '#f59e0b';
    return '#ef4444';
  }};

  &::before {
    content: '★ ';
    font-size: 11px;
    opacity: 0.8;
  }
`;

const statusVariantMap: Record<string, 'neutral' | 'info' | 'warning' | 'purple' | 'success' | 'danger'> = {
  new: 'info',
  in_review: 'warning',
  pipeline: 'purple',
  portfolio: 'success',
  rejected: 'danger',
};

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Spinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  color: ${({ theme }) => theme.colors.accent.primary};

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

interface ManagerPerformanceData {
  managerId: string;
  manager: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    position?: string;
    role?: string;
    createdAt?: Date;
  };
  totalStartups: number;
  portfolioStartups: number;
  pipelineStartups: number;
  reviewStartups: number;
  newStartups: number;
  rejectedStartups: number;
  totalPortfolioValue: number;
  averageAIScore: number;
  conversionRate: number;
  successRate: number;
  monthlyDealGoal: number;
  completedDeals: number;
  dealGoalProgress: number;
  portfolioValueGoal: number;
  portfolioValueProgress: number;
  targetAIScore: number;
  currentAIScore: number;
  last7DaysActivity: { date: Date; actions: number }[];
  teamRank: number;
  totalManagers: number;
  performanceScore: number;
}

interface MyProgressContentProps {
  embedded?: boolean;
  showProfileSummary?: boolean;
}

export const MyProgressContent = ({ embedded = false, showProfileSummary = true }: MyProgressContentProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { manager: authManager, isLoading: authLoading } = useAuth();
  const { can } = usePermissions();
  const isDirectorView = can('director:view');
  const [performance, setPerformance] = useState<ManagerPerformanceData | null>(null);
  const [myStartups, setMyStartups] = useState<Startup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (authLoading) return;

      const managerId = authManager?.id || 'mgr-1';

      try {
        setIsLoading(true);
        const response = await managerApi.getPerformance(managerId);

        if (response.success && response.data) {
          const data = response.data as any;

          const perf = data.performance || {};
          const deals = data.recentDeals || [];

          const portfolioDeals = deals.filter((d: any) => d.status === 'portfolio');
          const pipelineDeals = deals.filter((d: any) => d.status === 'pipeline');
          const reviewDeals = deals.filter((d: any) => d.status === 'in_review');
          const newDeals = deals.filter((d: any) => d.status === 'new');
          const rejectedDeals = deals.filter((d: any) => d.status === 'rejected');

          const totalPortfolioValue = portfolioDeals.reduce((sum: number, d: any) =>
            sum + (d.aiAnalysis?.valuation || 0), 0);

          const dealsWithScore = deals.filter((d: any) => d.aiAnalysis?.score);
          const averageAIScore = dealsWithScore.length > 0
            ? dealsWithScore.reduce((sum: number, d: any) => sum + d.aiAnalysis.score, 0) / dealsWithScore.length
            : 0;

          const totalStartups = data.totalStartups || perf.totalDeals || deals.length || 0;
          const portfolioStartups = data.portfolioStartups || perf.wonDeals || portfolioDeals.length || 0;
          const pipelineStartups = data.pipelineStartups || pipelineDeals.length || 0;
          const reviewStartups = data.reviewStartups || reviewDeals.length || 0;
          const newStartups = data.newStartups || newDeals.length || 0;
          const rejectedStartups = data.rejectedStartups || rejectedDeals.length || 0;
          const conversionRate = data.conversionRate || perf.conversionRate ||
            (totalStartups > 0 ? (portfolioStartups / totalStartups) * 100 : 0);

          const last7DaysActivity = data.last7DaysActivity || [];
          if (last7DaysActivity.length === 0) {
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              last7DaysActivity.push({
                date: date.toISOString(),
                actions: 0  // Real zero activity, not mock data
              });
            }
          }

          setPerformance({
            managerId: data.managerId || managerId,
            manager: {
              id: data.manager?.id || managerId,
              name: data.manager?.name || '',
              email: data.manager?.email || '',
              avatar: data.manager?.avatar,
              position: data.manager?.position,
              role: data.manager?.role || 'manager',
              createdAt: new Date(data.manager?.createdAt?._seconds ? data.manager.createdAt._seconds * 1000 : Date.now()),
            },
            totalStartups,
            portfolioStartups,
            pipelineStartups,
            reviewStartups,
            newStartups,
            rejectedStartups,
            totalPortfolioValue: data.totalPortfolioValue || totalPortfolioValue,
            averageAIScore: data.averageAIScore || averageAIScore,
            conversionRate: Math.round(conversionRate * 10) / 10,
            successRate: data.successRate || Math.round(conversionRate * 10) / 10,
            monthlyDealGoal: data.monthlyDealGoal || 5,
            completedDeals: data.completedDeals || portfolioStartups,
            dealGoalProgress: data.dealGoalProgress || Math.min(100, (portfolioStartups / 5) * 100),
            portfolioValueGoal: data.portfolioValueGoal || 10000000,
            portfolioValueProgress: data.portfolioValueProgress || Math.min(100, (totalPortfolioValue / 10000000) * 100),
            targetAIScore: data.targetAIScore || 80,
            currentAIScore: data.currentAIScore || averageAIScore,
            last7DaysActivity: last7DaysActivity.map((a: any) => ({
              date: new Date(a.date || a),
              actions: a.actions || 0,
            })),
            teamRank: data.teamRank || 1,
            totalManagers: data.totalManagers || 1,
            performanceScore: data.performanceScore || Math.round(averageAIScore),
          });
        } else {
          setError(response.error || '');
        }
      } catch (err) {
        console.error('Failed to fetch performance:', err);
        setError('');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMyStartups = async () => {
      if (authLoading || !authManager?.organizationId) return;
      try {
        const response = await startupsApi.getAll(authManager.organizationId);
        if (response.success && response.data) {
          const myOnly = response.data.filter((s: any) =>
            s.assignedManagerId === authManager.id && !s.isArchived
          );
          setMyStartups(myOnly);
        }
      } catch (err) {
        console.error('Failed to fetch startups:', err);
      }
    };

    fetchPerformance();
    fetchMyStartups();
  }, [authLoading, authManager?.id, authManager?.organizationId]);

  if (isDirectorView) {
    return (
      <>
        <DirectorDashboard />
        <PageContainer $embedded={embedded} style={{ paddingTop: 0 }}>
          <DirectorEventLog />
        </PageContainer>
      </>
    );
  }

  if (isLoading) {
    return (
      <PageContainer $embedded={embedded}>
        <LoadingContainer>
          <Spinner size={48} />
          <div style={{ color: 'var(--text-muted)' }}>{t('myProgress.loading')}</div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error || !performance) {
    return (
      <PageContainer $embedded={embedded}>
        <LoadingContainer>
          <div style={{ color: 'var(--text-muted)' }}>
            {error || t('myProgress.loadError')}
          </div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(numberLocale(i18n.language), {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const activityData = performance.last7DaysActivity.map((activity) => ({
    date: formatDayMonth(activity.date, i18n.language),
    actions: activity.actions,
  }));

  const maxStartups = Math.max(
    performance.newStartups,
    performance.reviewStartups,
    performance.pipelineStartups,
    performance.portfolioStartups
  );

  const memberSince = performance.manager.createdAt
    ? formatMonthYear(performance.manager.createdAt, i18n.language)
    : formatMonthYear(new Date(), i18n.language);

  return (
    <PageContainer $embedded={embedded}>
      {showProfileSummary && (
        <ProfileSection>
        <ProfileCard>
          <ProfileHeader>
            <ProfileImageContainer>
              <ProfileImagePlaceholder style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: 'white', background: '#10b981' }}>
                {(performance.manager.name || t('common.manager')).charAt(0).toUpperCase()}
              </ProfileImagePlaceholder>
              <RankBadge $rank={performance.teamRank}>
                <Award />
                #{performance.teamRank}
              </RankBadge>
            </ProfileImageContainer>

            <ProfileInfo>
              <ProfileName>{performance.manager.name || t('common.manager')}</ProfileName>
              <ProfileRole>
                {performance.manager.role === 'admin' ? t('myProgress.roles.admin') : t('myProgress.roles.manager')}
              </ProfileRole>

              <ProfileDetails>
                <ProfileDetailItem>
                  <Mail />
                  <span>{performance.manager.email}</span>
                </ProfileDetailItem>
                <ProfileDetailItem>
                  <Calendar />
                  <span>{memberSince}</span>
                </ProfileDetailItem>
                <ProfileDetailItem>
                  <Briefcase />
                  <span>{performance.totalStartups}</span>
                </ProfileDetailItem>
              </ProfileDetails>
            </ProfileInfo>
          </ProfileHeader>

          <ProfileStats>
            <StatItem>
              <StatValue>{performance.performanceScore.toFixed(0)}</StatValue>
              <StatLabel>{t('myProgress.performanceScore')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>#{performance.teamRank}</StatValue>
              <StatLabel>{t('myProgress.teamRank')} {t('myProgress.of')} {performance.totalManagers}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{performance.portfolioStartups}</StatValue>
              <StatLabel>{t('myProgress.portfolio')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{formatCurrency(performance.totalPortfolioValue)}</StatValue>
              <StatLabel>{t('myProgress.totalValue')}</StatLabel>
            </StatItem>
          </ProfileStats>
        </ProfileCard>
      </ProfileSection>
      )}

      {myStartups.length > 0 && (() => {
        const portfolioOnly = myStartups.filter((s: any) => s.status === 'portfolio');
        const inReviewCount = myStartups.filter((s: any) =>
          s.status === 'new' || s.status === 'in_review' || s.status === 'pipeline'
        ).length;
        const rejectedCount = myStartups.filter((s: any) => s.status === 'rejected').length;

        return (
        <>
          <SectionHeader>
            <SectionIcon>
              <Briefcase />
            </SectionIcon>
            <SectionTitle>{t('myProgress.myStartups')}</SectionTitle>
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981', fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                {t('myProgress.portfolio')}: {portfolioOnly.length}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#f59e0b', fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}>
                {t('myProgress.inReview')}: {inReviewCount}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444', fontSize: 12, fontWeight: 600,
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                {t('startups.status.rejected')}: {rejectedCount}
              </span>
            </div>
          </SectionHeader>
          <MyStartupsGrid>
            {portfolioOnly.map((startup: any) => {
              const brief = startup.brief || {};
              const logoUrl = startup.logo || startup.fileUrls?.logo;
              const score = startup.aiAnalysis?.score || startup.fundGateScores?.total;
              const statusLabel: Record<string, string> = {
                new: t('startups.status.new'),
                in_review: t('startups.status.in_review'),
                pipeline: t('startups.status.pipeline'),
                portfolio: t('startups.status.portfolio'),
                rejected: t('startups.status.rejected'),
              };

              return (
                <MyStartupCard key={startup.id} onClick={() => navigate(`/startups/${startup.id}`)}>
                  <StartupCardHeader>
                    <StartupLogoUI
                      src={logoUrl}
                      startupId={startup.id}
                      name={brief.companyName || brief.name || ''}
                      variant="md"
                    />
                    <StartupCardInfo>
                      <StartupCardName>{brief.companyName || brief.name || t('myProgress.unknownStartup')}</StartupCardName>
                      <StartupCardIndustry>{brief.industry || t('myProgress.unknownIndustry')}</StartupCardIndustry>
                    </StartupCardInfo>
                    {score && <StartupScore $score={score}>{score}</StartupScore>}
                  </StartupCardHeader>

                  {brief.description && (
                    <StartupCardDesc>{brief.description}</StartupCardDesc>
                  )}

                  <StartupCardBadges>
                    <Badge variant={statusVariantMap[startup.status] || 'neutral'}>
                      {statusLabel[startup.status] || startup.status}
                    </Badge>
                    {brief.stage && <Badge variant="neutral">{brief.stage}</Badge>}
                  </StartupCardBadges>

                  <StartupCardMeta>
                    {brief.fundingRequest > 0 && (
                      <StartupCardMetaItem>
                        <DollarSign />
                        {brief.fundingRequest >= 1000000
                          ? `${(brief.fundingRequest / 1000000).toFixed(1)}M`
                          : `${(brief.fundingRequest / 1000).toFixed(0)}k`}
                      </StartupCardMetaItem>
                    )}
                    {brief.country && (
                      <StartupCardMetaItem>
                        <Globe />
                        {brief.country}
                      </StartupCardMetaItem>
                    )}
                    <StartupCardMetaItem>
                      <Calendar />
                      {formatDayMonth(new Date(startup.createdAt?._seconds ? startup.createdAt._seconds * 1000 : startup.createdAt), i18n.language)}
                    </StartupCardMetaItem>
                  </StartupCardMeta>
                </MyStartupCard>
              );
            })}
          </MyStartupsGrid>
        </>
        );
      })()}

      <KPIGrid>
        <KPICard>
          <KPIHeader>
            <KPILabel>{t('myProgress.conversionRate')}</KPILabel>
            <KPIIcon $color="#10b981">
              <TrendingUp />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{performance.conversionRate.toFixed(1)}%</KPIValue>
          <KPISubtext>
            {performance.portfolioStartups} / {performance.totalStartups}
          </KPISubtext>
        </KPICard>

        <KPICard>
          <KPIHeader>
            <KPILabel>{t('myProgress.totalValue')}</KPILabel>
            <KPIIcon $color="#3b82f6">
              <BarChart3 />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{formatCurrency(performance.totalPortfolioValue)}</KPIValue>
          <KPISubtext>{performance.portfolioStartups} {t('myProgress.portfolio')}</KPISubtext>
        </KPICard>

        <KPICard>
          <KPIHeader>
            <KPILabel>{t('myProgress.avgScore')}</KPILabel>
            <KPIIcon $color="#f59e0b">
              <Award />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{performance.averageAIScore.toFixed(0)}</KPIValue>
          <KPISubtext>{t('myProgress.aiScoreGoal')}: {performance.targetAIScore}</KPISubtext>
        </KPICard>

        <KPICard>
          <KPIHeader>
            <KPILabel>{t('myProgress.performanceScore')}</KPILabel>
            <KPIIcon $color="#8b5cf6">
              <Target />
            </KPIIcon>
          </KPIHeader>
          <KPIValue>{performance.performanceScore.toFixed(0)}</KPIValue>
          <KPISubtext>-</KPISubtext>
        </KPICard>
      </KPIGrid>

      <SectionHeader>
        <SectionIcon>
          <Target />
        </SectionIcon>
        <SectionTitle>{t('myProgress.goals')}</SectionTitle>
      </SectionHeader>

      <GoalsGrid>
        <GoalCard>
          <GoalHeader>
            <GoalTitle>{t('myProgress.dealsGoal')}</GoalTitle>
            <GoalProgress>{performance.dealGoalProgress.toFixed(0)}%</GoalProgress>
          </GoalHeader>
          <ProgressBarContainer>
            <ProgressBarBg>
              <ProgressBarFill $progress={performance.dealGoalProgress} />
            </ProgressBarBg>
          </ProgressBarContainer>
          <GoalDetails>
            <span>{performance.completedDeals} / {performance.monthlyDealGoal} {t('common.deals')}</span>
            <span>{performance.monthlyDealGoal - performance.completedDeals}</span>
          </GoalDetails>
        </GoalCard>

        <GoalCard>
          <GoalHeader>
            <GoalTitle>{t('myProgress.portfolioGoal')}</GoalTitle>
            <GoalProgress>{performance.portfolioValueProgress.toFixed(0)}%</GoalProgress>
          </GoalHeader>
          <ProgressBarContainer>
            <ProgressBarBg>
              <ProgressBarFill $progress={performance.portfolioValueProgress} />
            </ProgressBarBg>
          </ProgressBarContainer>
          <GoalDetails>
            <span>{formatCurrency(performance.totalPortfolioValue)}</span>
            <span>{formatCurrency(performance.portfolioValueGoal)}</span>
          </GoalDetails>
        </GoalCard>
      </GoalsGrid>

      <ChartsGrid>
        <ChartCard>
          <ChartTitle>{t('myProgress.weeklyActivity')}</ChartTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis
                dataKey="date"
                stroke="#666"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#666" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Area
                type="monotone"
                dataKey="actions"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#activityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <FunnelCard>
          <ChartTitle>{t('myProgress.pipeline')}</ChartTitle>
          <FunnelItem>
            <FunnelLabel>{t('myProgress.newApplications')}</FunnelLabel>
            <FunnelBar
              $width={(performance.newStartups / maxStartups) * 100}
              $color="#6b7280"
            />
            <FunnelValue>{performance.newStartups}</FunnelValue>
          </FunnelItem>
          <FunnelItem>
            <FunnelLabel>{t('myProgress.inReview')}</FunnelLabel>
            <FunnelBar
              $width={(performance.reviewStartups / maxStartups) * 100}
              $color="#f59e0b"
            />
            <FunnelValue>{performance.reviewStartups}</FunnelValue>
          </FunnelItem>
          <FunnelItem>
            <FunnelLabel>{t('myProgress.pipeline')}</FunnelLabel>
            <FunnelBar
              $width={(performance.pipelineStartups / maxStartups) * 100}
              $color="#3b82f6"
            />
            <FunnelValue>{performance.pipelineStartups}</FunnelValue>
          </FunnelItem>
          <FunnelItem>
            <FunnelLabel>{t('myProgress.portfolio')}</FunnelLabel>
            <FunnelBar
              $width={(performance.portfolioStartups / maxStartups) * 100}
              $color="#10b981"
            />
            <FunnelValue>{performance.portfolioStartups}</FunnelValue>
          </FunnelItem>
        </FunnelCard>
      </ChartsGrid>
    </PageContainer>
  );
};

export const MyProgressPage = () => <MyProgressContent />;
