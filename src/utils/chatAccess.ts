import type { Manager, Organization } from '../services/api';

const CHAT_ROLES = new Set<string>([
  'ceo',
  'deputy_investment',
  'deputy_ma',
  'manager_investment',
]);

export function isChatRole(manager?: Pick<Manager, 'role'> | null): boolean {
  return Boolean(manager?.role && CHAT_ROLES.has(manager.role));
}

export function canUseChats(
  manager?: Pick<Manager, 'organizationId' | 'role'> | null,
  organization?: Pick<Organization, 'id' | 'name'> | null,
) {
  return Boolean(
    isChatRole(manager)
    && (!organization?.id || manager?.organizationId === organization.id)
  );
}
