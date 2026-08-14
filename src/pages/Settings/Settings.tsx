import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardTitle, CardSubtitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { CrmImage } from '../../components/ui/CrmImage';
import { managerApi, organizationApi, Manager, Organization, UserRole, invitationApi, registrationApi, Invitation, PendingRegistration, teamApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { User, Building2, Users, Shield, Camera, Mail, Save, X, Plus, Trash2, Loader2, Link2, Copy, Check, Clock, UserCheck, UserX, Eye, EyeOff, Key, UserPlus, AlertCircle, ChevronDown, Settings as SettingsIcon, Moon, Sun, LogOut } from 'lucide-react';
import { MyProgressContent } from '../MyProgress/MyProgressPage';
import { isDirectorRole } from '../../utils/permissions';
import { formatShortDate } from '../../utils/formatDate';

import { PageTransition, fadeIn, slideInUp } from '../../styles/animations';

const PageContainer = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 1000px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[6]};
  ${PageTransition}
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[3]};
    max-width: 100%;
  }
`;

const CleanCard = styled(Card)`
  width: 100%;
  min-width: 0;
  background: transparent;
  border: none;
  padding: ${({ theme }) => theme.spacing[6]} 0;
`;

const AnimatedTabContent = styled.div`
  min-width: 0;
  animation: ${fadeIn} 0.35s cubic-bezier(0.4, 0, 0.2, 1),
             ${slideInUp} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
  animation-fill-mode: both;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari */
  }

  @media (max-width: 768px) {
    margin-bottom: ${({ theme }) => theme.spacing[5]};
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.muted};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;

  ${({ $active, theme }) =>
    $active &&
    `
    border-bottom-color: ${theme.colors.accent.primary};
    color: ${theme.colors.accent.primary};
  `}

  &:hover {
    color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover svg {
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
    font-size: ${({ theme }) => theme.fontSizes.sm};

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const AvatarContainer = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
`;

const Avatar = styled(CrmImage)`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.border.secondary};
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid ${({ theme }) => theme.colors.border.secondary};
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};

  svg {
    width: 40px;
    height: 40px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const AvatarUploadButton = styled.label`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 3px solid ${({ theme }) => theme.colors.bg.primary};
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  svg {
    width: 16px;
    height: 16px;
    color: white;
  }

  input {
    display: none;
  }
`;

const AvatarInfo = styled.div`
  flex: 1;
`;

const AvatarTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const AvatarDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const ProfileProgressWrapper = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin-top: ${({ theme }) => theme.spacing[5]};
`;

const AppSettingsList = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.spacing[5]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const AppSettingRow = styled.div<{ $danger?: boolean }>`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 44px minmax(0, 1fr);
    align-items: start;
  }
`;

const AppSettingIcon = styled.div<{ $danger?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.status.danger : theme.colors.border.secondary)};
  background: ${({ $danger, theme }) => ($danger ? theme.colors.status.dangerBg : theme.colors.bg.secondary)};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.status.danger : theme.colors.accent.primary)};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const AppSettingContent = styled.div`
  min-width: 0;
`;

const AppSettingTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const AppSettingDescription = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const AppSettingAction = styled.div`
  display: flex;
  justify-content: flex-end;
  min-width: max-content;

  @media (max-width: 640px) {
    grid-column: 2;
    justify-content: flex-start;
    min-width: 0;
    margin-top: ${({ theme }) => theme.spacing[2]};
  }
`;

const TeamMembersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};

  & > * {
    animation: ${fadeIn} 0.4s ease-out, ${slideInUp} 0.4s ease-out;
    animation-fill-mode: both;
  }

  & > *:nth-child(1) { animation-delay: 0.05s; }
  & > *:nth-child(2) { animation-delay: 0.1s; }
  & > *:nth-child(3) { animation-delay: 0.15s; }
  & > *:nth-child(4) { animation-delay: 0.2s; }
  & > *:nth-child(5) { animation-delay: 0.25s; }
`;

const TeamMemberCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  overflow: hidden;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const MemberAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 24px;
    height: 24px;
    color: var(--text-muted);
  }
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const MemberName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`;

const MemberEmail = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const MemberActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const OrgLogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  overflow: hidden;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const OrgLogo = styled(CrmImage)`
  width: 180px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.lg};
  object-fit: contain;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.primary};
`;

const OrgLogoPlaceholder = styled.div`
  width: 180px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  flex-shrink: 0;
`;

const IframeBrandingCard = styled.section`
  padding: ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.tertiary};
`;

const IframeBrandingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const BrandingPreview = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-height: 56px;
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.primary};

  img {
    width: min(160px, 40vw);
    height: 40px;
    object-fit: contain;
    object-position: left center;
  }
`;

const SecurityOption = styled.div`
  padding: ${({ theme }) => theme.spacing[5]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};

  &:last-child {
    border-bottom: none;
  }
`;

const SecurityTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const SecurityDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const InvitationSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  padding-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};

  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const InvitationForm = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const InvitationLinkBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const LinkText = styled.code`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: break-all;
`;

const PendingCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const PendingInfo = styled.div`
  flex: 1;
`;

const PendingName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`;

const PendingEmail = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PendingActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const InvitationCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const InvitationInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const InvitationMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SlotsIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SlotsText = styled.div`
  flex: 1;

  .slots-title {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 4px;
  }

  .slots-count {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SlotsBar = styled.div`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: hidden;
`;

const SlotsFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.accent.primary};
  transition: width 0.3s ease;
`;

const CreateAccountForm = styled.div`
  padding: ${({ theme }) => theme.spacing[5]};
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const CustomSelectWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const CustomSelectLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CustomSelectTrigger = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${({ $isOpen, theme }) => $isOpen ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
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
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #1a1a1a;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
  max-height: 220px;
  overflow-y: auto;
  opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
  visibility: ${({ $isOpen }) => $isOpen ? 'visible' : 'hidden'};
  transform: ${({ $isOpen }) => $isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
`;

const CustomSelectOption = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: ${({ $isSelected }) => $isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent'};
  color: ${({ $isSelected, theme }) => $isSelected ? '#10b981' : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
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

const COMPANY_SIZE_OPTIONS: { value: string }[] = [
  { value: '1-10' },
  { value: '11-50' },
  { value: '51-200' },
  { value: '201-500' },
  { value: '501-1000' },
  { value: '1000+' },
];

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CredentialsBox = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: ${({ theme }) => theme.radius.md};
  margin-top: ${({ theme }) => theme.spacing[4]};

  .credentials-title {
    font-weight: 600;
    color: #10b981;
    margin-bottom: ${({ theme }) => theme.spacing[3]};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .credential-item {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[2]};
    margin-bottom: ${({ theme }) => theme.spacing[2]};

    label {
      font-size: ${({ theme }) => theme.fontSizes.sm};
      color: ${({ theme }) => theme.colors.text.muted};
      min-width: 80px;
    }

    code {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      color: ${({ theme }) => theme.colors.text.primary};
    }
  }
`;

type TabType = 'profile' | 'organization' | 'team' | 'security' | 'app';

const SETTINGS_TABS: TabType[] = ['profile', 'organization', 'team', 'security', 'app'];

function getSettingsTabFromSearch(search: string): TabType {
  const tab = new URLSearchParams(search).get('tab');
  return SETTINGS_TABS.includes(tab as TabType) ? (tab as TabType) : 'profile';
}

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
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

const ButtonSpinner = styled(Loader2)`
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { manager: authManager, organization: authOrganization, updateManager: updateAuthManager, updateOrganization: updateAuthOrganization, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [activeTab, setActiveTab] = useState<TabType>(() => getSettingsTabFromSearch(location.search));
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarError, setAvatarError] = useState(false);
  const [orgLogoError, setOrgLogoError] = useState(false);
  const [memberAvatarErrors, setMemberAvatarErrors] = useState<Record<string, boolean>>({});
  const [avatarFile, setAvatarFile] = useState<{ base64: string; contentType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentManager, setCurrentManager] = useState<Manager | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [orgLogoUrl, setOrgLogoUrl] = useState<string>('');
  const [orgLogoFile, setOrgLogoFile] = useState<{ base64: string; contentType: string } | null>(null);
  const orgLogoInputRef = useRef<HTMLInputElement>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [iframePrimaryColor, setIframePrimaryColor] = useState('#8CC63F');
  const [iframeTheme, setIframeTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  const [selectedRole, setSelectedRole] = useState<UserRole>('manager_investment');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    location: '',
  });

  const [orgFormData, setOrgFormData] = useState({
    name: '',
    industry: '',
    companySize: '',
    website: '',
    email: '',
    address: '',
    description: '',
  });

  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    navigate(tab === 'profile' ? '/settings' : `/settings?tab=${tab}`, { replace: true });
  };

  const [isCompanySizeDropdownOpen, setIsCompanySizeDropdownOpen] = useState(false);
  const [isNewAccountRoleDropdownOpen, setIsNewAccountRoleDropdownOpen] = useState(false);
  const [isEditMemberRoleDropdownOpen, setIsEditMemberRoleDropdownOpen] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [editingMember, setEditingMember] = useState<Manager | null>(null);
  const [editMemberData, setEditMemberData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'manager_investment' as UserRole,
  });
  const [isSavingMember, setIsSavingMember] = useState(false);

  const MAX_TEAM_SLOTS = 500;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ login: string; password: string } | null>(null);
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    login: '',
    email: '',
    role: 'manager_investment' as UserRole,
    phone: '',
    position: '',
  });

  useEffect(() => {
    const fetchFreshData = async () => {
      if (!authManager?.id) return;

      try {
        const response = await managerApi.getById(authManager.id);
        if (response.success && response.data) {
          updateAuthManager(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch fresh manager data:', error);
      }
    };

    fetchFreshData();
  }, [authManager?.id]);

  useEffect(() => {
    if (authManager) {
      setCurrentManager(authManager as Manager);
      setOrganization(authOrganization as Organization | null);
      setAvatarUrl(authManager.avatar || '');

      setFormData({
        name: authManager.name || '',
        email: authManager.email || '',
        phone: authManager.phone || '',
        position: authManager.position || '',
        location: (authManager as any).location || '',
      });

      if (authOrganization) {
        setOrgLogoUrl(authOrganization.logo || '');
        const savedPrimaryColor = authOrganization.iframe?.primaryColor
          || authOrganization.iframe?.branding?.primaryColor;
        setIframePrimaryColor(/^#[0-9A-Fa-f]{6}$/.test(savedPrimaryColor || '')
          ? String(savedPrimaryColor).toUpperCase()
          : '#8CC63F');
        setIframeTheme(authOrganization.iframe?.theme === 'light' || authOrganization.iframe?.theme === 'dark'
          ? authOrganization.iframe.theme
          : 'auto');
        setOrgFormData({
          name: authOrganization.name || '',
          industry: (authOrganization as any).industry || '',
          companySize: (authOrganization as any).companySize || '',
          website: (authOrganization as any).website || '',
          email: (authOrganization as any).email || '',
          address: (authOrganization as any).address || '',
          description: authOrganization.description || '',
        });
      }

      setManagers([authManager as Manager]);
      setIsLoading(false);
    }
  }, [authManager, authOrganization]);

  useEffect(() => {
    const nextTab = getSettingsTabFromSearch(location.search);
    setActiveTab((current) => current === nextTab ? current : nextTab);
  }, [location.search]);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!authOrganization?.id) return;

      try {
        const membersResponse = await teamApi.getMembers(authOrganization.id);
        if (membersResponse.success && membersResponse.data) {
          setManagers(membersResponse.data);
        }

        const invitationsResponse = await invitationApi.getAll(authOrganization.id);
        if (invitationsResponse.success && invitationsResponse.data) {
          setInvitations(invitationsResponse.data);
        }

        if (isDirectorRole(authManager?.role)) {
          const pendingResponse = await registrationApi.getPending(authOrganization.id);
          if (pendingResponse.success && pendingResponse.data) {
            setPendingRegistrations(pendingResponse.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      }
    };

    if (activeTab === 'team') {
      fetchTeamData();
    }
  }, [authOrganization?.id, authManager?.role, activeTab]);

  const getAvailableRoles = (): UserRole[] => {
    if (!currentManager) return [];

    const rolePermissions: Record<UserRole, UserRole[]> = {
      ceo: ['deputy_investment', 'deputy_ma', 'manager_investment', 'manager_ma', 'financier', 'lawyer', 'tech_specialist', 'committee_member'],
      deputy_investment: ['deputy_investment', 'deputy_ma', 'manager_investment', 'manager_ma', 'financier', 'lawyer', 'tech_specialist', 'committee_member'],
      deputy_ma: ['manager_ma'],
      manager_investment: [],
      manager_ma: [],
      financier: [],
      lawyer: [],
      tech_specialist: [],
      committee_member: [],
    };

    return rolePermissions[currentManager.role] || [];
  };

  const handleGenerateLink = async () => {
    if (!currentManager || !organization) return;

    setIsGeneratingLink(true);
    setGeneratedLink('');

    try {
      const response = await invitationApi.create(
        currentManager.id,
        organization.id,
        selectedRole
      );

      if (response.success && response.data) {
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/register?token=${response.data.token}`;
        setGeneratedLink(inviteUrl);

        const invitationsResponse = await invitationApi.getAll(organization.id);
        if (invitationsResponse.success && invitationsResponse.data) {
          setInvitations(invitationsResponse.data);
        }
      } else {
        alert(response.error || t('settings.team.generateLinkError', 'Failed to generate the invitation link'));
      }
    } catch (error) {
      console.error('Failed to generate link:', error);
      alert(t('settings.team.generateLinkError', 'Failed to generate the invitation link'));
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleApprove = async (registrationId: string) => {
    if (!currentManager) return;

    setApprovingId(registrationId);

    try {
      const response = await registrationApi.approve(registrationId, currentManager.id);

      if (response.success && response.data) {
        alert(
          t('settings.team.approvedAlert', {
            login: response.data.login,
            password: response.data.password,
          })
        );

        setPendingRegistrations(prev => prev.filter(r => r.id !== registrationId));

        if (organization) {
          const membersResponse = await teamApi.getMembers(organization.id);
          if (membersResponse.success && membersResponse.data) {
            setManagers(membersResponse.data);
          }
        }
      } else {
        alert(response.error || t('settings.team.approveError', 'Failed to approve the registration'));
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      alert(t('settings.team.approveError', 'Failed to approve the registration'));
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (registrationId: string) => {
    if (!currentManager) return;

    const reason = prompt(t('settings.team.rejectReasonPrompt'));

    setRejectingId(registrationId);

    try {
      const response = await registrationApi.reject(registrationId, currentManager.id, reason || undefined);

      if (response.success) {
        setPendingRegistrations(prev => prev.filter(r => r.id !== registrationId));
      } else {
        alert(response.error || t('settings.team.rejectError', 'Failed to reject the registration'));
      }
    } catch (error) {
      console.error('Failed to reject:', error);
      alert(t('settings.team.rejectError', 'Failed to reject the registration'));
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeactivateInvitation = async (invitationId: string) => {
    try {
      const response = await invitationApi.delete(invitationId);

      if (response.success) {
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
      } else {
        alert(response.error || t('settings.team.deactivateError', 'Failed to deactivate the invitation'));
      }
    } catch (error) {
      console.error('Failed to deactivate:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!organization || !newAccountData.name || !newAccountData.login) {
      alert(t('settings.team.fillRequiredFields'));
      return;
    }

    const usedSlots = managers.filter(m => m.role !== 'ceo').length;
    if (usedSlots >= MAX_TEAM_SLOTS) {
      alert(t('settings.team.limitReached', { count: MAX_TEAM_SLOTS }));
      return;
    }

    setIsCreatingAccount(true);
    setCreatedCredentials(null);

    try {
      const response = await teamApi.create(organization.id, newAccountData);

      if (response.success && response.data) {
        setCreatedCredentials({
          login: response.data.user.login || newAccountData.login,
          password: response.data.password,
        });

        const membersResponse = await teamApi.getMembers(organization.id);
        if (membersResponse.success && membersResponse.data) {
          setManagers(membersResponse.data);
        }

        setNewAccountData({
          name: '',
          login: '',
          email: '',
          role: 'manager_investment',
          phone: '',
          position: '',
        });
      } else {
        alert(response.error || t('settings.team.createError'));
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      alert(t('settings.team.createError'));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleEditMember = (member: Manager) => {
    setEditingMember(member);
    setEditMemberData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      role: member.role as UserRole,
    });
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    setIsSavingMember(true);
    try {
      const response = await teamApi.update(editingMember.id, editMemberData);
      if (response.success) {
        setManagers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...editMemberData } : m));
        setEditingMember(null);
      } else {
        alert(response.error || t('settings.team.updateError'));
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      alert(t('settings.team.updateError'));
    } finally {
      setIsSavingMember(false);
    }
  };

  const usedSlots = managers.filter(m => m.role !== 'ceo').length;
  const availableSlots = MAX_TEAM_SLOTS - usedSlots;
  const isLightMode = mode === 'light';
  const themeLabel = t(`settings.themes.${mode}`);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner size={48} />
          <div style={{ color: 'var(--text-muted)' }}>{t('common.loading', 'Loading...')}</div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (!currentManager) {
    return (
      <PageContainer>
        <LoadingContainer>
          <div style={{ color: 'var(--text-muted)' }}>{t('settings.loadError', 'Failed to load settings')}</div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        setAvatarError(false);
        setAvatarFile({
          base64,
          contentType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentManager) return;

    setIsSaving(true);

    try {
      let newAvatarUrl = currentManager.avatar;

      if (avatarFile) {
        const avatarResponse = await managerApi.uploadAvatar(
          currentManager.id,
          avatarFile.base64,
          avatarFile.contentType
        );
        if (avatarResponse.success && avatarResponse.data) {
          newAvatarUrl = avatarResponse.data.avatarUrl;
          setAvatarUrl(newAvatarUrl);
          setAvatarFile(null);
        }
      }

      const profileResponse = await managerApi.updateProfile(currentManager.id, formData);

      if (profileResponse.success && profileResponse.data) {
        const updatedManager = { ...profileResponse.data, avatar: newAvatarUrl };
        setCurrentManager(updatedManager);
        updateAuthManager(updatedManager);
        alert(t('settings.profile.saveSuccess'));
      } else {
        alert(t('settings.profile.saveErrorWithReason', { reason: profileResponse.error || t('settings.profile.unknownError') }));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(t('settings.profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentManager) {
      setFormData({
        name: currentManager.name || '',
        email: currentManager.email || '',
        phone: currentManager.phone || '',
        position: currentManager.position || '',
        location: (currentManager as any).location || '',
      });
      setAvatarUrl(currentManager.avatar || '');
      setAvatarFile(null);
    }
  };

  const handleChangePassword = async () => {
    if (!currentManager) return;

    setPasswordError('');

    const currentPwd = currentPasswordInput;
    if (!currentPwd) {
      setPasswordError(t('settings.security.enterCurrentPassword'));
      return;
    }

    if (!newPassword) {
      setPasswordError(t('settings.security.enterNewPassword'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('settings.security.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.security.passwordsDoNotMatch'));
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await managerApi.changePassword(
        currentManager.id,
        currentPwd,
        newPassword
      );

      if (response.success) {
        alert(t('settings.security.passwordChanged'));
        setCurrentPasswordInput('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentManager({ ...currentManager } as Manager);
        updateAuthManager({ ...currentManager });
      } else {
        setPasswordError(response.error || t('settings.security.passwordChangeFailed'));
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordError(t('settings.security.passwordChangeError'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOrgLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        alert(t('settings.fund.logoTypeError', 'Use a PNG, JPEG, or WebP logo'));
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t('settings.fund.logoSizeError', 'Logo must be no larger than 5 MB'));
        e.target.value = '';
        return;
      }
      setOrgLogoError(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setOrgLogoUrl(base64);
        setOrgLogoFile({
          base64,
          contentType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOrgInputChange = (field: keyof typeof orgFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setOrgFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;
    if (!/^#[0-9A-Fa-f]{6}$/.test(iframePrimaryColor)) {
      alert(t('settings.fund.iframeColorError', 'Enter the color as #RRGGBB'));
      return;
    }

    setIsSavingOrg(true);

    try {
      let newLogoUrl = organization.logo;

      if (orgLogoFile) {
        const logoResponse = await organizationApi.uploadLogo(
          organization.id,
          orgLogoFile.base64,
          orgLogoFile.contentType
        );
        if (logoResponse.success && logoResponse.data) {
          newLogoUrl = logoResponse.data.logoUrl;
          setOrgLogoUrl(newLogoUrl);
          setOrgLogoFile(null);
        } else {
          throw new Error(logoResponse.error || 'Logo upload failed');
        }
      }

      const updateData = {
        name: orgFormData.name,
        industry: orgFormData.industry,
        companySize: orgFormData.companySize,
        website: orgFormData.website,
        email: orgFormData.email,
        address: orgFormData.address,
        description: orgFormData.description,
        logo: newLogoUrl,
      };

      const response = await organizationApi.update(organization.id, updateData);

      if (response.success && response.data) {
        const brandingResponse = await organizationApi.updateIframeBranding(organization.id, {
          primaryColor: iframePrimaryColor,
          theme: iframeTheme,
        });
        if (!brandingResponse.success || !brandingResponse.data) {
          throw new Error(brandingResponse.error || 'Iframe branding update failed');
        }
        setOrganization(brandingResponse.data);
        updateAuthOrganization(brandingResponse.data);
        alert(t('settings.fund.saveSuccess'));
      } else {
        alert(t('settings.fund.saveErrorWithReason', { reason: response.error || t('settings.fund.unknownError') }));
      }
    } catch (error) {
      console.error('Failed to save organization:', error);
      alert(t('settings.fund.saveError'));
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleOrgCancel = () => {
    if (authOrganization) {
      setOrgLogoUrl(authOrganization.logo || '');
      setOrgLogoFile(null);
      const savedPrimaryColor = authOrganization.iframe?.primaryColor
        || authOrganization.iframe?.branding?.primaryColor;
      setIframePrimaryColor(/^#[0-9A-Fa-f]{6}$/.test(savedPrimaryColor || '')
        ? String(savedPrimaryColor).toUpperCase()
        : '#8CC63F');
      setIframeTheme(authOrganization.iframe?.theme === 'light' || authOrganization.iframe?.theme === 'dark'
        ? authOrganization.iframe.theme
        : 'auto');
      setOrgFormData({
        name: authOrganization.name || '',
        industry: (authOrganization as any).industry || '',
        companySize: (authOrganization as any).companySize || '',
        website: (authOrganization as any).website || '',
        email: (authOrganization as any).email || '',
        address: (authOrganization as any).address || '',
        description: authOrganization.description || '',
      });
    }
  };

  return (
    <PageContainer>
      <TabsContainer>
        <Tab $active={activeTab === 'profile'} onClick={() => selectTab('profile')}>
          <User />
          {t('settings.tabs.profile')}
        </Tab>
        {isDirectorRole(currentManager?.role) && (
          <Tab $active={activeTab === 'organization'} onClick={() => selectTab('organization')}>
            <Building2 />
            {t('settings.tabs.fund')}
          </Tab>
        )}
        {isDirectorRole(currentManager?.role) && (
          <Tab $active={activeTab === 'team'} onClick={() => selectTab('team')}>
            <Users />
            {t('settings.tabs.team')}
          </Tab>
        )}
        <Tab $active={activeTab === 'security'} onClick={() => selectTab('security')}>
          <Shield />
          {t('settings.tabs.security')}
        </Tab>
        <Tab $active={activeTab === 'app'} onClick={() => selectTab('app')}>
          <SettingsIcon />
          {t('settings.tabs.app', 'Settings')}
        </Tab>
      </TabsContainer>

      <ContentGrid>
        {activeTab === 'profile' && (
          <AnimatedTabContent key="profile">
            <CleanCard>
            <CardTitle>{t('settings.profile.title')}</CardTitle>
            <CardSubtitle>{t('settings.profile.subtitle')}</CardSubtitle>

            <AvatarSection>
              <AvatarContainer>
                {avatarUrl && !avatarError ? (
                  <Avatar src={avatarUrl} alt={currentManager.name} onError={() => setAvatarError(true)} />
                ) : (
                  <AvatarPlaceholder>
                    {currentManager.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarPlaceholder>
                )}
                <AvatarUploadButton>
                  <Camera />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </AvatarUploadButton>
              </AvatarContainer>
              <AvatarInfo>
                <AvatarTitle>{t('settings.profile.photo')}</AvatarTitle>
                <AvatarDescription>
                  {t('settings.profile.photoDesc')}
                </AvatarDescription>
              </AvatarInfo>
            </AvatarSection>

            <Form onSubmit={handleSubmit}>
              <FormRow>
                <Input
                  label={t('settings.profile.name')}
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                />
                <Input
                  label={t('settings.profile.phone')}
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder={t('settings.profile.phonePlaceholder')}
                />
              </FormRow>

              <Input
                label={t('settings.profile.location')}
                value={formData.location}
                onChange={handleInputChange('location')}
                placeholder={t('settings.profile.locationPlaceholder')}
              />

              <div>
                <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                  {t('settings.profile.role')}
                </label>
                <Badge variant="primary">{t(`roles.${currentManager.role}`, currentManager.role)}</Badge>
              </div>

              <ButtonGroup>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <ButtonSpinner size={16} /> : <Save size={16} />}
                  {isSaving ? t('settings.profile.saving') : t('settings.profile.saveChanges')}
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  <X size={16} />
                  {t('settings.profile.cancel')}
                </Button>
              </ButtonGroup>
            </Form>
          </CleanCard>

          {currentManager.role !== 'committee_member' && (
            <CleanCard>
              <CardTitle>{t('myProgress.title')}</CardTitle>
              <CardSubtitle>{t('myProgress.subtitle', 'Your workload, goals, and KPI progress')}</CardSubtitle>
              <ProfileProgressWrapper>
                <MyProgressContent embedded showProfileSummary={false} />
              </ProfileProgressWrapper>
            </CleanCard>
          )}
          </AnimatedTabContent>
        )}

        {activeTab === 'organization' && (
          <AnimatedTabContent key="organization">
            <CleanCard>
            <CardTitle>{t('settings.fund.title')}</CardTitle>
            <CardSubtitle>{t('settings.fund.subtitle')}</CardSubtitle>

            <OrgLogoSection>
              {orgLogoUrl && !orgLogoError ? (
                <OrgLogo src={orgLogoUrl} alt={organization?.name || t('settings.fund.organizationAlt', 'Organization')} onError={() => setOrgLogoError(true)} />
              ) : (
                <OrgLogoPlaceholder>
                  {organization?.name?.charAt(0)?.toUpperCase() || 'F'}
                </OrgLogoPlaceholder>
              )}
              <AvatarInfo>
                <AvatarTitle>{t('settings.fund.logo')}</AvatarTitle>
                <AvatarDescription>
                  {t('settings.fund.logoDesc')}
                </AvatarDescription>
                <AvatarDescription style={{ marginTop: '6px' }}>
                  {t('settings.fund.logoDimensions', 'Recommended: 320×80 px (4:1), transparent background. Displayed up to 160×40 px in the iframe. PNG, JPEG, or WebP, up to 5 MB.')}
                </AvatarDescription>
                <Button variant="outline" size="sm" style={{ marginTop: '12px' }} onClick={() => orgLogoInputRef.current?.click()}>
                  <Camera size={14} />
                  {t('settings.fund.uploadLogo')}
                </Button>
                <input
                  ref={orgLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleOrgLogoChange}
                  style={{ display: 'none' }}
                />
              </AvatarInfo>
            </OrgLogoSection>

            <Form onSubmit={handleOrgSubmit}>
              <Input
                label={t('settings.fund.fundName')}
                value={orgFormData.name}
                onChange={handleOrgInputChange('name')}
                required
              />

              <CustomSelectWrapper>
                <CustomSelectLabel>{t('settings.fund.companySize')}</CustomSelectLabel>
                <CustomSelectTrigger
                  type="button"
                  $isOpen={isCompanySizeDropdownOpen}
                  onClick={() => setIsCompanySizeDropdownOpen(!isCompanySizeDropdownOpen)}
                >
                  {orgFormData.companySize
                    ? t(`settings.fund.companySizeOptions.${orgFormData.companySize}`)
                    : t('settings.fund.selectCompanySize')}
                  <ChevronDown />
                </CustomSelectTrigger>
                <CustomSelectDropdown $isOpen={isCompanySizeDropdownOpen}>
                  {COMPANY_SIZE_OPTIONS.map((option) => (
                    <CustomSelectOption
                      key={option.value}
                      type="button"
                      $isSelected={orgFormData.companySize === option.value}
                      onClick={() => {
                        setOrgFormData(prev => ({ ...prev, companySize: option.value }));
                        setIsCompanySizeDropdownOpen(false);
                      }}
                    >
                      <Check />
                      {t(`settings.fund.companySizeOptions.${option.value}`)}
                    </CustomSelectOption>
                  ))}
                </CustomSelectDropdown>
              </CustomSelectWrapper>

              <FormRow>
                <Input
                  label={t('settings.fund.website')}
                  type="url"
                  value={orgFormData.website}
                  onChange={handleOrgInputChange('website')}
                  placeholder={t('settings.fund.websitePlaceholder')}
                />
                <Input
                  label={t('settings.fund.companyEmail')}
                  type="email"
                  value={orgFormData.email}
                  onChange={handleOrgInputChange('email')}
                  placeholder={t('settings.fund.companyEmailPlaceholder')}
                />
              </FormRow>

              <Input
                label={t('settings.fund.officeAddress')}
                value={orgFormData.address}
                onChange={handleOrgInputChange('address')}
                placeholder={t('settings.fund.officeAddressPlaceholder')}
              />

              <div>
                <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                  {t('settings.fund.about')}
                </label>
                <textarea
                  value={orgFormData.description}
                  onChange={handleOrgInputChange('description')}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  placeholder={t('settings.fund.aboutPlaceholder')}
                />
              </div>

              <IframeBrandingCard aria-labelledby="iframe-branding-title">
                <AvatarTitle id="iframe-branding-title">
                  {t('settings.fund.iframeBranding', 'Iframe appearance')}
                </AvatarTitle>
                <AvatarDescription>
                  {t('settings.fund.iframeBrandingDesc', 'The fund logo appears next to FundGate, and the main color is used for buttons, links, and focus states.')}
                </AvatarDescription>
                <IframeBrandingGrid>
                  <div>
                    <label htmlFor="iframe-primary-color" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                      {t('settings.fund.iframePrimaryColor', 'Primary color')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="iframe-primary-color"
                        type="color"
                        value={/^#[0-9A-Fa-f]{6}$/.test(iframePrimaryColor) ? iframePrimaryColor : '#8CC63F'}
                        onChange={(event) => setIframePrimaryColor(event.target.value.toUpperCase())}
                        style={{ width: '48px', height: '42px', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}
                        aria-label={t('settings.fund.iframePrimaryColor', 'Primary color')}
                      />
                      <input
                        type="text"
                        value={iframePrimaryColor}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase();
                          if (/^#[0-9A-F]{0,6}$/.test(value)) setIframePrimaryColor(value);
                        }}
                        maxLength={7}
                        pattern="^#[0-9A-Fa-f]{6}$"
                        aria-label={t('settings.fund.iframePrimaryColorHex', 'Primary color HEX code')}
                        style={{ width: '100%', minWidth: 0, padding: '11px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="iframe-theme" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                      {t('settings.fund.iframeTheme', 'Theme')}
                    </label>
                    <select
                      id="iframe-theme"
                      value={iframeTheme}
                      onChange={(event) => setIframeTheme(event.target.value as 'light' | 'dark' | 'auto')}
                      style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      <option value="auto">{t('settings.fund.iframeThemeAuto', 'Match device')}</option>
                      <option value="light">{t('settings.fund.iframeThemeLight', 'Light')}</option>
                      <option value="dark">{t('settings.fund.iframeThemeDark', 'Dark')}</option>
                    </select>
                  </div>
                </IframeBrandingGrid>
                <BrandingPreview aria-label={t('settings.fund.iframePreview', 'Iframe header preview')}>
                  <strong style={{ color: /^#[0-9A-Fa-f]{6}$/.test(iframePrimaryColor) ? iframePrimaryColor : '#8CC63F' }}>FundGate</strong>
                  <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>×</span>
                  {orgLogoUrl && !orgLogoError ? (
                    <CrmImage src={orgLogoUrl} alt={organization?.name || t('settings.fund.logo')} onError={() => setOrgLogoError(true)} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{organization?.name || t('settings.fund.logo')}</span>
                  )}
                </BrandingPreview>
              </IframeBrandingCard>

              <ButtonGroup>
                <Button type="submit" disabled={isSavingOrg}>
                  {isSavingOrg ? <ButtonSpinner size={16} /> : <Save size={16} />}
                  {isSavingOrg ? t('settings.profile.saving') : t('settings.profile.saveChanges')}
                </Button>
                <Button type="button" variant="ghost" onClick={handleOrgCancel} disabled={isSavingOrg}>
                  <X size={16} />
                  {t('settings.profile.cancel')}
                </Button>
              </ButtonGroup>
            </Form>
          </CleanCard>
          </AnimatedTabContent>
        )}

        {activeTab === 'team' && (
          <AnimatedTabContent key="team">
            <CleanCard>
              <CardTitle>{t('settings.team.title')}</CardTitle>
              <CardSubtitle>{t('settings.team.subtitle')}</CardSubtitle>

              {isDirectorRole(currentManager?.role) && (
                <InvitationSection>
                  <SectionTitle>
                    <UserPlus />
                    {t('settings.team.createAccounts')}
                  </SectionTitle>

                  <SlotsIndicator>
                    <SlotsText>
                      <div className="slots-title">{t('settings.team.availableSlots')}</div>
                      <div className="slots-count">{t('settings.team.slotsUsed', { used: usedSlots, total: MAX_TEAM_SLOTS })}</div>
                    </SlotsText>
                    <SlotsBar>
                      <SlotsFill $percent={Math.min(100, (usedSlots / MAX_TEAM_SLOTS) * 100)} />
                    </SlotsBar>
                  </SlotsIndicator>

                  {availableSlots > 0 ? (
                    !showCreateForm ? (
                      <Button onClick={() => setShowCreateForm(true)}>
                        <Plus size={16} />
                        {t('settings.team.createAccount')}
                      </Button>
                    ) : (
                      <CreateAccountForm>
                        <FormGrid>
                          <Input
                            label={t('settings.team.fullNameRequired')}
                            value={newAccountData.name}
                            onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('settings.team.fullNamePlaceholder')}
                          />
                          <Input
                            label={t('settings.team.loginRequired')}
                            value={newAccountData.login}
                            onChange={(e) => setNewAccountData(prev => ({ ...prev, login: e.target.value }))}
                            placeholder={t('settings.team.loginPlaceholder')}
                          />
                        </FormGrid>
                        <FormGrid>
                          <Input
                            label="Email"
                            type="email"
                            value={newAccountData.email}
                            onChange={(e) => setNewAccountData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder={t('settings.team.emailPlaceholder')}
                          />
                          <Input
                            label={t('settings.profile.phone')}
                            value={newAccountData.phone}
                            onChange={(e) => setNewAccountData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder={t('settings.team.phonePlaceholder')}
                          />
                        </FormGrid>
                        <div>
                          <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                            {t('settings.team.roleRequired')}
                          </label>
                          <CustomSelectWrapper>
                            <CustomSelectTrigger
                              type="button"
                              $isOpen={isNewAccountRoleDropdownOpen}
                              onClick={() => setIsNewAccountRoleDropdownOpen(!isNewAccountRoleDropdownOpen)}
                            >
                              {t(`roles.${newAccountData.role}`, newAccountData.role)}
                              <ChevronDown />
                            </CustomSelectTrigger>
                            <CustomSelectDropdown $isOpen={isNewAccountRoleDropdownOpen}>
                              {getAvailableRoles().map(role => (
                                <CustomSelectOption
                                  key={role}
                                  type="button"
                                  $isSelected={newAccountData.role === role}
                                  onClick={() => {
                                    setNewAccountData(prev => ({ ...prev, role }));
                                    setIsNewAccountRoleDropdownOpen(false);
                                  }}
                                >
                                  <Check />
                                  {t(`roles.${role}`, role)}
                                </CustomSelectOption>
                              ))}
                            </CustomSelectDropdown>
                          </CustomSelectWrapper>
                        </div>

                        {createdCredentials && (
                          <CredentialsBox>
                            <div className="credentials-title">
                              <Check size={18} />
                              {t('settings.team.accountCreated')}
                            </div>
                            <div className="credential-item">
                              <label>{t('settings.team.loginLabel')}</label>
                              <code>{createdCredentials.login}</code>
                            </div>
                            <div className="credential-item">
                              <label>{t('settings.team.passwordLabel')}</label>
                              <code>{createdCredentials.password}</code>
                            </div>
                          </CredentialsBox>
                        )}

                        <ButtonGroup style={{ marginTop: '16px' }}>
                          <Button onClick={handleCreateAccount} disabled={isCreatingAccount || !newAccountData.name || !newAccountData.login}>
                            {isCreatingAccount ? <ButtonSpinner size={16} /> : <UserPlus size={16} />}
                            {isCreatingAccount ? t('settings.team.creating') : t('settings.team.create')}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowCreateForm(false);
                              setCreatedCredentials(null);
                              setNewAccountData({
                                name: '',
                                login: '',
                                email: '',
                                role: 'manager_investment',
                                phone: '',
                                position: '',
                              });
                            }}
                          >
                            <X size={16} />
                            {t('settings.team.cancel')}
                          </Button>
                        </ButtonGroup>
                      </CreateAccountForm>
                    )
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-warning)', fontSize: '14px' }}>
                      <AlertCircle size={16} />
                      {t('settings.team.allSlotsUsed')}
                    </div>
                  )}
                </InvitationSection>
              )}

              {isDirectorRole(currentManager?.role) && pendingRegistrations.length > 0 && (
                <InvitationSection>
                  <SectionTitle>
                    <UserCheck />
                    {t('settings.team.pendingRegistrations')} ({pendingRegistrations.length})
                  </SectionTitle>
                  {pendingRegistrations.map((registration) => (
                    <PendingCard key={registration.id}>
                      <MemberAvatar>
                        <User />
                      </MemberAvatar>
                      <PendingInfo>
                        <PendingName>{registration.name}</PendingName>
                        <PendingEmail>
                          <Mail size={14} />
                          {registration.email}
                        </PendingEmail>
                      </PendingInfo>
                      <Badge variant="info">
                        {t(`roles.${registration.role}`, registration.role)}
                      </Badge>
                      <PendingActions>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(registration.id)}
                          disabled={approvingId === registration.id}
                        >
                          {approvingId === registration.id ? (
                            <ButtonSpinner size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                          {approvingId === registration.id
                            ? t('settings.team.approving')
                            : t('settings.team.approve')
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(registration.id)}
                          disabled={rejectingId === registration.id}
                          style={{ color: 'var(--status-danger)' }}
                        >
                          {rejectingId === registration.id ? (
                            <ButtonSpinner size={14} />
                          ) : (
                            <UserX size={14} />
                          )}
                          {t('settings.team.reject')}
                        </Button>
                      </PendingActions>
                    </PendingCard>
                  ))}
                </InvitationSection>
              )}


              {invitations.length > 0 && (
                <InvitationSection>
                  <SectionTitle>
                    <Clock />
                    {t('settings.team.activeInvitations')} ({invitations.length})
                  </SectionTitle>
                  {invitations.map((invitation) => (
                    <InvitationCard key={invitation.id}>
                      <InvitationInfo>
                        <Badge variant={invitation.isExpired ? 'warning' : 'success'}>
                          {invitation.isExpired
                            ? t('settings.team.expired')
                            : t(`roles.${invitation.role}`, invitation.role)
                          }
                        </Badge>
                        <InvitationMeta>
                          {t('settings.team.createdBy')}: {invitation.createdByName}
                        </InvitationMeta>
                        {invitation.expiresAt && !invitation.isExpired && (
                          <InvitationMeta>
                            <Clock />
                            {t('settings.team.expiresAt')}: {formatShortDate(new Date(invitation.expiresAt))}
                          </InvitationMeta>
                        )}
                      </InvitationInfo>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivateInvitation(invitation.id)}
                      >
                        <Trash2 size={14} />
                        {t('settings.team.deactivate')}
                      </Button>
                    </InvitationCard>
                  ))}
                </InvitationSection>
              )}

              <SectionTitle>
                <Users />
                {t('settings.team.title')} ({managers.length})
              </SectionTitle>
              <TeamMembersList>
                {managers.map((member) => (
                  <TeamMemberCard key={member.id}>
                    <MemberAvatar>
                      {member.avatar && !memberAvatarErrors[member.id] ? (
                        <CrmImage src={member.avatar} alt={member.name} onError={() => setMemberAvatarErrors(prev => ({ ...prev, [member.id]: true }))} />
                      ) : (
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </MemberAvatar>
                    <MemberInfo>
                      <MemberName>{member.name}</MemberName>
                      <MemberEmail>
                        <Mail />
                        {member.email || t('settings.team.noEmail', 'No email')}
                      </MemberEmail>
                    </MemberInfo>
                    <Badge variant={member.role === 'ceo' ? 'primary' : 'neutral'}>
                      {t(`roles.${member.role}`, member.role)}
                    </Badge>
                    <MemberActions>
                      {member.role !== 'ceo' && (
                        <Button variant="outline" size="sm" onClick={() => handleEditMember(member)}>
                          {t('settings.team.edit')}
                        </Button>
                      )}
                      {member.role !== 'ceo' && isDirectorRole(currentManager?.role) && (
                        <Button variant="ghost" size="sm" onClick={async () => {
                          if (confirm(t('settings.team.confirmDelete', { name: member.name }))) {
                            try {
                              await teamApi.delete(member.id);
                              setManagers(prev => prev.filter(m => m.id !== member.id));
                            } catch (e) { console.error(e); }
                          }
                        }}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </MemberActions>
                  </TeamMemberCard>
                ))}
              </TeamMembersList>
            </CleanCard>
          </AnimatedTabContent>
        )}

        {activeTab === 'security' && (
          <AnimatedTabContent key="security">
            <CleanCard>
              <CardTitle>{t('settings.security.title')}</CardTitle>
              <CardSubtitle>{t('settings.security.subtitle')}</CardSubtitle>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <SecurityOption>
                  <SecurityTitle>
                    <Key size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {t('settings.security.changePassword')}
                  </SecurityTitle>
                  <SecurityDescription>
                    {t('settings.security.changePasswordDesc')}
                  </SecurityDescription>

                  {!showPasswordSection ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordSection(true)}
                      style={{ marginTop: '12px' }}
                    >
                      <Key size={14} />
                      {t('settings.security.changePasswordButton')}
                    </Button>
                  ) : (
                    <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                          {t('settings.security.currentPassword')}
                        </label>
                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            placeholder={t('settings.security.currentPasswordPlaceholder')}
                            style={{
                              width: '100%',
                              padding: '10px 40px 10px 12px',
                              fontSize: '14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '4px',
                            }}
                          >
                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                          {t('settings.security.newPassword')}
                        </label>
                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('settings.security.newPasswordPlaceholder')}
                            style={{
                              width: '100%',
                              padding: '10px 40px 10px 12px',
                              fontSize: '14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '4px',
                            }}
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                          {t('settings.security.confirmNewPassword')}
                        </label>
                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('settings.security.confirmNewPasswordPlaceholder')}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              fontSize: '14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-primary)',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {passwordError && (
                        <div style={{ color: 'var(--status-danger)', fontSize: '14px', marginBottom: '12px' }}>
                          {passwordError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleChangePassword}
                          disabled={isChangingPassword || !newPassword}
                        >
                          {isChangingPassword ? <ButtonSpinner size={14} /> : <Save size={14} />}
                          {isChangingPassword ? t('settings.security.saving') : t('settings.security.save')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPasswordSection(false);
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                            setShowCurrentPassword(false);
                            setShowNewPassword(false);
                          }}
                        >
                          {t('settings.security.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </SecurityOption>

              </div>
            </CleanCard>
          </AnimatedTabContent>
        )}

        {activeTab === 'app' && (
          <AnimatedTabContent key="app">
            <CleanCard>
              <CardTitle>{t('settings.app.title', 'Application Settings')}</CardTitle>
              <CardSubtitle>
                {t('settings.app.subtitle', 'Manage interface preferences and account actions')}
              </CardSubtitle>

              <AppSettingsList>
                <AppSettingRow>
                  <AppSettingIcon>
                    {isLightMode ? <Sun /> : <Moon />}
                  </AppSettingIcon>
                  <AppSettingContent>
                    <AppSettingTitle>{t('settings.theme')}</AppSettingTitle>
                    <AppSettingDescription>
                      {t('settings.app.themeDescription', 'Switch between light and dark interface mode')}
                    </AppSettingDescription>
                  </AppSettingContent>
                  <AppSettingAction>
                    <Button type="button" variant="outline" size="sm" onClick={toggleMode}>
                      {isLightMode ? <Sun size={16} /> : <Moon size={16} />}
                      {themeLabel}
                    </Button>
                  </AppSettingAction>
                </AppSettingRow>

                <AppSettingRow>
                  <AppSettingIcon>
                    <SettingsIcon />
                  </AppSettingIcon>
                  <AppSettingContent>
                    <AppSettingTitle>{t('settings.language', 'Language')}</AppSettingTitle>
                    <AppSettingDescription>
                      {t('settings.app.languageDescription', 'Choose the CRM interface language')}
                    </AppSettingDescription>
                  </AppSettingContent>
                  <AppSettingAction>
                    <LanguageSelector />
                  </AppSettingAction>
                </AppSettingRow>

                <AppSettingRow $danger>
                  <AppSettingIcon $danger>
                    <LogOut />
                  </AppSettingIcon>
                  <AppSettingContent>
                    <AppSettingTitle>{t('nav.logout')}</AppSettingTitle>
                    <AppSettingDescription>
                      {t('settings.app.logoutDescription', 'End the current session on this device')}
                    </AppSettingDescription>
                  </AppSettingContent>
                  <AppSettingAction>
                    <Button type="button" variant="danger" size="sm" onClick={handleLogout}>
                      <LogOut size={16} />
                      {t('nav.logout')}
                    </Button>
                  </AppSettingAction>
                </AppSettingRow>
              </AppSettingsList>
            </CleanCard>
          </AnimatedTabContent>
        )}
      </ContentGrid>

      {editingMember && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '16px',
        }} onClick={() => setEditingMember(null)}>
          <div style={{
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t('settings.team.edit')} — {editingMember.name}</h3>
              <button onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '14px', color: '#999' }}>{t('settings.profile.name')}</label>
              <input value={editMemberData.name} onChange={e => setEditMemberData(d => ({ ...d, name: e.target.value }))}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none' }} />
              <label style={{ fontSize: '14px', color: '#999' }}>Email</label>
              <input value={editMemberData.email} onChange={e => setEditMemberData(d => ({ ...d, email: e.target.value }))}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none' }} />
              <label style={{ fontSize: '14px', color: '#999' }}>{t('settings.profile.phone')}</label>
              <input value={editMemberData.phone} onChange={e => setEditMemberData(d => ({ ...d, phone: e.target.value }))}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none' }} />
              <label style={{ fontSize: '14px', color: '#999' }}>{t('settings.team.role')}</label>
              <CustomSelectWrapper>
                <CustomSelectTrigger
                  type="button"
                  $isOpen={isEditMemberRoleDropdownOpen}
                  onClick={() => setIsEditMemberRoleDropdownOpen(!isEditMemberRoleDropdownOpen)}
                >
                  {t(`roles.${editMemberData.role}`, editMemberData.role)}
                  <ChevronDown />
                </CustomSelectTrigger>
                <CustomSelectDropdown $isOpen={isEditMemberRoleDropdownOpen}>
                  {getAvailableRoles().map(role => (
                    <CustomSelectOption
                      key={role}
                      type="button"
                      $isSelected={editMemberData.role === role}
                      onClick={() => {
                        setEditMemberData(d => ({ ...d, role }));
                        setIsEditMemberRoleDropdownOpen(false);
                      }}
                    >
                      <Check />
                      {t(`roles.${role}`, role)}
                    </CustomSelectOption>
                  ))}
                </CustomSelectDropdown>
              </CustomSelectWrapper>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <Button variant="outline" onClick={() => setEditingMember(null)} style={{ flex: 1 }}>{t('settings.team.cancel')}</Button>
                <Button onClick={handleSaveMember} disabled={isSavingMember} style={{ flex: 1 }}>
                  {isSavingMember ? '...' : t('settings.team.save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Settings;
