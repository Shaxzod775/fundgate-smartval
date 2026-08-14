import React, { ReactNode } from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 260px; /* Match AppLayout Desktop Sidebar */
  right: 0;
  z-index: 90; /* High enough to be above content, but below Modals (1000) */
  
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  gap: ${({ theme }) => theme.spacing[4]};

  /* Glassmorphism Effect */
  background: ${({ theme }) => `${theme.colors.bg.primary}CC`};
  backdrop-filter: blur(8px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};

  @media (max-width: 768px) {
    left: 200px; /* Match AppLayout Mobile Sidebar */
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
  }
`;

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const ContentSection = styled.div`
  width: 100%;
`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  rightAction?: ReactNode; // Optional action button next to title
}

import { UserProfileBadge } from './UserProfileBadge';

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
  className,
  rightAction,
}) => {
  return (
    <HeaderContainer className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TitleSection>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TitleSection>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {rightAction}
          <UserProfileBadge />
        </div>
      </div>

      {children && <ContentSection>{children}</ContentSection>}
    </HeaderContainer>
  );
};
