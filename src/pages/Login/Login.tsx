import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logo.png';

const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg.primary};
`;

const LoginCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  width: 100%;
  max-width: 420px;
`;

const Logo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  display: flex;
  justify-content: center;

  img {
    height: 48px;
    width: auto;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ErrorMessage = styled.p`
  color: #ef4444;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const PasswordWrapper = styled.div`
  position: relative;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 6px;
  top: 38px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(username, password);
    setIsLoading(false);

    if (success) {
      navigate('/');
    } else {
      setError(t('auth.loginErrorDetailed'));
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <img src={logo} alt="FundGate" />
        </Logo>
        <Subtitle>{t('auth.subtitle')}</Subtitle>
        <Form onSubmit={handleSubmit}>
          <Input
            label={t('auth.username')}
            type="text"
            placeholder={t('auth.usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <PasswordWrapper>
            <Input
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <PasswordToggle
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </PasswordToggle>
          </PasswordWrapper>
          <Button type="submit" disabled={isLoading} style={{ marginTop: '16px' }}>
            {isLoading ? t('auth.signingIn') : t('auth.login')}
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Form>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
