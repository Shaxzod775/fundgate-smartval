import type {
  InvestmentCommitteeMeeting,
  InvestmentCommitteeMeetingProject,
  InvestmentCommitteeSnapshotMember,
} from '../../services/api';

export type CommitteeVotingPhase = 'members' | 'chair' | 'closed';

export function committeeChair(
  members: InvestmentCommitteeSnapshotMember[],
): InvestmentCommitteeSnapshotMember | undefined {
  return members.find((member) => member.committeeRole === 'chair');
}

export function committeeVotingMembers(
  members: InvestmentCommitteeSnapshotMember[],
): InvestmentCommitteeSnapshotMember[] {
  return committeeChair(members)
    ? members.filter((member) => member.committeeRole !== 'chair')
    : members;
}

export function committeeVotingPhase(meeting: InvestmentCommitteeMeeting): CommitteeVotingPhase {
  const stored = meeting.protocol?.voting?.phase;
  if (stored === 'members' || stored === 'chair' || stored === 'closed') return stored;
  return meeting.stage === 'voting' ? 'members' : 'closed';
}

export function projectVoteTally(
  project: InvestmentCommitteeMeetingProject,
  votingMembers: InvestmentCommitteeSnapshotMember[],
): { forCount: number; againstCount: number; pendingCount: number; preliminaryDecision: 'approve' | 'reject' } {
  const memberIds = new Set(votingMembers.map((member) => member.managerId));
  let forCount = 0;
  let againstCount = 0;

  for (const vote of project.memberVotes || []) {
    if (!vote.memberId || !memberIds.has(vote.memberId)) continue;
    if (vote.vote === 'for') forCount += 1;
    if (vote.vote === 'against') againstCount += 1;
  }

  return {
    forCount,
    againstCount,
    pendingCount: Math.max(0, votingMembers.length - forCount - againstCount),
    preliminaryDecision: forCount > againstCount ? 'approve' : 'reject',
  };
}

export function chairDecisionProgress(
  projects: InvestmentCommitteeMeetingProject[],
): { decidedCount: number; pendingCount: number } {
  const decidedCount = projects.filter((project) => (
    project.chairDecision?.decision === 'approve' || project.chairDecision?.decision === 'reject'
  )).length;
  return { decidedCount, pendingCount: Math.max(0, projects.length - decidedCount) };
}
