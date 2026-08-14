import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

const Ghost = styled.button`
  flex: 0 0 auto;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 160px;
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface AddBoardColumnButtonProps {
  onAdd: () => void;
  disabled?: boolean;
}

export const AddBoardColumnButton = ({ onAdd, disabled }: AddBoardColumnButtonProps) => {
  const { t } = useTranslation();
  return (
    <Ghost type="button" onClick={onAdd} disabled={disabled}>
      <Plus size={16} />
      {t('startups.boardEditor.addColumn')}
    </Ghost>
  );
};
