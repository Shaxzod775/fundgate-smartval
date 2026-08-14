import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';
import { StartupCardSkeleton } from './components/StartupCardSkeleton';

const PageContainer = styled.div`
  width: 100%;
  padding-top: 72px;
  box-sizing: border-box;
`;

const Board = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  overflow: hidden;

  @media (max-width: 768px) {
    gap: 8px;
    padding: 12px;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const Column = styled.div`
  flex: 0 0 280px;
  width: 280px;
  background: ${({ theme }) => `${theme.colors.bg.secondary}80`};
  border: 2px solid transparent;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 12px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 37px;
  padding: 8px;
  margin-bottom: 12px;
  box-sizing: border-box;
`;

const ColumnCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
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
  gap: 8px;
  overflow: hidden;
  padding: 8px 12px;
`;

const MobileCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
`;

const COLUMNS = [0, 1, 2, 3, 4];
const CARDS_PER_COLUMN = [0, 1];
const MOBILE_CARDS = [0, 1, 2];

export const StartupsSkeleton = () => (
  <PageContainer>
    <Board aria-hidden="true">
      {COLUMNS.map((column) => (
        <Column key={column}>
          <ColumnHeader>
            <Skeleton $width="108px" $height="14px" />
            <Skeleton $width="26px" $height="18px" style={{ borderRadius: '999px' }} />
          </ColumnHeader>
          <ColumnCards>
            {CARDS_PER_COLUMN.map((card) => (
              <StartupCardSkeleton key={card} />
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
            $width={tab === 0 ? '132px' : '92px'}
            $height="36px"
            style={{ borderRadius: '20px', flexShrink: 0 }}
          />
        ))}
      </MobileTabs>
      <MobileCards>
        {MOBILE_CARDS.map((card) => (
          <StartupCardSkeleton key={card} />
        ))}
      </MobileCards>
    </MobileView>
  </PageContainer>
);
