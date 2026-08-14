import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem, ToastTone } from './toastContext';

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
`;

const toneColor = (tone: ToastTone, theme: import('styled-components').DefaultTheme) => {
  if (tone === 'success') return theme.colors.status.success;
  if (tone === 'error') return theme.colors.status.danger;
  return theme.colors.status.info;
};

const Card = styled.div<{ $tone: ToastTone }>`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 280px;
  max-width: min(440px, calc(100vw - 32px));
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-left: 3px solid ${({ theme, $tone }) => toneColor($tone, theme)};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  animation: ${slideIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
`;

const IconSlot = styled.div<{ $tone: ToastTone }>`
  display: flex;
  flex: 0 0 auto;
  color: ${({ theme, $tone }) => toneColor($tone, theme)};
`;

const Message = styled.div`
  flex: 1 1 auto;
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.4;
`;

const ActionButton = styled.button`
  flex: 0 0 auto;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  white-space: nowrap;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }
`;

const CloseButton = styled.button`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const Toast = ({ toast, onDismiss }: ToastProps) => {
  const { t } = useTranslation();

  return (
    <Card $tone={toast.tone} role="status" aria-live="polite">
      <IconSlot $tone={toast.tone}>{ICONS[toast.tone]}</IconSlot>
      <Message>{toast.message}</Message>
      {toast.action && (
        <ActionButton
          type="button"
          onClick={() => {
            toast.action!.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </ActionButton>
      )}
      <CloseButton type="button" onClick={() => onDismiss(toast.id)} aria-label={t('common.close', 'Close')}>
        <X size={16} />
      </CloseButton>
    </Card>
  );
};
