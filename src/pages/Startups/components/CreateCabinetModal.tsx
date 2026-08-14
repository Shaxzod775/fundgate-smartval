import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Button } from '../../../components/ui/Button/Button';

import { CRM_API_BASE_URL as API_BASE_URL } from '../../../services/api';
import { formatShortDate } from '../../../utils/formatDate';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const StatusMessage = styled.div<{ $type?: 'info' | 'success' | 'warning' | 'error' }>`
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.5;
  background: ${({ $type, theme }) => {
    switch ($type) {
      case 'success': return theme.colors.status.successBg;
      case 'warning': return theme.colors.status.warningBg;
      case 'error': return theme.colors.status.dangerBg;
      default: return theme.colors.status.infoBg;
    }
  }};
  border: 1px solid ${({ $type, theme }) => {
    switch ($type) {
      case 'success': return theme.colors.status.successBorder;
      case 'warning': return theme.colors.status.warningBorder;
      case 'error': return theme.colors.status.dangerBorder;
      default: return theme.colors.status.infoBorder;
    }
  }};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CredentialsBox = styled.div`
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const CredentialRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  }
`;

const CredentialLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const CredentialValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 500;
`;

const CopyButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;
  margin-left: ${({ theme }) => theme.spacing[2]};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const WarningBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.status.warningBg};
  border: 1px solid ${({ theme }) => theme.colors.status.warningBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-top: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.status.warning};
  line-height: 1.4;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: ${({ theme }) => theme.colors.accent.primary};
    cursor: pointer;
  }
`;

const SpinnerWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  svg { animation: ${spin} 1s linear infinite; }
`;

const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ExistingCabinetInfo = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]} 0;

  svg {
    animation: ${spin} 1s linear infinite;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  startupId: string;
  startupName: string;
  founderEmail?: string;
}

interface CabinetInfo {
  loginId: string;
  createdAt: string;
}

interface CreatedCredentials {
  loginId: string;
  password: string;
}

export const CreateCabinetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  startupId,
  startupName,
  founderEmail,
}) => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [existingCabinet, setExistingCabinet] = useState<CabinetInfo | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setExistingCabinet(null);
      setCreatedCredentials(null);
      setError('');
      setIsChecking(true);
      setCopiedField(null);
      setSendEmail(true);
      return;
    }

    const checkCabinet = async () => {
      setIsChecking(true);
      setError('');
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/crm/startups/${startupId}/cabinet`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setExistingCabinet(data.data);
          }
        }
      } catch {
      } finally {
        setIsChecking(false);
      }
    };

    checkCabinet();
  }, [isOpen, startupId]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/crm/startups/${startupId}/cabinet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sendEmail: sendEmail && !!founderEmail,
          founderEmail: founderEmail || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || t('cabinet.createError'));
      }

      setCreatedCredentials({
        loginId: data.data.loginId,
        password: data.data.password,
      });
    } catch (err: any) {
      setError(err.message || t('cabinet.createError'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const renderContent = () => {
    if (isChecking) {
      return (
        <LoadingContainer>
          <Loader2 size={28} />
        </LoadingContainer>
      );
    }

    if (createdCredentials) {
      return (
        <>
          <StatusMessage $type="success">
            {t('cabinet.createdSuccess', `Cabinet for "${startupName}" has been created successfully.`)}
          </StatusMessage>

          <CredentialsBox>
            <CredentialRow>
              <div>
                <CredentialLabel>{t('cabinet.loginId', 'Login ID')}</CredentialLabel>
                <br />
                <CredentialValue>{createdCredentials.loginId}</CredentialValue>
              </div>
              <CopyButton onClick={() => handleCopy(createdCredentials.loginId, 'login')}>
                {copiedField === 'login' ? <Check size={14} /> : <Copy size={14} />}
                {copiedField === 'login' ? t('cabinet.copied', 'Copied') : t('cabinet.copy', 'Copy')}
              </CopyButton>
            </CredentialRow>
            <CredentialRow>
              <div>
                <CredentialLabel>{t('cabinet.password', 'Password')}</CredentialLabel>
                <br />
                <CredentialValue>{createdCredentials.password}</CredentialValue>
              </div>
              <CopyButton onClick={() => handleCopy(createdCredentials.password, 'password')}>
                {copiedField === 'password' ? <Check size={14} /> : <Copy size={14} />}
                {copiedField === 'password' ? t('cabinet.copied', 'Copied') : t('cabinet.copy', 'Copy')}
              </CopyButton>
            </CredentialRow>
          </CredentialsBox>

          <WarningBox>
            <AlertTriangle size={16} />
            <span>{t('cabinet.passwordWarning', 'Save this password now. It will not be shown again.')}</span>
          </WarningBox>

          {sendEmail && founderEmail && (
            <StatusMessage $type="info" style={{ marginTop: '12px' }}>
              {t('cabinet.emailSent', `Credentials have been sent to ${founderEmail}`)}
            </StatusMessage>
          )}

          <ButtonGroup>
            <Button variant="primary" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </ButtonGroup>
        </>
      );
    }

    if (existingCabinet) {
      return (
        <>
          <StatusMessage $type="info">
            {t('cabinet.alreadyExists', 'Cabinet has already been created for this startup.')}
          </StatusMessage>

          <ExistingCabinetInfo>
            <CredentialsBox>
              <CredentialRow>
                <div>
                  <CredentialLabel>{t('cabinet.loginId', 'Login ID')}</CredentialLabel>
                  <br />
                  <CredentialValue>{existingCabinet.loginId}</CredentialValue>
                </div>
                <CopyButton onClick={() => handleCopy(existingCabinet.loginId, 'existingLogin')}>
                  {copiedField === 'existingLogin' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedField === 'existingLogin' ? t('cabinet.copied', 'Copied') : t('cabinet.copy', 'Copy')}
                </CopyButton>
              </CredentialRow>
              <CredentialRow>
                <div>
                  <CredentialLabel>{t('cabinet.createdAt', 'Created')}</CredentialLabel>
                  <br />
                  <CredentialValue style={{ fontFamily: 'inherit' }}>
                    {formatShortDate(new Date(existingCabinet.createdAt))}
                  </CredentialValue>
                </div>
              </CredentialRow>
            </CredentialsBox>
          </ExistingCabinetInfo>

          <ButtonGroup>
            <Button variant="ghost" onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </ButtonGroup>
        </>
      );
    }

    return (
      <>
        <StatusMessage $type="info">
          {t('cabinet.createDescription', `Create a personal cabinet for "${startupName}". The startup will receive login credentials to access their dashboard, view AI scores, and submit reports.`)}
        </StatusMessage>

        {founderEmail && (
          <CheckboxRow>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            {t('cabinet.sendCredentialsEmail', `Send credentials to ${founderEmail}`)}
          </CheckboxRow>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <ButtonGroup>
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <SpinnerWrap>
                <Loader2 size={16} />
                {t('cabinet.creating', 'Creating...')}
              </SpinnerWrap>
            ) : (
              t('cabinet.createButton', 'Create Cabinet')
            )}
          </Button>
        </ButtonGroup>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('cabinet.modalTitle', 'Personal Cabinet')}
      width="520px"
    >
      {renderContent()}
    </Modal>
  );
};

export default CreateCabinetModal;
