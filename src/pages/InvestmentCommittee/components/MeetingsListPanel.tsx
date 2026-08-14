import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Archive, Banknote, BellRing, CalendarDays, Check, ChevronRight, Clock3, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import { StartupLogo } from '../../../components/ui/StartupLogo';
import {
  Badge,
  Button,
  EmptyState,
  Muted,
  Panel,
  PanelHeader,
  SectionTitle,
  formatAmount,
  meetingInvestmentTotal,
  meetingStage,
  projectName,
  stageTone,
  votingProgress,
} from './shared';

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  /* stretch — карточки в одном ряду выравниваются по высоте (футер прижат вниз),
     без «рваного» низа при разном числе чипов/пилюль */
  align-items: stretch;
`;

const Item = styled.button<{ $active?: boolean; $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  text-align: left;
  width: 100%;
  height: 100%;
  /* Фиксированная минимальная высота + прижатый вниз футер = все карточки
     всегда одного размера, независимо от длины названия, числа чипов и ряда.
     Заголовок клампится в 2 строки, чипы ограничены (3 + «+N»), поэтому
     контент почти всегда влезает в эту высоту, а короткие карточки
     добираются пустым местом над футером. */
  min-height: 168px;
  border: 1px solid ${({ $active, $selected, theme }) => ($active || $selected ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ $active, $selected, theme }) => ($active || $selected ? `${theme.colors.accent.primary}10` : theme.colors.bg.card)};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  box-shadow: ${({ $active, $selected, theme }) => ($active || $selected ? theme.shadows.sm : 'none')};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }
`;

const AttentionPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const ItemHeader = styled.span<{ $selectable?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  /* Длинный бейдж («Итоговый протокол») на узкой карточке уезжает на свою
     строку целиком, а не сплющивает заголовок до переноса по слогам. */
  flex-wrap: wrap;
  /* Справа поверх карточки лежит кебаб-кнопка «...»; слева — чекбокс выделения */
  padding-right: 30px;
  padding-left: ${({ $selectable }) => ($selectable ? '26px' : '0')};
`;

const ItemTitle = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.3;
  /* Заголовок тянется на всю свободную ширину, но не ужимается уже 140px —
     иначе flex предпочтёт рвать «Инвесткомитет 2026-07-14» по слогам вместо
     того, чтобы перенести бейдж вниз. */
  flex: 1 1 auto;
  min-width: 140px;
  overflow-wrap: anywhere;
  /* Кламп в 2 строки — одинаковая высота заголовка у всех карточек, без
     3-строчных перекосов; дата в названии делает их различимыми и так. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ItemMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  flex-wrap: wrap;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const ProjectChips = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ProjectChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  max-width: 170px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 2px ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`;

const ChipName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChipLogo = styled(StartupLogo)`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;

  /* fallback-инициал внутри StartupLogo рассчитан на 32px — ужимаем под 16px */
  span {
    font-size: 10px;
  }
`;

const ItemFooter = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  /* Прижимаем футер (владелец/сумма) вниз карточки — при stretch-высоте все
     футеры в ряду оказываются на одной линии независимо от контента выше. */
  margin-top: auto;
`;

const OwnerPill = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const InvestmentPill = styled(OwnerPill)`
  color: ${({ theme }) => theme.colors.status.success};
  background: ${({ theme }) => theme.colors.status.successBg};
`;

const Chevron = styled(ChevronRight)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex: 0 0 auto;
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Tab = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.border.secondary)};
  background: ${({ $active, theme }) => ($active ? `${theme.colors.accent.primary}1f` : theme.colors.bg.secondary)};
  color: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.text.secondary)};
  border-radius: ${({ theme }) => theme.radius.full};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.base}, border-color ${({ theme }) => theme.transitions.base}, color ${({ theme }) => theme.transitions.base};
  box-shadow: ${({ $active, theme }) => ($active ? `0 0 0 1px ${theme.colors.accent.primary}55` : 'none')};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
    background: ${({ $active, theme }) => ($active ? `${theme.colors.accent.primary}2b` : theme.colors.bg.tertiary)};
  }
`;

const TabCount = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  line-height: 1;
  background: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.bg.tertiary)};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text.secondary)};
`;

const Row = styled.div`
  position: relative;
`;

const KebabButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

const KebabMenu = styled.div`
  position: absolute;
  top: 36px;
  right: ${({ theme }) => theme.spacing[2]};
  z-index: 20;
  min-width: 190px;
  /* Меню не должно вылезать за экран на узких вьюпортах */
  max-width: calc(100vw - 48px);
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  /* Плавающее меню — solid-фон, сквозь rgba просвечивают карточки под ним */
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  overflow: hidden;
`;

const KebabItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: none;
  background: transparent;
  color: ${({ $danger, theme }) => ($danger ? '#ef4444' : theme.colors.text.primary)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const SelectBox = styled.button<{ $checked?: boolean }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing[3]};
  left: ${({ theme }) => theme.spacing[3]};
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  border: 1px solid ${({ $checked, theme }) => ($checked ? theme.colors.accent.primary : theme.colors.border.input)};
  background: ${({ $checked, theme }) => ($checked ? theme.colors.accent.primary : theme.colors.bg.card)};
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover { border-color: ${({ theme }) => theme.colors.accent.primary}; }

  svg { width: 14px; height: 14px; }
`;

const BulkBar = styled.div`
  position: sticky;
  top: ${({ theme }) => theme.spacing[2]};
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const BulkCount = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 800;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const BulkActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

interface MeetingsListPanelProps {
  meetings: InvestmentCommitteeMeeting[];
  selectedId?: string;
  canCreate: boolean;
  creating: boolean;
  onSelect: (meetingId: string) => void;
  onCreate: () => void;
  onDelete?: (meetingId: string) => void;
  onArchive?: (meetingId: string) => void;
  onBulkArchive?: (meetingIds: string[]) => void;
  onBulkDelete?: (meetingIds: string[]) => void;
  attentionIds?: string[];
}

export default function MeetingsListPanel({
  meetings,
  selectedId,
  canCreate,
  creating,
  onSelect,
  onCreate,
  onDelete,
  onArchive,
  onBulkArchive,
  onBulkDelete,
  attentionIds,
}: MeetingsListPanelProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'all' | 'active' | 'completed' | 'rework' | 'archive'>('all');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLElement>(null);
  const canBulk = Boolean(onBulkArchive || onBulkDelete);

  useEffect(() => { setSelectedIds(new Set()); }, [view]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const ids = new Set(meetings.map((meeting) => meeting.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [meetings]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    if (!menuId) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuId]);

  const hasReturns = (meeting: InvestmentCommitteeMeeting) => (meeting.returns?.length || 0) > 0;
  const archived = meetings.filter((meeting) => meetingStage(meeting) === 'cancelled');
  const completed = meetings.filter((meeting) => meetingStage(meeting) === 'completed');
  const rework = meetings.filter((meeting) => {
    const stage = meetingStage(meeting);
    return stage !== 'cancelled' && stage !== 'completed' && hasReturns(meeting);
  });
  const active = meetings.filter((meeting) => {
    const stage = meetingStage(meeting);
    return stage !== 'cancelled' && stage !== 'completed' && !hasReturns(meeting);
  });
  const byView = { all: meetings, archive: archived, completed, rework, active } as const;
  const attentionSet = new Set(attentionIds || []);
  const baseShown = byView[view];
  const shown = attentionSet.size
    ? [
      ...baseShown.filter((meeting) => attentionSet.has(meeting.id)),
      ...baseShown.filter((meeting) => !attentionSet.has(meeting.id)),
    ]
    : baseShown;

  const isArchivable = (meeting: InvestmentCommitteeMeeting) => {
    const stage = meetingStage(meeting);
    return stage !== 'cancelled' && stage !== 'completed' && stage !== 'signing';
  };
  const isDeletable = (meeting: InvestmentCommitteeMeeting) => {
    const stage = meetingStage(meeting);
    return stage === 'cancelled' || stage === 'completed';
  };
  const selectedShown = shown.filter((meeting) => selectedIds.has(meeting.id));
  const archivableSel = onBulkArchive ? selectedShown.filter(isArchivable) : [];
  const deletableSel = onBulkDelete ? selectedShown.filter(isDeletable) : [];

  const totalByMeeting = useMemo(
    () => new Map(meetings.map((meeting) => [meeting.id, meetingInvestmentTotal(meeting)])),
    [meetings],
  );
  const ownerByStage: Record<string, string> = {
    draft: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
    shortlist_signing: t('investmentCommittee.command.ownerDirector', 'Директор'),
    voting: t('investmentCommittee.command.ownerCommittee', 'Члены ИК'),
    signing: t('investmentCommittee.command.ownerManager', 'Инвест-менеджер'),
    completed: t('investmentCommittee.command.ownerArchive', 'Архив'),
    cancelled: t('investmentCommittee.command.ownerArchive', 'Архив'),
  };

  const renderCard = (meeting: InvestmentCommitteeMeeting) => {
    const stage = meetingStage(meeting);
    const projects = meeting.protocol?.presentedProjects || [];
    const projectCount = projects.length;
    const total = totalByMeeting.get(meeting.id) || 0;
    const attention = attentionSet.has(meeting.id);
    const progress = stage === 'voting' ? votingProgress(meeting) : null;
    const shownProjects = projects.slice(0, 3);
    const hiddenProjectCount = projectCount - shownProjects.length;
    return (
      <Item
        type="button"
        $active={meeting.id === selectedId}
        $selected={selectedIds.has(meeting.id)}
        onClick={() => {
          setMenuId(null);
          onSelect(meeting.id);
        }}
      >
        <ItemHeader $selectable={canBulk}>
          <ItemTitle>{meeting.title || meeting.id}</ItemTitle>
          <Badge $tone={stageTone(stage)}>{t(`investmentCommittee.stages.${stage}`)}</Badge>
        </ItemHeader>
        <ItemMeta>
          <CalendarDays />
          {meeting.meetingDate || '—'}
          <Muted as="span">· {t('investmentCommittee.list.projects', { count: projectCount })}</Muted>
          {progress ? (
            <Muted as="span">
              · {t('investmentCommittee.list.votingProgress', 'проголосовало: {{voted}}/{{total}}', progress)}
            </Muted>
          ) : null}
        </ItemMeta>
        {shownProjects.length > 0 ? (
          <ProjectChips>
            {shownProjects.map((project, index) => (
              <ProjectChip key={project.startupId || index}>
                <ChipLogo src={project.logoUrl} name={projectName(project)} variant="sm" />
                <ChipName>{projectName(project)}</ChipName>
              </ProjectChip>
            ))}
            {hiddenProjectCount > 0 ? <ProjectChip><ChipName>+{hiddenProjectCount}</ChipName></ProjectChip> : null}
          </ProjectChips>
        ) : null}
        <ItemFooter>
          {attention ? (
            <AttentionPill>
              <BellRing />
              {t('investmentCommittee.list.awaitsYou', 'Ждёт вас')}
            </AttentionPill>
          ) : (
            <OwnerPill>
              <Clock3 />
              {ownerByStage[stage]}
            </OwnerPill>
          )}
          {total > 0 ? (
            <InvestmentPill title={t('investmentCommittee.list.totalInvestment', 'Рассматриваемые инвестиции')}>
              <Banknote />
              {formatAmount(total)}
            </InvestmentPill>
          ) : (
            <Chevron />
          )}
        </ItemFooter>
      </Item>
    );
  };

  const canManage = Boolean(onArchive || onDelete);

  return (
    <Panel ref={rootRef}>
      <PanelHeader>
        <SectionTitle>
          <CalendarDays />
          {t('investmentCommittee.list.title')}
        </SectionTitle>
        {canCreate && (
          <Button type="button" $variant="primary" onClick={onCreate} disabled={creating}>
            <Plus />
            {t('investmentCommittee.list.newMeeting')}
          </Button>
        )}
      </PanelHeader>

      <Tabs>
        <Tab type="button" $active={view === 'all'} onClick={() => setView('all')}>
          {t('investmentCommittee.archive.tabAll', 'Все')}
          <TabCount $active={view === 'all'}>{meetings.length}</TabCount>
        </Tab>
        <Tab type="button" $active={view === 'active'} onClick={() => setView('active')}>
          {t('investmentCommittee.archive.tabActive', 'Активные')}
          <TabCount $active={view === 'active'}>{active.length}</TabCount>
        </Tab>
        <Tab type="button" $active={view === 'completed'} onClick={() => setView('completed')}>
          {t('investmentCommittee.archive.tabCompleted', 'Завершённые')}
          <TabCount $active={view === 'completed'}>{completed.length}</TabCount>
        </Tab>
        <Tab type="button" $active={view === 'rework'} onClick={() => setView('rework')}>
          {t('investmentCommittee.archive.tabRework', 'Доработка')}
          <TabCount $active={view === 'rework'}>{rework.length}</TabCount>
        </Tab>
        <Tab type="button" $active={view === 'archive'} onClick={() => setView('archive')}>
          {t('investmentCommittee.archive.tabArchive', 'Архив')}
          <TabCount $active={view === 'archive'}>{archived.length}</TabCount>
        </Tab>
      </Tabs>

      {canBulk && selectedShown.length > 0 ? (
        <BulkBar>
          <BulkCount>{t('investmentCommittee.bulk.selected', 'Выбрано: {{count}}', { count: selectedShown.length })}</BulkCount>
          <BulkActions>
            {onBulkArchive && archivableSel.length > 0 ? (
              <Button type="button" onClick={() => onBulkArchive(archivableSel.map((meeting) => meeting.id))}>
                <Archive />
                {t('investmentCommittee.bulk.archive', 'В архив')} ({archivableSel.length})
              </Button>
            ) : null}
            {onBulkDelete && deletableSel.length > 0 ? (
              <Button type="button" $variant="danger" onClick={() => onBulkDelete(deletableSel.map((meeting) => meeting.id))}>
                <Trash2 />
                {t('investmentCommittee.bulk.delete', 'Удалить')} ({deletableSel.length})
              </Button>
            ) : null}
            <Button type="button" onClick={() => setSelectedIds(new Set())}>
              <X />
              {t('investmentCommittee.bulk.clear', 'Снять выделение')}
            </Button>
          </BulkActions>
        </BulkBar>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState>
          {view === 'archive'
            ? t('investmentCommittee.archive.empty', 'Архив пуст')
            : view === 'completed'
              ? t('investmentCommittee.archive.emptyCompleted', 'Нет завершённых заседаний')
              : view === 'rework'
                ? t('investmentCommittee.archive.emptyRework', 'Нет заседаний на доработке')
                : t('investmentCommittee.list.empty')}
        </EmptyState>
      ) : (
        <List>
          {shown.map((meeting) => {
            const stage = meetingStage(meeting);
            const archivable = Boolean(onArchive) && stage !== 'cancelled' && stage !== 'completed' && stage !== 'signing';
            const deletable = Boolean(onDelete) && (stage === 'cancelled' || stage === 'completed');
            return (
              <Row key={meeting.id}>
                {canBulk ? (
                  <SelectBox
                    type="button"
                    role="checkbox"
                    aria-checked={selectedIds.has(meeting.id)}
                    aria-label={t('investmentCommittee.bulk.select', 'Выделить комитет')}
                    $checked={selectedIds.has(meeting.id)}
                    onClick={(event) => { event.stopPropagation(); toggleSelect(meeting.id); }}
                  >
                    {selectedIds.has(meeting.id) ? <Check /> : null}
                  </SelectBox>
                ) : null}
                {renderCard(meeting)}
                {canManage ? (
                  <KebabButton
                    type="button"
                    aria-label={t('investmentCommittee.list.actions', 'Действия')}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuId((current) => (current === meeting.id ? null : meeting.id));
                    }}
                  >
                    <MoreVertical />
                  </KebabButton>
                ) : null}
                {menuId === meeting.id ? (
                  <KebabMenu>
                    <KebabItem
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuId(null);
                        onSelect(meeting.id);
                      }}
                    >
                      <Pencil />
                      {t('investmentCommittee.list.openEdit', 'Открыть / редактировать')}
                    </KebabItem>
                    {archivable ? (
                      <KebabItem
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(null);
                          onArchive?.(meeting.id);
                        }}
                      >
                        <Archive />
                        {t('investmentCommittee.list.archive', 'Архивировать')}
                      </KebabItem>
                    ) : null}
                    {deletable ? (
                      <KebabItem
                        type="button"
                        $danger
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(null);
                          onDelete?.(meeting.id);
                        }}
                      >
                        <Trash2 />
                        {t('investmentCommittee.archive.deleteAction', 'Удалить навсегда')}
                      </KebabItem>
                    ) : null}
                  </KebabMenu>
                ) : null}
              </Row>
            );
          })}
        </List>
      )}
    </Panel>
  );
}
