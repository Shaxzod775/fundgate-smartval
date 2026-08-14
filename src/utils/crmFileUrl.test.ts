import { describe, expect, it } from 'vitest';
import { fileNameFromUrl, privateStoragePath, toAuthenticatedCrmFileUrl, toSafeCrmFileHref } from './crmFileUrl';

function decodeProxyPath(url: string): string {
  const encoded = url.split('/crm/files/')[1].split('?')[0];
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

describe('private CRM file URLs', () => {
  it.each([
    ['gs://fundgate-smartval-v2-storage/submissions/abc/deck.pdf', 'submissions/abc/deck.pdf'],
    ['storage.googleapis.com/fundgate-smartval-v2-dev-storage/documents/a.pdf', 'documents/a.pdf'],
    ['https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/org/startups/id/deck.pdf', 'organizations/org/startups/id/deck.pdf'],
    ['https://storage.googleapis.com/fundgate-smartval.firebasestorage.app/submissions/83dccbd3-e02a-455a-bd7c-902cc21c6344/pitchDeck/14a84d78577440579ef80a9bbd2707fe.pdf', 'submissions/83dccbd3-e02a-455a-bd7c-902cc21c6344/pitchDeck/14a84d78577440579ef80a9bbd2707fe.pdf'],
    ['https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2-storage/o/submissions%2Fabc%2Fdeck.pdf?alt=media', 'submissions/abc/deck.pdf'],
    ['pending-uploads/id/file.docx', 'pending-uploads/id/file.docx'],
  ])('extracts %s', (input, expected) => {
    expect(privateStoragePath(input)).toBe(expected);
  });

  it('routes a private object through the authenticated API', () => {
    const result = toAuthenticatedCrmFileUrl(
      'https://storage.googleapis.com/fundgate-smartval-v2-storage/documents/отчёт.pdf',
      'https://crm-api.example/',
    );
    expect(result).toMatch(/^https:\/\/crm-api\.example\/crm\/files\//);
    expect(decodeProxyPath(result)).toBe('documents/отчёт.pdf');
  });

  it('preserves an explicit dev bucket for authenticated production reads', () => {
    const result = toAuthenticatedCrmFileUrl(
      'https://storage.googleapis.com/fundgate-smartval-v2-dev-storage/submissions/crm-startup/deck.pdf',
      'https://crm-api.example',
    );
    expect(decodeProxyPath(result)).toBe('submissions/crm-startup/deck.pdf');
    expect(new URL(result).searchParams.get('bucket')).toBe('fundgate-smartval-v2-dev-storage');
  });

  it('re-authorizes an expired signature through the CRM proxy', () => {
    const signed = 'https://storage.googleapis.com/fundgate-smartval-v2-storage/a.pdf?X-Goog-Signature=abc';
    expect(decodeProxyPath(toAuthenticatedCrmFileUrl(signed, ''))).toBe('a.pdf');
  });

  it('оставляет tokenized firebasestorage-ссылку как есть', () => {
    const tokenized = 'https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2-storage/o/submissions%2Fabc%2Fa.pdf?alt=media&token=6f1c2a3b';
    expect(privateStoragePath(tokenized)).toBeNull();
    expect(toAuthenticatedCrmFileUrl(tokenized, 'https://crm-api.example')).toBe(tokenized);
    expect(toSafeCrmFileHref(tokenized, 'https://crm-api.example')).toBe(tokenized);
  });

  it.each([
    ['без token', 'https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2-storage/o/submissions%2Fabc%2Fa.pdf?alt=media'],
    ['с пустым token', 'https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2-storage/o/submissions%2Fabc%2Fa.pdf?alt=media&token='],
    ['с пробельным token', 'https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2-storage/o/submissions%2Fabc%2Fa.pdf?alt=media&token=%20'],
  ])('переподписывает firebasestorage-ссылку %s', (_label, input) => {
    expect(decodeProxyPath(toAuthenticatedCrmFileUrl(input, ''))).toBe('submissions/abc/a.pdf');
  });

  it('keeps external and existing proxy URLs intact', () => {
    const external = 'https://example.com/report.pdf';
    const proxy = 'https://crm-api.example/crm/files/YQ';
    const activeFirebaseBucket = 'https://firebasestorage.googleapis.com/v0/b/fundgate-smartval-v2.firebasestorage.app/o/apply-submissions%2Fabc%2Fdeck.pdf?alt=media&token=abc';
    expect(toAuthenticatedCrmFileUrl(external, '')).toBe(external);
    expect(toAuthenticatedCrmFileUrl(proxy, '')).toBe(proxy);
    expect(toAuthenticatedCrmFileUrl(activeFirebaseBucket, '')).toBe(activeFirebaseBucket);
  });

  it('shows the original filename for authenticated proxy URLs', () => {
    const result = toAuthenticatedCrmFileUrl(
      'gs://fundgate-smartval-v2-storage/pending-uploads/upload-1/Deck для OYNA.pdf',
      'https://crm-api.example',
    );
    expect(fileNameFromUrl(result, 'Pitch deck')).toBe('Deck для OYNA.pdf');
  });

  describe('startup-контекст в прокси-ссылке', () => {
    it('дописывает ?startup=<id> к легаси-пути submissions/<uuid>/…', () => {
      const result = toAuthenticatedCrmFileUrl(
        'submissions/83dccbd3-e02a-455a-bd7c-902cc21c6344/pitchDeck/deck.pdf',
        'https://crm-api.example',
        'crm-startup-1',
      );
      expect(new URL(result).searchParams.get('startup')).toBe('crm-startup-1');
      expect(decodeProxyPath(result)).toBe('submissions/83dccbd3-e02a-455a-bd7c-902cc21c6344/pitchDeck/deck.pdf');
    });

    it('сохраняет и bucket, и startup одновременно', () => {
      const result = toAuthenticatedCrmFileUrl(
        'https://storage.googleapis.com/fundgate-smartval-v2-dev-storage/submissions/abc/deck.pdf',
        'https://crm-api.example',
        'crm-startup-1',
      );
      const params = new URL(result).searchParams;
      expect(params.get('bucket')).toBe('fundgate-smartval-v2-dev-storage');
      expect(params.get('startup')).toBe('crm-startup-1');
    });

    it('доносит startup и через toSafeCrmFileHref', () => {
      const href = toSafeCrmFileHref('submissions/abc/deck.pdf', 'https://crm-api.example', 'crm-startup-1');
      expect(new URL(href).searchParams.get('startup')).toBe('crm-startup-1');
    });

    it.each([
      ['пустой id', ''],
      ['пробельный id', '   '],
      ['id со слэшем — прокси ответил бы 400', 'crm/startup'],
      ['id не передан', undefined],
    ])('не добавляет startup при %s', (_label, startupId) => {
      const result = toAuthenticatedCrmFileUrl('submissions/abc/deck.pdf', 'https://crm-api.example', startupId);
      expect(result).not.toContain('startup=');
    });
  });

  it('rejects path traversal and unrelated buckets', () => {
    expect(privateStoragePath('documents/../secret')).toBeNull();
    expect(privateStoragePath('gs://someone-else/private.pdf')).toBeNull();
  });
});

describe('fileNameFromUrl', () => {
  it('decodes a valid encoded filename', () => {
    expect(fileNameFromUrl('https://example.com/files/Investor%20deck.pdf?token=abc', 'Document'))
      .toBe('Investor deck.pdf');
    expect(fileNameFromUrl('documents/Investor%20deck.pdf?token=%broken', 'Document'))
      .toBe('Investor deck.pdf');
  });

  it.each([
    'https://example.com/files/Investor%deck.pdf',
    'documents/Investor%E0%A4%A.pdf?token=abc',
  ])('keeps a malformed encoded filename without throwing: %s', (url) => {
    expect(() => fileNameFromUrl(url, 'Document')).not.toThrow();
    expect(fileNameFromUrl(url, 'Document')).toBe(url.split('/').pop()?.split('?')[0]);
  });

  it('uses the fallback when the URL has no filename', () => {
    expect(fileNameFromUrl('https://example.com/', 'Document')).toBe('Document');
  });
});


const PUBLIC_BUCKET_LINK = 'storage.googleapis.com/fundgate-smartval-v2-storage';

describe('toSafeCrmFileHref', () => {
  it.each([
    ['голый storagePath', 'submissions/abc/deck.pdf'],
    ['голый documents-путь', 'documents/abc/term-sheet.pdf'],
    ['голый pending-uploads-путь', 'pending-uploads/upload-1/deck.pdf'],
    ['gs://', 'gs://fundgate-smartval-v2-storage/submissions/abc/deck.pdf'],
    ['bucket/path', 'fundgate-smartval-v2-storage/submissions/abc/deck.pdf'],
    ['публичный URL', 'https://storage.googleapis.com/fundgate-smartval-v2-storage/submissions/abc/deck.pdf'],
    ['бессхемный публичный URL', 'storage.googleapis.com/fundgate-smartval-v2-storage/submissions/abc/deck.pdf'],
  ])('переводит %s на авторизованный прокси, а не на публичный бакет', (_label, input) => {
    const href = toSafeCrmFileHref(input, 'https://crm-api.example');
    expect(href).toContain('/crm/files/');
    expect(href).not.toContain(PUBLIC_BUCKET_LINK);
  });

  it('не ломает относительный прокси-URL при пустой базе API (dev)', () => {
    expect(toSafeCrmFileHref('submissions/abc/deck.pdf', '')).toMatch(/^\/crm\/files\//);
  });

  it('пропускает внешние ссылки и пустое значение', () => {
    expect(toSafeCrmFileHref('https://example.com/report.pdf', '')).toBe('https://example.com/report.pdf');
    expect(toSafeCrmFileHref('example.com/report.pdf', '')).toBe('https://example.com/report.pdf');
    expect(toSafeCrmFileHref('', '')).toBe('');
    expect(toSafeCrmFileHref(null, '')).toBe('');
  });

  it('отбрасывает javascript: и прочие небезопасные схемы', () => {
    expect(toSafeCrmFileHref('javascript:alert(1)', '')).toBe('');
  });
});

describe('живая v4-подпись рендерится напрямую', () => {
  const OBJECT = 'https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png';

  function signed(issuedAt: Date, lifetimeSeconds: number): string {
    const stamp = issuedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return `${OBJECT}?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=${stamp}`
      + `&X-Goog-Expires=${lifetimeSeconds}&X-Goog-Signature=abc`;
  }

  it('свежая подпись не считается приватным путём — значит идёт в <img> как есть', () => {
    const url = signed(new Date(), 6 * 60 * 60);
    expect(privateStoragePath(url)).toBeNull();
    expect(toAuthenticatedCrmFileUrl(url, 'https://crm-api.example')).toBe(url);
  });

  it('протухшая подпись по-прежнему уходит на прокси и переподписывается там', () => {
    const url = signed(new Date(Date.now() - 48 * 60 * 60 * 1000), 60 * 60);
    expect(privateStoragePath(url)).toBe('organizations/o/logo.png');
    expect(toAuthenticatedCrmFileUrl(url, 'https://crm-api.example')).toContain('/crm/files/');
  });

  it('подпись на грани истечения считается мёртвой — картинка не должна умереть в полёте', () => {
    const url = signed(new Date(Date.now() - 3595 * 1000), 3600);
    expect(privateStoragePath(url)).toBe('organizations/o/logo.png');
  });

  it('без подписи ссылка на приватный бакет остаётся приватной', () => {
    expect(privateStoragePath(OBJECT)).toBe('organizations/o/logo.png');
    expect(privateStoragePath(`${OBJECT}?alt=media`)).toBe('organizations/o/logo.png');
  });

  it('мусор в параметрах подписи не принимается за живую подпись', () => {
    for (const query of [
      '?X-Goog-Date=notadate&X-Goog-Expires=3600',
      '?X-Goog-Date=20260810T000000Z&X-Goog-Expires=abc',
      '?X-Goog-Date=20260810T000000Z&X-Goog-Expires=-1',
      '?X-Goog-Expires=3600',
    ]) {
      expect(privateStoragePath(`${OBJECT}${query}`), query).toBe('organizations/o/logo.png');
    }
  });
});
