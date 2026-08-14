import type { TFunction } from 'i18next';
import type {
  InvestmentCommitteeMeetingProject,
  InvestmentCommitteeSnapshotMember,
} from '../../services/api';

export type BadgeTone = 'green' | 'amber' | 'blue' | 'red';

const KNOWN_AI_RECOMMENDATIONS = new Set(['strong_buy', 'buy', 'hold', 'sell']);

export function aiRecommendationKind(recommendation?: string): 'enum' | 'text' | 'none' {
  const value = (recommendation || '').trim();
  if (!value) return 'none';
  return KNOWN_AI_RECOMMENDATIONS.has(value) ? 'enum' : 'text';
}

export function aiRecommendationTone(recommendation: string): BadgeTone {
  if (recommendation === 'strong_buy' || recommendation === 'buy') return 'green';
  if (recommendation === 'hold') return 'amber';
  return 'red';
}

const MEMO_DECISION_TONES: Record<string, BadgeTone> = {
  invest: 'green',
  review_later: 'amber',
  insufficient_data: 'amber',
  pass: 'red',
};

export function memoDecisionMeta(decision: string, t: TFunction): { tone: BadgeTone; label: string } {
  const value = decision.trim();
  const fallback = value.replace(/_/g, ' ');
  const label = t(
    `investmentCommittee.dataRoom.memoDecisions.${value}`,
    fallback.charAt(0).toUpperCase() + fallback.slice(1),
  );
  return { tone: MEMO_DECISION_TONES[value] || 'blue', label };
}

export function fileExtension(url?: string, fileName?: string): string | undefined {
  const source = (fileName || url || '').split(/[?#]/)[0];
  const match = /\.([A-Za-z][A-Za-z0-9]{1,4})$/.exec(source);
  return match ? match[1].toUpperCase() : undefined;
}

export function displayCountry(country?: string): string | undefined {
  const value = (country || '').trim();
  if (!value) return undefined;
  const first = value.charAt(0);
  return first === first.toLocaleUpperCase() ? value : first.toLocaleUpperCase() + value.slice(1);
}

export interface ProjectVoteStats {
  for: number;
  against: number;
  pending: number;
  total: number;
}

export function projectVoteStats(
  project: InvestmentCommitteeMeetingProject | undefined,
  members: InvestmentCommitteeSnapshotMember[],
): ProjectVoteStats {
  const memberIds = new Set(members.map((member) => member.managerId));
  const votes = Array.isArray(project?.memberVotes) ? project.memberVotes : [];
  const forCount = votes.filter((vote) => vote.vote === 'for' && memberIds.has(vote.memberId || '')).length;
  const againstCount = votes.filter((vote) => vote.vote === 'against' && memberIds.has(vote.memberId || '')).length;
  return {
    for: forCount,
    against: againstCount,
    pending: Math.max(0, members.length - forCount - againstCount),
    total: members.length,
  };
}
