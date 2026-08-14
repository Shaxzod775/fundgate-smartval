import type { UserRole } from '../services/api';
import { canEditStartup } from './permissions';

export const DATA_ROOM_URL_MAX_LENGTH = 2048;

export type DataRoomUrlErrorCode =
  | 'required'
  | 'too_long'
  | 'https_required'
  | 'credentials_not_allowed'
  | 'invalid';

export type DataRoomUrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; code: DataRoomUrlErrorCode };

export function validateDataRoomUrl(value: string): DataRoomUrlValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, code: 'required' };
  if (trimmed.length > DATA_ROOM_URL_MAX_LENGTH) return { ok: false, code: 'too_long' };
  if (!/^https:\/\//i.test(trimmed)) return { ok: false, code: 'https_required' };
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return { ok: false, code: 'invalid' };

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      return { ok: false, code: 'https_required' };
    }
    if (parsed.username || parsed.password) {
      return { ok: false, code: 'credentials_not_allowed' };
    }

    const normalized = parsed.toString();
    if (normalized.length > DATA_ROOM_URL_MAX_LENGTH) {
      return { ok: false, code: 'too_long' };
    }
    return { ok: true, url: normalized };
  } catch {
    return { ok: false, code: 'invalid' };
  }
}

export function canEditStartupDataRoom(
  role: UserRole,
  assignedManagerId: string | null | undefined,
  currentUserId: string,
): boolean {
  if (role !== 'manager_investment') return false;
  return canEditStartup(role, assignedManagerId, currentUserId);
}

const DATA_ROOM_LINK_LEADERSHIP_ROLES = new Set<string>([
  'ceo',
  'deputy_investment',
  'deputy_ma',
  'admin',
]);

export function canEditStartupDataRoomLink(
  role: UserRole | 'admin',
  assignedManagerId: string | null | undefined,
  currentUserId: string,
): boolean {
  if (DATA_ROOM_LINK_LEADERSHIP_ROLES.has(role)) return true;
  return role !== 'admin' && canEditStartupDataRoom(role, assignedManagerId, currentUserId);
}
