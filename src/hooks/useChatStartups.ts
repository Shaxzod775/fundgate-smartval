import { useEffect, useMemo, useState } from 'react';
import { startupsApi } from '../services/api';
import type { Startup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './usePermissions';
import { canUseChats } from '../utils/chatAccess';
import type { Comment } from '../types';

function tsMs(c: { createdAt: Comment['createdAt'] } | undefined | null): number {
  if (!c?.createdAt) return 0;
  const v = c.createdAt;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return Date.parse(v) || 0;
  if (typeof v === 'object' && '_seconds' in v && typeof v._seconds === 'number') {
    return v._seconds * 1000;
  }
  return 0;
}

export function useChatStartups(pollMs = 30000, enabled = true) {
  const { manager, organization } = useAuth();
  const permissions = usePermissions();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = manager?.organizationId;
  const managerId = manager?.id;
  const canSeeAll = permissions.isCeo || permissions.isDeputy || permissions.isAdmin;
  const chatAccessEnabled = enabled && canUseChats(manager, organization);

  useEffect(() => {
    if (!orgId || !chatAccessEnabled) {
      setStartups([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const res = await startupsApi.getAll(orgId);
      if (cancelled) return;
      if (res.success && res.data) setStartups(res.data);
      setLoading(false);
    };
    void load();
    const handle = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [chatAccessEnabled, orgId, pollMs]);

  const visibleStartups = useMemo(() => {
    if (canSeeAll) return startups;
    if (!managerId) return [];
    return startups.filter((s) => s.assignedManagerId === managerId);
  }, [startups, canSeeAll, managerId]);

  const totalUnread = useMemo(() => {
    const lastSeen = manager?.commentsSeen ?? {};
    let total = 0;
    for (const s of visibleStartups.filter((startup) => !startup.isArchived)) {
      const comments = ((s.comments as Comment[] | undefined) ?? []).filter(
        (c) => !(c as Comment & { isInternal?: boolean }).isInternal,
      );
      const seenIso = lastSeen[s.id] ?? '';
      const seenMs = seenIso ? Date.parse(seenIso) : 0;
      for (const c of comments) {
        if (c.senderType === 'founder' && tsMs(c) > seenMs) total += 1;
      }
    }
    return total;
  }, [visibleStartups, manager?.commentsSeen]);

  return { startups: visibleStartups, totalUnread, loading, canSeeAll };
}
