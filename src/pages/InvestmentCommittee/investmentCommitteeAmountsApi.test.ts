import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { investmentCommitteeApi } from '../../services/api';

describe('Investment Committee shortlist amounts API', () => {
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

  it('sends all fund amounts with the optimistic shortlist export id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: 'meeting-1', stage: 'shortlist_signing' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await investmentCommitteeApi.updateShortlistAmounts('meeting-1', {
      expectedShortlistExportId: 'shortlist-export-1',
      amounts: { 'startup-1': 50_000, 'startup-2': 75_000 },
    });

    expect(response.success).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/meetings/meeting-1/shortlist/amounts');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body))).toEqual({
      expectedShortlistExportId: 'shortlist-export-1',
      amounts: { 'startup-1': 50_000, 'startup-2': 75_000 },
    });
  });

  it('preserves a stale-export conflict from the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: 'shortlist_export_changed',
      message: 'Refresh the shortlist',
    }), {
      status: 409,
      statusText: 'Conflict',
      headers: { 'Content-Type': 'application/json' },
    })));

    const response = await investmentCommitteeApi.updateShortlistAmounts('meeting-1', {
      expectedShortlistExportId: 'stale-export',
      amounts: { 'startup-1': 50_000 },
    });

    expect(response).toMatchObject({
      success: false,
      error: 'shortlist_export_changed',
      message: 'Refresh the shortlist',
    });
  });
});
