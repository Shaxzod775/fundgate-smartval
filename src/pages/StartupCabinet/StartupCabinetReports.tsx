import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Plus,
  FileText,
  Upload,
  X,
  Check,
  Clock,
  ChevronDown,
  AlertCircle,
  File,
} from 'lucide-react';
import { useStartupAuth } from '../../contexts/StartupAuthContext';
import { Button } from '../../components/ui/Button/Button';

import { CRM_API_BASE_URL as API_BASE_URL } from '../../services/api';
import { formatShortDate } from '../../utils/formatDate';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 800px; }
`;

const PageContainer = styled.div`
  animation: ${fadeInUp} 0.4s ease-out;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HeaderLeft = styled.div``;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const FormCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  animation: ${slideDown} 0.3s ease-out;
  overflow: hidden;

  @media (max-width: 480px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`;

const FormTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  padding-right: 40px;
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  option {
    background: #1a1a1a;
    color: white;
  }
`;

const SelectIcon = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid ${({ theme }) => theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
  box-sizing: border-box;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const UploadArea = styled.div<{ $isDragOver?: boolean }>`
  border: 2px dashed ${({ $isDragOver, theme }) =>
    $isDragOver ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $isDragOver, theme }) =>
    $isDragOver ? theme.colors.accent.primaryLight : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.primaryLight};
  }
`;

const UploadIcon = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const UploadText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const UploadHint = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const FileName = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileSize = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`;

const RemoveFileButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.sm};
  display: flex;
  align-items: center;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.status.danger};
    background: ${({ theme }) => theme.colors.status.dangerBg};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ReportsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ReportItem = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const ReportIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  color: ${({ theme }) => theme.colors.accent.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ReportContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ReportType = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const ReportDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReportMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-shrink: 0;

  @media (max-width: 600px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ReportDate = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
`;

const StatusBadge = styled.div<{ $status: 'submitted' | 'in_review' | 'approved' | 'changes_requested' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  background: ${({ $status, theme }) => {
    if ($status === 'approved') return theme.colors.status.successBg;
    if ($status === 'changes_requested') return theme.colors.status.dangerBg;
    if ($status === 'in_review') return theme.colors.status.warningBg;
    return theme.colors.status.infoBg;
  }};
  color: ${({ $status, theme }) => {
    if ($status === 'approved') return theme.colors.status.success;
    if ($status === 'changes_requested') return theme.colors.status.danger;
    if ($status === 'in_review') return theme.colors.status.warning;
    return theme.colors.status.info;
  }};
  border: 1px solid ${({ $status, theme }) => {
    if ($status === 'approved') return theme.colors.status.successBorder;
    if ($status === 'changes_requested') return theme.colors.status.dangerBorder;
    if ($status === 'in_review') return theme.colors.status.warningBorder;
    return theme.colors.status.infoBorder;
  }};
`;

const ReviewNote = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.status.warningBorder};
  background: ${({ theme }) => theme.colors.status.warningBg};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]} ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyIcon = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const EmptyText = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const EmptyHint = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LoadingPage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  svg {
    animation: ${spin} 1s linear infinite;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.status.dangerBg};
  border: 1px solid ${({ theme }) => theme.colors.status.dangerBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SpinnerWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  svg { animation: ${spin} 1s linear infinite; }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const SectionHint = styled.p`
  margin: -${({ theme }) => theme.spacing[2]} 0 ${({ theme }) => theme.spacing[4]} 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FileGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const HiddenInput = styled.input`
  display: none;
`;

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface QuarterlyReport {
  id: string;
  period?: { year: number; quarter: Quarter };
  metrics?: Record<string, number | string | null | undefined>;
  narrative?: { traction?: string; risks?: string; asks?: string };
  files?: { fileName?: string; name?: string; url?: string }[];
  status?: 'submitted' | 'in_review' | 'approved' | 'changes_requested';
  submittedAt?: string;
  createdAt?: string;
  reviewNote?: string;
  reviewedAt?: string;
  revisionCount?: number;
}

const emptyMetrics = {
  mrr: '',
  arr: '',
  revenue: '',
  burn: '',
  runway: '',
  customMetrics: '',
};

export const StartupCabinetReports: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useStartupAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reports, setReports] = useState<QuarterlyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState<Quarter>('Q1');
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [traction, setTraction] = useState('');
  const [risks, setRisks] = useState('');
  const [asks, setAsks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoadingReports(true);
      try {
        const response = await fetch(`${API_BASE_URL}/cabinet/reports`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to load reports');

        const data = await response.json();
        if (data.success && data.data) {
          setReports(data.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load reports');
      } finally {
        setIsLoadingReports(false);
      }
    };

    if (token) {
      fetchReports();
    }
  }, [token]);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      if (files.length + validFiles.length >= MAX_FILES) {
        setFormError(t('reports.maxFiles', `Maximum ${MAX_FILES} files allowed`));
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFormError(t('reports.fileTooLarge', `File "${file.name}" exceeds 50MB limit`));
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFormError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resetForm = () => {
    setYear(String(new Date().getFullYear()));
    setQuarter('Q1');
    setMetrics(emptyMetrics);
    setTraction('');
    setRisks('');
    setAsks('');
    setFiles([]);
    setFormError('');
    setShowForm(false);
  };

  const parseNumber = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const fileToPayload = (file: File): Promise<{ fileBase64: string; fileName: string; contentType: string }> => (
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve({
          fileBase64: result.includes(',') ? result.split(',')[1] : result,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        });
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsDataURL(file);
    })
  );

  const handleSubmit = async () => {
    setFormError('');

    if (!traction.trim() && !risks.trim() && !asks.trim() && files.length === 0) {
      setFormError(t('reports.descriptionRequired', 'Add narrative or attach at least one document'));
      return;
    }

    setIsSubmitting(true);

    try {
      const filePayloads = await Promise.all(files.map(fileToPayload));

      const response = await fetch(`${API_BASE_URL}/cabinet/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: {
            year: Number(year) || new Date().getFullYear(),
            quarter,
          },
          metrics: {
            mrr: parseNumber(metrics.mrr),
            arr: parseNumber(metrics.arr),
            revenue: parseNumber(metrics.revenue),
            burn: parseNumber(metrics.burn),
            runway: parseNumber(metrics.runway),
            customMetrics: metrics.customMetrics.trim()
              ? { notes: metrics.customMetrics.trim() }
              : {},
          },
          narrative: {
            traction: traction.trim(),
            risks: risks.trim(),
            asks: asks.trim(),
          },
          files: filePayloads,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit report');
      }

      if (data.data) {
        setReports(prev => {
          const exists = prev.some((report) => report.id === data.data.id);
          return exists
            ? prev.map((report) => (report.id === data.data.id ? data.data : report))
            : [data.data, ...prev];
        });
      }

      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReportTitle = (report: QuarterlyReport): string => {
    if (!report.period) return t('reports.quarterly.untitled', 'Quarterly report');
    return t('reports.quarterly.periodTitle', {
      quarter: report.period.quarter,
      year: report.period.year,
      defaultValue: `${report.period.quarter} ${report.period.year}`,
    });
  };

  const getReportDescription = (report: QuarterlyReport): string => {
    return report.narrative?.traction || report.narrative?.risks || report.narrative?.asks || t('reports.quarterly.noNarrative', 'No narrative provided');
  };

  if (isLoadingReports) {
    return (
      <LoadingPage>
        <Loader2 size={32} />
      </LoadingPage>
    );
  }

  return (
    <PageContainer>
      <Header>
        <HeaderLeft>
          <PageTitle>{t('reports.title', 'Reports')}</PageTitle>
          <PageSubtitle>{t('reports.subtitle', 'Submit and track your progress reports')}</PageSubtitle>
        </HeaderLeft>
        {!showForm && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            {t('reports.submitNew', 'Submit New Report')}
          </Button>
        )}
      </Header>

      {error && (
        <ErrorBanner>
          <AlertCircle size={16} />
          {error}
        </ErrorBanner>
      )}

      {showForm && (
        <FormCard>
          <FormTitle>{t('reports.quarterly.title', 'Quarterly report')}</FormTitle>
          <SectionHint>{t('reports.quarterly.subtitle', 'Share metrics, progress, risks and documents for the selected quarter.')}</SectionHint>

          <FormGrid>
            <FormGroup>
              <Label>{t('reports.quarterly.year', 'Year')}</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.quarter', 'Quarter')}</Label>
              <SelectWrapper>
                <Select value={quarter} onChange={(e) => setQuarter(e.target.value as Quarter)}>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </Select>
                <SelectIcon><ChevronDown size={16} /></SelectIcon>
              </SelectWrapper>
            </FormGroup>
          </FormGrid>

          <FileGroupTitle>{t('reports.quarterly.metrics', 'Metrics')}</FileGroupTitle>
          <FormGrid>
            <FormGroup>
              <Label>MRR</Label>
              <Input value={metrics.mrr} onChange={(e) => setMetrics(prev => ({ ...prev, mrr: e.target.value }))} placeholder="12000" />
            </FormGroup>
            <FormGroup>
              <Label>ARR</Label>
              <Input value={metrics.arr} onChange={(e) => setMetrics(prev => ({ ...prev, arr: e.target.value }))} placeholder="144000" />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.revenue', 'Revenue')}</Label>
              <Input value={metrics.revenue} onChange={(e) => setMetrics(prev => ({ ...prev, revenue: e.target.value }))} placeholder="35000" />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.burn', 'Burn')}</Label>
              <Input value={metrics.burn} onChange={(e) => setMetrics(prev => ({ ...prev, burn: e.target.value }))} placeholder="18000" />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.runway', 'Runway')}</Label>
              <Input value={metrics.runway} onChange={(e) => setMetrics(prev => ({ ...prev, runway: e.target.value }))} placeholder="9" />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.customMetrics', 'Custom metrics')}</Label>
              <Input value={metrics.customMetrics} onChange={(e) => setMetrics(prev => ({ ...prev, customMetrics: e.target.value }))} placeholder={t('reports.quarterly.customPlaceholder', 'DAU 1200, CAC 24...')} />
            </FormGroup>
          </FormGrid>

          <FormGroup>
            <Label>{t('reports.quarterly.traction', 'Traction narrative')}</Label>
            <Textarea value={traction} onChange={(e) => setTraction(e.target.value)} placeholder={t('reports.quarterly.tractionPlaceholder', 'What changed this quarter: customers, revenue, product, partnerships...')} />
          </FormGroup>

          <FormGrid>
            <FormGroup>
              <Label>{t('reports.quarterly.risks', 'Risks')}</Label>
              <Textarea value={risks} onChange={(e) => setRisks(e.target.value)} placeholder={t('reports.quarterly.risksPlaceholder', 'Main risks, blockers, churn, hiring gaps...')} />
            </FormGroup>
            <FormGroup>
              <Label>{t('reports.quarterly.asks', 'Asks')}</Label>
              <Textarea value={asks} onChange={(e) => setAsks(e.target.value)} placeholder={t('reports.quarterly.asksPlaceholder', 'What you need from the fund team...')} />
            </FormGroup>
          </FormGrid>

          <FormGroup>
            <Label>{t('reports.files', 'Attachments')} ({files.length}/{MAX_FILES})</Label>
            <FileGroupTitle>{t('reports.quarterly.fileGroups', 'P&L, Balance Sheet, Cash Flow, bank statements, cap table, unit economics')}</FileGroupTitle>
            <UploadArea
              $isDragOver={isDragOver}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadIcon>
                <Upload size={28} />
              </UploadIcon>
              <UploadText>{t('reports.uploadText', 'Click or drag files here to upload')}</UploadText>
              <UploadHint>{t('reports.uploadHint', `Up to ${MAX_FILES} files, max 50MB each`)}</UploadHint>
            </UploadArea>
            <HiddenInput
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
            />

            {files.length > 0 && (
              <FileList>
                {files.map((file, index) => (
                  <FileItem key={`${file.name}-${index}`}>
                    <File size={16} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)' }} />
                    <FileName>{file.name}</FileName>
                    <FileSize>{formatFileSize(file.size)}</FileSize>
                    <RemoveFileButton onClick={() => handleRemoveFile(index)}>
                      <X size={16} />
                    </RemoveFileButton>
                  </FileItem>
                ))}
              </FileList>
            )}
          </FormGroup>

          {formError && (
            <ErrorBanner>
              <AlertCircle size={16} />
              {formError}
            </ErrorBanner>
          )}

          <FormActions>
            <Button variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <SpinnerWrap>
                  <Loader2 size={16} />
                  {t('reports.submitting', 'Submitting...')}
                </SpinnerWrap>
              ) : (
                <>
                  <Check size={16} />
                  {t('reports.submit', 'Submit Report')}
                </>
              )}
            </Button>
          </FormActions>
        </FormCard>
      )}

      {reports.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <FileText size={48} />
          </EmptyIcon>
          <EmptyText>{t('reports.empty', 'No reports yet')}</EmptyText>
          <EmptyHint>{t('reports.emptyHint', 'Submit your first report to get started')}</EmptyHint>
        </EmptyState>
      ) : (
        <ReportsList>
          {reports.map((report) => (
            <ReportItem key={report.id}>
              <ReportIcon>
                <FileText size={20} />
              </ReportIcon>
              <ReportContent>
                <ReportType>{getReportTitle(report)}</ReportType>
                <ReportDescription>{getReportDescription(report)}</ReportDescription>
                {report.reviewNote && (
                  <ReviewNote>
                    <strong>{t('reports.reviewNote', 'Комментарий фонда')}:</strong> {report.reviewNote}
                  </ReviewNote>
                )}
              </ReportContent>
              <ReportMeta>
                <ReportDate>
                  <Clock size={14} />
                  {formatShortDate(new Date(report.submittedAt || report.createdAt || Date.now()))}
                </ReportDate>
                <StatusBadge $status={report.status || 'submitted'}>
                  {report.status === 'approved' ? <Check size={12} /> : <Clock size={12} />}
                  {t(`reports.status.${report.status || 'submitted'}`, report.status || 'submitted')}
                </StatusBadge>
              </ReportMeta>
            </ReportItem>
          ))}
        </ReportsList>
      )}
    </PageContainer>
  );
};

export default StartupCabinetReports;
