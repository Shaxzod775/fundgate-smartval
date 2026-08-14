import { describe, expect, it } from 'vitest';
import type { DataRoomBlocker, DataRoomGateApiResponse } from '../../services/api';
import {
  areAllDataRoomReasonsValid,
  initialDataRoomReasons,
  isDataRoomRequiredError,
  isValidDataRoomReason,
  toDataRoomReasonInputs,
} from './dataRoomGate';

const blockers: DataRoomBlocker[] = [
  {
    startupId: 'startup-1',
    startupName: 'Alpha',
    reasonCode: 'missing_data_room_url',
    message: 'Missing',
    managerReason: 'Founder is preparing access',
  },
  {
    startupId: 'startup-2',
    startupName: 'Beta',
    reasonCode: 'invalid_data_room_url',
    message: 'Invalid',
  },
];

describe('Investment Committee Data Room gate helpers', () => {
  it('recognizes only the structured data_room_required response', () => {
    const response: DataRoomGateApiResponse<unknown> = {
      success: false,
      error: 'data_room_required',
      message: 'Blocked',
      data: {
        blockedTransition: { from: 'draft', to: 'shortlist_signing' },
        meetingUpdatedAt: '2026-07-15T10:00:00.000Z',
        blockers,
      },
    };

    expect(isDataRoomRequiredError(response)).toBe(true);
    expect(isDataRoomRequiredError({ success: false, error: 'conflict' })).toBe(false);
  });

  it('validates trimmed reasons for every blocker', () => {
    expect(isValidDataRoomReason('  ok  ')).toBe(false);
    expect(isValidDataRoomReason('  ready soon  ')).toBe(true);
    expect(isValidDataRoomReason('x'.repeat(1001))).toBe(false);
    expect(areAllDataRoomReasonsValid(blockers, {
      'startup-1': 'Founder is preparing access',
      'startup-2': '  ',
    })).toBe(false);
    expect(areAllDataRoomReasonsValid(blockers, {
      'startup-1': 'Founder is preparing access',
      'startup-2': 'New link requested',
    })).toBe(true);
  });

  it('prefills saved notes and trims the save payload', () => {
    expect(initialDataRoomReasons(blockers)).toEqual({
      'startup-1': 'Founder is preparing access',
      'startup-2': '',
    });
    expect(toDataRoomReasonInputs(blockers, {
      'startup-1': '  Founder is preparing access  ',
      'startup-2': '  New link requested ',
    })).toEqual([
      { startupId: 'startup-1', reason: 'Founder is preparing access' },
      { startupId: 'startup-2', reason: 'New link requested' },
    ]);
  });
});
