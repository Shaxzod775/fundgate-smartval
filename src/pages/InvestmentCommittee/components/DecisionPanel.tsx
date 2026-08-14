import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileText, Minus, Upload, UserCheck } from 'lucide-react';
import { type InvestmentCommitteeMeeting } from '../../../services/api';
import { previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import InlineFilePreview from '../../../components/ui/DocPreview/InlineFilePreview';
import { Badge, Button, COMMITTEE_DOCUMENT_ACCEPT, ErrorText, HiddenFileInput, Muted, Panel, PanelHeader, SectionTitle, TextArea, fileToBase64, type SignedDocPayload } from './shared';

interface DecisionPanelProps {
  meeting: InvestmentCommitteeMeeting;
  step: 'deputy' | 'director';
  canDecide: boolean;
  canUpload: boolean;
  active: boolean; // stage соответствует шагу
  busy: boolean;
  error?: string;
  signDisabledReason?: string;
  onDecide: (action: 'sign' | 'request_changes', comment?: string, doc?: SignedDocPayload) => Promise<void>;
  onUpload: (payload: SignedDocPayload) => Promise<void>;
}

export default function DecisionPanel({ meeting, step, canDecide, canUpload, active, busy, error, signDisabledReason, onDecide, onUpload }: DecisionPanelProps) {
  const { t } = useTranslation();
  const state = step === 'deputy' ? meeting.approvalFlow?.deputy : meeting.approvalFlow?.director;
  const [comment, setComment] = useState('');
  const [mode, setMode] = useState<'idle' | 'return'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editable = canDecide && active;
  const uploader = canUpload && active;
  const pendingDocument = state?.pendingDocument;

  const sign = async () => {
    if (!pendingDocument) return;
    await onDecide('sign', comment.trim() || undefined);
  };

  const upload = async () => {
    if (!file) return;
    await onUpload({ fileBase64: await fileToBase64(file), fileName: file.name, contentType: file.type || 'application/octet-stream' });
  };

  const decided = state?.status === 'signed';
  const returnedByThisStep = state?.status === 'changes_requested';

  if (!editable && !uploader && !decided && !returnedByThisStep) {
    return null;
  }

  return (
    <Panel>
      <PanelHeader>
        <SectionTitle>
          <UserCheck />
          {t(`investmentCommittee.decision.${step}Title`)}
        </SectionTitle>
        {decided ? (
          <Badge $tone="green">
            {t('investmentCommittee.decision.signedBy', {
              name: state?.managerName || '',
              date: (state?.decidedAt || '').slice(0, 10),
            })}
          </Badge>
        ) : returnedByThisStep ? (
          <Badge $tone="red">{t('investmentCommittee.decision.returnedBadge')}</Badge>
        ) : null}
      </PanelHeader>

      {decided && state?.comment ? (
        <Muted style={{ whiteSpace: 'pre-wrap' }}>{state.comment}</Muted>
      ) : null}

      {decided && state?.signedDocument?.url ? (
        <div style={{ marginTop: 10 }}>
          <Button as="a" href={state.signedDocument.url} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); previewDocument(state.signedDocument!.url!, state.signedDocument!.fileName); }}>
            <FileText />
            {t('investmentCommittee.approvalDoc.open', 'Подписанный документ')}
          </Button>
        </div>
      ) : null}

      {uploader && !editable ? (
        <>
          <Muted>{t('investmentCommittee.approvalDoc.uploadHint', 'Загрузите подписанный документ для согласования директором или заместителем.')}</Muted>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}><Upload />{file ? t('investmentCommittee.approvalDoc.replace') : t('investmentCommittee.approvalDoc.choose', 'Выбрать документ')}</Button>
            <Muted>{file?.name || pendingDocument?.fileName || t('investmentCommittee.approvalDoc.fileHint', 'PDF/скан')}</Muted>
            <Button type="button" $variant="primary" disabled={busy || !file} onClick={upload}><Upload />{t('investmentCommittee.approvalDoc.submitForApproval', 'Загрузить на согласование')}</Button>
          </div>
          <HiddenFileInput ref={fileInputRef} type="file" accept={COMMITTEE_DOCUMENT_ACCEPT} onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <InlineFilePreview file={file} label={t('investmentCommittee.approvalDoc.previewLabel')} />
        </>
      ) : editable ? (
        mode === 'return' ? (
          <>
            <Muted>{t('investmentCommittee.decision.returnHint')}</Muted>
            <TextArea
              style={{ marginTop: 10 }}
              placeholder={t('investmentCommittee.decision.returnCommentPlaceholder')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            {error ? <ErrorText style={{ marginTop: 10 }}>{error}</ErrorText> : null}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <Button type="button" onClick={() => { setMode('idle'); setComment(''); }}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                $variant="danger"
                disabled={busy || !comment.trim()}
                onClick={() => onDecide('request_changes', comment.trim())}
              >
                <Minus />
                {t('investmentCommittee.decision.returnConfirm')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <TextArea
              style={{ minHeight: 64 }}
              placeholder={t('investmentCommittee.decision.commentPlaceholder')}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            {pendingDocument?.url ? <Button type="button" onClick={() => previewDocument(pendingDocument.url!, pendingDocument.fileName)}><FileText />{t('investmentCommittee.approvalDoc.openManagerDoc', 'Открыть документ инвест-менеджера')}</Button> : <Muted>{t('investmentCommittee.approvalDoc.managerDocMissing', 'Инвест-менеджер ещё не загрузил документ.')}</Muted>}
            {error ? <ErrorText style={{ marginTop: 10 }}>{error}</ErrorText> : null}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
              <Button type="button" $variant="danger" disabled={busy} onClick={() => setMode('return')}>
                <Minus />
                {t('investmentCommittee.decision.return')}
              </Button>
              <Button
                type="button"
                $variant="primary"
                disabled={busy || !pendingDocument || Boolean(signDisabledReason)}
                onClick={sign}
              >
                <Check />
                {t('investmentCommittee.decision.sign')}
              </Button>
            </div>
          </>
        )
      ) : null}
    </Panel>
  );
}
