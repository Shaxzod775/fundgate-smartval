import { useEffect, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Phone, Calendar, FileText, History } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal/Modal';
import { startupsApi, type StartupInteraction, type InteractionType } from '../../../services/api';
import { formatMediumDate } from '../../../utils/formatDate';

interface InteractionLogSectionProps {
  startupId: string;
  status?: string;
  canEdit: boolean;
  managerId?: string;
  managerName?: string;
}

const LOGGABLE_STAGES = new Set(['in_review', 'pipeline', 'portfolio']);

const META: Record<InteractionType, { labelKey: string; color: string }> = {
  contacted: { labelKey: 'startupDetail.interactions.types.contacted', color: '#3b82f6' },
  meeting: { labelKey: 'startupDetail.interactions.types.meeting', color: '#8b5cf6' },
  documents: { labelKey: 'startupDetail.interactions.types.documents', color: '#10b981' },
};

const ICONS: Record<InteractionType, JSX.Element> = {
  contacted: <Phone size={16} />,
  meeting: <Calendar size={16} />,
  documents: <FileText size={16} />,
};

const pad = (n: number): string => String(n).padStart(2, '0');

const toMillis = (value: StartupInteraction['occurredAt']): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const seconds = (value as { _seconds?: number; seconds?: number })._seconds
    ?? (value as { _seconds?: number; seconds?: number }).seconds;
  return typeof seconds === 'number' ? seconds * 1000 : null;
};

const formatDate = (value: StartupInteraction['occurredAt']): string => {
  const ms = toMillis(value);
  if (!ms) return '';
  return formatMediumDate(new Date(ms));
};

const todayInput = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const ItemIcon = styled.div<{ $color: string }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: ${({ $color }) => $color};
`;

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ItemType = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ItemDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

const ItemNote = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
  word-break: break-word;
`;

const ItemManager = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`;

const Empty = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.spacing[3]} 0;
`;

const Field = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const inputStyles = `
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
`;

const DateInput = styled.input`
  ${inputStyles}
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Textarea = styled.textarea`
  ${inputStyles}
  min-height: 92px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

export function InteractionLogSection({ startupId, status, canEdit, managerId, managerName }: InteractionLogSectionProps) {
  const { t } = useTranslation();
  const canLog = canEdit && LOGGABLE_STAGES.has(status || '');
  const [items, setItems] = useState<StartupInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<InteractionType | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!startupId) return;
    let cancelled = false;
    setLoading(true);
    startupsApi
      .getInteractions(startupId)
      .then((res) => {
        if (!cancelled) setItems(res.success && res.data ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [startupId]);

  const openModal = (type: InteractionType) => {
    setModalType(type);
    setDate(todayInput());
    setNote('');
  };

  const submit = async () => {
    if (!modalType || saving) return;
    setSaving(true);
    try {
      const occurredAt = date ? new Date(`${date}T12:00:00`).toISOString() : undefined;
      const res = await startupsApi.addInteraction(startupId, {
        type: modalType,
        note: note.trim() || undefined,
        occurredAt,
        managerId,
        managerName,
      });
      if (res.success && res.data) {
        setItems((prev) => [res.data as StartupInteraction, ...prev]);
        setModalType(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section>
      <SectionTitle>
        <History size={20} />
        {t('startupDetail.interactions.title', 'Взаимодействия')}
      </SectionTitle>

      {canLog && (
        <Actions>
          <Button variant="ghost" size="sm" onClick={() => openModal('contacted')}>
            <Phone size={15} /> {t('startupDetail.interactions.types.contacted', 'Связался')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openModal('meeting')}>
            <Calendar size={15} /> {t('startupDetail.interactions.types.meeting', 'Встреча')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openModal('documents')}>
            <FileText size={15} /> {t('startupDetail.interactions.types.documents', 'Документы')}
          </Button>
        </Actions>
      )}

      {loading ? (
        <Empty>{t('common.loading', 'Загрузка...')}</Empty>
      ) : items.length === 0 ? (
        <Empty>
          {canLog
            ? t('startupDetail.interactions.emptyLoggable', 'Пока нет отмеченных действий. Зафиксируйте контакт, встречу или получение документов.')
            : t('startupDetail.interactions.empty', 'Пока нет отмеченных действий.')}
        </Empty>
      ) : (
        <List>
          {items.map((it) => {
            const meta = META[it.type];
            const label = meta ? t(meta.labelKey) : it.type;
            const color = meta ? meta.color : '#6b7280';
            return (
              <Item key={it.id}>
                <ItemIcon $color={color}>{ICONS[it.type] || <History size={16} />}</ItemIcon>
                <ItemBody>
                  <ItemTop>
                    <ItemType>{label}</ItemType>
                    <ItemDate>{formatDate(it.occurredAt)}</ItemDate>
                  </ItemTop>
                  {it.note ? <ItemNote>{it.note}</ItemNote> : null}
                  {it.managerName ? <ItemManager>{it.managerName}</ItemManager> : null}
                </ItemBody>
              </Item>
            );
          })}
        </List>
      )}

      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType
          ? t('startupDetail.interactions.logTitle', { type: t(META[modalType].labelKey) })
          : ''}
        width="440px"
      >
        <Field>
          <Label>{t('startupDetail.interactions.dateLabel', 'Дата')}</Label>
          <DateInput type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayInput()} />
        </Field>
        <Field>
          <Label>{t('startupDetail.interactions.noteLabel', 'Комментарий (необязательно)')}</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('startupDetail.interactions.notePlaceholder', 'Кратко: что обсудили, какие документы получены…')}
          />
        </Field>
        <ModalActions>
          <Button variant="ghost" size="sm" onClick={() => setModalType(null)} disabled={saving}>
            {t('common.cancel', 'Отмена')}
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? t('common.saving', 'Сохраняю...') : t('common.save', 'Сохранить')}
          </Button>
        </ModalActions>
      </Modal>
    </Section>
  );
}

export default InteractionLogSection;
