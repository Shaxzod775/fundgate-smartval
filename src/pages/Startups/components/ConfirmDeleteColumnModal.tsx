import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/ui/Button';
import type { StartupBoardColumn } from '../../../types';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${({ theme }) => theme.colors.bg.overlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  width: 420px;
  max-width: 90vw;
  padding: 32px;
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

const IconWrapper = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.status.dangerBg};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  svg { color: ${({ theme }) => theme.colors.status.danger}; }
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
`;

const Message = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: 18px;
`;

const TargetBlock = styled.div`
  text-align: left;
  margin-bottom: 20px;
`;

const TargetLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`;

const TargetSelect = styled.select`
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

interface ConfirmDeleteColumnModalProps {
  isOpen: boolean;
  column: StartupBoardColumn | null;
  targetColumnId: string;
  targetOptions: StartupBoardColumn[];
  affectedCount: number;
  onChangeTarget: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDeleteColumnModal = ({
  isOpen,
  column,
  targetColumnId,
  targetOptions,
  affectedCount,
  onChangeTarget,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteColumnModalProps) => {
  const { t } = useTranslation();
  if (!isOpen || !column) return null;

  const canConfirm = targetOptions.length > 0 && Boolean(targetColumnId);

  const modalContent = (
    <Overlay onClick={() => { if (!isLoading) onCancel(); }}>
      <ModalContainer onClick={(event) => event.stopPropagation()}>
        <IconWrapper>
          <Trash2 size={28} />
        </IconWrapper>
        <Title>{t('startups.boardEditor.delete.title', { label: column.label })}</Title>
        <Message>
          {affectedCount > 0
            ? t('startups.boardEditor.delete.affected', { count: affectedCount })
            : t('startups.boardEditor.delete.affectedZero')}
        </Message>

        {affectedCount > 0 && (
          <TargetBlock>
            <TargetLabel htmlFor="delete-column-target">
              {t('startups.boardEditor.delete.targetLabel')}
            </TargetLabel>
            <TargetSelect
              id="delete-column-target"
              value={targetColumnId}
              onChange={(event) => onChangeTarget(event.target.value)}
              disabled={isLoading}
            >
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </TargetSelect>
          </TargetBlock>
        )}

        <ButtonGroup>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading || !canConfirm}>
            {isLoading ? t('startups.boardEditor.delete.deleting') : t('startups.boardEditor.delete.confirm')}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {t('startups.boardEditor.delete.cancel')}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};
