import type { Startup } from '../../types';

export type CommitteeGateState =
  | 'approved'
  | 'in_progress'
  | 'not_started';

export interface CommitteeGateInfo {
  state: CommitteeGateState;
  blocked: boolean;
  sentAt?: string;
  workflowStatus?: string;
}

type StartupLike = Partial<Startup> & Record<string, any>;

function isoString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function workflowStatusOf(startup: StartupLike): string {
  return (
    isoString(startup?.investmentCommitteeStatus)
    || isoString(startup?.investmentCommittee?.status)
  );
}

export function committeeGateFor(startup: StartupLike | null | undefined): CommitteeGateInfo {
  const source: StartupLike = startup || {};
  const workflowStatus = workflowStatusOf(source);
  const sentAt = isoString(source?.sentToCommittee?.at);

  if (isoString(source?.portfolioPromotion?.at) || isoString(source?.portfolioPromotion?.committeeId)) {
    return { state: 'approved', blocked: false, sentAt: sentAt || undefined, workflowStatus: workflowStatus || undefined };
  }

  if (workflowStatus === 'completed') {
    return { state: 'approved', blocked: false, sentAt: sentAt || undefined, workflowStatus };
  }

  const workflowRunning = Boolean(workflowStatus) && workflowStatus !== 'cancelled';
  if (sentAt || workflowRunning) {
    return {
      state: 'in_progress',
      blocked: true,
      sentAt: sentAt || undefined,
      workflowStatus: workflowStatus || undefined,
    };
  }

  return { state: 'not_started', blocked: true, workflowStatus: workflowStatus || undefined };
}
