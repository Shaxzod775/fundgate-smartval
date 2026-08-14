import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';

const PageContainer = styled.div`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
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

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
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

const StatCardSkeleton = styled(Card)`
  padding: 12px;
  height: 110px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media (max-width: 480px) {
    padding: 8px;
    height: 80px;
  }
`;

const StatIconSkeleton = styled(Skeleton)`
  @media (max-width: 480px) {
    width: 28px !important;
    height: 28px !important;
  }
`;

const StatValueSkeleton = styled(Skeleton)`
  @media (max-width: 480px) {
    height: 20px !important;
  }
`;

const StatLabelSkeleton = styled(Skeleton)`
  @media (max-width: 480px) {
    height: 12px !important;
  }
`;

const ChartCard = styled(Card)`
  padding: 16px;
  height: 280px;

  @media (max-width: 480px) {
    padding: 12px;
    height: 200px;
  }
`;

const ContentCard = styled(Card)`
  padding: 16px;
  min-height: 400px;

  @media (max-width: 480px) {
    padding: 12px;
    min-height: 300px;
  }
`;

export const DashboardSkeleton = () => {
    return (
        <PageContainer>
            <StatsGrid>
                {[1, 2, 3, 4].map((i) => (
                    <StatCardSkeleton key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <StatIconSkeleton $width="36px" $height="36px" $variant="circle" />
                            <Skeleton $width="40px" $height="20px" />
                        </div>
                        <div>
                            <StatValueSkeleton $width="60%" $height="28px" style={{ marginBottom: '4px' }} />
                            <StatLabelSkeleton $width="40%" $height="14px" />
                        </div>
                    </StatCardSkeleton>
                ))}
            </StatsGrid>

            <ChartsGrid>
                {[1, 2].map((i) => (
                    <ChartCard key={i}>
                        <Skeleton $width="150px" $height="20px" style={{ marginBottom: '8px' }} />
                        <Skeleton $width="100px" $height="14px" style={{ marginBottom: '24px' }} />
                        <Skeleton $width="100%" $height="180px" />
                    </ChartCard>
                ))}
            </ChartsGrid>

            <ContentGrid>
                <ContentCard>
                    <Skeleton $width="180px" $height="24px" style={{ marginBottom: '20px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3, 4, 5].map(j => (
                            <div key={j} style={{ display: 'flex', gap: '12px' }}>
                                <Skeleton $width="32px" $height="32px" $variant="circle" />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <Skeleton $width="70%" $height="14px" />
                                    <Skeleton $width="30%" $height="12px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </ContentCard>
                <ContentCard>
                    <Skeleton $width="150px" $height="24px" style={{ marginBottom: '20px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3].map(j => (
                            <div key={j} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Skeleton $width="28px" $height="28px" $variant="circle" />
                                <Skeleton $width="36px" $height="36px" $variant="circle" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton $width="60%" $height="14px" style={{ marginBottom: '4px' }} />
                                    <Skeleton $width="40%" $height="12px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </ContentCard>
            </ContentGrid>
        </PageContainer>
    );
};
