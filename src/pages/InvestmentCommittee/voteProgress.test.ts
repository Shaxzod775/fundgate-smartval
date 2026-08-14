import { describe, expect, it } from 'vitest';
import { matrixCell, memberVoteProgress, isVotingCompleteClient } from './voteProgress';
import type { InvestmentCommitteeMeeting } from '../../services/api';

const projects = [
  {
    startupId: 's-1',
    startupName: 'VizVuz',
    memberVotes: [
      { memberId: 'cm-1', memberName: 'Член ИК 1', vote: 'for' as const, votedAt: '2026-06-10' },
      { memberId: 'cm-2', memberName: 'Член ИК 2', vote: 'against' as const, comment: 'Дорого', votedAt: '2026-06-10' },
    ],
  },
  {
    startupId: 's-2',
    startupName: 'LegalFlow',
    memberVotes: [
      { memberId: 'cm-1', memberName: 'Член ИК 1', vote: 'for' as const, votedAt: '2026-06-10' },
    ],
  },
];

const members = [
  { managerId: 'cm-1', name: 'Член ИК 1' },
  { managerId: 'cm-2', name: 'Член ИК 2' },
];

describe('voteProgress', () => {
  it('returns the member×project cell with vote and comment', () => {
    expect(matrixCell(projects[0], 'cm-1')).toMatchObject({ vote: 'for' });
    expect(matrixCell(projects[0], 'cm-2')).toMatchObject({ vote: 'against', comment: 'Дорого' });
    expect(matrixCell(projects[1], 'cm-2')).toBeUndefined();
    expect(matrixCell(undefined, 'cm-1')).toBeUndefined();
  });

  it('computes per-member "not reviewed" progress', () => {
    const progress = memberVoteProgress(members, projects);
    expect(progress).toHaveLength(2);
    expect(progress[0]).toMatchObject({ managerId: 'cm-1', votedCount: 2, pendingCount: 0, pendingStartupIds: [] });
    expect(progress[1]).toMatchObject({ managerId: 'cm-2', votedCount: 1, pendingCount: 1, pendingStartupIds: ['s-2'] });
  });

  it('detects voting completeness only when every member voted on every project', () => {
    const meeting = {
      committee: { members },
      protocol: { presentedProjects: projects },
    } as unknown as InvestmentCommitteeMeeting;
    expect(isVotingCompleteClient(meeting)).toBe(false);

    const complete = {
      committee: { members },
      protocol: {
        presentedProjects: projects.map((project) => ({
          ...project,
          memberVotes: members.map((member) => ({ memberId: member.managerId, vote: 'for' as const })),
        })),
      },
    } as unknown as InvestmentCommitteeMeeting;
    expect(isVotingCompleteClient(complete)).toBe(true);

    expect(isVotingCompleteClient({ protocol: { presentedProjects: projects } } as unknown as InvestmentCommitteeMeeting)).toBe(false);
  });
});
