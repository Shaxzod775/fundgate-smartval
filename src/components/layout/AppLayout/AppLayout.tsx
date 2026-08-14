import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Menu, Loader2 } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import { FeedbackButton } from '../../FeedbackButton';
import CommitteeVoteNotice from '../CommitteeVoteNotice';
import { useAuth } from '../../../contexts/AuthContext';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg.primary};
  max-width: 100vw;
  overflow-x: hidden;
  overflow-y: visible;
`;

const MobileMenuButton = styled.button<{ $isActive?: boolean }>`
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 95;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.lg};
  /* Кнопка парит над контентом — solid-фон, сквозь rgba просвечивает страница */
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ $isActive, theme }) =>
    $isActive ? theme.colors.border.primary : theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: ${({ theme }) => theme.shadows.md};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ $isActive, theme }) =>
      $isActive ? theme.colors.border.primary : theme.colors.accent.primary};
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 24px;
    height: 24px;
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileOverlay = styled.div<{ $isOpen: boolean }>`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.bg.overlay};
  z-index: 90;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MainContent = styled.main<{ $isCollapsed: boolean }>`
  flex: 1;
  min-width: 0;
  margin-left: ${({ $isCollapsed }) => ($isCollapsed ? '72px' : '260px')};
  padding: ${({ theme }) => theme.spacing[6]};
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-x: hidden;
  overflow-y: visible;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: ${({ theme }) => theme.spacing[4]};
    padding-top: 72px;
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[2]};
    padding-top: 72px;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg.primary};

  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.accent.primary};
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const COMMITTEE_MEMBER_ROUTE_PREFIXES = ['/committee', '/portfolio', '/settings'];

export const AppLayout = () => {
  const { isAuthenticated, isLoading, manager } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('crm-sidebar-collapsed') === '1');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((current) => {
      const next = !current;
      localStorage.setItem('crm-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleOverlayClick = () => {
    setIsMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader2 />
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    manager?.role === 'committee_member' &&
    !COMMITTEE_MEMBER_ROUTE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
  ) {
    return <Navigate to="/committee/sessions" replace />;
  }

  return (
    <LayoutContainer>
      <MobileMenuButton onClick={handleMobileMenuToggle} $isActive={isMobileMenuOpen} aria-label={t('common.toggleMenu', 'Toggle menu')}>
        <Menu />
      </MobileMenuButton>
      <MobileOverlay $isOpen={isMobileMenuOpen} onClick={handleOverlayClick} />
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileOpen={isMobileMenuOpen}
        closeMobileMenu={() => setIsMobileMenuOpen(false)}
      />
      <MainContent $isCollapsed={isCollapsed}>
        <Outlet context={{ isCollapsed }} />
      </MainContent>
      <CommitteeVoteNotice />
      <FeedbackButton
        avoidChatComposer={
          location.pathname.startsWith('/chats') ||
          location.pathname.startsWith('/ai-assistant') ||
          location.pathname.startsWith('/committee')
        }
      />
    </LayoutContainer>
  );
};

export default AppLayout;
