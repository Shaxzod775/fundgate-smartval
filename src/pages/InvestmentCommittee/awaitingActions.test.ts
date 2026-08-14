import { describe, expect, it } from 'vitest';
import type { InvestmentCommitteeMeeting } from '../../services/api';
import { meetingsAwaitingAction } from './awaitingActions';

describe('deputy director committee attention', () => {
  it('includes the shortlist_signing stage', () => {
    const meeting = { id: 'meeting-shortlist', stage: 'shortlist_signing' } as InvestmentCommitteeMeeting;
    expect(meetingsAwaitingAction([meeting], 'deputy-director', 'deputy_investment')).toEqual([meeting]);
  });

  it.each(['legal_review', 'deputy_review', 'director_review'] as const)(
    'no longer raises a personal action on the retired %s stage',
    (stage) => {
      const meeting = { id: `meeting-${stage}`, stage } as InvestmentCommitteeMeeting;
      expect(meetingsAwaitingAction([meeting], 'deputy-director', 'deputy_investment')).toEqual([]);
    },
  );
});

describe('committee member shared protocol attention', () => {
  const signingMeeting = {
    id: 'meeting-signing',
    stage: 'signing',
    committee: { members: [{ managerId: 'member-1' }] },
    signatures: {
      members: [{ id: 'member-1', managerId: 'member-1', status: 'pending' }],
    },
  } as unknown as InvestmentCommitteeMeeting;

  it('does not create a personal action while fund staff uploads the protocol', () => {
    expect(meetingsAwaitingAction(
      [signingMeeting],
      'member-1',
      'committee_member',
    )).toEqual([]);
  });
});

describe('sequential committee voting attention', () => {
  const meeting = {
    id: 'meeting-chair-flow',
    stage: 'voting',
    committee: {
      members: [
        { managerId: 'member-1', committeeRole: 'member' },
        { managerId: 'chair-1', committeeRole: 'chair' },
      ],
    },
    protocol: {
      voting: { phase: 'members' },
      presentedProjects: [{ startupId: 'startup-1', memberVotes: [] }],
    },
  } as unknown as InvestmentCommitteeMeeting;

  it('asks the ordinary member first', () => {
    expect(meetingsAwaitingAction([meeting], 'member-1', 'committee_member')).toEqual([meeting]);
    expect(meetingsAwaitingAction([meeting], 'chair-1', 'committee_member')).toEqual([]);
  });

  it('asks only the chair during the final phase', () => {
    const chairPhase = {
      ...meeting,
      protocol: {
        ...meeting.protocol,
        voting: { phase: 'chair' as const },
        presentedProjects: [{
          startupId: 'startup-1',
          memberVotes: [{ memberId: 'member-1', vote: 'for' as const }],
        }],
      },
    } as InvestmentCommitteeMeeting;
    expect(meetingsAwaitingAction([chairPhase], 'member-1', 'committee_member')).toEqual([]);
    expect(meetingsAwaitingAction([chairPhase], 'chair-1', 'committee_member')).toEqual([chairPhase]);
  });
});
