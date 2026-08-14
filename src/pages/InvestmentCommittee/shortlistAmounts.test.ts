import { describe, expect, it } from 'vitest';
import type { InvestmentCommitteeMeeting, Startup } from '../../services/api';
import { resolveRequestedAmount } from './components/ShortlistBuilder';
import { meetingInvestmentTotal } from './components/shared';

describe('investment committee shortlist amounts', () => {
  it('reads a formatted funding ask from the startup application', () => {
    const startup = {
      brief: { fundingAsk: '$250,000' },
    } as unknown as Startup;

    expect(resolveRequestedAmount(undefined, startup)).toBe('250000');
  });

  it('prefers the meeting snapshot over current startup data', () => {
    const startup = {
      brief: { fundingRequest: 250000 },
    } as unknown as Startup;

    expect(resolveRequestedAmount({ requestedAmount: 300000 }, startup)).toBe('300000');
  });

  it('does not count the startup request as the fund amount', () => {
    const requestOnly = {
      protocol: { presentedProjects: [{ startupId: 'startup-1', terms: { requestedAmount: 200_000 } }] },
    } as unknown as InvestmentCommitteeMeeting;
    const withFundAmount = {
      protocol: {
        presentedProjects: [{
          startupId: 'startup-1',
          terms: { requestedAmount: 200_000, investmentAmount: 50_000 },
        }],
      },
    } as unknown as InvestmentCommitteeMeeting;

    expect(meetingInvestmentTotal(requestOnly)).toBe(0);
    expect(meetingInvestmentTotal(withFundAmount)).toBe(50_000);
  });
});
