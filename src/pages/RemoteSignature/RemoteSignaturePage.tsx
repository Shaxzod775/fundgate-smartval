import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CheckCircle2, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import {
  investmentCommitteeApi,
  type InvestmentCommitteeRemoteSignaturePublicView,
} from '../../services/api';

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 48px 20px;
  background: #f3f4f6;
  color: #111827;
`;

const Shell = styled.div`
  width: min(920px, 100%);
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Card = styled.section`
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #ffffff;
  padding: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
`;

const Subtitle = styled.p`
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 16px;
`;

const Badge = styled.span<{ $tone?: 'green' | 'amber' | 'red' | 'blue' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  background: ${({ $tone }) => {
    if ($tone === 'green') return '#dcfce7';
    if ($tone === 'red') return '#fee2e2';
    if ($tone === 'amber') return '#fef3c7';
    return '#dbeafe';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'green') return '#166534';
    if ($tone === 'red') return '#991b1b';
    if ($tone === 'amber') return '#92400e';
    return '#1d4ed8';
  }};
  font-size: 12px;
  font-weight: 700;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
`;

const Input = styled.input`
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 0 14px;
  color: #111827;
  font-size: 16px;
  outline: none;

  &:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
  }
`;

const Consent = styled.label`
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 12px;
  align-items: flex-start;
  margin: 18px 0;
  color: #374151;
  line-height: 1.5;

  input {
    margin-top: 4px;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border: 1px solid #10b981;
  border-radius: 12px;
  padding: 0 18px;
  background: #10b981;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: #047857;
  font-weight: 700;
  text-decoration: none;
`;

const ProjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Project = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: #f9fafb;
`;

const Muted = styled.p`
  margin: 0;
  color: #6b7280;
`;

const ErrorText = styled.div`
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 14px;
  background: #fef2f2;
  color: #991b1b;
  font-weight: 700;
`;

function statusTone(status?: string): 'green' | 'amber' | 'red' | 'blue' {
  if (status === 'signed') return 'green';
  if (status === 'expired' || status === 'revoked') return 'red';
  if (status === 'pending') return 'amber';
  return 'blue';
}

export function RemoteSignaturePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const [request, setRequest] = useState<InvestmentCommitteeRemoteSignaturePublicView | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');

  const canSign = useMemo(() => {
    return request?.status === 'pending' && signerName.trim() && signatureText.trim() && consentAccepted;
  }, [consentAccepted, request?.status, signatureText, signerName]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const response = await investmentCommitteeApi.getRemoteSignatureRequest(token);
      if (!alive) return;
      if (response.success && response.data) {
        setRequest(response.data);
        setSignerName(response.data.signerName || response.data.member?.name || '');
        setSignerEmail(response.data.signerEmail || '');
        setCertificateUrl(response.data.certificateUrl || '');
      } else {
        setError(response.error || t('remoteSignature.errors.notFound', 'Signature request not found'));
      }
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [token]);

  const submitSignature = async () => {
    if (!canSign || submitting) return;
    setSubmitting(true);
    setError('');
    const response = await investmentCommitteeApi.signRemoteSignatureRequest(token, {
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim(),
      signatureText: signatureText.trim(),
      consentAccepted,
    });
    if (response.success && response.data) {
      setRequest(response.data);
      setCertificateUrl(response.data.certificateUrl || '');
    } else {
      setError(response.error || t('remoteSignature.errors.signFailed', 'Failed to sign the protocol'));
    }
    setSubmitting(false);
  };

  return (
    <Page>
      <Shell>
        <Card>
          <Header>
            <div>
              <Title>{t('remoteSignature.title', 'Remote protocol signature')}</Title>
              <Subtitle>{t('remoteSignature.subtitle', 'Investment Committee protocol e-signature via FundGate CRM.')}</Subtitle>
            </div>
            <Badge $tone={statusTone(request?.status)}>
              {request?.status
                || (loading
                  ? t('remoteSignature.statusLoading', 'loading')
                  : t('remoteSignature.statusUnknown', 'unknown'))}
            </Badge>
          </Header>

          {error && <ErrorText>{error}</ErrorText>}
          {loading && <Muted>{t('remoteSignature.loading', 'Loading the signature request...')}</Muted>}

          {request && (
            <>
              <Grid>
                <Field>
                  {t('remoteSignature.fields.meeting', 'Meeting')}
                  <Input value={request.meeting?.title || ''} readOnly />
                </Field>
                <Field>
                  {t('remoteSignature.fields.protocolNumber', 'Protocol number')}
                  <Input value={request.meeting?.protocolNumber || ''} readOnly />
                </Field>
                <Field>
                  {t('remoteSignature.fields.meetingDate', 'Meeting date')}
                  <Input value={request.meeting?.meetingDate || ''} readOnly />
                </Field>
                <Field>
                  {t('remoteSignature.fields.member', 'Committee member')}
                  <Input value={request.member?.name || ''} readOnly />
                </Field>
              </Grid>

              {request.meeting?.latestExportHtmlUrl && (
                <LinkButton href={request.meeting.latestExportHtmlUrl} target="_blank" rel="noreferrer">
                  <FileText /> {t('remoteSignature.openProtocol', 'Open the protocol')} <ExternalLink size={16} />
                </LinkButton>
              )}

              <h2>{t('remoteSignature.presentedProjects', 'Presented projects')}</h2>
              <ProjectList>
                {(request.meeting?.presentedProjects || []).map((project, index) => (
                  <Project key={`${project.startupId || project.startupName || index}`}>
                    <strong>{index + 1}. {project.startupName || t('remoteSignature.startupFallback', 'Startup')}</strong>
                    <Muted>
                      {project.industry || t('common.notSpecified', 'Not specified')}
                      {' · '}
                      {project.stage || t('common.notSpecified', 'Not specified')}
                      {' · '}
                      {project.decision || t('remoteSignature.decisionPending', 'Pending')}
                    </Muted>
                  </Project>
                ))}
              </ProjectList>

              <h2>{t('remoteSignature.signingTitle', 'Signing')}</h2>
              {request.status === 'signed' ? (
                <>
                  <Badge $tone="green"><CheckCircle2 size={14} /> {t('remoteSignature.signed', 'Protocol signed')}</Badge>
                  {certificateUrl && (
                    <p>
                      <LinkButton href={certificateUrl} target="_blank" rel="noreferrer">
                        <ShieldCheck /> {t('remoteSignature.openCertificate', 'Open the signature certificate')} <ExternalLink size={16} />
                      </LinkButton>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Grid>
                    <Field>
                      {t('remoteSignature.fields.yourName', 'Your name')}
                      <Input value={signerName} onChange={(event) => setSignerName(event.target.value)} />
                    </Field>
                    <Field>
                      Email
                      <Input value={signerEmail} onChange={(event) => setSignerEmail(event.target.value)} />
                    </Field>
                    <Field>
                      {t('remoteSignature.fields.signatureText', 'Typed signature')}
                      <Input
                        value={signatureText}
                        onChange={(event) => setSignatureText(event.target.value)}
                        placeholder={t('remoteSignature.fields.signaturePlaceholder', 'Type your full name as the signature')}
                      />
                    </Field>
                  </Grid>
                  <Consent>
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                    />
                    <span>{request.consentText}</span>
                  </Consent>
                  <Muted>{request.legalNote}</Muted>
                  <div style={{ marginTop: 18 }}>
                    <Button type="button" onClick={submitSignature} disabled={!canSign || submitting}>
                      <ShieldCheck />
                      {submitting
                        ? t('remoteSignature.signing', 'Signing...')
                        : t('remoteSignature.signButton', 'Sign the protocol')}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </Shell>
    </Page>
  );
}
