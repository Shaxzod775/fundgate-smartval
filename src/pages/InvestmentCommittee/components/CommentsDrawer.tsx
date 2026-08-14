import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import MeetingCommentsPanel from './MeetingCommentsPanel';

const slideIn = keyframes`
  from { transform: translateX(24px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const Drawer = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  z-index: 120;
  display: flex;
  flex-direction: column;
  /* Плавающая поверхность — только solid-фон (правило frontend-ui) */
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-left: 1px solid ${({ theme }) => theme.colors.border.secondary};
  box-shadow: ${({ theme }) => theme.shadows.md};
  animation: ${slideIn} 280ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const HeadTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
`;

const HeadHint = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }
  svg { width: 16px; height: 16px; }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[4]};

  /* Внутри drawer'а панель комментариев без собственной рамки */
  & > section {
    border: none;
    box-shadow: none;
    padding: 0;
    background: transparent;
  }
`;

export default function CommentsDrawer({
  meeting,
  readOnly,
  busy,
  unreadSinceAt,
  onSend,
  onClose,
}: {
  meeting: InvestmentCommitteeMeeting;
  readOnly: boolean;
  busy: boolean;
  unreadSinceAt?: string;
  onSend: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <Drawer role="complementary" data-floating-panel="comments" aria-label={t('investmentCommittee.comments.title', 'Комментарии заседания')}>
      <Head>
        <div>
          <HeadTitle>{t('investmentCommittee.comments.title', 'Комментарии заседания')}</HeadTitle>
          <br />
          <HeadHint>{t('investmentCommittee.comments.nonModalHint', 'Страница остаётся активной · Esc — закрыть')}</HeadHint>
        </div>
        <CloseButton type="button" aria-label={t('common.close', 'Закрыть')} onClick={onClose}>
          <X />
        </CloseButton>
      </Head>
      <Body>
        <MeetingCommentsPanel
          meeting={meeting}
          readOnly={readOnly}
          busy={busy}
          onSend={onSend}
          unreadSinceAt={unreadSinceAt}
          autoFocusComposer
        />
      </Body>
    </Drawer>
  );
}
