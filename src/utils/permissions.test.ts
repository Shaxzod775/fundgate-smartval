import { describe, expect, it } from 'vitest';
import { getAssignableRoles, hasPermission, isDirectorRole, ROLE_BRANCHES } from './permissions';

describe('deputy director permissions', () => {
  it('treats the investment deputy as director-equivalent', () => {
    expect(isDirectorRole('deputy_investment')).toBe(true);
    expect(isDirectorRole('deputy_ma')).toBe(false);
    expect(ROLE_BRANCHES.deputy_investment).toBe('all');
  });

  it.each([
    'team:create',
    'team:edit',
    'team:delete',
    'startup:create',
    'startup:edit',
    'startup:delete',
    'startup:assign',
    'settings:edit_organization',
  ] as const)('grants the director permission %s', (permission) => {
    expect(hasPermission('deputy_investment', permission)).toBe(true);
  });

  it('can assign the same non-CEO roles as the director', () => {
    expect(getAssignableRoles('deputy_investment')).toEqual(getAssignableRoles('ceo'));
  });
});
