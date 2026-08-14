import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Lock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/ui/Button';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
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
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  width: 480px;
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
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  svg {
    color: ${({ theme }) => theme.colors.status.danger};
  }
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
`;

const Description = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ReasonLabel = styled.label`
  display: block;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`;

const ReasonTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  resize: vertical;
  padding: 10px 12px;
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: 20px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

interface FinallyBlockModalProps {
  isOpen: boolean;
  startupName: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const FinallyBlockModal = ({
  isOpen,
  startupName,
  onConfirm,
  onCancel,
  isLoading = false,
}: FinallyBlockModalProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isLoading) return;
    void onConfirm(reason.trim());
  };

  const handleCancel = () => {
    if (isLoading) return;
    setReason('');
    onCancel();
  };

  const modalContent = (
    <Overlay onClick={handleCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <IconWrapper>
          <Lock size={28} />
        </IconWrapper>

        <Title>{t('startupDetail.finallyBlock.modalTitle')}</Title>

        <Description>
          {t('startupDetail.finallyBlock.modalDescription')}
          {startupName ? ` — "${startupName}"` : ''}
        </Description>

        <ReasonLabel htmlFor="finally-block-reason">
          {t('startupDetail.finallyBlock.reasonLabel')}
        </ReasonLabel>
        <ReasonTextarea
          id="finally-block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isLoading}
        />

        <ButtonGroup>
          <Button variant="danger" onClick={handleConfirm} disabled={isLoading}>
            {t('startupDetail.finallyBlock.confirm')}
          </Button>
          <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};

export default FinallyBlockModal;
