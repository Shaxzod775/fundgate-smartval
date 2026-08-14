import styled from 'styled-components';
import { Skeleton } from '../../components/ui/Skeleton';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  width: 100%;
  box-sizing: border-box;
`;

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Line = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const ROWS = [
  { name: '58%', preview: '76%' },
  { name: '44%', preview: '62%' },
  { name: '66%', preview: '84%' },
  { name: '38%', preview: '54%' },
  { name: '52%', preview: '70%' },
  { name: '60%', preview: '48%' },
  { name: '46%', preview: '80%' },
];

export const ChatListSkeleton = () => (
  <div aria-hidden="true">
    {ROWS.map((row, index) => (
      <Row key={index}>
        <Skeleton $width="44px" $height="44px" $variant="circle" style={{ flexShrink: 0 }} />
        <RowMain>
          <Line>
            <Skeleton $width={row.name} $height="14px" />
            <Skeleton $width="34px" $height="11px" style={{ flexShrink: 0 }} />
          </Line>
          <Line>
            <Skeleton $width={row.preview} $height="12px" />
          </Line>
        </RowMain>
      </Row>
    ))}
  </div>
);
