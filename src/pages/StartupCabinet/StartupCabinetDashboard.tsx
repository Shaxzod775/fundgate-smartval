import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  TrendingUp,
  Calendar,
  Edit3,
  RefreshCw,
  Building2,
  Users,
  Target,
  Briefcase,
  Clock,
} from 'lucide-react';
import { useStartupAuth } from '../../contexts/StartupAuthContext';
import { Button } from '../../components/ui/Button/Button';

import { CRM_API_BASE_URL as API_BASE_URL } from '../../services/api';
import { formatShortDate } from '../../utils/formatDate';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  animation: ${fadeInUp} 0.4s ease-out;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ScoreCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const ScoreValue = styled.div<{ $color: string }>`
  font-size: 28px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  line-height: 1;
  margin: ${({ theme }) => theme.spacing[2]} 0;

  @media (max-width: 480px) {
    font-size: 28px;
  }
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
`;

const ScoreBadge = styled.div<{ $color: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const LastAnalysis = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const InfoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const InfoValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SummaryCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SummaryIcon = styled.div<{ $color: string; $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SummaryContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const SummaryTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const SummaryValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DisabledInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LoadingPage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;

  svg {
    animation: ${spin} 1s linear infinite;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ErrorBanner = styled.div`
  background: ${({ theme }) => theme.colors.status.dangerBg};
  border: 1px solid ${({ theme }) => theme.colors.status.dangerBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const getScoreLabel = (score: number, t: any): { text: string; color: string; bg: string } => {
  if (score >= 80) return { text: t('cabinet.dashboard.excellent', 'Excellent'), color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  if (score >= 60) return { text: t('cabinet.dashboard.good', 'Good'), color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
  if (score >= 40) return { text: t('cabinet.dashboard.fair', 'Fair'), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
  return { text: t('cabinet.dashboard.needsWork', 'Needs Work'), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
};

export const StartupCabinetDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, startup } = useStartupAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitDisabled, setResubmitDisabled] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoadingData(true);
      try {
        const response = await fetch(`${API_BASE_URL}/cabinet/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to load dashboard data');

        const data = await response.json();
        if (data.success && data.data) {
          setDashboardData(data.data);

          if (data.data.lastResubmitDate) {
            const lastDate = new Date(data.data.lastResubmitDate);
            const today = new Date();
            if (
              lastDate.getFullYear() === today.getFullYear() &&
              lastDate.getMonth() === today.getMonth() &&
              lastDate.getDate() === today.getDate()
            ) {
              setResubmitDisabled(true);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              setNextAvailable(formatShortDate(tomorrow));
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const handleResubmit = async () => {
    if (resubmitDisabled) return;

    setIsResubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/cabinet/resubmit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Resubmit failed');
      }

      setResubmitDisabled(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      setNextAvailable(formatShortDate(tomorrow));

      const refreshResponse = await fetch(`${API_BASE_URL}/cabinet/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const refreshData = await refreshResponse.json();
      if (refreshData.success && refreshData.data) {
        setDashboardData(refreshData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit');
    } finally {
      setIsResubmitting(false);
    }
  };

  if (isLoadingData) {
    return (
      <LoadingPage>
        <Loader2 size={32} />
      </LoadingPage>
    );
  }

  const score = dashboardData?.aiScore ?? startup?.aiScore ?? null;
  const scoreInfo = score !== null ? getScoreLabel(score, t) : null;
  const data = dashboardData || startup || {};

  return (
    <PageContainer>
      <Header>
        <PageTitle>{data.companyName || data.name || t('cabinet.dashboard.title', 'Dashboard')}</PageTitle>
        <PageSubtitle>{t('cabinet.dashboard.subtitle', 'Your startup overview and AI evaluation')}</PageSubtitle>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <TopRow>
        <Card>
          <CardTitle>
            <Building2 size={18} />
            {t('cabinet.dashboard.startupInfo', 'Startup Information')}
          </CardTitle>
          <InfoGrid>
            <InfoItem>
              <InfoLabel>{t('cabinet.dashboard.companyName', 'Company')}</InfoLabel>
              <InfoValue>{data.companyName || data.name || '-'}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>{t('cabinet.dashboard.industry', 'Industry')}</InfoLabel>
              <InfoValue>{data.industry || '-'}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>{t('cabinet.dashboard.stage', 'Stage')}</InfoLabel>
              <InfoValue>{data.stage || '-'}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>{t('cabinet.dashboard.founder', 'Founder')}</InfoLabel>
              <InfoValue>{data.founderName || '-'}</InfoValue>
            </InfoItem>
          </InfoGrid>
        </Card>

        <ScoreCard>
          <ScoreLabel>{t('cabinet.dashboard.aiScore', 'AI Score')}</ScoreLabel>
          {score !== null ? (
            <>
              <ScoreValue $color={getScoreColor(score)}>{score}</ScoreValue>
              {scoreInfo && (
                <ScoreBadge $color={scoreInfo.color} $bg={scoreInfo.bg}>
                  {scoreInfo.text}
                </ScoreBadge>
              )}
              {data.lastAnalysisDate && (
                <LastAnalysis>
                  <Calendar size={14} />
                  {t('cabinet.dashboard.lastAnalysis', 'Last analysis')}: {formatShortDate(new Date(data.lastAnalysisDate))}
                </LastAnalysis>
              )}
            </>
          ) : (
            <>
              <ScoreValue $color="rgba(255,255,255,0.2)">--</ScoreValue>
              <ScoreLabel>{t('cabinet.dashboard.notAnalyzed', 'Not yet analyzed')}</ScoreLabel>
            </>
          )}
        </ScoreCard>
      </TopRow>

      <ActionsRow>
        <Button variant="primary" onClick={() => navigate('/cabinet/edit')}>
          <Edit3 size={16} />
          {t('cabinet.dashboard.editApplication', 'Edit Application')}
        </Button>
        <Button
          variant="outline"
          onClick={handleResubmit}
          disabled={resubmitDisabled || isResubmitting}
        >
          {isResubmitting ? (
            <>
              <Loader2 size={16} style={{ animation: `${spin} 1s linear infinite` }} />
              {t('cabinet.dashboard.resubmitting', 'Resubmitting...')}
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              {t('cabinet.dashboard.resubmit', 'Resubmit for Analysis')}
            </>
          )}
        </Button>
        {resubmitDisabled && nextAvailable && (
          <DisabledInfo>
            <Clock size={14} />
            {t('cabinet.dashboard.nextAvailable', 'Next available')}: {nextAvailable}
          </DisabledInfo>
        )}
      </ActionsRow>

      <SummaryGrid>
        {data.industry && (
          <SummaryCard>
            <SummaryIcon $color="#3b82f6" $bg="rgba(59, 130, 246, 0.15)">
              <Briefcase size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.industry', 'Industry')}</SummaryTitle>
              <SummaryValue>{data.industry}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
        {data.stage && (
          <SummaryCard>
            <SummaryIcon $color="#8b5cf6" $bg="rgba(139, 92, 246, 0.15)">
              <Target size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.stage', 'Stage')}</SummaryTitle>
              <SummaryValue>{data.stage}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
        {(data.teamSize || data.teamMembers?.length) && (
          <SummaryCard>
            <SummaryIcon $color="#10b981" $bg="rgba(16, 185, 129, 0.15)">
              <Users size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.team', 'Team Size')}</SummaryTitle>
              <SummaryValue>{data.teamSize || data.teamMembers?.length || '-'}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
        {data.businessModel && (
          <SummaryCard>
            <SummaryIcon $color="#f59e0b" $bg="rgba(245, 158, 11, 0.15)">
              <TrendingUp size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.businessModel', 'Business Model')}</SummaryTitle>
              <SummaryValue>{data.businessModel}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
        {data.country && (
          <SummaryCard>
            <SummaryIcon $color="#06b6d4" $bg="rgba(6, 182, 212, 0.15)">
              <Building2 size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.country', 'Country')}</SummaryTitle>
              <SummaryValue>{data.country}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
        {data.foundedYear && (
          <SummaryCard>
            <SummaryIcon $color="#ec4899" $bg="rgba(236, 72, 153, 0.15)">
              <Calendar size={20} />
            </SummaryIcon>
            <SummaryContent>
              <SummaryTitle>{t('cabinet.dashboard.founded', 'Founded')}</SummaryTitle>
              <SummaryValue>{data.foundedYear}</SummaryValue>
            </SummaryContent>
          </SummaryCard>
        )}
      </SummaryGrid>
    </PageContainer>
  );
};

export default StartupCabinetDashboard;
