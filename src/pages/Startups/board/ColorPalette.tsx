import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const SWATCHES = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
  '#06b6d4', '#ef4444', '#a78bfa', '#ec4899',
  '#14b8a6', '#f97316', '#eab308', '#64748b',
];

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Swatch = styled.button<{ $color: string; $active: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ $color }) => $color};
  border: 2px solid ${({ $active, theme }) => ($active ? theme.colors.text.primary : 'transparent')};
  cursor: pointer;
  padding: 0;
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover { transform: scale(1.12); }
`;

const CustomSwatch = styled.label`
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px dashed ${({ theme }) => theme.colors.border.input};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

interface ColorPaletteProps {
  value: string;
  onPick: (color: string) => void;
}

export const ColorPalette = ({ value, onPick }: ColorPaletteProps) => {
  const { t } = useTranslation();

  return (
    <Grid>
      {SWATCHES.map((color) => (
        <Swatch
          key={color}
          type="button"
          $color={color}
          $active={color.toLowerCase() === value.toLowerCase()}
          onClick={() => onPick(color)}
          title={color}
        />
      ))}
      <CustomSwatch title={t('startups.boardEditor.menu.customColor')} style={{ background: HEX6.test(value) ? value : undefined }}>
        <input
          type="color"
          value={HEX6.test(value) ? value : '#10b981'}
          onChange={(event) => onPick(event.target.value)}
        />
      </CustomSwatch>
    </Grid>
  );
};
