import { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import Modal from '../../../components/ui/Modal/Modal';
import type { DataRoomBlocker, DataRoomBlockerReasonInput } from '../../../services/api';
import {
  DATA_ROOM_URL_MAX_LENGTH,
  type DataRoomUrlErrorCode,
  validateDataRoomUrl,
} from '../../../utils/startupDataRoom';
import {
  DATA_ROOM_REASON_MAX_LENGTH,
  DATA_ROOM_REASON_MIN_LENGTH,
  areAllDataRoomReasonsValid,
  initialDataRoomReasons,
  isValidDataRoomReason,
  toDataRoomReasonInputs,
} from '../dataRoomGate';
import { Button, ErrorText, InfoBanner, Muted } from './shared';

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const BlockerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const BlockerCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const BlockerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ProjectName = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  overflow-wrap: anywhere;
`;

const OpenCardLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const SystemReason = styled.div`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FieldLabel = styled.label`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
`;

const LinkEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const LinkInputRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[2]};

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const LinkInput = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.status.error};
  }
`;

const LinkHint = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
`;

const LinkError = styled.span`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: 12px;
`;

const Alternative = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  text-transform: uppercase;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border.secondary};
  }
`;

const ReasonInput = styled.textarea`
  width: 100%;
  min-height: 92px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  resize: vertical;

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.status.error};
  }
`;

const FieldMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

interface DataRoomBlockersDialogProps {
  blockers: DataRoomBlocker[];
  busy?: boolean;
  error?: string;
  canEditLink: (startupId: string) => boolean;
  onSaveLink: (startupId: string, dataRoomUrl: string) => void | Promise<void>;
  onSave: (reasons: DataRoomBlockerReasonInput[]) => void | Promise<void>;
  onDone: () => void | Promise<void>;
  onClose: () => void;
}

const REASON_KEYS = {
  missing_data_room_url: 'investmentCommittee.dataRoomBlockers.reasons.missing',
  invalid_data_room_url: 'investmentCommittee.dataRoomBlockers.reasons.invalid',
  startup_not_found: 'investmentCommittee.dataRoomBlockers.reasons.notFound',
} as const;

const URL_ERROR_KEYS: Record<DataRoomUrlErrorCode, string> = {
  required: 'startupDetail.dataRoomLink.errors.required',
  too_long: 'startupDetail.dataRoomLink.errors.tooLong',
  https_required: 'startupDetail.dataRoomLink.errors.httpsRequired',
  credentials_not_allowed: 'startupDetail.dataRoomLink.errors.credentialsNotAllowed',
  invalid: 'startupDetail.dataRoomLink.errors.invalid',
};

const URL_ERROR_FALLBACKS: Record<DataRoomUrlErrorCode, string> = {
  required: 'Укажите ссылку на Data Room.',
  too_long: 'Ссылка должна быть не длиннее 2048 символов.',
  https_required: 'Укажите полную HTTPS-ссылку, начинающуюся с https://.',
  credentials_not_allowed: 'Ссылки с логином или паролем не разрешены.',
  invalid: 'Укажите корректную ссылку на Data Room.',
};

export default function DataRoomBlockersDialog({
  blockers,
  busy = false,
  error,
  canEditLink,
  onSaveLink,
  onSave,
  onDone,
  onClose,
}: DataRoomBlockersDialogProps) {
  const { t } = useTranslation();
  const fieldIdPrefix = useId();
  const [reasons, setReasons] = useState<Record<string, string>>(
    () => initialDataRoomReasons(blockers),
  );
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [linkRequestErrors, setLinkRequestErrors] = useState<Record<string, string>>({});
  const [linkSavingById, setLinkSavingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setReasons((current) => Object.fromEntries(blockers.map((blocker) => [
      blocker.startupId,
      current[blocker.startupId] ?? blocker.managerReason ?? '',
    ])));
  }, [blockers]);

  useEffect(() => {
    const blockerIds = new Set(blockers.map((blocker) => blocker.startupId));
    setLinkValues((current) => Object.fromEntries(
      Object.entries(current).filter(([startupId]) => blockerIds.has(startupId)),
    ));
    setLinkRequestErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([startupId]) => blockerIds.has(startupId)),
    ));
  }, [blockers]);

  const canSave = useMemo(
    () => areAllDataRoomReasonsValid(blockers, reasons),
    [blockers, reasons],
  );
  const isSavingLink = Object.values(linkSavingById).some(Boolean);

  const handleSave = () => {
    if (!canSave || busy || isSavingLink) return;
    void onSave(toDataRoomReasonInputs(blockers, reasons));
  };

  const handleSaveLink = async (blocker: DataRoomBlocker) => {
    const startupId = blocker.startupId;
    if (busy || linkSavingById[startupId]) return;

    const validation = validateDataRoomUrl(linkValues[startupId] || '');
    if (!validation.ok) return;

    setLinkSavingById((current) => ({ ...current, [startupId]: true }));
    setLinkRequestErrors((current) => ({ ...current, [startupId]: '' }));
    try {
      await onSaveLink(startupId, validation.url);
    } catch (saveError) {
      setLinkRequestErrors((current) => ({
        ...current,
        [startupId]: saveError instanceof Error
          ? saveError.message
          : t(
            'startupDetail.dataRoomLink.errors.saveFailed',
            'Не удалось сохранить ссылку на Data Room.',
          ),
      }));
    } finally {
      setLinkSavingById((current) => ({ ...current, [startupId]: false }));
    }
  };

  const closeDisabled = busy || isSavingLink;

  return (
    <Modal
      isOpen
      onClose={() => { if (!closeDisabled) onClose(); }}
      title={t('investmentCommittee.dataRoomBlockers.title', 'Нужны ссылки на Data Room')}
      width="680px"
      disableBackdropClose={closeDisabled}
    >
      <Stack>
        {blockers.length > 0 ? (
          <>
            <InfoBanner $tone="amber">
              <AlertTriangle />
              <span>{t(
                'investmentCommittee.dataRoomBlockers.hint',
                'Переход заблокирован. Добавьте ссылку прямо здесь или укажите причину задержки.',
              )}</span>
            </InfoBanner>

            <Muted>{t(
              'investmentCommittee.dataRoomBlockers.noBypass',
              'Сохранение данных не переводит заседание дальше: после добавления ссылок повторите действие.',
            )}</Muted>
          </>
        ) : (
          <InfoBanner $tone="green">
            <CheckCircle2 />
            <span>{t(
              'investmentCommittee.dataRoomBlockers.allResolved',
              'Все ссылки добавлены. Закройте окно и повторите переход на следующий этап.',
            )}</span>
          </InfoBanner>
        )}

        <BlockerList>
          {blockers.map((blocker, index) => {
            const inputId = `${fieldIdPrefix}-reason-${index}`;
            const metaId = `${inputId}-meta`;
            const projectNameId = `${fieldIdPrefix}-project-${index}`;
            const linkInputId = `${fieldIdPrefix}-link-${index}`;
            const linkHintId = `${linkInputId}-hint`;
            const linkErrorId = `${linkInputId}-error`;
            const value = reasons[blocker.startupId] || '';
            const trimmedLength = value.trim().length;
            const valid = isValidDataRoomReason(value);
            const reasonLabel = t(REASON_KEYS[blocker.reasonCode], blocker.message);
            const linkValue = linkValues[blocker.startupId] || '';
            const linkValidation = validateDataRoomUrl(linkValue);
            const linkValidationCode = linkValue.trim() && !linkValidation.ok
              ? linkValidation.code
              : null;
            const linkRequestError = linkRequestErrors[blocker.startupId] || '';
            const linkSaving = Boolean(linkSavingById[blocker.startupId]);
            const linkEditable = blocker.reasonCode !== 'startup_not_found'
              && canEditLink(blocker.startupId);
            const linkError = linkRequestError || (linkValidationCode
              ? t(URL_ERROR_KEYS[linkValidationCode], URL_ERROR_FALLBACKS[linkValidationCode])
              : '');

            return (
              <BlockerCard key={blocker.startupId} aria-labelledby={projectNameId}>
                <BlockerHeader>
                  <ProjectName id={projectNameId}>{blocker.startupName || blocker.startupId}</ProjectName>
                  {blocker.reasonCode !== 'startup_not_found' ? (
                    <OpenCardLink
                      href={`/startups/${encodeURIComponent(blocker.startupId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('investmentCommittee.dataRoomBlockers.openStartup', 'Открыть карточку')}
                      <ExternalLink size={14} aria-hidden="true" />
                    </OpenCardLink>
                  ) : null}
                </BlockerHeader>

                <SystemReason>
                  {t('investmentCommittee.dataRoomBlockers.systemReason', 'Причина системы')}: {reasonLabel}
                </SystemReason>

                {linkEditable ? (
                  <>
                    <LinkEditor>
                      <FieldLabel htmlFor={linkInputId}>
                        {t('investmentCommittee.dataRoomBlockers.linkLabel', 'Ссылка на Data Room')}
                      </FieldLabel>
                      <LinkInputRow>
                        <LinkInput
                          id={linkInputId}
                          type="url"
                          inputMode="url"
                          value={linkValue}
                          maxLength={DATA_ROOM_URL_MAX_LENGTH}
                          disabled={busy || linkSaving}
                          aria-invalid={Boolean(linkError)}
                          aria-describedby={`${linkHintId}${linkError ? ` ${linkErrorId}` : ''}`}
                          placeholder={t(
                            'investmentCommittee.dataRoomBlockers.linkPlaceholder',
                            'https://drive.google.com/...',
                          )}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setLinkValues((current) => ({
                              ...current,
                              [blocker.startupId]: nextValue,
                            }));
                            setLinkRequestErrors((current) => ({
                              ...current,
                              [blocker.startupId]: '',
                            }));
                          }}
                        />
                        <Button
                          type="button"
                          $variant="primary"
                          aria-label={t(
                            'investmentCommittee.dataRoomBlockers.saveLinkFor',
                            'Сохранить ссылку для {{name}}',
                            { name: blocker.startupName || blocker.startupId },
                          )}
                          disabled={busy || linkSaving || !linkValidation.ok}
                          onClick={() => { void handleSaveLink(blocker); }}
                        >
                          <Save aria-hidden="true" />
                          {linkSaving
                            ? t('startupDetail.dataRoomLink.saving', 'Сохранение…')
                            : t('investmentCommittee.dataRoomBlockers.saveLink', 'Сохранить ссылку')}
                        </Button>
                      </LinkInputRow>
                      <LinkHint id={linkHintId}>{t(
                        'investmentCommittee.dataRoomBlockers.linkHint',
                        'Только полная HTTPS-ссылка. Проверьте доступ для участников комитета.',
                      )}</LinkHint>
                      {linkError ? <LinkError id={linkErrorId} role="alert">{linkError}</LinkError> : null}
                    </LinkEditor>

                    <Alternative>{t('investmentCommittee.dataRoomBlockers.orReason', 'или укажите причину')}</Alternative>
                  </>
                ) : blocker.reasonCode !== 'startup_not_found' ? (
                  <LinkHint>{t(
                    'investmentCommittee.dataRoomBlockers.linkForbidden',
                    'Ссылку может добавить генеральный директор или назначенный на стартап менеджер.',
                  )}</LinkHint>
                ) : null}

                <FieldLabel htmlFor={inputId}>
                  {t('investmentCommittee.dataRoomBlockers.managerReason', 'Почему Data Room пока не готов?')}
                </FieldLabel>
                <ReasonInput
                  id={inputId}
                  value={value}
                  minLength={DATA_ROOM_REASON_MIN_LENGTH}
                  maxLength={DATA_ROOM_REASON_MAX_LENGTH}
                  disabled={busy}
                  aria-invalid={value.length > 0 && !valid}
                  aria-describedby={metaId}
                  placeholder={t(
                    'investmentCommittee.dataRoomBlockers.reasonPlaceholder',
                    'Например: фаундер выдаёт доступ к папке',
                  )}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setReasons((current) => ({ ...current, [blocker.startupId]: nextValue }));
                  }}
                />
                <FieldMeta id={metaId}>
                  <span>{t(
                    'investmentCommittee.dataRoomBlockers.reasonRule',
                    'Обязательно, если ссылка не добавлена · от 3 до 1000 символов',
                  )}</span>
                  <span>{trimmedLength}/{DATA_ROOM_REASON_MAX_LENGTH}</span>
                </FieldMeta>
              </BlockerCard>
            );
          })}
        </BlockerList>

        {error ? <ErrorText role="alert">{error}</ErrorText> : null}

        <Footer>
          {blockers.length > 0 ? (
            <>
              <Button type="button" onClick={onClose} disabled={closeDisabled}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button
                type="button"
                $variant="primary"
                onClick={handleSave}
                disabled={busy || isSavingLink || !canSave}
              >
                <Save aria-hidden="true" />
                {t('investmentCommittee.dataRoomBlockers.save', 'Сохранить причины')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              $variant="primary"
              onClick={() => { void onDone(); }}
              disabled={closeDisabled}
            >
              {t('investmentCommittee.dataRoomBlockers.done', 'Готово')}
            </Button>
          )}
        </Footer>
      </Stack>
    </Modal>
  );
}
