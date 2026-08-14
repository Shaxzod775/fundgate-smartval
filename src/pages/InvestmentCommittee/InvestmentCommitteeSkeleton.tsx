import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';
import { Page } from './components/shared';

const CommandHeader = styled.section`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  align-items: center;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[5]};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing[3]};
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  }
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1 1 320px;
  min-width: 0;

  @media (max-width: 768px) {
    flex-basis: auto;
  }
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: stretch;
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  min-height: 168px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-right: 30px;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ItemFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: auto;
  padding-top: ${({ theme }) => theme.spacing[2]};
`;

const TAB_WIDTHS = ['104px', '124px', '146px', '138px', '108px'];
const CARDS = [0, 1, 2, 3, 4, 5];
const CHIP_WIDTHS = ['96px', '84px', '108px'];

export const InvestmentCommitteeSkeleton = () => (
  <Page $capped aria-hidden="true">
    <CommandHeader>
      <TitleBlock>
        <Skeleton $width="164px" $height="12px" />
        <Skeleton $width="240px" $height="24px" />
      </TitleBlock>
    </CommandHeader>

    <div>
      <Tabs>
        {TAB_WIDTHS.map((width, index) => (
          <Skeleton key={index} $width={width} $height="38px" style={{ borderRadius: '999px' }} />
        ))}
      </Tabs>

      <List>
        {CARDS.map((card) => (
          <Item key={card}>
            <ItemHeader>
              <Skeleton $width="62%" $height="15px" />
              <Skeleton $width="78px" $height="20px" style={{ borderRadius: '6px', flexShrink: 0 }} />
            </ItemHeader>
            <Skeleton $width="72%" $height="12px" />
            <Chips>
              {CHIP_WIDTHS.map((width, index) => (
                <Skeleton key={index} $width={width} $height="24px" style={{ borderRadius: '999px' }} />
              ))}
            </Chips>
            <ItemFooter>
              <Skeleton $width="120px" $height="22px" style={{ borderRadius: '999px' }} />
              <Skeleton $width="88px" $height="22px" style={{ borderRadius: '999px', flexShrink: 0 }} />
            </ItemFooter>
          </Item>
        ))}
      </List>
    </div>
  </Page>
);
