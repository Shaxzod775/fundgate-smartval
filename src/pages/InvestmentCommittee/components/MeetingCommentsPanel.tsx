import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send } from 'lucide-react';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import { Badge, Button, ErrorText, Panel, TextArea, collectVoteComments } from './shared';
import { formatDayMonthLong, formatTime as formatTimeOfDay } from '../../../utils/formatDate';

const FlatPanel = styled(Panel)`
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;

  @media (max-width: 480px) {
    padding: 0;
  }
`;

type FeedItem =
  | { kind: 'comment'; id: string; authorName?: string; authorRole?: string; text: string; createdAt?: string }
  | { kind: 'vote'; id: string; authorName: string; projectName: string; vote?: string; text: string; createdAt?: string };

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ScrollArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  max-height: min(48vh, 380px);
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  overscroll-behavior: contain;
`;

const appear = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: none; }
`;

const CommentItem = styled.div<{ $isNew?: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-start;

  ${({ $isNew }) => $isNew && css`
    animation: ${appear} 260ms cubic-bezier(0.22, 1, 0.36, 1);
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Avatar = styled.div`
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.full};
  display: grid;
  place-items: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => `${theme.colors.accent.primary}22`};
  border: 1px solid ${({ theme }) => `${theme.colors.accent.primary}33`};
`;

const CommentBody = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CommentHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const AuthorName = styled.span`
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RoleChip = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => `${theme.colors.accent.primary}1a`};
`;

const TimeStamp = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`;

const Bubble = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  border-top-left-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Divider = styled.div<{ $tone?: 'unread' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ $tone, theme }) => ($tone === 'unread' ? '#ef4444' : theme.colors.text.tertiary)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  white-space: nowrap;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ $tone, theme }) => ($tone === 'unread' ? 'rgba(239,68,68,0.35)' : theme.colors.border.secondary)};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[4]}`};
  border: 1px dashed ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 28px;
    height: 28px;
    opacity: 0.55;
  }
  p {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizes.base};
  }
`;

const Composer = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ComposerBox = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: 6px 6px 6px ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.bg.input};
  transition: border-color ${({ theme }) => theme.transitions.base};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
  }
`;

const ComposerInput = styled(TextArea)`
  flex: 1 1 auto;
  min-height: 32px;
  max-height: 160px;
  padding: 6px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  resize: none;
  overflow-y: auto;

  &:focus {
    outline: none;
    border: 0;
    background: transparent;
  }
`;

const SendButton = styled.button`
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent.primary};
  color: #ffffff;
  cursor: pointer;
  transition: opacity ${({ theme }) => theme.transitions.base};

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.08); }

  svg { width: 18px; height: 18px; }
`;

function authorInitials(name?: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function commentDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatTime(value?: string): string {
  const date = commentDate(value);
  if (!date) return (value || '').slice(11, 16);
  return formatTimeOfDay(date);
}

function dayKey(value?: string): string {
  const date = commentDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface MeetingCommentsPanelProps {
  meeting: InvestmentCommitteeMeeting;
  readOnly: boolean;
  busy: boolean;
  error?: string;
  onSend: (text: string) => Promise<void>;
  unreadSinceAt?: string;
  autoFocusComposer?: boolean;
}

export default function MeetingCommentsPanel({
  meeting,
  readOnly,
  busy,
  error,
  onSend,
  unreadSinceAt,
  autoFocusComposer,
}: MeetingCommentsPanelProps) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const feedItems = useMemo<FeedItem[]>(() => {
    const real: FeedItem[] = (meeting.comments || []).map((comment, index) => ({
      kind: 'comment',
      id: comment.id || `${comment.createdAt || 'c'}-${index}`,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      text: comment.text || '',
      createdAt: comment.createdAt,
    }));
    const votes: FeedItem[] = collectVoteComments(meeting, t).map((item) => ({
      kind: 'vote',
      id: item.id,
      authorName: item.memberName,
      projectName: item.projectName,
      vote: item.vote,
      text: item.comment,
      createdAt: item.votedAt,
    }));
    return [...real, ...votes].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }, [meeting, t]);

  const { groups, firstUnreadId, unreadCount } = useMemo(() => {
    const dayGroups: Array<{ key: string; label: string; items: FeedItem[] }> = [];
    const todayKey = dayKey(new Date().toISOString());
    const yesterdayKey = dayKey(new Date(Date.now() - 86_400_000).toISOString());
    let unreadId: string | undefined;
    let unread = 0;
    feedItems.forEach((item) => {
      const key = dayKey(item.createdAt);
      const last = dayGroups[dayGroups.length - 1];
      if (!last || last.key !== key) {
        const date = commentDate(item.createdAt);
        const label = key === todayKey
          ? t('investmentCommittee.comments.today', 'Сегодня')
          : key === yesterdayKey
            ? t('investmentCommittee.comments.yesterday', 'Вчера')
            : date
              ? formatDayMonthLong(date, i18n.language)
              : '';
        dayGroups.push({ key, label, items: [item] });
      } else {
        last.items.push(item);
      }
      if (unreadSinceAt && item.createdAt && item.createdAt > unreadSinceAt) {
        unread += 1;
        if (!unreadId) unreadId = item.id;
      }
    });
    return { groups: dayGroups, firstUnreadId: unreadId, unreadCount: unread };
  }, [feedItems, unreadSinceAt, t, i18n.language]);

  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const seenIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(feedItems.map((item) => item.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = ids;
      return undefined;
    }
    const seen = seenIdsRef.current;
    const fresh = [...ids].filter((id) => !seen.has(id));
    seenIdsRef.current = ids;
    if (!fresh.length) return undefined;
    setNewIds(new Set(fresh));
    const timer = setTimeout(() => setNewIds(new Set()), 400);
    return () => clearTimeout(timer);
  }, [feedItems]);

  const resizeComposer = () => {
    const node = composerRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    if (autoFocusComposer && !readOnly) composerRef.current?.focus();
  }, [autoFocusComposer, readOnly]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [feedItems.length]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    await onSend(value);
    setText('');
    const node = composerRef.current;
    if (node) {
      node.style.height = 'auto';
      node.focus();
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!busy) void submit();
    }
  };

  return (
    <FlatPanel>
      {feedItems.length === 0 ? (
        <EmptyState>
          <MessageSquare aria-hidden="true" />
          <p>{t('investmentCommittee.comments.empty')}</p>
        </EmptyState>
      ) : (
        <ScrollArea>
          {groups.map((group, groupIndex) => (
            <CommentList key={`${group.key}-${groupIndex}`} as="div">
              {group.label ? <Divider>{group.label}</Divider> : null}
              {group.items.map((item, itemIndex) => (
                <div key={item.id || `${item.createdAt || 'c'}-${itemIndex}`}>
                  {firstUnreadId && item.id === firstUnreadId ? (
                    <Divider $tone="unread" style={{ marginBottom: 12 }}>
                      {t('investmentCommittee.comments.unreadDivider', { defaultValue: '{{count}} новых', count: unreadCount })}
                    </Divider>
                  ) : null}
                  <CommentItem $isNew={newIds.has(item.id)}>
                    <Avatar aria-hidden="true">{authorInitials(item.authorName)}</Avatar>
                    <CommentBody>
                      <CommentHead>
                        <AuthorName>{item.authorName || t('investmentCommittee.comments.participant')}</AuthorName>
                        {item.kind === 'vote' ? (
                          <Badge $tone={item.vote === 'against' ? 'red' : 'green'}>
                            {item.projectName} · {item.vote === 'against' ? t('investmentCommittee.matrix.voteAgainst') : t('investmentCommittee.matrix.voteFor')}
                          </Badge>
                        ) : item.authorRole ? (
                          <RoleChip>{item.authorRole}</RoleChip>
                        ) : null}
                        <TimeStamp>{formatTime(item.createdAt)}</TimeStamp>
                      </CommentHead>
                      <Bubble>{item.text}</Bubble>
                    </CommentBody>
                  </CommentItem>
                </div>
              ))}
            </CommentList>
          ))}
          <div ref={endRef} aria-hidden="true" />
        </ScrollArea>
      )}

      {!readOnly ? (
        <Composer>
          <ComposerBox>
            <ComposerInput
              ref={composerRef}
              rows={1}
              placeholder={t('investmentCommittee.comments.placeholder')}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                resizeComposer();
              }}
              onKeyDown={onComposerKeyDown}
            />
            <SendButton
              type="button"
              disabled={busy || !text.trim()}
              title={t('investmentCommittee.comments.send')}
              aria-label={t('investmentCommittee.comments.send')}
              onClick={submit}
            >
              <Send aria-hidden="true" />
            </SendButton>
          </ComposerBox>
          {error ? <ErrorText>{error}</ErrorText> : null}
        </Composer>
      ) : null}
    </FlatPanel>
  );
}
