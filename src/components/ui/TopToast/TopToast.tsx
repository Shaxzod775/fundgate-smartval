import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -28px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
`;

const drawCircle = keyframes`
  to { stroke-dashoffset: 0; }
`;

const drawCheck = keyframes`
  to { stroke-dashoffset: 0; }
`;

const Wrap = styled.div<{ $clickable?: boolean }>`
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 320px;
  max-width: min(560px, calc(100vw - 32px));
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  /* Тост парит над контентом — фон обязан быть непрозрачным (solid) */
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  animation: ${slideDown} 320ms cubic-bezier(0.2, 0.8, 0.3, 1);
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  @media (max-width: 480px) {
    min-width: auto;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }
`;

const CheckSvg = styled.svg`
  width: 40px;
  height: 40px;
  flex-shrink: 0;

  .toast-circle {
    stroke: #10b981;
    stroke-dasharray: 138;
    stroke-dashoffset: 138;
    animation: ${drawCircle} 450ms ease-out 120ms forwards;
  }

  .toast-check {
    stroke: #10b981;
    stroke-dasharray: 36;
    stroke-dashoffset: 36;
    animation: ${drawCheck} 280ms ease-out 480ms forwards;
  }
`;

const bellRing = keyframes`
  0%, 60%, 100% { transform: rotate(0); }
  10% { transform: rotate(14deg); }
  25% { transform: rotate(-12deg); }
  40% { transform: rotate(8deg); }
  50% { transform: rotate(-6deg); }
`;

const InfoDot = styled.span`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.14);
  color: #3b82f6;

  svg {
    width: 20px;
    height: 20px;
    transform-origin: top center;
    animation: ${bellRing} 1.1s ease-in-out 350ms 2;
  }
`;

const Copy = styled.div`
  min-width: 0;
  flex: 1;
`;

const CloseButton = styled.button`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const ToastTitle = styled.strong`
  display: block;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.3;
`;

const ToastMessage = styled.span`
  display: block;
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;
`;

interface TopToastProps {
  tone?: 'success' | 'info';
  title: string;
  message?: string;
  autoHideMs?: number;
  onClose: () => void;
  onClick?: () => void;
}

export default function TopToast({ tone = 'success', title, message, autoHideMs = 2800, onClose, onClick }: TopToastProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = window.setTimeout(onClose, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [autoHideMs, onClose]);

  return (
    <Wrap
      role="status"
      $clickable={Boolean(onClick)}
      onClick={() => {
        if (!onClick) return;
        onClick();
        onClose();
      }}
    >
      {tone === 'success' ? (
        <CheckSvg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle className="toast-circle" cx="24" cy="24" r="22" strokeWidth="3" strokeLinecap="round" />
          <path className="toast-check" d="M15 24.5 L21.5 31 L33 18.5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </CheckSvg>
      ) : (
        <InfoDot aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </InfoDot>
      )}
      <Copy>
        <ToastTitle>{title}</ToastTitle>
        {message ? <ToastMessage>{message}</ToastMessage> : null}
      </Copy>
      <CloseButton
        type="button"
        aria-label={t('common.closeNotification', 'Close notification')}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </CloseButton>
    </Wrap>
  );
}
