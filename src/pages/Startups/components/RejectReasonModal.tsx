import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

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
  width: 520px;
  max-width: 92vw;
  padding: 28px;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const IconWrapper = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: ${({ theme }) => theme.colors.status.danger};
  }
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Prompt = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  margin: 0 0 16px 0;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
`;

const PresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

const PresetButton = styled.button<{ $active?: boolean }>`
  appearance: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.accent.primary : theme.colors.border.secondary};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.accent.primary}18` : theme.colors.bg.secondary};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TextareaLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: block;
  margin-bottom: 8px;
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 96px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
`;

interface RejectReasonModalProps {
  open: boolean;
  startupName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const PRESET_KEYS = [
  'not_aligned',
  'weak_team',
  'market_saturation',
  'poor_metrics',
  'other',
] as const;

export const RejectReasonModal = ({
  open,
  startupName,
  onConfirm,
  onCancel,
}: RejectReasonModalProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setActivePreset(null);
    }
  }, [open]);

  if (!open) return null;

  const handlePreset = (key: string) => {
    const text = t(`startups.rejection.reasons.${key}`);
    setReason(text);
    setActivePreset(key);
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    setActivePreset(null);
  };

  const trimmed = reason.trim();
  const canConfirm = trimmed.length > 0;

  const modalContent = (
    <Overlay onClick={onCancel}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <HeaderRow>
          <IconWrapper>
            <XCircle size={24} />
          </IconWrapper>
          <Title>{t('startups.rejection.modalTitle')}</Title>
        </HeaderRow>

        <Prompt>
          {t('startups.rejection.prompt', { name: startupName })}
        </Prompt>

        <SectionLabel>{t('startups.rejection.selectPreset')}</SectionLabel>
        <PresetRow>
          {PRESET_KEYS.map((key) => (
            <PresetButton
              key={key}
              type="button"
              $active={activePreset === key}
              onClick={() => handlePreset(key)}
            >
              {t(`startups.rejection.reasons.${key}`)}
            </PresetButton>
          ))}
        </PresetRow>

        <TextareaLabel htmlFor="reject-reason-textarea">
          {t('startups.rejection.customLabel')}
        </TextareaLabel>
        <Textarea
          id="reject-reason-textarea"
          value={reason}
          onChange={handleReasonChange}
          placeholder={t('startups.rejection.customLabel')}
        />

        <ButtonGroup>
          <Button variant="ghost" onClick={onCancel}>
            {t('startups.rejection.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => canConfirm && onConfirm(trimmed)}
            disabled={!canConfirm}
          >
            {t('startups.rejection.confirm')}
          </Button>
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};
