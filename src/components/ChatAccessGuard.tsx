import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { canUseChats } from '../utils/chatAccess';

interface ChatAccessGuardProps {
  children: ReactNode;
}

const AccessBlockedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.muted};
  max-width: 460px;
  margin: 0;
`;

export const ChatAccessGuard = ({ children }: ChatAccessGuardProps) => {
  const { manager, organization } = useAuth();
  const { t } = useTranslation();

  if (canUseChats(manager, organization)) {
    return <>{children}</>;
  }

  return (
    <AccessBlockedContainer>
      <IconWrapper>
        <Lock />
      </IconWrapper>
      <Title>{t('chats.restrictedTitle')}</Title>
      <Description>{t('chats.restrictedDescription')}</Description>
    </AccessBlockedContainer>
  );
};

export default ChatAccessGuard;
