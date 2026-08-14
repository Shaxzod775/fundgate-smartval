import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Briefcase, DollarSign, Handshake, Globe } from 'lucide-react';
import { Startup } from '../../../types';

interface PortfolioSummaryProps {
  startups: Startup[];
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
`;

const IconWrap = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $color }) => $color}20;
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

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const formatCurrency = (val: number) => {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
};

export const PortfolioSummary = ({ startups }: PortfolioSummaryProps) => {
  const { t } = useTranslation();

  const totalInvested = startups.reduce((sum, s) => sum + (s.investmentAmount || 0), 0);
  const coInvestmentCount = startups.filter(s => s.isCoInvestment).length;
  const countries = new Set(startups.map(s => s.brief.country?.toLowerCase()).filter(Boolean));

  return (
    <Grid>
      <StatCard>
        <IconWrap $color="#10b981">
          <Briefcase />
        </IconWrap>
        <StatInfo>
          <StatValue>{startups.length}</StatValue>
          <StatLabel>{t('portfolio.totalStartups', 'Portfolio Companies')}</StatLabel>
        </StatInfo>
      </StatCard>

      <StatCard>
        <IconWrap $color="#6366f1">
          <DollarSign />
        </IconWrap>
        <StatInfo>
          <StatValue>{formatCurrency(totalInvested)}</StatValue>
          <StatLabel>{t('portfolio.totalInvested', 'Total Invested')}</StatLabel>
        </StatInfo>
      </StatCard>

      <StatCard>
        <IconWrap $color="#f59e0b">
          <Handshake />
        </IconWrap>
        <StatInfo>
          <StatValue>{coInvestmentCount}</StatValue>
          <StatLabel>{t('portfolio.coInvestment', '1+1 Co-Investment Made')}</StatLabel>
        </StatInfo>
      </StatCard>

      <StatCard>
        <IconWrap $color="#3b82f6">
          <Globe />
        </IconWrap>
        <StatInfo>
          <StatValue>{countries.size}</StatValue>
          <StatLabel>{t('portfolio.countries', 'Countries Presence')}</StatLabel>
        </StatInfo>
      </StatCard>
    </Grid>
  );
};
