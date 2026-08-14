import { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CrmImage } from '../ui/CrmImage';

const BadgeContainer = styled.div<{ $isSidebar?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 4px;
  width: ${({ $isSidebar }) => ($isSidebar ? '100%' : 'auto')};
  min-width: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const AvatarsGroup = styled.div<{ $isCollapsed?: boolean }>`
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  width: ${({ $isCollapsed }) => ($isCollapsed ? '40px' : '88px')};
  height: 40px;
  justify-content: center;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const FundAvatar = styled.div<{ $isCollapsed?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => (theme.mode === 'light' ? theme.colors.bg.tertiary : '#000')};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
  position: absolute;
  left: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
  transform: ${({ $isCollapsed }) => ($isCollapsed ? 'scale(0.8) translateX(-10px)' : 'scale(1) translateX(0)')};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const ManagerAvatar = styled.div<{ $isCollapsed?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 2px solid ${({ theme }) => theme.colors.accent.primary};
  overflow: hidden;
  position: absolute;
  right: 0;
  z-index: 2;
  box-shadow: ${({ theme }) => theme.shadows.glow};
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 24px;
    height: 24px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Info = styled.div<{ $isCollapsed?: boolean }>`
  display: flex;
  flex-direction: column;
  padding-right: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '4px')};
  margin-left: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '4px')};
  flex: ${({ $isCollapsed }) => ($isCollapsed ? '0 0 auto' : '1 1 auto')};
  min-width: 0;
  max-width: ${({ $isCollapsed }) => ($isCollapsed ? '0' : '120px')};
  opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  white-space: nowrap;
`;

const ManagerName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FallbackLetter = styled.span<{ $color?: string }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $color }) => $color || '#fff'};
  text-transform: uppercase;
  user-select: none;
`;

const SettingsAction = styled.button<{ $isCollapsed?: boolean }>`
  display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'inline-flex')};
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

interface UserProfileBadgeProps {
  isCollapsed?: boolean;
}

export const UserProfileBadge = ({ isCollapsed }: UserProfileBadgeProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { manager, organization, isLoading } = useAuth();
  const [orgLogoError, setOrgLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const displayName = isLoading ? t('common.loading', 'Loading...') : (manager?.name || t('common.manager', 'Manager'));
  const avatarUrl = manager?.avatar;
  const orgLogo = organization?.logo;
  const orgName = organization?.name || 'F';

  return (
    <BadgeContainer $isSidebar={typeof isCollapsed === 'boolean'} onClick={() => navigate('/settings')} title={t('nav.settings', 'Settings')}>
      <AvatarsGroup $isCollapsed={isCollapsed}>
        <FundAvatar $isCollapsed={isCollapsed}>
          {orgLogo && !orgLogoError ? (
            <CrmImage src={orgLogo} alt={orgName} onError={() => setOrgLogoError(true)} />
          ) : (
            <FallbackLetter>{orgName.charAt(0)}</FallbackLetter>
          )}
        </FundAvatar>
        <ManagerAvatar $isCollapsed={isCollapsed}>
          {avatarUrl && !avatarError ? (
            <CrmImage src={avatarUrl} alt={displayName} onError={() => setAvatarError(true)} />
          ) : (
            <FallbackLetter $color="#10b981">{displayName.charAt(0)}</FallbackLetter>
          )}
        </ManagerAvatar>
      </AvatarsGroup>

      <Info $isCollapsed={isCollapsed}>
        <ManagerName>{displayName}</ManagerName>
      </Info>

      <SettingsAction
        type="button"
        $isCollapsed={isCollapsed}
        aria-label={t('settings.openSettings', 'Open settings')}
        title={t('nav.settings', 'Settings')}
        onClick={(event) => {
          event.stopPropagation();
          navigate('/settings?tab=app');
        }}
      >
        <Settings />
      </SettingsAction>
    </BadgeContainer>
  );
};
