import styled from 'styled-components';
import { Download, FileText, TrendingUp, BarChart3, Users, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fieldLabel } from '../../utils/fieldLabels';
import { formatShortDate } from '../../utils/formatDate';

export interface ArtifactData {
  type: 'report' | 'portfolio-analysis' | 'startup-analysis' | 'tasks' | 'portfolio-import-review';
  title: string;
  data: any;
}

interface AIArtifactProps {
  artifact: ArtifactData;
  isLoading?: boolean; /* Optional prop if parent wants to control loading */
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

const ArtifactContainer = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  margin: 16px 0;
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const Skeleton = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  width: 100%;
  animation: pulse 1.5s infinite ease-in-out;

  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.7; }
    100% { opacity: 0.3; }
  }
`;

const SkeletonBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
`;

const ArtifactHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.accent.primary};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ArtifactTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  letter-spacing: -0.02em;
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: ${({ theme }) => theme.colors.accent.primary};
  border: none;
  border-radius: 999px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ArtifactBody = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ReportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
`;

const MetricChange = styled.div<{ $positive: boolean }>`
  font-size: 14px;
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.status.success : theme.colors.status.error};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StartupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StartupItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

const StartupInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StartupRank = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.accent.primaryLight};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const StartupDetails = styled.div``;

const StartupName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const StartupCategory = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const StartupMetrics = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const MetricBadge = styled.div<{ $variant: 'success' | 'warning' | 'info' }>`
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.status.successBg;
      case 'warning':
        return theme.colors.status.warningBg;
      case 'info':
        return theme.colors.status.infoBg;
    }
  }};
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.status.success;
      case 'warning':
        return theme.colors.status.warning;
      case 'info':
        return theme.colors.status.info;
    }
  }};
`;

const ScoreValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TaskItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
`;

const TaskCheckbox = styled.div<{ $completed: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${({ $completed, theme }) =>
    $completed ? theme.colors.accent.primary : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid
    ${({ $completed, theme }) =>
    $completed ? theme.colors.accent.primary : 'rgba(255, 255, 255, 0.2)'};
  flex-shrink: 0;
  margin-top: 2px;

  svg {
    width: 14px;
    height: 14px;
    color: #000;
  }
`;

const TaskContent = styled.div`
  flex: 1;
`;

const TaskTitle = styled.div<{ $completed: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ $completed, theme }) =>
    $completed ? theme.colors.text.tertiary : theme.colors.text.primary};
  text-decoration: ${({ $completed }) => ($completed ? 'line-through' : 'none')};
  margin-bottom: 4px;
`;

const TaskMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ImportReviewGrid = styled.div`
  display: grid;
  gap: 16px;
`;

const ImportReviewSection = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 16px;
`;

const ImportReviewTitle = styled.h4`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 700;
`;

const ImportReviewTable = styled.div`
  display: grid;
  gap: 8px;
`;

const ImportReviewRow = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(130px, 1fr) minmax(80px, auto);
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ConfidencePill = styled.span<{ $confidence: number }>`
  justify-self: end;
  padding: 4px 8px;
  border-radius: 999px;
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
  font-size: 12px;
  font-weight: 700;

  @media (max-width: 640px) {
    justify-self: start;
  }
`;

const downloadExcel = (artifact: ArtifactData, t: Translate, language: string) => {
  const workbook = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];
  let filename = '';

  switch (artifact.type) {
    case 'report': {
      filename = `FundGate_Report_${dateStr}.xlsx`;

      const headerData = [
        [t('ai.artifact.excel.reportTitle')],
        [''],
        [t('ai.artifact.excel.date'), formatShortDate(new Date(), language)],
        [''],
      ];

      const metricsData = [
        [t('ai.artifact.excel.metrics')],
        [t('ai.artifact.excel.metric'), t('ai.artifact.excel.value'), t('ai.artifact.excel.change')],
        ...artifact.data.metrics.map((m: any) => [m.label, m.value, m.change]),
      ];

      const combinedData = [...headerData, ...metricsData];
      if (artifact.data.summary) {
        combinedData.push([''], [t('ai.artifact.excel.summary')], [artifact.data.summary]);
      }

      const ws = XLSX.utils.aoa_to_sheet(combinedData);
      ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, ws, t('ai.artifact.excel.reportSheet'));
      break;
    }

    case 'portfolio-analysis': {
      filename = `FundGate_Portfolio_${dateStr}.xlsx`;

      const portfolioData = [
        [t('ai.artifact.excel.portfolioTitle')],
        [''],
        [t('ai.artifact.excel.date'), formatShortDate(new Date(), language)],
        [''],
        [t('ai.artifact.excel.topStartups')],
        [t('ai.artifact.excel.rank'), t('ai.artifact.excel.name'), t('ai.artifact.category'), 'AI Score', t('ai.artifact.valuation')],
        ...artifact.data.startups.map((s: any, i: number) => [
          i + 1,
          s.name,
          s.category,
          `${s.score}/100`,
          s.valuation,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(portfolioData);
      ws['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, ws, t('ai.artifact.excel.portfolioSheet'));
      break;
    }

    case 'startup-analysis': {
      const safeName = artifact.data.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
      filename = `FundGate_Startup_${safeName}_${dateStr}.xlsx`;

      const analysisData = [
        [t('ai.artifact.excel.startupTitle')],
        [''],
        [t('ai.artifact.excel.name'), artifact.data.name],
        [t('ai.artifact.category'), artifact.data.category],
        ['AI Score:', `${artifact.data.score}/100`],
        [t('ai.artifact.valuation'), artifact.data.valuation],
        [''],
        [t('ai.artifact.strengths')],
        ...artifact.data.strengths.map((s: string) => [s]),
        [''],
        [t('ai.artifact.recommendations')],
        ...artifact.data.recommendations.map((r: string) => [r]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(analysisData);
      ws['!cols'] = [{ wch: 50 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, ws, t('ai.artifact.excel.analysisSheet'));
      break;
    }

    case 'tasks': {
      filename = `FundGate_Tasks_${dateStr}.xlsx`;

      const tasksData = [
        [t('ai.artifact.excel.tasksTitle')],
        [''],
        [t('ai.artifact.excel.date'), formatShortDate(new Date(), language)],
        [''],
        [t('ai.artifact.excel.status'), t('ai.artifact.excel.task'), t('ai.artifact.excel.project'), t('ai.artifact.excel.deadline')],
        ...artifact.data.tasks.map((task: any) => [
          task.completed ? t('ai.artifact.excel.completed') : t('ai.artifact.excel.inProgress'),
          task.title,
          task.project,
          task.deadline,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(tasksData);
      ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, ws, t('ai.artifact.excel.tasksSheet'));
      break;
    }

    case 'portfolio-import-review': {
      filename = `FundGate_Portfolio_Import_${dateStr}.xlsx`;

      const mappingData = [
        [t('ai.artifact.excel.fieldMappings')],
        [
          t('ai.artifact.excel.sourceSheet'),
          t('ai.artifact.excel.sourceColumn'),
          t('ai.artifact.excel.targetField'),
          t('ai.artifact.confidence'),
          t('ai.artifact.excel.reason')
        ],
        ...(artifact.data.fieldMappings || []).map((mapping: any) => [
          mapping.sourceSheet || '',
          mapping.sourceColumn || '',
          mapping.targetField || '',
          mapping.confidence ?? '',
          mapping.reason || '',
        ]),
      ];
      const mappingWs = XLSX.utils.aoa_to_sheet(mappingData);
      mappingWs['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, mappingWs, t('ai.artifact.excel.mappingsSheet'));

      const previewData = [
        [t('ai.artifact.excel.portfolioPreview')],
        [
          t('ai.artifact.excel.action'),
          t('ai.artifact.excel.startup'),
          t('ai.artifact.excel.matchedStartup'),
          t('ai.artifact.excel.country'),
          t('ai.artifact.excel.industry'),
          t('ai.artifact.excel.stage'),
          t('ai.artifact.excel.investment'),
          t('ai.artifact.valuation'),
          'ARR',
          'MRR'
        ],
        ...(artifact.data.portfolioPreview || []).map((row: any) => [
          row.action || '',
          row.display?.companyName || row.startupName || '',
          row.match?.matchedStartupName || '',
          row.display?.country || '',
          row.display?.industry || '',
          row.display?.stage || '',
          row.display?.investmentAmount ?? '',
          row.display?.valuation ?? '',
          row.display?.arr ?? '',
          row.display?.mrr ?? '',
        ]),
      ];
      const previewWs = XLSX.utils.aoa_to_sheet(previewData);
      previewWs['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, previewWs, t('ai.artifact.excel.previewSheet'));
      break;
    }
  }

  XLSX.writeFile(workbook, filename);
};

const renderReport = (data: any) => (
  <>
    <ReportGrid>
      {data.metrics.map((metric: any, index: number) => (
        <MetricCard key={index}>
          <MetricLabel>{metric.label}</MetricLabel>
          <MetricValue>{metric.value}</MetricValue>
          <MetricChange $positive={metric.change.startsWith('+')}>
            {metric.change}
          </MetricChange>
        </MetricCard>
      ))}
    </ReportGrid>
    {data.summary && (
      <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)' }}>
        {data.summary}
      </div>
    )}
  </>
);

const renderPortfolioAnalysis = (data: any) => (
  <StartupList>
    {data.startups.map((startup: any, index: number) => (
      <StartupItem key={index}>
        <StartupInfo>
          <StartupRank>{index + 1}</StartupRank>
          <StartupDetails>
            <StartupName>{startup.name}</StartupName>
            <StartupCategory>{startup.category}</StartupCategory>
          </StartupDetails>
        </StartupInfo>
        <StartupMetrics>
          <ScoreValue>{startup.score}/100</ScoreValue>
          <MetricBadge $variant="success">{startup.valuation}</MetricBadge>
        </StartupMetrics>
      </StartupItem>
    ))}
  </StartupList>
);

const renderStartupAnalysis = (data: any, t: Translate) => (
  <div>
    <ReportGrid>
      <MetricCard>
        <MetricLabel>AI Score</MetricLabel>
        <MetricValue>{data.score}/100</MetricValue>
        <MetricChange $positive={true}>{t('ai.artifact.excellentResult')}</MetricChange>
      </MetricCard>
      <MetricCard>
        <MetricLabel>{t('ai.artifact.valuation')}</MetricLabel>
        <MetricValue>{data.valuation}</MetricValue>
      </MetricCard>
      <MetricCard>
        <MetricLabel>{t('ai.artifact.category')}</MetricLabel>
        <MetricValue style={{ fontSize: '16px' }}>{data.category}</MetricValue>
      </MetricCard>
    </ReportGrid>

    <div style={{ marginTop: '24px' }}>
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {t('ai.artifact.strengths')}
      </h4>
      <TasksList>
        {data.strengths.map((strength: string, index: number) => (
          <TaskItem key={index}>
            <TaskCheckbox $completed={true}>
              <CheckCircle />
            </TaskCheckbox>
            <TaskContent>
              <TaskTitle $completed={false}>{strength}</TaskTitle>
            </TaskContent>
          </TaskItem>
        ))}
      </TasksList>
    </div>

    <div style={{ marginTop: '24px' }}>
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {t('ai.artifact.recommendations')}
      </h4>
      <div
        style={{
          fontSize: '14px',
          lineHeight: '1.8',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        {data.recommendations.map((rec: string, index: number) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            • {rec}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const renderTasks = (data: any) => (
  <TasksList>
    {data.tasks.map((task: any, index: number) => (
      <TaskItem key={index}>
        <TaskCheckbox $completed={task.completed}>
          {task.completed && <CheckCircle />}
        </TaskCheckbox>
        <TaskContent>
          <TaskTitle $completed={task.completed}>{task.title}</TaskTitle>
          <TaskMeta>
            {task.project} • {task.deadline}
          </TaskMeta>
        </TaskContent>
      </TaskItem>
    ))}
  </TasksList>
);

const renderPortfolioImportReview = (data: any, t: Translate) => {
  const mappings = data.fieldMappings || [];
  const preview = data.portfolioPreview || [];
  const warnings = data.warnings || [];
  const unmapped = data.unmappedColumns || [];

  return (
    <ImportReviewGrid>
      <ReportGrid>
        <MetricCard>
          <MetricLabel>{t('ai.artifact.confidence')}</MetricLabel>
          <MetricValue>{Math.round((data.confidence || 0) * 100)}%</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>{t('ai.artifact.mappedFields')}</MetricLabel>
          <MetricValue>{mappings.length}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>{t('ai.artifact.previewRows')}</MetricLabel>
          <MetricValue>{preview.length}</MetricValue>
        </MetricCard>
      </ReportGrid>

      <ImportReviewSection>
        <ImportReviewTitle>{t('ai.artifact.fieldMapping')}</ImportReviewTitle>
        <ImportReviewTable>
          {mappings.slice(0, 8).map((mapping: any, index: number) => (
            <ImportReviewRow key={`${mapping.sourceColumn}-${index}`}>
              <span>{mapping.sourceSheet || t('ai.artifact.workbook')} / <strong>{mapping.sourceColumn}</strong></span>
              <span>{fieldLabel(mapping.targetField || '')}</span>
              <ConfidencePill $confidence={mapping.confidence || 0}>
                {Math.round((mapping.confidence || 0) * 100)}%
              </ConfidencePill>
            </ImportReviewRow>
          ))}
        </ImportReviewTable>
      </ImportReviewSection>

      <ImportReviewSection>
        <ImportReviewTitle>{t('ai.artifact.portfolioPreview')}</ImportReviewTitle>
        <ImportReviewTable>
          {preview.slice(0, 10).map((row: any) => (
            <ImportReviewRow key={row.itemId}>
              <span><strong>{row.display?.companyName || row.startupName || '-'}</strong></span>
              <span>{row.action} {row.match?.matchedStartupName ? `-> ${row.match.matchedStartupName}` : ''}</span>
              <ConfidencePill $confidence={row.match?.confidence || 0}>
                {Math.round((row.match?.confidence || 0) * 100)}%
              </ConfidencePill>
            </ImportReviewRow>
          ))}
        </ImportReviewTable>
      </ImportReviewSection>

      {(warnings.length > 0 || unmapped.length > 0) && (
        <ImportReviewSection>
          <ImportReviewTitle>{t('ai.artifact.warnings')}</ImportReviewTitle>
          <TasksList>
            {[...warnings, ...unmapped.slice(0, 8).map((item: string) => t('ai.artifact.unmapped', { column: item }))].map((warning: string, index: number) => (
              <TaskItem key={index}>
                <TaskCheckbox $completed={false} />
                <TaskContent>
                  <TaskTitle $completed={false}>{warning}</TaskTitle>
                </TaskContent>
              </TaskItem>
            ))}
          </TasksList>
        </ImportReviewSection>
      )}
    </ImportReviewGrid>
  );
};

const getArtifactIcon = (type: string) => {
  switch (type) {
    case 'report':
      return FileText;
    case 'portfolio-analysis':
      return BarChart3;
    case 'startup-analysis':
      return TrendingUp;
    case 'tasks':
      return Users;
    case 'portfolio-import-review':
      return BarChart3;
    default:
      return FileText;
  }
};

export const AIArtifact: React.FC<AIArtifactProps> = ({ artifact, isLoading: propsIsLoading }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const Icon = getArtifactIcon(artifact.type);
  const [internalLoading, setInternalLoading] = useState(true);

  useEffect(() => {
    if (propsIsLoading === undefined) {
      const timer = setTimeout(() => {
        setInternalLoading(false);
      }, 1500); // 1.5s loading skeleton
      return () => clearTimeout(timer);
    } else {
      setInternalLoading(propsIsLoading);
    }
  }, [propsIsLoading]);

  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;

  return (
    <ArtifactContainer>
      <ArtifactHeader>
        <HeaderLeft>
          <IconWrapper>
            {isLoading ? null : <Icon />}
          </IconWrapper>
          {isLoading ? (
            <Skeleton style={{ height: '24px', width: '200px' }} />
          ) : (
            <ArtifactTitle>{artifact.title}</ArtifactTitle>
          )}
        </HeaderLeft>
        {!isLoading && (
          <DownloadButton onClick={() => downloadExcel(artifact, t, language)}>
            <Download />
            {t('ai.artifact.downloadExcel')}
          </DownloadButton>
        )}
      </ArtifactHeader>

      <ArtifactBody>
        {isLoading ? (
          <SkeletonBlock>
            <Skeleton style={{ height: '60px', width: '100%' }} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <Skeleton style={{ height: '80px', flex: 1 }} />
              <Skeleton style={{ height: '80px', flex: 1 }} />
            </div>
            <Skeleton style={{ height: '40px', width: '60%' }} />
          </SkeletonBlock>
        ) : (
          <>
            {artifact.type === 'report' && renderReport(artifact.data)}
            {artifact.type === 'portfolio-analysis' && renderPortfolioAnalysis(artifact.data)}
            {artifact.type === 'startup-analysis' && renderStartupAnalysis(artifact.data, t)}
            {artifact.type === 'tasks' && renderTasks(artifact.data)}
            {artifact.type === 'portfolio-import-review' && renderPortfolioImportReview(artifact.data, t)}
          </>
        )}
      </ArtifactBody>
    </ArtifactContainer>
  );
};
