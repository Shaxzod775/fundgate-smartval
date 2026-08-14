import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';
import { Card, CardTitle, CardSubtitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StartupLogo } from '../../components/ui/StartupLogo';
import { cabinetApi, openCrmFile, safeCrmFileHref, startupsApi, Startup as ApiStartup, ActivityLogEntry, type QuarterlyReport, type StartupMaterialField } from '../../services/api';
import { markSeenLocally } from '../../utils/unreadComments';
import { sanitizeHtml, sanitizeInline } from '../../utils/sanitize';
import { stageLabels } from '../../utils/mockData';
import { InteractionLogSection } from './components/InteractionLogSection';
import { fieldLabel, formatValue } from '../../utils/fieldLabels';
import { ArrowLeft, TrendingUp, DollarSign, Users, Calendar, Loader2, User, Globe, Mail, Phone, FileText, ExternalLink, Download, Briefcase, Building2, Code, Video, Linkedin, UserPlus, Plus, Trash2, Upload, BarChart3, X, ChevronDown, Pencil, Save, XCircle, Search, Lock, ChevronRight, History, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { FinallyBlockModal } from './components/FinallyBlockModal';
import { PageTransition } from '../../styles/animations';
import { StartupStatus, Startup, FounderDetails, TeamMember as TeamMemberType, InvestmentRound, FileUrls, Materials } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';
import { MetricsSection as PortfolioMetricsSection } from '../Portfolio/components/MetricsSection';
import { CUSTOMER_SEGMENTS, COUNTRIES_EN, FOUNDER_ROLES, INDUSTRIES, REVENUE_MODELS, STAGES, USER_COUNT_RANGES, VALUE_DELIVERY_MODELS } from '../Startups/components/AddStartupWizard/constants';
import { DocumentRequestsPanel } from '../Startups/components/DocumentRequestsPanel';
import { StartupRoadmapPanel } from '../Startups/components/StartupRoadmapPanel';
import { formatStartupStatusLabel } from '../../utils/startupStatusDisplay';
import { QuarterlyMetricsCharts } from '../../components/charts/QuarterlyMetricsCharts';
import { safeExternalHref } from '../../utils/safeUrl';
import { formatShortDate, formatShortDateTime } from '../../utils/formatDate';
import { numberLocale } from '../../utils/formatNumber';
import { getStartupAnalysisDisplay } from '../../utils/analysisDisplay';
import { canEditStartupDataRoomLink } from '../../utils/startupDataRoom';
import { DataRoomLinkCard } from '../Startups/components/DataRoomLinkCard';
import { formatSmartValValuation, normalizeSmartValDetails } from '../../utils/smartValValuation';
import {
  isAllowedDocumentUpload,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from '../../utils/documentUploadPolicy';
import { CrmImage } from '../../components/ui/CrmImage';

const PageContainer = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
  padding-top: 100px; /* Compensate for fixed header */
  overflow-wrap: break-word;
  word-break: break-word;
  ${PageTransition}

  @media (max-width: 1180px) {
    max-width: 100%;
  }

  @media (max-width: 640px) {
    padding: ${({ theme }) => theme.spacing[4]};
    padding-top: 80px;
  }
`;

const BackButton = styled(Button)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 640px) {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 640px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing[4]};
    margin-bottom: ${({ theme }) => theme.spacing[5]};
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const CompanyName = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes['xl']};
  }
`;

const Industry = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    margin-bottom: ${({ theme }) => theme.spacing[3]};
  }
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AssignedManagerSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const AssignedManagerLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

const ManagerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ManagerAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 2px solid ${({ theme }) => theme.colors.accent.primary};
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
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ManagerName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

const FinallyBlockedPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: ${({ theme }) => theme.colors.status.danger};
  border: 1px solid rgba(239, 68, 68, 0.35);
  font-size: 12px;
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const HistoryRow = styled.button<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  svg.chevron {
    width: 14px;
    height: 14px;
    transition: transform 0.2s;
    transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0deg')});
    flex-shrink: 0;
  }
`;

const HistoryMeta = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  margin-left: auto;
`;

const HistoryPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const HistoryPanelGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const HistoryPanelColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HistoryPanelColumnTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 4px;
`;

const HistoryPanelPre = styled.pre`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: ${({ theme }) => theme.spacing[3]};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow: auto;
  margin: 0;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 640px) {
    gap: ${({ theme }) => theme.spacing[4]};
  }
`;

const SidebarColumn = styled.div`
  @media (max-width: 1024px) {
    order: -1;
  }
`;

const MainColumn = styled.div``;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 640px) {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.primary};

  @media (max-width: 640px) {
    font-size: ${({ theme }) => theme.fontSizes.lg};
    padding-bottom: ${({ theme }) => theme.spacing[2]};
    margin-bottom: ${({ theme }) => theme.spacing[3]};
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const DetailItem = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const DetailLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const DetailValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CrossFundApplicationItem = styled(DetailItem)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const CrossFundOrganization = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const CrossFundStatusPill = styled.span`
  flex-shrink: 0;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.28);
  background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)')};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const CrossFundCommitment = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`;

const CrossFundAmount = styled.strong`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 800;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  white-space: pre-line;
`;

const DescriptionWrapper = styled.div<{ $collapsed: boolean; $maxHeight: number }>`
  position: relative;
  max-height: ${({ $collapsed, $maxHeight }) => $collapsed ? `${$maxHeight}px` : 'none'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const DescriptionFade = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, ${({ theme }) => theme.colors.bg.primary});
  pointer-events: none;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  &:hover { opacity: 0.8; }
  svg {
    transition: transform 0.2s;
  }
  &[data-expanded='true'] svg {
    transform: rotate(180deg);
  }
`;

const ScoreCard = styled(Card)`
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border-color: ${({ theme }) => theme.colors.accent.primary};
  text-align: center;
`;

const PitchDeckStatus = styled.div<{ $ready: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  padding: 9px 10px;
  border: 1px solid ${({ $ready, theme }) => {
    if ($ready) return theme.mode === 'light' ? 'rgba(4, 120, 87, 0.28)' : 'rgba(16, 185, 129, 0.35)';
    return theme.mode === 'light' ? 'rgba(185, 28, 28, 0.3)' : 'rgba(252, 165, 165, 0.35)';
  }};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $ready, theme }) => {
    if ($ready) return theme.mode === 'light' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.12)';
    return theme.mode === 'light' ? 'rgba(254, 226, 226, 0.75)' : 'rgba(239, 68, 68, 0.10)';
  }};
  color: ${({ $ready, theme }) => {
    if ($ready) return theme.mode === 'light' ? '#047857' : '#86efac';
    return theme.mode === 'light' ? '#991b1b' : '#fca5a5';
  }};
  font-size: 12px;
  font-weight: 700;
`;

const PitchDeckActions = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 10px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const InvestmentCard = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 640px) {
    padding: 14px 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
`;

const InvestmentLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const InvestmentValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'light' ? '#047857' : '#ffffff')};
  text-shadow: ${({ theme }) => (theme.mode === 'light' ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.25)')};

  @media (max-width: 640px) {
    font-size: 24px;
  }
`;

const InvestmentBadge = styled.div`
  background: #10b981;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const ScoreValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin: ${({ theme }) => theme.spacing[4]} 0;

  @media (max-width: 640px) {
    font-size: 28px;
    margin: ${({ theme }) => theme.spacing[3]} 0;
  }
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

const ListItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  &::marker {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const AnalysisText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ScoreBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const ScoreBarLabel = styled.div`
  width: 80px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ScoreBarTrack = styled.div`
  flex: 1;
  height: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 4px;
  overflow: hidden;
`;

const ScoreBarFill = styled.div<{ $width: number; $color?: string }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color || '#10b981'};
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const ScoreBarValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 32px;
  text-align: right;
`;

const RecommendationCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 16px;
  margin-bottom: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const SubSectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 12px;
  margin-top: 20px;
`;

const ActivitySection = styled(Section)`
  margin-top: ${({ theme }) => theme.spacing[8]};
`;

const CommentInput = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CommentAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentPlaceholder = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  outline: none;
  cursor: text;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const Timeline = styled.div`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.colors.border.secondary};
  }
`;

const TimelineItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
  position: relative;
`;

const TimelineAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  overflow: hidden;
  flex-shrink: 0;
  z-index: 1;
  border: 2px solid ${({ theme }) => theme.colors.bg.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TimelineContent = styled.div`
  flex: 1;
  padding-top: 2px;
`;

const TimelineText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.5;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
  }

  a, .highlight {
    color: ${({ theme }) => theme.colors.status.success};
    font-weight: 500;
    text-decoration: none;
  }

  .amount {
    color: ${({ theme }) => theme.colors.status.success};
    font-weight: 600;
  }
`;

const TimelineQuote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
  margin: ${({ theme }) => theme.spacing[2]} 0 0 0;
`;

const CommentChatWindow = styled.div`
  background: ${({ theme }) => theme.colors.bg.cardHover};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  max-height: 560px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ChatRow = styled.div<{ $sender: 'founder' | 'manager' }>`
  display: flex;
  flex-direction: ${({ $sender }) => ($sender === 'manager' ? 'row-reverse' : 'row')};
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
`;

const ChatAvatar = styled.div<{ $sender: 'founder' | 'manager' }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#10b981' : theme.colors.bg.cardHover};
  border: 1px solid
    ${({ $sender, theme }) =>
      $sender === 'manager' ? '#10b981' : theme.colors.border.secondary};
  color: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#ffffff' : theme.colors.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
`;

const ChatBubbleColumn = styled.div<{ $sender: 'founder' | 'manager' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $sender }) => ($sender === 'manager' ? 'flex-end' : 'flex-start')};
  gap: 4px;
  max-width: 70%;
  min-width: 0;
`;

const ChatBubble = styled.div<{ $sender: 'founder' | 'manager'; $unread?: boolean }>`
  position: relative;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: 16px;
  word-break: break-word;

  background: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#10b981' : theme.colors.bg.primary};
  color: ${({ $sender, theme }) =>
    $sender === 'manager' ? '#ffffff' : theme.colors.text.primary};
  border: ${({ $sender, theme }) =>
    $sender === 'manager' ? 'none' : `1px solid ${theme.colors.border.primary}`};
  ${({ $sender }) =>
    $sender === 'manager'
      ? 'border-bottom-right-radius: 4px;'
      : 'border-bottom-left-radius: 4px;'}

  ${({ $unread }) =>
    $unread &&
    `
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.55);
    animation: unread-glow 1.8s ease-in-out infinite;

    @keyframes unread-glow {
      0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.55); }
      50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18); }
    }
  `}
`;

const ChatSenderTag = styled.div<{ $sender: 'founder' | 'manager' }>`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
  color: ${({ $sender, theme }) =>
    $sender === 'manager' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ChatBubbleText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;
  white-space: pre-wrap;
`;

const ChatTimestamp = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 0 4px;
`;

const CommentSenderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  flex-wrap: wrap;
`;

const CommentSenderLabel = styled.span<{ $sender: 'founder' | 'manager' }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  color: ${({ $sender }) => ($sender === 'founder' ? '#6366f1' : '#10b981')};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const NewCommentPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CommentBody = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
`;

const FieldChangesList = styled.ul`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing[2]} 0 0 0;
  padding-left: ${({ theme }) => theme.spacing[4]};
  list-style: disc;

  li {
    margin-bottom: ${({ theme }) => theme.spacing[1]};
    line-height: 1.4;
    word-break: break-word;
  }

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TimelineDate = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};

  svg {
    color: ${({ theme }) => theme.colors.accent.primary};
    flex-shrink: 0;
  }
`;

const ContactLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 2px;
`;

const ContactValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;

  a {
    color: ${({ theme }) => theme.colors.accent.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const PitchDeckButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  margin-top: ${({ theme }) => theme.spacing[3]};

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primary};
    color: white;
  }
`;

const FileButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryLight};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    flex-shrink: 0;
  }
`;

const FilesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const TeamMemberCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const TeamMemberName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const TeamMemberRole = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TeamMemberBio = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
`;

const TeamMemberEmail = styled.a`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.accent.primary};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: ${({ theme }) => theme.spacing[2]};

  &:hover {
    text-decoration: underline;
  }
`;

const InvestmentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const InvestmentItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const InvestmentInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const InvestmentName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const InvestmentMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const InvestmentAmount = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.status.success};
`;

const InfoBlock = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const InfoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const InfoValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
`;

const ExpandableTextWrap = styled.div`
  min-width: 0;
`;

const ExpandableTextClamp = styled.div<{ $clamped: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
  ${({ $clamped }) => $clamped && `
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const ExpandableToggle = styled.button`
  margin-top: ${({ theme }) => theme.spacing[2]};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.accent.primary};
  &:hover { text-decoration: underline; }
`;

const ExpandableText = ({ children }: { children?: React.ReactNode }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const prev = el.style.cssText;
      el.style.cssText = '';
      const full = el.scrollHeight;
      el.style.cssText = prev;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22;
      setOverflows(full > lineHeight * 5 + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <ExpandableTextWrap>
      <ExpandableTextClamp ref={ref} $clamped={overflows && !expanded}>
        {children}
      </ExpandableTextClamp>
      {overflows && (
        <ExpandableToggle type="button" onClick={() => setExpanded(v => !v)}>
          {expanded ? t('common.showLess') : t('common.showMore')}
        </ExpandableToggle>
      )}
    </ExpandableTextWrap>
  );
};

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

const MetricsSection = styled.div`
  margin-top: 16px;
`;

const MetricRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.md};
  margin-bottom: 8px;
`;

const MetricName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 120px;
`;

const MetricValues = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
`;

const MetricChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetricTrend = styled.span<{ $positive: boolean }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $positive }) => $positive ? '#10b981' : '#ef4444'};
  margin-left: 4px;
`;

const AddMetricForm = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const MetricInput = styled.input`
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  min-width: 0;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SmallButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  white-space: nowrap;

  ${({ $variant }) => $variant === 'danger' ? `
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    &:hover { background: rgba(239, 68, 68, 0.2); }
  ` : `
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    &:hover { background: rgba(16, 185, 129, 0.25); }
  `}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const AddValueInput = styled.input`
  padding: 4px 8px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  width: 80px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const PeriodInput = styled.input`
  padding: 4px 8px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  width: 100px;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const DocumentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 12px;
`;

const DocumentCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary}40;
  }
`;

const DocumentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DocumentName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DocumentDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const DocumentType = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.primary}15;
  padding: 2px 6px;
  border-radius: 4px;
`;

const UploadArea = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 2px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: all 0.2s;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  min-height: 80px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  svg {
    width: 24px;
    height: 24px;
  }

  input {
    display: none;
  }
`;

const EditableInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primaryHover};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent.primary}33;
  }

  /* Hide number input spinners */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const EditableTextarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primaryHover};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent.primary}33;
  }

  option {
    background: #000;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const EditableSelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primaryHover};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent.primary}33;
  }
`;

const DropdownWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const DropdownTrigger = styled.button<{ $autoWidth?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: ${({ $autoWidth }) => $autoWidth ? 'auto' : '100%'};
  min-width: ${({ $autoWidth }) => $autoWidth ? '120px' : 'unset'};
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
    transition: transform 0.2s;
  }
`;

const DropdownMenu = styled.div<{ $maxHeight?: number }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  max-height: ${({ $maxHeight }) => $maxHeight || 230}px;
  overflow-y: auto;
  background: #000;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  z-index: 100;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const DropdownOption = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: ${({ $active, theme }) => $active ? theme.colors.accent.primary + '20' : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accent.primary : theme.colors.text.primary};
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const DropdownSearch = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

interface DropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  autoWidth?: boolean;
  style?: React.CSSProperties;
}

const CustomDropdown = ({ value, options, onChange, placeholder = '—', searchable = false, autoWidth = false, style }: DropdownProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <DropdownWrapper ref={ref} style={style}>
      <DropdownTrigger
        type="button"
        $autoWidth={autoWidth}
        onClick={() => { setOpen(!open); setSearch(''); }}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </DropdownTrigger>
      {open && (
        <DropdownMenu $maxHeight={searchable ? 260 : 220}>
          {searchable && (
            <DropdownSearch
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.searchPlaceholder', 'Поиск...')}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {filtered.map(opt => (
            <DropdownOption
              key={opt.value}
              type="button"
              $active={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setSearch('');
              }}
            >
              {opt.label}
            </DropdownOption>
          ))}
        </DropdownMenu>
      )}
    </DropdownWrapper>
  );
};

const EditButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: ${({ theme }) => theme.colors.accent.primary};
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
  }

  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const EditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const StickyEditBar = styled.div`
  position: sticky;
  bottom: 18px;
  z-index: 40;
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding: 12px 14px;
  background: rgba(17, 24, 39, 0.96);
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  backdrop-filter: blur(12px);

  @media (max-width: 640px) {
    bottom: 10px;
    align-items: stretch;
    flex-direction: column;
  }
`;

const StickyEditInfo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 500;
`;

const EditableCompanyName = styled(EditableInput)`
  font-size: 24px;
  font-weight: 700;
  padding: 4px 8px;

  @media (max-width: 640px) {
    font-size: 18px;
  }
`;

interface DynamicMetric {
  id: string;
  name: string;
  values: { period: string; value: string }[];
}

interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  category: string;
}

const convertApiStartup = (apiStartup: ApiStartup): Startup => {
  const raw = apiStartup as any;
  const briefRaw = apiStartup.brief as any;
  const smartValDetails = normalizeSmartValDetails(
    raw.smartValDetails,
    raw.smartValResult,
    raw.smartvalResult,
    raw.smartValEvaluation,
    raw.smartvalEvaluation,
    raw.smartVal,
    raw.smartval,
  );

  const rawAnalysisStatus = (apiStartup.analysisStatus || raw.analysisStatus) as Startup['analysisStatus'] | undefined;
  const scoreCandidate =
    apiStartup.aiAnalysis?.score ??
    (apiStartup.aiAnalysis as any)?.totalScore ??
    raw.aiScore ??
    raw.fundGateScores?.total;
  const hasPositiveScore = typeof scoreCandidate === 'number' && scoreCandidate > 0;
  const hasFundGateResult = Boolean(
    raw.fundGateEvaluation ||
    raw.aiAnalysis?.generatedAt ||
    raw.analysisCompletedAt ||
    rawAnalysisStatus === 'completed' ||
    hasPositiveScore
  );
  const analysisStatus = hasFundGateResult && rawAnalysisStatus !== 'failed'
    ? 'completed'
    : rawAnalysisStatus;

  return {
    id: apiStartup.id,
    platformIdentityKey: raw.platformIdentityKey,
    dataRoomUrl: raw.dataRoomUrl,
    dataRoomApprovedUrl: raw.dataRoomApprovedUrl,
    dataRoomStatus: raw.dataRoomStatus,
    dataRoomReviewNote: raw.dataRoomReviewNote,
    telegramChatId: raw.telegramChatId,
    telegramChatTitle: raw.telegramChatTitle,
    logo: raw.logo || raw.fileUrls?.logo || '',
    brief: {
      companyName: apiStartup.brief?.name || briefRaw?.companyName || 'Unknown',
      industry: apiStartup.brief?.industry || 'Technology',
      website: briefRaw?.website || '',
      description: apiStartup.brief?.description || '',
      stage: briefRaw?.stage || 'Pre-Seed',
      foundedYear: briefRaw?.foundedYear || new Date().getFullYear(),
      teamSize: briefRaw?.teamSize || 0,
      fundingRequest: briefRaw?.fundingRequest || 0,
      itpvFundingRequest: briefRaw?.itpvFundingRequest ?? briefRaw?.fundingRequest ?? 0,
      totalRoundSize: briefRaw?.totalRoundSize || 0,
      useOfFunds: briefRaw?.useOfFunds || '',
      revenue: briefRaw?.revenue,
      revenueGrowth: briefRaw?.revenueGrowth,
      previousFunding: briefRaw?.previousFunding,
      pitchDeckUrl: briefRaw?.pitchDeckUrl || raw.fileUrls?.pitchDeck,
      founderName: briefRaw?.founderName || raw.founderName,
      founderEmail: briefRaw?.founderEmail || raw.founderEmail,
      founderPhone: briefRaw?.founderPhone || raw.founderPhone,
      founderRole: briefRaw?.founderRole,
      country: briefRaw?.country,
      revenueModel: Array.isArray(briefRaw?.revenueModel) ? briefRaw.revenueModel : [],
      valueDeliveryModel: briefRaw?.valueDeliveryModel,
      customerSegments: Array.isArray(briefRaw?.customerSegments) ? briefRaw.customerSegments : [],
      businessModel: briefRaw?.businessModel,
      businessModelDescription: briefRaw?.businessModelDescription,
      customBusinessModel: briefRaw?.customBusinessModel,
      hasTechnology: briefRaw?.hasTechnology,
      technologyDescription: briefRaw?.technologyDescription,
      customerAcquisitionCost: briefRaw?.customerAcquisitionCost,
      churnRate: briefRaw?.churnRate,
      hasUsers: briefRaw?.hasUsers,
      userCount: briefRaw?.userCount,
      activeUsersPerMonth: briefRaw?.activeUsersPerMonth,
      payingUsersPerMonth: briefRaw?.payingUsersPerMonth,
      hasPayingCustomers: briefRaw?.hasPayingCustomers,
    },
    status: apiStartup.status as StartupStatus,
    source: apiStartup.source as any,
    assignedManagerId: apiStartup.assignedManagerId || undefined,
    assignedManager: raw.assignedManager || undefined,
    fundConsiderationAmount: raw.fundConsiderationAmount,
    investmentAmount: raw.investmentAmount,
    investmentDate: raw.investmentDate ? new Date(raw.investmentDate) : undefined,
    founder: raw.founder as FounderDetails | undefined,
    teamMembers: (raw.teamMembers || []) as TeamMemberType[],
    investments: (raw.investments || []) as InvestmentRound[],
    fileUrls: raw.fileUrls as FileUrls | undefined,
    materials: raw.materials as Materials | undefined,
    comments: (apiStartup.comments || []) as any,
    activityLog: (apiStartup.activityLog || []) as any,
    documentRequests: ((apiStartup as any).documentRequests || raw.documentRequests || []) as any,
    roadmap: ((apiStartup as any).roadmap || raw.roadmap) as any,
    crossFundApplications: (raw.crossFundApplications || []).filter(
      (a: { organizationId?: string }) => a.organizationId !== 'org-platform',
    ),
    ddReviews: raw.ddReviews,
    lastQuarterlyReportAt: raw.lastQuarterlyReportAt ? parseFirestoreDate(raw.lastQuarterlyReportAt) : undefined,
    lastQuarterlyReportReviewedAt: raw.lastQuarterlyReportReviewedAt ? parseFirestoreDate(raw.lastQuarterlyReportReviewedAt) : undefined,
    lastQuarterlyReportId: raw.lastQuarterlyReportId,
    lastQuarterlyReportPeriod: raw.lastQuarterlyReportPeriod,
    lastQuarterlyReportStatus: raw.lastQuarterlyReportStatus,
    quarterlyReportsCount: raw.quarterlyReportsCount,
    aiAnalysis: hasFundGateResult && apiStartup.aiAnalysis ? {
      score: scoreCandidate ?? 0,
      valuation: apiStartup.aiAnalysis.valuation || 0,
      strengths: (apiStartup.aiAnalysis as any).strengths || [],
      weaknesses: (apiStartup.aiAnalysis as any).weaknesses || [],
      marketAnalysis: (apiStartup.aiAnalysis as any).marketAnalysis || '',
      teamAnalysis: (apiStartup.aiAnalysis as any).teamAnalysis || '',
      productAnalysis: (apiStartup.aiAnalysis as any).productAnalysis || '',
      financialAnalysis: (apiStartup.aiAnalysis as any).financialAnalysis || '',
      recommendation: (apiStartup.aiAnalysis as any).recommendation || 'hold',
      generatedAt: parseFirestoreDate((apiStartup.aiAnalysis as any).generatedAt),
    } : undefined,
    analysisStatus,
    analysisError: apiStartup.analysisError || raw.analysisError,
    metrics: raw.metrics as any || undefined,
    monitoringScore: raw.monitoringScore as any || undefined,
    metricsHistory: (raw.metricsHistory || []) as any,
    fundGateScores: (raw as any).fundGateScores || undefined,
    smartValDetails,
    aiRecommendations: (raw as any).aiRecommendations || undefined,
    resubmissionCount: raw.resubmissionCount,
    finallyBlocked: raw.finallyBlocked,
    finallyBlockedAt: raw.finallyBlockedAt ? parseFirestoreDate(raw.finallyBlockedAt) : undefined,
    finallyBlockedBy: raw.finallyBlockedBy,
    finallyBlockReason: raw.finallyBlockReason,
    previousVersions: raw.previousVersions,
    createdAt: parseFirestoreDate(apiStartup.createdAt),
    updatedAt: parseFirestoreDate(apiStartup.updatedAt),
  };
};

const parseFirestoreDate = (date: any): Date => {
  if (!date) return new Date();
  if (date._seconds) {
    return new Date(date._seconds * 1000);
  }
  if (date.toDate) {
    return date.toDate();
  }
  return new Date(date);
};

const formatCurrencyShort = (value?: number): string => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toLocaleString(numberLocale())}`;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActivityText = (activity: ActivityLogEntry, t: any) => {
  const { action, managerName, founderName, founderEmail, startupName, details, amount, fileName } = activity;
  const mgr = t('common.manager');

  switch (action) {
    case 'created':
      return (
        <>
          <strong>{founderName}</strong> {details || t('dashboard.actions.created')}{' '}
          {startupName && <span className="highlight">{startupName}</span>}
        </>
      );
    case 'moved_to_review':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.sentToReview')}{' '}
          <span className="highlight">{startupName}</span>
        </>
      );
    case 'moved_to_pipeline':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.tookToWork')}
        </>
      );
    case 'moved_to_portfolio':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.addedToPortfolio')}{' '}
          <span className="highlight">{startupName}</span>
        </>
      );
    case 'deal_closed':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.closedDeal')}{' '}
          <span className="highlight">{startupName}</span> {t('dashboard.actions.for')}{' '}
          <span className="amount">
            {amount ? `${(amount / 1000).toFixed(0)} 000$` : 'N/A'}
          </span>
        </>
      );
    case 'commented':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.commented')}:
        </>
      );
    case 'file_uploaded':
      return (
        <>
          <strong>{founderName}</strong> {t('dashboard.actions.updated')}{' '}
          <span className="highlight">{fileName}</span>
        </>
      );
    case 'updated':
      return (
        <>
          {mgr} <strong>{managerName}</strong> {t('dashboard.actions.edited')}{' '}
          <span className="highlight">{startupName}</span>
          {details && <span style={{ color: 'rgba(255,255,255,0.5)' }}> ({details})</span>}
        </>
      );
    case 'deleted_by_founder':
      return (
        <>
          <strong>{founderEmail || t('startups.activity.founder')}</strong>{' '}
          {t('startups.activity.deletedByFounder')}
        </>
      );
    default:
      return details || action;
  }
};

const CollapsibleDescription = ({ text, maxHeight = 150 }: { text: string; maxHeight?: number }) => {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setNeedsCollapse(contentRef.current.scrollHeight > maxHeight);
    }
  }, [text, maxHeight]);

  return (
    <div>
      <DescriptionWrapper ref={contentRef} $collapsed={!expanded && needsCollapse} $maxHeight={maxHeight}>
        <Description>{text}</Description>
        {!expanded && needsCollapse && <DescriptionFade />}
      </DescriptionWrapper>
      {needsCollapse && (
        <ExpandButton
          type="button"
          data-expanded={expanded}
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? t('common.showLess') : t('common.showMore')}
          <ChevronDown size={14} />
        </ExpandButton>
      )}
    </div>
  );
};

const VISIBILITY_DWELL_MS = 1500;
const VISIBILITY_THRESHOLD = 0.5;

interface ChatBubbleItemProps {
  sender: 'founder' | 'manager';
  initial: string;
  senderTag: string;
  text: string;
  timestamp: string;
  initiallyUnread: boolean;
  onMarkSeen?: () => void;
  commentId?: string;
  edited?: boolean;
  onEdit?: (commentId: string, currentText: string) => void;
  onDelete?: (commentId: string) => void;
}

const ChatBubbleItem = ({
  sender,
  initial,
  senderTag,
  text,
  timestamp,
  initiallyUnread,
  onMarkSeen,
  commentId,
  edited,
  onEdit,
  onDelete,
}: ChatBubbleItemProps) => {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [unread, setUnread] = useState(initiallyUnread);

  useEffect(() => {
    if (!unread || !rowRef.current) return;
    const el = rowRef.current;
    if (typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
            if (timer === undefined) {
              timer = window.setTimeout(() => {
                setUnread(false);
                onMarkSeen?.();
              }, VISIBILITY_DWELL_MS);
            }
          } else if (timer !== undefined) {
            window.clearTimeout(timer);
            timer = undefined;
          }
        }
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [unread, onMarkSeen]);

  const canEdit = Boolean(commentId && (onEdit || onDelete));
  const [hovered, setHovered] = useState(false);

  return (
    <ChatRow ref={rowRef} $sender={sender} style={{ position: 'relative' }}>
      <ChatAvatar $sender={sender}>{initial}</ChatAvatar>
      <ChatBubbleColumn $sender={sender}>
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <ChatBubble $sender={sender} $unread={unread}>
            <ChatSenderTag $sender={sender}>
              {senderTag}
              {unread && <NewCommentPill>{t('startupDetail.newBadge')}</NewCommentPill>}
            </ChatSenderTag>
            <ChatBubbleText>{text}</ChatBubbleText>
            {edited && (
              <span style={{ fontSize: 11, opacity: 0.6, marginTop: 2, display: 'block' }}>
                {t('startupDetail.editedLabel')}
              </span>
            )}
          </ChatBubble>
          {canEdit && hovered && (
            <div style={{
              position: 'absolute',
              top: 4,
              left: sender === 'manager' ? 'unset' : '100%',
              right: sender === 'manager' ? '100%' : 'unset',
              marginLeft: sender === 'manager' ? 0 : 4,
              marginRight: sender === 'manager' ? 4 : 0,
              display: 'flex',
              gap: 2,
              zIndex: 10,
            }}>
              {onEdit && commentId && (
                <button
                  title={t('startupDetail.edit')}
                  onClick={() => onEdit(commentId, text)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 4px', borderRadius: 6, color: '#888', display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                </button>
              )}
              {onDelete && commentId && (
                <button
                  title={t('startupDetail.delete')}
                  onClick={() => onDelete(commentId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 4px', borderRadius: 6, color: '#888', display: 'flex' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#3b1515'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              )}
            </div>
          )}
        </div>
        <ChatTimestamp>{timestamp}</ChatTimestamp>
      </ChatBubbleColumn>
    </ChatRow>
  );
};

const FOUNDER_ROLE_VALUES = FOUNDER_ROLES.map(role => role.value) as string[];

const getFounderRoleSelectValue = (value: unknown) => {
  const role = String(value ?? '').trim();
  if (!role) return '';
  return FOUNDER_ROLE_VALUES.includes(role) ? role : 'Other';
};

const getFounderRoleCustomValue = (value: unknown) => {
  const role = String(value ?? '').trim();
  if (!role || role === 'Other' || FOUNDER_ROLE_VALUES.includes(role)) return '';
  return role;
};

const normalizeFounderRoleForSave = (value: unknown) => {
  const role = String(value ?? '').trim();
  return role === 'Other' ? '' : role;
};

const normalizeFileUrl = (url?: string | null, startupId?: string | null): string =>
  safeCrmFileHref(url, startupId);

const StartupDetail = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [startup, setStartup] = useState<Startup | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const permissions = usePermissions();
  const { manager, updateManager } = useAuth();
  const isLightTheme = theme.mode === 'light';
  const canEditDataRoom = Boolean(startup) && canEditStartupDataRoomLink(
    permissions.role,
    startup?.assignedManagerId,
    permissions.userId,
  );
  const canReviewDataRoom = permissions.isDirector;

  const [dynamicMetrics, setDynamicMetrics] = useState<DynamicMetric[]>([]);
  const [newMetricName, setNewMetricName] = useState('');
  const [addingValueFor, setAddingValueFor] = useState<string | null>(null);
  const [newValuePeriod, setNewValuePeriod] = useState('');
  const [newValueAmount, setNewValueAmount] = useState('');

  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'history'>('notes');

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentSaving, setEditCommentSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);

  const [showFinallyBlockModal, setShowFinallyBlockModal] = useState(false);
  const [finallyBlocking, setFinallyBlocking] = useState(false);

  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleVersionExpanded = (key: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFinallyBlock = async (reason: string) => {
    if (!startup) return;
    setFinallyBlocking(true);
    try {
      const res = await startupsApi.finallyBlock(startup.id, reason || undefined, manager?.id);
      if (res.success) {
        setStartup(prev => prev ? {
          ...prev,
          finallyBlocked: true,
          finallyBlockedAt: new Date(),
          finallyBlockReason: reason || undefined,
        } : prev);
        setShowFinallyBlockModal(false);
        const activityRes = await startupsApi.getActivity(startup.id);
        if (activityRes.success && activityRes.data) {
          setActivityLog(activityRes.data);
        }
      } else {
        console.error('Failed to finally block:', res.error);
        alert(res.error || t('startupDetail.finallyBlock.failed'));
      }
    } catch (err) {
      console.error('Failed to finally block startup:', err);
      alert(err instanceof Error ? err.message : t('startupDetail.finallyBlock.failed'));
    } finally {
      setFinallyBlocking(false);
    }
  };

  const startEditing = () => {
    setEditData({
      companyName: startup?.brief.companyName || '',
      industry: startup?.brief.industry || '',
      description: startup?.brief.description || '',
      stage: startup?.brief.stage || 'Pre-Seed',
      foundedYear: startup?.brief.foundedYear || '',
      teamSize: startup?.brief.teamSize || '',
      fundingRequest: startup?.brief.fundingRequest || '',
      itpvFundingRequest: startup?.brief.itpvFundingRequest ?? startup?.brief.fundingRequest ?? '',
      totalRoundSize: startup?.brief.totalRoundSize || '',
      previousFunding: startup?.brief.previousFunding || '',
      useOfFunds: startup?.brief.useOfFunds || '',
      founderName: startup?.brief.founderName || '',
      founderEmail: startup?.brief.founderEmail || '',
      founderPhone: startup?.brief.founderPhone || '',
      founderRole: startup?.brief.founderRole || '',
      website: startup?.brief.website || '',
      country: startup?.brief.country || '',
      revenueModel: startup?.brief.revenueModel?.join(', ') || '',
      valueDeliveryModel: startup?.brief.valueDeliveryModel || '',
      customerSegments: startup?.brief.customerSegments?.join(', ') || '',
      businessModel: startup?.brief.businessModel || '',
      businessModelDescription: startup?.brief.businessModelDescription || '',
      customBusinessModel: startup?.brief.customBusinessModel || '',
      technologyDescription: startup?.brief.technologyDescription || '',
      revenue: startup?.brief.revenue || '',
      revenueGrowth: startup?.brief.revenueGrowth || '',
      customerAcquisitionCost: startup?.brief.customerAcquisitionCost || '',
      churnRate: startup?.brief.churnRate || '',
      userCount: startup?.brief.userCount || '',
      activeUsersPerMonth: startup?.brief.activeUsersPerMonth || '',
      payingUsersPerMonth: startup?.brief.payingUsersPerMonth || '',
      founderBackground: startup?.founder?.background || '',
      founderSuccessfulProject: startup?.founder?.successfulProject || '',
      fundConsiderationAmount: startup?.fundConsiderationAmount != null
        ? String(startup.fundConsiderationAmount)
        : '',
      investmentAmount: startup?.investmentAmount != null ? String(startup.investmentAmount) : '',
      valuationType: (startup as any)?.valuationType || 'pre-money',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveEditing = async () => {
    if (!startup) return;
    setSaving(true);
    try {
      const itpvFundingRequest = parseOptionalNumber(editData.itpvFundingRequest) ?? parseOptionalNumber(editData.fundingRequest);
      const totalRoundSize = parseOptionalNumber(editData.totalRoundSize);
      const updatedBrief = {
        ...startup.brief,
        companyName: editData.companyName,
        name: editData.companyName,
        industry: editData.industry,
        description: editData.description,
        stage: editData.stage,
        foundedYear: parseOptionalNumber(editData.foundedYear) ?? startup.brief.foundedYear,
        teamSize: parseOptionalNumber(editData.teamSize) ?? startup.brief.teamSize,
        fundingRequest: itpvFundingRequest ?? startup.brief.fundingRequest,
        itpvFundingRequest: itpvFundingRequest ?? startup.brief.itpvFundingRequest,
        totalRoundSize,
        previousFunding: parseOptionalNumber(editData.previousFunding),
        useOfFunds: editData.useOfFunds,
        founderName: editData.founderName,
        founderEmail: editData.founderEmail,
        founderPhone: editData.founderPhone,
        founderRole: normalizeFounderRoleForSave(editData.founderRole),
        website: editData.website,
        country: editData.country,
        revenueModel: String(editData.revenueModel || '').split(',').map((v) => v.trim()).filter(Boolean),
        valueDeliveryModel: editData.valueDeliveryModel,
        customerSegments: String(editData.customerSegments || '').split(',').map((v) => v.trim()).filter(Boolean),
        businessModel: [
          ...String(editData.revenueModel || '').split(',').map((v) => v.trim()).filter(Boolean),
          editData.valueDeliveryModel,
          ...String(editData.customerSegments || '').split(',').map((v) => v.trim()).filter(Boolean),
        ].filter(Boolean).join(' · '),
        businessModelDescription: editData.businessModelDescription,
        customBusinessModel: editData.customBusinessModel,
        technologyDescription: editData.technologyDescription,
        revenue: parseOptionalNumber(editData.revenue),
        revenueGrowth: parseOptionalNumber(editData.revenueGrowth),
        customerAcquisitionCost: parseOptionalNumber(editData.customerAcquisitionCost),
        churnRate: parseOptionalNumber(editData.churnRate),
        userCount: editData.userCount,
        activeUsersPerMonth: parseOptionalNumber(editData.activeUsersPerMonth),
        payingUsersPerMonth: parseOptionalNumber(editData.payingUsersPerMonth),
      };

      const updatedFounder = startup.founder ? {
        ...startup.founder,
        background: editData.founderBackground,
        successfulProject: editData.founderSuccessfulProject,
      } : undefined;

      const topLevelUpdates: Record<string, unknown> = {};
      const rawConsiderationAmount = String(editData.fundConsiderationAmount ?? '').replace(/[\s,]/g, '');
      if (rawConsiderationAmount === '') {
        topLevelUpdates.fundConsiderationAmount = null;
      } else {
        const parsedConsiderationAmount = Number(rawConsiderationAmount);
        if (Number.isFinite(parsedConsiderationAmount) && parsedConsiderationAmount > 0) {
          topLevelUpdates.fundConsiderationAmount = parsedConsiderationAmount;
        } else if (parsedConsiderationAmount === 0) {
          topLevelUpdates.fundConsiderationAmount = null;
        }
      }
      if (status === 'portfolio') {
        const rawAmount = String(editData.investmentAmount ?? '').replace(/[\s,]/g, '');
        const parsedAmount = rawAmount === '' ? undefined : Number(rawAmount);
        if (parsedAmount !== undefined && !Number.isNaN(parsedAmount)) {
          topLevelUpdates.investmentAmount = parsedAmount;
        }
        if (editData.valuationType === 'pre-money' || editData.valuationType === 'post-money') {
          topLevelUpdates.valuationType = editData.valuationType;
        }
      }

      const res = await startupsApi.update(startup.id, {
        brief: updatedBrief,
        founder: updatedFounder,
        ...topLevelUpdates,
      } as any);

      if (res.success) {
        const activityRes = await startupsApi.getActivity(startup.id);
        if (activityRes.success && activityRes.data) {
          setActivityLog(activityRes.data);
        }

        setStartup(prev => prev ? {
          ...prev,
          brief: updatedBrief as any,
          founder: updatedFounder,
          ...(topLevelUpdates as any),
        } : prev);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const runFundGateScore = async () => {
    if (!startup || scoring) return;
    setScoring(true);
    try {
      const res = await startupsApi.runFundGateScore(startup.id, manager?.id);
      if (res.success && res.data) {
        setStartup(convertApiStartup(res.data as ApiStartup));
        const activityRes = await startupsApi.getActivity(startup.id);
        if (activityRes.success && activityRes.data) {
          setActivityLog(activityRes.data);
        }
      } else {
        const latest = await startupsApi.getById(startup.id);
        if (latest.success && latest.data) {
          setStartup(convertApiStartup(latest.data as ApiStartup));
        } else {
          setStartup((prev) => prev ? {
            ...prev,
            analysisStatus: 'failed',
            analysisError: res.message || res.error || t('startupDetail.scoring.startFailed'),
          } : prev);
        }
        alert(res.message || res.error || t('startupDetail.scoring.startFailed'));
      }
    } catch (err) {
      console.error('Failed to run FundGate scoring:', err);
      alert(err instanceof Error ? err.message : t('startupDetail.scoring.startFailed'));
    } finally {
      setScoring(false);
    }
  };

  const handlePitchDeckFile = async (file: File) => {
    if (!startup || pitchDeckUploading) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'ppt', 'pptx'].includes(ext)) {
      setPitchDeckError(t('startupDetail.pitchDeck.formatError'));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setPitchDeckError(t('startupDetail.uploadDocumentSizeError'));
      return;
    }

    setPitchDeckUploading(true);
    setPitchDeckError('');

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(t('startupDetail.fileRead.failed')));
        reader.readAsDataURL(file);
      });

      const res = await startupsApi.uploadPitchDeck(
        startup.id,
        fileBase64,
        file.name,
        file.type || 'application/octet-stream',
        { managerId: manager?.id, uploadedByName: manager?.name }
      );

      if (!res.success || !res.data) {
        throw new Error(res.message || res.error || t('startupDetail.pitchDeck.uploadFailed'));
      }

      const converted = convertApiStartup(res.data as ApiStartup);
      setStartup(converted);
      setDocuments(((res.data as any).documents || []) as DocumentAttachment[]);

      const activityRes = await startupsApi.getActivity(startup.id);
      if (activityRes.success && activityRes.data) {
        setActivityLog(activityRes.data);
      }
    } catch (err) {
      console.error('Failed to upload pitch deck:', err);
      setPitchDeckError(err instanceof Error ? err.message : t('startupDetail.pitchDeck.uploadFailed'));
    } finally {
      setPitchDeckUploading(false);
      if (pitchDeckInputRef.current) {
        pitchDeckInputRef.current.value = '';
      }
    }
  };

  const MATERIAL_ACCEPT: Record<Exclude<StartupMaterialField, 'pitchDeck'>, string[]> = {
    onePager: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    financialModel: ['pdf', 'xls', 'xlsx'],
    logo: ['png', 'jpg', 'jpeg', 'webp'],
  };

  const handleMaterialFile = async (
    field: Exclude<StartupMaterialField, 'pitchDeck'>,
    file: File
  ) => {
    if (!startup || materialUploading) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = MATERIAL_ACCEPT[field];
    if (!ext || !allowed.includes(ext)) {
      setMaterialErrors((prev) => ({
        ...prev,
        [field]: t('startupDetail.materials.formatError', { formats: allowed.join(', ') }),
      }));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMaterialErrors((prev) => ({ ...prev, [field]: t('startupDetail.uploadDocumentSizeError') }));
      return;
    }

    setMaterialUploading(field);
    setMaterialErrors((prev) => ({ ...prev, [field]: '' }));
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(t('startupDetail.fileRead.failed')));
        reader.readAsDataURL(file);
      });

      const res = await startupsApi.uploadMaterial(
        startup.id,
        field,
        fileBase64,
        file.name,
        file.type || 'application/octet-stream',
        { managerId: manager?.id, uploadedByName: manager?.name }
      );

      if (!res.success || !res.data) {
        throw new Error(res.message || res.error || t('startupDetail.materials.uploadFailed'));
      }

      const converted = convertApiStartup(res.data as ApiStartup);
      setStartup(converted);
      setDocuments(((res.data as any).documents || []) as DocumentAttachment[]);

      const activityRes = await startupsApi.getActivity(startup.id);
      if (activityRes.success && activityRes.data) {
        setActivityLog(activityRes.data);
      }
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
      setMaterialErrors((prev) => ({
        ...prev,
        [field]: err instanceof Error ? err.message : t('startupDetail.materials.uploadFailed'),
      }));
    } finally {
      setMaterialUploading('');
      [logoInputRef, onePagerInputRef, financialModelInputRef].forEach((ref) => {
        if (ref.current) ref.current.value = '';
      });
    }
  };

  const updateField = (field: string, value: string) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const submitComment = async () => {
    if (!commentText.trim() || !startup || sendingComment || activeTab === 'history') return;
    const text = commentText.trim();
    setSendingComment(true);
    try {
      await startupsApi.addComment(startup.id, {
        managerId: manager?.id,
        managerName: manager?.name || 'Manager',
        managerAvatar: manager?.avatar,
        text,
        isInternal: true,
      });
      setStartup(prev => prev ? {
        ...prev,
        comments: [
          ...((prev.comments as any[]) || []),
          {
            id: `comment-${Date.now()}`,
            senderType: 'manager',
            senderName: manager?.name || 'Manager',
            managerId: manager?.id,
            managerName: manager?.name || 'Manager',
            managerAvatar: manager?.avatar,
            text,
            isInternal: true,
            createdAt: new Date(),
          },
        ] as any,
      } : prev);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  const startEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditCommentText(currentText);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const saveEditComment = async () => {
    if (!startup || !editingCommentId || !editCommentText.trim() || editCommentSaving) return;
    setEditCommentSaving(true);
    try {
      await startupsApi.editComment(startup.id, editingCommentId, editCommentText.trim());
      setStartup(prev => {
        if (!prev) return prev;
        const newComments = (prev.comments as any[]).map((c: any) =>
          c.id === editingCommentId ? { ...c, text: editCommentText.trim(), editedAt: new Date() } : c
        );
        return { ...prev, comments: newComments as any };
      });
      setActivityLog(prev => prev.map(a =>
        a.id === editingCommentId ? { ...a, details: editCommentText.trim() } : a
      ));
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      console.error('Failed to edit comment:', err);
    } finally {
      setEditCommentSaving(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!startup || deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      await startupsApi.deleteComment(startup.id, commentId);
      setStartup(prev => {
        if (!prev) return prev;
        return { ...prev, comments: (prev.comments as any[]).filter((c: any) => c.id !== commentId) as any };
      });
      setActivityLog(prev => prev.filter(a => a.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [quarterlyReports, setQuarterlyReports] = useState<QuarterlyReport[]>([]);
  const [quarterlyReportsLoading, setQuarterlyReportsLoading] = useState(false);
  const [uploadingDocIds, setUploadingDocIds] = useState<Set<string>>(new Set());
  const [documentUploadError, setDocumentUploadError] = useState('');
  const [pitchDeckUploading, setPitchDeckUploading] = useState(false);
  const [pitchDeckError, setPitchDeckError] = useState('');
  const pitchDeckInputRef = useRef<HTMLInputElement | null>(null);
  const [materialUploading, setMaterialUploading] = useState<'' | StartupMaterialField>('');
  const [materialErrors, setMaterialErrors] = useState<Partial<Record<StartupMaterialField, string>>>({});
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const onePagerInputRef = useRef<HTMLInputElement | null>(null);
  const financialModelInputRef = useRef<HTMLInputElement | null>(null);

  const statusLabels: Record<StartupStatus, string> = {
    new: t('startups.status.new'),
    in_review: t('startups.status.in_review'),
    pipeline: t('startups.status.pipeline'),
    portfolio: t('startups.status.portfolio'),
    rejected: t('startups.status.rejected'),
  };

  const commentsSeenSnapshotRef = useRef<string | null>(null);
  if (id && manager && commentsSeenSnapshotRef.current === null) {
    commentsSeenSnapshotRef.current = manager.commentsSeen?.[id] ?? '';
  }

  useEffect(() => {
    if (!id || !manager) return;
    const seenAt = new Date().toISOString();
    if (manager.commentsSeen?.[id] === seenAt) return;
    updateManager(markSeenLocally(manager, id, seenAt));
    void startupsApi.markCommentsSeen(id, seenAt).catch((err) => {
      console.warn('[StartupDetail] markCommentsSeen failed (non-fatal)', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setQuarterlyReportsLoading(true);

    cabinetApi.getStartupReports(id)
      .then((response) => {
        if (cancelled) return;
        setQuarterlyReports(response.success && response.data ? response.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[StartupDetail] quarterly reports load failed', err);
        setQuarterlyReports([]);
      })
      .finally(() => {
        if (!cancelled) setQuarterlyReportsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);

        const [startupResponse, activityResponse] = await Promise.all([
          startupsApi.getById(id),
          startupsApi.getActivity(id)
        ]);

        if (startupResponse.success && startupResponse.data) {
          setStartup(convertApiStartup(startupResponse.data));
        } else {
          setError(startupResponse.error || t('startupDetail.notFound'));
        }

        if (activityResponse.success && activityResponse.data) {
          setActivityLog(activityResponse.data);
        }

        if (startupResponse.success && startupResponse.data) {
          const raw = startupResponse.data as any;
          if (raw.dynamicMetrics) {
            setDynamicMetrics(raw.dynamicMetrics);
          }
          if (raw.documents) {
            setDocuments(raw.documents);
          }
        }
      } catch (err) {
        console.error('Failed to fetch startup:', err);
        setError(t('startupDetail.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner size={48} />
        <div style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      </LoadingContainer>
    );
  }

  if (error || !startup) {
    return (
      <PageContainer>
        <BackButton variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {t('startupDetail.backToList')}
        </BackButton>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          {error || t('startups.noStartups')}
        </div>
      </PageContainer>
    );
  }

  const { brief, aiAnalysis, status, source, fundGateScores, smartValDetails, aiRecommendations, analysisStatus, analysisError } = startup;
  const analysisDisplay = getStartupAnalysisDisplay(startup);
  const smartValValuationDisplay = formatSmartValValuation(smartValDetails);
  const logoUrl = startup.logo || startup.fileUrls?.logo;
  const pitchDeckUrl = brief.pitchDeckUrl || startup.fileUrls?.pitchDeck;
  const hasPitchDeck = Boolean(pitchDeckUrl);
  const editFiles: Array<{
    field: StartupMaterialField;
    label: string;
    url?: string;
    accept: string;
    ref: { current: HTMLInputElement | null };
    onPick: (file: File) => void;
    uploading: boolean;
    error?: string;
  }> = [
    { field: 'pitchDeck', label: 'Pitch Deck', url: pitchDeckUrl, accept: '.pdf,.ppt', ref: pitchDeckInputRef, onPick: handlePitchDeckFile, uploading: pitchDeckUploading, error: pitchDeckError || undefined },
    { field: 'onePager', label: 'One-Pager', url: startup.fileUrls?.onePager, accept: '.pdf,.doc,.docx,.ppt', ref: onePagerInputRef, onPick: (f) => handleMaterialFile('onePager', f), uploading: materialUploading === 'onePager', error: materialErrors.onePager },
    { field: 'financialModel', label: t('startupDetail.financialModel'), url: startup.fileUrls?.financialModel, accept: '.pdf,.xls,.xlsx', ref: financialModelInputRef, onPick: (f) => handleMaterialFile('financialModel', f), uploading: materialUploading === 'financialModel', error: materialErrors.financialModel },
  ];
  const founderRoleSelectValue = getFounderRoleSelectValue(editData.founderRole);
  const founderRoleCustomValue = getFounderRoleCustomValue(editData.founderRole);

  return (
    <PageContainer>
      <BackButton variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        {t('startupDetail.backToList')}
      </BackButton>

      <PageHeader>
        <StartupLogo
          src={logoUrl}
          startupId={startup.id}
          name={brief.companyName || ''}
          variant="lg"
        />
        <HeaderInfo>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isEditing ? (
              <EditableCompanyName
                value={editData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder={t('startupDetail.fields.companyName')}
              />
            ) : (
              <CompanyName>{brief.companyName}</CompanyName>
            )}
            {isEditing ? (
              <EditActions>
                <SaveButton onClick={saveEditing} disabled={saving}>
                  <Save size={14} />
                  {saving ? '...' : t('common.save')}
                </SaveButton>
                <CancelButton onClick={cancelEditing}>
                  <XCircle size={14} />
                  {t('common.cancel')}
                </CancelButton>
              </EditActions>
            ) : permissions.canEditStartup(startup.assignedManagerId) ? (
              <EditButton onClick={startEditing}>
                <Pencil size={14} />
                {t('common.edit')}
              </EditButton>
            ) : null}
          </div>
          {isEditing ? (
            <CustomDropdown
              value={editData.industry}
              onChange={(v) => updateField('industry', v)}
              options={INDUSTRIES.map(ind => ({ value: ind, label: ind }))}
              placeholder={t('startupDetail.fields.industry')}
              searchable
              style={{ marginTop: '4px' }}
            />
          ) : (
            <Industry>{brief.industry}</Industry>
          )}
          <HeaderMeta>
            {isEditing ? (
              <CustomDropdown
                value={editData.stage}
                onChange={(v) => updateField('stage', v)}
                options={STAGES.map(s => ({ value: s.value, label: s.value }))}
                autoWidth
              />
            ) : (
              <Badge variant="success">{stageLabels[brief.stage]}</Badge>
            )}
            <Badge variant="info">{statusLabels[status]}</Badge>
            <Badge variant="neutral">{source}</Badge>
            {startup.finallyBlocked && (
              <FinallyBlockedPill>
                <Lock />
                {t('startupDetail.finallyBlock.lockedBadge')}
              </FinallyBlockedPill>
            )}
          </HeaderMeta>
          {status === 'rejected' && !startup.finallyBlocked && permissions.isDirector && (
            <HeaderActions>
              <Button
                variant="danger"
                onClick={() => setShowFinallyBlockModal(true)}
              >
                <Lock size={14} />
                {t('startupDetail.finallyBlock.button')}
              </Button>
            </HeaderActions>
          )}
          {status !== 'new' && startup.assignedManager && (
            <AssignedManagerSection>
              <AssignedManagerLabel>{t('startupDetail.assignedManager')}</AssignedManagerLabel>
              <ManagerInfo>
                <ManagerAvatar>
                  {startup.assignedManager.avatar ? (
                    <CrmImage src={startup.assignedManager.avatar} alt={startup.assignedManager.name} />
                  ) : (
                    <User />
                  )}
                </ManagerAvatar>
                <ManagerName>{startup.assignedManager.name}</ManagerName>
              </ManagerInfo>
            </AssignedManagerSection>
          )}
        </HeaderInfo>
      </PageHeader>

      {status === 'portfolio' && (startup.investmentAmount || isEditing) && (
        <InvestmentCard>
          <div style={{ flex: 1 }}>
            <InvestmentLabel>
              {t('startups.investment.fundInvestment')}
              {isEditing ? (
                <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '8px' }}>
                  {(['pre-money', 'post-money'] as const).map((vt) => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => updateField('valuationType', vt)}
                      style={{
                        background: editData.valuationType === vt ? '#10b981' : 'rgba(16,185,129,0.15)',
                        color: editData.valuationType === vt ? '#fff' : '#10b981',
                        border: '1px solid rgba(16,185,129,0.4)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}
                    >
                      {vt === 'post-money' ? 'Post-money' : 'Pre-money'}
                    </button>
                  ))}
                </span>
              ) : (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  marginLeft: '8px'
                }}>
                  {(startup as any).valuationType === 'post-money' ? 'Post-money' : 'Pre-money'}
                </span>
              )}
            </InvestmentLabel>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>$</span>
                <EditableInput
                  type="text"
                  inputMode="numeric"
                  value={editData.investmentAmount ?? ''}
                  onChange={(e) => updateField('investmentAmount', e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    maxWidth: '260px',
                  }}
                />
              </div>
            ) : (
              <InvestmentValue>
                ${startup.investmentAmount!.toLocaleString(numberLocale())}
              </InvestmentValue>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {startup.investmentDate && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {new Date(startup.investmentDate).getFullYear()}
              </span>
            )}
            <InvestmentBadge>{t('startups.investment.inPortfolio')}</InvestmentBadge>
          </div>
        </InvestmentCard>
      )}

      <ContentGrid>
        <MainColumn>
          <Section>
            <SectionTitle>{t('startups.details.description')}</SectionTitle>
            {isEditing ? (
              <EditableTextarea
                value={editData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t('startups.details.description')}
                rows={5}
              />
            ) : (
              <CollapsibleDescription text={brief.description} maxHeight={150} />
            )}
          </Section>

          <DataRoomLinkCard
            startupId={startup.id}
            dataRoomUrl={startup.dataRoomUrl}
            canEdit={canEditDataRoom}
            canReview={canReviewDataRoom}
            status={startup.dataRoomStatus}
            reviewNote={startup.dataRoomReviewNote}
            onChange={(dataRoomUrl) => {
              setStartup((current) => current ? { ...current, dataRoomUrl } : current);
            }}
            onWorkflowChange={(dataRoom) => {
              setStartup((current) => current ? { ...current, ...dataRoom } : current);
            }}
          />

          <InteractionLogSection
            startupId={startup.id}
            status={startup.status}
            canEdit={permissions.canEditStartup(startup.assignedManagerId)}
            managerId={manager?.id}
            managerName={manager?.name}
          />

          {(startup.crossFundApplications || []).length > 0 && (
            <Section>
              <SectionTitle>{t('startupDetail.sheet.crossFundTitle')}</SectionTitle>
              <DetailGrid>
                {(startup.crossFundApplications || []).map((application) => (
                  <CrossFundApplicationItem key={`${application.organizationId}-${application.status}-${application.commitmentStatus || ''}`}>
                    <CrossFundOrganization title={application.organizationName}>
                      <Building2 />
                      <span>{application.organizationName}</span>
                    </CrossFundOrganization>
                    <CrossFundCommitment>
                      {typeof application.investmentAmount === 'number' && application.investmentAmount > 0 && (
                        <CrossFundAmount>{formatCurrencyShort(application.investmentAmount)}</CrossFundAmount>
                      )}
                      <CrossFundStatusPill>
                        {application.commitmentStatus
                          ? t(`investmentCommittee.funding.${application.commitmentStatus}Status`)
                          : formatStartupStatusLabel(application.status)}
                      </CrossFundStatusPill>
                    </CrossFundCommitment>
                  </CrossFundApplicationItem>
                ))}
              </DetailGrid>
            </Section>
          )}

          {(brief.founderName || brief.founderEmail || brief.founderPhone || brief.website || startup.founder || startup.telegramChatId || isEditing) && (
            <Section>
              <SectionTitle>{t('startupDetail.contacts')}</SectionTitle>
              <ContactGrid>
                {(brief.founderName || isEditing) && (
                  <ContactItem>
                    <User size={18} />
                    <div style={{ flex: 1 }}>
                      <ContactLabel>{t('startupDetail.founder')}{!isEditing && brief.founderRole ? ` (${brief.founderRole})` : ''}</ContactLabel>
                      {isEditing ? (
                        <>
                          <EditableInput
                            value={editData.founderName}
                            onChange={(e) => updateField('founderName', e.target.value)}
                            placeholder={t('startupDetail.fields.founderName')}
                            style={{ marginBottom: '4px' }}
                          />
                          <EditableSelect
                            value={founderRoleSelectValue}
                            onChange={(e) => updateField('founderRole', e.target.value)}
                          >
                            <option value="">{t('wizard.stepB.role')}</option>
                            {FOUNDER_ROLES.map(role => (
                              <option key={role.value} value={role.value}>
                                {t(role.labelKey)}
                              </option>
                            ))}
                          </EditableSelect>
                          {founderRoleSelectValue === 'Other' && (
                            <EditableInput
                              value={founderRoleCustomValue}
                              onChange={(e) => updateField('founderRole', e.target.value || 'Other')}
                              placeholder={t('wizard.stepB.customRole')}
                              style={{ marginTop: '4px' }}
                            />
                          )}
                        </>
                      ) : (
                        <ContactValue>{brief.founderName}</ContactValue>
                      )}
                    </div>
                  </ContactItem>
                )}
                {(brief.founderEmail || isEditing) && (
                  <ContactItem>
                    <Mail size={18} />
                    <div style={{ flex: 1 }}>
                      <ContactLabel>Email</ContactLabel>
                      {isEditing ? (
                        <EditableInput
                          value={editData.founderEmail}
                          onChange={(e) => updateField('founderEmail', e.target.value)}
                          placeholder="Email"
                          type="email"
                        />
                      ) : (
                        <ContactValue>
                          <a href={`mailto:${brief.founderEmail}`}>{brief.founderEmail}</a>
                        </ContactValue>
                      )}
                    </div>
                  </ContactItem>
                )}
                {(brief.founderPhone || isEditing) && (
                  <ContactItem>
                    <Phone size={18} />
                    <div style={{ flex: 1 }}>
                      <ContactLabel>{t('startupDetail.phone')}</ContactLabel>
                      {isEditing ? (
                        <EditableInput
                          value={editData.founderPhone}
                          onChange={(e) => updateField('founderPhone', e.target.value)}
                          placeholder={t('startupDetail.phone')}
                          type="tel"
                        />
                      ) : (
                        <ContactValue>
                          <a href={`tel:${brief.founderPhone}`}>{brief.founderPhone}</a>
                        </ContactValue>
                      )}
                    </div>
                  </ContactItem>
                )}
                {(brief.website || isEditing) && (
                  <ContactItem>
                    <Globe size={18} />
                    <div style={{ flex: 1 }}>
                      <ContactLabel>{t('startupDetail.website')}</ContactLabel>
                      {isEditing ? (
                        <EditableInput
                          value={editData.website}
                          onChange={(e) => updateField('website', e.target.value)}
                          placeholder={t('startupDetail.fields.websiteUrl')}
                        />
                      ) : (
                        <ContactValue>
                          <a href={safeExternalHref(brief.website)} target="_blank" rel="noopener noreferrer">
                            {brief.website} <ExternalLink size={12} style={{ display: 'inline' }} />
                          </a>
                        </ContactValue>
                      )}
                    </div>
                  </ContactItem>
                )}
                {startup.founder?.socialLinks?.linkedin && !isEditing && (
                  <ContactItem>
                    <Linkedin size={18} />
                    <div>
                      <ContactLabel>LinkedIn</ContactLabel>
                      <ContactValue>
                        <a href={safeExternalHref(startup.founder.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer">
                          LinkedIn <ExternalLink size={12} style={{ display: 'inline' }} />
                        </a>
                      </ContactValue>
                    </div>
                  </ContactItem>
                )}
                {startup.telegramChatId && !isEditing && (
                  <ContactItem>
                    <Send size={18} />
                    <div style={{ flex: 1 }}>
                      <ContactLabel>{t('startupDetail.telegramGroup')}</ContactLabel>
                      <ContactValue>
                        <a
                          href={`https://t.me/c/${String(startup.telegramChatId).replace(/^-100/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {startup.telegramChatTitle || t('startupDetail.telegramGroupFallback', { chatId: startup.telegramChatId })}{' '}
                          <ExternalLink size={12} style={{ display: 'inline' }} />
                        </a>
                      </ContactValue>
                    </div>
                  </ContactItem>
                )}
              </ContactGrid>
              {(startup.founder?.background || isEditing) && (
                <InfoBlock style={{ marginTop: '16px' }}>
                  <InfoLabel>{t('startupDetail.founderExperience')}</InfoLabel>
                  {isEditing ? (
                    <EditableTextarea
                      value={editData.founderBackground}
                      onChange={(e) => updateField('founderBackground', e.target.value)}
                      placeholder={t('startupDetail.founderExperience')}
                      rows={3}
                    />
                  ) : (
                    <ExpandableText>{startup.founder?.background}</ExpandableText>
                  )}
                </InfoBlock>
              )}
              {(startup.founder?.successfulProject || isEditing) && (
                <InfoBlock>
                  <InfoLabel>{t('startupDetail.successfulProjects')}</InfoLabel>
                  {isEditing ? (
                    <EditableTextarea
                      value={editData.founderSuccessfulProject}
                      onChange={(e) => updateField('founderSuccessfulProject', e.target.value)}
                      placeholder={t('startupDetail.successfulProjects')}
                      rows={3}
                    />
                  ) : (
                    <ExpandableText>{startup.founder?.successfulProject}</ExpandableText>
                  )}
                </InfoBlock>
              )}
            </Section>
          )}

          {isEditing ? (
            <Section>
              <SectionTitle>{t('startupDetail.documentsAndFiles')}</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <StartupLogo src={logoUrl} startupId={startup.id} name={brief.companyName || ''} variant="md" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                  <InfoLabel>{t('startupDetail.logo.label')}</InfoLabel>
                  <SaveButton
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={materialUploading === 'logo'}
                    style={{ justifyContent: 'center' }}
                  >
                    {materialUploading === 'logo' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                    {logoUrl ? t('startupDetail.logo.replace') : t('startupDetail.logo.add')}
                  </SaveButton>
                  <HiddenFileInput
                    ref={logoInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMaterialFile('logo', f); }}
                  />
                  {materialErrors.logo && <div style={{ color: '#ef4444', fontSize: '12px' }}>{materialErrors.logo}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {editFiles.map((f) => (
                  <div key={f.field} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '130px', fontWeight: 600 }}>{f.label}</div>
                    {f.url ? (
                      <FileButton href={normalizeFileUrl(f.url, startup.id)} target="_blank" rel="noopener noreferrer" onClick={(event) => { event.preventDefault(); void openCrmFile(normalizeFileUrl(f.url, startup.id)); }}>
                        <FileText size={16} />
                        {t('common.open')}
                        <Download size={14} />
                      </FileButton>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('startupDetail.files.notUploaded')}</span>
                    )}
                    <SaveButton
                      type="button"
                      onClick={() => f.ref.current?.click()}
                      disabled={f.uploading}
                      style={{ justifyContent: 'center' }}
                    >
                      {f.uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                      {f.url ? t('startupDetail.files.replace') : t('startupDetail.files.upload')}
                    </SaveButton>
                    <HiddenFileInput
                      ref={f.ref}
                      type="file"
                      accept={f.accept}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) f.onPick(file); }}
                    />
                    {f.error && <div style={{ color: '#ef4444', fontSize: '12px', width: '100%' }}>{f.error}</div>}
                  </div>
                ))}
              </div>
            </Section>
          ) : (
            (pitchDeckUrl || startup.fileUrls?.onePager || startup.fileUrls?.financialModel || startup.materials?.videoLink) && (
            <Section>
              <SectionTitle>{t('startupDetail.documentsAndFiles')}</SectionTitle>
              <FilesGrid>
                {pitchDeckUrl && (
                  <FileButton href={normalizeFileUrl(pitchDeckUrl, startup.id)} target="_blank" rel="noopener noreferrer" onClick={(event) => { event.preventDefault(); void openCrmFile(normalizeFileUrl(pitchDeckUrl, startup.id)); }}>
                    <FileText size={16} />
                    Pitch Deck
                    <Download size={14} />
                  </FileButton>
                )}
                {startup.fileUrls?.onePager && (
                  <FileButton href={normalizeFileUrl(startup.fileUrls.onePager, startup.id)} target="_blank" rel="noopener noreferrer" onClick={(event) => { event.preventDefault(); void openCrmFile(normalizeFileUrl(startup.fileUrls?.onePager, startup.id)); }}>
                    <FileText size={16} />
                    One-Pager
                    <Download size={14} />
                  </FileButton>
                )}
                {startup.fileUrls?.financialModel && (
                  <FileButton href={normalizeFileUrl(startup.fileUrls.financialModel, startup.id)} target="_blank" rel="noopener noreferrer" onClick={(event) => { event.preventDefault(); void openCrmFile(normalizeFileUrl(startup.fileUrls?.financialModel, startup.id)); }}>
                    <FileText size={16} />
                    {t('startupDetail.financialModel')}
                    <Download size={14} />
                  </FileButton>
                )}
                {startup.materials?.videoLink && (
                  <FileButton href={safeExternalHref(startup.materials.videoLink)} target="_blank" rel="noopener noreferrer">
                    <Video size={16} />
                    {t('startupDetail.video')}
                    <ExternalLink size={14} />
                  </FileButton>
                )}
              </FilesGrid>
              {startup.materials?.financialModelDescription && (
                <InfoBlock style={{ marginTop: '16px' }}>
                  <InfoLabel>{t('startupDetail.financialModelDescription')}</InfoLabel>
                  <InfoValue>{startup.materials.financialModelDescription}</InfoValue>
                </InfoBlock>
              )}
              {startup.materials?.currentRevenueBurnRate && (
                <InfoBlock>
                  <InfoLabel>{t('startupDetail.revenueBurnRate')}</InfoLabel>
                  <InfoValue>{startup.materials.currentRevenueBurnRate}</InfoValue>
                </InfoBlock>
              )}
            </Section>
            )
          )}

          <StartupRoadmapPanel
            startup={startup}
            onStartupUpdate={(updatedStartup) => setStartup(updatedStartup)}
            canModify={permissions.canModifyStartups}
          />

          <DocumentRequestsPanel
            startup={startup}
            onStartupUpdate={(updatedStartup) => setStartup(updatedStartup)}
            canModify={permissions.canModifyStartups}
          />

          {startup.teamMembers && startup.teamMembers.length > 0 && (
            <Section>
              <SectionTitle>
                <UserPlus size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.team')}
              </SectionTitle>
              {startup.teamMembers.map((member, index) => (
                <TeamMemberCard key={index}>
                  <TeamMemberName>
                    {member.firstName} {member.lastName}
                  </TeamMemberName>
                  {member.role && <TeamMemberRole>{member.role}</TeamMemberRole>}
                  {member.background && <TeamMemberBio as="div"><ExpandableText>{member.background}</ExpandableText></TeamMemberBio>}
                  {member.email && (
                    <TeamMemberEmail href={`mailto:${member.email}`}>
                      <Mail size={12} /> {member.email}
                    </TeamMemberEmail>
                  )}
                </TeamMemberCard>
              ))}
            </Section>
          )}

          <Section>
            <SectionTitle>{t('startupDetail.overview')}</SectionTitle>
            <DetailGrid>
              <DetailItem>
                <DetailLabel>{t('startups.details.founded')}</DetailLabel>
                {isEditing ? (
                  <CustomDropdown
                    value={String(editData.foundedYear)}
                    onChange={(v) => updateField('foundedYear', v)}
                    options={Array.from({ length: 30 }, (_, i) => {
                      const y = String(new Date().getFullYear() - i);
                      return { value: y, label: y };
                    })}
                  />
                ) : (
                  <DetailValue>{brief.foundedYear}</DetailValue>
                )}
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('startups.details.team')}</DetailLabel>
                {isEditing ? (
                  <EditableInput
                    value={editData.teamSize}
                    onChange={(e) => updateField('teamSize', e.target.value)}
                    placeholder={t('startupDetail.sheet.teamSize')}
                    type="number"
                  />
                ) : (
                  <DetailValue>
                    <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {brief.teamSize}
                  </DetailValue>
                )}
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('startups.details.stage')}</DetailLabel>
                {isEditing ? (
                  <CustomDropdown
                    value={editData.stage}
                    onChange={(v) => updateField('stage', v)}
                    options={STAGES.map(s => ({ value: s.value, label: s.value }))}
                  />
                ) : (
                  <DetailValue>{stageLabels[brief.stage] || brief.stage || '-'}</DetailValue>
                )}
              </DetailItem>
            </DetailGrid>
          </Section>

          {(brief.revenueModel?.length || brief.valueDeliveryModel || brief.customerSegments?.length || brief.businessModel || brief.businessModelDescription || isEditing) && (
            <Section>
              <SectionTitle>
                <Briefcase size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.businessModel')}
              </SectionTitle>
              <DetailGrid>
                <DetailItem>
                  <DetailLabel>{t('startupDetail.revenueModel', 'Revenue model')}</DetailLabel>
                  {isEditing ? (
                    <EditableInput
                      value={editData.revenueModel || ''}
                      onChange={(e) => updateField('revenueModel', e.target.value)}
                      placeholder={REVENUE_MODELS.map((item) => item.value).slice(0, 2).join(', ')}
                    />
                  ) : (
                    <DetailValue>{brief.revenueModel?.length ? brief.revenueModel.join(', ') : brief.businessModel || '-'}</DetailValue>
                  )}
                </DetailItem>
                <DetailItem>
                  <DetailLabel>{t('startupDetail.valueDeliveryModel', 'Value delivery')}</DetailLabel>
                  {isEditing ? (
                    <CustomDropdown
                      value={editData.valueDeliveryModel || ''}
                      onChange={(v) => updateField('valueDeliveryModel', v)}
                      options={VALUE_DELIVERY_MODELS.map(item => ({ value: item.value, label: item.value }))}
                      placeholder="—"
                    />
                  ) : (
                    <DetailValue>{brief.valueDeliveryModel || '-'}</DetailValue>
                  )}
                </DetailItem>
                <DetailItem>
                  <DetailLabel>{t('startupDetail.customerSegments', 'Customer segments')}</DetailLabel>
                  {isEditing ? (
                    <EditableInput
                      value={editData.customerSegments || ''}
                      onChange={(e) => updateField('customerSegments', e.target.value)}
                      placeholder={CUSTOMER_SEGMENTS.map((item) => item.value).slice(0, 2).join(', ')}
                    />
                  ) : (
                    <DetailValue>{brief.customerSegments?.length ? brief.customerSegments.join(', ') : '-'}</DetailValue>
                  )}
                </DetailItem>
                {(brief.country || isEditing) && (
                  <DetailItem>
                    <DetailLabel>{t('startupDetail.country')}</DetailLabel>
                    {isEditing ? (
                      <CustomDropdown
                        value={editData.country}
                        onChange={(v) => updateField('country', v)}
                        options={COUNTRIES_EN.map(c => ({ value: c, label: c }))}
                        placeholder="—"
                        searchable
                      />
                    ) : (
                      <DetailValue style={{ textTransform: 'capitalize' }}>{brief.country}</DetailValue>
                    )}
                  </DetailItem>
                )}
              </DetailGrid>
              {(brief.businessModelDescription || isEditing) && (
                <InfoBlock style={{ marginTop: '16px' }}>
                  <InfoLabel>{t('startupDetail.businessModelDescription')}</InfoLabel>
                  {isEditing ? (
                    <EditableTextarea
                      value={editData.businessModelDescription}
                      onChange={(e) => updateField('businessModelDescription', e.target.value)}
                      placeholder={t('startupDetail.businessModelDescription')}
                      rows={4}
                    />
                  ) : (
                    <InfoValue>{brief.businessModelDescription}</InfoValue>
                  )}
                </InfoBlock>
              )}
            </Section>
          )}

          {(brief.hasTechnology && brief.technologyDescription || isEditing) && (
            <Section>
              <SectionTitle>
                <Code size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.technology')}
              </SectionTitle>
              {isEditing ? (
                <EditableTextarea
                  value={editData.technologyDescription}
                  onChange={(e) => updateField('technologyDescription', e.target.value)}
                  placeholder={t('startupDetail.fields.technologyDescription')}
                  rows={4}
                />
              ) : (
                <Description>{brief.technologyDescription}</Description>
              )}
            </Section>
          )}

          {(brief.hasUsers || brief.hasPayingCustomers || brief.customerAcquisitionCost || brief.churnRate || isEditing) && (
            <Section>
              <SectionTitle>{t('startupDetail.metrics')}</SectionTitle>
              <DetailGrid>
                {(brief.hasUsers && brief.userCount || isEditing) && (
                  <DetailItem>
                    <DetailLabel>{t('startupDetail.totalUsers')}</DetailLabel>
                    {isEditing ? (
                      <CustomDropdown
                        value={editData.userCount}
                        onChange={(v) => updateField('userCount', v)}
                        options={USER_COUNT_RANGES.map(r => ({ value: r, label: r }))}
                        placeholder="—"
                      />
                    ) : (
                      <DetailValue>{brief.userCount}</DetailValue>
                    )}
                  </DetailItem>
                )}
                {(brief.activeUsersPerMonth || isEditing) ? (
                  <DetailItem>
                    <DetailLabel>{t('startupDetail.activePerMonth')}</DetailLabel>
                    {isEditing ? (
                      <EditableInput
                        value={editData.activeUsersPerMonth}
                        onChange={(e) => updateField('activeUsersPerMonth', e.target.value)}
                        placeholder={t('startupDetail.activePerMonth')}
                        type="number"
                      />
                    ) : (
                      <DetailValue>{brief.activeUsersPerMonth?.toLocaleString(numberLocale())}</DetailValue>
                    )}
                  </DetailItem>
                ) : null}
                {(brief.payingUsersPerMonth || isEditing) ? (
                  <DetailItem>
                    <DetailLabel>{t('startupDetail.payingPerMonth')}</DetailLabel>
                    {isEditing ? (
                      <EditableInput
                        value={editData.payingUsersPerMonth}
                        onChange={(e) => updateField('payingUsersPerMonth', e.target.value)}
                        placeholder={t('startupDetail.payingPerMonth')}
                        type="number"
                      />
                    ) : (
                      <DetailValue>{brief.payingUsersPerMonth?.toLocaleString(numberLocale())}</DetailValue>
                    )}
                  </DetailItem>
                ) : null}
                {(brief.customerAcquisitionCost || isEditing) ? (
                  <DetailItem>
                    <DetailLabel>CAC</DetailLabel>
                    {isEditing ? (
                      <EditableInput
                        value={editData.customerAcquisitionCost}
                        onChange={(e) => updateField('customerAcquisitionCost', e.target.value)}
                        placeholder="CAC ($)"
                        type="number"
                      />
                    ) : (
                      <DetailValue>${brief.customerAcquisitionCost?.toLocaleString(numberLocale())}</DetailValue>
                    )}
                  </DetailItem>
                ) : null}
                {(brief.churnRate || isEditing) ? (
                  <DetailItem>
                    <DetailLabel>Churn Rate</DetailLabel>
                    {isEditing ? (
                      <EditableInput
                        value={editData.churnRate}
                        onChange={(e) => updateField('churnRate', e.target.value)}
                        placeholder="Churn rate (%)"
                        type="number"
                      />
                    ) : (
                      <DetailValue>{brief.churnRate}%</DetailValue>
                    )}
                  </DetailItem>
                ) : null}
                {(brief.revenueGrowth || isEditing) ? (
                  <DetailItem>
                    <DetailLabel>{t('startupDetail.growthLast3Months')}</DetailLabel>
                    {isEditing ? (
                      <EditableInput
                        value={editData.revenueGrowth}
                        onChange={(e) => updateField('revenueGrowth', e.target.value)}
                        placeholder={t('startupDetail.fields.revenueGrowth')}
                        type="number"
                      />
                    ) : (
                      <DetailValue>
                        <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {brief.revenueGrowth}%
                      </DetailValue>
                    )}
                  </DetailItem>
                ) : null}
              </DetailGrid>
            </Section>
          )}

          {startup.investments && startup.investments.length > 0 && (
            <Section>
              <SectionTitle>
                <DollarSign size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.investmentHistory')}
              </SectionTitle>
              <InvestmentsList>
                {startup.investments.map((inv: any, index: number) => {
                  if (inv.investors && Array.isArray(inv.investors)) {
                    return inv.investors.map((investor: any, iIdx: number) => (
                      <InvestmentItem key={`${index}-${iIdx}`}>
                        <InvestmentInfo>
                          <InvestmentName>{investor.investorName}</InvestmentName>
                          <InvestmentMeta>{investor.source} &middot; {inv.date}</InvestmentMeta>
                        </InvestmentInfo>
                        <InvestmentAmount>${(investor.amount || 0).toLocaleString(numberLocale())}</InvestmentAmount>
                      </InvestmentItem>
                    ));
                  }
                  return (
                    <InvestmentItem key={index}>
                      <InvestmentInfo>
                        <InvestmentName>{inv.investorName}</InvestmentName>
                        <InvestmentMeta>{inv.source} &middot; {inv.date}</InvestmentMeta>
                      </InvestmentInfo>
                      <InvestmentAmount>${(inv.amount || 0).toLocaleString(numberLocale())}</InvestmentAmount>
                    </InvestmentItem>
                  );
                })}
              </InvestmentsList>
            </Section>
          )}

          <Section>
            <SectionTitle>{t('startups.details.fundingRequest')}</SectionTitle>
            <DetailGrid>
              <DetailItem>
                <DetailLabel>{t('startups.details.itpvFundingRequest')}</DetailLabel>
                {isEditing ? (
                  <EditableInput
                    value={editData.itpvFundingRequest}
                    onChange={(e) => updateField('itpvFundingRequest', e.target.value)}
                    placeholder={t('startups.details.itpvFundingRequest')}
                    type="number"
                  />
                ) : (
                  <DetailValue>
                    <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {formatCurrencyShort(brief.itpvFundingRequest ?? brief.fundingRequest)}
                  </DetailValue>
                )}
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('startupDetail.fundConsiderationAmount')}</DetailLabel>
                {isEditing ? (
                  <EditableInput
                    value={editData.fundConsiderationAmount ?? ''}
                    onChange={(e) => updateField('fundConsiderationAmount', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder={t('startupDetail.fundConsiderationAmount')}
                    type="text"
                    inputMode="numeric"
                  />
                ) : (
                  <DetailValue>
                    {startup.fundConsiderationAmount != null
                      ? formatCurrencyShort(startup.fundConsiderationAmount)
                      : '—'}
                  </DetailValue>
                )}
              </DetailItem>
              <DetailItem>
                <DetailLabel>{t('startups.details.totalRoundSize')}</DetailLabel>
                {isEditing ? (
                  <EditableInput
                    value={editData.totalRoundSize}
                    onChange={(e) => updateField('totalRoundSize', e.target.value)}
                    placeholder={t('startups.details.totalRoundSize')}
                    type="number"
                  />
                ) : (
                  <DetailValue>
                    <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {formatCurrencyShort(brief.totalRoundSize || 0)}
                  </DetailValue>
                )}
              </DetailItem>
              {(brief.previousFunding || isEditing) && (
                <DetailItem>
                  <DetailLabel>{t('startups.details.previousFunding')}</DetailLabel>
                  {isEditing ? (
                    <EditableInput
                      value={editData.previousFunding}
                      onChange={(e) => updateField('previousFunding', e.target.value)}
                      placeholder={t('startups.details.previousFunding')}
                      type="number"
                    />
                  ) : (
                    <DetailValue>${((brief.previousFunding || 0) / 1000000).toFixed(1)}M</DetailValue>
                  )}
                </DetailItem>
              )}
            </DetailGrid>
            <div style={{ marginTop: '16px' }}>
              <DetailLabel>{t('startups.details.useOfFunds')}</DetailLabel>
              {isEditing ? (
                <EditableTextarea
                  value={editData.useOfFunds}
                  onChange={(e) => updateField('useOfFunds', e.target.value)}
                  placeholder={t('startups.details.useOfFunds')}
                  rows={4}
                />
              ) : (
                <Description>{brief.useOfFunds}</Description>
              )}
            </div>
          </Section>

          {aiAnalysis && (
            <>
              <Section>
                <SectionTitle>{t('startupDetail.aiAnalysis')}</SectionTitle>
                <AnalysisText>
                  <strong>{t('startupDetail.marketAnalysis')}:</strong> {aiAnalysis.marketAnalysis}
                </AnalysisText>
                <AnalysisText>
                  <strong>{t('startupDetail.teamAnalysis')}:</strong> {aiAnalysis.teamAnalysis}
                </AnalysisText>
                <AnalysisText>
                  <strong>{t('startupDetail.productAnalysis')}:</strong> {aiAnalysis.productAnalysis}
                </AnalysisText>
                <AnalysisText>
                  <strong>{t('startupDetail.financialAnalysis')}:</strong> {aiAnalysis.financialAnalysis}
                </AnalysisText>
              </Section>

              <Section>
                <SectionTitle>{t('startupDetail.strengths')}</SectionTitle>
                <ul style={{ paddingLeft: '20px' }}>
                  {aiAnalysis.strengths.map((strength, index) => (
                    <ListItem key={index}>{strength}</ListItem>
                  ))}
                </ul>
              </Section>

              <Section>
                <SectionTitle>{t('startupDetail.weaknesses')}</SectionTitle>
                <ul style={{ paddingLeft: '20px' }}>
                  {aiAnalysis.weaknesses.map((weakness, index) => (
                    <ListItem key={index}>{weakness}</ListItem>
                  ))}
                </ul>
              </Section>
            </>
          )}

          {(fundGateScores?.total || smartValDetails?.method || smartValValuationDisplay || aiRecommendations?.overall_comment) && (
            <Section>
              <SectionTitle>{t('startupDetail.aiRecommendations')}</SectionTitle>

              {(smartValDetails?.method || smartValValuationDisplay) && (
                <>
                  <SubSectionTitle>
                    SmartVal{smartValDetails?.method ? `: ${smartValDetails.method}` : ''}
                    {smartValDetails?.confidence_score
                      ? ` (${t('startupDetail.smartVal.confidence', { value: Math.round(smartValDetails.confidence_score) })})`
                      : ''}
                  </SubSectionTitle>
                  {smartValValuationDisplay ? (
                    <AnalysisText>
                      <strong>{t('startupDetail.smartValRangeLabel')}</strong> {smartValValuationDisplay}
                    </AnalysisText>
                  ) : null}
                  {smartValDetails?.breakdown && Object.keys(smartValDetails.breakdown).length > 0 && (
                    <>
                      {Object.entries(smartValDetails.breakdown).map(([category, data]) => {
                        const d = data as any;
                        const pct = d.score ? Math.min(d.score * (d.weight || 1) * 10, 100) : 0;
                        return (
                          <ScoreBarRow key={category}>
                            <ScoreBarLabel style={{ width: 120 }}>{category}</ScoreBarLabel>
                            <ScoreBarTrack>
                              <ScoreBarFill $width={pct} $color={pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'} />
                            </ScoreBarTrack>
                            <ScoreBarValue>{d.score || 0}</ScoreBarValue>
                          </ScoreBarRow>
                        );
                      })}
                    </>
                  )}
                  {smartValDetails?.recommendations && smartValDetails.recommendations.length > 0 && (
                    <>
                      <SubSectionTitle>{t('startupDetail.smartvalRecommendations')}</SubSectionTitle>
                      <ul style={{ paddingLeft: '20px' }}>
                        {smartValDetails.recommendations.map((rec, index) => (
                          <ListItem key={index}>{rec}</ListItem>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}

              {aiRecommendations?.overall_comment && (
                <>
                  <SubSectionTitle>{t('startupDetail.aiOverallComment')}</SubSectionTitle>
                  <RecommendationCard>{aiRecommendations.overall_comment}</RecommendationCard>
                </>
              )}
              {aiRecommendations?.detailed_comment && (
                <>
                  <SubSectionTitle>{t('startupDetail.aiDetailedComment')}</SubSectionTitle>
                  <RecommendationCard
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        aiRecommendations.detailed_comment
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n/g, '<br/>')
                      ),
                    }}
                  />
                </>
              )}
            </Section>
          )}

          {startup.status === 'portfolio' && (
            <PortfolioMetricsSection
              startup={startup}
              canEdit={permissions.canEditStartup(startup.assignedManagerId)}
              onUpdate={(updated) => setStartup(prev => prev ? { ...prev, ...updated } : prev)}
            />
          )}

          {startup.status === 'portfolio' && (
            <Section>
              <SectionTitle>
                <TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.quarterly.title')}
              </SectionTitle>
              <QuarterlyMetricsCharts
                reports={quarterlyReports}
                loading={quarterlyReportsLoading}
                title="Revenue / MRR / Runway"
                subtitle={t('startupDetail.quarterly.subtitle')}
              />
            </Section>
          )}

          <Section>
            <SectionTitle>
              <BarChart3 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {t('startupDetail.dynamicMetrics')}
            </SectionTitle>
            <MetricsSection>
              {dynamicMetrics.map((metric) => (
                <MetricRow key={metric.id}>
                  <MetricName>{metric.name}</MetricName>
                  <MetricValues>
                    {metric.values.map((v, i) => {
                      const prevVal = i > 0 ? parseFloat(metric.values[i - 1].value) : null;
                      const curVal = parseFloat(v.value);
                      const trend = prevVal !== null && !isNaN(prevVal) && !isNaN(curVal) && prevVal !== 0
                        ? ((curVal - prevVal) / prevVal * 100).toFixed(1)
                        : null;
                      return (
                        <MetricChip key={`${metric.id}-${v.period}`}>
                          <span style={{ fontWeight: 600 }}>{v.period}:</span> {v.value}
                          {trend !== null && (
                            <MetricTrend $positive={parseFloat(trend) >= 0}>
                              {parseFloat(trend) >= 0 ? '+' : ''}{trend}%
                            </MetricTrend>
                          )}
                        </MetricChip>
                      );
                    })}
                    {addingValueFor === metric.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <PeriodInput
                          placeholder={t('startupDetail.periodPlaceholder')}
                          value={newValuePeriod}
                          onChange={e => setNewValuePeriod(e.target.value)}
                        />
                        <AddValueInput
                          placeholder={t('startupDetail.valuePlaceholder')}
                          value={newValueAmount}
                          onChange={e => setNewValueAmount(e.target.value)}
                        />
                        <SmallButton onClick={() => {
                          if (newValuePeriod && newValueAmount) {
                            const updated = dynamicMetrics.map(m =>
                              m.id === metric.id
                                ? { ...m, values: [...m.values, { period: newValuePeriod, value: newValueAmount }] }
                                : m
                            );
                            setDynamicMetrics(updated);
                            startupsApi.update(startup.id, { dynamicMetrics: updated } as any);
                            setAddingValueFor(null);
                            setNewValuePeriod('');
                            setNewValueAmount('');
                          }
                        }}>
                          <Plus size={12} />
                        </SmallButton>
                        <SmallButton $variant="danger" onClick={() => {
                          setAddingValueFor(null);
                          setNewValuePeriod('');
                          setNewValueAmount('');
                        }}>
                          <X size={12} />
                        </SmallButton>
                      </div>
                    ) : (
                      <SmallButton onClick={() => setAddingValueFor(metric.id)}>
                        <Plus size={12} /> {t('startupDetail.addValue')}
                      </SmallButton>
                    )}
                  </MetricValues>
                  <SmallButton $variant="danger" onClick={() => {
                    const updated = dynamicMetrics.filter(m => m.id !== metric.id);
                    setDynamicMetrics(updated);
                    startupsApi.update(startup.id, { dynamicMetrics: updated } as any);
                  }}>
                    <Trash2 size={12} />
                  </SmallButton>
                </MetricRow>
              ))}

              <AddMetricForm>
                <MetricInput
                  placeholder={t('startupDetail.metricNamePlaceholder')}
                  value={newMetricName}
                  onChange={e => setNewMetricName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <SmallButton onClick={() => {
                  if (newMetricName.trim()) {
                    const newMetric: DynamicMetric = {
                      id: `metric-${Date.now()}`,
                      name: newMetricName.trim(),
                      values: [],
                    };
                    const updated = [...dynamicMetrics, newMetric];
                    setDynamicMetrics(updated);
                    startupsApi.update(startup.id, { dynamicMetrics: updated } as any);
                    setNewMetricName('');
                  }
                }}>
                  <Plus size={14} /> {t('startupDetail.addMetric')}
                </SmallButton>
              </AddMetricForm>
            </MetricsSection>
          </Section>

          <Section>
            <SectionTitle>
              <FileText size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {t('startupDetail.documentsAndReports')}
            </SectionTitle>
            <DocumentsGrid>
              {documents.map((doc) => (
                <DocumentCard key={doc.id} style={{ cursor: doc.url ? 'pointer' : 'default' }} onClick={() => {
                  if (doc.url) void openCrmFile(doc.url);
                }}>
                  <FileText size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                  <DocumentInfo>
                    <DocumentName>{doc.name}</DocumentName>
                    <DocumentDate>{doc.category} &middot; {formatShortDate(new Date(doc.uploadedAt))}</DocumentDate>
                  </DocumentInfo>
                  <DocumentType>{doc.type}</DocumentType>
                  {doc.url ? (
                    <Download size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  ) : uploadingDocIds.has(doc.id) ? (
                    <Loader2 size={16} style={{ color: '#9ca3af', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                  ) : null}
                </DocumentCard>
              ))}
            </DocumentsGrid>
            <UploadArea style={{ marginTop: '12px' }}>
              <Upload />
              <span>{t('startupDetail.uploadDocument')}</span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>{t('startupDetail.uploadDocumentHint')}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';

                  if (!isAllowedDocumentUpload(file.name)) {
                    setDocumentUploadError(t('startupDetail.uploadDocumentFormatError'));
                    return;
                  }
                  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
                    setDocumentUploadError(t('startupDetail.uploadDocumentSizeError'));
                    return;
                  }
                  setDocumentUploadError('');

                  const docId = `doc-${Date.now()}`;
                  const pendingDoc: DocumentAttachment = {
                    id: docId,
                    name: file.name,
                    type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
                    url: '',
                    uploadedAt: new Date().toISOString(),
                    category: t('startupDetail.documentCategory'),
                  };

                  setDocuments(prev => [...prev, pendingDoc]);
                  setUploadingDocIds(prev => new Set(prev).add(docId));

                  const reader = new FileReader();
                  reader.onload = async () => {
                    try {
                      const base64 = reader.result as string;
                      const res = await startupsApi.uploadDocument(
                        startup.id,
                        base64,
                        file.name,
                        file.type,
                      );
                      if (!res.success || !res.data) {
                        throw new Error(res.message || res.error || t('startupDetail.uploadDocumentFailed'));
                      }

                      const uploadedDocument: DocumentAttachment = {
                        id: res.data.id,
                        name: res.data.fileName,
                        type: res.data.fileName.split('.').pop()?.toUpperCase() || 'FILE',
                        url: res.data.url,
                        uploadedAt: new Date(res.data.uploadedAt).toISOString(),
                        category: t('startupDetail.documentCategory'),
                      };
                      setDocuments(prev => prev.map(
                        document => document.id === docId ? uploadedDocument : document,
                      ));
                      setDocumentUploadError('');
                    } catch (uploadError) {
                      setDocuments(prev => prev.filter(document => document.id !== docId));
                      setDocumentUploadError(
                        uploadError instanceof Error
                          ? uploadError.message
                          : t('startupDetail.uploadDocumentFailed'),
                      );
                    } finally {
                      setUploadingDocIds(prev => {
                        const next = new Set(prev);
                        next.delete(docId);
                        return next;
                      });
                    }
                  };
                  reader.onerror = () => {
                    setDocuments(prev => prev.filter(document => document.id !== docId));
                    setUploadingDocIds(prev => {
                      const next = new Set(prev);
                      next.delete(docId);
                      return next;
                    });
                    setDocumentUploadError(t('startupDetail.uploadDocumentFailed'));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </UploadArea>
            {documentUploadError && (
              <div role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                {documentUploadError}
              </div>
            )}
          </Section>

          {startup.previousVersions && startup.previousVersions.length > 0 && (
            <Section>
              <SectionTitle>
                <History size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                {t('startupDetail.history.title')}
              </SectionTitle>
              <HistoryList>
                {[...startup.previousVersions]
                  .sort((a, b) => {
                    const aTime = new Date(a.versionAt as string).getTime();
                    const bTime = new Date(b.versionAt as string).getTime();
                    return bTime - aTime;
                  })
                  .map((version, index) => {
                    const versionKey = `${String(version.versionAt)}-${index}`;
                    const expanded = expandedVersions.has(versionKey);
                    const versionDate = new Date(version.versionAt as string);
                    const dateLabel = isNaN(versionDate.getTime())
                      ? String(version.versionAt)
                      : formatShortDateTime(versionDate);
                    return (
                      <div key={versionKey}>
                        <HistoryRow
                          type="button"
                          $expanded={expanded}
                          onClick={() => toggleVersionExpanded(versionKey)}
                          aria-expanded={expanded}
                        >
                          <ChevronRight className="chevron" />
                          <span>{t('startupDetail.history.versionLabel', { date: dateLabel })}</span>
                          {version.rejectionReason && (
                            <HistoryMeta>
                              {t('startupDetail.history.rejectedWithReason', { reason: version.rejectionReason })}
                            </HistoryMeta>
                          )}
                        </HistoryRow>
                        {expanded && (
                          <HistoryPanel>
                            <HistoryPanelGrid>
                              <HistoryPanelColumn>
                                <HistoryPanelColumnTitle>{t('startupDetail.history.briefColumn')}</HistoryPanelColumnTitle>
                                <HistoryPanelPre>
                                  {JSON.stringify(version.brief ?? {}, null, 2)}
                                </HistoryPanelPre>
                              </HistoryPanelColumn>
                              <HistoryPanelColumn>
                                <HistoryPanelColumnTitle>{t('startupDetail.history.formDataColumn')}</HistoryPanelColumnTitle>
                                <HistoryPanelPre>
                                  {JSON.stringify(version.formData ?? {}, null, 2)}
                                </HistoryPanelPre>
                              </HistoryPanelColumn>
                            </HistoryPanelGrid>
                          </HistoryPanel>
                        )}
                      </div>
                    );
                  })}
              </HistoryList>
            </Section>
          )}

          {(() => {
            const isComment = (a: typeof activityLog[number]) =>
              a.action === 'commented' || a.action === 'comment_added' || a.action === 'comment';
            const historyEntries = activityLog.filter((a) => !isComment(a));

            const rawCommentsAll: any[] = ((startup?.comments as any[]) || [])
              .slice()
              .sort((a: any, b: any) =>
                parseFirestoreDate(a.createdAt).getTime() -
                parseFirestoreDate(b.createdAt).getTime()
              );
            const notesComments = rawCommentsAll.filter((c) => !!c.isInternal);
            const rawComments = activeTab === 'notes' ? notesComments : [];

            const lastSeenISO = commentsSeenSnapshotRef.current ?? '';

            const renderComment = (c: any) => {
              const senderType: 'founder' | 'manager' = c.senderType === 'founder' ? 'founder' : 'manager';
              const isManager = senderType === 'manager';
              const displayName = isManager
                ? (c.managerName || c.senderName || t('startupDetail.managerLabel'))
                : (c.founderName || c.senderName || c.senderEmail || t('startupDetail.founderLabel'));
              const initial = displayName.charAt(0).toUpperCase();
              const senderLabel = isManager
                ? t('startupDetail.managerLabel')
                : `${t('startupDetail.founderLabel')}${c.founderName || c.senderName ? ` · ${c.founderName || c.senderName}` : ''}`;
              const createdISO = parseFirestoreDate(c.createdAt).toISOString();
              const unread = !isManager && Boolean(lastSeenISO) && createdISO > lastSeenISO;
              const timestamp = formatShortDateTime(parseFirestoreDate(c.createdAt));

              if (editingCommentId === c.id) {
                return (
                  <div key={c.id} style={{ padding: '4px 0' }}>
                    <textarea
                      value={editCommentText}
                      onChange={e => setEditCommentText(e.target.value)}
                      rows={3}
                      autoFocus
                      style={{
                        width: '100%', resize: 'vertical', borderRadius: 10, border: '1px solid #10b981',
                        background: '#0f1923', color: '#fff', padding: '8px 12px', fontSize: 14,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button
                        onClick={cancelEditComment}
                        style={{ background: 'none', border: '1px solid #334155', color: '#888', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}
                      >{t('startupDetail.cancel')}</button>
                      <button
                        onClick={saveEditComment}
                        disabled={editCommentSaving || !editCommentText.trim()}
                        style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: (editCommentSaving || !editCommentText.trim()) ? 0.5 : 1 }}
                      >{editCommentSaving ? t('startupDetail.saving') : t('startupDetail.save')}</button>
                    </div>
                  </div>
                );
              }

              return (
                <ChatBubbleItem
                  key={c.id}
                  sender={senderType}
                  initial={initial}
                  senderTag={senderLabel.toUpperCase()}
                  text={c.text || ''}
                  timestamp={timestamp}
                  initiallyUnread={unread}
                  commentId={isManager && c.id ? c.id : undefined}
                  edited={Boolean(c.editedAt)}
                  onEdit={isManager ? startEditComment : undefined}
                  onDelete={isManager ? deleteComment : undefined}
                />
              );
            };

            const renderHistory = (activity: typeof activityLog[number]) => (
              <TimelineItem key={activity.id}>
                <TimelineAvatar style={{ background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                  {(activity.managerName || activity.founderName || activity.founderEmail || 'U').charAt(0).toUpperCase()}
                </TimelineAvatar>
                <TimelineContent>
                  <TimelineText>{renderActivityText(activity, t)}</TimelineText>
                  {activity.fieldChanges && activity.fieldChanges.length > 0 && (
                    <FieldChangesList>
                      {activity.fieldChanges.map((fc, idx) => (
                        <li key={`${fc.field}-${idx}`}>
                          <strong>{fieldLabel(fc.field)}:</strong>{' '}
                          <span style={{ color: '#888' }}>{formatValue(fc.oldValue)}</span>
                          {' → '}
                          <span style={{ color: '#10b981' }}>{formatValue(fc.newValue)}</span>
                        </li>
                      ))}
                    </FieldChangesList>
                  )}
                  <TimelineDate>
                    {formatShortDate(parseFirestoreDate(activity.createdAt))}
                  </TimelineDate>
                </TimelineContent>
              </TimelineItem>
            );

            const renderNote = (c: any) => {
              const displayName = c.managerName || c.senderName || t('startupDetail.managerLabel');
              const initial = displayName.charAt(0).toUpperCase();
              const timestamp = formatShortDateTime(parseFirestoreDate(c.createdAt));
              const isEditing = editingCommentId === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.18)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, flexShrink: 0,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{displayName}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 6px',
                        borderRadius: 4, background: 'rgba(245,158,11,0.18)', color: '#f59e0b',
                        letterSpacing: 0.4, textTransform: 'uppercase',
                      }}>
                        <Lock size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        {t('startupDetail.internalBadge')}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>{timestamp}</span>
                    </div>
                    {isEditing ? (
                      <>
                        <textarea
                          value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value)}
                          rows={3}
                          autoFocus
                          style={{
                            width: '100%', resize: 'vertical', borderRadius: 8,
                            border: '1px solid #f59e0b', background: '#1a1409', color: '#fff',
                            padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                          <button
                            onClick={cancelEditComment}
                            style={{ background: 'none', border: '1px solid #334155', color: '#888', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                          >{t('startupDetail.cancel')}</button>
                          <button
                            onClick={saveEditComment}
                            disabled={editCommentSaving || !editCommentText.trim()}
                            style={{ background: '#f59e0b', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: (editCommentSaving || !editCommentText.trim()) ? 0.5 : 1 }}
                          >{editCommentSaving ? t('startupDetail.saving') : t('startupDetail.save')}</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {c.text || ''}
                        </div>
                        {c.editedAt && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                            {t('startupDetail.editedLabel')}
                          </div>
                        )}
                        {c.id && (
                          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                            <button
                              onClick={() => startEditComment(c.id, c.text || '')}
                              style={{ background: 'none', border: 'none', color: 'rgba(245,158,11,0.7)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                            >
                              {t('startupDetail.edit')}
                            </button>
                            <button
                              onClick={() => deleteComment(c.id)}
                              style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                            >
                              {t('startupDetail.delete')}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            };

            const tabBtnBase: React.CSSProperties = {
              flex: 1,
              padding: '9px 10px',
              borderRadius: '8px',
              border: '1px solid transparent',
              background: 'transparent',
              color: isLightTheme ? theme.colors.text.muted : 'rgba(255,255,255,0.55)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            };
            const tabBtnActiveNotes: React.CSSProperties = {
              ...tabBtnBase,
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#f59e0b',
              borderColor: 'rgba(245, 158, 11, 0.35)',
            };
            const tabBtnActiveHistory: React.CSSProperties = {
              ...tabBtnBase,
              background: isLightTheme ? 'rgba(79, 70, 229, 0.1)' : 'rgba(99, 102, 241, 0.14)',
              color: isLightTheme ? '#4f46e5' : '#818cf8',
              borderColor: isLightTheme ? 'rgba(79, 70, 229, 0.25)' : 'rgba(99, 102, 241, 0.35)',
            };
            const countPill = (color: string): React.CSSProperties => ({
              fontSize: '11px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '999px',
              background: `${color}22`,
              color,
              minWidth: 18,
              textAlign: 'center',
            });
            const countPillInactive: React.CSSProperties = {
              fontSize: '11px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '999px',
              background: isLightTheme ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.07)',
              color: isLightTheme ? theme.colors.text.tertiary : 'rgba(255,255,255,0.4)',
              minWidth: 18,
              textAlign: 'center',
            };

            const inputPlaceholder = t('startupDetail.notesPlaceholder');
            const sendBtnBg = '#f59e0b';

            return (
              <ActivitySection>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '4px',
                    background: isLightTheme ? theme.colors.bg.secondary : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isLightTheme ? theme.colors.border.secondary : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px',
                    marginBottom: '16px',
                  }}
                  role="tablist"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'notes'}
                    onClick={() => setActiveTab('notes')}
                    style={activeTab === 'notes' ? tabBtnActiveNotes : tabBtnBase}
                  >
                    <span>{t('startupDetail.tabs.notes')}</span>
                    <span style={activeTab === 'notes' ? countPill('#f59e0b') : countPillInactive}>
                      {notesComments.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    style={activeTab === 'history' ? tabBtnActiveHistory : tabBtnBase}
                  >
                    <span>{t('startupDetail.tabs.history')}</span>
                    <span style={activeTab === 'history' ? countPill('#818cf8') : countPillInactive}>
                      {historyEntries.length}
                    </span>
                  </button>
                </div>

                {activeTab === 'notes' && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '10px 12px', marginBottom: '14px',
                    background: isLightTheme ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.07)',
                    border: `1px solid ${isLightTheme ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.2)'}`,
                    borderRadius: '8px', fontSize: '12px',
                    color: isLightTheme ? '#92400e' : 'rgba(255,255,255,0.65)', lineHeight: '1.5',
                  }}>
                    <Lock size={14} style={{ flexShrink: 0, marginTop: '1px', color: '#f59e0b' }} />
                    <span dangerouslySetInnerHTML={{ __html: sanitizeInline(t('startupDetail.notesBanner')) }} />
                  </div>
                )}

                {activeTab === 'history' ? (
                  historyEntries.length > 0 ? (
                    <Timeline>{historyEntries.map(renderHistory)}</Timeline>
                  ) : (
                    <div style={{ textAlign: 'center', color: isLightTheme ? theme.colors.text.tertiary : 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '24px 0' }}>
                      {t('startupDetail.noActivity')}
                    </div>
                  )
                ) : (
                  rawComments.length > 0 ? (
                    <div>{rawComments.map(renderNote)}</div>
                  ) : (
                    <div style={{ textAlign: 'center', color: isLightTheme ? theme.colors.text.tertiary : 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '24px 0' }}>
                      {t('startupDetail.noNotes')}
                    </div>
                  )
                )}

                {activeTab !== 'history' && (
                    <CommentInput style={{ marginTop: '12px' }}>
                      <CommentAvatar style={{
                        background: '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>
                          {(manager?.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </CommentAvatar>
                      <CommentPlaceholder
                        placeholder={inputPlaceholder}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                        disabled={sendingComment}
                      />
                      {commentText.trim() && (
                        <button
                          onClick={submitComment}
                          disabled={sendingComment}
                          style={{
                            background: sendBtnBg, border: 'none', borderRadius: '8px',
                            padding: '8px 10px',
                            cursor: sendingComment ? 'not-allowed' : 'pointer',
                            opacity: sendingComment ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          title={t('startupDetail.send')}
                        >
                          <Send size={14} color="white" />
                        </button>
                      )}
                    </CommentInput>
                )}
              </ActivitySection>
            );
          })()}
        </MainColumn>

        <SidebarColumn>
          <ScoreCard>
            <CardTitle>{t('startups.details.score')}</CardTitle>
            {analysisDisplay.hasScore ? (
              <>
                <ScoreValue>{analysisDisplay.score}</ScoreValue>
                <ScoreLabel>/100</ScoreLabel>
              </>
            ) : analysisStatus === 'failed' ? (
              <>
                <DetailValue style={{ marginTop: 12, color: isLightTheme ? '#991b1b' : '#FCA5A5' }}>
                  {t('startupDetail.sheet.aiScoreMissingTitle')}
                </DetailValue>
                {analysisError && (
                  <DetailValue style={{ marginTop: 8, color: isLightTheme ? '#64748b' : '#9CA3AF', fontSize: 12, lineHeight: 1.45 }}>
                    {analysisError}
                  </DetailValue>
                )}
              </>
            ) : analysisDisplay.isScoreMissing ? (
              <>
                <DetailValue style={{ marginTop: 12, color: isLightTheme ? '#64748b' : '#9CA3AF' }}>
                  {t('startupDetail.sheet.aiScoreMissingTitle')}
                </DetailValue>
                <DetailValue style={{ marginTop: 8, color: isLightTheme ? '#64748b' : '#9CA3AF', fontSize: 12, lineHeight: 1.45 }}>
                  {t('startupDetail.scoring.missingHint')}
                </DetailValue>
              </>
            ) : (
              <DetailValue style={{ marginTop: 12, color: isLightTheme ? '#64748b' : '#9CA3AF' }}>
                {t('startupDetail.scoring.notEvaluated')}
              </DetailValue>
            )}
            <PitchDeckStatus $ready={hasPitchDeck}>
              <FileText size={14} />
              {hasPitchDeck ? t('startupDetail.pitchDeck.uploaded') : t('startupDetail.pitchDeck.notUploaded')}
            </PitchDeckStatus>
            <PitchDeckActions>
              {hasPitchDeck && pitchDeckUrl && (
                <SmallButton
                  as="a"
                  href={normalizeFileUrl(pitchDeckUrl, startup.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => { event.preventDefault(); void openCrmFile(normalizeFileUrl(pitchDeckUrl, startup.id)); }}
                  style={{ justifyContent: 'center', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} />
                  {t('startupDetail.pitchDeck.open')}
                </SmallButton>
              )}
              {permissions.canModifyStartups && (
                <>
                  <SaveButton
                    type="button"
                    onClick={() => pitchDeckInputRef.current?.click()}
                    disabled={pitchDeckUploading}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {pitchDeckUploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                    {pitchDeckUploading
                      ? t('startupDetail.pitchDeck.uploading')
                      : hasPitchDeck
                        ? t('startupDetail.pitchDeck.replace')
                        : t('startupDetail.pitchDeck.add')}
                  </SaveButton>
                  <HiddenFileInput
                    ref={pitchDeckInputRef}
                    type="file"
                    accept=".pdf,.ppt"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handlePitchDeckFile(file);
                      }
                    }}
                  />
                  {pitchDeckError && (
                    <DetailValue style={{ color: isLightTheme ? '#991b1b' : '#FCA5A5', fontSize: 12, lineHeight: 1.45 }}>
                      {pitchDeckError}
                    </DetailValue>
                  )}
                </>
              )}
            </PitchDeckActions>
            {permissions.canModifyStartups && (
              <SaveButton
                type="button"
                onClick={runFundGateScore}
                disabled={scoring || pitchDeckUploading}
                style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
              >
                {scoring ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                {scoring
                  ? t('startupDetail.scoring.running')
                  : aiAnalysis
                    ? t('startupDetail.scoring.rerun')
                    : t('startupDetail.scoring.run')}
              </SaveButton>
            )}
          </ScoreCard>

          {smartValValuationDisplay && (
            <Card style={{ marginTop: '24px' }}>
              <CardTitle>{t('startupDetail.smartValRangeTitle')}</CardTitle>
              <CardSubtitle>
                SmartVal{smartValDetails?.method ? ` · ${smartValDetails.method}` : ''}
              </CardSubtitle>
              <div style={{ marginTop: '24px' }}>
                <DetailValue style={{ fontSize: '32px', color: '#10b981' }}>
                  {smartValValuationDisplay}
                </DetailValue>
              </div>
            </Card>
          )}

          {aiAnalysis && (
            <Card style={{ marginTop: '24px' }}>
              <CardTitle>{t('startupDetail.recommendation')}</CardTitle>
              <div style={{ marginTop: '16px' }}>
                <Badge
                  variant={
                    aiAnalysis.recommendation === 'strong_buy' ||
                      aiAnalysis.recommendation === 'buy'
                      ? 'success'
                      : aiAnalysis.recommendation === 'hold'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {aiAnalysis.recommendation === 'strong_buy' && t('startupDetail.recommendations.strong_buy')}
                  {aiAnalysis.recommendation === 'buy' && t('startupDetail.recommendations.buy')}
                  {aiAnalysis.recommendation === 'hold' && t('startupDetail.recommendations.hold')}
                  {aiAnalysis.recommendation === 'pass' && t('startupDetail.recommendations.sell')}
                </Badge>
                <div style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {t('startupDetail.generatedAt')} {aiAnalysis.generatedAt instanceof Date && !isNaN(aiAnalysis.generatedAt.getTime())
                    ? formatShortDate(aiAnalysis.generatedAt)
                    : '-'}
                </div>
              </div>
            </Card>
          )}
        </SidebarColumn>
      </ContentGrid>

      {isEditing && (
        <StickyEditBar>
          <StickyEditInfo>
            <Save size={16} />
            {t('startupDetail.unsavedChanges')}
          </StickyEditInfo>
          <EditActions>
            <SaveButton onClick={saveEditing} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? t('startupDetail.saving') : t('startupDetail.save')}
            </SaveButton>
            <CancelButton onClick={cancelEditing} disabled={saving}>
              <XCircle size={14} />
              {t('startupDetail.cancel')}
            </CancelButton>
          </EditActions>
        </StickyEditBar>
      )}

      <FinallyBlockModal
        isOpen={showFinallyBlockModal}
        startupName={brief.companyName}
        onConfirm={handleFinallyBlock}
        onCancel={() => setShowFinallyBlockModal(false)}
        isLoading={finallyBlocking}
      />
    </PageContainer>
  );
};

export default StartupDetail;
