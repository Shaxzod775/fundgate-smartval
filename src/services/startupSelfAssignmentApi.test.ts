import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startupsApi } from './api';

describe('startup self-assignment API', () => {
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

  it('uses the dedicated authenticated endpoint without a client-supplied manager id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { id: 'startup-1', assignedManagerId: 'manager-1' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await startupsApi.selfAssign('startup-1');

    expect(response.success).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/crm/startups/startup-1/self-assignment');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
  });
});
