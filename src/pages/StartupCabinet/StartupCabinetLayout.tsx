import React from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, FileText, LogOut, Loader2 } from 'lucide-react';
import { StartupAuthProvider, useStartupAuth } from '../../contexts/StartupAuthContext';

const LayoutContainer = styled.div`
  min-height: 100vh;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
`;

const Navbar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  padding: 0 ${({ theme }) => theme.spacing[6]};
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 600px) {
    padding: 0 ${({ theme }) => theme.spacing[3]};
    height: 56px;
  }
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 600px) {
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const Logo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;

  span {
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  @media (max-width: 600px) {
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.muted};
  text-decoration: none;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  &.active {
    color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }

  @media (max-width: 600px) {
    padding: ${({ theme }) => theme.spacing[2]};
    font-size: ${({ theme }) => theme.fontSizes.sm};

    span {
      display: none;
    }
  }
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 600px) {
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const StartupName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 600px) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.status.danger};
    border-color: ${({ theme }) => theme.colors.status.dangerBorder};
    background: ${({ theme }) => theme.colors.status.dangerBg};
  }

  @media (max-width: 600px) {
    padding: ${({ theme }) => theme.spacing[2]};
    span { display: none; }
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0a0a0a;

  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.accent.primary};
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const CabinetLayoutInner: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, startup, logout } = useStartupAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <LoadingContainer>
        <Loader2 />
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/cabinet/login" state={{ from: location }} replace />;
  }

  return (
    <LayoutContainer>
      <Navbar>
        <NavLeft>
          <Logo>
            Fund<span>Gate</span>
          </Logo>
          <NavLinks>
            <StyledNavLink to="/cabinet" end>
              <LayoutDashboard size={18} />
              <span>{t('cabinet.nav.dashboard', 'Dashboard')}</span>
            </StyledNavLink>
            <StyledNavLink to="/cabinet/reports">
              <FileText size={18} />
              <span>{t('cabinet.nav.reports', 'Reports')}</span>
            </StyledNavLink>
          </NavLinks>
        </NavLeft>
        <NavRight>
          <StartupName>{startup?.companyName || startup?.name}</StartupName>
          <LogoutButton onClick={logout}>
            <LogOut size={16} />
            <span>{t('cabinet.nav.logout', 'Logout')}</span>
          </LogoutButton>
        </NavRight>
      </Navbar>
      <MainContent>
        <Outlet />
      </MainContent>
    </LayoutContainer>
  );
};

export const StartupCabinetLayout: React.FC = () => {
  return (
    <StartupAuthProvider>
      <CabinetLayoutInner />
    </StartupAuthProvider>
  );
};

export default StartupCabinetLayout;
