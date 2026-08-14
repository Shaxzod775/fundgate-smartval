import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  UserPlus,
  CheckCircle2,
  FileText,
  MessageSquare,
  Pencil,
  ClipboardCheck,
  Phone,
  CalendarDays,
  Archive,
  Settings2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { directorApi, type DirectorActivityEvent } from '../../services/api';
import { formatLongDate, formatTime, languageLocale } from '../../utils/formatDate';

type Cat =
  | 'status'
  | 'assign'
  | 'deal'
  | 'documents'
  | 'comment'
  | 'edit'
  | 'review'
  | 'contact'
  | 'meeting'
  | 'archive'
  | 'system';

const ACTIONS: Record<string, { labelKey: string; cat: Cat }> = {
  status_changed: { labelKey: 'directorDashboard.eventLog.actions.status_changed', cat: 'status' },
  fundgate_scored: { labelKey: 'directorDashboard.eventLog.actions.fundgate_scored', cat: 'status' },
  finally_blocked: { labelKey: 'directorDashboard.eventLog.actions.finally_blocked', cat: 'status' },
  assigned: { labelKey: 'directorDashboard.eventLog.actions.assigned', cat: 'assign' },
  interaction_contacted: { labelKey: 'directorDashboard.eventLog.actions.interaction_contacted', cat: 'contact' },
  interaction_meeting: { labelKey: 'directorDashboard.eventLog.actions.interaction_meeting', cat: 'meeting' },
  interaction_documents: { labelKey: 'directorDashboard.eventLog.actions.interaction_documents', cat: 'documents' },
  document_request_created: { labelKey: 'directorDashboard.eventLog.actions.document_request_created', cat: 'documents' },
  document_request_reminder: { labelKey: 'directorDashboard.eventLog.actions.document_request_reminder', cat: 'documents' },
  document_approved: { labelKey: 'directorDashboard.eventLog.actions.document_approved', cat: 'documents' },
  document_reviewed: { labelKey: 'directorDashboard.eventLog.actions.document_reviewed', cat: 'documents' },
  document_changes_requested: { labelKey: 'directorDashboard.eventLog.actions.document_changes_requested', cat: 'documents' },
  pitch_deck_uploaded: { labelKey: 'directorDashboard.eventLog.actions.pitch_deck_uploaded', cat: 'documents' },
  dd_review_updated: { labelKey: 'directorDashboard.eventLog.actions.dd_review_updated', cat: 'review' },
  investment_memo_generated: { labelKey: 'directorDashboard.eventLog.actions.investment_memo_generated', cat: 'review' },
  smartval_requested: { labelKey: 'directorDashboard.eventLog.actions.smartval_requested', cat: 'review' },
  sent_to_investment_committee: { labelKey: 'directorDashboard.eventLog.actions.sent_to_investment_committee', cat: 'review' },
  investment_committee_prepared: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_prepared', cat: 'review' },
  investment_committee_updated: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_updated', cat: 'review' },
  investment_committee_signature_updated: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_signature_updated', cat: 'review' },
  investment_committee_protocol_exported: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_protocol_exported', cat: 'review' },
  investment_committee_document_uploaded: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_document_uploaded', cat: 'review' },
  investment_committee_signed_document_uploaded: { labelKey: 'directorDashboard.eventLog.actions.investment_committee_signed_document_uploaded', cat: 'review' },
  founder_change_submitted: { labelKey: 'directorDashboard.eventLog.actions.founder_change_submitted', cat: 'edit' },
  founder_change_manager_approved: { labelKey: 'directorDashboard.eventLog.actions.founder_change_manager_approved', cat: 'edit' },
  founder_change_director_approved: { labelKey: 'directorDashboard.eventLog.actions.founder_change_director_approved', cat: 'edit' },
  founder_change_director_rejected: { labelKey: 'directorDashboard.eventLog.actions.founder_change_director_rejected', cat: 'edit' },
  founder_change_approved: { labelKey: 'directorDashboard.eventLog.actions.founder_change_approved', cat: 'edit' },
  founder_change_rejected: { labelKey: 'directorDashboard.eventLog.actions.founder_change_rejected', cat: 'edit' },
  archived: { labelKey: 'directorDashboard.eventLog.actions.archived', cat: 'archive' },
  restored: { labelKey: 'directorDashboard.eventLog.actions.restored', cat: 'archive' },
  portfolio_import_created: { labelKey: 'directorDashboard.eventLog.actions.portfolio_import_created', cat: 'system' },
  portfolio_import_updated: { labelKey: 'directorDashboard.eventLog.actions.portfolio_import_updated', cat: 'system' },
  fundgate_score_blocked: { labelKey: 'directorDashboard.eventLog.actions.fundgate_score_blocked', cat: 'system' },
  ai_analysis_completed: { labelKey: 'directorDashboard.eventLog.actions.ai_analysis_completed', cat: 'system' },
  created: { labelKey: 'directorDashboard.eventLog.actions.created', cat: 'system' },
  updated: { labelKey: 'directorDashboard.eventLog.actions.updated', cat: 'system' },
};

function humanize(action: string): string {
  const s = action.replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : action;
}

const CAT_META: Record<Cat, { labelKey: string; color: string; Icon: typeof Activity }> = {
  status: { labelKey: 'directorDashboard.eventLog.categories.status', color: '#34d399', Icon: Activity },
  assign: { labelKey: 'directorDashboard.eventLog.categories.assign', color: '#3b82f6', Icon: UserPlus },
  deal: { labelKey: 'directorDashboard.eventLog.categories.deal', color: '#10b981', Icon: CheckCircle2 },
  documents: { labelKey: 'directorDashboard.eventLog.categories.documents', color: '#3b82f6', Icon: FileText },
  comment: { labelKey: 'directorDashboard.eventLog.categories.comment', color: '#94a3b8', Icon: MessageSquare },
  edit: { labelKey: 'directorDashboard.eventLog.categories.edit', color: '#f59e0b', Icon: Pencil },
  review: { labelKey: 'directorDashboard.eventLog.categories.review', color: '#8b5cf6', Icon: ClipboardCheck },
  contact: { labelKey: 'directorDashboard.eventLog.categories.contact', color: '#3b82f6', Icon: Phone },
  meeting: { labelKey: 'directorDashboard.eventLog.categories.meeting', color: '#8b5cf6', Icon: CalendarDays },
  archive: { labelKey: 'directorDashboard.eventLog.categories.archive', color: '#6b7280', Icon: Archive },
  system: { labelKey: 'directorDashboard.eventLog.categories.system', color: '#6b7280', Icon: Settings2 },
};

const resolve = (action: string, t: any): { label: string; cat: Cat } => {
  const exact = ACTIONS[action];
  if (exact) return { label: t(exact.labelKey), cat: exact.cat };
  if (action.startsWith('investment_committee')) {
    return { label: t('directorDashboard.eventLog.actions.investmentCommitteeDynamic', { action: humanize(action.replace('investment_committee', '')) }), cat: 'review' };
  }
  if (action.startsWith('quarterly_report')) {
    const suffix = action.replace(/^quarterly_report_?/, '');
    return {
      label: suffix
        ? t('directorDashboard.eventLog.actions.quarterlyReportDynamic', { action: humanize(suffix) })
        : t('directorDashboard.eventLog.actions.quarterlyReport'),
      cat: 'documents'
    };
  }
  if (action.startsWith('founder_change')) return { label: humanize(action), cat: 'edit' };
  if (action.startsWith('document') || action.endsWith('_uploaded')) return { label: humanize(action), cat: 'documents' };
  if (action.startsWith('status')) return { label: humanize(action), cat: 'status' };
  if (action.includes('import') || action.includes('blocked')) return { label: humanize(action), cat: 'system' };
  return { label: humanize(action), cat: 'edit' };
};

const STAGE_LABELS: Record<string, string> = {
  new: 'directorDashboard.status.new',
  in_review: 'directorDashboard.status.inReview',
  pipeline: 'directorDashboard.status.pipeline',
  portfolio: 'directorDashboard.status.portfolio',
  rejected: 'directorDashboard.status.rejected',
};
const stageLabel = (s: string | undefined, t: any): string => (s ? t(STAGE_LABELS[s] || s, { defaultValue: s }) : '—');

function eventDetail(e: DirectorActivityEvent, t: any): string {
  if (e.action === 'status_changed' && (e.fromStatus || e.toStatus)) {
    return `${stageLabel(e.fromStatus, t)} → ${stageLabel(e.toStatus, t)}`;
  }
  if (e.action.startsWith('interaction_')) return (e.details || '').trim();
  if (e.action === 'archived' || e.action === 'rejected') {
    const m = (e.details || '').match(/(?:Причина|Rejected):\s*(.+)$/i);
    return m ? m[1].trim() : '';
  }
  return '';
}

const PERIODS = [
  { labelKey: 'directorDashboard.eventLog.periods.all', days: 0 },
  { labelKey: 'directorDashboard.periods.7', days: 7 },
  { labelKey: 'directorDashboard.periods.30', days: 30 },
  { labelKey: 'directorDashboard.periods.90', days: 90 },
];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
function dayLabel(ms: number, t: any, language: string): string {
  const today = startOfDay(Date.now());
  const diff = Math.round((today - startOfDay(ms)) / 86400000);
  if (diff === 0) return t('directorDashboard.eventLog.today');
  if (diff === 1) return t('directorDashboard.eventLog.yesterday');
  return formatLongDate(new Date(ms), language);
}
function timeLabel(ms: number, language: string): string {
  if (!ms) return '';
  return formatTime(new Date(ms), language);
}

const Wrap = styled.div`
  margin-top: 28px;
`;
const Title = styled.h2`
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary, #e5e7eb);
`;
const Sub = styled.p`
  font-size: 14px;
  color: var(--text-muted, #9ca3af);
  margin: 0 0 14px;
`;
const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;
const DropdownWrap = styled.div`
  position: relative;
  display: inline-block;
`;
const DropdownTrigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 150px;
  max-width: 220px;
  background: var(--bg-card, rgba(255, 255, 255, 0.03));
  color: var(--text-primary, #e5e7eb);
  border: 1px solid ${({ $open }) => ($open ? 'var(--accent-primary, #6366f1)' : 'var(--border-primary, #2a2f3a)')};
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
  &:hover {
    border-color: var(--accent-primary, #6366f1);
  }
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 60;
  min-width: 100%;
  max-height: 280px;
  overflow-y: auto;
  background: var(--bg-elevated, #161922);
  border: 1px solid var(--border-primary, #2a2f3a);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-secondary, #3a3f4a);
    border-radius: 3px;
  }
`;
const DropdownItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: ${({ $active }) => ($active ? 'var(--accent-primary, #6366f1)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : 'var(--text-primary, #e5e7eb)')};
  border: none;
  border-radius: 7px;
  padding: 8px 10px;
  font-size: 14px;
  line-height: 1.3;
  cursor: pointer;
  transition: background 0.1s;
  &:hover {
    background: ${({ $active }) => ($active ? 'var(--accent-primary, #6366f1)' : 'var(--bg-card-hover, rgba(255, 255, 255, 0.06))')};
  }
  svg {
    flex: 0 0 auto;
  }
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
const Search = styled.input`
  background: var(--bg-card, rgba(255, 255, 255, 0.03));
  color: var(--text-primary, #e5e7eb);
  border: 1px solid var(--border-primary, #2a2f3a);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 14px;
  outline: none;
  min-width: 180px;
  flex: 1;
  &::placeholder {
    color: var(--text-muted, #9ca3af);
  }
`;
const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary, #cbd5e1);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
`;
const DayHeader = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #9ca3af);
  margin: 18px 0 8px;
`;
const Feed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const ScrollArea = styled.div`
  max-height: 720px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-primary, #2a2f3a) transparent;
  /* drop the leading day-header gap so the scroll box starts flush */
  & > div:first-child ${DayHeader} {
    margin-top: 2px;
  }
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-primary, #2a2f3a);
    border-radius: 8px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted, #6b7280);
  }
`;
const Row = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--border-primary, #2a2f3a);
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: 10px;
  background: var(--bg-card, rgba(255, 255, 255, 0.02));
`;
const IconBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1f;
  & svg {
    width: 15px;
    height: 15px;
  }
`;
const Manager = styled.span`
  font-weight: 600;
  color: var(--text-primary, #e5e7eb);
  min-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const ActionLabel = styled.span<{ $color: string }>`
  font-size: 14px;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;
const Startup = styled.span`
  font-size: 14px;
  color: var(--text-secondary, #cbd5e1);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const When = styled.span`
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  white-space: nowrap;
`;
const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
`;
const BodyTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;
const Detail = styled.span`
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Empty = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
`;

type DropdownOption<T> = { value: T; label: string };

function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <DropdownWrap ref={ref}>
      <DropdownTrigger
        type="button"
        $open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected ? selected.label : ''}</span>
        <ChevronDown
          size={15}
          style={{ flex: '0 0 auto', opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </DropdownTrigger>
      {open && (
        <DropdownMenu role="listbox">
          {options.map((o) => (
            <DropdownItem
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={o.value === value}
              $active={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.value === value ? <Check size={14} /> : <span style={{ width: 14, flex: '0 0 auto' }} />}
              <span>{o.label}</span>
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </DropdownWrap>
  );
}

export function DirectorEventLog() {
  const { t, i18n } = useTranslation();
  const { manager } = useAuth();
  const { can } = usePermissions();
  const organizationId = manager?.organizationId || '';
  const canView = can('director:view');
  const locale = languageLocale(i18n.language);

  const [all, setAll] = useState<DirectorActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(40);
  const [mgrFilter, setMgrFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [periodDays, setPeriodDays] = useState(0);
  const [showSystem, setShowSystem] = useState(false);
  const [search, setSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    setLoading(true);
    setError(false);
    const params: { limit: number; from?: string; to?: string } = { limit: 2000 };
    if (periodDays > 0) params.from = new Date(Date.now() - periodDays * 86400000).toISOString();
    directorApi
      .getActivity(organizationId, params)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setAll(res.data);
        else setError(true);
      })
      .catch(() => {
        if (active) setError(true); // network/JSON failure — don't mask as "no events"
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, canView, periodDays]);

  const managerOptions = useMemo(() => {
    const set = new Set<string>();
    all.forEach((e) => e.managerName && set.add(e.managerName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, locale));
  }, [all, locale]);

  const catOptions = useMemo(() => {
    const present = new Set<Cat>();
    all.forEach((e) => present.add(resolve(e.action, t).cat));
    return (Object.keys(CAT_META) as Cat[]).filter((c) => present.has(c) && (showSystem || c !== 'system'));
  }, [all, showSystem, t]);

  useEffect(() => {
    if (catFilter && !catOptions.includes(catFilter as Cat)) setCatFilter('');
  }, [catOptions, catFilter]);

  const filtered = useMemo(() => {
    const minTs = periodDays > 0 ? Date.now() - periodDays * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return all.filter((e) => {
      const { cat } = resolve(e.action, t);
      if (!showSystem && cat === 'system') return false;
      if (mgrFilter && e.managerName !== mgrFilter) return false;
      if (catFilter && cat !== catFilter) return false;
      if (minTs && e.at < minTs) return false;
      if (q && !e.startupName.toLowerCase().includes(q) && !e.managerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, mgrFilter, catFilter, periodDays, showSystem, search, t]);

  useEffect(() => setVisible(40), [mgrFilter, catFilter, periodDays, showSystem, search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((v) => (v < filtered.length ? v + 40 : v));
      },
      { root: scrollRef.current, rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: DirectorActivityEvent[] }> = [];
    let curKey = '';
    for (const e of filtered.slice(0, visible)) {
      const key = String(startOfDay(e.at));
      if (key !== curKey) {
        out.push({ day: dayLabel(e.at, t, locale), items: [] });
        curKey = key;
      }
      out[out.length - 1].items.push(e);
    }
    return out;
  }, [filtered, visible, t, locale]);

  if (!canView) return null;

  return (
    <Wrap>
      <Title>{t('directorDashboard.eventLog.title')}</Title>
      <Sub>{t('directorDashboard.eventLog.subtitle')}</Sub>

      <Filters>
        <Search placeholder={t('directorDashboard.eventLog.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Dropdown
          ariaLabel={t('directorDashboard.eventLog.allManagers')}
          value={mgrFilter}
          onChange={setMgrFilter}
          options={[
            { value: '', label: t('directorDashboard.eventLog.allManagers') },
            ...managerOptions.map((m) => ({ value: m, label: m })),
          ]}
        />
        <Dropdown
          ariaLabel={t('directorDashboard.eventLog.allTypes')}
          value={catFilter}
          onChange={setCatFilter}
          options={[
            { value: '', label: t('directorDashboard.eventLog.allTypes') },
            ...catOptions.map((c) => ({ value: c as string, label: t(CAT_META[c].labelKey) })),
          ]}
        />
        <Dropdown
          ariaLabel={t(PERIODS[0]?.labelKey ?? '')}
          value={periodDays}
          onChange={setPeriodDays}
          options={PERIODS.map((p) => ({ value: p.days, label: t(p.labelKey) }))}
        />
        <Toggle>
          <input type="checkbox" checked={showSystem} onChange={(e) => setShowSystem(e.target.checked)} />
          {t('directorDashboard.eventLog.showSystem')}
        </Toggle>
      </Filters>

      {loading ? (
        <Empty>{t('directorDashboard.eventLog.loading')}</Empty>
      ) : error ? (
        <Empty>{t('directorDashboard.eventLog.error')}</Empty>
      ) : filtered.length === 0 ? (
        <Empty>{t('directorDashboard.eventLog.empty')}</Empty>
      ) : (
        <ScrollArea ref={scrollRef}>
          {groups.map((g, gi) => (
            <div key={`${g.day}-${gi}`}>
              <DayHeader>{g.day}</DayHeader>
              <Feed>
                {g.items.map((e, i) => {
                  const { label, cat } = resolve(e.action, t);
                  const meta = CAT_META[cat];
                  const Icon = meta.Icon;
                  const detail = eventDetail(e, t);
                  return (
                    <Row key={`${e.startupId}-${gi}-${i}`} $color={meta.color}>
                      <IconBadge $color={meta.color}>
                        <Icon />
                      </IconBadge>
                      <Body>
                        <BodyTop>
                          <Manager title={e.managerName}>{e.managerName || '—'}</Manager>
                          <ActionLabel $color={meta.color}>{label}</ActionLabel>
                          <Startup title={e.startupName}>{e.startupName}</Startup>
                          <When>{timeLabel(e.at, locale)}</When>
                        </BodyTop>
                        {detail && <Detail title={detail}>{detail}</Detail>}
                      </Body>
                    </Row>
                  );
                })}
              </Feed>
            </div>
          ))}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {visible < filtered.length && <Empty>{t('directorDashboard.eventLog.loadMoreHint')}</Empty>}
        </ScrollArea>
      )}
    </Wrap>
  );
}

export default DirectorEventLog;
