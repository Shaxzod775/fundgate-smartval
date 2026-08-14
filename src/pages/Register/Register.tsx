import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2, Building2, UserPlus } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { invitationApi, registrationApi, Invitation } from '../../services/api';
import logo from '../../assets/logo.png';

const RegisterContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg.primary};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const RegisterCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  width: 100%;
  max-width: 480px;
`;

const Logo = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  display: flex;
  justify-content: center;

  img {
    height: 48px;
    width: auto;
  }
`;

const Title = styled.h1`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Subtitle = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
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

const OrgInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const OrgLogo = styled.img`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  object-fit: cover;
`;

const OrgLogoPlaceholder = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OrgDetails = styled.div`
  flex: 1;
`;

const OrgName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const OrgMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[10]};
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Spinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  color: ${({ theme }) => theme.colors.accent.primary};

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SuccessIcon = styled(CheckCircle)`
  width: 64px;
  height: 64px;
  color: ${({ theme }) => theme.colors.status.success};
`;

const ErrorIcon = styled(XCircle)`
  width: 64px;
  height: 64px;
  color: ${({ theme }) => theme.colors.status.danger};
`;

const SuccessTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
`;

const SuccessMessage = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.6;
`;

type PageState = 'loading' | 'form' | 'success' | 'error';

const Register = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setErrorMessage(t('register.errors.noToken', 'No invitation token provided'));
        setPageState('error');
        return;
      }

      try {
        const response = await invitationApi.validate(token);

        if (response.success && response.data) {
          setInvitation(response.data);
          setPageState('form');
        } else {
          setErrorMessage(response.error || t('register.errors.invalidToken', 'Invalid or expired invitation link'));
          setPageState('error');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setErrorMessage(t('register.errors.validationFailed', 'Failed to validate invitation'));
        setPageState('error');
      }
    };

    validateToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await registrationApi.register(token!, name, email, phone || undefined);

      if (response.success) {
        setPageState('success');
      } else {
        setFormError(response.error || t('register.errors.submitFailed', 'Registration failed'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      setFormError(t('register.errors.submitFailed', 'Registration failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <RegisterContainer>
        <RegisterCard>
          <Logo>
            <img src={logo} alt="FundGate" />
          </Logo>
          <LoadingContainer>
            <Spinner size={48} />
            <Subtitle>{t('register.validating', 'Проверка приглашения...')}</Subtitle>
          </LoadingContainer>
        </RegisterCard>
      </RegisterContainer>
    );
  }

  if (pageState === 'error') {
    return (
      <RegisterContainer>
        <RegisterCard>
          <Logo>
            <img src={logo} alt="FundGate" />
          </Logo>
          <SuccessContainer>
            <ErrorIcon />
            <SuccessTitle>{t('register.invalidLink', 'Недействительное приглашение')}</SuccessTitle>
            <SuccessMessage>{errorMessage}</SuccessMessage>
            <Button onClick={() => navigate('/login')} style={{ marginTop: '16px' }}>
              {t('register.goToLogin', 'Перейти к входу')}
            </Button>
          </SuccessContainer>
        </RegisterCard>
      </RegisterContainer>
    );
  }

  if (pageState === 'success') {
    return (
      <RegisterContainer>
        <RegisterCard>
          <Logo>
            <img src={logo} alt="FundGate" />
          </Logo>
          <SuccessContainer>
            <SuccessIcon />
            <SuccessTitle>{t('register.success.title', 'Заявка отправлена!')}</SuccessTitle>
            <SuccessMessage>
              {t('register.success.message', 'Ваша заявка на регистрацию успешно отправлена. Пожалуйста, дождитесь одобрения CEO. Вы получите email с данными для входа после одобрения.')}
            </SuccessMessage>
            <Button variant="outline" onClick={() => navigate('/login')} style={{ marginTop: '16px' }}>
              {t('register.goToLogin', 'Перейти к входу')}
            </Button>
          </SuccessContainer>
        </RegisterCard>
      </RegisterContainer>
    );
  }

  return (
    <RegisterContainer>
      <RegisterCard>
        <Logo>
          <img src={logo} alt="FundGate" />
        </Logo>
        <Title>{t('register.title', 'Присоединяйтесь к команде')}</Title>
        <Subtitle>
          {t('register.subtitle', 'Вы приглашены в команду')}
        </Subtitle>

        {invitation?.organization && (
          <OrgInfo>
            {invitation.organization.logo ? (
              <OrgLogo src={invitation.organization.logo} alt={invitation.organization.name} />
            ) : (
              <OrgLogoPlaceholder>
                <Building2 size={24} />
              </OrgLogoPlaceholder>
            )}
            <OrgDetails>
              <OrgName>{invitation.organization.name}</OrgName>
              <OrgMeta>
                <Badge variant="primary">
                  {t(`roles.${invitation.role}`, invitation.role)}
                </Badge>
              </OrgMeta>
            </OrgDetails>
          </OrgInfo>
        )}

        <Form onSubmit={handleSubmit}>
          <Input
            label={t('register.form.name', 'ФИО')}
            type="text"
            placeholder={t('register.form.namePlaceholder', 'Введите ваше ФИО')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t('register.form.email', 'Email')}
            type="email"
            placeholder={t('register.form.emailPlaceholder', 'Введите ваш email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t('register.form.phone', 'Телефон (необязательно)')}
            type="tel"
            placeholder={t('register.form.phonePlaceholder', '+998 90 123 45 67')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Button type="submit" disabled={isSubmitting} style={{ marginTop: '16px' }}>
            <UserPlus size={16} />
            {isSubmitting
              ? t('register.form.submitting', 'Отправка...')
              : t('register.form.submit', 'Отправить заявку')
            }
          </Button>

          {formError && <ErrorMessage>{formError}</ErrorMessage>}
        </Form>

        <Subtitle style={{ marginTop: '24px', fontSize: '14px' }}>
          {t('register.invitedBy', 'Пригласил')} {invitation?.createdByName}
        </Subtitle>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default Register;
