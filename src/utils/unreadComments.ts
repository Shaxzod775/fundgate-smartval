import type { Comment, Startup } from '../types';

type ManagerLike = { commentsSeen?: Record<string, string> };

export function commentCreatedAtIso(c: Pick<Comment, 'createdAt'>): string {
  const v = c.createdAt as unknown;
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && v !== null && '_seconds' in v) {
    const secs = (v as { _seconds: number })._seconds;
    return new Date(secs * 1000).toISOString();
  }
  if (typeof v === 'object' && v !== null && 'seconds' in v) {
    const secs = (v as { seconds: number }).seconds;
    return new Date(secs * 1000).toISOString();
  }
  return '';
}

export function unreadFounderCommentsFor(
  startup: Pick<Startup, 'id' | 'comments'>,
  seenMap: Record<string, string> | undefined,
): number {
  const comments: Comment[] = (startup.comments ?? []) as Comment[];
  if (comments.length === 0) return 0;
  const seen = seenMap?.[startup.id] ?? '';
  let n = 0;
  for (const c of comments) {
    if (!c.senderType || c.senderType !== 'founder') continue;
    const iso = commentCreatedAtIso(c);
    if (!iso) continue;
    if (!seen || iso > seen) n++;
  }
  return n;
}

export function totalUnreadFounderComments(
  startups: ReadonlyArray<Pick<Startup, 'id' | 'comments'>>,
  manager: ManagerLike | null | undefined,
): number {
  if (!manager) return 0;
  return startups.reduce(
    (sum, s) => sum + unreadFounderCommentsFor(s, manager.commentsSeen),
    0,
  );
}

export function markSeenLocally(
  manager: ManagerLike,
  startupId: string,
  at: string = new Date().toISOString(),
): { commentsSeen: Record<string, string> } {
  return {
    commentsSeen: { ...(manager.commentsSeen ?? {}), [startupId]: at },
  };
}
