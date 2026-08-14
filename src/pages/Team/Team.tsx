import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  ToggleLeft,
  ToggleRight,
  X,
  Copy,
  Check,
  Loader2,
  Shield,
  Mail,
  Phone,
  Briefcase,
  ChevronDown,
} from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  teamApi,
  Manager,
  UserRole,
  CreateUserData,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const PageContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};

  svg {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const TeamGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const MemberCard = styled(Card)<{ $isInactive?: boolean }>`
  padding: ${({ theme }) => theme.spacing[5]};
  opacity: ${({ $isInactive }) => ($isInactive ? 0.6 : 1)};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const MemberHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Avatar = styled.div<{ $url?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ $url, theme }) =>
    $url ? `url(${$url}) center/cover` : theme.colors.accent.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  flex-shrink: 0;
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MemberName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const MemberRole = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-weight: 500;
`;

const MemberDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const MemberActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'warning' | 'success' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? '#ef4444'
      : $variant === 'warning'
      ? '#f59e0b'
      : $variant === 'success'
      ? '#10b981'
      : theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, $variant }) =>
      $variant === 'danger'
        ? 'rgba(239, 68, 68, 0.1)'
        : $variant === 'warning'
        ? 'rgba(245, 158, 11, 0.1)'
        : $variant === 'success'
        ? 'rgba(16, 185, 129, 0.1)'
        : theme.colors.bg.tertiary};
    border-color: ${({ $variant, theme }) =>
      $variant === 'danger'
        ? '#ef4444'
        : $variant === 'warning'
        ? '#f59e0b'
        : $variant === 'success'
        ? '#10b981'
        : theme.colors.accent.primary};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContent = styled.div`
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  position: relative;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CustomSelectTrigger = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ $isOpen, theme }) => $isOpen ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: #1a1a1a;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.text.muted};
    transition: transform 0.2s;
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  }
`;

const CustomSelectDropdown = styled.div<{ $isOpen: boolean }>`
  margin-top: 4px;
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  max-height: ${({ $isOpen }) => $isOpen ? '250px' : '0'};
  overflow-y: auto;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  border-width: ${({ $isOpen }) => $isOpen ? '1px' : '0'};
  transition: all 0.2s ease;
`;

const CustomSelectOption = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: ${({ $isSelected }) => $isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent'};
  color: ${({ $isSelected, theme }) => $isSelected ? '#10b981' : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.15s;

  &:hover {
    background: ${({ $isSelected }) => $isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }

  svg {
    width: 16px;
    height: 16px;
    opacity: ${({ $isSelected }) => $isSelected ? 1 : 0};
  }
`;

const CredentialsBox = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const CredentialsTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const CredentialItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: none;
  }
`;

const CredentialLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CredentialValue = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.muted};

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: ${({ theme }) => theme.spacing[4]};
    opacity: 0.5;
  }

  h3 {
    font-size: ${({ theme }) => theme.fontSizes.lg};
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const Team = () => {
  const { t } = useTranslation();
  const { manager: currentUser, organization } = useAuth();
  const permissions = usePermissions();

  const [members, setMembers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Manager | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    login: string;
    password: string;
  } | null>(null);

  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    login: '',
    email: '',
    role: 'manager_investment',
    branch: undefined,
    phone: '',
    position: '',
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const assignableRoles = permissions.getAssignableRoles();

  useEffect(() => {
    if (organization?.id) {
      loadMembers();
    }
  }, [organization?.id]);

  const loadMembers = async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);
      const response = await teamApi.getMembers(organization.id);
      if (response.success && response.data) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    try {
      setIsSubmitting(true);
      const response = await teamApi.create(organization.id, formData);

      if (response.success && response.data) {
        setNewCredentials({
          login: response.data.user.login,
          password: response.data.password,
        });
        setShowAddModal(false);
        setShowCredentialsModal(true);
        loadMembers();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      setIsSubmitting(true);
      const response = await teamApi.update(selectedMember.id, formData);

      if (response.success) {
        setShowEditModal(false);
        loadMembers();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: Manager) => {
    if (!confirm(t('team.confirmDelete', { name: member.name }))) return;

    try {
      const response = await teamApi.delete(member.id);
      if (response.success) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const handleResetPassword = async (member: Manager) => {
    if (!confirm(t('team.confirmResetPassword', { name: member.name }))) return;

    try {
      const response = await teamApi.resetPassword(member.id);
      if (response.success && response.data) {
        setNewCredentials({
          login: member.login,
          password: response.data.newPassword,
        });
        setShowCredentialsModal(true);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  const handleToggleStatus = async (member: Manager) => {
    try {
      const response = await teamApi.update(member.id, {
        isActive: !member.isActive,
      });
      if (response.success) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const openEditModal = (member: Manager) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      login: member.login,
      email: member.email || '',
      role: member.role,
      branch: member.branch,
      phone: member.phone || '',
      position: member.position || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      login: '',
      email: '',
      role: 'manager_investment',
      branch: undefined,
      phone: '',
      position: '',
    });
    setSelectedMember(null);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Loader2 size={40} />
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Users size={28} />
          {t('team.title', 'Команда')}
        </PageTitle>
        {permissions.canCreateTeamMember && (
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            {t('team.addMember', 'Добавить')}
          </Button>
        )}
      </PageHeader>

      {members.length === 0 ? (
        <EmptyState>
          <Users />
          <h3>{t('team.noMembers', 'Нет участников команды')}</h3>
          <p>{t('team.noMembersDesc', 'Добавьте первого участника')}</p>
        </EmptyState>
      ) : (
        <TeamGrid>
          {members.map((member) => (
            <MemberCard key={member.id} $isInactive={!member.isActive}>
              <MemberHeader>
                <Avatar $url={member.avatar}>
                  {!member.avatar && getInitials(member.name)}
                </Avatar>
                <MemberInfo>
                  <MemberName>{member.name}</MemberName>
                  <MemberRole>{t(`roles.${member.role}`, member.role)}</MemberRole>
                </MemberInfo>
                <Badge variant={member.isActive ? 'success' : 'danger'}>
                  {member.isActive ? t('team.active') : t('team.inactive')}
                </Badge>
              </MemberHeader>

              <MemberDetails>
                <DetailRow>
                  <Shield />
                  <span>{t('team.login')}: {member.login}</span>
                </DetailRow>
                {member.email && (
                  <DetailRow>
                    <Mail />
                    <span>{member.email}</span>
                  </DetailRow>
                )}
                {member.phone && (
                  <DetailRow>
                    <Phone />
                    <span>{member.phone}</span>
                  </DetailRow>
                )}
                {member.position && (
                  <DetailRow>
                    <Briefcase />
                    <span>{member.position}</span>
                  </DetailRow>
                )}
              </MemberDetails>

              {member.id !== currentUser?.id && permissions.canManage(member.role) && (
                <MemberActions>
                  {permissions.canEditTeamMember && (
                    <ActionButton onClick={() => openEditModal(member)}>
                      <Edit2 />
                      {t('team.edit')}
                    </ActionButton>
                  )}
                  {permissions.canResetPassword && (
                    <ActionButton $variant="warning" onClick={() => handleResetPassword(member)}>
                      <Key />
                      {t('team.resetPassword')}
                    </ActionButton>
                  )}
                  {permissions.canEditTeamMember && (
                    <ActionButton
                      $variant={member.isActive ? 'warning' : 'success'}
                      onClick={() => handleToggleStatus(member)}
                    >
                      {member.isActive ? <ToggleRight /> : <ToggleLeft />}
                      {member.isActive ? t('team.deactivate') : t('team.activate')}
                    </ActionButton>
                  )}
                  {permissions.canDeleteTeamMember && (
                    <ActionButton $variant="danger" onClick={() => handleDeleteMember(member)}>
                      <Trash2 />
                      {t('team.delete')}
                    </ActionButton>
                  )}
                </MemberActions>
              )}
            </MemberCard>
          ))}
        </TeamGrid>
      )}

      {showAddModal && (
        <ModalOverlay onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{t('team.addMemberTitle')}</ModalTitle>
              <CloseButton onClick={() => setShowAddModal(false)}>
                <X />
              </CloseButton>
            </ModalHeader>

            <Form onSubmit={handleAddMember}>
              <Input
                label={t('team.fullName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('team.fullNamePlaceholder')}
                required
              />
              <Input
                label={t('team.login')}
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                placeholder={t('team.loginPlaceholder')}
                required
              />
              <FormRow>
                <Input
                  label={t('team.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
                <Input
                  label={t('team.phone')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
              </FormRow>
              <SelectWrapper>
                <Label>{t('team.role')}</Label>
                <CustomSelectTrigger
                  type="button"
                  $isOpen={isRoleDropdownOpen}
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                >
                  {t(`roles.${formData.role}`)}
                  <ChevronDown />
                </CustomSelectTrigger>
                <CustomSelectDropdown $isOpen={isRoleDropdownOpen}>
                  {assignableRoles.map((role) => (
                    <CustomSelectOption
                      key={role}
                      type="button"
                      $isSelected={formData.role === role}
                      onClick={() => {
                        const autoBranch = role.includes('investment') || role === 'ceo'
                          ? 'investment' as const
                          : role.includes('ma')
                            ? 'ma' as const
                            : undefined;
                        setFormData({ ...formData, role, branch: autoBranch });
                        setIsRoleDropdownOpen(false);
                      }}
                    >
                      <Check />
                      {t(`roles.${role}`)}
                    </CustomSelectOption>
                  ))}
                </CustomSelectDropdown>
              </SelectWrapper>

              <ButtonGroup>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setIsRoleDropdownOpen(false);
                  }}
                >
                  {t('team.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={18} /> : t('team.create')}
                </Button>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}

      {showEditModal && selectedMember && (
        <ModalOverlay onClick={() => setShowEditModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{t('team.editMemberTitle')}</ModalTitle>
              <CloseButton onClick={() => setShowEditModal(false)}>
                <X />
              </CloseButton>
            </ModalHeader>

            <Form onSubmit={handleEditMember}>
              <Input
                label={t('team.fullName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <FormRow>
                <Input
                  label={t('team.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label={t('team.phone')}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </FormRow>
              <SelectWrapper>
                <Label>{t('team.role')}</Label>
                <CustomSelectTrigger
                  type="button"
                  $isOpen={isRoleDropdownOpen}
                  onClick={() => permissions.canManage(selectedMember.role) && setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  style={{ opacity: permissions.canManage(selectedMember.role) ? 1 : 0.5, cursor: permissions.canManage(selectedMember.role) ? 'pointer' : 'not-allowed' }}
                >
                  {t(`roles.${formData.role}`)}
                  <ChevronDown />
                </CustomSelectTrigger>
                <CustomSelectDropdown $isOpen={isRoleDropdownOpen}>
                  {assignableRoles
                    .filter((role) => role === selectedMember.role || permissions.canManage(selectedMember.role))
                    .map((role) => (
                      <CustomSelectOption
                        key={role}
                        type="button"
                        $isSelected={formData.role === role}
                        onClick={() => {
                          setFormData({ ...formData, role });
                          setIsRoleDropdownOpen(false);
                        }}
                      >
                        <Check />
                        {t(`roles.${role}`)}
                      </CustomSelectOption>
                    ))}
                </CustomSelectDropdown>
              </SelectWrapper>

              <ButtonGroup>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                    setIsRoleDropdownOpen(false);
                  }}
                >
                  {t('team.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={18} /> : t('team.save')}
                </Button>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}

      {showCredentialsModal && newCredentials && (
        <ModalOverlay onClick={() => setShowCredentialsModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{t('team.credentials')}</ModalTitle>
              <CloseButton onClick={() => setShowCredentialsModal(false)}>
                <X />
              </CloseButton>
            </ModalHeader>

            <CredentialsBox>
              <CredentialsTitle>{t('team.saveCredentials')}</CredentialsTitle>
              <CredentialItem>
                <CredentialLabel>{t('team.login')}:</CredentialLabel>
                <CredentialValue>
                  {newCredentials.login}
                  <CopyButton onClick={() => copyToClipboard(newCredentials.login, 'login')}>
                    {copiedField === 'login' ? <Check /> : <Copy />}
                  </CopyButton>
                </CredentialValue>
              </CredentialItem>
              <CredentialItem>
                <CredentialLabel>{t('team.password')}:</CredentialLabel>
                <CredentialValue>
                  {newCredentials.password}
                  <CopyButton onClick={() => copyToClipboard(newCredentials.password, 'password')}>
                    {copiedField === 'password' ? <Check /> : <Copy />}
                  </CopyButton>
                </CredentialValue>
              </CredentialItem>
            </CredentialsBox>

            <ButtonGroup>
              <Button onClick={() => setShowCredentialsModal(false)} style={{ width: '100%' }}>
                {t('team.close')}
              </Button>
            </ButtonGroup>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default Team;
