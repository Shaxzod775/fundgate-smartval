import { describe, expect, it } from 'vitest';
import type { InvestmentCommitteeMeeting } from '../../services/api';
import {
  chairDecisionProgress,
  committeeChair,
  committeeVotingMembers,
  committeeVotingPhase,
  projectVoteTally,
} from './committeeRoles';

const members = [
  { managerId: 'member-1', name: 'Участник', committeeRole: 'member' as const },
  { managerId: 'chair-1', name: 'Председатель', committeeRole: 'chair' as const },
];

describe('committee role helpers', () => {
  it('keeps the chair outside the first voting round', () => {
    expect(committeeChair(members)?.managerId).toBe('chair-1');
    expect(committeeVotingMembers(members).map((member) => member.managerId)).toEqual(['member-1']);
  });

  it('keeps legacy meetings compatible when no chair was captured', () => {
    const legacyMembers = members.map(({ committeeRole: _committeeRole, ...member }) => member);
    expect(committeeChair(legacyMembers)).toBeUndefined();
    expect(committeeVotingMembers(legacyMembers)).toHaveLength(2);
  });

  it('reads the sequential voting phase and project tally', () => {
    const meeting = {
      stage: 'voting',
      protocol: {
        voting: { phase: 'chair' },
        presentedProjects: [{
          startupId: 'startup-1',
          memberVotes: [{ memberId: 'member-1', vote: 'for' }],
        }],
      },
    } as InvestmentCommitteeMeeting;

    expect(committeeVotingPhase(meeting)).toBe('chair');
    expect(projectVoteTally(meeting.protocol!.presentedProjects![0], members.slice(0, 1))).toEqual({
      forCount: 1,
      againstCount: 0,
      pendingCount: 0,
      preliminaryDecision: 'approve',
    });
  });

  it('counts final decisions separately from participant votes', () => {
    expect(chairDecisionProgress([
      { startupId: 'one', chairDecision: { decision: 'approve' } },
      { startupId: 'two' },
    ])).toEqual({ decidedCount: 1, pendingCount: 1 });
  });
});
