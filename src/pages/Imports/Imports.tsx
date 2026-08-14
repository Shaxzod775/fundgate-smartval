import { ChangeEvent, type ReactNode, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { numberLocale } from '../../utils/formatNumber';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Database,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  Loader2,
  Send,
  Settings,
  Sparkles,
  Table2,
  TrendingUp,
  UploadCloud,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  importsApi,
  ImportBatch,
  ImportItem,
  PortfolioImportAnalysis,
  PortfolioImportApplyDecision,
  PortfolioImportApplySummary,
  PortfolioImportPreviewRow,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from '../../styles/animations';
import { fieldLabel } from '../../utils/fieldLabels';

const PageContainer = styled.div`
  ${PageTransition};
  padding: ${({ theme }) => theme.spacing[8]};
  max-width: 1120px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.spacing[5]};
  }
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.spacing[6]};
  align-items: end;
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.05;
  letter-spacing: 0;
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.spacing[4]} 0 0;
  max-width: 680px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1.55;
`;

const SafetyBadge = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.status.warningBorder};
  background: ${({ theme }) => theme.colors.status.warningBg};
  border-radius: ${({ theme }) => theme.radius.lg};
  color: ${({ theme }) => theme.colors.status.warningLight};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  white-space: nowrap;

  svg {
    width: 17px;
    height: 17px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  letter-spacing: 0;

  svg {
    width: 22px;
    height: 22px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const PanelText = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[5]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  line-height: 1.55;
`;

const UploadBox = styled.label<{ $hasFile: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: ${({ theme }) => theme.spacing[6]};
  border: 1px dashed ${({ $hasFile, theme }) => ($hasFile ? theme.colors.accent.primary : theme.colors.border.input)};
  background: ${({ $hasFile, theme }) => ($hasFile ? theme.colors.accent.primaryLight : theme.colors.bg.secondary)};
  border-radius: ${({ theme }) => theme.radius.xl};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }

  input {
    display: none;
  }

  svg {
    width: 42px;
    height: 42px;
    color: ${({ theme }) => theme.colors.accent.primary};
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }
`;

const UploadTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  text-align: center;
`;

const UploadHint = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

const ActionRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing[5]};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 46px;
  padding: 0 ${({ theme }) => theme.spacing[5]};
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.accent.primary};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.base};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  svg {
    width: 18px;
    height: 18px;
  }

  .spin {
    animation: imports-spin 1s linear infinite;
  }

  @keyframes imports-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const SecondaryText = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid
    ${({ $type, theme }) =>
      $type === 'success'
        ? theme.colors.status.successBorder
        : $type === 'error'
          ? theme.colors.status.dangerBorder
          : theme.colors.status.infoBorder};
  background:
    ${({ $type, theme }) =>
      $type === 'success'
        ? theme.colors.status.successBg
        : $type === 'error'
          ? theme.colors.status.dangerBg
          : theme.colors.status.infoBg};
  color:
    ${({ $type, theme }) =>
      $type === 'success'
        ? theme.colors.status.successLight
        : $type === 'error'
          ? theme.colors.status.error
          : theme.colors.status.info};
  border-radius: ${({ theme }) => theme.radius.lg};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    margin-top: 1px;
  }
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const StatValue = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const TypeList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const TypeRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const PreviewTable = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PreviewRow = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 0.9fr) minmax(120px, 0.9fr) minmax(180px, 1.2fr);
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  min-height: 260px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  border: 1px dashed ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.xl};
  color: ${({ theme }) => theme.colors.text.muted};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};

  svg {
    width: 44px;
    height: 44px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const CompactPanel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.card};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  margin: ${({ theme }) => theme.spacing[5]} 0 ${({ theme }) => theme.spacing[6]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const CompactHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: start;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const CompactTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CompactTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1.25;
`;

const CompactDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const CompactBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.status.warningBorder};
  background: ${({ theme }) => theme.colors.status.warningBg};
  color: ${({ theme }) => theme.colors.status.warningLight};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  white-space: nowrap;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CompactControls = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: stretch;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const CompactUploadBox = styled.label<{ $hasFile: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-height: 54px;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px dashed ${({ $hasFile, theme }) => ($hasFile ? theme.colors.accent.primary : theme.colors.border.input)};
  background: ${({ $hasFile, theme }) => ($hasFile ? theme.colors.accent.primaryLight : theme.colors.bg.secondary)};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }

  input {
    display: none;
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.accent.primary};
    flex: 0 0 auto;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  span {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const CompactButton = styled(PrimaryButton)`
  min-height: 54px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  white-space: nowrap;

  @media (max-width: 720px) {
    width: 100%;
  }
`;

const CompactNote = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.4;
`;

const CompactResultPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const CompactResultTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};

  svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const InlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const ApplyActionBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.card};
  box-shadow: ${({ theme }) => theme.shadows.md};

  ${InlineActions} {
    justify-content: flex-end;
    margin-top: 0;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;

    ${InlineActions} {
      justify-content: stretch;
    }
  }
`;

const ApplyIntroTitle = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 700;
`;

const ApplyIntroText = styled.div`
  margin-top: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const ApplyPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ApplyPill = styled.span<{ $tone: 'create' | 'update' | 'skip' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  min-height: 28px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ $tone, theme }) => {
    if ($tone === 'create') return theme.colors.status.successBorder;
    if ($tone === 'update') return theme.colors.status.infoBorder;
    return theme.colors.border.secondary;
  }};
  background: ${({ $tone, theme }) => {
    if ($tone === 'create') return theme.colors.status.successBg;
    if ($tone === 'update') return theme.colors.status.infoBg;
    return theme.colors.bg.secondary;
  }};
  color: ${({ $tone, theme }) => {
    if ($tone === 'create') return theme.colors.status.success;
    if ($tone === 'update') return theme.colors.status.info;
    return theme.colors.text.secondary;
  }};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 42px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ReviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg.overlay};

  @media (max-width: 720px) {
    padding: ${({ theme }) => theme.spacing[3]};
  }
`;

const ReviewModal = styled.div`
  width: min(1180px, 100%);
  max-height: min(860px, 92vh);
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  background: ${({ theme }) => theme.colors.bg.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  overflow: hidden;
`;

const ReviewHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: start;
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[3]};
`;

const ReviewTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  line-height: 1.2;

  svg {
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ReviewMeta = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const TabRow = styled.div`
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 52px;
  padding: 0 ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  background: ${({ theme }) => theme.colors.bg.primary};
  overflow-x: auto;
  overflow-y: hidden;
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 38px;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.border.secondary)};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $active, theme }) => ($active ? theme.colors.accent.primaryLight : theme.colors.bg.secondary)};
  color: ${({ $active, theme }) => ($active ? theme.colors.accent.primary : theme.colors.text.secondary)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
`;

const ReviewBody = styled.div`
  overflow: auto;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[5]};
`;

const ReviewTable = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MappingHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) 32px minmax(220px, 1fr) 100px;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  padding: 0 ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;

  span:last-child {
    text-align: right;
  }

  @media (max-width: 720px) {
    display: none;
  }
`;

const MappingRow = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) 32px minmax(220px, 1fr) 100px;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const WarningRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const MappingCell = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 0;
`;

const MappingKicker = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const MappingColumnName = styled.strong`
  display: block;
  padding-left: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MappingTargetTitle = styled.strong`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const MappingArrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent.primary};

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 720px) {
    justify-content: flex-start;
    transform: rotate(90deg);
  }
`;

const SourceLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ConfidenceBadge = styled.span<{ $confidence: number }>`
  justify-self: end;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ $confidence, theme }) =>
    $confidence >= 0.75
      ? theme.colors.status.successBg
      : $confidence >= 0.5
        ? theme.colors.status.warningBg
        : theme.colors.status.dangerBg};
  color: ${({ $confidence, theme }) =>
    $confidence >= 0.75
      ? theme.colors.status.success
      : $confidence >= 0.5
        ? theme.colors.status.warning
        : theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;

  @media (max-width: 720px) {
    justify-self: start;
  }
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PreviewStack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PreviewSummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const PreviewSummaryCard = styled.div<{ $tone: 'create' | 'update' | 'existing' | 'skipped' }>`
  border: 1px solid ${({ $tone, theme }) => {
    if ($tone === 'create') return theme.colors.status.successBorder;
    if ($tone === 'update') return theme.colors.status.warningBorder;
    if ($tone === 'skipped') return theme.colors.status.dangerBorder;
    return theme.colors.border.secondary;
  }};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $tone, theme }) => {
    if ($tone === 'create') return theme.colors.status.successBg;
    if ($tone === 'update') return theme.colors.status.warningBg;
    if ($tone === 'skipped') return theme.colors.status.dangerBg;
    return theme.colors.bg.secondary;
  }};
  padding: ${({ theme }) => theme.spacing[3]};

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.xl};
    font-weight: 700;
    line-height: 1;
    margin-bottom: ${({ theme }) => theme.spacing[2]};
  }

  span {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }
`;

const PreviewCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.secondary};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const PreviewName = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const PreviewMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
`;

const ChangeList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const ChangeRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ChangeField = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const ChangeValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
  word-break: break-word;
`;

const PreviewNote = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const MetricLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ApplyRow = styled.div`
  display: grid;
  grid-template-columns: 160px minmax(160px, 1fr) minmax(280px, 1.5fr);
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.secondary};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FormControl = styled.label`
  display: grid;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
  text-transform: uppercase;
`;

const Select = styled.select`
  min-height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 ${({ theme }) => theme.spacing[3]};
`;

const TextInput = styled.input`
  min-height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0 ${({ theme }) => theme.spacing[3]};
`;

const PatchTextarea = styled.textarea`
  min-height: 118px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.input};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: ${({ theme }) => theme.spacing[3]};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function getPreviewValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const SHEET_EMOJI_PATTERN = /[📊📁🏦📈⚙️]/g;

function cleanSheetName(value?: string | null): string {
  return String(value || 'Workbook')
    .replace(SHEET_EMOJI_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Workbook';
}

function cleanDisplayText(value: string): string {
  return value.replace(SHEET_EMOJI_PATTERN, '').replace(/\s+/g, ' ').trim();
}

function isTechnicalImportWarning(value: string): boolean {
  return /GEMINI_API_KEY|Gemini error|portfolio import AI analysis/i.test(value);
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function formatAnalysisModelLabel(analysis: PortfolioImportAnalysis, translate: Translate): string {
  if (analysis.model === 'rule-based fallback' || (analysis.warnings || []).some(isTechnicalImportWarning)) {
    return translate('imports.ai.ruleBasedModel');
  }
  return analysis.model;
}

function getSheetIcon(sheetName?: string | null): LucideIcon {
  const normalized = cleanSheetName(sheetName).toLowerCase();
  if (normalized.includes('dashboard')) return LayoutDashboard;
  if (normalized.includes('карточка') || normalized.includes('card')) return FileText;
  if (normalized.includes('cap table')) return Landmark;
  if (normalized.includes('traction')) return TrendingUp;
  if (normalized.includes('настрой')) return Settings;
  return FileSpreadsheet;
}

function SourceSheetLabel({ sheetName, children }: { sheetName?: string | null; children?: ReactNode }) {
  const Icon = getSheetIcon(sheetName);
  return (
    <SourceLabel>
      <Icon aria-hidden="true" />
      <span>
        {cleanSheetName(sheetName)}
        {children}
      </span>
    </SourceLabel>
  );
}

type ReviewTab = 'mapping' | 'preview' | 'warnings' | 'apply';

interface ApplyDecisionDraft {
  action: 'update' | 'create' | 'skip';
  startupId: string;
  patchText: string;
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatChangeValue(value: unknown, translate: Translate): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    return value.toLocaleString(numberLocale(), { maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? translate('common.yes') : translate('common.no');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getPreviewActionLabel(row: PortfolioImportPreviewRow, translate: Translate): string {
  if (row.action === 'create') return translate('imports.ai.newStartup');
  if (row.action === 'update') {
    return row.changeCount
      ? translate('imports.ai.preview.fieldsWillUpdateCount', { value: row.changeCount })
      : translate('imports.ai.preview.fieldsWillUpdate');
  }
  if (row.match?.matchedStartupId) return translate('imports.ai.preview.alreadyExists');
  return translate('imports.ai.actions.skip');
}

function getPreviewSummary(rows?: PortfolioImportPreviewRow[]) {
  const items = rows || [];
  return {
    create: items.filter((row) => row.action === 'create').length,
    update: items.filter((row) => row.action === 'update').length,
    existing: items.filter((row) => row.action === 'skip' && row.match?.matchedStartupId).length,
    skipped: items.filter((row) => row.action === 'skip' && !row.match?.matchedStartupId).length,
  };
}

function buildApplyDrafts(rows: PortfolioImportPreviewRow[]): Record<string, ApplyDecisionDraft> {
  return rows.reduce<Record<string, ApplyDecisionDraft>>((acc, row) => {
    acc[row.itemId] = {
      action: row.action,
      startupId: row.match?.matchedStartupId || '',
      patchText: JSON.stringify(row.patch || {}, null, 2),
    };
    return acc;
  }, {});
}

function buildApplyDecisions(drafts: Record<string, ApplyDecisionDraft>): PortfolioImportApplyDecision[] {
  return Object.entries(drafts).map(([itemId, draft]) => ({
    itemId,
    action: draft.action,
    startupId: draft.startupId || undefined,
    patch: draft.action === 'skip' ? undefined : JSON.parse(draft.patchText || '{}'),
  }));
}

interface PortfolioImportSectionProps {
  embedded?: boolean;
  onApplied?: (summary: PortfolioImportApplySummary) => void;
}

export function PortfolioImportSection({ embedded = false, onApplied }: PortfolioImportSectionProps) {
  const { t } = useTranslation();
  const translate: Translate = (key, options) => String(t(key, options));
  const navigate = useNavigate();
  const { organization, manager } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [analysis, setAnalysis] = useState<PortfolioImportAnalysis | null>(null);
  const [applyDrafts, setApplyDrafts] = useState<Record<string, ApplyDecisionDraft>>({});
  const [applySummary, setApplySummary] = useState<PortfolioImportApplySummary | null>(null);
  const [activeTab, setActiveTab] = useState<ReviewTab>('mapping');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isOpeningAssistant, setIsOpeningAssistant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (batch?.items || []).forEach((item) => {
      const key = item.mappedType || 'unmapped';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [batch]);

  const previewItems = useMemo<ImportItem[]>(() => (batch?.items || []).slice(0, 10), [batch]);
  const currentAnalysis = analysis || batch?.analysis || null;
  const visibleAnalysisWarnings = useMemo(
    () => (currentAnalysis?.warnings || []).filter((warning) => !isTechnicalImportWarning(warning)),
    [currentAnalysis]
  );
  const previewSummary = useMemo(
    () => getPreviewSummary(currentAnalysis?.portfolioPreview),
    [currentAnalysis]
  );
  const applyCounts = useMemo(() => {
    const drafts = Object.values(applyDrafts);
    return {
      create: drafts.filter((draft) => draft.action === 'create').length,
      update: drafts.filter((draft) => draft.action === 'update').length,
      skip: drafts.filter((draft) => draft.action === 'skip').length,
    };
  }, [applyDrafts]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setError(null);
    setAnalysis(null);
    setApplySummary(null);
    setApplyDrafts({});
  };

  const handleAnalyze = async (batchId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await importsApi.analyzeImportBatch(batchId, { organizationId: organization?.id });
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || t('imports.errors.analysisFailed'));
      }

      setAnalysis(response.data);
      setApplyDrafts(buildApplyDrafts(response.data.portfolioPreview || []));
      setActiveTab('mapping');
      setIsReviewOpen(true);

      const details = await importsApi.getImportBatch(batchId);
      if (details.success && details.data) setBatch(details.data);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : t('imports.errors.analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError(t('imports.errors.invalidFile'));
      return;
    }

    setIsUploading(true);
    setError(null);
    setBatch(null);
    setAnalysis(null);
    setApplySummary(null);
    setApplyDrafts({});

    try {
      const fileBase64 = await fileToBase64(file);
      const response = await importsApi.importItParkPortfolio({
        fileBase64,
        fileName: file.name,
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        organizationId: organization?.id,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || t('imports.errors.uploadFailed'));
      }

      const batchId = response.data.batchId || response.data.id;
      const details = await importsApi.getImportBatch(batchId);
      const loadedBatch = details.success && details.data ? details.data : response.data;
      setBatch(loadedBatch);
      if (loadedBatch.analysis) {
        setAnalysis(loadedBatch.analysis);
        setApplyDrafts(buildApplyDrafts(loadedBatch.analysis.portfolioPreview || []));
        setIsReviewOpen(true);
      } else {
        await handleAnalyze(batchId);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('imports.errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const updateApplyDraft = (itemId: string, updates: Partial<ApplyDecisionDraft>) => {
    setApplyDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { action: 'skip', startupId: '', patchText: '{}' }),
        ...updates,
      },
    }));
  };

  const handleApply = async () => {
    if (!batch?.id || !currentAnalysis) return;
    setIsApplying(true);
    setError(null);

    try {
      const decisions = buildApplyDecisions(applyDrafts);
      const response = await importsApi.applyImportBatch(batch.id, {
        organizationId: organization?.id,
        decisions,
      });

      if (!response.data) {
        throw new Error(response.error || response.message || t('imports.errors.applyFailed'));
      }

      setApplySummary(response.data);
      onApplied?.(response.data);
      if (!response.success) {
        setError(response.error || t('imports.errors.applyPartial'));
      }

      const details = await importsApi.getImportBatch(batch.id);
      if (details.success && details.data) setBatch(details.data);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : t('imports.errors.applyFailed'));
    } finally {
      setIsApplying(false);
    }
  };

  const handleOpenAssistant = async () => {
    if (!batch?.id) return;
    setIsOpeningAssistant(true);
    setError(null);

    try {
      const response = await importsApi.createImportAssistantChat(batch.id, {
        organizationId: organization?.id,
        managerId: manager?.id,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || t('imports.errors.assistantFailed'));
      }
      navigate(`/ai-assistant?chat=${response.data.chatId}`);
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : t('imports.errors.assistantFailed'));
    } finally {
      setIsOpeningAssistant(false);
    }
  };

  const reviewModal = currentAnalysis && isReviewOpen ? (
    <ReviewOverlay>
      <ReviewModal>
        <ReviewHeader>
          <div>
            <ReviewTitle>
              <BrainCircuit />
              {t('imports.ai.title')}
            </ReviewTitle>
            <ReviewMeta>
              {batch?.fileName || file?.name || 'Workbook'} · {formatAnalysisModelLabel(currentAnalysis, translate)} · {Math.round((currentAnalysis.confidence || 0) * 100)}%
            </ReviewMeta>
          </div>
          <CloseButton type="button" onClick={() => setIsReviewOpen(false)} aria-label={t('common.close')}>
            <X />
          </CloseButton>
        </ReviewHeader>

        <TabRow>
          {([
            ['mapping', t('imports.ai.tabs.mapping')],
            ['preview', t('imports.ai.tabs.preview')],
            ['warnings', t('imports.ai.tabs.warnings')],
            ['apply', t('imports.ai.tabs.apply')],
          ] as Array<[ReviewTab, string]>).map(([tab, label]) => (
            <TabButton key={tab} type="button" $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {label}
            </TabButton>
          ))}
        </TabRow>

        <ReviewBody>
          {activeTab === 'mapping' && (
                <ReviewTable>
                  <MappingHeader>
                    <span>{t('imports.ai.mapping.source')}</span>
                    <span />
                    <span>{t('imports.ai.mapping.target')}</span>
                    <span>{t('imports.ai.mapping.confidence')}</span>
                  </MappingHeader>
                  {currentAnalysis.fieldMappings.map((mapping, index) => (
                    <MappingRow key={`${mapping.sourceColumn}-${index}`}>
                      <MappingCell>
                        <MappingKicker>{t('imports.ai.mapping.sheetAndColumn')}</MappingKicker>
                        <SourceSheetLabel sheetName={mapping.sourceSheet} />
                        <MappingColumnName>{mapping.sourceColumn}</MappingColumnName>
                      </MappingCell>
                      <MappingArrow aria-hidden="true">
                        <ArrowRight />
                      </MappingArrow>
                      <MappingCell>
                        <MappingKicker>{t('imports.ai.mapping.willBeSavedAs')}</MappingKicker>
                        <MappingTargetTitle>{fieldLabel(mapping.targetField)}</MappingTargetTitle>
                      </MappingCell>
                      <ConfidenceBadge $confidence={mapping.confidence}>
                        {Math.round(mapping.confidence * 100)}%
                  </ConfidenceBadge>
                </MappingRow>
              ))}
            </ReviewTable>
          )}

          {activeTab === 'preview' && (
            <PreviewStack>
              <PreviewSummaryGrid>
                <PreviewSummaryCard $tone="create">
                  <strong>{previewSummary.create}</strong>
                  <span>{t('imports.ai.preview.summaryCreate')}</span>
                </PreviewSummaryCard>
                <PreviewSummaryCard $tone="update">
                  <strong>{previewSummary.update}</strong>
                  <span>{t('imports.ai.preview.summaryUpdate')}</span>
                </PreviewSummaryCard>
                <PreviewSummaryCard $tone="existing">
                  <strong>{previewSummary.existing}</strong>
                  <span>{t('imports.ai.preview.alreadyExists')}</span>
                </PreviewSummaryCard>
                <PreviewSummaryCard $tone="skipped">
                  <strong>{previewSummary.skipped}</strong>
                  <span>{t('imports.ai.preview.summarySkipped')}</span>
                </PreviewSummaryCard>
              </PreviewSummaryGrid>

              <PreviewGrid>
                {currentAnalysis.portfolioPreview.map((row) => (
                  <PreviewCard key={row.itemId}>
                    <PreviewName>{row.display.companyName || row.startupName || '-'}</PreviewName>
                    <PreviewMeta>
                      {row.display.country || '-'} · {row.display.industry || '-'} · {row.display.stage || '-'}
                    </PreviewMeta>
                    <MetricLine>
                      <span>{t('imports.ai.action')}</span>
                      <strong>{getPreviewActionLabel(row, translate)}</strong>
                    </MetricLine>
                    <MetricLine>
                      <span>{t('imports.ai.match')}</span>
                      <strong>{row.match.matchedStartupName || t('imports.ai.newStartup')}</strong>
                    </MetricLine>
                    <MetricLine>
                      <span>{t('imports.ai.investment')}</span>
                      <strong>{formatCurrency(row.display.investmentAmount)}</strong>
                    </MetricLine>
                    <MetricLine>
                      <span>MRR / runway</span>
                      <strong>{formatCurrency(row.display.mrr)} / {row.display.runway ?? '-'} {t('portfolio.units.monthShort')}</strong>
                    </MetricLine>
                    {row.action === 'update' && (row.changes || []).length > 0 && (
                      <ChangeList>
                        {(row.changes || []).slice(0, 4).map((change) => (
                          <ChangeRow key={`${row.itemId}-${change.field}`}>
                            <ChangeField>{fieldLabel(change.field)}</ChangeField>
                            <ChangeValue>{formatChangeValue(change.before, translate)} → {formatChangeValue(change.after, translate)}</ChangeValue>
                          </ChangeRow>
                        ))}
                        {(row.changeCount || 0) > 4 && (
                          <PreviewNote>{t('imports.ai.preview.moreChanges', { value: (row.changeCount || 0) - 4 })}</PreviewNote>
                        )}
                      </ChangeList>
                    )}
                    {row.action === 'skip' && row.match?.matchedStartupId && (
                      <PreviewNote>{t('imports.ai.preview.noDiff')}</PreviewNote>
                    )}
                  </PreviewCard>
                ))}
              </PreviewGrid>
            </PreviewStack>
          )}

          {activeTab === 'warnings' && (
            <ReviewTable>
              {[...visibleAnalysisWarnings, ...currentAnalysis.unmappedColumns.map((column) => `${t('imports.ai.unmapped')}: ${column}`)].map((warning, index) => (
                <WarningRow key={`${warning}-${index}`}>
                  <span><strong>{cleanDisplayText(warning)}</strong></span>
                  <ConfidenceBadge $confidence={0.4}>{t('imports.ai.reviewTag')}</ConfidenceBadge>
                </WarningRow>
              ))}
              {visibleAnalysisWarnings.length === 0 && currentAnalysis.unmappedColumns.length === 0 && (
                <StatusMessage $type="success">
                  <CheckCircle2 />
                  <span>{t('imports.ai.noWarnings')}</span>
                </StatusMessage>
              )}
            </ReviewTable>
          )}

          {activeTab === 'apply' && (
            <>
              <ApplyActionBar>
                <div>
                  <ApplyIntroTitle>{t('imports.ai.applyTitle')}</ApplyIntroTitle>
                  <ApplyIntroText>{t('imports.ai.applyDescription')}</ApplyIntroText>
                  <ApplyPillRow>
                    <ApplyPill $tone="create">{t('imports.ai.actions.create')}: {applyCounts.create}</ApplyPill>
                    <ApplyPill $tone="update">{t('imports.ai.actions.update')}: {applyCounts.update}</ApplyPill>
                    <ApplyPill $tone="skip">{t('imports.ai.actions.skip')}: {applyCounts.skip}</ApplyPill>
                  </ApplyPillRow>
                </div>
                <InlineActions>
                  <PrimaryButton type="button" onClick={handleApply} disabled={isApplying || currentAnalysis.portfolioPreview.length === 0}>
                    {isApplying ? <Loader2 className="spin" /> : <CheckCircle2 />}
                    {isApplying ? t('imports.ai.applying') : t('imports.ai.applyToPortfolio')}
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={handleOpenAssistant} disabled={isOpeningAssistant}>
                    {isOpeningAssistant ? <Loader2 className="spin" /> : <Send />}
                    {t('imports.ai.openAssistant')}
                  </SecondaryButton>
                </InlineActions>
              </ApplyActionBar>

              <ReviewTable>
                {currentAnalysis.portfolioPreview.map((row) => {
                  const draft = applyDrafts[row.itemId] || {
                    action: row.action,
                    startupId: row.match.matchedStartupId || '',
                    patchText: JSON.stringify(row.patch || {}, null, 2),
                  };
                  return (
                    <ApplyRow key={row.itemId}>
                      <FormControl>
                        {t('imports.ai.action')}
                        <Select
                          value={draft.action}
                          onChange={(event) => updateApplyDraft(row.itemId, { action: event.target.value as ApplyDecisionDraft['action'] })}
                        >
                          <option value="update">{t('imports.ai.actions.update')}</option>
                          <option value="create">{t('imports.ai.actions.create')}</option>
                          <option value="skip">{t('imports.ai.actions.skip')}</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        {row.display.companyName || row.startupName || t('imports.ai.startup')}
                        <TextInput
                          value={draft.startupId}
                          placeholder={row.match.matchedStartupName || t('imports.ai.startupId')}
                          onChange={(event) => updateApplyDraft(row.itemId, { startupId: event.target.value })}
                          disabled={draft.action !== 'update'}
                        />
                      </FormControl>
                      <FormControl>
                        Patch JSON
                        <PatchTextarea
                          value={draft.patchText}
                          onChange={(event) => updateApplyDraft(row.itemId, { patchText: event.target.value })}
                          disabled={draft.action === 'skip'}
                        />
                      </FormControl>
                    </ApplyRow>
                  );
                })}
              </ReviewTable>

              {applySummary && (
                <StatusMessage $type={applySummary.failed > 0 ? 'error' : 'success'}>
                  <CheckCircle2 />
                  <span>
                    {t('imports.ai.applySummary', {
                      updated: applySummary.updated,
                      created: applySummary.created,
                      skipped: applySummary.skipped,
                      failed: applySummary.failed,
                    })}
                  </span>
                </StatusMessage>
              )}
            </>
          )}
        </ReviewBody>
      </ReviewModal>
    </ReviewOverlay>
  ) : null;

  if (embedded) {
    return (
      <>
        <CompactPanel>
          <CompactHeader>
            <div>
              <CompactTitleRow>
                <FileSpreadsheet />
                <CompactTitle>{t('imports.title')}</CompactTitle>
              </CompactTitleRow>
              <CompactDescription>{t('imports.subtitle')}</CompactDescription>
            </div>
            <CompactBadge>
              <Sparkles />
              {t('imports.ai.reviewBadge')}
            </CompactBadge>
          </CompactHeader>

          <CompactControls>
            <CompactUploadBox $hasFile={Boolean(file)}>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
              <UploadCloud />
              <div>
                <strong>{file ? file.name : t('imports.upload.title')}</strong>
                <span>{file ? t('imports.upload.ready') : t('imports.upload.hint')}</span>
              </div>
            </CompactUploadBox>

            <CompactButton type="button" onClick={handleUpload} disabled={!file || isUploading || isAnalyzing}>
              {isUploading || isAnalyzing ? <Loader2 className="spin" /> : <UploadCloud />}
              {isAnalyzing ? t('imports.ai.analyzing') : isUploading ? t('imports.upload.processing') : t('imports.upload.button')}
            </CompactButton>
          </CompactControls>

          <CompactNote>{t('imports.upload.note')}</CompactNote>

          {error && (
            <StatusMessage $type="error">
              <AlertCircle />
              <span>{error}</span>
            </StatusMessage>
          )}

          {batch && (
            <CompactResultPanel>
              <StatusMessage $type="success">
                <CheckCircle2 />
                <span>{currentAnalysis ? t('imports.ai.ready') : t('imports.result.created')}</span>
              </StatusMessage>

              <CompactResultTitle>
                <Table2 />
                {t('imports.result.title')}
              </CompactResultTitle>

              <ResultGrid>
                <StatCard>
                  <StatLabel>{t('imports.result.batch')}</StatLabel>
                  <StatValue>{batch.id}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>{t('imports.result.rows')}</StatLabel>
                  <StatValue>{batch.itemCount || batch.items?.length || 0}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>{t('imports.result.status')}</StatLabel>
                  <StatValue>{t(`imports.status.${batch.status}`, { defaultValue: batch.status })}</StatValue>
                </StatCard>
              </ResultGrid>

              {typeCounts.length > 0 && (
                <TypeList>
                  {typeCounts.map(([type, count]) => (
                    <TypeRow key={type}>
                      <strong>{t(`imports.types.${type}`, { defaultValue: type })}</strong>
                      <span>{count}</span>
                    </TypeRow>
                  ))}
                </TypeList>
              )}

              <PreviewTable>
                {previewItems.slice(0, 5).map((item) => (
                  <PreviewRow key={item.id}>
                    <div>
                      <StatLabel>{t('imports.preview.sheet')}</StatLabel>
                      <SourceSheetLabel sheetName={item.sheetName}>
                        {' '}
                        #{item.rowNumber || item.index + 1}
                      </SourceSheetLabel>
                    </div>
                    <div>
                      <StatLabel>{t('imports.preview.type')}</StatLabel>
                      {t(`imports.types.${item.mappedType || 'unmapped'}`, { defaultValue: item.mappedType || 'unmapped' })}
                    </div>
                    <div>
                      <StatLabel>{t('imports.preview.startup')}</StatLabel>
                      {getPreviewValue(item.startupName)}
                    </div>
                  </PreviewRow>
                ))}
              </PreviewTable>

              <InlineActions>
                <PrimaryButton type="button" onClick={() => setIsReviewOpen(true)} disabled={!currentAnalysis}>
                  <BrainCircuit />
                  {t('imports.ai.review')}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => batch.id && handleAnalyze(batch.id)} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="spin" /> : <Sparkles />}
                  {t('imports.ai.rerun')}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={handleOpenAssistant} disabled={!currentAnalysis || isOpeningAssistant}>
                  {isOpeningAssistant ? <Loader2 className="spin" /> : <ExternalLink />}
                  {t('imports.ai.openAssistant')}
                </SecondaryButton>
              </InlineActions>
            </CompactResultPanel>
          )}
        </CompactPanel>
        {reviewModal}
      </>
    );
  }

  return (
    <>
      <Header>
        <div>
          <Eyebrow>
            <Database />
            {t('imports.eyebrow')}
          </Eyebrow>
          <Title>{t('imports.title')}</Title>
          <Subtitle>{t('imports.subtitle')}</Subtitle>
        </div>
        <SafetyBadge>
          <Sparkles />
          {t('imports.ai.reviewBadge')}
        </SafetyBadge>
      </Header>

      <Grid>
        <Panel>
          <PanelTitle>
            <FileSpreadsheet />
            {t('imports.workbook.title')}
          </PanelTitle>
          <PanelText>{t('imports.workbook.description')}</PanelText>

          <UploadBox $hasFile={Boolean(file)}>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
            <UploadCloud />
            <UploadTitle>{file ? file.name : t('imports.upload.title')}</UploadTitle>
            <UploadHint>{file ? t('imports.upload.ready') : t('imports.upload.hint')}</UploadHint>
          </UploadBox>

          <ActionRow>
            <PrimaryButton type="button" onClick={handleUpload} disabled={!file || isUploading || isAnalyzing}>
              {isUploading || isAnalyzing ? <Loader2 className="spin" /> : <UploadCloud />}
              {isAnalyzing ? t('imports.ai.analyzing') : isUploading ? t('imports.upload.processing') : t('imports.upload.button')}
            </PrimaryButton>
            <SecondaryText>{t('imports.upload.note')}</SecondaryText>
          </ActionRow>

          {error && (
            <StatusMessage $type="error">
              <AlertCircle />
              <span>{error}</span>
            </StatusMessage>
          )}

          {batch && (
            <StatusMessage $type="success">
              <CheckCircle2 />
              <span>{currentAnalysis ? t('imports.ai.ready') : t('imports.result.created')}</span>
            </StatusMessage>
          )}
        </Panel>

        <Panel>
          <PanelTitle>
            <Table2 />
            {t('imports.result.title')}
          </PanelTitle>
          <PanelText>{t('imports.result.description')}</PanelText>

          {!batch ? (
            <EmptyState>
              <Table2 />
              <strong>{t('imports.empty.title')}</strong>
              <span>{t('imports.empty.description')}</span>
            </EmptyState>
          ) : (
            <>
              <ResultGrid>
                <StatCard>
                  <StatLabel>{t('imports.result.batch')}</StatLabel>
                  <StatValue>{batch.id}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>{t('imports.result.rows')}</StatLabel>
                  <StatValue>{batch.itemCount || batch.items?.length || 0}</StatValue>
                </StatCard>
                <StatCard>
                  <StatLabel>{t('imports.result.status')}</StatLabel>
                  <StatValue>{t(`imports.status.${batch.status}`, { defaultValue: batch.status })}</StatValue>
                </StatCard>
              </ResultGrid>

              {typeCounts.length > 0 && (
                <TypeList>
                  {typeCounts.map(([type, count]) => (
                    <TypeRow key={type}>
                      <strong>{t(`imports.types.${type}`, { defaultValue: type })}</strong>
                      <span>{count}</span>
                    </TypeRow>
                  ))}
                </TypeList>
              )}

              <PreviewTable>
                {previewItems.map((item) => (
                  <PreviewRow key={item.id}>
                    <div>
                      <StatLabel>{t('imports.preview.sheet')}</StatLabel>
                      <SourceSheetLabel sheetName={item.sheetName}>
                        {' '}
                        #{item.rowNumber || item.index + 1}
                      </SourceSheetLabel>
                    </div>
                    <div>
                      <StatLabel>{t('imports.preview.type')}</StatLabel>
                      {t(`imports.types.${item.mappedType || 'unmapped'}`, { defaultValue: item.mappedType || 'unmapped' })}
                    </div>
                    <div>
                      <StatLabel>{t('imports.preview.startup')}</StatLabel>
                      {getPreviewValue(item.startupName)}
                    </div>
                  </PreviewRow>
                ))}
              </PreviewTable>

              <InlineActions>
                <PrimaryButton type="button" onClick={() => setIsReviewOpen(true)} disabled={!currentAnalysis}>
                  <BrainCircuit />
                  {t('imports.ai.review')}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => batch.id && handleAnalyze(batch.id)} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="spin" /> : <Sparkles />}
                  {t('imports.ai.rerun')}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={handleOpenAssistant} disabled={!currentAnalysis || isOpeningAssistant}>
                  {isOpeningAssistant ? <Loader2 className="spin" /> : <ExternalLink />}
                  {t('imports.ai.openAssistant')}
                </SecondaryButton>
              </InlineActions>
            </>
          )}
        </Panel>
      </Grid>
      {reviewModal}
    </>
  );
}

export default function Imports() {
  return (
    <PageContainer>
      <PortfolioImportSection />
    </PageContainer>
  );
}
