import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CheckCircle2, Trash2 } from 'lucide-react';
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

const IconWrapper = styled.div<{ $tone?: 'danger' | 'success' }>`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme, $tone }) => (
    $tone === 'success' ? theme.colors.status.successBg : theme.colors.status.dangerBg
  )};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  svg {
    color: ${({ theme, $tone }) => (
      $tone === 'success' ? theme.colors.status.success : theme.colors.status.danger
    )};
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
  margin-bottom: 8px;
`;

const StartupName = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

const Note = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.status.danger};
  margin-bottom: 18px;
`;

const ConfirmationPrompt = styled.div`
  text-align: left;
  margin-bottom: 20px;
`;

const ConfirmationLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`;

const ConfirmationPhrase = styled.div`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
  margin-bottom: 10px;
`;

const ConfirmationInput = styled.input`
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
    border-color: ${({ theme }) => theme.colors.status.danger};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.status.dangerBg};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

interface ConfirmPermanentDeleteModalProps {
  isOpen: boolean;
  mode?: 'single' | 'bulk';
  startupName?: string;
  startupCount?: number;
  confirmationText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  successResult?: {
    mode: 'single' | 'bulk';
    startupName?: string;
    startupCount: number;
  } | null;
}

export const ConfirmPermanentDeleteModal = ({
  isOpen,
  mode = 'single',
  startupName = '',
  startupCount = 0,
  confirmationText,
  onConfirm,
  onCancel,
  isLoading = false,
  successResult = null,
}: ConfirmPermanentDeleteModalProps) => {
  const { t } = useTranslation();
  const [confirmationInput, setConfirmationInput] = useState('');
  const isSuccess = Boolean(successResult);

  useEffect(() => {
    if (isOpen && !isSuccess) setConfirmationInput('');
  }, [isOpen, mode, startupName, startupCount, confirmationText, isSuccess]);

  if (!isOpen) return null;

  const isBulk = mode === 'bulk';
  const isSuccessBulk = successResult?.mode === 'bulk';
  const successStartupName = successResult?.startupName || startupName;
  const successStartupCount = successResult?.startupCount || startupCount;
  const canConfirm = confirmationInput.trim() === confirmationText.trim();

  const handleConfirm = () => {
    if (!canConfirm || isLoading) return;
    onConfirm();
  };

  const modalContent = (
    <Overlay onClick={() => {
      if (!isLoading) onCancel();
    }}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <IconWrapper $tone={isSuccess ? 'success' : 'danger'}>
          {isSuccess ? <CheckCircle2 size={28} /> : <Trash2 size={28} />}
        </IconWrapper>

        {isSuccess ? (
          <>
            <Title>
              {isSuccessBulk
                ? t('startups.archive.permanentDeleteBulkSuccessTitle')
                : t('startups.archive.permanentDeleteSuccessTitle')}
            </Title>

            <Message>
              {isSuccessBulk
                ? t('startups.archive.permanentDeleteBulkSuccessMessage', { count: successStartupCount })
                : t('startups.archive.permanentDeleteSuccessMessage', { name: successStartupName })}
            </Message>

            <ButtonGroup>
              <Button variant="success" onClick={onCancel}>
                {t('common.close')}
              </Button>
            </ButtonGroup>
          </>
        ) : (
          <>
            <Title>
              {isBulk
                ? t('startups.archive.permanentDeleteBulkModalTitle')
                : t('startups.archive.permanentDeleteModalTitle')}
            </Title>

            <Message>
              {isBulk ? (
                t('startups.archive.permanentDeleteBulkModalMessage', { count: startupCount })
              ) : (
                <>
                  {t('startups.archive.permanentDeleteModalMessage')} <StartupName>"{startupName}"</StartupName>?
                </>
              )}
            </Message>

            <Note>
              {t('startups.archive.permanentDeleteModalNote')}
            </Note>

            <ConfirmationPrompt>
              <ConfirmationLabel htmlFor="permanent-delete-confirmation">
                {isBulk
                  ? t('startups.archive.permanentDeleteBulkConfirmationLabel')
                  : t('startups.archive.permanentDeleteSingleConfirmationLabel')}
              </ConfirmationLabel>
              <ConfirmationPhrase>{confirmationText}</ConfirmationPhrase>
              <ConfirmationInput
                id="permanent-delete-confirmation"
                value={confirmationInput}
                onChange={(event) => setConfirmationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleConfirm();
                }}
                placeholder={t('startups.archive.permanentDeleteConfirmationPlaceholder')}
                disabled={isLoading}
                autoFocus
              />
            </ConfirmationPrompt>

            <ButtonGroup>
              <Button variant="danger" onClick={handleConfirm} disabled={isLoading || !canConfirm}>
                {isLoading ? t('startups.archive.permanentDeleting') : t('startups.archive.permanentDeleteButton')}
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                {t('common.no')}
              </Button>
            </ButtonGroup>
          </>
        )}
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};
