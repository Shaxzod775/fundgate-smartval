import styled from 'styled-components';
import { Skeleton } from '../../../components/ui/Skeleton';

const SLOTS = {
  header: 48,
  country: 18,
  badges: 24,
  financials: 52,
  statusChips: 24, // ChipArea $rows={STATUS_CHIP_ROWS}
  ddChips: 54, // ChipArea $rows={DD_CHIP_ROWS}: 2 × 24 + gap 6
  meta: 34, // включает padding-top 8 и border-top 1 (border-box)
  manager: 30, // включает padding-top 8 и border-top 1 (border-box)
} as const;

const GAP = 8; // theme.spacing[2] — отступ между слотами
const CHIP_GAP = 6;
const PADDING = 16; // theme.spacing[4] — паддинг карточки
const BORDER = 1;

const SLOT_GAPS = 7;

export const STARTUP_CARD_SKELETON_HEIGHT =
  Object.values(SLOTS).reduce((sum, height) => sum + height, 0)
  + GAP * SLOT_GAPS
  + PADDING * 2
  + BORDER * 2;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: ${BORDER}px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${PADDING}px;
  height: ${STARTUP_CARD_SKELETON_HEIGHT}px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};
`;

const Slot = styled.div<{ $height: number; $flush?: boolean }>`
  flex: none;
  box-sizing: border-box;
  height: ${({ $height }) => $height}px;
  margin-bottom: ${({ $flush }) => ($flush ? 0 : GAP)}px;
`;

const RowSlot = styled(Slot)`
  display: flex;
  align-items: center;
  gap: ${CHIP_GAP}px;
`;

const HeaderSlot = styled(RowSlot)`
  gap: 12px;
`;

const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FinancialsSlot = styled(Slot)`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${GAP}px;
`;

const ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${CHIP_GAP}px;
`;

const DdSlot = styled(Slot)`
  display: flex;
  flex-direction: column;
  gap: ${CHIP_GAP}px;
`;

const DividedSlot = styled(Slot)`
  margin-top: ${GAP}px;
  margin-bottom: 0;
  padding-top: ${GAP}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${GAP}px;
`;

const InlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ManagerGroup = styled(InlineGroup)`
  gap: ${CHIP_GAP}px;
`;

const Chip = styled(Skeleton)`
  border-radius: 999px;
`;

export const StartupCardSkeleton = () => (
  <Card aria-hidden="true">
    <HeaderSlot $height={SLOTS.header}>
      <Skeleton $width="48px" $height="48px" style={{ borderRadius: '10px', flexShrink: 0 }} />
      <HeaderText>
        <Skeleton $width="72%" $height="14px" />
        <Skeleton $width="45%" $height="10px" />
      </HeaderText>
    </HeaderSlot>

    <RowSlot $height={SLOTS.country}>
      <Skeleton $width="40%" $height="12px" />
    </RowSlot>

    <RowSlot $height={SLOTS.badges}>
      <Chip $width="64px" $height="22px" />
      <Chip $width="88px" $height="22px" />
    </RowSlot>

    <FinancialsSlot $height={SLOTS.financials}>
      <Row>
        <Skeleton $width="46%" $height="12px" />
        <Skeleton $width="52px" $height="12px" />
      </Row>
      <Skeleton $width="70%" $height="10px" />
    </FinancialsSlot>

    <RowSlot $height={SLOTS.statusChips}>
      <Chip $width="92px" $height="22px" />
      <Chip $width="58px" $height="22px" />
    </RowSlot>

    <DdSlot $height={SLOTS.ddChips} $flush>
      <ChipRow>
        <Chip $width="86px" $height="24px" />
        <Chip $width="72px" $height="24px" />
      </ChipRow>
      <ChipRow>
        <Chip $width="80px" $height="24px" />
      </ChipRow>
    </DdSlot>

    <DividedSlot $height={SLOTS.meta}>
      <InlineGroup>
        <Skeleton $width="46px" $height="12px" />
        <Skeleton $width="54px" $height="12px" />
      </InlineGroup>
      <Chip $width="42px" $height="20px" />
    </DividedSlot>

    <DividedSlot $height={SLOTS.manager} $flush>
      <ManagerGroup>
        <Skeleton $variant="circle" $width="22px" $height="22px" />
        <Skeleton $width="104px" $height="10px" />
      </ManagerGroup>
    </DividedSlot>
  </Card>
);
