import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { X, User, Search, UserPlus, Copy, Check, ArrowLeft } from 'lucide-react';
import { teamApi, type CreateUserData, type UserRole, type Branch } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useCrmImageSrc } from '../../../components/ui/CrmImage';

interface Manager {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isActive: boolean;
}

const MANAGERIAL_ROLES: UserRole[] = ['deputy_investment', 'deputy_ma', 'manager_investment', 'manager_ma'];

const branchForRole = (role: UserRole): Branch | undefined =>
  role.includes('investment') || role === 'ceo' ? 'investment' : role.includes('ma') ? 'ma' : undefined;

const Overlay = styled.div`
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
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const SearchWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 12px 12px 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    border-color: #10b981;
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
`;

const ManagerList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin: 0 -24px;
  padding: 0 24px;
  max-height: 300px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
`;

const ManagerItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ $selected }) => $selected ? 'rgba(16, 185, 129, 0.15)' : 'transparent'};
  border: 1px solid ${({ $selected }) => $selected ? '#10b981' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: ${({ $selected }) => $selected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $src }) => $src ? `url("${$src}") center/cover` : 'rgba(16, 185, 129, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    color: #10b981;
  }
`;

const ManagerAvatarBubble = ({ src }: { src?: string | null }) => {
  const { src: resolved } = useCrmImageSrc(src);
  return (
    <Avatar $src={resolved || undefined}>
      {!resolved && <User size={18} />}
    </Avatar>
  );
};

const ManagerInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const ManagerName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const ManagerRole = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${({ $primary }) => $primary ? `
    background: #10b981;
    color: white;

    &:hover {
      background: #059669;
    }

    &:disabled {
      background: rgba(16, 185, 129, 0.3);
      cursor: not-allowed;
    }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px 20px 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const AddManagerButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 4px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px dashed rgba(16, 185, 129, 0.5);
  border-radius: 10px;
  color: #10b981;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.18);
    border-color: #10b981;
  }
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  max-height: 340px;
  margin: 0 -24px;
  padding: 4px 24px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  &::placeholder { color: rgba(255, 255, 255, 0.35); }
  &:focus { border-color: #10b981; background: rgba(255, 255, 255, 0.08); }
`;

const RoleSelect = styled.select`
  width: 100%;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  &:focus { border-color: #10b981; }
  option { background: #1a1a1a; color: #fff; }
`;

const ErrorMsg = styled.div`
  color: #f87171;
  font-size: 14px;
`;

const CredBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
`;

const CredHint = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
`;

const CredRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
`;

const CredCol = styled.div`
  min-width: 0;
`;

const CredLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
`;

const CredValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  word-break: break-all;
`;

const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(16, 185, 129, 0.2); }
`;

const ROLE_KEYS: Record<string, string> = {
  ceo: 'roles.ceo',
  deputy_investment: 'roles.deputy_investment',
  deputy_ma: 'roles.deputy_ma',
  manager_investment: 'roles.manager_investment',
  manager_ma: 'roles.manager_ma',
};

interface AssignManagerModalProps {
  isOpen: boolean;
  startupName: string;
  onConfirm: (managerId: string, managerName: string) => void;
  onCancel: () => void;
  currentAssignedManagerId?: string;
  targetStatusLabel?: string;
}

type View = 'list' | 'create' | 'created';

export const AssignManagerModal = ({ isOpen, startupName, onConfirm, onCancel, currentAssignedManagerId, targetStatusLabel }: AssignManagerModalProps) => {
  const { t } = useTranslation();
  const { manager: currentUser } = useAuth();
  const permissions = usePermissions();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoleOptions = permissions.getAssignableRoles().filter((r) => MANAGERIAL_ROLES.includes(r));
  const canCreateManager = permissions.canCreateTeamMember && createRoleOptions.length > 0;
  const defaultRole = createRoleOptions.find((r) => r.startsWith('manager_')) || createRoleOptions[0];
  const [view, setView] = useState<View>('list');
  const [createForm, setCreateForm] = useState<{ name: string; login: string; email: string; role?: UserRole }>(
    { name: '', login: '', email: '', role: defaultRole }
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser?.organizationId) {
      fetchManagers();
      setSelectedManager(null);
      setSearchQuery('');
      setView('list');
      setCreateError('');
      setCredentials(null);
      setCreateForm({ name: '', login: '', email: '', role: defaultRole });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser?.organizationId]);

  useEffect(() => {
    if (isOpen && !createForm.role && defaultRole) {
      setCreateForm((form) => ({ ...form, role: defaultRole }));
    }
  }, [isOpen, defaultRole, createForm.role]);

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const response = await teamApi.getMembers(currentUser?.organizationId || '');
      if (response.success && response.data) {
        const userRole = currentUser?.role || '';

        let filtered: Manager[];

        if (userRole === 'ceo' || userRole === 'deputy_investment') {
          const assignableRoles = ['deputy_investment', 'deputy_ma', 'manager_investment', 'manager_ma'];
          filtered = response.data.filter((m: Manager) =>
            assignableRoles.includes(m.role) && m.isActive
          );
        } else if (userRole === 'deputy_ma') {
          const branch = 'ma';
          const managerRole = `manager_${branch}`;
          filtered = response.data.filter((m: Manager) =>
            (m.role === managerRole || m.role === userRole) && m.isActive
          );
        } else if (userRole === 'manager_investment' || userRole === 'manager_ma') {
          filtered = response.data.filter((m: Manager) =>
            m.id === currentUser?.id && m.isActive
          );
        } else {
          filtered = [];
        }

        setManagers(filtered);
        return filtered;
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    } finally {
      setIsLoading(false);
    }
    return [] as Manager[];
  };

  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedManager) {
      onConfirm(selectedManager.id, selectedManager.name);
    }
  };

  const openCreate = () => {
    setCreateError('');
    setCreateForm({ name: searchQuery.trim(), login: '', email: '', role: defaultRole });
    setView('create');
  };

  const handleCreate = async () => {
    if (!currentUser?.organizationId || !createForm.role) return;
    if (!createForm.name.trim() || !createForm.login.trim()) {
      setCreateError(t('startups.assign.createValidation', 'Enter a name and a login'));
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const payload: CreateUserData = {
        name: createForm.name.trim(),
        login: createForm.login.trim(),
        email: createForm.email.trim() || undefined,
        role: createForm.role,
        branch: branchForRole(createForm.role),
      };
      const response = await teamApi.create(currentUser.organizationId, payload);
      if (response.success && response.data) {
        setCredentials({ login: response.data.user.login, password: response.data.password });
        const refreshed = await fetchManagers();
        const created = refreshed.find((m) => m.id === response.data!.user.id);
        if (created) setSelectedManager(created);
        setView('created');
      } else {
        setCreateError(response.error || t('startups.assign.createError', 'Could not create the account'));
      }
    } catch (error) {
      console.error('Failed to create manager:', error);
      setCreateError(t('startups.assign.createError', 'Could not create the account'));
    } finally {
      setCreating(false);
    }
  };

  const copy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    }).catch(() => undefined);
  };

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={onCancel}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>
            {view !== 'list' && (
              <CloseButton onClick={() => { setView('list'); setCreateError(''); }} title={t('startups.assign.back', 'Back')}>
                <ArrowLeft size={18} />
              </CloseButton>
            )}
            {view === 'create'
              ? t('startups.assign.createTitle', 'New manager')
              : view === 'created'
                ? t('startups.assign.createdTitle', 'Manager account created')
                : t('startups.assign.title')}
          </Title>
          <CloseButton onClick={onCancel}>
            <X size={20} />
          </CloseButton>
        </Header>

        {view === 'list' && (
          <>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
              {targetStatusLabel ? (
                <>
                  {t('startups.assign.moveToPrefix')} <strong style={{ color: '#fff' }}>{startupName}</strong>{' '}
                  {t('startups.assign.moveToMid')} <strong style={{ color: '#fff' }}>{targetStatusLabel}</strong>{' '}
                  {t('startups.assign.moveToSuffix')}
                </>
              ) : (
                <>
                  {t('startups.assign.selectManager')} <strong style={{ color: '#fff' }}>{startupName}</strong>
                </>
              )}
            </div>

            <SearchWrapper>
              <SearchIcon>
                <Search size={16} />
              </SearchIcon>
              <SearchInput
                placeholder={t('startups.assign.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </SearchWrapper>

            <ManagerList>
              {isLoading ? (
                <EmptyState>{t('common.loading')}</EmptyState>
              ) : filteredManagers.length > 0 ? (
                <>
                  {filteredManagers.map(manager => (
                    <ManagerItem
                      key={manager.id}
                      $selected={selectedManager?.id === manager.id}
                      onClick={() => setSelectedManager(manager)}
                    >
                      <ManagerAvatarBubble src={manager.avatar} />
                      <ManagerInfo>
                        <ManagerName>{manager.name}</ManagerName>
                        <ManagerRole>{t(ROLE_KEYS[manager.role] || `roles.${manager.role}`, manager.role)}</ManagerRole>
                      </ManagerInfo>
                    </ManagerItem>
                  ))}
                  {canCreateManager && (
                    <AddManagerButton onClick={openCreate}>
                      <UserPlus size={16} />
                      {t('startups.assign.addManager', 'Add manager account')}
                    </AddManagerButton>
                  )}
                </>
              ) : (
                <>
                  <EmptyState>{t('startups.assign.noManagers')}</EmptyState>
                  {canCreateManager && (
                    <AddManagerButton onClick={openCreate}>
                      <UserPlus size={16} />
                      {t('startups.assign.addManager', 'Add manager account')}
                    </AddManagerButton>
                  )}
                </>
              )}
            </ManagerList>

            <Footer>
              <Button onClick={onCancel}>{t('common.cancel')}</Button>
              <Button $primary onClick={handleConfirm} disabled={!selectedManager}>
                {t('startups.assign.assign')}
              </Button>
            </Footer>
          </>
        )}

        {view === 'create' && (
          <>
            <Form>
              <Field>
                <FieldLabel>{t('startups.assign.nameLabel', 'Full name')}</FieldLabel>
                <FieldInput
                  autoFocus
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={t('startups.assign.namePlaceholder', 'e.g. Anvar Karimov')}
                />
              </Field>
              <Field>
                <FieldLabel>{t('startups.assign.loginLabel', 'Login')}</FieldLabel>
                <FieldInput
                  value={createForm.login}
                  onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                  placeholder={t('startups.assign.loginPlaceholder', 'e.g. a.karimov')}
                />
              </Field>
              <Field>
                <FieldLabel>{t('startups.assign.emailLabel', 'Email (optional)')}</FieldLabel>
                <FieldInput
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="name@fund.uz"
                />
              </Field>
              <Field>
                <FieldLabel>{t('startups.assign.roleLabel', 'Role')}</FieldLabel>
                <RoleSelect
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                >
                  {createRoleOptions.map((role) => (
                    <option key={role} value={role}>{t(ROLE_KEYS[role] || `roles.${role}`, role)}</option>
                  ))}
                </RoleSelect>
              </Field>
              {createError && <ErrorMsg>{createError}</ErrorMsg>}
            </Form>

            <Footer>
              <Button onClick={() => { setView('list'); setCreateError(''); }}>{t('startups.assign.back', 'Back')}</Button>
              <Button $primary onClick={handleCreate} disabled={creating}>
                {creating ? t('startups.assign.creating', 'Creating...') : t('startups.assign.create', 'Create & select')}
              </Button>
            </Footer>
          </>
        )}

        {view === 'created' && credentials && (
          <>
            <CredBox>
              <CredHint>{t('startups.assign.credentialsHint', 'Share these credentials with the manager. The password is shown only once.')}</CredHint>
              <CredRow>
                <CredCol>
                  <CredLabel>{t('startups.assign.loginLabel', 'Login')}</CredLabel>
                  <CredValue>{credentials.login}</CredValue>
                </CredCol>
                <CopyBtn onClick={() => copy('login', credentials.login)}>
                  {copied === 'login' ? <Check size={14} /> : <Copy size={14} />}
                  {copied === 'login' ? t('startups.assign.copied', 'Copied') : t('common.copy', 'Copy')}
                </CopyBtn>
              </CredRow>
              <CredRow>
                <CredCol>
                  <CredLabel>{t('startups.assign.passwordLabel', 'Password')}</CredLabel>
                  <CredValue>{credentials.password}</CredValue>
                </CredCol>
                <CopyBtn onClick={() => copy('password', credentials.password)}>
                  {copied === 'password' ? <Check size={14} /> : <Copy size={14} />}
                  {copied === 'password' ? t('startups.assign.copied', 'Copied') : t('common.copy', 'Copy')}
                </CopyBtn>
              </CredRow>
            </CredBox>

            <Footer>
              <Button $primary onClick={() => { setCredentials(null); setView('list'); }}>
                {t('startups.assign.done', 'Done')}
              </Button>
            </Footer>
          </>
        )}
      </Modal>
    </Overlay>,
    document.body
  );
};
