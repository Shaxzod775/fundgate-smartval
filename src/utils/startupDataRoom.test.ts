import { describe, expect, it } from 'vitest';
import {
  DATA_ROOM_URL_MAX_LENGTH,
  canEditStartupDataRoom,
  canEditStartupDataRoomLink,
  validateDataRoomUrl,
} from './startupDataRoom';

describe('validateDataRoomUrl', () => {
  it('trims and normalizes an absolute HTTPS URL', () => {
    expect(validateDataRoomUrl('  https://drive.google.com/folder?id=1  ')).toEqual({
      ok: true,
      url: 'https://drive.google.com/folder?id=1',
    });
  });

  it.each([
    ['', 'required'],
    ['drive.google.com/folder', 'https_required'],
    ['http://drive.google.com/folder', 'https_required'],
    ['javascript:alert(1)', 'https_required'],
    ['https:drive.google.com/folder', 'https_required'],
    ['https://user:password@example.com/folder', 'credentials_not_allowed'],
    ['https://exa mple.com/folder', 'invalid'],
  ] as const)('rejects %j with %s', (value, code) => {
    expect(validateDataRoomUrl(value)).toEqual({ ok: false, code });
  });

  it('rejects URLs over the maximum length', () => {
    const value = `https://example.com/${'a'.repeat(DATA_ROOM_URL_MAX_LENGTH)}`;
    expect(validateDataRoomUrl(value)).toEqual({ ok: false, code: 'too_long' });
  });
});

describe('canEditStartupDataRoom', () => {
  it('keeps the CEO review-only', () => {
    expect(canEditStartupDataRoom('ceo', 'manager-2', 'ceo-1')).toBe(false);
  });

  it('allows only the assigned investment manager', () => {
    expect(canEditStartupDataRoom('manager_investment', 'manager-1', 'manager-1')).toBe(true);
    expect(canEditStartupDataRoom('manager_investment', 'manager-2', 'manager-1')).toBe(false);
    expect(canEditStartupDataRoom('manager_investment', undefined, 'manager-1')).toBe(false);
  });

  it.each(['deputy_investment', 'manager_ma', 'committee_member'] as const)(
    'keeps %s read-only',
    (role) => {
      expect(canEditStartupDataRoom(role, 'manager-1', 'manager-1')).toBe(false);
    },
  );
});

describe('canEditStartupDataRoomLink', () => {
  it.each(['ceo', 'deputy_investment', 'deputy_ma', 'admin'] as const)(
    'lets fund leadership role %s edit the link',
    (role) => {
      expect(canEditStartupDataRoomLink(role, 'manager-1', 'leader-1')).toBe(true);
    },
  );

  it('keeps the assigned-manager rule for non-leadership roles', () => {
    expect(canEditStartupDataRoomLink('manager_investment', 'manager-1', 'manager-1')).toBe(true);
    expect(canEditStartupDataRoomLink('manager_investment', 'manager-1', 'manager-2')).toBe(false);
    expect(canEditStartupDataRoomLink('manager_ma', 'manager-1', 'manager-1')).toBe(false);
  });
});
