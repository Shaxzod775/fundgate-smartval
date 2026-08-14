import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileCheck2, FileText, Upload } from 'lucide-react';
import { type InvestmentCommitteeMeeting } from '../../../services/api';
import { previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import {
  Button,
  COMMITTEE_DOCUMENT_ACCEPT,
  ErrorText,
  HiddenFileInput,
  InfoBanner,
  Muted,
  Panel,
  PanelHeader,
  SectionTitle,
  fileToBase64,
  meetingStage,
} from './shared';

const ProtocolCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.secondary};

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const ProtocolName = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 800;

  svg { color: ${({ theme }) => theme.colors.status.success}; }
`;

const ProtocolActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

interface SigningPanelProps {
  meeting: InvestmentCommitteeMeeting;
  canUpload: boolean;
  readOnly: boolean;
  busy: boolean;
  error?: string;
  onUploadProtocol: (payload: { fileBase64: string; fileName: string; contentType: string }) => Promise<void>;
  onComplete: () => void | Promise<void>;
}

export default function SigningPanel({
  meeting,
  canUpload,
  readOnly,
  busy,
  error,
  onUploadProtocol,
  onComplete,
}: SigningPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');
  const stage = meetingStage(meeting);
  const templateUrl = meeting.protocol?.latestExport?.htmlUrl;
  const legacyFiles = meeting.signatures?.remoteSignature?.signedProtocolFiles || [];
  const legacyFinal = legacyFiles[legacyFiles.length - 1];
  const finalProtocol = meeting.signatures?.sharedProtocol || legacyFinal;
  const finalUrl = finalProtocol?.url;
  const completed = stage === 'completed';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError('');
    try {
      await onUploadProtocol({
        fileBase64: await fileToBase64(file),
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      });
    } catch {
      setLocalError(t('investmentCommittee.signing.uploadFailed'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Panel>
      <PanelHeader>
        {templateUrl && !finalUrl ? (
          <Button as="a" href={templateUrl} target="_blank" rel="noreferrer" onClick={(event) => {
            event.preventDefault();
            previewDocument(templateUrl);
          }}>
            <FileText />
            {t('investmentCommittee.signing.openTemplate', 'Открыть шаблон протокола')}
          </Button>
        ) : null}
      </PanelHeader>

      {completed && finalUrl ? (
        <InfoBanner $tone="green" style={{ marginBottom: 12 }}>
          <CheckCircle2 />
          <span>{t('investmentCommittee.signing.sharedCompleted', 'Единый подписанный протокол загружен и доступен всем участникам ИК.')}</span>
        </InfoBanner>
      ) : finalUrl ? (
        <InfoBanner $tone="blue" style={{ marginBottom: 12 }}>
          <FileCheck2 />
          <span>
            {canUpload
              ? t('investmentCommittee.signing.previewHint', 'Файл загружен. Проверьте preview и только после этого завершите инвесткомитет.')
              : t('investmentCommittee.signing.memberFileAvailable', 'Подписанный протокол загружен и доступен для просмотра. Сотрудник фонда завершает инвесткомитет.')}
          </span>
        </InfoBanner>
      ) : (
        <Muted style={{ marginBottom: 12 }}>
          {canUpload
            ? t('investmentCommittee.signing.sharedHint', 'Загрузите один итоговый протокол с подписями всех участников.')
            : t(
              'investmentCommittee.signing.memberHint',
              'Ожидается итоговый подписанный протокол. Его загрузит ответственный сотрудник фонда.',
            )}
        </Muted>
      )}

      {finalUrl ? (
        <ProtocolCard>
          <div>
            <ProtocolName><FileCheck2 />{finalProtocol?.fileName || t('investmentCommittee.signing.signedProtocol', 'Подписанный протокол')}</ProtocolName>
            {finalProtocol?.uploadedByName ? <Muted style={{ marginTop: 6 }}>{finalProtocol.uploadedByName}</Muted> : null}
          </div>
          <ProtocolActions>
            <Button type="button" onClick={() => previewDocument(finalUrl, finalProtocol?.fileName)}>
              <FileText />
              {t('investmentCommittee.signing.preview', 'Preview протокола')}
            </Button>
            {!completed && !readOnly && canUpload ? (
              <Button type="button" $variant="primary" disabled={busy} onClick={() => void onComplete()}>
                <CheckCircle2 />
                {t('investmentCommittee.signing.complete', 'Завершить инвесткомитет')}
              </Button>
            ) : null}
          </ProtocolActions>
        </ProtocolCard>
      ) : !readOnly && canUpload ? (
        <Button type="button" $variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload />
          {t('investmentCommittee.signing.uploadShared', 'Загрузить подписанный протокол')}
        </Button>
      ) : null}

      {canUpload && !readOnly ? (
        <HiddenFileInput
          ref={inputRef}
          type="file"
          accept={COMMITTEE_DOCUMENT_ACCEPT}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      ) : null}
      {(error || localError) ? <ErrorText style={{ marginTop: 12 }}>{error || localError}</ErrorText> : null}
    </Panel>
  );
}
