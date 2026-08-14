import { describe, expect, it } from 'vitest';
import { canUseChats, isChatRole } from './chatAccess';

describe('chat access', () => {
  it('allows supported roles in IT Park and iframe-backed funds', () => {
    expect(canUseChats(
      { role: 'ceo', organizationId: 'org-itpark' },
      { id: 'org-itpark', name: 'IT Park Ventures' },
    )).toBe(true);
    expect(canUseChats(
      { role: 'manager_investment', organizationId: 'org-itpark' },
      { id: 'org-itpark', name: 'IT Park Ventures' },
    )).toBe(true);
    expect(canUseChats(
      { role: 'manager_investment', organizationId: 'org-tanay' },
      { id: 'org-tanay', name: 'Tanay VC' },
    )).toBe(true);
  });

  it('keeps access while the organization is still loading', () => {
    expect(canUseChats(
      { role: 'manager_investment', organizationId: 'ucventures-xn3d' },
      null,
    )).toBe(true);
  });

  it('rejects a manager whose tenant does not match the loaded organization', () => {
    expect(canUseChats(
      { role: 'ceo', organizationId: 'org-another' },
      { id: 'org-itpark', name: 'IT Park Ventures' },
    )).toBe(false);
    expect(canUseChats(
      { role: 'ceo', organizationId: 'org-fundgate-qa' },
      { id: 'org-tanay', name: 'Tanay VC' },
    )).toBe(false);
    expect(canUseChats(
      { role: 'manager_investment', organizationId: 'org-lookalike' },
      { id: 'org-itpark', name: 'IT Park Ventures' },
    )).toBe(false);
  });

  it('keeps chats hidden from unsupported roles in every fund', () => {
    expect(isChatRole({ role: 'lawyer' })).toBe(false);
    expect(canUseChats(
      { role: 'lawyer', organizationId: 'org-tanay' },
      { id: 'org-tanay', name: 'Tanay VC' },
    )).toBe(false);
  });
});
