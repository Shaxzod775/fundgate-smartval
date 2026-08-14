import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CheckCircle2, Database, ExternalLink, FolderLock, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { startupsApi } from '../../../services/api';
import {
  type DataRoomUrlErrorCode,
  validateDataRoomUrl,
} from '../../../utils/startupDataRoom';
import { hoverTooltip } from '../../../styles/tooltip';

const Card = styled.section<{ $compact?: boolean }>`
  margin-bottom: ${({ $compact }) => ($compact ? '0' : '24px')};
  padding: ${({ $compact }) => ($compact ? '14px 0 0' : '18px')};
  border: ${({ $compact, theme }) => ($compact ? '0' : `1px solid ${theme.colors.border.secondary}`)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ $compact }) => ($compact ? '0' : '14px')};
  background: ${({ $compact, theme }) => ($compact ? 'transparent' : theme.colors.bg.secondary)};
`;

const Header = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: ${({ $compact }) => ($compact ? '10px' : '14px')};
`;

const TitleGroup = styled.div`
  min-width: 0;
`;

const Title = styled.h3<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ $compact }) => ($compact ? '14px' : '16px')};
  font-weight: 700;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const Description = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 13px;
  line-height: 1.45;
`;

const Status = styled.span<{ $ready: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 9px;
  border: 1px solid ${({ $ready }) => $ready ? 'rgba(16, 185, 129, 0.32)' : 'rgba(245, 158, 11, 0.32)'};
  border-radius: 999px;
  background: ${({ $ready }) => $ready ? 'rgba(16, 185, 129, 0.10)' : 'rgba(245, 158, 11, 0.10)'};
  color: ${({ $ready }) => $ready ? '#10b981' : '#f59e0b'};
  font-size: 12px;
  font-weight: 700;
`;

const LinkSummary = styled.div<{ $compact?: boolean }>`
  min-width: 0;
  margin-bottom: ${({ $compact }) => ($compact ? '8px' : '14px')};
  padding: ${({ $compact }) => ($compact ? '0' : '10px 12px')};
  border-radius: 10px;
  background: ${({ $compact, theme }) => ($compact ? 'transparent' : theme.colors.bg.tertiary)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ActionButton = styled.button<{ $danger?: boolean; $primary?: boolean; $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: ${({ $compact }) => ($compact ? '32px' : '36px')};
  padding: ${({ $compact }) => ($compact ? '0 10px' : '8px 12px')};
  border: 1px solid ${({ $danger, $primary, theme }) => (
    $danger ? 'rgba(239, 68, 68, 0.36)' : $primary ? theme.colors.accent.primary : theme.colors.border.primary
  )};
  border-radius: 9px;
  background: ${({ $danger, $primary, theme }) => (
    $danger ? 'rgba(239, 68, 68, 0.10)' : $primary ? theme.colors.accent.primary : theme.colors.bg.tertiary
  )};
  color: ${({ $danger, $primary, theme }) => (
    $danger ? '#ef4444' : $primary ? '#ffffff' : theme.colors.text.primary
  )};
  font: inherit;
  font-size: ${({ $compact }) => ($compact ? '12px' : '13px')};
  font-weight: 650;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  svg {
    width: 15px;
    height: 15px;
  }

  ${hoverTooltip()}
`;

const OpenLink = styled.a<{ $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: ${({ $compact }) => ($compact ? '32px' : '36px')};
  padding: ${({ $compact }) => ($compact ? '0 10px' : '8px 12px')};
  border: 1px solid ${({ $compact, theme }) => (
    $compact ? theme.colors.border.primary : theme.colors.accent.primary
  )};
  border-radius: 9px;
  background: ${({ $compact, theme }) => (
    $compact ? theme.colors.bg.tertiary : theme.colors.accent.primary
  )};
  color: ${({ $compact, theme }) => ($compact ? theme.colors.text.primary : '#ffffff')};
  font-size: ${({ $compact }) => ($compact ? '12px' : '13px')};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    filter: brightness(1.08);
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 2px;
  }

  svg {
    width: 15px;
    height: 15px;
  }

  ${hoverTooltip()}
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 650;
`;

const Input = styled.input<{ $compact?: boolean }>`
  width: 100%;
  max-width: ${({ $compact }) => ($compact ? '440px' : 'none')};
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 14px;

  &[aria-invalid='true'] {
    border-color: #ef4444;
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    outline: none;
  }
`;

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  line-height: 1.45;
`;

const ErrorText = styled.p`
  margin: 0;
  color: #ef4444;
  font-size: 12px;
  line-height: 1.45;
`;

const Confirmation = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
`;

const ConfirmationText = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
`;

const ERROR_KEYS: Record<DataRoomUrlErrorCode, string> = {
  required: 'startupDetail.dataRoomLink.errors.required',
  too_long: 'startupDetail.dataRoomLink.errors.tooLong',
  https_required: 'startupDetail.dataRoomLink.errors.httpsRequired',
  credentials_not_allowed: 'startupDetail.dataRoomLink.errors.credentialsNotAllowed',
  invalid: 'startupDetail.dataRoomLink.errors.invalid',
};

const ERROR_FALLBACKS: Record<DataRoomUrlErrorCode, string> = {
  required: 'Enter a Data Room link.',
  too_long: 'The link must be no longer than 2048 characters.',
  https_required: 'Enter a full HTTPS link beginning with https://.',
  credentials_not_allowed: 'Links containing a username or password are not allowed.',
  invalid: 'Enter a valid Data Room link.',
};

export interface DataRoomLinkCardProps {
  startupId: string;
  dataRoomUrl?: string | null;
  canEdit: boolean;
  canReview?: boolean;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  reviewNote?: string;
  disabled?: boolean;
  onChange: (dataRoomUrl: string | undefined) => void;
  onWorkflowChange?: (startup: { dataRoomUrl?: string; dataRoomApprovedUrl?: string; dataRoomStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected'; dataRoomReviewNote?: string }) => void;
  onSavingChange?: (isSaving: boolean) => void;
  compact?: boolean;
  ariaLabel?: string;
}

export function DataRoomLinkCard({
  startupId,
  dataRoomUrl,
  canEdit,
  canReview = false,
  status = 'draft',
  reviewNote,
  disabled = false,
  onChange,
  onWorkflowChange,
  onSavingChange,
  compact = false,
  ariaLabel,
}: DataRoomLinkCardProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const [isEditing, setIsEditing] = useState(
    () => compact && canEdit && !disabled && !dataRoomUrl?.trim(),
  );
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inputValue, setInputValue] = useState(dataRoomUrl || '');
  const [validationCode, setValidationCode] = useState<DataRoomUrlErrorCode | null>(null);
  const [requestError, setRequestError] = useState('');

  const savedValidation = useMemo(
    () => validateDataRoomUrl(dataRoomUrl || ''),
    [dataRoomUrl],
  );
  const validHref = savedValidation.ok ? savedValidation.url : '';
  const hasStoredValue = Boolean(dataRoomUrl?.trim());

  useEffect(() => {
    if (!isEditing) setInputValue(dataRoomUrl || '');
  }, [dataRoomUrl, isEditing]);

  const resetMessages = () => {
    setValidationCode(null);
    setRequestError('');
  };

  const beginEditing = () => {
    resetMessages();
    setInputValue(dataRoomUrl || '');
    setIsRemoving(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    resetMessages();
    setInputValue(dataRoomUrl || '');
    setIsEditing(false);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const validation = validateDataRoomUrl(inputValue);
    if (!validation.ok) {
      setValidationCode(validation.code);
      setRequestError('');
      return;
    }

    setIsSaving(true);
    onSavingChange?.(true);
    resetMessages();
    try {
      const response = await startupsApi.updateDataRoomUrl(startupId, validation.url);
      if (!response.success) {
        setRequestError(response.message || response.error || t(
          'startupDetail.dataRoomLink.errors.saveFailed',
          'Could not save the Data Room link.',
        ));
        return;
      }

      const returnedUrl = response.data?.dataRoomUrl;
      const returnedValidation = validateDataRoomUrl(returnedUrl || '');
      const nextUrl = returnedValidation.ok ? returnedValidation.url : validation.url;
      onChange(nextUrl);
      if (response.data) onWorkflowChange?.(response.data);
      setInputValue(nextUrl);
      setIsEditing(false);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : t(
        'startupDetail.dataRoomLink.errors.saveFailed',
        'Could not save the Data Room link.',
      ));
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  };

  const handleRemove = async () => {
    if (disabled) return;
    setIsSaving(true);
    onSavingChange?.(true);
    resetMessages();
    try {
      const response = await startupsApi.updateDataRoomUrl(startupId, null);
      if (!response.success) {
        setRequestError(response.message || response.error || t(
          'startupDetail.dataRoomLink.errors.removeFailed',
          'Could not remove the Data Room link.',
        ));
        return;
      }
      onChange(undefined);
      if (response.data) onWorkflowChange?.(response.data);
      setInputValue('');
      setIsRemoving(false);
      setIsEditing(false);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : t(
        'startupDetail.dataRoomLink.errors.removeFailed',
        'Could not remove the Data Room link.',
      ));
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  };

  const runWorkflowAction = async (action: 'approve' | 'reject') => {
    if (interactionDisabled) return;
    let note: string | undefined;
    if (action === 'reject') {
      note = window.prompt(t('startupDetail.dataRoomLink.rejectPrompt', 'Укажите причину отказа'))?.trim();
      if (!note) return;
    }
    setIsSaving(true);
    onSavingChange?.(true);
    setRequestError('');
    try {
      const response = await startupsApi.reviewDataRoom(startupId, action, note);
      if (!response.success || !response.data) {
        setRequestError(response.message || response.error || t('common.error', 'Ошибка'));
        return;
      }
      onWorkflowChange?.(response.data);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : t('common.error', 'Ошибка'));
    } finally {
      setIsSaving(false);
      onSavingChange?.(false);
    }
  };

  const statusText = status === 'pending_review'
    ? t('startupDetail.dataRoomLink.pendingReview', 'На утверждении')
    : status === 'approved'
      ? t('startupDetail.dataRoomLink.approved', 'Утверждено')
      : status === 'rejected'
        ? t('startupDetail.dataRoomLink.rejected', 'Отклонено')
    : validHref
    ? t('startupDetail.dataRoomLink.ready', 'Черновик')
    : hasStoredValue
      ? t('startupDetail.dataRoomLink.invalidStored', 'Invalid link')
      : t('startupDetail.dataRoomLink.missing', 'Link not added');
  const interactionDisabled = disabled || isSaving;

  return (
    <Card
      $compact={compact}
      aria-busy={isSaving}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
    >
      {!compact ? (
        <Header $compact={compact}>
          <TitleGroup>
            <Title $compact={compact}><FolderLock aria-hidden="true" />Data Room</Title>
            <Description>
              {t('startupDetail.dataRoomLink.description', 'External project folder for investment committee materials.')}
            </Description>
          </TitleGroup>
          <Status $ready={status === 'approved'}>
            {status === 'approved' ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
            {statusText}
          </Status>
        </Header>
      ) : null}

      {isEditing ? (
        <Form onSubmit={handleSave} noValidate>
          <Label htmlFor={inputId}>
            {t('startupDetail.dataRoomLink.fieldLabel', 'HTTPS link')}
          </Label>
          <Input
            $compact={compact}
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={inputValue}
            disabled={interactionDisabled}
            aria-invalid={Boolean(validationCode)}
            aria-describedby={`${hintId}${validationCode || requestError ? ` ${errorId}` : ''}`}
            placeholder="https://drive.google.com/..."
            onChange={(event) => {
              setInputValue(event.target.value);
              if (validationCode) setValidationCode(null);
              if (requestError) setRequestError('');
            }}
          />
          {validationCode ? (
            <ErrorText id={errorId} role="alert">
              {t(ERROR_KEYS[validationCode], ERROR_FALLBACKS[validationCode])}
            </ErrorText>
          ) : requestError ? (
            <ErrorText id={errorId} role="alert">{requestError}</ErrorText>
          ) : null}
          <Actions>
            <ActionButton type="submit" $primary disabled={interactionDisabled}>
              {isSaving ? <Loader2 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              {isSaving
                ? t('startupDetail.dataRoomLink.saving', 'Saving…')
                : t('common.save', 'Save')}
            </ActionButton>
            <ActionButton type="button" onClick={cancelEditing} disabled={interactionDisabled}>
              <X aria-hidden="true" />
              {t('common.cancel', 'Cancel')}
            </ActionButton>
          </Actions>
        </Form>
      ) : (
        <>
          {validHref ? (
            compact ? null : (
              <LinkSummary $compact={compact} title={validHref}>
                {new URL(validHref).hostname}
              </LinkSummary>
            )
          ) : hasStoredValue ? (
            <ErrorText role="alert">
              {t('startupDetail.dataRoomLink.invalidStoredHint', 'The saved link is invalid and cannot be opened. Replace or remove it.')}
            </ErrorText>
          ) : (
            <Hint>{t('startupDetail.dataRoomLink.emptyHint', 'Add a link before the project can pass the first shortlist stage.')}</Hint>
          )}

          <Actions style={{ marginTop: compact ? 8 : 14 }}>
            {validHref ? (
              <OpenLink
                $compact={compact}
                href={validHref}
                data-tooltip={compact ? t('startupDetail.dataRoomLink.open', 'Open Data Room') : undefined}
                aria-label={t('startupDetail.dataRoomLink.open', 'Open Data Room')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {compact ? <Database aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
                {compact
                  ? t('startupDetail.dataRoomLink.openShort', 'Open')
                  : t('startupDetail.dataRoomLink.open', 'Open Data Room')}
              </OpenLink>
            ) : null}
            {canEdit && status !== 'pending_review' ? (
              <ActionButton
                type="button"
                $compact={compact}
                data-tooltip={compact
                  ? t('startupDetail.dataRoomLink.editHint', 'Edit the Data Room link')
                  : undefined}
                aria-label={hasStoredValue ? t('common.edit', 'Edit') : t('common.add', 'Add')}
                onClick={beginEditing}
                disabled={interactionDisabled}
              >
                {hasStoredValue ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {hasStoredValue
                  ? t('common.edit', 'Edit')
                  : t('common.add', 'Add')}
              </ActionButton>
            ) : null}
            {canReview && status === 'pending_review' ? (
              <>
                <ActionButton type="button" $primary onClick={() => void runWorkflowAction('approve')} disabled={interactionDisabled}>
                  <CheckCircle2 aria-hidden="true" />
                  {t('startupDetail.dataRoomLink.approve', 'Утвердить')}
                </ActionButton>
                <ActionButton type="button" $danger onClick={() => void runWorkflowAction('reject')} disabled={interactionDisabled}>
                  <X aria-hidden="true" />
                  {t('startupDetail.dataRoomLink.reject', 'Отклонить')}
                </ActionButton>
              </>
            ) : null}
            {!compact && canEdit && hasStoredValue ? (
              <ActionButton
                type="button"
                $danger
                onClick={() => {
                  setIsRemoving(true);
                  setRequestError('');
                }}
                disabled={interactionDisabled}
              >
                <Trash2 aria-hidden="true" />
                {t('common.delete', 'Delete')}
              </ActionButton>
            ) : null}
          </Actions>

          {requestError ? <ErrorText role="alert" style={{ marginTop: 10 }}>{requestError}</ErrorText> : null}
          {status === 'rejected' && reviewNote ? (
            <ErrorText role="status" style={{ marginTop: 10 }}>{reviewNote}</ErrorText>
          ) : null}

          {isRemoving ? (
            <Confirmation role="group" aria-label={t('startupDetail.dataRoomLink.removeConfirmTitle', 'Remove Data Room link?')}>
              <ConfirmationText>
                {t('startupDetail.dataRoomLink.removeConfirmText', 'The project will be blocked at the shortlist stage until another link is added.')}
              </ConfirmationText>
              <Actions>
                <ActionButton type="button" $danger onClick={handleRemove} disabled={interactionDisabled}>
                  {isSaving ? <Loader2 aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                  {isSaving
                    ? t('startupDetail.dataRoomLink.removing', 'Removing…')
                    : t('startupDetail.dataRoomLink.removeConfirmAction', 'Remove link')}
                </ActionButton>
                <ActionButton type="button" onClick={() => setIsRemoving(false)} disabled={interactionDisabled}>
                  <X aria-hidden="true" />
                  {t('common.cancel', 'Cancel')}
                </ActionButton>
              </Actions>
            </Confirmation>
          ) : null}
        </>
      )}
    </Card>
  );
}
