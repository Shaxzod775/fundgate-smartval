import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Search, Send, ArrowLeft, MessageCircle, Lock, Pencil, Trash2 } from 'lucide-react';
import { startupsApi } from '../../services/api';
import type { Startup } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { markSeenLocally } from '../../utils/unreadComments';
import type { Comment } from '../../types';
import { CrmImage } from '../../components/ui/CrmImage';
import { ChatListSkeleton } from './ChatListSkeleton';
import { formatDayMonthLong, formatDayMonthNumeric, formatLongDate, formatTime, formatWeekdayShort } from '../../utils/formatDate';

function startupName(s: Startup): string {
  const brief = s.brief as Record<string, unknown> | undefined;
  return (
    (brief?.companyName as string | undefined) ||
    (brief?.name as string | undefined) ||
    (brief?.startupName as string | undefined) ||
    ''
  );
}

function startupLogo(s: Startup): string | undefined {
  const brief = s.brief as Record<string, unknown> | undefined;
  const direct = brief?.logo as string | undefined;
  const fileUrls = brief?.fileUrls as { logo?: string } | undefined;
  const topFileUrls = (s as unknown as { fileUrls?: { logo?: string } }).fileUrls;
  return direct || fileUrls?.logo || topFileUrls?.logo || undefined;
}

const Page = styled.div`
  display: flex;
  height: calc(100vh - 32px);
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ListPane = styled.aside<{ $hideOnMobile: boolean }>`
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};

  @media (max-width: 768px) {
    width: 100%;
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? 'none' : 'flex')};
  }
`;

const ListHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ListTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const ScopeNotice = styled.div<{ $variant: 'all' | 'assigned' }>`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 11px;
  line-height: 1.35;
  color: ${({ $variant, theme }) =>
    $variant === 'all' ? theme.colors.accent.primary : theme.colors.text.muted};
  background: ${({ $variant }) =>
    $variant === 'all' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'all' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'};
`;

const SearchWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.text.muted};
    pointer-events: none;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ChatList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ChatRow = styled.button<{ $active: boolean; $unread: boolean; $locked?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  cursor: pointer;
  text-align: left;
  width: 100%;
  /* Dim chats with finally-blocked / archived startups so they're visibly
   * "muted" but still navigable for audit. The right pane already disables
   * the input via isLocked, so the user can't accidentally write back. */
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};
  transition: background 0.15s ease, opacity 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    opacity: ${({ $locked }) => ($locked ? 0.8 : 1)};
  }
`;

const LockGlyph = styled(Lock)`
  width: 12px;
  height: 12px;
  margin-left: 6px;
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const ArchiveToggle = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  user-select: none;

  input { accent-color: ${({ theme }) => theme.colors.accent.primary}; }
  &:hover { color: ${({ theme }) => theme.colors.text.primary}; }
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RowTopLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const RowName = styled.div<{ $unread: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $unread }) => ($unread ? 700 : 500)};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RowTime = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const RowBottomLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const RowPreview = styled.div<{ $unread: boolean }>`
  font-size: 14px;
  color: ${({ $unread, theme }) =>
    $unread ? theme.colors.text.primary : theme.colors.text.muted};
  font-weight: ${({ $unread }) => ($unread ? 600 : 400)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`;

const UnreadBadge = styled.span`
  background: #10b981;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
`;

const formatUnreadBadge = (count: number) => (count > 99 ? '99+' : count);

const ConvPane = styled.section<{ $hideOnMobile: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${({ theme }) => theme.colors.bg.primary};

  @media (max-width: 768px) {
    display: ${({ $hideOnMobile }) => ($hideOnMobile ? 'none' : 'flex')};
  }
`;

const ConvHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const BackBtn = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  padding: 4px;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const ConvHeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    font-size: ${({ theme }) => theme.fontSizes.md};
    color: ${({ theme }) => theme.colors.text.primary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const OpenDetailLink = styled.button`
  margin-left: auto;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.muted};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const Stream = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const Row = styled.div<{ $sender: 'founder' | 'manager' }>`
  display: flex;
  justify-content: ${({ $sender }) => ($sender === 'manager' ? 'flex-end' : 'flex-start')};
`;

const DateDivider = styled.div`
  display: flex;
  justify-content: center;
  margin: 4px 0;
`;

const DateDividerPill = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.45);
  padding: 4px 12px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
`;

const BubbleWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;

  ${BubbleWrapper}:hover & {
    opacity: 1;
  }
`;

const IconBtn = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.95);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
  }
`;

const EditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 240px;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  resize: vertical;
  min-height: 60px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: #10b981;
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

const EditBtn = styled.button<{ $primary?: boolean }>`
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  ${({ $primary }) =>
    $primary
      ? `
    background: #10b981;
    color: #fff;
    &:hover { background: #059669; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  `
      : `
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    &:hover { color: rgba(255, 255, 255, 0.9); }
  `}
`;

const MessageGroup = styled.div<{ $sender: 'founder' | 'manager' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $sender }) => ($sender === 'manager' ? 'flex-end' : 'flex-start')};
  max-width: 70%;
  min-width: 0;
`;

const SenderLabel = styled.div<{ $sender: 'founder' | 'manager' }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $sender }) =>
    $sender === 'manager' ? '#34d399' : 'rgba(255, 255, 255, 0.7)'};
  margin: 0 4px 2px 4px;
`;

const Bubble = styled.div<{ $sender: 'founder' | 'manager' }>`
  width: fit-content;
  max-width: 100%;
  padding: 8px 12px;
  border-radius: 16px;
  background: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#10b981' : theme.colors.bg.tertiary};
  color: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#fff' : theme.colors.text.primary};
  ${({ $sender }) =>
    $sender === 'manager'
      ? 'border-bottom-right-radius: 4px;'
      : 'border-bottom-left-radius: 4px;'}
  white-space: pre-wrap;
  word-break: break-word;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;
`;

const BubbleMeta = styled.div<{ $sender: 'founder' | 'manager' }>`
  font-size: 11px;
  color: ${({ $sender, theme }) =>
    $sender === 'manager' ? 'rgba(255,255,255,0.75)' : theme.colors.text.muted};
  margin-top: 4px;
  text-align: ${({ $sender }) => ($sender === 'manager' ? 'right' : 'left')};
`;

const InputBar = styled.form`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  min-height: 40px;
  max-height: 160px;
  padding: 10px 12px;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: #10b981;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SendBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #10b981;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyConversation = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};

  svg {
    width: 48px;
    height: 48px;
    opacity: 0.4;
  }
`;

const EmptyList = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

const LockedBanner = styled.div`
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border-top: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

function avatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

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

function formatRowTime(ms: number, language: string): string {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return formatTime(d, language);
  }
  const diffDays = Math.floor((now.getTime() - ms) / 86400000);
  if (diffDays < 7) {
    return formatWeekdayShort(d, language);
  }
  return formatDayMonthNumeric(d, language);
}

function formatBubbleTime(ms: number, language: string): string {
  if (!ms) return '';
  return formatTime(new Date(ms), language);
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayDivider(
  ms: number,
  language: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return todayLabel;
  if (sameDay(d, yesterday)) return yesterdayLabel;
  if (d.getFullYear() === today.getFullYear()) {
    return formatDayMonthLong(d, language);
  }
  return formatLongDate(d, language);
}

interface ChatRowData {
  startup: Startup;
  lastChatComment: Comment | null;
  lastTs: number;
  unreadCount: number;
}

export default function Chats() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const { manager, updateManager } = useAuth();
  const permissions = usePermissions();
  const canSeeAll = permissions.isCeo || permissions.isDeputy || permissions.isAdmin;

  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (commentId: string, currentText: string) => {
    setEditingId(commentId);
    setEditText(currentText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (startupId: string, commentId: string) => {
    const trimmed = editText.trim();
    if (!trimmed || editSaving) return;
    setEditSaving(true);
    const res = await startupsApi.editComment(startupId, commentId, trimmed);
    if (res.success) {
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId
            ? {
                ...s,
                comments: ((s.comments as Comment[] | undefined) ?? []).map((c) =>
                  c.id === commentId ? { ...c, text: trimmed, editedAt: new Date() } : c,
                ),
              }
            : s,
        ),
      );
      setEditingId(null);
      setEditText('');
    } else {
      alert(res.error || t('chats.editFailed'));
    }
    setEditSaving(false);
  };

  const deleteComment = async (startupId: string, commentId: string) => {
    if (!window.confirm(t('chats.deleteConfirm'))) return;
    setDeletingId(commentId);
    const res = await startupsApi.deleteComment(startupId, commentId);
    if (res.success) {
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId
            ? {
                ...s,
                comments: ((s.comments as Comment[] | undefined) ?? []).filter(
                  (c) => c.id !== commentId,
                ),
              }
            : s,
        ),
      );
    } else {
      alert(res.error || t('chats.deleteFailed'));
    }
    setDeletingId(null);
  };

  useEffect(() => {
    const orgId = manager?.organizationId;
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await startupsApi.getAll(orgId);
      if (cancelled) return;
      if (res.success && res.data) setStartups(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [manager?.organizationId]);

  const rows: ChatRowData[] = useMemo(() => {
    const lastSeen = manager?.commentsSeen ?? {};
    const scoped = canSeeAll
      ? startups
      : startups.filter((s) => s.assignedManagerId === manager?.id);
    const visible = showArchived
      ? scoped.filter((s) => s.isArchived)
      : scoped.filter((s) => !s.isArchived);
    return visible
      .map((s) => {
        const comments = ((s.comments as Comment[] | undefined) ?? []).filter(
          (c) => !(c as Comment & { isInternal?: boolean }).isInternal
        );
        const sorted = [...comments].sort((a, b) => tsMs(a) - tsMs(b));
        const last = sorted[sorted.length - 1] ?? null;
        const seenIso = lastSeen[s.id] ?? '';
        const seenMs = seenIso ? Date.parse(seenIso) : 0;
        const unreadCount = sorted.filter(
          (c) => c.senderType === 'founder' && tsMs(c) > seenMs
        ).length;
        return {
          startup: s,
          lastChatComment: last,
          lastTs: tsMs(last ?? undefined),
          unreadCount,
        };
      })
      .filter((r) => r.lastChatComment !== null)
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [startups, manager?.commentsSeen, manager?.id, canSeeAll, showArchived]);

  const archivedCount = useMemo(
    () =>
      startups.filter(
        (s) =>
          s.isArchived &&
          (canSeeAll || s.assignedManagerId === manager?.id) &&
          ((s.comments as Comment[] | undefined) ?? []).some(
            (c) => !(c as Comment & { isInternal?: boolean }).isInternal
          )
      ).length,
    [startups, canSeeAll, manager?.id]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => startupName(r.startup).toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => {
    if (!routeId || loading) return;
    const startup = startups.find((s) => s.id === routeId);
    if (!startup) {
      navigate('/chats', { replace: true });
    }
  }, [routeId, startups, loading, navigate]);

  const activeStartup = useMemo(() => {
    if (routeId) {
      const s = startups.find((x) => x.id === routeId);
      if (!s) return null;
      if (canSeeAll || s.assignedManagerId === manager?.id) return s;
      return null;
    }
    return rows[0]?.startup ?? null;
  }, [routeId, startups, rows, canSeeAll, manager?.id]);

  const blockedByAssignment = useMemo(() => {
    if (!routeId || canSeeAll) return false;
    const s = startups.find((x) => x.id === routeId);
    return Boolean(s) && s?.assignedManagerId !== manager?.id;
  }, [routeId, startups, canSeeAll, manager?.id]);

  const handleTakeStartup = async () => {
    if (!routeId || !manager?.id) return;
    setSending(true);
    const res = await startupsApi.selfAssign(routeId);
    setSending(false);
    if (res.success) {
      setStartups((prev) => prev.map((x) => (
        x.id === routeId
          ? { ...x, ...(res.data || {}), assignedManagerId: manager.id }
          : x
      )));
    } else {
      alert(res.error || t('chats.assignFailed', 'Не удалось закрепить стартап'));
    }
  };

  const activeComments = useMemo(() => {
    if (!activeStartup) return [];
    const all = ((activeStartup.comments as Comment[] | undefined) ?? []).filter(
      (c) => !(c as Comment & { isInternal?: boolean }).isInternal
    );
    return [...all].sort((a, b) => tsMs(a) - tsMs(b));
  }, [activeStartup]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [activeStartup?.id, activeComments.length]);

  useEffect(() => {
    if (!activeStartup || !manager) return;
    const last = activeComments[activeComments.length - 1];
    if (!last) return;
    const lastMs = tsMs(last);
    const seenIso = manager.commentsSeen?.[activeStartup.id] ?? '';
    const seenMs = seenIso ? Date.parse(seenIso) : 0;
    if (lastMs <= seenMs) return;
    const at = new Date(lastMs).toISOString();
    updateManager(markSeenLocally(manager, activeStartup.id, at));
    void startupsApi.markCommentsSeen(activeStartup.id, at);
  }, [activeStartup, activeComments, manager, updateManager]);

  const isLocked = Boolean(
    activeStartup?.finallyBlocked || activeStartup?.isArchived
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeStartup || sending || isLocked) return;
    setSending(true);
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      startupId: activeStartup.id,
      text,
      createdAt: new Date(),
      senderType: 'manager',
      managerId: manager?.id,
      managerName: manager?.name,
      managerAvatar: manager?.avatar,
    };
    setStartups((prev) =>
      prev.map((s) =>
        s.id === activeStartup.id
          ? { ...s, comments: [...((s.comments as Comment[] | undefined) ?? []), optimistic] }
          : s
      )
    );
    setDraft('');
    const res = await startupsApi.addComment(activeStartup.id, {
      managerId: manager?.id,
      managerName: manager?.name,
      managerAvatar: manager?.avatar,
      text,
      isInternal: false,
    });
    if (!res.success) {
      setStartups((prev) =>
        prev.map((s) =>
          s.id === activeStartup.id
            ? {
                ...s,
                comments: ((s.comments as Comment[] | undefined) ?? []).filter(
                  (c) => c.id !== optimistic.id
                ),
              }
            : s
        )
      );
      alert(res.error || t('chats.sendFailed'));
    } else {
      const fresh = await startupsApi.getById(activeStartup.id);
      if (fresh.success && fresh.data) {
        const freshData = fresh.data;
        setStartups((prev) =>
          prev.map((s) => (s.id === activeStartup.id ? freshData : s))
        );
      }
    }
    setSending(false);
  };

  const language = i18n.language || 'ru';
  const showConvOnMobile = !!routeId;

  return (
    <Page>
      <ListPane $hideOnMobile={showConvOnMobile}>
        <ListHeader>
          <ListTitle>{t('chats.title')}</ListTitle>
          <ScopeNotice $variant={canSeeAll ? 'all' : 'assigned'}>
            {canSeeAll ? t('chats.scopeAll') : t('chats.scopeAssigned')}
          </ScopeNotice>
          <SearchWrapper>
            <Search />
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('chats.searchPlaceholder')}
            />
          </SearchWrapper>
          {archivedCount > 0 && (
            <ArchiveToggle>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              {showArchived
                ? t('chats.hideArchive', { count: archivedCount })
                : t('chats.showArchive', { count: archivedCount })}
            </ArchiveToggle>
          )}
        </ListHeader>
        <ChatList>
          {loading ? (
            <ChatListSkeleton />
          ) : filteredRows.length === 0 ? (
            <EmptyList>{search ? t('chats.noResults') : t('chats.emptyList')}</EmptyList>
          ) : (
            filteredRows.map((r) => {
              const last = r.lastChatComment;
              const isActive = activeStartup?.id === r.startup.id;
              const senderPrefix =
                last?.senderType === 'founder'
                  ? `${last.senderName || last.managerName || t('chats.founder')}: `
                  : last?.senderType === 'manager'
                    ? `${t('chats.you')}: `
                    : '';
              const name = startupName(r.startup);
              const logo = startupLogo(r.startup);
              const isLockedRow =
                Boolean(r.startup.finallyBlocked) || Boolean(r.startup.isArchived);
              const lockTooltip = r.startup.finallyBlocked
                ? t('chats.lockedReadonlyTooltip')
                : r.startup.isArchived
                  ? t('chats.archivedTooltip')
                  : '';
              return (
                <ChatRow
                  key={r.startup.id}
                  $active={isActive}
                  $unread={r.unreadCount > 0}
                  $locked={isLockedRow}
                  title={lockTooltip || undefined}
                  onClick={() => navigate(`/chats/${r.startup.id}`)}
                >
                  <Avatar $bg={avatarBg(name || '?')}>
                    {logo ? (
                      <CrmImage src={logo} startupId={r.startup.id} alt={name} />
                    ) : (
                      initials(name || '?')
                    )}
                  </Avatar>
                  <RowMain>
                    <RowTopLine>
                      <RowName $unread={r.unreadCount > 0}>
                        {name}
                        {isLockedRow && <LockGlyph aria-label={lockTooltip} />}
                      </RowName>
                      <RowTime>{formatRowTime(r.lastTs, language)}</RowTime>
                    </RowTopLine>
                    <RowBottomLine>
                      <RowPreview $unread={r.unreadCount > 0}>
                        {senderPrefix}
                        {last?.text || ''}
                      </RowPreview>
                      {r.unreadCount > 0 && <UnreadBadge>{formatUnreadBadge(r.unreadCount)}</UnreadBadge>}
                    </RowBottomLine>
                  </RowMain>
                </ChatRow>
              );
            })
          )}
        </ChatList>
      </ListPane>

      <ConvPane $hideOnMobile={!showConvOnMobile && !activeStartup && !blockedByAssignment}>
        {blockedByAssignment ? (
          <EmptyConversation>
            <Lock />
            <div>{t('chats.notAssigned', 'Этот стартап не закреплён за вами — возьмите его, чтобы начать чат')}</div>
            <EditBtn $primary onClick={handleTakeStartup} disabled={sending} style={{ marginTop: 12 }}>
              {t('chats.takeIt', 'Взять себе')}
            </EditBtn>
          </EmptyConversation>
        ) : !activeStartup ? (
          <EmptyConversation>
            <MessageCircle />
            <div>{t('chats.selectConversation')}</div>
          </EmptyConversation>
        ) : (
          <>
            <ConvHeader>
              <BackBtn onClick={() => navigate('/chats')} aria-label={t('common.back')}>
                <ArrowLeft />
              </BackBtn>
              <Avatar $bg={avatarBg(startupName(activeStartup) || '?')}>
                {startupLogo(activeStartup) ? (
                  <CrmImage src={startupLogo(activeStartup)} startupId={activeStartup.id} alt={startupName(activeStartup)} />
                ) : (
                  initials(startupName(activeStartup) || '?')
                )}
              </Avatar>
              <ConvHeaderTitle>
                <strong>{startupName(activeStartup)}</strong>
                <small>
                  {activeComments.length} {t('chats.messagesCount')}
                </small>
              </ConvHeaderTitle>
              <OpenDetailLink onClick={() => navigate(`/startups/${activeStartup.id}`)}>
                {t('chats.openDetail')}
              </OpenDetailLink>
            </ConvHeader>

            <Stream ref={streamRef}>
              {activeComments.length === 0 ? (
                <EmptyConversation>
                  <MessageCircle />
                  <div>{t('chats.noMessages')}</div>
                </EmptyConversation>
              ) : (
                activeComments.map((c, idx) => {
                  const sender: 'founder' | 'manager' =
                    c.senderType === 'founder' ? 'founder' : 'manager';
                  const ms = tsMs(c);
                  const prev = idx > 0 ? activeComments[idx - 1] : null;
                  const showDivider = !prev || dayKey(tsMs(prev)) !== dayKey(ms);
                  const isOwn =
                    sender === 'manager' && (!c.managerId || c.managerId === manager?.id);
                  const isEditing = editingId === c.id;
                  const isDeleting = deletingId === c.id;
                  return (
                    <div key={c.id}>
                      {showDivider && (
                        <DateDivider>
                          <DateDividerPill>
                            {formatDayDivider(
                              ms,
                              language,
                              t('chats.today'),
                              t('chats.yesterday'),
                            )}
                          </DateDividerPill>
                        </DateDivider>
                      )}
                      <Row $sender={sender} style={{ opacity: isDeleting ? 0.4 : 1 }}>
                        <MessageGroup $sender={sender}>
                          {canSeeAll && !isEditing && (() => {
                            const label =
                              sender === 'manager'
                                ? c.senderName || c.managerName
                                : c.senderName ||
                                  startupName(activeStartup) ||
                                  t('chats.founder');
                            return label ? (
                              <SenderLabel $sender={sender}>{label}</SenderLabel>
                            ) : null;
                          })()}
                          {isEditing ? (
                            <EditForm>
                              <EditTextarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                autoFocus
                              />
                              <EditActions>
                                <EditBtn type="button" onClick={cancelEdit}>
                                  {t('chats.cancel')}
                                </EditBtn>
                                <EditBtn
                                  type="button"
                                  $primary
                                  disabled={editSaving || !editText.trim()}
                                  onClick={() =>
                                    activeStartup && saveEdit(activeStartup.id, c.id)
                                  }
                                >
                                  {editSaving ? t('chats.saving') : t('chats.save')}
                                </EditBtn>
                              </EditActions>
                            </EditForm>
                          ) : (
                            <BubbleWrapper>
                              {isOwn && (
                                <ActionButtons>
                                  <IconBtn
                                    type="button"
                                    onClick={() => startEdit(c.id, c.text)}
                                    title={t('chats.edit')}
                                    aria-label={t('chats.edit')}
                                  >
                                    <Pencil size={14} />
                                  </IconBtn>
                                  <IconBtn
                                    type="button"
                                    className="danger"
                                    onClick={() =>
                                      activeStartup && deleteComment(activeStartup.id, c.id)
                                    }
                                    title={t('chats.delete')}
                                    aria-label={t('chats.delete')}
                                  >
                                    <Trash2 size={14} />
                                  </IconBtn>
                                </ActionButtons>
                              )}
                              <Bubble $sender={sender}>{c.text}</Bubble>
                            </BubbleWrapper>
                          )}
                          {!isEditing && (
                            <BubbleMeta $sender={sender}>
                              {(c as Comment & { editedAt?: unknown }).editedAt
                                ? `${t('chats.edited')} · `
                                : ''}
                              {formatBubbleTime(ms, language)}
                            </BubbleMeta>
                          )}
                        </MessageGroup>
                      </Row>
                    </div>
                  );
                })
              )}
            </Stream>

            {isLocked && (
              <LockedBanner>
                <Lock size={14} />
                {t('chats.locked')}
              </LockedBanner>
            )}

            <InputBar onSubmit={handleSend}>
              <TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder={
                  isLocked ? t('chats.lockedPlaceholder') : t('chats.inputPlaceholder')
                }
                disabled={isLocked || sending}
                rows={1}
              />
              <SendBtn
                type="submit"
                disabled={!draft.trim() || sending || isLocked}
                aria-label={t('chats.send')}
              >
                <Send size={18} />
              </SendBtn>
            </InputBar>
          </>
        )}
      </ConvPane>
    </Page>
  );
}
