import { describe, it, expect } from 'vitest';
import { isCommitteeUnderDevelopment } from './underDevelopment';

describe('isCommitteeUnderDevelopment', () => {
  it('does not gate production, local, preview or other domains', () => {
    expect(isCommitteeUnderDevelopment('funds-crm.fundgate.uz')).toBe(false);
    expect(isCommitteeUnderDevelopment('FUNDS-CRM.FUNDGATE.UZ')).toBe(false);
    expect(isCommitteeUnderDevelopment('localhost')).toBe(false);
    expect(isCommitteeUnderDevelopment('crm.fundgate.uz')).toBe(false);
    expect(isCommitteeUnderDevelopment('fundgate-funds-crm-v2.web.app')).toBe(false);
    expect(isCommitteeUnderDevelopment('')).toBe(false);
  });
});
