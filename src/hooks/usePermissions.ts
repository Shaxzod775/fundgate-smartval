import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/api';
import {
  Permission,
  StartupStatus,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLevel,
  isRoleHigherOrEqual,
  canManageUser,
  getAssignableRoles,
  canChangeStatus,
  canViewStartup,
  canEditStartup,
  isDirectorRole,
} from '../utils/permissions';

export function usePermissions() {
  const { manager } = useAuth();

  const userRole = (manager?.role as UserRole) || 'committee_member';
  const userId = manager?.id || '';

  return useMemo(
    () => ({
      role: userRole,
      userId,
      roleLevel: getRoleLevel(userRole),

      can: (permission: Permission) => hasPermission(userRole, permission),
      canAny: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
      canAll: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),

      isHigherOrEqual: (targetRole: UserRole) => isRoleHigherOrEqual(userRole, targetRole),
      canManage: (targetRole: UserRole) => canManageUser(userRole, targetRole),
      getAssignableRoles: () => getAssignableRoles(userRole),

      canChangeStatus: (currentStatus: StartupStatus, newStatus: StartupStatus) =>
        canChangeStatus(userRole, currentStatus, newStatus),
      canViewStartup: (assignedManagerId: string | null | undefined) =>
        canViewStartup(userRole, assignedManagerId, userId),
      canEditStartup: (assignedManagerId: string | null | undefined) =>
        canEditStartup(userRole, assignedManagerId, userId),

      isAdmin: getRoleLevel(userRole) <= 2, // CEO or Deputies
      isCeo: userRole === 'ceo',
      isDirector: isDirectorRole(userRole),
      isDeputy: userRole === 'deputy_investment' || userRole === 'deputy_ma',
      isManager: userRole === 'manager_investment' || userRole === 'manager_ma',
      isSpecialist: ['financier', 'lawyer', 'tech_specialist'].includes(userRole),
      isCommitteeMember: userRole === 'committee_member',

      canViewTeam: hasPermission(userRole, 'team:view'),
      canCreateTeamMember: hasPermission(userRole, 'team:create'),
      canEditTeamMember: hasPermission(userRole, 'team:edit'),
      canDeleteTeamMember: hasPermission(userRole, 'team:delete'),
      canResetPassword: hasPermission(userRole, 'team:reset_password'),

      canViewStartups: hasPermission(userRole, 'startup:view'),
      canModifyStartups: hasPermission(userRole, 'startup:edit'),
      canCreateStartup: hasPermission(userRole, 'startup:create'),
      canAssignStartup: hasPermission(userRole, 'startup:assign'),
      canDeleteStartup: hasPermission(userRole, 'startup:delete'),
      canAddComment: hasPermission(userRole, 'startup:add_comment'),
      canViewAiAnalysis: hasPermission(userRole, 'startup:view_ai_analysis'),

      canViewDashboard: hasPermission(userRole, 'dashboard:view'),
      canViewAllStats: hasPermission(userRole, 'dashboard:view_all_stats'),

      canEditOrganization: hasPermission(userRole, 'settings:edit_organization'),
    }),
    [userRole, userId]
  );
}

export default usePermissions;
