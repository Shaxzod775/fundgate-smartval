import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadCrmFile } from './api';

describe('downloadCrmFile', () => {
  const createObjectUrl = vi.fn(() => 'blob:crm-download');
  const revokeObjectUrl = vi.fn();
  const signedUrl = 'https://storage.googleapis.com/fundgate-test/memo.docx?X-Goog-Signature=test';

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => key === 'authToken' ? 'test-token' : null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data: { url: signedUrl } }),
    })));
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    createObjectUrl.mockClear();
    revokeObjectUrl.mockClear();
  });

  it('resolves a signed URL with auth while preserving startup and bucket parameters', async () => {
    const encodedPath = 'cGVuZGluZy11cGxvYWRzL3VwbG9hZC0xL0RlY2sucGRm';
    const url = `https://crm-api.example/crm/files/${encodedPath}?startup=startup-1&bucket=fundgate-smartval-v2-dev-storage`;
    const anchor = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    await downloadCrmFile(url);

    expect(fetch).toHaveBeenCalledWith(
      `/crm/files/${encodedPath}?startup=startup-1&bucket=fundgate-smartval-v2-dev-storage&json=1&download=1`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe(signedUrl);
  });

  it('uses the decoded object filename for the signed download navigation', async () => {
    const anchor = document.createElement('a');
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const encodedPath = 'cGVuZGluZy11cGxvYWRzL3VwbG9hZC0xL0RlY2sucGRm';

    await downloadCrmFile(`https://crm-api.example/crm/files/${encodedPath}?startup=startup-1`);

    expect(createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('Deck.pdf');
  });

  it('sends the display filename to the API so the signature carries it', async () => {
    const encodedPath = 'cGVuZGluZy11cGxvYWRzL3VwbG9hZC0xL0RlY2sucGRm';
    const anchor = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    await downloadCrmFile(
      `https://crm-api.example/crm/files/${encodedPath}`,
      'Питч-дек «Аcme» v2.pdf',
    );

    expect(fetch).toHaveBeenCalledWith(
      `/crm/files/${encodedPath}?json=1&download=1&name=${encodeURIComponent('Питч-дек «Аcme» v2.pdf')}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('omits the name parameter when no display filename is known', async () => {
    const encodedPath = 'cGVuZGluZy11cGxvYWRzL3VwbG9hZC0xL0RlY2sucGRm';
    const anchor = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    await downloadCrmFile(`https://crm-api.example/crm/files/${encodedPath}`, '   ');

    expect(fetch).toHaveBeenCalledWith(
      `/crm/files/${encodedPath}?json=1&download=1`,
      expect.anything(),
    );
  });

  it('uses the authenticated stream only when the API explicitly returns one', async () => {
    const encodedPath = 'b3JnYW5pemF0aW9ucy9vcmctMS9tZW1vLmRvY3g';
    const streamUrl = `https://crm-api.example/crm/files/${encodedPath}?startup=startup-1`;
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { url: null, streamUrl } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['memo'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      } as Response);

    await downloadCrmFile(streamUrl, 'investment-memo.docx');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/crm/files/${encodedPath}?startup=startup-1&json=1&download=1&name=investment-memo.docx`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/crm/files/${encodedPath}?startup=startup-1`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
  });
});
