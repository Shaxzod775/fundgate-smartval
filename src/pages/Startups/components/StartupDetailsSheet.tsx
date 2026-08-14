import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Trans, useTranslation } from 'react-i18next';
import { X, ExternalLink, Calendar, TrendingUp, DollarSign, Users, Globe, Building2, Maximize2, Mail, Phone, MapPin, Link as LinkIcon, MessageSquare, FileText, Search, UserPlus, Send, RotateCcw, Download, Video, Linkedin, User, Lock, Archive, MinusCircle, Scale, Cpu, AlertTriangle, Check, ChevronDown, Trash2, Sparkles, BarChart3, Clock } from 'lucide-react';
import type { DDReviewTrack, DDReviewTrackKey, DDReviewTrackStatus, DDRiskLevel, Startup } from '../../../types';
import { stageLabels } from '../../../utils/mockData';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import { CrmImage } from '../../../components/ui/CrmImage';
import { useSimulatedLoad } from '../../../hooks/useSimulatedLoad';
import { usePermissions } from '../../../hooks/usePermissions';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ROLE_LABELS,
  cabinetApi,
  normalizeCrmFileUrl,
  openCrmFile,
  downloadCrmFile,
  startupsApi,
  teamApi,
  type Manager,
  type PendingChangeSet,
  type QuarterlyReport,
  type QuarterlyReportQuarter,
  type QuarterlyReportRequest,
  type UserRole,
} from '../../../services/api';
import { AssignManagerModal } from './AssignManagerModal';
import { DocumentRequestsPanel } from './DocumentRequestsPanel';
import { StartupRoadmapPanel } from './StartupRoadmapPanel';
import { formatStartupStatusLabel } from '../../../utils/startupStatusDisplay';
import { safeExternalHref } from '../../../utils/safeUrl';
import { getStartupAnalysisDisplay } from '../../../utils/analysisDisplay';
import { formatSmartValValuation } from '../../../utils/smartValValuation';
import { canEditStartupDataRoomLink } from '../../../utils/startupDataRoom';
import {
  investmentMemoDownloadFileName,
  investmentMemoDownloadUrl,
} from '../../../utils/investmentMemoLinks';
import { DataRoomLinkCard } from './DataRoomLinkCard';
import { formatShortDate, formatTime } from '../../../utils/formatDate';
import { numberLocale } from '../../../utils/formatNumber';

const SheetOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 90;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease;
`;

const SheetContainer = styled.div<{ $isOpen: boolean; $width: number }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${({ $width }) => $width}px;
  max-width: 100vw;
  background: ${({ theme }) => theme.colors.bg.primary};
  border-left: 1px solid ${({ theme }) => theme.colors.border.primary};
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
  z-index: 100;
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 640px) {
    width: 100vw;
    border-left: none;
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primary};
  }

  &:active {
    background: ${({ theme }) => theme.colors.accent.primary};
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const SheetContent = styled.div`
  padding: 24px;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const StartChatButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(16, 185, 129, 0.34);
  background: rgba(16, 185, 129, 0.12);
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.55);
    transform: translateY(-1px);
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const RestoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.colors.status.success};
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  margin-left: auto;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ArchiveButton = styled(RestoreButton)`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
  }
`;

const PermanentDeleteButton = styled(RestoreButton)`
  margin-left: 0;
  background: ${({ theme }) => theme.colors.status.dangerBg};
  border: 1px solid ${({ theme }) => theme.colors.status.dangerBorder};
  color: ${({ theme }) => theme.colors.status.danger};

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.colors.status.dangerBg};
    border-color: ${({ theme }) => theme.colors.status.danger};
    transform: translateY(-1px);
  }
`;

const IconButton = styled.button`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.border.primary};
  }
`;

const SheetHeader = styled.div`
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const HeaderContent = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Industry = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;


const Section = styled.div`
  margin-bottom: 32px;
  max-width: 100%;
  overflow-x: hidden;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const Description = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const InfoCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  padding: 12px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  min-width: 0;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};
`;

const InfoLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  flex: 0 1 auto;
  width: max-content;
  max-width: 58%;
  min-width: 0;
  line-height: 1.35;

  a {
    color: ${({ theme }) => theme.colors.accent.primary};
    text-decoration: none;
  }
`;

const MissingValueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(15, 23, 42, 0.04)' : 'rgba(148, 163, 184, 0.08)')};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  vertical-align: middle;

  svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const DDPanelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const DDPanelCard = styled.button<{ $risk?: string; $active?: boolean }>`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ $risk, $active, theme }) => {
    if ($active) return theme.colors.accent.primary;
    if ($risk === 'critical' || $risk === 'high') return theme.colors.status.dangerBorder;
    if ($risk === 'medium') return theme.colors.status.warningBorder;
    return theme.colors.border.secondary;
  }};
  border-radius: 14px;
  padding: 12px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
  }
`;

const DDPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
`;

const DDPanelTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const DDPanelStatus = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const DDPanelConclusion = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.45;
  min-height: 34px;
`;

const DDPanelMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const DDPanelPill = styled.span`
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 11px;
  font-weight: 700;
`;

const DDTrackEditor = styled.div`
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const DDTrackEditorHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`;

const DDTrackEditorTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const DDTrackHelp = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  line-height: 1.45;
`;

const DDTrackEditorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const DDTrackField = styled.label<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 14px;
    outline: none;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;

    &:focus {
      border-color: ${({ theme }) => theme.colors.accent.primary};
    }
  }

  textarea {
    min-height: 76px;
    resize: vertical;
  }
`;

const DDTrackEditorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
`;

const DDTrackError = styled.div`
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  margin-top: 8px;
`;

const CustomSelectRoot = styled.div<{ $open: boolean }>`
  position: relative;
  z-index: ${({ $open }) => ($open ? 40 : 1)};
`;

const CustomSelectButton = styled.button<{ $open: boolean }>`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.accent.primary : theme.colors.border.secondary)};
  border-radius: 10px;
  background: ${({ theme, $open }) => ($open ? theme.colors.bg.inputFocus : theme.colors.bg.tertiary)};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 9px 10px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.focus : 'none')};
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
    transition: transform 0.16s ease;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
  }
`;

const CustomSelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  min-width: 190px;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.lg};

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.secondary};
    border-radius: 999px;
  }
`;

const CustomSelectOption = styled.button<{ $active: boolean; $disabled?: boolean }>`
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: ${({ $active, $disabled }) => ($active && !$disabled ? 'rgba(16, 185, 129, 0.12)' : 'transparent')};
  color: ${({ theme, $active, $disabled }) => {
    if ($disabled) return theme.colors.text.tertiary;
    return $active ? theme.colors.accent.primary : theme.colors.text.primary;
  }};
  padding: 7px 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.72 : 1)};

  svg,
  span:first-child {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover,
  &:focus-visible {
    outline: none;
    background: ${({ $disabled }) => ($disabled ? 'transparent' : 'rgba(16, 185, 129, 0.12)')};
    color: ${({ theme, $disabled }) => ($disabled ? theme.colors.text.tertiary : theme.colors.accent.primary)};
  }
`;

const CustomSelectOptionContent = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: inherit;
  }

  small {
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: 11px;
    font-weight: 700;
    line-height: 1.2;
  }
`;

const CrossFundList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Show ~3 funds; the rest scroll (the 4th peeks to hint there's more). */
  max-height: 168px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
`;

const CrossFundRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const CrossFundName = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CrossFundStatus = styled.span`
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.26);
  background: ${({ theme }) => (theme.mode === 'light' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)')};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 11px;
  font-weight: 700;
`;

const CrossFundCommitment = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
`;

const CrossFundAmount = styled.strong`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-weight: 800;
`;

const PendingChangesNotice = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  font-size: 14px;
  font-weight: 700;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ReviewPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ReviewCard = styled.div`
  padding: 12px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const ReviewCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const ReviewMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 600;
`;

const InvestmentMemoPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(16, 185, 129, 0.24);
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const InvestmentMemoHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const InvestmentMemoTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
    flex-shrink: 0;
  }
`;

const InvestmentMemoMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const InvestmentMemoPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
`;

const InvestmentMemoActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 520px) {
    justify-content: flex-start;
  }
`;

const InvestmentMemoLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.34);
  color: #60a5fa;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
`;

const InvestmentMemoSummaryText = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;
  line-height: 1.5;
`;

const InvestmentMemoPreview = styled.pre`
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const DiffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
`;

const DiffRow = styled.div`
  padding: 8px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.45;
`;

const DiffField = styled.div`
  margin-bottom: 3px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
`;

const ReviewActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const AwaitingDirectorNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.32);
`;

const ReportMetricsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const ReportMetricPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
`;

const ReportNoteInput = styled.textarea`
  width: 100%;
  min-height: 62px;
  margin-top: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ReportFileLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.24);
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
`;

const QuarterlyRequestForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  margin-bottom: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const QuarterlyFormField = styled.label<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 14px;
    outline: none;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;

    &:focus {
      border-color: ${({ theme }) => theme.colors.accent.primary};
    }
  }

  textarea {
    min-height: 70px;
    resize: vertical;
  }
`;

const QuarterlyStatusPill = styled.span<{ $status?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid ${({ $status }) => {
    if ($status === 'changes_requested') return 'rgba(239, 68, 68, 0.36)';
    if ($status === 'submitted') return 'rgba(59, 130, 246, 0.34)';
    if ($status === 'approved') return 'rgba(16, 185, 129, 0.34)';
    return 'rgba(245, 158, 11, 0.34)';
  }};
  color: ${({ $status }) => {
    if ($status === 'changes_requested') return '#ef4444';
    if ($status === 'submitted') return '#3b82f6';
    if ($status === 'approved') return '#10b981';
    return '#f59e0b';
  }};
  font-size: 11px;
  font-weight: 700;
`;

const SmallActionButton = styled.button<{ $variant?: 'approve' | 'reject' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid ${({ $variant }) => ($variant === 'reject' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.38)')};
  background: ${({ $variant }) => ($variant === 'reject' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.12)')};
  color: ${({ $variant }) => ($variant === 'reject' ? '#ef4444' : '#10b981')};
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const FundingInlineInput = styled.input`
  width: 104px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primaryHover};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent.primary}33;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const TeamSizeValue = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  min-width: 0;

  span {
    flex-shrink: 0;
    white-space: nowrap;
  }
`;
const AIAnalysisCard = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'light'
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0.96) 58%, rgba(16, 185, 129, 0.05) 100%)'
      : `linear-gradient(135deg, ${theme.colors.bg.card} 0%, rgba(16, 185, 129, 0.08) 100%)`};
  border: 1px solid ${({ theme }) => (theme.mode === 'light' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')};
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};
`;

const AIAnalysisBody = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
`;

const AIScoreBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const AIScoreValue = styled.div<{ $score?: number; $pending?: boolean; $empty?: boolean }>`
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: ${({ $score = 0, $pending, $empty }) => (
    $empty ? '#94a3b8' : $pending ? '#10b981' : $score >= 70 ? '#10b981' : $score >= 50 ? '#f59e0b' : '#ef4444'
  )};
`;

const AIScoreLabelText = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const AIAdviceBlock = styled.div`
  flex: 1;
  padding-top: 4px;
  min-width: 0;
`;

const AIAdviceTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AIAdviceText = styled.div`
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const AIAnalysisFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const AIAnalysisFooterLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const AIAnalysisFooterValue = styled.div<{ $hasValuation: boolean }>`
  font-size: ${({ $hasValuation }) => ($hasValuation ? '16px' : '12px')};
  font-weight: ${({ $hasValuation }) => ($hasValuation ? 700 : 500)};
  color: ${({ theme, $hasValuation }) => ($hasValuation ? theme.colors.text.primary : theme.colors.text.tertiary)};
  text-align: right;
`;

const AIScoreCircle = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.status.success};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
`;

const AIInfo = styled.div`
  flex: 1;
`;

const AILabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.status.success};
  font-weight: 600;
  margin-bottom: 2px;
`;

const AIValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 24px;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 14px; /* Center of 28px avatar */
    top: 28px;
    bottom: -12px;
    width: 2px;
    background: ${({ theme }) => theme.colors.border.secondary};
  }
`;

const TimelineDot = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 2px solid ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  position: relative;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ $color }) => $color};
  }
`;

const TimelineContent = styled.div`
  flex: 1;
  padding-top: 2px;
`;

const TimelineText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
  line-height: 1.5;
`;

const TimelineAvatarImg = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const TimelineAvatarFallback = styled.div<{ $bg?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || '#10b981'};
  color: white;
  font-size: 14px;
  font-weight: 700;
`;

const TimelineDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const AvatarStack = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const Avatar = styled.div<{ $bg?: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.bg.secondary};
  margin-left: -6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg || '#10b981'};
  color: white;
  font-size: 11px;
  font-weight: 600;

  &:first-child {
    margin-left: 0;
    z-index: 4;
  }
  &:nth-child(2) { z-index: 3; }
  &:nth-child(3) { z-index: 2; }
  &:nth-child(4) { z-index: 1; }
`;

const teamColors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

const normalizeExternalUrl = (url?: string | null): string => {
  return safeExternalHref(url) || '';
};

const StartupSheetSkeleton = () => (
  <>
    <SheetHeader>
      <HeaderContent>
        <Skeleton $width="64px" $height="64px" style={{ borderRadius: '16px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          <Skeleton $width="200px" $height="24px" />
          <Skeleton $width="120px" $height="16px" />
        </div>
      </HeaderContent>
    </SheetHeader>

    <div style={{ marginBottom: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', height: '100px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Skeleton $width="60px" $height="60px" $variant="circle" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton $width="80px" $height="14px" />
          <Skeleton $width="100%" $height="14px" />
          <Skeleton $width="80%" $height="14px" />
        </div>
      </div>
    </div>

    <Section>
      <Skeleton $width="60px" $height="14px" style={{ marginBottom: '12px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Skeleton $width="100%" $height="16px" />
        <Skeleton $width="100%" $height="16px" />
        <Skeleton $width="80%" $height="16px" />
      </div>
    </Section>

    <Section>
      <Grid>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <InfoCard key={i}>
            <Skeleton $width="60px" $height="14px" />
            <Skeleton $width="80px" $height="16px" />
          </InfoCard>
        ))}
      </Grid>
    </Section>

    <Section>
      <Skeleton $width="120px" $height="14px" style={{ marginBottom: '16px' }} />
      <TimelineContainer>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <Skeleton $width="28px" $height="28px" $variant="circle" />
            <div style={{ flex: 1 }}>
              <Skeleton $width="90%" $height="14px" style={{ marginBottom: '4px' }} />
              <Skeleton $width="40%" $height="12px" />
            </div>
          </div>
        ))}
      </TimelineContainer>
    </Section>
  </>
);

interface StartupDetailsSheetProps {
  startup: Startup | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: (id: string) => void;
  onStartupUpdate?: (startup: Startup) => void;
  onArchive?: (startup: Startup) => void;
  onRestore?: (startup: Startup) => void;
  onPermanentDelete?: (startup: Startup) => void;
}

const normalizeMoneyInput = (value: string): string => value.replace(/\D/g, '');

const formatMoneyInput = (value: string | number | null | undefined): string => {
  const digits = normalizeMoneyInput(String(value ?? ''));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const currentQuarter = (): QuarterlyReportQuarter => {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};

const defaultQuarterlyDueDate = (): string => {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return due.toISOString().slice(0, 10);
};

type DDReviewDraft = {
  status: DDReviewTrackStatus;
  reviewerId: string;
  reviewerName: string;
  dueDate: string;
  riskLevel: DDRiskLevel | '';
  score: string;
  conclusion: string;
};

const dateInputValue = (value?: string | Date | { _seconds?: number } | null): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return new Date(value._seconds * 1000).toISOString().slice(0, 10);
  }
  return '';
};

const normalizeDDScoreInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (!digits) return '';
  return String(Math.min(100, Number(digits)));
};

const ddTrackToDraft = (track?: DDReviewTrack): DDReviewDraft => ({
  status: track?.status || 'not_started',
  reviewerId: track?.reviewerId || '',
  reviewerName: track?.reviewerName || '',
  dueDate: dateInputValue(track?.dueDate as string | Date | { _seconds?: number } | undefined),
  riskLevel: track?.riskLevel || '',
  score: typeof track?.score === 'number' ? String(track.score) : '',
  conclusion: track?.conclusion || '',
});

const createDDReviewDrafts = (reviews?: Startup['ddReviews']): Record<DDReviewTrackKey, DDReviewDraft> => ({
  finance: ddTrackToDraft(reviews?.finance),
  legal: ddTrackToDraft(reviews?.legal),
  technical: ddTrackToDraft(reviews?.technical),
  team: ddTrackToDraft(reviews?.team),
  market: ddTrackToDraft(reviews?.market),
  corporate: ddTrackToDraft(reviews?.corporate),
  documents: ddTrackToDraft(reviews?.documents),
});

const createDDManualReviewerModes = (reviews?: Startup['ddReviews']): Record<DDReviewTrackKey, boolean> => ({
  finance: Boolean(reviews?.finance?.reviewerName && !reviews.finance.reviewerId),
  legal: Boolean(reviews?.legal?.reviewerName && !reviews.legal.reviewerId),
  technical: Boolean(reviews?.technical?.reviewerName && !reviews.technical.reviewerId),
  team: Boolean(reviews?.team?.reviewerName && !reviews.team.reviewerId),
  market: Boolean(reviews?.market?.reviewerName && !reviews.market.reviewerId),
  corporate: Boolean(reviews?.corporate?.reviewerName && !reviews.corporate.reviewerId),
  documents: Boolean(reviews?.documents?.reviewerName && !reviews.documents.reviewerId),
});

const removeUndefinedFields = <T extends Record<string, unknown>>(value: T): T => (
  Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as T
);

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const seconds = (value as { seconds?: unknown; _seconds?: unknown }).seconds ??
      (value as { seconds?: unknown; _seconds?: unknown })._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

interface CustomSelectOptionItem<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CustomSelectProps<T extends string> {
  value: T;
  options: Array<CustomSelectOptionItem<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
}

const CustomSelect = <T extends string>({ value, options, onChange, ariaLabel }: CustomSelectProps<T>) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <CustomSelectRoot ref={rootRef} $open={isOpen}>
      <CustomSelectButton
        type="button"
        $open={isOpen}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selected?.label || value}</span>
        <ChevronDown />
      </CustomSelectButton>
      {isOpen && (
        <CustomSelectMenu role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <CustomSelectOption
                key={option.value || 'empty'}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={option.disabled}
                $active={isActive}
                $disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {isActive ? <Check /> : <span aria-hidden="true" />}
                <CustomSelectOptionContent>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </CustomSelectOptionContent>
              </CustomSelectOption>
            );
          })}
        </CustomSelectMenu>
      )}
    </CustomSelectRoot>
  );
};

export const StartupDetailsSheet = ({ startup, isOpen, onClose, onOpenFull, onStartupUpdate, onArchive, onRestore, onPermanentDelete }: StartupDetailsSheetProps) => {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const canModify = permissions.canModifyStartups;
  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(600);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);

  const [cachedStartup, setCachedStartup] = useState<Startup | null>(startup);

  useEffect(() => {
    if (startup) {
      setCachedStartup(startup);
    }
  }, [startup]);

  const [freshDetail, setFreshDetail] = useState<Partial<Startup> | null>(null);

  useEffect(() => {
    const id = startup?.id;
    if (!id) return;
    let cancelled = false;
    setFreshDetail((prev) => (prev && prev.id === id ? prev : null));
    startupsApi
      .getById(id)
      .then((res) => {
        const data = res?.data;
        if (!cancelled && data && data.id === id) {
          setFreshDetail(data as unknown as Partial<Startup>);
        }
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, [startup?.id]);

  const baseStartup = startup || cachedStartup;
  const displayStartup =
    freshDetail && baseStartup && freshDetail.id === baseStartup.id
      ? { ...baseStartup, ...freshDetail }
      : baseStartup;

  const canEditDataRoom = Boolean(displayStartup) && canEditStartupDataRoomLink(
    permissions.role,
    displayStartup?.assignedManagerId,
    permissions.userId,
  );

  const handleDataRoomUrlChange = (dataRoomUrl: string | undefined) => {
    if (!displayStartup) return;
    const updatedStartup: Startup = { ...displayStartup, dataRoomUrl };
    setCachedStartup((current) => current?.id === displayStartup.id
      ? { ...current, dataRoomUrl }
      : current);
    setFreshDetail((current) => ({
      ...(current?.id === displayStartup.id ? current : { id: displayStartup.id }),
      dataRoomUrl,
    }));
    onStartupUpdate?.(updatedStartup);
  };

  const isLoading = useSimulatedLoad(displayStartup?.id || 'sheet-startup', 800);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 400), window.innerWidth - 200);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const { manager, organization } = useAuth();
  const isDirector = manager?.role === 'ceo' || manager?.role === 'deputy_investment' || (manager?.role as string) === 'admin';
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'history'>('notes');
  const [imgError, setImgError] = useState(false);

  const [editingFunding, setEditingFunding] = useState(false);
  const [fundingDraft, setFundingDraft] = useState('');
  const [editingFundConsideration, setEditingFundConsideration] = useState(false);
  const [fundConsiderationDraft, setFundConsiderationDraft] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChangeSet[]>([]);
  const [quarterlyReports, setQuarterlyReports] = useState<QuarterlyReport[]>([]);
  const [quarterlyRequests, setQuarterlyRequests] = useState<QuarterlyReportRequest[]>([]);
  const [quarterlyRequestForm, setQuarterlyRequestForm] = useState({
    year: String(new Date().getFullYear()),
    quarter: currentQuarter(),
    dueDate: defaultQuarterlyDueDate(),
    message: '',
  });
  const [creatingQuarterlyRequest, setCreatingQuarterlyRequest] = useState(false);
  const [remindingQuarterlyRequestId, setRemindingQuarterlyRequestId] = useState<string | null>(null);
  const [reviewingChangeId, setReviewingChangeId] = useState<string | null>(null);
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);
  const [reportReviewNotes, setReportReviewNotes] = useState<Record<string, string>>({});
  const [reportReviewErrors, setReportReviewErrors] = useState<Record<string, string>>({});
  const documentRequestsPanelRef = useRef<HTMLDivElement | null>(null);
  const [activeDDTrack, setActiveDDTrack] = useState<DDReviewTrackKey>('finance');
  const [ddDrafts, setDdDrafts] = useState<Record<DDReviewTrackKey, DDReviewDraft>>(createDDReviewDrafts());
  const [manualDDReviewerModes, setManualDDReviewerModes] = useState<Record<DDReviewTrackKey, boolean>>(createDDManualReviewerModes());
  const [savingDDTrack, setSavingDDTrack] = useState<DDReviewTrackKey | null>(null);
  const [ddTrackError, setDdTrackError] = useState('');
  const [generatingInvestmentMemo, setGeneratingInvestmentMemo] = useState(false);
  const [investmentMemoError, setInvestmentMemoError] = useState('');
  const [investmentMemoSubmitted, setInvestmentMemoSubmitted] = useState(false);
  const [investmentMemoSlow, setInvestmentMemoSlow] = useState(false);
  const memoBaselineGeneratedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!generatingInvestmentMemo) return;
    const id = startup?.id || cachedStartup?.id;
    if (!id) return;
    let cancelled = false;
    let timer = 0;
    const deadline = Date.now() + 8 * 60 * 1000;
    const baseline = memoBaselineGeneratedAtRef.current;
    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await startupsApi.getById(id);
        const data = res?.data as (Startup & Record<string, any>) | undefined;
        if (!cancelled && data && data.id === id) {
          const memo = (data as any).investmentMemo;
          const memoAt = memo?.generatedAt != null ? String(memo.generatedAt) : null;
          if (memo && memoAt && memoAt !== baseline) {
            setFreshDetail(data as unknown as Partial<Startup>);
            onStartupUpdate?.(data as unknown as Startup);
            setGeneratingInvestmentMemo(false);
            setInvestmentMemoSubmitted(false);
            return;
          }
        }
      } catch {
      }
      if (cancelled) return;
      if (Date.now() > deadline) {
        setInvestmentMemoSubmitted(false);
        setInvestmentMemoSlow(true);
        setGeneratingInvestmentMemo(false);
        return;
      }
      timer = window.setTimeout(poll, 8000);
    };
    timer = window.setTimeout(poll, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [generatingInvestmentMemo, startup?.id, cachedStartup?.id]);
  const [requestingSmartVal, setRequestingSmartVal] = useState(false);
  const [smartValRequestMessage, setSmartValRequestMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<Manager[]>([]);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = useState(false);

  const humanizeChangeField = (field: string): string => {
    const key = field.includes('.') ? field.split('.').pop()! : field;
    const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const formatDiffValue = (value: unknown, field?: string): string => {
    if (value === undefined || value === null || value === '') return t('common.notSpecified', 'Not specified');
    const key = field ? (field.includes('.') ? field.split('.').pop()! : field) : '';

    if (Array.isArray(value)) {
      if (value.length === 0) return t('common.notSpecified', 'Not specified');
      if (key === 'teamMembers') {
        return value.map((m: any) => {
          const name = [m?.firstName, m?.lastName].filter(Boolean).join(' ').trim();
          const role = String(m?.role || '').split('/')[0].trim();
          return [name || m?.email || '—', role ? `(${role})` : ''].filter(Boolean).join(' ');
        }).join('; ');
      }
      if (key === 'investments') {
        return value.map((inv: any) => {
          const lead = (Array.isArray(inv?.investors) && inv.investors[0]) || inv || {};
          const who = lead.investorName || inv?.investorName || '—';
          const amt = lead.amount ?? inv?.amount;
          const cur = lead.currency || inv?.currency || '';
          const when = inv?.date || lead?.date || '';
          const money = amt ? `${cur} ${Number(amt).toLocaleString()}`.trim() : '';
          return [who, money, when].filter(Boolean).join(' · ');
        }).join('; ');
      }
      return value
        .map((v) => (v && typeof v === 'object'
          ? ((Object.values(v as Record<string, unknown>).find((x) => typeof x === 'string' && x) as string) || '—')
          : String(v)))
        .join('; ');
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v && typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join(', ');
    }

    return String(value);
  };

  const pendingChangeRows = (change: PendingChangeSet): Array<{ field: string; oldValue?: unknown; newValue?: unknown }> => {
    if (Array.isArray(change.changes)) return change.changes;
    if (change.fieldChanges) {
      return Object.entries(change.fieldChanges).map(([field, values]) => ({
        field,
        oldValue: values.oldValue,
        newValue: values.newValue,
      }));
    }
    if (change.patch) {
      return Object.entries(change.patch).map(([field, newValue]) => ({ field, newValue }));
    }
    return Object.entries(change.changes || {}).map(([field, newValue]) => ({ field, newValue }));
  };

  useEffect(() => {
    if (!isOpen || !displayStartup?.id) {
      setPendingChanges([]);
      setQuarterlyReports([]);
      setQuarterlyRequests([]);
      setInvestmentMemoError('');
      return;
    }

    setInvestmentMemoError('');
    let cancelled = false;
    const loadReviewData = async () => {
      const [changesResponse, reportsResponse, requestsResponse] = await Promise.all([
        cabinetApi.getPendingChanges(displayStartup.id),
        cabinetApi.getStartupReports(displayStartup.id),
        cabinetApi.getStartupReportRequests(displayStartup.id),
      ]);
      if (cancelled) return;
      if (changesResponse.success) {
        setPendingChanges((changesResponse.data || []).filter(
          (change) => change.status === 'pending' || change.status === 'manager_approved',
        ));
      }
      if (reportsResponse.success) {
        setQuarterlyReports(reportsResponse.data || []);
      }
      if (requestsResponse.success) {
        setQuarterlyRequests(requestsResponse.data || []);
      }
    };

    loadReviewData().catch((error) => {
      console.error('Failed to load startup review data', error);
    });

    return () => {
      cancelled = true;
    };
  }, [displayStartup?.id, isOpen]);

  useEffect(() => {
    if (!displayStartup?.id) return;
    setDdDrafts(createDDReviewDrafts(displayStartup.ddReviews));
    setManualDDReviewerModes(createDDManualReviewerModes(displayStartup.ddReviews));
    setActiveDDTrack('finance');
    setSavingDDTrack(null);
    setDdTrackError('');
  }, [displayStartup?.id]);

  useEffect(() => {
    const organizationId = organization?.id || manager?.organizationId || (displayStartup as { organizationId?: string } | null)?.organizationId;
    if (!isOpen || !organizationId) {
      setTeamMembers([]);
      return;
    }

    let cancelled = false;
    setIsLoadingTeamMembers(true);
    teamApi.getMembers(organizationId)
      .then((response) => {
        if (cancelled) return;
        setTeamMembers((response.success ? response.data || [] : []).filter((member) => member.isActive !== false));
      })
      .catch((error) => {
        console.error('Failed to load team members for DD reviewer select', error);
        if (!cancelled) setTeamMembers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTeamMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [displayStartup?.id, isOpen, manager?.organizationId, organization?.id]);

  const reviewPendingChange = async (change: PendingChangeSet, action: 'approve' | 'reject') => {
    if (!displayStartup || !change.id) return;
    const useDirectorEndpoint = isDirector;
    setReviewingChangeId(change.id);
    try {
      const review = { action, reviewedBy: manager?.id, reviewedByName: manager?.name };
      const response = useDirectorEndpoint
        ? await cabinetApi.directorReviewPendingChange(displayStartup.id, change.id, review)
        : await cabinetApi.reviewPendingChange(displayStartup.id, change.id, review);
      if (!response.success) throw new Error(response.error || 'review_failed');

      if (!useDirectorEndpoint && action === 'approve') {
        setPendingChanges((items) => items.map((item) => (
          item.id === change.id
            ? { ...item, status: 'manager_approved', managerReviewedByName: manager?.name }
            : item
        )));
      } else {
        setPendingChanges((items) => items.filter((item) => item.id !== change.id));
        const base = typeof displayStartup.pendingChangeCount === 'number'
          ? displayStartup.pendingChangeCount
          : pendingChanges.length;
        onStartupUpdate?.({ ...displayStartup, pendingChangeCount: Math.max(0, base - 1) });
      }
    } catch (error) {
      console.error('Failed to review pending change', error);
    } finally {
      setReviewingChangeId(null);
    }
  };

  const reviewQuarterlyReport = async (report: QuarterlyReport, status: QuarterlyReport['status']) => {
    if (!displayStartup) return;
    setReviewingReportId(report.id);
    try {
      const reviewNote = (reportReviewNotes[report.id] || '').trim();
      if (status === 'changes_requested' && !reviewNote) {
        setReportReviewErrors((items) => ({
          ...items,
          [report.id]: t('reports.quarterly.reviewNoteRequired', 'Укажите комментарий для стартапера'),
        }));
        return;
      }
      const response = await cabinetApi.reviewStartupReport(displayStartup.id, report.id, {
        status,
        ...(status === 'changes_requested' ? { reviewNote } : {}),
        reviewedBy: manager?.id,
        reviewedByName: manager?.name,
        locale: i18n.language,
      });
      if (!response.success || !response.data) throw new Error(response.error || 'report_review_failed');
      setQuarterlyReports((items) => items.map((item) => (item.id === report.id ? response.data! : item)));
      setReportReviewErrors((items) => ({ ...items, [report.id]: '' }));
      if (response.data.requestId) {
        setQuarterlyRequests((items) => items.map((item) => (
          item.id === response.data!.requestId
            ? { ...item, status: response.data!.status === 'approved' ? 'approved' : response.data!.status === 'changes_requested' ? 'changes_requested' : item.status, reviewNote }
            : item
        )));
      }
      setReportReviewNotes((items) => ({ ...items, [report.id]: '' }));
      onStartupUpdate?.({
        ...displayStartup,
        lastQuarterlyReportId: response.data.id,
        lastQuarterlyReportRequestId: response.data.requestId,
        lastQuarterlyReportPeriod: response.data.period,
        lastQuarterlyReportStatus: response.data.status,
        lastQuarterlyReportReviewedAt: response.data.reviewedAt,
      } as Startup);
    } catch (error) {
      console.error('Failed to review quarterly report', error);
    } finally {
      setReviewingReportId(null);
    }
  };

  const quarterlyRequestStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      requested: t('reports.status.requested', 'Запрошен'),
      submitted: t('reports.status.submitted', 'Отправлен'),
      approved: t('reports.status.approved', 'Принят'),
      changes_requested: t('reports.status.changes_requested', 'Нужны правки'),
      cancelled: t('reports.status.cancelled', 'Отменён'),
    };
    return labels[status] || status;
  };

  const createQuarterlyRequest = async () => {
    if (!displayStartup) return;
    const year = Number(quarterlyRequestForm.year);
    if (!Number.isFinite(year)) return;
    setCreatingQuarterlyRequest(true);
    try {
      const response = await cabinetApi.createStartupReportRequest(displayStartup.id, {
        year,
        quarter: quarterlyRequestForm.quarter as QuarterlyReportQuarter,
        dueDate: quarterlyRequestForm.dueDate || undefined,
        message: quarterlyRequestForm.message.trim() || undefined,
        managerId: manager?.id,
        managerName: manager?.name,
        locale: i18n.language,
      });
      if (!response.success || !response.data) throw new Error(response.error || 'quarterly_request_failed');
      setQuarterlyRequests((items) => [response.data!, ...items]);
      setQuarterlyRequestForm((current) => ({ ...current, message: '' }));
      onStartupUpdate?.({
        ...displayStartup,
        lastQuarterlyReportRequestId: response.data.id,
        lastQuarterlyReportPeriod: response.data.period,
        lastQuarterlyReportStatus: response.data.status,
      } as Startup);
    } catch (error) {
      console.error('Failed to create quarterly report request', error);
    } finally {
      setCreatingQuarterlyRequest(false);
    }
  };

  const remindQuarterlyRequest = async (request: QuarterlyReportRequest) => {
    if (!displayStartup) return;
    setRemindingQuarterlyRequestId(request.id);
    try {
      const response = await cabinetApi.remindStartupReportRequest(displayStartup.id, request.id, {
        managerId: manager?.id,
        managerName: manager?.name,
        locale: i18n.language,
      });
      if (!response.success || !response.data) throw new Error(response.error || 'quarterly_reminder_failed');
      setQuarterlyRequests((items) => items.map((item) => (
        item.id === request.id ? { ...item, remindedAt: response.data!.remindedAt } : item
      )));
    } catch (error) {
      console.error('Failed to remind quarterly report request', error);
    } finally {
      setRemindingQuarterlyRequestId(null);
    }
  };

  const quarterlyMetricRows = (report: QuarterlyReport): Array<{ label: string; value: string }> => {
    const metrics = report.metrics || {};
    const rows: Array<{ key: keyof typeof metrics; label: string; suffix?: string }> = [
      { key: 'mrr', label: 'MRR' },
      { key: 'arr', label: 'ARR' },
      { key: 'revenue', label: t('reports.quarterly.revenue', 'Revenue') },
      { key: 'burn', label: t('reports.quarterly.burn', 'Burn') },
      { key: 'runway', label: t('reports.quarterly.runway', 'Runway'), suffix: t('startupDetail.sheet.monthShort', 'mo.') },
    ];

    return rows.flatMap(({ key, label, suffix }) => {
      const value = metrics[key];
      const numericValue = Number(value);
      if (value === null || value === undefined || !Number.isFinite(numericValue)) return [];
      return [{ label, value: `${numericValue.toLocaleString(numberLocale(i18n.language))}${suffix ? ` ${suffix}` : ''}` }];
    });
  };

  const updateDDDraft = (key: DDReviewTrackKey, patch: Partial<DDReviewDraft>) => {
    setDdDrafts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
    setDdTrackError('');
  };

  const saveDDReviewTrack = async (key: DDReviewTrackKey) => {
    if (!displayStartup) return;
    const draft = ddDrafts[key];
    const scoreText = draft.score.trim();
    const score = scoreText ? Number(scoreText) : undefined;
    if (scoreText && (!Number.isFinite(score) || score! < 0 || score! > 100)) {
      setDdTrackError(t('startups.dd.scoreError', 'Score должен быть от 0 до 100'));
      return;
    }

    setSavingDDTrack(key);
    setDdTrackError('');
    try {
      const previousTrack = displayStartup.ddReviews?.[key];
      const reviewerId = draft.reviewerId.trim();
      const reviewerName = draft.reviewerName.trim();
      const nextTrack = removeUndefinedFields({
        ...previousTrack,
        status: draft.status,
        reviewerId: reviewerName ? (reviewerId || undefined) : undefined,
        reviewerName: reviewerName || undefined,
        dueDate: draft.dueDate || undefined,
        riskLevel: draft.riskLevel || undefined,
        score,
        conclusion: draft.conclusion.trim() || undefined,
        updatedAt: new Date().toISOString(),
      }) as DDReviewTrack;
      const nextDDReviews = {
        ...(displayStartup.ddReviews || {}),
        [key]: nextTrack,
      };

      const response = await startupsApi.updateDDReviewTrack(displayStartup.id, key, {
        ...nextTrack,
        reviewerId: reviewerId || '',
        reviewerName: reviewerName || '',
        managerId: manager?.id,
        managerName: manager?.name,
      } as any);
      if (!response.success) throw new Error(response.error || 'dd_review_update_failed');
      const updatedStartup = {
        ...displayStartup,
        ...((response.data || {}) as unknown as Partial<Startup>),
        ddReviews: ((response.data as any)?.ddReviews || nextDDReviews) as Startup['ddReviews'],
      } as Startup;
      onStartupUpdate?.(updatedStartup);
    } catch (error) {
      console.error('Failed to update DD review track', error);
      setDdTrackError(t('startups.dd.saveError', 'Не удалось сохранить DD'));
    } finally {
      setSavingDDTrack(null);
    }
  };

  const scrollToDocumentRequests = () => {
    documentRequestsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveFundingRequest = async () => {
    if (!displayStartup) return;
    const val = Number(normalizeMoneyInput(fundingDraft));
    if (isNaN(val) || val < 0) return;
    try {
      await startupsApi.update(displayStartup.id, { brief: { ...displayStartup.brief, fundingRequest: val, itpvFundingRequest: val } });
      onStartupUpdate?.({ ...displayStartup, brief: { ...displayStartup.brief, fundingRequest: val, itpvFundingRequest: val } });
    } catch (e) {
      console.error('Failed to update fundingRequest', e);
    } finally {
      setEditingFunding(false);
    }
  };

  const saveFundConsiderationAmount = async () => {
    if (!displayStartup) return;
    const normalized = normalizeMoneyInput(fundConsiderationDraft);
    const parsed = normalized ? Number(normalized) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return;
    const fundConsiderationAmount = parsed && parsed > 0 ? parsed : undefined;
    try {
      const response = await startupsApi.update(displayStartup.id, {
        fundConsiderationAmount: fundConsiderationAmount ?? null,
      } as any);
      if (!response.success) throw new Error(response.error || 'fund_consideration_update_failed');
      const updatedStartup = { ...displayStartup, fundConsiderationAmount } as Startup;
      setCachedStartup((current) => current?.id === displayStartup.id
        ? { ...current, fundConsiderationAmount }
        : current);
      setFreshDetail((current) => ({
        ...(current?.id === displayStartup.id ? current : { id: displayStartup.id }),
        fundConsiderationAmount,
      }));
      onStartupUpdate?.(updatedStartup);
    } catch (error) {
      console.error('Failed to update fund consideration amount', error);
    } finally {
      setEditingFundConsideration(false);
    }
  };

  useEffect(() => {
    setImgError(false);
  }, [displayStartup?.id]);

  if (!displayStartup) return null;

  const analysisDisplay = getStartupAnalysisDisplay(displayStartup);
  const isFundGateAnalysisPending = analysisDisplay.isPending;
  const canManageDueDiligence = displayStartup.status === 'pipeline';
  const canManageQuarterlyReports = displayStartup.status === 'portfolio';
  const investmentMemo = displayStartup.investmentMemo;
  const isInvestmentMemoAvailable = displayStartup.status === 'pipeline' && !displayStartup.isArchived;
  const smartValDetails = (displayStartup as any).smartValDetails || {};
  const smartValEvaluation = (displayStartup as any).smartValEvaluation || (displayStartup as any).smartvalEvaluation || {};
  const smartValResult = (displayStartup as any).smartValResult || (displayStartup as any).smartvalResult || (displayStartup as any).smartVal || (displayStartup as any).smartval || {};
  const smartValValuationDisplay = formatSmartValValuation(smartValDetails, smartValResult, smartValEvaluation);
  const hasSmartValEvaluation = Boolean(
    smartValValuationDisplay ||
    smartValDetails.method ||
    smartValResult.method ||
    smartValEvaluation.method ||
    smartValEvaluation.aiAnalysis?.valuation ||
    smartValEvaluation.ai_analysis?.valuation
  );
  const investmentMemoGeneratedAtRaw = displayStartup.investmentMemoGeneratedAt || investmentMemo?.generatedAt;
  const investmentMemoGeneratedAtDate = toDateOrNull(investmentMemoGeneratedAtRaw);
  const investmentMemoGeneratedWithin24h = Boolean(
    investmentMemoGeneratedAtDate &&
    Date.now() - investmentMemoGeneratedAtDate.getTime() < 24 * 60 * 60 * 1000
  );
  const canGenerateInvestmentMemo = isInvestmentMemoAvailable && hasSmartValEvaluation && !investmentMemoGeneratedWithin24h && !generatingInvestmentMemo;
  const investmentMemoDisabledReason = !hasSmartValEvaluation
    ? t(
      'startups.investmentMemo.smartValRequired',
      'SmartVal evaluation is required before investment memo. Run SmartVal valuation first so the memo agent can use saved SmartVal fields and AI results.'
    )
    : investmentMemoGeneratedWithin24h
      ? t('startups.investmentMemo.dailyLimit', 'Investment memo can be generated once per startup per day.')
      : '';
  const investmentMemoPreview = investmentMemo?.markdown
    ? `${investmentMemo.markdown.slice(0, 3000)}${investmentMemo.markdown.length > 3000 ? '\n...' : ''}`
    : '';
  const investmentMemoVisualAssetCount = investmentMemo?.visualAssets
    ? (investmentMemo.visualAssets.charts || []).length +
      (investmentMemo.visualAssets.generatedImages || []).length
    : 0;
  const investmentMemoPendingVisualCount = investmentMemo?.visualAssets?.visualToolStatus === 'not_configured'
    ? (investmentMemo.visualAssets.imagePrompts || []).length
    : 0;
  const investmentMemoVisualToolStatus = investmentMemo?.visualAssets?.visualToolStatus;
  const investmentMemoDecisionLabel = (decision?: string): string => {
    if (!decision) return '';
    return t(`startups.investmentMemo.decision.${decision}`, decision);
  };

  const ddTrackPreview = (key: DDReviewTrackKey): DDReviewTrack => {
    const savedTrack = displayStartup.ddReviews?.[key];
    const draft = ddDrafts[key];
    return removeUndefinedFields({
      ...savedTrack,
      status: draft.status,
      reviewerId: draft.reviewerId.trim() || undefined,
      reviewerName: draft.reviewerName.trim() || undefined,
      dueDate: draft.dueDate || undefined,
      riskLevel: draft.riskLevel || undefined,
      score: draft.score.trim() ? Number(draft.score) : undefined,
      conclusion: draft.conclusion.trim() || undefined,
    }) as DDReviewTrack;
  };

  const ddItems: Array<{ key: DDReviewTrackKey; title: string; icon: typeof DollarSign; track: DDReviewTrack }> = [
    {
      key: 'finance',
      title: t('startups.dd.finance', 'Finance'),
      icon: DollarSign,
      track: ddTrackPreview('finance'),
    },
    {
      key: 'legal',
      title: t('startups.dd.legal', 'Legal'),
      icon: Scale,
      track: ddTrackPreview('legal'),
    },
    {
      key: 'technical',
      title: t('startups.dd.technical', 'Technical'),
      icon: Cpu,
      track: ddTrackPreview('technical'),
    },
    {
      key: 'team',
      title: t('startups.dd.team', 'Team'),
      icon: Users,
      track: ddTrackPreview('team'),
    },
    {
      key: 'market',
      title: t('startups.dd.market', 'Market'),
      icon: Globe,
      track: ddTrackPreview('market'),
    },
    {
      key: 'corporate',
      title: t('startups.dd.corporate', 'Corporate'),
      icon: Building2,
      track: ddTrackPreview('corporate'),
    },
    {
      key: 'documents',
      title: t('startups.dd.documents', 'Documents'),
      icon: FileText,
      track: ddTrackPreview('documents'),
    },
  ];
  const activeDDItem = ddItems.find((item) => item.key === activeDDTrack) || ddItems[0];
  const activeDDDraft = ddDrafts[activeDDTrack];
  const ActiveDDIcon = activeDDItem.icon;
  const ddStatusOptions: Array<CustomSelectOptionItem<DDReviewTrackStatus>> = (['not_started', 'in_progress', 'completed', 'blocked'] as DDReviewTrackStatus[]).map((status) => ({
    value: status,
    label: t(`startups.dd.status.${status}`, status),
  }));
  const ddRiskOptions: Array<CustomSelectOptionItem<DDRiskLevel | ''>> = [
    { value: '', label: t('common.notSpecified', 'Не указано') },
    ...(['low', 'medium', 'high', 'critical'] as DDRiskLevel[]).map((risk) => ({
      value: risk,
      label: t(`startups.dd.risk.${risk}`, risk),
    })),
  ];
  const ddPreferredRoles: Record<DDReviewTrackKey, UserRole[]> = {
    finance: ['financier'],
    legal: ['lawyer'],
    technical: ['tech_specialist'],
    team: ['manager_investment', 'deputy_investment', 'ceo'],
    market: ['manager_investment', 'deputy_investment', 'ceo'],
    corporate: ['lawyer', 'deputy_investment'],
    documents: ['manager_investment', 'lawyer', 'financier'],
  };
  const ddPreferredRoleLabel: Record<DDReviewTrackKey, string> = {
    finance: t('startups.dd.preferred.finance', 'финансиста'),
    legal: t('startups.dd.preferred.legal', 'юриста'),
    technical: t('startups.dd.preferred.technical', 'тех. специалиста'),
    team: t('startups.dd.preferred.team', 'инвест. менеджера'),
    market: t('startups.dd.preferred.market', 'инвест. менеджера'),
    corporate: t('startups.dd.preferred.corporate', 'юриста'),
    documents: t('startups.dd.preferred.documents', 'ответственного'),
  };
  const activeTeamMembers = teamMembers.filter((member) => member.isActive !== false);
  const formatTeamMemberRole = (member: Manager): string => {
    const role = member.role as UserRole;
    return member.position || (role ? t(`roles.${role}`, ROLE_LABELS[role] || member.role) : member.role);
  };
  const teamMemberOption = (member: Manager): CustomSelectOptionItem<string> => ({
    value: `manager:${member.id}`,
    label: member.name,
    description: formatTeamMemberRole(member),
  });
  const getDDReviewerOptions = (key: DDReviewTrackKey, draft: DDReviewDraft): Array<CustomSelectOptionItem<string>> => {
    const preferredRoles = ddPreferredRoles[key];
    const preferredMembers = activeTeamMembers.filter((member) => preferredRoles.includes(member.role as UserRole));
    const otherMembers = activeTeamMembers.filter((member) => !preferredRoles.includes(member.role as UserRole));
    const selectedMember = draft.reviewerId
      ? activeTeamMembers.find((member) => member.id === draft.reviewerId)
      : undefined;
    const reviewerName = draft.reviewerName.trim();
    const options: Array<CustomSelectOptionItem<string>> = [
      {
        value: '',
        label: t('startups.dd.noReviewer', 'Не назначено'),
        description: t('startups.dd.noReviewerHint', 'Ответственного можно выбрать позже'),
      },
      {
        value: '__manual__',
        label: t('startups.dd.manualReviewer', 'Ввести вручную'),
        description: t('startups.dd.manualReviewerInputHint', 'Имя и фамилия без аккаунта сотрудника'),
      },
    ];

    if (draft.reviewerId && !selectedMember) {
      options.push({
        value: `manager:${draft.reviewerId}`,
        label: reviewerName ? t('startups.dd.currentReviewer', 'Текущий: {{name}}', { name: reviewerName }) : t('startups.dd.currentUnknownReviewer', 'Текущий сотрудник'),
        description: t('startups.dd.reviewerNotFound', 'Не найден в списке активных сотрудников'),
        disabled: true,
      });
    } else if (!draft.reviewerId && reviewerName) {
      options.push({
        value: `custom:${reviewerName}`,
        label: t('startups.dd.currentReviewer', 'Текущий: {{name}}', { name: reviewerName }),
        description: t('startups.dd.manualReviewerHint', 'Старое значение без привязки к сотруднику'),
      });
    }

    if (isLoadingTeamMembers) {
      options.push({
        value: '__loading__',
        label: t('common.loading', 'Загрузка...'),
        description: t('startups.dd.loadingTeam', 'Получаем сотрудников фонда'),
        disabled: true,
      });
      return options;
    }

    if (preferredMembers.length > 0) {
      options.push(...preferredMembers.map(teamMemberOption));
    } else {
      options.push({
        value: `__empty_${key}`,
        label: t('startups.dd.noPreferredRole', 'В фонде нет {{role}}', { role: ddPreferredRoleLabel[key] }),
        description: t('startups.dd.noPreferredRoleHint', 'Добавьте роль в настройках или назначьте другого сотрудника'),
        disabled: true,
      });
    }

    if (otherMembers.length > 0) {
      options.push({
        value: `__other_${key}`,
        label: t('startups.dd.assignOther', 'Другой сотрудник фонда'),
        disabled: true,
      });
      options.push(...otherMembers.map(teamMemberOption));
    } else if (preferredMembers.length === 0) {
      options.push({
        value: `__no_other_${key}`,
        label: t('startups.dd.noOtherEmployees', 'Других сотрудников фонда тоже нет'),
        description: t('startups.dd.noOtherEmployeesHint', 'Сначала добавьте сотрудника в настройках'),
        disabled: true,
      });
    }

    return options;
  };
  const isManualDDReviewer = manualDDReviewerModes[activeDDTrack];
  const activeDDReviewerValue = isManualDDReviewer
    ? '__manual__'
    : activeDDDraft.reviewerId
      ? `manager:${activeDDDraft.reviewerId}`
      : activeDDDraft.reviewerName.trim()
        ? `custom:${activeDDDraft.reviewerName.trim()}`
        : '';
  const ddReviewerOptions = getDDReviewerOptions(activeDDTrack, activeDDDraft);
  const handleDDReviewerChange = (value: string) => {
    if (!value) {
      setManualDDReviewerModes((current) => ({ ...current, [activeDDTrack]: false }));
      updateDDDraft(activeDDTrack, { reviewerId: '', reviewerName: '' });
      return;
    }
    if (value === '__manual__' || value.startsWith('custom:')) {
      setManualDDReviewerModes((current) => ({ ...current, [activeDDTrack]: true }));
      updateDDDraft(activeDDTrack, {
        reviewerId: '',
        reviewerName: value.startsWith('custom:') ? value.replace('custom:', '') : '',
      });
      return;
    }
    if (!value.startsWith('manager:')) return;
    const reviewerId = value.replace('manager:', '');
    const reviewer = activeTeamMembers.find((member) => member.id === reviewerId);
    if (!reviewer) return;
    setManualDDReviewerModes((current) => ({ ...current, [activeDDTrack]: false }));
    updateDDDraft(activeDDTrack, { reviewerId: reviewer.id, reviewerName: reviewer.name });
  };
  const quarterOptions: Array<CustomSelectOptionItem<QuarterlyReportQuarter>> = (['Q1', 'Q2', 'Q3', 'Q4'] as QuarterlyReportQuarter[]).map((quarter) => ({
    value: quarter,
    label: quarter,
  }));
  const crossFundApplications = (displayStartup.crossFundApplications || []).filter(
    (a) => a.organizationId !== 'org-platform',
  );

  const formatDate = (date: Date | string | { _seconds: number } | undefined): string => {
    if (!date) return '';
    let d: Date;
    if (typeof date === 'object' && '_seconds' in date) {
      d = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    return `${formatShortDate(d, i18n.language)} ${t('startupDetail.sheet.timeAt')} ${formatTime(d, i18n.language)}`;
  };

  const formatStage = (stage?: string): string => {
    const value = stage?.trim();
    if (!value) return '-';

    const keyByStage: Record<string, string> = {
      Idea: 'startupDetail.sheet.stages.idea',
      'Идея': 'startupDetail.sheet.stages.idea',
      MVP: 'startupDetail.sheet.stages.mvp',
      'MVP ready': 'startupDetail.sheet.stages.mvpReady',
      'MVP готов': 'startupDetail.sheet.stages.mvpReady',
      Prototype: 'startupDetail.sheet.stages.prototype',
      'Прототип': 'startupDetail.sheet.stages.prototype',
      'First customers': 'startupDetail.sheet.stages.firstCustomers',
      'Есть первые клиенты': 'startupDetail.sheet.stages.firstCustomers',
      Growth: 'startupDetail.sheet.stages.growth',
      'Растущий бизнес': 'startupDetail.sheet.stages.growthBusiness',
      'Pre-Seed': 'startupDetail.sheet.stages.preSeed',
      Seed: 'startupDetail.sheet.stages.seed',
      'Series A': 'startupDetail.sheet.stages.roundA',
      'Series B': 'startupDetail.sheet.stages.roundB',
      'Series C': 'startupDetail.sheet.stages.roundC',
    };

    const translationKey = keyByStage[value];
    return translationKey ? t(translationKey) : stageLabels[value as keyof typeof stageLabels] || value;
  };

  const buildTimeline = () => {
    const items: Array<{
      type: string;
      content: React.ReactNode;
      date: string;
      avatar?: string;
      avatarBg?: string;
      avatarInitial?: string;
      createdAt: Date;
      isInternal?: boolean;
    }> = [];

    if (displayStartup.activityLog && Array.isArray(displayStartup.activityLog)) {
      displayStartup.activityLog.forEach((log: any) => {
        const actionLabels: Record<string, string> = {
          'created': t('startupDetail.sheet.actions.created'),
          'status_changed': t('startupDetail.sheet.actions.statusChanged'),
          'status_change': t('startupDetail.sheet.actions.statusChange'),
          'assigned': t('startupDetail.sheet.actions.assigned'),
          'comment_added': t('startupDetail.sheet.actions.commentAdded'),
          'commented': t('startupDetail.sheet.actions.commented'),
          'comment': t('startupDetail.sheet.actions.commented'),
          'status_new': t('startupDetail.sheet.actions.statusNew'),
          'status_in_review': t('startupDetail.sheet.actions.statusInReview'),
          'moved_to_review': t('startupDetail.sheet.actions.statusInReview'),
          'status_pipeline': t('startupDetail.sheet.actions.statusPipeline'),
          'moved_to_pipeline': t('startupDetail.sheet.actions.statusPipeline'),
          'status_portfolio': t('startupDetail.sheet.actions.statusPortfolio'),
          'status_rejected': t('startupDetail.sheet.actions.statusRejected'),
          'file_uploaded': t('startupDetail.sheet.actions.fileUploaded'),
          'pitchDeck_uploaded': t('startupDetail.sheet.actions.pitchDeckUploaded'),
          'onePager_uploaded': t('startupDetail.sheet.actions.onePagerUploaded'),
          'financialModel_uploaded': t('startupDetail.sheet.actions.financialModelUploaded'),
          'deal_closed': t('startupDetail.sheet.actions.dealClosed'),
          'updated': t('startupDetail.sheet.actions.updated'),
        };

        const logDate = log.createdAt?._seconds
          ? new Date(log.createdAt._seconds * 1000)
          : new Date(log.createdAt || new Date());

        const isFullDetails = Boolean(log.details && ['created', 'status_new', 'file_uploaded', 'updated'].includes(log.action));

        items.push({
          type: log.action || 'activity',
          content: (
            <>
              {log.managerName ? (
                <>{t('common.manager')} <span style={{ color: '#ffffff', fontWeight: 600 }}>{log.managerName}</span></>
              ) : log.founderName ? (
                <>{t('startupDetail.founder')} <span style={{ color: '#ffffff', fontWeight: 600 }}>{log.founderName}</span></>
              ) : (
                <>{t('startupDetail.sheet.system')}</>
              )}
              {' '}
              {isFullDetails ? (
                <span style={{ color: '#10b981' }}>{log.details}</span>
              ) : (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{actionLabels[log.action] || log.action}</span>
                  {log.details && (
                    <span style={{ color: '#10b981', fontWeight: 600, marginLeft: '4px' }}>{log.details}</span>
                  )}
                </>
              )}
            </>
          ),
          date: formatDate(log.createdAt),
          avatar: log.managerAvatar,
          createdAt: logDate,
        });
      });
    }

    if (displayStartup.comments && Array.isArray(displayStartup.comments)) {
      displayStartup.comments.forEach((comment: any) => {
        const commentDate = comment.createdAt?._seconds
          ? new Date(comment.createdAt._seconds * 1000)
          : new Date(comment.createdAt || new Date());

        const isFounder = comment.senderType === 'founder';
        const authorName = isFounder
          ? (comment.senderName || t('startups.comments.founderLabel'))
          : (comment.managerName || comment.senderName || t('common.manager'));
        const avatarBg = isFounder ? '#3B82F6' : '#10b981';
        const avatarInitial = authorName.charAt(0).toUpperCase();
        const chipLabel = isFounder
          ? t('startups.comments.founderLabel')
          : t('startups.comments.managerLabel');
        const chipVariant: 'info' | 'success' = isFounder ? 'info' : 'success';

        items.push({
          type: 'comment',
          isInternal: !!comment.isInternal,
          content: (
            <>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{authorName}</span>
              {' '}
              <Badge variant={chipVariant}>{chipLabel}</Badge>
              {' '}
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('dashboard.actions.commented')}:</span>
              <div style={{ marginTop: 8, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontSize: '14px' }}>
                "{comment.text}"
              </div>
            </>
          ),
          date: formatDate(comment.createdAt),
          avatar: isFounder ? undefined : comment.managerAvatar,
          avatarBg,
          avatarInitial,
          createdAt: commentDate,
        });
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return items;
  };

  const timeline = buildTimeline();

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !manager || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await startupsApi.addComment(displayStartup.id, {
        managerId: manager.id,
        managerName: manager.name,
        managerAvatar: manager.avatar,
        text: commentText.trim(),
        isInternal: true,
      } as any);

      if (response.success && response.data) {
        const newComment = response.data as any;
        setCommentText('');

        if (onStartupUpdate && startup) {
          const updatedStartup = {
            ...startup,
            comments: [
              ...(startup.comments || []),
              {
                id: newComment.id,
                senderType: 'manager',
                senderName: manager.name,
                managerId: manager.id,
                managerName: manager.name,
                managerAvatar: manager.avatar,
                text: commentText.trim(),
                isInternal: true,
                createdAt: new Date(),
              }
            ]
          } as any;
          onStartupUpdate(updatedStartup);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignManager = async (managerId: string, managerName: string) => {
    if (!displayStartup) return;
    setReassignModalOpen(false);
    try {
      const response = await startupsApi.update(displayStartup.id, { assignedManagerId: managerId } as any);
      if (!response.success) {
        toast.error(response.error || t('startupDetail.sheet.assignManagerError', 'Не удалось назначить менеджера'));
        return;
      }
      await startupsApi.addActivity(displayStartup.id, {
        action: 'assigned',
        managerId: manager?.id,
        managerName: manager?.name,
        details: t('startupDetail.sheet.assignedManagerDetails', { managerName }),
      });
      if (onStartupUpdate) {
        onStartupUpdate({ ...displayStartup, assignedManagerId: managerId } as any);
      }
    } catch (error) {
      console.error('Failed to reassign manager:', error);
    }
  };

  const handleStartChat = () => {
    if (!displayStartup) return;
    onClose();
    navigate(`/chats/${displayStartup.id}`);
  };

  const handleGenerateInvestmentMemo = async (includeVisuals = false) => {
    if (!displayStartup || generatingInvestmentMemo) return;
    if (!canGenerateInvestmentMemo) {
      setInvestmentMemoError(investmentMemoDisabledReason || t(
        'startups.investmentMemo.pipelineOnly',
        'Investment memo is available only when the startup is in pipeline.'
      ));
      return;
    }
    memoBaselineGeneratedAtRef.current = investmentMemo?.generatedAt != null
      ? String(investmentMemo.generatedAt)
      : null;
    setInvestmentMemoError('');
    setInvestmentMemoSlow(false);
    setInvestmentMemoSubmitted(true);
    setGeneratingInvestmentMemo(true);

    try {
      const response = await startupsApi.generateInvestmentMemo(displayStartup.id, {
        managerId: manager?.id,
        managerName: manager?.name,
        language: i18n.language?.startsWith('en') ? 'en' : 'ru',
        force: Boolean(displayStartup.investmentMemo),
        includeVisuals,
      });

      if (response.success && response.data) {
        const updatedStartup = {
          ...displayStartup,
          ...((response.data.startup || {}) as unknown as Partial<Startup>),
          investmentMemo: response.data.investmentMemo,
        } as Startup;
        setFreshDetail(updatedStartup as unknown as Partial<Startup>);
        setCachedStartup(updatedStartup);
        onStartupUpdate?.(updatedStartup);
        setGeneratingInvestmentMemo(false);
        setInvestmentMemoSubmitted(false);
      }
    } catch {
    }
  };

  const handleRequestSmartVal = async () => {
    if (!displayStartup || requestingSmartVal || hasSmartValEvaluation) return;
    setRequestingSmartVal(true);
    setInvestmentMemoError('');
    setSmartValRequestMessage('');

    try {
      const response = await startupsApi.requestSmartVal(displayStartup.id, {
        managerId: manager?.id,
        managerName: manager?.name,
        language: i18n.language?.startsWith('en') ? 'en' : i18n.language?.startsWith('uz') ? 'uz' : 'ru',
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || response.error || 'smartval_request_failed');
      }

      const updatedStartup = {
        ...displayStartup,
        ...((response.data.startup || {}) as unknown as Partial<Startup>),
      } as Startup;
      setCachedStartup(updatedStartup);
      onStartupUpdate?.(updatedStartup);
      setSmartValRequestMessage(response.data.emailSent
        ? t('startups.investmentMemo.smartValRequestSent', 'SmartVal request was sent to the startup founder.')
        : t('startups.investmentMemo.smartValRequestSaved', 'SmartVal request was saved, but email was not sent. Check email settings.')
      );
    } catch (error) {
      setInvestmentMemoError(error instanceof Error ? error.message : t('startups.investmentMemo.smartValRequestFailed', 'Failed to send SmartVal request'));
    } finally {
      setRequestingSmartVal(false);
    }
  };

  const sheetContent = (
    <>
      <SheetOverlay $isOpen={isOpen} onClick={onClose} />
      <SheetContainer $isOpen={isOpen} $width={width}>
        <ResizeHandle onMouseDown={handleMouseDown} />
        <SheetContent>
          <ActionButtons>
            <IconButton onClick={() => onOpenFull(displayStartup.id)} title={t('startupDetail.sheet.openFullPage')}>
              <Maximize2 size={16} />
            </IconButton>
            <StartChatButton onClick={handleStartChat}>
              <MessageSquare />
              {t('chats.startChat')}
            </StartChatButton>
            <IconButton onClick={onClose} title={t('common.close')}>
              <X size={16} />
            </IconButton>
            {!displayStartup.isArchived && onArchive && (
              <ArchiveButton onClick={() => onArchive(displayStartup)}>
                <Archive />
                {t('startups.archive.rejectAction')}
              </ArchiveButton>
            )}
            {displayStartup.isArchived && onRestore && (
              <RestoreButton onClick={() => onRestore(displayStartup)}>
                <RotateCcw />
                {t('startups.archive.restoreButton')}
              </RestoreButton>
            )}
            {displayStartup.isArchived && onPermanentDelete && (
              <PermanentDeleteButton onClick={() => onPermanentDelete(displayStartup)}>
                <Trash2 />
                {t('startups.archive.permanentDeleteButton')}
              </PermanentDeleteButton>
            )}
          </ActionButtons>

          {isLoading ? (
            <StartupSheetSkeleton />
          ) : (
            <>
              <SheetHeader>
                <HeaderContent>
                  <Logo>
                    {((displayStartup as any).fileUrls?.logo || displayStartup.logo) && !imgError ? (
                      <CrmImage
                        src={(displayStartup as any).fileUrls?.logo || displayStartup.logo}
                        startupId={displayStartup.id}
                        alt={displayStartup.brief.companyName}
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)'
                      }}>
                        {displayStartup.brief.companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Logo>
                  <TitleGroup>
                    <Title>{displayStartup.brief.companyName}</Title>
                    <Industry>{displayStartup.brief.industry}</Industry>
                    {displayStartup.status !== 'new' && displayStartup.assignedManager && (
                      <div
                        onClick={canModify ? (e) => { e.stopPropagation(); setReassignModalOpen(true); } : undefined}
                        title={canModify ? t('startups.assign.change') : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '8px',
                          padding: '6px 10px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: '8px',
                          width: 'fit-content',
                          cursor: canModify ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={canModify ? (e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')) : undefined}
                        onMouseLeave={canModify ? (e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')) : undefined}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#1a1a1a',
                          border: '2px solid #10b981',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {displayStartup.assignedManager.avatar ? (
                            <img
                              src={displayStartup.assignedManager.avatar}
                              alt={displayStartup.assignedManager.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Users size={12} style={{ color: '#666' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
                          {displayStartup.assignedManager.name}
                        </span>
                      </div>
                    )}
                  </TitleGroup>
                </HeaderContent>
              </SheetHeader>

              {isFundGateAnalysisPending ? (
                <AIAnalysisCard>
                  <AIAnalysisBody style={{ marginBottom: 0 }}>
                    <AIScoreBlock>
                      <AIScoreValue $pending>...</AIScoreValue>
                      <AIScoreLabelText>{t('startupDetail.sheet.aiScore')}</AIScoreLabelText>
                    </AIScoreBlock>

                    <AIAdviceBlock>
                      <AIAdviceTitle>{t('startups.card.analysisPending')}</AIAdviceTitle>
                      <AIAdviceText>{t('startupDetail.sheet.aiAnalysisPendingText')}</AIAdviceText>
                    </AIAdviceBlock>
                  </AIAnalysisBody>
                </AIAnalysisCard>
              ) : analysisDisplay.isFailed ? (
                <AIAnalysisCard>
                  <AIAnalysisBody style={{ marginBottom: 0 }}>
                    <AIScoreBlock>
                      <AIScoreValue $empty>—</AIScoreValue>
                      <AIScoreLabelText>{t('startupDetail.sheet.aiScore')}</AIScoreLabelText>
                    </AIScoreBlock>

                    <AIAdviceBlock>
                      <AIAdviceTitle>{t('common.error', 'Error')}</AIAdviceTitle>
                      <AIAdviceText>{displayStartup.analysisError || t('startupDetail.sheet.aiAnalysisFailedText', 'FundGate score was not calculated. Run the analysis again after checking startup data and documents.')}</AIAdviceText>
                    </AIAdviceBlock>
                  </AIAnalysisBody>
                </AIAnalysisCard>
              ) : displayStartup.aiAnalysis && analysisDisplay.hasResultEvidence && (
                <AIAnalysisCard>
                  <AIAnalysisBody>
                    <AIScoreBlock>
                      <AIScoreValue $score={analysisDisplay.score} $empty={!analysisDisplay.hasScore}>
                        {analysisDisplay.hasScore ? analysisDisplay.score : '—'}
                      </AIScoreValue>
                      <AIScoreLabelText>{t('startupDetail.sheet.aiScore')}</AIScoreLabelText>
                    </AIScoreBlock>

                    <AIAdviceBlock>
                      <AIAdviceTitle>
                        {analysisDisplay.hasScore
                          ? t('startupDetail.sheet.aiAdvice')
                          : t('startupDetail.sheet.aiScoreMissingTitle', 'Score not calculated')}
                      </AIAdviceTitle>
                      <AIAdviceText>
                        {analysisDisplay.hasScore
                          ? t('startupDetail.sheet.aiAdviceText')
                          : t('startupDetail.sheet.aiScoreMissingText', 'FundGate has startup data, but no valid score yet. Run or rerun scoring before treating this as an investment rating.')}
                      </AIAdviceText>
                    </AIAdviceBlock>
                  </AIAnalysisBody>

                  <AIAnalysisFooter>
                    <AIAnalysisFooterLabel>
                      {t('startupDetail.sheet.preliminaryValuation')}
                    </AIAnalysisFooterLabel>
                    {(() => {
                      const footerValuation = smartValValuationDisplay || formatSmartValValuation({
                        final_valuation: displayStartup.aiAnalysis.valuation,
                      });
                      return (
                        <AIAnalysisFooterValue $hasValuation={Boolean(footerValuation)}>
                          {footerValuation || t('startupDetail.notEvaluatedSmartval')}
                        </AIAnalysisFooterValue>
                      );
                    })()}
                  </AIAnalysisFooter>
                </AIAnalysisCard>
              )}

              {isInvestmentMemoAvailable && (
                <Section>
                  <SectionTitle>{t('startups.investmentMemo.title', 'Investment memo')}</SectionTitle>
                  <InvestmentMemoPanel>
                    <InvestmentMemoHeader>
                      <div>
                        <InvestmentMemoTitle>
                          <Sparkles />
                          {investmentMemo?.title || t('startups.investmentMemo.emptyTitle', 'IC memo draft')}
                        </InvestmentMemoTitle>
                        <InvestmentMemoMeta>
                          {investmentMemo?.decision && <InvestmentMemoPill>{investmentMemoDecisionLabel(investmentMemo.decision)}</InvestmentMemoPill>}
                          {investmentMemoVisualAssetCount > 0 && (
                            <InvestmentMemoPill>
                              <BarChart3 size={12} />
                              {t('startups.investmentMemo.visualAssets', 'Visual assets')}: {investmentMemoVisualAssetCount}
                            </InvestmentMemoPill>
                          )}
                          {investmentMemoPendingVisualCount > 0 && (
                            <InvestmentMemoPill title={t(
                              investmentMemoVisualToolStatus === 'not_configured'
                                ? 'startups.investmentMemo.visualWorkerMissingHint'
                                : 'startups.investmentMemo.pendingVisualHint',
                              investmentMemoVisualToolStatus === 'not_configured'
                                ? 'Codex visual worker is not configured. The memo saved deterministic SVG charts and pending codex.exec imagine requests.'
                                : 'DeepSeek planned Codex exec imagine chart requests, but generated image files are not attached yet.'
                            )}>
                              <BarChart3 size={12} />
                              {t(
                                investmentMemoVisualToolStatus === 'not_configured'
                                  ? 'startups.investmentMemo.visualWorkerMissing'
                                  : 'startups.investmentMemo.pendingVisuals',
                                investmentMemoVisualToolStatus === 'not_configured' ? 'Worker not connected' : 'Imagine pending'
                              )}: {investmentMemoPendingVisualCount}
                            </InvestmentMemoPill>
                          )}
                          {investmentMemo?.generatedAt && <InvestmentMemoPill>{formatDate(investmentMemo.generatedAt as any)}</InvestmentMemoPill>}
                          {investmentMemo?.generatedByName && <InvestmentMemoPill>{investmentMemo.generatedByName}</InvestmentMemoPill>}
                        </InvestmentMemoMeta>
                      </div>
                      <InvestmentMemoActions>
                        {investmentMemoDownloadUrl(investmentMemo) && (
                          <InvestmentMemoLink
                            href={normalizeCrmFileUrl(investmentMemoDownloadUrl(investmentMemo), displayStartup.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => {
                              event.preventDefault();
                              downloadCrmFile(
                                investmentMemoDownloadUrl(investmentMemo),
                                investmentMemoDownloadFileName(investmentMemo),
                                displayStartup.id,
                              );
                            }}
                          >
                            <FileText size={14} />
                            {t('startups.investmentMemo.download', 'Download .docx')}
                            <Download size={12} />
                          </InvestmentMemoLink>
                        )}
                        {isInvestmentMemoAvailable && canModify && (
                          <>
                            {!hasSmartValEvaluation && (
                              <SmallActionButton
                                type="button"
                                onClick={handleRequestSmartVal}
                                disabled={requestingSmartVal}
                                title={t('startups.investmentMemo.requestSmartValHint', 'Send an email to the startup founder asking them to complete SmartVal fields in their cabinet.')}
                              >
                                <Mail size={14} />
                                {requestingSmartVal
                                  ? t('common.sending', 'Sending...')
                                  : t('startups.investmentMemo.requestSmartVal', 'Request SmartVal')}
                              </SmallActionButton>
                            )}
                            <SmallActionButton
                              type="button"
                              onClick={() => handleGenerateInvestmentMemo(false)}
                              disabled={!canGenerateInvestmentMemo}
                              title={investmentMemoDisabledReason || undefined}
                            >
                              {generatingInvestmentMemo
                                ? t('startups.investmentMemo.generating', 'Generating...')
                                : investmentMemo
                                  ? t('startups.investmentMemo.regenerate', 'Regenerate memo')
                                  : t('startups.investmentMemo.generate', 'Generate memo')}
                            </SmallActionButton>
                            <SmallActionButton
                              type="button"
                              onClick={() => handleGenerateInvestmentMemo(true)}
                              disabled={!canGenerateInvestmentMemo}
                              title={investmentMemoDisabledReason || t(
                                'startups.investmentMemo.generateVisualHint',
                                'If the Codex visual worker is connected, imagine chart images will be attached; otherwise the memo will include SVG charts and pending imagine requests.'
                              )}
                            >
                              <BarChart3 size={14} />
                              {t('startups.investmentMemo.generateVisual', 'Generate visual memo')}
                            </SmallActionButton>
                          </>
                        )}
                      </InvestmentMemoActions>
                    </InvestmentMemoHeader>
                    {investmentMemoSubmitted && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)',
                        borderRadius: 10, padding: '12px 14px', marginTop: 4,
                        color: '#10b981', fontSize: 14, lineHeight: 1.5,
                      }}>
                        <Sparkles size={16} style={{ flexShrink: 0 }} />
                        <span>{t('startups.investmentMemo.submitted', 'Request sent. The investment memo will appear here as soon as it is ready — you can close this window.')}</span>
                      </div>
                    )}
                    {investmentMemoSlow && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(245,166,35,0.10)', border: '1px solid rgba(245,166,35,0.30)',
                        borderRadius: 10, padding: '12px 14px', marginTop: 4,
                        color: '#f5a623', fontSize: 14, lineHeight: 1.5,
                      }}>
                        <span>{t('startups.investmentMemo.stillProcessing', 'Generation is taking a bit longer. The memo will appear here automatically once ready, or reopen this card later.')}</span>
                      </div>
                    )}
                    {smartValRequestMessage && (
                      <InvestmentMemoSummaryText>{smartValRequestMessage}</InvestmentMemoSummaryText>
                    )}
                    {investmentMemoDisabledReason && !investmentMemoError && (
                      <DDTrackError>{investmentMemoDisabledReason}</DDTrackError>
                    )}
                    {investmentMemo?.summary && (
                      <InvestmentMemoSummaryText>{investmentMemo.summary}</InvestmentMemoSummaryText>
                    )}
                    {(investmentMemo?.missingData || []).length > 0 && (
                      <InvestmentMemoMeta>
                        {(investmentMemo?.missingData || []).slice(0, 8).map((item) => (
                          <InvestmentMemoPill key={item}>{item}</InvestmentMemoPill>
                        ))}
                      </InvestmentMemoMeta>
                    )}
                    {investmentMemoPreview && <InvestmentMemoPreview>{investmentMemoPreview}</InvestmentMemoPreview>}
                    {investmentMemoError && <DDTrackError>{investmentMemoError}</DDTrackError>}
                  </InvestmentMemoPanel>
                </Section>
              )}

              {displayStartup.status === 'portfolio' && (displayStartup as any).investmentAmount && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t('startups.investment.fundInvestment')}
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textTransform: 'capitalize'
                      }}>
                        {(displayStartup as any).valuationType === 'post-money' ? 'Post-money' : 'Pre-money'}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
                      ${((displayStartup as any).investmentAmount).toLocaleString(numberLocale(i18n.language))}
                    </div>
                  </div>
                  <div style={{ background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                    {t('startups.investment.inPortfolio')}
                  </div>
                </div>
              )}

              <Section>
                <SectionTitle>{t('startupDetail.sheet.about')}</SectionTitle>
                <Description>{displayStartup.brief.description}</Description>
              </Section>

              <DataRoomLinkCard
                startupId={displayStartup.id}
                dataRoomUrl={displayStartup.dataRoomUrl}
                canEdit={canEditDataRoom}
                onChange={handleDataRoomUrlChange}
              />

              {crossFundApplications.length > 0 && (
                <Section>
                  <SectionTitle>{t('startupDetail.sheet.crossFundTitle')}</SectionTitle>
                  <CrossFundList>
                    {crossFundApplications.map((application) => (
                      <CrossFundRow key={`${application.organizationId}-${application.status}-${application.commitmentStatus || ''}`}>
                        <CrossFundName title={application.organizationName}>
                          <Building2 />
                          {application.organizationName}
                        </CrossFundName>
                        <CrossFundCommitment>
                          {typeof application.investmentAmount === 'number' && application.investmentAmount > 0 && (
                            <CrossFundAmount>${application.investmentAmount.toLocaleString(numberLocale(i18n.language))}</CrossFundAmount>
                          )}
                          <CrossFundStatus>
                            {application.commitmentStatus
                              ? t(`investmentCommittee.funding.${application.commitmentStatus}Status`)
                              : formatStartupStatusLabel(application.status, t)}
                          </CrossFundStatus>
                        </CrossFundCommitment>
                      </CrossFundRow>
                    ))}
                  </CrossFundList>
                </Section>
              )}

              {(displayStartup.pendingChangeCount || 0) > 0 && (
                <PendingChangesNotice>
                  <AlertTriangle />
                  {t('startups.approvals.pendingNotice', {
                    count: displayStartup.pendingChangeCount,
                    defaultValue: `${displayStartup.pendingChangeCount} founder change request pending manager review`,
                  })}
                </PendingChangesNotice>
              )}

              {canModify && pendingChanges.length > 0 && (
                <Section>
                  <SectionTitle>{t('startups.approvals.title', 'Founder changes')}</SectionTitle>
                  <ReviewPanel>
                    {pendingChanges.map((change) => (
                      <ReviewCard key={change.id}>
                        <ReviewCardHeader>
                          <span>{change.founderEmail || t('startups.approvals.founder', 'Founder')}</span>
                          <ReviewMeta>{formatDate(change.createdAt)}</ReviewMeta>
                        </ReviewCardHeader>
                        <DiffList>
                          {pendingChangeRows(change).slice(0, 6).map((row, index) => (
                            <DiffRow key={`${change.id}-${row.field}-${index}`}>
                              <DiffField>{humanizeChangeField(row.field)}</DiffField>
                              {formatDiffValue(row.oldValue, row.field)} → {formatDiffValue(row.newValue, row.field)}
                            </DiffRow>
                          ))}
                        </DiffList>
                        {change.status === 'manager_approved' && !isDirector ? (
                          <ReviewActions>
                            <AwaitingDirectorNote>
                              <Clock size={12} />
                              {t('startups.approvals.awaitingDirector', 'Approved by manager — awaiting director')}
                              {change.managerReviewedByName ? ` · ${change.managerReviewedByName}` : ''}
                            </AwaitingDirectorNote>
                            <SmallActionButton
                              type="button"
                              $variant="reject"
                              onClick={() => reviewPendingChange(change, 'reject')}
                              disabled={reviewingChangeId === change.id}
                            >
                              {t('startups.approvals.reject', 'Reject')}
                            </SmallActionButton>
                          </ReviewActions>
                        ) : (
                          <ReviewActions>
                            <SmallActionButton
                              type="button"
                              onClick={() => reviewPendingChange(change, 'approve')}
                              disabled={reviewingChangeId === change.id}
                            >
                              {isDirector
                                ? t('startups.approvals.finalApprove', 'Final approve')
                                : t('startups.approvals.approveToDirector', 'Approve → director')}
                            </SmallActionButton>
                            <SmallActionButton
                              type="button"
                              $variant="reject"
                              onClick={() => reviewPendingChange(change, 'reject')}
                              disabled={reviewingChangeId === change.id}
                            >
                              {t('startups.approvals.reject', 'Reject')}
                            </SmallActionButton>
                          </ReviewActions>
                        )}
                      </ReviewCard>
                    ))}
                  </ReviewPanel>
                </Section>
              )}

              {canManageDueDiligence && (
                <Section>
                  <SectionTitle>{t('startups.dd.title', 'Due diligence tracks')}</SectionTitle>
                  <DDPanelGrid>
                    {ddItems.map(({ key, title, icon: Icon, track }) => (
                      <DDPanelCard
                        key={key}
                        type="button"
                        $risk={track?.riskLevel}
                        $active={activeDDTrack === key}
                        onClick={() => setActiveDDTrack(key)}
                      >
                        <DDPanelHeader>
                          <DDPanelTitle><Icon /> {title}</DDPanelTitle>
                          <DDPanelStatus>
                            {t(`startups.dd.status.${track?.status || 'not_started'}`, track?.status || 'not started')}
                          </DDPanelStatus>
                        </DDPanelHeader>
                        <DDPanelConclusion>
                          {track?.conclusion || t('startups.dd.noConclusion', 'No conclusion yet')}
                        </DDPanelConclusion>
                        <DDPanelMeta>
                          {track?.reviewerName && <DDPanelPill>{track.reviewerName}</DDPanelPill>}
                          {track?.riskLevel && <DDPanelPill>{t(`startups.dd.risk.${track.riskLevel}`, track.riskLevel)}</DDPanelPill>}
                          {typeof track?.score === 'number' && <DDPanelPill>{track.score}/100</DDPanelPill>}
                            {track?.dueDate && <DDPanelPill>{formatDate(track.dueDate)}</DDPanelPill>}
                          </DDPanelMeta>
                      </DDPanelCard>
                    ))}
                  </DDPanelGrid>
                  {canModify && (
                  <DDTrackEditor>
                    <DDTrackEditorHeader>
                      <div>
                        <DDTrackEditorTitle><ActiveDDIcon /> {activeDDItem.title}</DDTrackEditorTitle>
                        <DDTrackHelp>
                          {t('startups.dd.editorHelp', 'Назначьте ответственного, дедлайн и зафиксируйте выводы для инвесткомитета.')}
                        </DDTrackHelp>
                      </div>
                      <DDPanelStatus>
                        {t(`startups.dd.status.${activeDDDraft.status}`, activeDDDraft.status)}
                      </DDPanelStatus>
                    </DDTrackEditorHeader>
                    <DDTrackEditorGrid>
                      <DDTrackField>
                        <span>{t('startups.dd.statusLabel', 'Статус')}</span>
                        <CustomSelect
                          value={activeDDDraft.status}
                          options={ddStatusOptions}
                          ariaLabel={t('startups.dd.statusLabel', 'Статус')}
                          onChange={(status) => updateDDDraft(activeDDTrack, { status })}
                        />
                      </DDTrackField>
                      <DDTrackField>
                        <span>{t('startups.dd.reviewer', 'Ответственный')}</span>
                        <CustomSelect
                          value={activeDDReviewerValue}
                          options={ddReviewerOptions}
                          ariaLabel={t('startups.dd.reviewer', 'Ответственный')}
                          onChange={handleDDReviewerChange}
                        />
                        {isManualDDReviewer && (
                          <input
                            value={activeDDDraft.reviewerName}
                            onChange={(event) => updateDDDraft(activeDDTrack, { reviewerId: '', reviewerName: event.target.value })}
                            placeholder={t('startups.dd.manualReviewerPlaceholder', 'Имя Фамилия')}
                          />
                        )}
                      </DDTrackField>
                      <DDTrackField>
                        <span>{t('startups.dd.dueDate', 'Дедлайн')}</span>
                        <input
                          type="date"
                          value={activeDDDraft.dueDate}
                          onChange={(event) => updateDDDraft(activeDDTrack, { dueDate: event.target.value })}
                        />
                      </DDTrackField>
                      <DDTrackField>
                        <span>{t('startups.dd.riskLabel', 'Риск')}</span>
                        <CustomSelect
                          value={activeDDDraft.riskLevel}
                          options={ddRiskOptions}
                          ariaLabel={t('startups.dd.riskLabel', 'Риск')}
                          onChange={(riskLevel) => updateDDDraft(activeDDTrack, { riskLevel })}
                        />
                      </DDTrackField>
                      <DDTrackField>
                        <span>{t('startups.dd.score', 'Score')}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={activeDDDraft.score}
                          onChange={(event) => updateDDDraft(activeDDTrack, { score: normalizeDDScoreInput(event.target.value) })}
                          placeholder="0-100"
                        />
                      </DDTrackField>
                      <DDTrackField $wide>
                        <span>{t('startups.dd.conclusion', 'Заключение')}</span>
                        <textarea
                          value={activeDDDraft.conclusion}
                          onChange={(event) => updateDDDraft(activeDDTrack, { conclusion: event.target.value })}
                          placeholder={t('startups.dd.conclusionPlaceholder', 'Коротко: выводы, риски, что проверить перед ИК')}
                        />
                      </DDTrackField>
                    </DDTrackEditorGrid>
                    <DDTrackEditorActions>
                      <SmallActionButton
                        type="button"
                        onClick={() => saveDDReviewTrack(activeDDTrack)}
                        disabled={savingDDTrack === activeDDTrack}
                      >
                        {savingDDTrack === activeDDTrack ? t('common.saving', 'Saving...') : t('startups.dd.save', 'Сохранить DD')}
                      </SmallActionButton>
                      <SmallActionButton type="button" onClick={scrollToDocumentRequests}>
                        {t('startups.dd.requestDocuments', 'Запросить документы')}
                      </SmallActionButton>
                      <DDTrackHelp>
                        {t('startups.dd.documentsHelp', 'Запрос документов откроется ниже, без дублирования загрузок.')}
                      </DDTrackHelp>
                    </DDTrackEditorActions>
                    {ddTrackError && <DDTrackError>{ddTrackError}</DDTrackError>}
                  </DDTrackEditor>
                  )}
                </Section>
              )}

              {canManageQuarterlyReports && (
                <Section>
                <SectionTitle>{t('reports.quarterly.crmTitle', 'Quarterly reports')}</SectionTitle>
                {canModify && (
                <QuarterlyRequestForm>
                  <QuarterlyFormField>
                    <span>{t('reports.quarterly.year', 'Год')}</span>
                    <input
                      type="number"
                      min="2020"
                      max="2100"
                      value={quarterlyRequestForm.year}
                      onChange={(event) => setQuarterlyRequestForm((current) => ({ ...current, year: event.target.value }))}
                    />
                  </QuarterlyFormField>
                  <QuarterlyFormField>
                    <span>{t('reports.quarterly.quarter', 'Квартал')}</span>
                    <CustomSelect
                      value={quarterlyRequestForm.quarter}
                      options={quarterOptions}
                      ariaLabel={t('reports.quarterly.quarter', 'Квартал')}
                      onChange={(quarter) => setQuarterlyRequestForm((current) => ({ ...current, quarter }))}
                    />
                  </QuarterlyFormField>
                  <QuarterlyFormField>
                    <span>{t('reports.quarterly.dueDate', 'Дедлайн')}</span>
                    <input
                      type="date"
                      value={quarterlyRequestForm.dueDate}
                      onChange={(event) => setQuarterlyRequestForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </QuarterlyFormField>
                  <QuarterlyFormField $wide>
                    <span>{t('reports.quarterly.message', 'Сообщение стартаперу')}</span>
                    <textarea
                      value={quarterlyRequestForm.message}
                      onChange={(event) => setQuarterlyRequestForm((current) => ({ ...current, message: event.target.value }))}
                      placeholder={t('reports.quarterly.requestMessagePlaceholder', 'Например: пришлите метрики, traction narrative, риски и файлы за квартал')}
                    />
                  </QuarterlyFormField>
                  <ReviewActions style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                    <SmallActionButton
                      type="button"
                      onClick={createQuarterlyRequest}
                      disabled={creatingQuarterlyRequest}
                    >
                      {creatingQuarterlyRequest ? t('common.sending', 'Sending...') : t('reports.quarterly.requestReport', 'Запросить квартальный отчёт')}
                    </SmallActionButton>
                  </ReviewActions>
                </QuarterlyRequestForm>
                )}

                {quarterlyRequests.length > 0 && (
                  <ReviewPanel style={{ marginBottom: 10 }}>
                    {quarterlyRequests.slice(0, 4).map((request) => (
                      <ReviewCard key={request.id}>
                        <ReviewCardHeader>
                          <span>{request.period?.quarter} {request.period?.year}</span>
                          <QuarterlyStatusPill $status={request.status}>{quarterlyRequestStatusLabel(request.status)}</QuarterlyStatusPill>
                        </ReviewCardHeader>
                        {request.dueDate && <ReviewMeta>{t('reports.quarterly.dueDate', 'Дедлайн')}: {formatDate(request.dueDate)}</ReviewMeta>}
                        {request.message && <DiffRow style={{ marginTop: 8 }}>{request.message}</DiffRow>}
                        {request.reviewNote && (
                          <DiffRow style={{ marginTop: 8 }}>
                            <DiffField>{t('reports.reviewNote', 'Комментарий фонда')}</DiffField>
                            {request.reviewNote}
                          </DiffRow>
                        )}
                        {canModify && request.status === 'requested' && (
                          <ReviewActions>
                            <SmallActionButton
                              type="button"
                              onClick={() => remindQuarterlyRequest(request)}
                              disabled={remindingQuarterlyRequestId === request.id}
                            >
                              {remindingQuarterlyRequestId === request.id ? t('common.sending', 'Sending...') : t('reports.quarterly.remind', 'Напомнить')}
                            </SmallActionButton>
                          </ReviewActions>
                        )}
                      </ReviewCard>
                    ))}
                  </ReviewPanel>
                )}

                {quarterlyReports.length > 0 && (
                  <ReviewPanel>
                    {quarterlyReports.slice(0, 3).map((report) => (
                      <ReviewCard key={report.id}>
                        <ReviewCardHeader>
                          <span>{report.period?.quarter} {report.period?.year}</span>
                          <ReviewMeta>{t(`reports.status.${report.status}`, report.status)}</ReviewMeta>
                        </ReviewCardHeader>
                        <DiffRow>
                          {report.narrative?.traction || report.narrative?.risks || report.narrative?.asks || t('reports.quarterly.noNarrative', 'No narrative yet')}
                        </DiffRow>
                        <ReviewMeta style={{ marginTop: 8 }}>
                          {t('reports.quarterly.filesCount', { count: report.files?.length || 0, defaultValue: `${report.files?.length || 0} files` })}
                        </ReviewMeta>
                        {quarterlyMetricRows(report).length > 0 && (
                          <ReportMetricsGrid>
                            {quarterlyMetricRows(report).map((metric) => (
                              <ReportMetricPill key={`${report.id}-${metric.label}`}>
                                {metric.label}: {metric.value}
                              </ReportMetricPill>
                            ))}
                          </ReportMetricsGrid>
                        )}
                        {(report.files || []).length > 0 && (
                          <ReportMetricsGrid>
                            {(report.files || []).slice(0, 4).map((file) => (
                              <ReportFileLink
                                key={file.url || file.fileName}
                                href={normalizeCrmFileUrl(file.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => { event.preventDefault(); void openCrmFile(file.url); }}
                              >
                                <FileText size={12} />
                                {file.fileName || t('reports.files', 'Files')}
                                <ExternalLink size={11} />
                              </ReportFileLink>
                            ))}
                          </ReportMetricsGrid>
                        )}
                        {report.reviewNote && (
                          <DiffRow style={{ marginTop: 10 }}>
                            <DiffField>{t('reports.reviewNote', 'Комментарий фонда')}</DiffField>
                            {report.reviewNote}
                          </DiffRow>
                        )}
                        {canModify && report.status !== 'approved' && (
                          <>
                            <ReportNoteInput
                              value={reportReviewNotes[report.id] || ''}
                              onChange={(event) => {
                                setReportReviewNotes((items) => ({ ...items, [report.id]: event.target.value }));
                                setReportReviewErrors((items) => ({ ...items, [report.id]: '' }));
                              }}
                              placeholder={t('reports.quarterly.reviewNotePlaceholder', 'Комментарий для стартапа, если нужны правки')}
                            />
                            {reportReviewErrors[report.id] && (
                              <ReviewMeta style={{ color: '#ef4444', marginTop: 6 }}>{reportReviewErrors[report.id]}</ReviewMeta>
                            )}
                            <ReviewActions>
                              <SmallActionButton
                                type="button"
                                onClick={() => reviewQuarterlyReport(report, 'approved')}
                                disabled={reviewingReportId === report.id}
                              >
                                {t('reports.quarterly.approve', 'Approve report')}
                              </SmallActionButton>
                              <SmallActionButton
                                type="button"
                                $variant="reject"
                                onClick={() => reviewQuarterlyReport(report, 'changes_requested')}
                                disabled={reviewingReportId === report.id}
                              >
                                {t('reports.quarterly.requestChanges', 'Request changes')}
                              </SmallActionButton>
                            </ReviewActions>
                          </>
                        )}
                      </ReviewCard>
                    ))}
                  </ReviewPanel>
                )}
                </Section>
              )}

              {((displayStartup.brief as any).founderName || (displayStartup.brief as any).founderEmail || (displayStartup.brief as any).founderPhone || (displayStartup as any).founder) && (
                <Section>
                  <SectionTitle>{t('startupDetail.contacts')}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(displayStartup.brief as any).founderName && (
                      <InfoCard>
                        <InfoLabel><User /> {(displayStartup.brief as any).founderRole || t('startupDetail.founder')}</InfoLabel>
                        <InfoValue>{(displayStartup.brief as any).founderName}</InfoValue>
                      </InfoCard>
                    )}
                    {(displayStartup.brief as any).founderEmail && (
                      <InfoCard>
                        <InfoLabel><Mail /> Email</InfoLabel>
                        <InfoValue>
                          <a href={`mailto:${(displayStartup.brief as any).founderEmail}`} style={{ color: '#10b981', textDecoration: 'none', fontSize: '14px' }}>
                            {(displayStartup.brief as any).founderEmail}
                          </a>
                        </InfoValue>
                      </InfoCard>
                    )}
                    {(displayStartup.brief as any).founderPhone && (
                      <InfoCard>
                        <InfoLabel><Phone /> {t('startupDetail.phone')}</InfoLabel>
                        <InfoValue>
                          <a href={`tel:${(displayStartup.brief as any).founderPhone}`} style={{ color: '#10b981', textDecoration: 'none', fontSize: '14px' }}>
                            {(displayStartup.brief as any).founderPhone}
                          </a>
                        </InfoValue>
                      </InfoCard>
                    )}
                    {(displayStartup as any).founder?.socialLinks?.linkedin && (
                      <InfoCard>
                        <InfoLabel><Linkedin /> LinkedIn</InfoLabel>
                        <InfoValue>
                          <a href={safeExternalHref((displayStartup as any).founder.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontSize: '12px' }}>
                            {t('startupDetail.sheet.openArrow')}
                          </a>
                        </InfoValue>
                      </InfoCard>
                    )}
                    {(displayStartup as any).founder?.socialLinks?.telegram && (
                      <InfoCard>
                        <InfoLabel><MessageSquare /> Telegram</InfoLabel>
                        <InfoValue>{(displayStartup as any).founder.socialLinks.telegram}</InfoValue>
                      </InfoCard>
                    )}
                  </div>
                </Section>
              )}

              {((displayStartup.brief as any).pitchDeckUrl || (displayStartup as any).fileUrls?.pitchDeck || (displayStartup as any).fileUrls?.onePager || (displayStartup as any).fileUrls?.financialModel || (displayStartup as any).materials?.videoLink) && (
                <Section>
                  <SectionTitle>{t('startupDetail.documents')}</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {((displayStartup.brief as any).pitchDeckUrl || (displayStartup as any).fileUrls?.pitchDeck) && (
                      <a
                        href={normalizeCrmFileUrl((displayStartup.brief as any).pitchDeckUrl || (displayStartup as any).fileUrls?.pitchDeck)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => { event.preventDefault(); void openCrmFile((displayStartup.brief as any).pitchDeckUrl || (displayStartup as any).fileUrls?.pitchDeck); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px',
                          color: '#10b981', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        <FileText size={14} /> {t('startupDetail.sheet.pitchDeck')} <Download size={12} />
                      </a>
                    )}
                    {(displayStartup as any).fileUrls?.onePager && (
                      <a
                        href={normalizeCrmFileUrl((displayStartup as any).fileUrls.onePager)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => { event.preventDefault(); void openCrmFile((displayStartup as any).fileUrls.onePager); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                          color: '#fff', fontSize: '14px', fontWeight: 500, textDecoration: 'none'
                        }}
                      >
                        <FileText size={14} /> {t('startupDetail.sheet.onePager')} <Download size={12} />
                      </a>
                    )}
                    {(displayStartup as any).fileUrls?.financialModel && (
                      <a
                        href={normalizeCrmFileUrl((displayStartup as any).fileUrls.financialModel)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => { event.preventDefault(); void openCrmFile((displayStartup as any).fileUrls.financialModel); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                          color: '#fff', fontSize: '14px', fontWeight: 500, textDecoration: 'none'
                        }}
                      >
                        <FileText size={14} /> {t('startupDetail.financialModel')} <Download size={12} />
                      </a>
                    )}
                    {(displayStartup as any).materials?.videoLink && (
                      <a
                        href={safeExternalHref((displayStartup as any).materials.videoLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                          color: '#fff', fontSize: '14px', fontWeight: 500, textDecoration: 'none'
                        }}
                      >
                        <Video size={14} /> {t('startupDetail.video')} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </Section>
              )}

              {(displayStartup as any).teamMembers && (displayStartup as any).teamMembers.length > 0 && (
                <Section>
                  <SectionTitle>{t('startupDetail.team')}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(displayStartup as any).teamMembers.map((member: any, index: number) => (
                      <InfoCard key={index} style={{ height: 'auto', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                            {member.firstName} {member.lastName}
                          </div>
                          {member.role && (
                            <div style={{ fontSize: '12px', color: '#10b981' }}>{member.role}</div>
                          )}
                          {member.email && (
                            <a href={`mailto:${member.email}`} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                              {member.email}
                            </a>
                          )}
                        </div>
                      </InfoCard>
                    ))}
                  </div>
                </Section>
              )}

              <Section>
                <Grid>
                  <InfoCard>
                    <InfoLabel><TrendingUp /> {t('startupDetail.sheet.stage')}</InfoLabel>
                    <InfoValue>{formatStage(displayStartup.brief.stage)}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel><Users /> {t('startupDetail.sheet.teamSize')}</InfoLabel>
                    <InfoValue style={{ overflow: 'visible' }}>
                      <TeamSizeValue>
                        <span>{t('startupDetail.sheet.people', { count: displayStartup.brief.teamSize })}</span>
                        <AvatarStack>
                          {(displayStartup.teamMembers || []).slice(0, 3).map((m: any, i: number) => (
                            <Avatar key={i} $bg={teamColors[i % teamColors.length]}>
                              {(m.name || '?').charAt(0).toUpperCase()}
                            </Avatar>
                          ))}
                          {!(displayStartup.teamMembers?.length) && Array.from({ length: Math.min(displayStartup.brief.teamSize || 0, 3) }).map((_, i) => (
                            <Avatar key={i} $bg={teamColors[i % teamColors.length]}>?</Avatar>
                          ))}
                          {displayStartup.brief.teamSize > 3 && (
                            <div style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF' }}>+{displayStartup.brief.teamSize - 3}</div>
                          )}
                        </AvatarStack>
                      </TeamSizeValue>
                    </InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel><Building2 /> {t('startupDetail.sheet.founded')}</InfoLabel>
                    <InfoValue>{displayStartup.brief.foundedYear}</InfoValue>
                  </InfoCard>
                  <InfoCard
                    title={canModify ? t('startupDetail.sheet.clickToEdit') : undefined}
                    style={{ cursor: canModify ? 'pointer' : 'default' }}
                    onClick={canModify ? () => {
                      if (!editingFunding) {
                        setFundingDraft(normalizeMoneyInput(String(displayStartup.brief.itpvFundingRequest ?? displayStartup.brief.fundingRequest ?? 0)));
                        setEditingFunding(true);
                      }
                    } : undefined}
                  >
                    <InfoLabel><DollarSign /> {t('startupDetail.sheet.itpvRequest')}</InfoLabel>
                    {editingFunding ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <FundingInlineInput
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={formatMoneyInput(fundingDraft)}
                          onChange={e => setFundingDraft(normalizeMoneyInput(e.target.value))}
                          onKeyDown={e => { if (e.key === 'Enter') saveFundingRequest(); if (e.key === 'Escape') setEditingFunding(false); }}
                        />
                        <button onClick={saveFundingRequest} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                        <button onClick={() => setEditingFunding(false)} style={{ background: 'none', border: '1px solid #334155', color: '#888', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      </div>
                    ) : (
                      <InfoValue>${(((displayStartup.brief.itpvFundingRequest ?? displayStartup.brief.fundingRequest) || 0) / 1000).toFixed(0)}k</InfoValue>
                    )}
                  </InfoCard>

                  <InfoCard
                    title={canModify ? t('startupDetail.sheet.clickToEdit') : undefined}
                    style={{ cursor: canModify ? 'pointer' : 'default' }}
                    onClick={canModify ? () => {
                      if (!editingFundConsideration) {
                        setFundConsiderationDraft(normalizeMoneyInput(String(displayStartup.fundConsiderationAmount ?? '')));
                        setEditingFundConsideration(true);
                      }
                    } : undefined}
                  >
                    <InfoLabel><DollarSign /> {t('startupDetail.fundConsiderationAmount')}</InfoLabel>
                    {editingFundConsideration ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(event) => event.stopPropagation()}>
                        <FundingInlineInput
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={formatMoneyInput(fundConsiderationDraft)}
                          onChange={(event) => setFundConsiderationDraft(normalizeMoneyInput(event.target.value))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void saveFundConsiderationAmount();
                            if (event.key === 'Escape') setEditingFundConsideration(false);
                          }}
                          aria-label={t('startupDetail.fundConsiderationAmount')}
                        />
                        <button
                          type="button"
                          aria-label={t('common.save')}
                          onClick={() => void saveFundConsiderationAmount()}
                          style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 11 }}
                        >✓</button>
                        <button
                          type="button"
                          aria-label={t('common.cancel')}
                          onClick={() => setEditingFundConsideration(false)}
                          style={{ background: 'none', border: '1px solid #334155', color: '#888', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 11 }}
                        >✕</button>
                      </div>
                    ) : (
                      <InfoValue>
                        {displayStartup.fundConsiderationAmount
                          ? `$${displayStartup.fundConsiderationAmount.toLocaleString(numberLocale(i18n.language))}`
                          : '—'}
                      </InfoValue>
                    )}
                  </InfoCard>

                  <InfoCard>
                    <InfoLabel><DollarSign /> {t('startupDetail.sheet.totalRound')}</InfoLabel>
                    <InfoValue>${((displayStartup.brief.totalRoundSize || 0) / 1000).toFixed(0)}k</InfoValue>
                  </InfoCard>

                  {displayStartup.brief.website && (
                    <InfoCard>
                      <InfoLabel><Globe /> {t('startupDetail.website')}</InfoLabel>
                      <InfoValue>
                        <a href={normalizeExternalUrl(displayStartup.brief.website)} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontSize: '12px' }}>
                          {t('startupDetail.sheet.visitArrow')}
                        </a>
                      </InfoValue>
                    </InfoCard>
                  )}
                  {displayStartup.brief.revenue && (
                    <InfoCard>
                      <InfoLabel><TrendingUp /> {t('startupDetail.sheet.revenue')}</InfoLabel>
                      <InfoValue>
                        ${(displayStartup.brief.revenue / 1000).toFixed(0)}k / {t('startupDetail.sheet.monthShort')}
                      </InfoValue>
                    </InfoCard>
                  )}
                  <InfoCard>
                    <InfoLabel><MapPin /> {t('startupDetail.sheet.source')}</InfoLabel>
                    <InfoValue>{displayStartup.source}</InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel><LinkIcon /> {t('startupDetail.sheet.useOfFunds')}</InfoLabel>
                    <InfoValue>
                      {displayStartup.brief.useOfFunds ? (
                        displayStartup.brief.useOfFunds
                      ) : (
                        <MissingValueBadge title={t('startupDetail.sheet.notSpecified')}>
                          <MinusCircle />
                          {t('startupDetail.sheet.notSpecified')}
                        </MissingValueBadge>
                      )}
                    </InfoValue>
                  </InfoCard>
                  <InfoCard>
                    <InfoLabel><DollarSign /> {t('startupDetail.sheet.totalRaised')}</InfoLabel>
                    <InfoValue>
                      {displayStartup.brief.previousFunding
                        ? `$${(displayStartup.brief.previousFunding / 1000).toFixed(0)}k`
                        : t('common.no')}
                    </InfoValue>
                  </InfoCard>
                  {(displayStartup.brief as any).country && (
                    <InfoCard>
                      <InfoLabel><MapPin /> {t('startupDetail.country')}</InfoLabel>
                      <InfoValue>{(displayStartup.brief as any).country}</InfoValue>
                    </InfoCard>
                  )}
                  {(displayStartup.brief as any).businessModel && (
                    <InfoCard>
                      <InfoLabel><Building2 /> {t('startupDetail.businessModel')}</InfoLabel>
                      <InfoValue style={{ textTransform: 'uppercase' }}>
                        {(displayStartup.brief as any).customBusinessModel || (displayStartup.brief as any).businessModel}
                      </InfoValue>
                    </InfoCard>
                  )}
                </Grid>
              </Section>

              <StartupRoadmapPanel startup={displayStartup} onStartupUpdate={onStartupUpdate} canModify={canModify} />

              <div ref={documentRequestsPanelRef}>
                <DocumentRequestsPanel startup={displayStartup} onStartupUpdate={onStartupUpdate} canModify={canModify} />
              </div>

              {(() => {
                const notesItems = timeline.filter((it) => it.type === 'comment' && it.isInternal);
                const historyItems = timeline.filter((it) => it.type !== 'comment');
                const visibleItems = activeTab === 'notes' ? notesItems : historyItems;

                const tabBtnBase: React.CSSProperties = {
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.55)',
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
                  background: 'rgba(99, 102, 241, 0.14)',
                  color: '#818cf8',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                };

                const countPill = (n: number, color: string): React.CSSProperties => ({
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: `${color}22`,
                  color,
                  minWidth: 18,
                  textAlign: 'center',
                });
                const countPillInactive = (n: number): React.CSSProperties => ({
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.4)',
                  minWidth: 18,
                  textAlign: 'center',
                });

                const inputPlaceholder = t('startupDetail.notesPlaceholder');
                const sendBtnBg = '#f59e0b';

                return (
                  <Section>
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '4px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
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
                        <span style={activeTab === 'notes' ? countPill(notesItems.length, '#f59e0b') : countPillInactive(notesItems.length)}>
                          {notesItems.length}
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
                        <span style={activeTab === 'history' ? countPill(historyItems.length, '#818cf8') : countPillInactive(historyItems.length)}>
                          {historyItems.length}
                        </span>
                      </button>
                    </div>

                    {activeTab === 'notes' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        background: 'rgba(245, 158, 11, 0.07)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: '1.5',
                      }}>
                        <Lock size={14} style={{ flexShrink: 0, marginTop: '1px', color: '#f59e0b' }} />
                        <span>
                          <Trans
                            i18nKey="startupDetail.notesBanner"
                            components={{ strong: <strong style={{ color: '#f59e0b' }} /> }}
                          />
                        </span>
                      </div>
                    )}

                    <TimelineContainer>
                      {activeTab !== 'history' && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                          <TimelineAvatarFallback $bg="#f59e0b">
                            {(manager?.name || 'U').charAt(0).toUpperCase()}
                          </TimelineAvatarFallback>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: 'transparent', padding: '0 0 8px 0', borderBottom: '1px solid rgba(245,158,11,0.25)' }}>
                              <textarea
                                placeholder={inputPlaceholder}
                                rows={1}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCommentSubmit();
                                  }
                                }}
                                style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '14px', resize: 'none', outline: 'none' }}
                              />
                            </div>
                            {commentText.trim() && (
                              <button
                                onClick={handleCommentSubmit}
                                disabled={isSubmitting}
                                style={{
                                  background: sendBtnBg,
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px',
                                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                  opacity: isSubmitting ? 0.5 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Send size={14} color="white" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {visibleItems.length > 0 ? (
                        visibleItems.map((item, index) => (
                          <TimelineItem key={index}>
                            <TimelineAvatarFallback $bg={item.avatarBg || '#10b981'} style={{ zIndex: 2, border: '2px solid #1f2937' }}>
                              {item.avatarInitial || t('startupDetail.sheet.systemInitial')}
                            </TimelineAvatarFallback>
                            <TimelineContent>
                              <TimelineText>{item.content}</TimelineText>
                              <TimelineDate>{item.date}</TimelineDate>
                            </TimelineContent>
                          </TimelineItem>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '24px 0' }}>
                          {activeTab === 'notes' ? t('startupDetail.noNotes') : t('startupDetail.noActivity')}
                        </div>
                      )}
                    </TimelineContainer>
                  </Section>
                );
              })()}
            </>
          )}
        </SheetContent>
      </SheetContainer>
    </>
  );

  return (
    <>
      {createPortal(sheetContent, document.body)}
      <AssignManagerModal
        isOpen={reassignModalOpen}
        startupName={displayStartup?.brief?.companyName || ''}
        onConfirm={handleReassignManager}
        onCancel={() => setReassignModalOpen(false)}
      />
    </>
  );
};
