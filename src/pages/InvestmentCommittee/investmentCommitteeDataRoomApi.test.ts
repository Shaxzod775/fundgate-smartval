import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { investmentCommitteeApi } from '../../services/api';
import { isDataRoomRequiredError } from './dataRoomGate';

const blockerResponse = {
  success: false,
  error: 'data_room_required',
  message: 'Blocked',
  data: {
    blockedTransition: { from: 'draft', to: 'shortlist_signing' },
    meetingUpdatedAt: '2026-07-15T10:00:00.000Z',
    blockers: [{
      startupId: 'startup-1',
      startupName: 'Alpha',
      reasonCode: 'missing_data_room_url',
      message: 'Missing link',
    }],
  },
};

function conflictResponse(): Response {
  return new Response(JSON.stringify(blockerResponse), {
    status: 409,
    statusText: 'Conflict',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Investment Committee Data Room API', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves structured blockers from finalize and signed-upload 409 responses', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(conflictResponse()));
    vi.stubGlobal('fetch', fetchMock);

    const finalize = await investmentCommitteeApi.finalizeShortlist('meeting-1', { startupIds: ['startup-1'] });
    const upload = await investmentCommitteeApi.uploadSignedShortlist('meeting-1', {
      fileBase64: 'data:application/pdf;base64,QQ==',
      fileName: 'signed.pdf',
      contentType: 'application/pdf',
      shortlistExportId: 'shortlist-export-1',
    });

    expect(isDataRoomRequiredError(finalize)).toBe(true);
    expect(isDataRoomRequiredError(upload)).toBe(true);
    if (isDataRoomRequiredError(finalize)) {
      expect(finalize.data.blockers[0].startupId).toBe('startup-1');
      expect(finalize.data.meetingUpdatedAt).toBe('2026-07-15T10:00:00.000Z');
    }
    expect(String(fetchMock.mock.calls[0][0])).toContain('/meetings/meeting-1/shortlist/finalize');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/meetings/meeting-1/shortlist/upload-signed');
  });

  it('sends the optimistic version, inline shortlist and trimmed reasons', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: 'meeting-1', organizationId: 'org-1', title: 'Meeting', status: 'planned' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await investmentCommitteeApi.saveDataRoomBlockerReasons('meeting-1', {
      expectedMeetingUpdatedAt: '2026-07-15T10:00:00.000Z',
      shortlistPatch: {
        startupIds: ['startup-1'],
        protocol: { presentedProjects: [{ startupId: 'startup-1' }] },
      },
      reasons: [{ startupId: 'startup-1', reason: 'Founder is granting access' }],
    });

    expect(response.success).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/meetings/meeting-1/data-room-blocker-reasons');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      expectedMeetingUpdatedAt: '2026-07-15T10:00:00.000Z',
      shortlistPatch: {
        startupIds: ['startup-1'],
        protocol: { presentedProjects: [{ startupId: 'startup-1' }] },
      },
      reasons: [{ startupId: 'startup-1', reason: 'Founder is granting access' }],
    });
  });
});
