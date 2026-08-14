import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveCrmFileUrl } from './api';

describe('resolveCrmFileUrl: один поход на объект', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  function proxyUrl(name: string): string {
    return `https://crm-api.example/crm/files/${name}`;
  }

  function callsFor(name: string): number {
    return fetchMock.mock.calls.filter(([url]) => String(url).includes(name)).length;
  }

  function respondSigned(name: string) {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { url: `https://storage.googleapis.com/b/${name}?X-Goog-Signature=s` } }),
    }));
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => (key === 'authToken' ? 'test-token' : null)),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:crm-file'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('десять карточек с одним аватаром дают один запрос, а не десять', async () => {
    const name = 'avatar-parallel';
    respondSigned(name);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => resolveCrmFileUrl(proxyUrl(name))),
    );

    expect(callsFor(name)).toBe(1);
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toContain('X-Goog-Signature=');
  });

  it('повторный запрос после первого берётся из кеша', async () => {
    const name = 'avatar-sequential';
    respondSigned(name);

    const first = await resolveCrmFileUrl(proxyUrl(name));
    const second = await resolveCrmFileUrl(proxyUrl(name));

    expect(callsFor(name)).toBe(1);
    expect(second).toBe(first);
  });

  it('на 404 не тянет тот же путь второй раз потоком', async () => {
    const name = 'missing-object';
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'File not found' }),
    }));

    expect(await resolveCrmFileUrl(proxyUrl(name))).toBeNull();
    expect(callsFor(name)).toBe(1);
  });

  it('отсутствующий объект не обстреливается заново на каждый ре-рендер', async () => {
    const name = 'missing-repeated';
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: 'File not found' }),
    }));

    for (let i = 0; i < 5; i += 1) {
      expect(await resolveCrmFileUrl(proxyUrl(name))).toBeNull();
    }
    expect(callsFor(name)).toBe(1);
  });

  it('когда подпись недоступна, поток качается каждым вызывающим отдельно', async () => {
    const name = 'stream-mode';
    fetchMock.mockImplementation(async (url: string) => (
      String(url).includes('json=1')
        ? { ok: true, status: 200, json: async () => ({ success: true, data: { url: null, mode: 'stream' } }) }
        : { ok: true, status: 200, blob: async () => new Blob(['x']) }
    ));

    await Promise.all([resolveCrmFileUrl(proxyUrl(name)), resolveCrmFileUrl(proxyUrl(name))]);

    const jsonCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes(name) && String(u).includes('json=1'));
    const streamCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes(name) && !String(u).includes('json=1'));
    expect(jsonCalls).toHaveLength(1);
    expect(streamCalls).toHaveLength(2);
  });

  it('ссылку не через прокси отдаёт как есть и никуда не ходит', async () => {
    const direct = 'https://example.com/logo.png';
    expect(await resolveCrmFileUrl(direct)).toBe(direct);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
