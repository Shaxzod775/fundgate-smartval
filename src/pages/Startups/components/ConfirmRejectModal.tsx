import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { createPortal } from 'react-dom';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

const Message = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: 24px;
`;

const StartupName = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

interface ConfirmRejectModalProps {
  isOpen: boolean;
  startupName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmRejectModal = ({
  isOpen,
  startupName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmRejectModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const modalContent = (
    <Overlay onClick={onCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <IconWrapper>
          <XCircle size={28} />
        </IconWrapper>

        <Title>{t('startups.reject.modalTitle')}</Title>

        <Message>
          {t('startups.reject.modalMessage')} <StartupName>"{startupName}"</StartupName>?
        </Message>

        <ButtonGroup>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? t('startups.actions.rejecting') : t('common.yes')}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {t('common.no')}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};
