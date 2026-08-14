import type {
  InvestmentCommitteeMeeting,
  InvestmentCommitteeMeetingProject,
  InvestmentCommitteeSnapshotMember,
} from '../../services/api';

export interface MatrixVoteCell {
  vote?: 'for' | 'against';
  comment?: string;
  votedAt?: string;
}

export interface MemberVoteProgress {
  managerId: string;
  name: string;
  votedCount: number;
  pendingCount: number;
  pendingStartupIds: string[];
}

export function matrixCell(
  project: InvestmentCommitteeMeetingProject | undefined,
  managerId: string
): MatrixVoteCell | undefined {
  const votes = Array.isArray(project?.memberVotes) ? project?.memberVotes : [];
  const entry = votes.find((vote) => (vote.memberId || '') === managerId);
  if (!entry || (entry.vote !== 'for' && entry.vote !== 'against')) return undefined;
  return { vote: entry.vote, comment: entry.comment || undefined, votedAt: entry.votedAt };
}

export function memberVoteProgress(
  members: InvestmentCommitteeSnapshotMember[],
  projects: InvestmentCommitteeMeetingProject[]
): MemberVoteProgress[] {
  return members
    .filter((member) => Boolean(member.managerId))
    .map((member) => {
      const pendingStartupIds = projects
        .filter((project) => !matrixCell(project, member.managerId))
        .map((project) => project.startupId || '')
        .filter(Boolean);
      return {
        managerId: member.managerId,
        name: member.name || member.managerId,
        votedCount: projects.length - pendingStartupIds.length,
        pendingCount: pendingStartupIds.length,
        pendingStartupIds,
      };
    });
}

export function isVotingCompleteClient(meeting: InvestmentCommitteeMeeting): boolean {
  const members = meeting.committee?.members || [];
  const projects = meeting.protocol?.presentedProjects || [];
  if (!members.length || !projects.length) return false;
  return memberVoteProgress(members, projects).every((member) => member.pendingCount === 0);
}
