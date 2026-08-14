import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useStartupAuth } from '../../contexts/StartupAuthContext';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 400px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[8]};
  animation: ${fadeIn} 0.4s ease-out;

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[6]};
  }
`;

const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const LogoText = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;

  span {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const LogoSubtext = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing[1]} 0 0 0;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.accent.primary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: ${({ theme }) => theme.spacing[2]};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
    box-shadow: ${({ theme }) => theme.shadows.glow};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    animation: ${spin} 1s linear infinite;
  }
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.colors.status.dangerBg};
  border: 1px solid ${({ theme }) => theme.colors.status.dangerBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

export const StartupCabinetLogin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useStartupAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginId.trim() || !password.trim()) {
      setError(t('cabinet.loginPage.fillAllFields', 'Please fill in all fields'));
      return;
    }

    setIsSubmitting(true);

    try {
      await login(loginId.trim(), password);
      navigate('/cabinet', { replace: true });
    } catch (err: any) {
      setError(err.message || t('cabinet.loginPage.invalidCredentials', 'Invalid login or password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <LoginCard>
        <LogoContainer>
          <LogoText>
            Fund<span>Gate</span>
          </LogoText>
          <LogoSubtext>{t('cabinet.loginPage.subtitle', 'Startup Cabinet')}</LogoSubtext>
        </LogoContainer>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <InputGroup>
            <Label>{t('cabinet.loginPage.loginId', 'Login ID')}</Label>
            <Input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder={t('cabinet.loginPage.loginPlaceholder', 'Enter your login ID')}
              autoComplete="username"
              autoFocus
            />
          </InputGroup>

          <InputGroup>
            <Label>{t('cabinet.loginPage.password', 'Password')}</Label>
            <InputWrapper>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('cabinet.loginPage.passwordPlaceholder', 'Enter your password')}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <TogglePasswordButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </TogglePasswordButton>
            </InputWrapper>
          </InputGroup>

          <SubmitButton type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} />
                {t('cabinet.loginPage.signingIn', 'Signing in...')}
              </>
            ) : (
              t('cabinet.loginPage.signIn', 'Sign In')
            )}
          </SubmitButton>
        </Form>
      </LoginCard>
    </PageContainer>
  );
};

export default StartupCabinetLogin;
