import { describe, expect, it } from 'vitest';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import { STAGE_ORDER, meetingStage, stageOrderForViewerRole } from './shared';

describe('investment committee stage workflow', () => {
  it('goes from voting straight to the final protocol', () => {
    expect(STAGE_ORDER).toEqual([
      'draft',
      'shortlist_signing',
      'voting',
      'signing',
      'completed',
    ]);
  });

  it.each(['legal_review', 'deputy_review', 'director_review'] as const)(
    'reads a legacy %s meeting as the signing stage',
    (stage) => {
      expect(meetingStage({ stage } as InvestmentCommitteeMeeting)).toBe('signing');
    },
  );

  it('hides only the terminal state from committee members', () => {
    expect(stageOrderForViewerRole('committee_member')).toEqual([
      'draft',
      'shortlist_signing',
      'voting',
      'signing',
    ]);
  });

  it('keeps the full workflow visible to fund staff', () => {
    expect(stageOrderForViewerRole('manager_investment')).toEqual(STAGE_ORDER);
  });
});
