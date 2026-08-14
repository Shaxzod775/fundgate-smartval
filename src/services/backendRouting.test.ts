import { describe, expect, it } from 'vitest';
import { isTestBackendHostname } from './api';

describe('backend routing rule', () => {
  it('routes localhost and Vercel hosts to the dev backend (fundgate-test DB)', () => {
    expect(isTestBackendHostname('localhost')).toBe(true);
    expect(isTestBackendHostname('127.0.0.1')).toBe(true);
    expect(isTestBackendHostname('fundgate-funds-crm.vercel.app')).toBe(true);
    expect(isTestBackendHostname('fundgate-funds-crm-git-qa-abc123.vercel.app')).toBe(true);
    expect(isTestBackendHostname('preview-build.vercel.sh')).toBe(true);
  });

  it('routes production domains to the prod backend ((default) DB)', () => {
    expect(isTestBackendHostname('funds-crm.fundgate.uz')).toBe(false);
    expect(isTestBackendHostname('crm.fundgate.uz')).toBe(false);
    expect(isTestBackendHostname('fundgate-funds-crm-v2.web.app')).toBe(false);
    expect(isTestBackendHostname('fundgate-funds-crm-v2.firebaseapp.com')).toBe(false);
  });

  it('does not let look-alike hosts sneak onto the dev backend', () => {
    expect(isTestBackendHostname('vercel.app.evil.com')).toBe(false);
    expect(isTestBackendHostname('localhost.evil.com')).toBe(false);
  });
});
