import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, TrendingUp, TrendingDown, DollarSign, Building2, Handshake } from 'lucide-react';
import { Startup } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import { formatCountryName } from '../../Startups/components/AddStartupWizard/constants';
import { resolveStartupUnitEconomics } from '../portfolioUnitEconomics';
import { formatShortDate } from '../../../utils/formatDate';

interface PortfolioCardProps {
  startup: Startup;
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CompanyName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const ValuationBadge = styled.div`
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 14px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  white-space: nowrap;
`;

const ProgramTypeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
  border: 1px solid rgba(139, 92, 246, 0.3);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  white-space: nowrap;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MetricLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MetricEmpty = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 10px 0 0 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const ValuationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ValuationLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ValuationInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ValuationTypeBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.secondary};
  margin: 14px 0;
`;

const MetricsDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 10px;
  text-align: right;
`;

const HealthRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const HealthDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) =>
    $color === 'green' ? '#10b981' :
    $color === 'yellow' ? '#f59e0b' :
    $color === 'red' ? '#ef4444' : 'rgba(255,255,255,0.2)'};
`;

const HealthLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return null;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
};

const formatPercent = (val?: number) => {
  if (val === undefined || val === null) return null;
  return `${val.toFixed(1)}%`;
};

export const PortfolioCard = ({ startup }: PortfolioCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const m = startup.metrics;
  const ms = startup.monitoringScore;
  const unitEconomics = resolveStartupUnitEconomics(startup);

  return (
    <Card onClick={() => navigate(`/portfolio/${startup.id}`)}>
      <CardHeader>
        <StartupLogo
          src={startup.fileUrls?.logo || startup.logo}
          startupId={startup.id}
          name={startup.brief?.companyName || ''}
          variant="md"
        />
        <HeaderInfo>
          <CompanyName>{startup.brief.companyName}</CompanyName>
          <InfoRow>
            {startup.brief.country && (
              <>
                <Globe />
                <span>{formatCountryName(startup.brief.country)}</span>
              </>
            )}
            {startup.brief.industry && (
              <>
                <Building2 />
                <span>{startup.brief.industry}</span>
              </>
            )}
          </InfoRow>
        </HeaderInfo>
        {startup.portfolioType === 'program' ? (
          <ProgramTypeBadge>
            <Handshake aria-hidden="true" strokeWidth={2.5} />
            <span>{t('portfolio.programBadge', 'Программный')}</span>
          </ProgramTypeBadge>
        ) : (startup.investmentAmount || m?.lastValuation) ? (
          <ValuationBadge>
            {formatCurrency(startup.investmentAmount || m?.lastValuation)}
          </ValuationBadge>
        ) : null}
      </CardHeader>

      <Badge variant="info">{startup.brief.stage}</Badge>

      {startup.valuation ? (
        <ValuationRow>
          <ValuationLabel>{t('portfolio.projectValuation', 'Valuation')}</ValuationLabel>
          <ValuationInfo>
            <span>{formatCurrency(startup.valuation)}</span>
            {startup.valuationType && (
              <ValuationTypeBadge>
                {startup.valuationType === 'pre-money' ? 'Pre-money' : 'Post-money'}
              </ValuationTypeBadge>
            )}
          </ValuationInfo>
        </ValuationRow>
      ) : null}

      {startup.brief.description && (
        <Description>{startup.brief.description}</Description>
      )}

      <Divider />

      <MetricsGrid>
        <MetricItem>
          <MetricLabel>ARR</MetricLabel>
          {m?.arr ? <MetricValue>{formatCurrency(m.arr)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>MRR</MetricLabel>
          {m?.mrr ? <MetricValue>{formatCurrency(m.mrr)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>GMV</MetricLabel>
          {m?.gmv ? <MetricValue>{formatCurrency(m.gmv)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>ARPU</MetricLabel>
          {m?.arpu ? <MetricValue>{formatCurrency(m.arpu)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>LTV / CAC</MetricLabel>
          {unitEconomics.ltvCac !== undefined ? (
            <MetricValue>{unitEconomics.ltvCac.toFixed(1)}x</MetricValue>
          ) : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>{t('portfolio.grossMargin', 'Gross Margin')}</MetricLabel>
          {m?.grossMargin !== undefined ? <MetricValue>{formatPercent(m.grossMargin)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>{t('portfolio.burnRate', 'Burn Rate')}</MetricLabel>
          {m?.burnRate ? <MetricValue>{formatCurrency(m.burnRate)}/mo</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
        <MetricItem>
          <MetricLabel>{t('portfolio.churnRate', 'Churn Rate')}</MetricLabel>
          {m?.churnRate !== undefined ? <MetricValue>{formatPercent(m.churnRate)}</MetricValue> : <MetricEmpty>--</MetricEmpty>}
        </MetricItem>
      </MetricsGrid>

      {startup.updatedAt && (
        <MetricsDate>
          {t('portfolio.lastUpdated', 'Updated')}: {formatShortDate(new Date(startup.updatedAt))}
        </MetricsDate>
      )}

      {ms && ms.totalScore !== undefined && (
        <HealthRow>
          <HealthLabel>{t('portfolio.health', 'Health')}: {ms.totalScore}/14</HealthLabel>
          <div style={{ display: 'flex', gap: 4 }}>
            <HealthDot $color={ms.revenueGrowth || ''} title="Revenue Growth" />
            <HealthDot $color={ms.grossMargin || ''} title="Gross Margin" />
            <HealthDot $color={ms.burnMultiple || ''} title="Burn Multiple" />
            <HealthDot $color={ms.runway || ''} title="Runway" />
            <HealthDot $color={ms.ltvCac || ''} title="LTV/CAC" />
            <HealthDot $color={ms.cashFlowTrend || ''} title="Cash Flow" />
            <HealthDot $color={ms.payback || ''} title="Payback" />
          </div>
        </HealthRow>
      )}
    </Card>
  );
};
