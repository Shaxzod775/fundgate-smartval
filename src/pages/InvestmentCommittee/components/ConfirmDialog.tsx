import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button, Muted } from './shared';

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ReasonInput = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  reason?: { value: string; onChange: (value: string) => void; placeholder?: string };
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  reason,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel || t('common.cancel');

  return (
    <Modal isOpen={open} onClose={onClose} title={title} width="440px">
      <Body>
        {message ? <Muted>{message}</Muted> : null}
        {reason ? (
          <ReasonInput
            value={reason.value}
            onChange={(event) => reason.onChange(event.target.value)}
            placeholder={reason.placeholder}
          />
        ) : null}
        <Footer>
          <Button type="button" onClick={onClose} disabled={busy}>
            {resolvedCancelLabel}
          </Button>
          <Button type="button" $variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </Footer>
      </Body>
    </Modal>
  );
}
