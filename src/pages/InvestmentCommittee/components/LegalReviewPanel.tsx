import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileText, ShieldCheck, Upload } from 'lucide-react';
import { type InvestmentCommitteeMeeting } from '../../../services/api';
import { previewDocument } from '../../../components/ui/DocPreview/DocPreview';
import { Button, COMMITTEE_DOCUMENT_ACCEPT, ErrorText, HiddenFileInput, InfoBanner, Muted, Panel, PanelHeader, SectionTitle, TextArea, fileToBase64, type SignedDocPayload } from './shared';

interface LegalReviewPanelProps {
  meeting: InvestmentCommitteeMeeting;
  isLawyer: boolean;
  active: boolean; // stage === legal_review
  busy: boolean;
  error?: string;
  onSubmit: (conclusion: string, doc: SignedDocPayload) => Promise<void>;
}

export default function LegalReviewPanel({ meeting, isLawyer, active, busy, error, onSubmit }: LegalReviewPanelProps) {
  const { t } = useTranslation();
  const review = meeting.legalReview;
  const [conclusion, setConclusion] = useState(review?.conclusion || '');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returned = review?.status === 'changes_requested';
  const editable = isLawyer && active;

  const submit = async () => {
    if (!conclusion.trim() || !file) return;
    const fileBase64 = await fileToBase64(file);
    await onSubmit(conclusion.trim(), { fileBase64, fileName: file.name, contentType: file.type || 'application/octet-stream' });
  };

  if (!editable && !(review?.conclusion || '').trim() && !returned) {
    return null;
  }

  return (
    <Panel>
      <PanelHeader>
        <SectionTitle>
          <ShieldCheck />
          {t('investmentCommittee.legal.title')}
        </SectionTitle>
        {review?.submittedAt ? (
          <Muted>
            {t('investmentCommittee.legal.submittedBy', {
              name: review.managerName || '',
              date: (review.submittedAt || '').slice(0, 10),
            })}
          </Muted>
        ) : null}
      </PanelHeader>

      {returned && review?.lastReturnComment ? (
        <InfoBanner $tone="red" style={{ marginBottom: 12 }}>
          <AlertTriangle />
          <span>
            <strong>{t('investmentCommittee.legal.returned')}</strong>
            {' — '}{review.lastReturnComment}
          </span>
        </InfoBanner>
      ) : null}

      {editable ? (
        <>
          <TextArea
            placeholder={t('investmentCommittee.legal.placeholder')}
            value={conclusion}
            onChange={(event) => setConclusion(event.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload />
              {file ? t('investmentCommittee.approvalDoc.replace', 'Заменить файл') : t('investmentCommittee.approvalDoc.attach', 'Прикрепить подписанный документ')}
            </Button>
            <Muted>{file ? file.name : t('investmentCommittee.approvalDoc.required', 'Подписанный PDF/скан — обязательно')}</Muted>
          </div>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept={COMMITTEE_DOCUMENT_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          {error ? <ErrorText style={{ marginTop: 10 }}>{error}</ErrorText> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button
              type="button"
              $variant="primary"
              disabled={busy || !conclusion.trim() || !file}
              onClick={submit}
            >
              {t('investmentCommittee.legal.submit')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Muted style={{ whiteSpace: 'pre-wrap' }}>{review?.conclusion || t('investmentCommittee.legal.pending')}</Muted>
          {review?.signedDocument?.url ? (
            <div style={{ marginTop: 10 }}>
              <Button as="a" href={review.signedDocument.url} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); previewDocument(review.signedDocument!.url!, review.signedDocument!.fileName); }}>
                <FileText />
                {t('investmentCommittee.approvalDoc.open', 'Подписанный документ')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
