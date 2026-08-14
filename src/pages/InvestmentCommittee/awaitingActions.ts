import type { InvestmentCommitteeMeeting } from '../../services/api';
import { chairDecisionProgress, committeeChair, committeeVotingPhase } from './committeeRoles';
import { memberVoteProgress } from './voteProgress';

export const COMMITTEE_ATTENTION_ROLES = new Set([
  'committee_member',
  'deputy_investment',
  'ceo',
]);

export const IC_MEETINGS_UPDATED_EVENT = 'ic-meetings-updated';

export function notifyCommitteeMeetingsUpdated(): void {
  window.dispatchEvent(new CustomEvent(IC_MEETINGS_UPDATED_EVENT));
}

export function meetingsAwaitingAction(
  meetings: InvestmentCommitteeMeeting[],
  managerId: string | undefined,
  role: string | undefined,
): InvestmentCommitteeMeeting[] {
  if (!managerId || !role || !COMMITTEE_ATTENTION_ROLES.has(role)) return [];

  return meetings.filter((meeting) => {
    const stage = meeting.stage || 'draft';

    if (role === 'committee_member') {
      const members = meeting.committee?.members || [];
      const currentMember = members.find((member) => member.managerId === managerId);
      if (!currentMember) return false;
      if (stage === 'voting') {
        const projects = meeting.protocol?.presentedProjects || [];
        if (!projects.length) return false;
        const chair = committeeChair(members);
        const phase = committeeVotingPhase(meeting);
        if (chair?.managerId === managerId) {
          return phase === 'chair' && chairDecisionProgress(projects).pendingCount > 0;
        }
        if (chair && phase !== 'members') return false;
        const progress = memberVoteProgress(members, projects)
          .find((item) => item.managerId === managerId);
        return Boolean(progress && progress.pendingCount > 0);
      }
      return false;
    }

    if (role === 'deputy_investment' || role === 'ceo') {
      return stage === 'shortlist_signing';
    }
    return false;
  });
}
