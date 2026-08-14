import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';

const Board = styled.div`
  display: flex;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow: hidden;
  width: 100%;
  min-height: calc(100vh - 140px);

  @media (max-width: 768px) {
    gap: 8px;
    padding: ${({ theme }) => theme.spacing[3]};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const Column = styled.div`
  flex: 0 0 420px;
  width: 420px;
  background: ${({ theme }) => `${theme.colors.bg.secondary}80`};
  border: 2px solid transparent;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[2]};
  }
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 37px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]};
  box-sizing: border-box;
`;

const ColumnCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Card = styled.div`
  width: 100%;
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
`;

const CardHeader = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
`;

const BadgesRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const MetaGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

const MobileView = styled.div`
  display: none;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
  }
`;

const MobileTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 6px 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const MobileCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
`;

const COLUMNS = [0, 1, 2, 3];
const CARDS_PER_COLUMN = [0, 1];
const MOBILE_CARDS = [0, 1, 2];

const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton $width="48px" $height="48px" style={{ borderRadius: '12px', flexShrink: 0 }} />
      <CardInfo>
        <Skeleton $width="58%" $height="16px" />
        <Skeleton $width="76%" $height="12px" />
      </CardInfo>
    </CardHeader>

    <Skeleton $width="42%" $height="14px" style={{ marginBottom: '8px' }} />

    <BadgesRow>
      <Skeleton $width="72px" $height="22px" style={{ borderRadius: '6px' }} />
      <Skeleton $width="88px" $height="22px" style={{ borderRadius: '6px' }} />
      <Skeleton $width="64px" $height="22px" style={{ borderRadius: '6px' }} />
    </BadgesRow>

    <CardMeta>
      <MetaGroup>
        <Skeleton $width="92px" $height="12px" />
        <Skeleton $width="64px" $height="12px" />
      </MetaGroup>
      <Skeleton $width="70px" $height="18px" style={{ borderRadius: '4px', flexShrink: 0 }} />
    </CardMeta>
  </Card>
);

export const InvestorApplicationsSkeleton = () => (
  <>
    <Board aria-hidden="true">
      {COLUMNS.map((column) => (
        <Column key={column}>
          <ColumnHeader>
            <Skeleton $width="132px" $height="14px" />
            <Skeleton $width="28px" $height="20px" style={{ borderRadius: '12px' }} />
          </ColumnHeader>
          <ColumnCards>
            {CARDS_PER_COLUMN.map((card) => (
              <CardSkeleton key={card} />
            ))}
          </ColumnCards>
        </Column>
      ))}
    </Board>

    <MobileView aria-hidden="true">
      <MobileTabs>
        {COLUMNS.map((tab) => (
          <Skeleton
            key={tab}
            $width={tab === 0 ? '104px' : '84px'}
            $height="28px"
            style={{ borderRadius: '16px', flexShrink: 0 }}
          />
        ))}
      </MobileTabs>
      <MobileCards>
        {MOBILE_CARDS.map((card) => (
          <CardSkeleton key={card} />
        ))}
      </MobileCards>
    </MobileView>
  </>
);
