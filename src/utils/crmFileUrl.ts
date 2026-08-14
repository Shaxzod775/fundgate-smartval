import { safeExternalHref } from './safeUrl';

const PRIVATE_STORAGE_BUCKETS = new Set([
  'fundgate-smartval-v2-storage',
  'fundgate-smartval-v2-dev-storage',
  'fundgate-smartval.firebasestorage.app',
]);

const STORAGE_PATH_PREFIXES = [
  'organizations/',
  'submissions/',
  'documents/',
  'pending-uploads/',
];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function fileNameFromUrl(value: string, fallback: string): string {
  const input = value.trim();
  if (!input) return fallback;

  let name: string | undefined;
  try {
    const url = new URL(input);
    const proxyMatch = url.pathname.match(/\/crm\/files\/([^/]+)$/);
    const decodedProxyPath = proxyMatch ? decodeBase64Url(proxyMatch[1]) : null;
    name = (decodedProxyPath || url.pathname).split('/').filter(Boolean).pop();
  } catch {
    name = input.split('/').filter(Boolean).pop();
  }

  const encodedName = name?.split(/[?#]/)[0] || '';
  const decoded = safeDecode(encodedName).trim();
  return decoded || fallback;
}

function isSafeStoragePath(value: string): boolean {
  if (!value || value.startsWith('/') || value.includes('\0')) return false;
  return !value.split('/').some((part) => part === '..');
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function pathFromBucketAndObject(bucket: string, objectPath: string): string | null {
  if (!PRIVATE_STORAGE_BUCKETS.has(safeDecode(bucket))) return null;
  const decodedPath = safeDecode(objectPath).replace(/^\/+/, '');
  return isSafeStoragePath(decodedPath) ? decodedPath : null;
}

function privateStorageBucket(value: string): string | null {
  if (value.startsWith('gs://')) {
    return safeDecode(value.slice(5).split('/')[0]);
  }

  const schemelessStorage = value.match(/^storage\.googleapis\.com\/([^/]+)\//i);
  if (schemelessStorage) return safeDecode(schemelessStorage[1]);

  const bucketPath = value.match(/^(fundgate-smartval-v2(?:-dev)?-storage)\//);
  if (bucketPath) return safeDecode(bucketPath[1]);

  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    if (url.hostname === 'storage.googleapis.com') {
      return safeDecode(url.pathname.split('/').filter(Boolean)[0] || '');
    }
    if (url.hostname === 'firebasestorage.googleapis.com') {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\//);
      return match ? safeDecode(match[1]) : null;
    }
  } catch {
    return null;
  }

  return null;
}

function signedUrlExpiresAt(url: URL): number | null {
  const signedAt = url.searchParams.get('X-Goog-Date');
  const lifetimeSeconds = Number(url.searchParams.get('X-Goog-Expires'));
  if (!signedAt || !Number.isFinite(lifetimeSeconds) || lifetimeSeconds <= 0) return null;

  const parts = signedAt.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!parts) return null;
  const issuedAt = Date.UTC(+parts[1], +parts[2] - 1, +parts[3], +parts[4], +parts[5], +parts[6]);
  return Number.isNaN(issuedAt) ? null : issuedAt + lifetimeSeconds * 1000;
}

const LIVE_SIGNATURE_MARGIN_MS = 60_000;

function parseStorageUrl(input: string): URL | null {
  try {
    if (input.startsWith('//')) return new URL(`https:${input}`);
    if (/^storage\.googleapis\.com\//i.test(input)) return new URL(`https://${input}`);
    return new URL(input);
  } catch {
    return null;
  }
}

export function privateStoragePath(value?: string | null): string | null {
  const input = value?.trim();
  if (!input) return null;

  const parsed = parseStorageUrl(input);
  if (parsed) {
    const expiresAt = signedUrlExpiresAt(parsed);
    if (expiresAt !== null && expiresAt - Date.now() > LIVE_SIGNATURE_MARGIN_MS) return null;
  }

  if (input.startsWith('gs://')) {
    const [bucket, ...parts] = input.slice(5).split('/');
    return pathFromBucketAndObject(bucket, parts.join('/'));
  }

  const schemelessStorage = input.match(/^storage\.googleapis\.com\/([^/]+)\/(.+)$/i);
  if (schemelessStorage) {
    return pathFromBucketAndObject(schemelessStorage[1], schemelessStorage[2]);
  }

  const bucketPath = input.match(/^(fundgate-smartval-v2(?:-dev)?-storage)\/(.+)$/);
  if (bucketPath) {
    return pathFromBucketAndObject(bucketPath[1], bucketPath[2]);
  }

  if (STORAGE_PATH_PREFIXES.some((prefix) => input.startsWith(prefix))) {
    return isSafeStoragePath(input) ? input : null;
  }

  try {
    const url = new URL(input.startsWith('//') ? `https:${input}` : input);
    if (url.hostname === 'storage.googleapis.com') {
      const [, bucket, ...parts] = url.pathname.split('/');
      return pathFromBucketAndObject(bucket, parts.join('/'));
    }

    if (url.hostname === 'firebasestorage.googleapis.com') {
      if (url.searchParams.get('token')?.trim()) return null;
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      return match ? pathFromBucketAndObject(match[1], match[2]) : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function toAuthenticatedCrmFileUrl(
  value: string | null | undefined,
  apiBaseUrl: string,
  startupId?: string | null,
): string {
  const input = value?.trim();
  if (!input) return '';
  if (input.includes('/crm/files/')) return input;

  const storagePath = privateStoragePath(input);
  if (!storagePath) return input;
  const base = apiBaseUrl.replace(/\/+$/, '');
  const sourceBucket = privateStorageBucket(input);
  const params = new URLSearchParams();
  if (sourceBucket === 'fundgate-smartval-v2-dev-storage') params.set('bucket', sourceBucket);
  const startup = startupId?.trim();
  if (startup && !startup.includes('/')) params.set('startup', startup);
  const query = params.toString();
  return `${base}/crm/files/${encodeBase64Url(storagePath)}${query ? `?${query}` : ''}`;
}

export function needsCrmFileResolution(value: string | null | undefined): boolean {
  return Boolean(value && value.includes('/crm/files/'));
}

export function toSafeCrmFileHref(
  value: string | null | undefined,
  apiBaseUrl: string,
  startupId?: string | null,
): string {
  const input = value?.trim();
  if (!input) return '';

  const proxied = toAuthenticatedCrmFileUrl(input, apiBaseUrl, startupId);
  if (proxied.includes('/crm/files/')) return proxied;
  return safeExternalHref(proxied) || '';
}
