import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1860px;
  margin: 0 auto;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
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

const MetricInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SectionTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  @media (max-width: 1200px) {
    display: flex;
    overflow: hidden;
  }
`;

const SectionTab = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 13px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;

  @media (max-width: 1200px) {
    min-width: 240px;
    flex-shrink: 0;
  }
`;

const TabText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DashboardCard = styled.section`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  @media (max-width: 820px) {
    flex-direction: column;
  }
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1 1 auto;
  flex-wrap: wrap;
`;

const TableHead = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  height: 50px;
  padding: 0 20px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const TableRow = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  height: 63px;
  padding: 0 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const Cell = styled.div<{ $grow?: number }>`
  flex: ${({ $grow }) => $grow || 1} 1 0;
  min-width: 0;
`;

const METRICS = [0, 1, 2, 3];
const TABS = [0, 1, 2, 3, 4];
const COLUMNS = [0, 1, 2, 3, 4, 5];
const ROWS = [0, 1, 2, 3, 4, 5, 6, 7];

export const PortfolioSkeleton = () => (
  <PageContainer aria-hidden="true">
    <Header>
      <Skeleton $width="180px" $height="26px" style={{ marginBottom: '8px' }} />
      <Skeleton $width="min(420px, 70%)" $height="14px" />
    </Header>

    <MetricsGrid>
      {METRICS.map((metric) => (
        <MetricCard key={metric}>
          <Skeleton $width="44px" $height="44px" style={{ borderRadius: '8px', flexShrink: 0 }} />
          <MetricInfo>
            <Skeleton $width="62%" $height="24px" />
            <Skeleton $width="80%" $height="12px" />
            <Skeleton $width="52%" $height="11px" />
          </MetricInfo>
        </MetricCard>
      ))}
    </MetricsGrid>

    <SectionTabs>
      {TABS.map((tab) => (
        <SectionTab key={tab}>
          <Skeleton $width="18px" $height="18px" style={{ borderRadius: '5px', flexShrink: 0 }} />
          <TabText>
            <Skeleton $width="64%" $height="14px" />
            <Skeleton $width="90%" $height="11px" />
          </TabText>
        </SectionTab>
      ))}
    </SectionTabs>

    <DashboardCard>
      <DashboardHeader>
        <HeaderText>
          <Skeleton $width="220px" $height="18px" />
          <Skeleton $width="min(420px, 80%)" $height="12px" />
        </HeaderText>
        <Skeleton $width="150px" $height="14px" style={{ flexShrink: 0 }} />
      </DashboardHeader>

      <Toolbar>
        <Skeleton $width="min(300px, 40%)" $height="46px" style={{ borderRadius: '8px' }} />
        <ToolbarActions>
          <Skeleton $width="110px" $height="38px" style={{ borderRadius: '8px' }} />
          <Skeleton $width="110px" $height="38px" style={{ borderRadius: '8px' }} />
          <Skeleton $width="140px" $height="38px" style={{ borderRadius: '8px' }} />
          <Skeleton $width="160px" $height="38px" style={{ borderRadius: '8px' }} />
        </ToolbarActions>
      </Toolbar>

      <TableHead>
        {COLUMNS.map((column) => (
          <Cell key={column} $grow={column === 0 ? 2 : 1}>
            <Skeleton $width={column === 0 ? '70%' : '58%'} $height="12px" />
          </Cell>
        ))}
      </TableHead>
      {ROWS.map((row) => (
        <TableRow key={row}>
          {COLUMNS.map((column) => (
            <Cell key={column} $grow={column === 0 ? 2 : 1}>
              <Skeleton $width={column === 0 ? '78%' : '52%'} $height="14px" />
            </Cell>
          ))}
        </TableRow>
      ))}
    </DashboardCard>
  </PageContainer>
);
