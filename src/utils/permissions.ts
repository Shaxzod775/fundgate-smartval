import { UserRole, Branch } from '../services/api';

export const ROLE_LEVELS: Record<UserRole, number> = {
  ceo: 1,
  deputy_investment: 2,
  deputy_ma: 2,
  manager_investment: 3,
  manager_ma: 3,
  financier: 4,
  lawyer: 4,
  tech_specialist: 4,
  committee_member: 5,
};

export const ROLE_BRANCHES: Record<UserRole, Branch | 'all' | 'none'> = {
  ceo: 'all',
  deputy_investment: 'all',
  deputy_ma: 'ma',
  manager_investment: 'investment',
  manager_ma: 'ma',
  financier: 'all',
  lawyer: 'all',
  tech_specialist: 'all',
  committee_member: 'none',
};

export type Permission =
  | 'team:view'
  | 'team:create'
  | 'team:edit'
  | 'team:delete'
  | 'team:reset_password'
  | 'startup:view'
  | 'startup:create'
  | 'startup:edit'
  | 'startup:delete'
  | 'startup:assign'
  | 'startup:change_status'
  | 'startup:add_comment'
  | 'startup:view_ai_analysis'
  | 'dashboard:view'
  | 'dashboard:view_all_stats'
  | 'director:view'
  | 'reports:view'
  | 'reports:export'
  | 'settings:view'
  | 'settings:edit_profile'
  | 'settings:edit_organization'
  | 'director:view';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ceo: [
    'director:view',
    'team:view',
    'team:create',
    'team:edit',
    'team:delete',
    'team:reset_password',
    'startup:view',
    'startup:create',
    'startup:edit',
    'startup:delete',
    'startup:assign',
    'startup:change_status',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'dashboard:view_all_stats',
    'director:view',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:edit_profile',
    'settings:edit_organization',
  ],
  deputy_investment: [
    'director:view',
    'team:view',
    'team:create',
    'team:edit',
    'team:delete',
    'team:reset_password',
    'startup:view',
    'startup:create',
    'startup:edit',
    'startup:delete',
    'startup:assign',
    'startup:change_status',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'dashboard:view_all_stats',
    'director:view',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:edit_profile',
    'settings:edit_organization',
  ],
  deputy_ma: [
    'director:view',
    'startup:view',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'dashboard:view_all_stats',
    'director:view',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:edit_profile',
  ],
  manager_investment: [
    'startup:view',
    'startup:create',
    'startup:edit',
    'startup:change_status',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'reports:view',
    'settings:view',
    'settings:edit_profile',
  ],
  manager_ma: [
    'startup:view',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'reports:view',
    'settings:view',
    'settings:edit_profile',
  ],
  financier: [
    'startup:view',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:edit_profile',
  ],
  lawyer: [
    'startup:view',
    'startup:add_comment',
    'dashboard:view',
    'settings:view',
    'settings:edit_profile',
  ],
  tech_specialist: [
    'startup:view',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'settings:view',
    'settings:edit_profile',
  ],
  committee_member: [
    'startup:view',
    'startup:add_comment',
    'startup:view_ai_analysis',
    'dashboard:view',
    'settings:view',
    'settings:edit_profile',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role] ?? 99;
}

export function isDirectorRole(role: UserRole | string | null | undefined): boolean {
  return role === 'ceo' || role === 'deputy_investment';
}

export function isRoleHigherOrEqual(userRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(userRole) <= getRoleLevel(targetRole);
}

export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  if (isDirectorRole(managerRole)) {
    return targetRole !== 'ceo';
  }

  if (getRoleLevel(managerRole) >= getRoleLevel(targetRole)) {
    return false;
  }

  const managerBranch = ROLE_BRANCHES[managerRole];
  const targetBranch = ROLE_BRANCHES[targetRole];

  if (managerBranch === 'all') {
    return true;
  }

  if (targetBranch === 'all' || targetBranch === 'none') {
    return getRoleLevel(managerRole) < getRoleLevel(targetRole);
  }

  return managerBranch === targetBranch;
}

export function getAssignableRoles(userRole: UserRole): UserRole[] {
  const userLevel = getRoleLevel(userRole);
  const userBranch = ROLE_BRANCHES[userRole];

  return (Object.keys(ROLE_LEVELS) as UserRole[]).filter((role) => {
    if (isDirectorRole(userRole)) {
      return role !== 'ceo';
    }

    if (getRoleLevel(role) <= userLevel) {
      return false;
    }

    const roleBranch = ROLE_BRANCHES[role];
    if (roleBranch === 'all' || roleBranch === 'none') {
      return true;
    }

    return userBranch === 'all' || userBranch === roleBranch;
  });
}

export type StartupStatus = 'new' | 'in_review' | 'pipeline' | 'portfolio' | 'rejected';

const STATUS_TRANSITIONS: Record<StartupStatus, StartupStatus[]> = {
  new: ['in_review', 'rejected'],
  in_review: ['pipeline', 'rejected', 'new'],
  pipeline: ['portfolio', 'rejected', 'in_review'],
  portfolio: ['rejected'],
  rejected: ['new', 'in_review'],
};

export function canChangeStatus(
  role: UserRole,
  currentStatus: StartupStatus,
  newStatus: StartupStatus
): boolean {
  if (!hasPermission(role, 'startup:change_status')) {
    return false;
  }

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions?.includes(newStatus)) {
    return false;
  }

  if (newStatus === 'portfolio') {
    return getRoleLevel(role) <= 2;
  }

  return true;
}

export function canViewStartup(
  role: UserRole,
  assignedManagerId: string | null | undefined,
  currentUserId: string
): boolean {
  if (getRoleLevel(role) <= 2) {
    return true;
  }

  if (role === 'committee_member') {
    return true;
  }

  if (getRoleLevel(role) === 4) {
    return true;
  }

  return !assignedManagerId || assignedManagerId === currentUserId;
}

export function canEditStartup(
  role: UserRole,
  assignedManagerId: string | null | undefined,
  currentUserId: string
): boolean {
  if (!hasPermission(role, 'startup:edit')) {
    return false;
  }

  if (getRoleLevel(role) <= 2) {
    return true;
  }

  return assignedManagerId === currentUserId;
}
