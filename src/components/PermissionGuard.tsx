import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../utils/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

const AccessDeniedContainer = styled.div`
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
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  svg {
    width: 40px;
    height: 40px;
    color: #ef4444;
  }
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.muted};
  max-width: 400px;
`;

const DefaultAccessDenied = () => {
  const { t } = useTranslation();

  return (
    <AccessDeniedContainer>
      <IconWrapper>
        <ShieldX />
      </IconWrapper>
      <Title>{t('common.accessDenied')}</Title>
      <Description>{t('common.accessDeniedDescription')}</Description>
    </AccessDeniedContainer>
  );
};

export const PermissionGuard = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  redirectTo,
}: PermissionGuardProps) => {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{fallback || <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
};

export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: Permission
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

export default PermissionGuard;
