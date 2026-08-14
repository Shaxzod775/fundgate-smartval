import styled from 'styled-components';
import type { CrossFundApplication } from '../../../types';
import type { TFunction } from 'i18next';
import { formatAmount } from './shared';

export type FundingCommitmentStatus = NonNullable<CrossFundApplication['commitmentStatus']>;

export interface FundingProgressLabels {
  requestLabel: string;
  confirmedLabel: string;
  consideringLabel: string;
  progressLabel: string;
  breakdownLabel: string;
  fundColumnLabel: string;
  amountColumnLabel: string;
  statusColumnLabel: string;
  approvedStatusLabel: string;
  consideringStatusLabel: string;
  rejectedStatusLabel: string;
  emptyLabel: string;
  ofLabel: string;
}

export interface FundingProgressProps {
  requestedAmount?: number;
  currentFundId: string;
  currentFundName: string;
  currentFundAmount?: number;
  currentFundStatus?: FundingCommitmentStatus;
  otherApplications?: CrossFundApplication[];
  labels?: Partial<FundingProgressLabels>;
  className?: string;
}

interface FundContribution {
  fundId: string;
  fundName: string;
  amount: number;
  status: FundingCommitmentStatus;
}

interface FundingSummary {
  requestedAmount: number;
  confirmedAmount: number;
  consideringAmount: number;
  progressPercent: number;
  contributions: FundContribution[];
}

const DEFAULT_LABELS: FundingProgressLabels = {
  requestLabel: 'Запрос стартапа',
  confirmedLabel: 'Одобрено фондами',
  consideringLabel: 'На рассмотрении',
  progressLabel: 'Прогресс финансирования',
  breakdownLabel: 'Распределение по фондам',
  fundColumnLabel: 'Фонд',
  amountColumnLabel: 'Сумма',
  statusColumnLabel: 'Статус',
  approvedStatusLabel: 'Одобрено',
  consideringStatusLabel: 'На рассмотрении',
  rejectedStatusLabel: 'Отклонено',
  emptyLabel: 'Суммы фондов пока не указаны',
  ofLabel: 'из',
};

export function localizedFundingProgressLabels(t: TFunction): FundingProgressLabels {
  return {
    requestLabel: t('investmentCommittee.funding.request', DEFAULT_LABELS.requestLabel),
    confirmedLabel: t('investmentCommittee.funding.confirmed', DEFAULT_LABELS.confirmedLabel),
    consideringLabel: t('investmentCommittee.funding.considering', DEFAULT_LABELS.consideringLabel),
    progressLabel: t('investmentCommittee.funding.progress', DEFAULT_LABELS.progressLabel),
    breakdownLabel: t('investmentCommittee.funding.breakdown', DEFAULT_LABELS.breakdownLabel),
    fundColumnLabel: t('investmentCommittee.funding.fund', DEFAULT_LABELS.fundColumnLabel),
    amountColumnLabel: t('investmentCommittee.funding.amount', DEFAULT_LABELS.amountColumnLabel),
    statusColumnLabel: t('investmentCommittee.funding.status', DEFAULT_LABELS.statusColumnLabel),
    approvedStatusLabel: t('investmentCommittee.funding.approvedStatus', DEFAULT_LABELS.approvedStatusLabel),
    consideringStatusLabel: t('investmentCommittee.funding.consideringStatus', DEFAULT_LABELS.consideringStatusLabel),
    rejectedStatusLabel: t('investmentCommittee.funding.rejectedStatus', DEFAULT_LABELS.rejectedStatusLabel),
    emptyLabel: t('investmentCommittee.funding.empty', DEFAULT_LABELS.emptyLabel),
    ofLabel: t('investmentCommittee.funding.of', DEFAULT_LABELS.ofLabel),
  };
}

function positiveAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function fundKey(fundId: string, fundName: string): string {
  const normalizedId = fundId.trim();
  if (normalizedId) return `id:${normalizedId}`;
  return `name:${fundName.trim().toLocaleLowerCase()}`;
}

function normalizeStatus(status: FundingCommitmentStatus | undefined): FundingCommitmentStatus {
  return status || 'considering';
}

export function buildFundingSummary({
  requestedAmount,
  currentFundId,
  currentFundName,
  currentFundAmount,
  currentFundStatus,
  otherApplications = [],
}: Omit<FundingProgressProps, 'labels' | 'className'>): FundingSummary {
  const byFund = new Map<string, FundContribution>();
  const currentKey = currentFundId.trim() || currentFundName.trim()
    ? fundKey(currentFundId, currentFundName)
    : undefined;

  if (currentKey) {
    byFund.set(currentKey, {
      fundId: currentFundId,
      fundName: currentFundName || currentFundId,
      amount: positiveAmount(currentFundAmount),
      status: normalizeStatus(currentFundStatus),
    });
  }

  for (const application of otherApplications) {
    const fundId = application.organizationId || '';
    const fundName = application.organizationName || fundId;
    if (!fundId.trim() && !fundName.trim()) continue;

    const key = fundKey(fundId, fundName);
    if (key === currentKey) continue;

    byFund.set(key, {
      fundId,
      fundName,
      amount: positiveAmount(application.investmentAmount),
      status: normalizeStatus(application.commitmentStatus),
    });
  }

  const contributions: FundContribution[] = [];
  let confirmedAmount = 0;
  let consideringAmount = 0;

  for (const contribution of byFund.values()) {
    if (contribution.amount <= 0 || contribution.status === 'rejected') continue;
    contributions.push(contribution);
    if (contribution.status === 'approved') {
      confirmedAmount += contribution.amount;
    } else {
      consideringAmount += contribution.amount;
    }
  }

  const normalizedRequest = positiveAmount(requestedAmount);
  const progressPercent = normalizedRequest > 0
    ? Math.min(100, (confirmedAmount / normalizedRequest) * 100)
    : 0;

  return {
    requestedAmount: normalizedRequest,
    confirmedAmount,
    consideringAmount,
    progressPercent,
    contributions,
  };
}

function statusLabel(status: FundingCommitmentStatus, labels: FundingProgressLabels): string {
  if (status === 'approved') return labels.approvedStatusLabel;
  if (status === 'rejected') return labels.rejectedStatusLabel;
  return labels.consideringStatusLabel;
}

export default function FundingProgress({
  requestedAmount,
  currentFundId,
  currentFundName,
  currentFundAmount,
  currentFundStatus,
  otherApplications = [],
  labels: labelOverrides,
  className,
}: FundingProgressProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const summary = buildFundingSummary({
    requestedAmount,
    currentFundId,
    currentFundName,
    currentFundAmount,
    currentFundStatus,
    otherApplications,
  });
  const hasFundingData = summary.requestedAmount > 0 || summary.contributions.length > 0;

  if (!hasFundingData) {
    return (
      <Root className={className} aria-label={labels.breakdownLabel}>
        <EmptyFunding>{labels.emptyLabel}</EmptyFunding>
      </Root>
    );
  }

  const progressValue = Math.round(summary.progressPercent * 10) / 10;
  const progressText = `${labels.confirmedLabel}: ${formatAmount(summary.confirmedAmount)} / ${formatAmount(summary.requestedAmount)}`;

  return (
    <Root className={className}>
      <Totals>
        <Metric aria-label={`${labels.requestLabel}: ${formatAmount(summary.requestedAmount)}`}>
          <MetricLabel>{labels.requestLabel}</MetricLabel>
          <MetricValue>{formatAmount(summary.requestedAmount)}</MetricValue>
        </Metric>
        <Metric aria-label={`${labels.confirmedLabel}: ${formatAmount(summary.confirmedAmount)}`}>
          <MetricLabel>{labels.confirmedLabel}</MetricLabel>
          <MetricValue $tone="confirmed">{formatAmount(summary.confirmedAmount)}</MetricValue>
        </Metric>
        <Metric aria-label={`${labels.consideringLabel}: ${formatAmount(summary.consideringAmount)}`}>
          <MetricLabel>{labels.consideringLabel}</MetricLabel>
          <MetricValue $tone="considering">{formatAmount(summary.consideringAmount)}</MetricValue>
        </Metric>
      </Totals>

      {summary.requestedAmount > 0 ? (
        <>
          <ProgressCopy>
            <span>{labels.progressLabel}</span>
            <strong>{progressText}</strong>
          </ProgressCopy>
          <ProgressTrack
            role="progressbar"
            aria-label={labels.progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressValue}
            aria-valuetext={progressText}
          >
            <ProgressFill $percent={summary.progressPercent} />
          </ProgressTrack>
        </>
      ) : null}

      {summary.contributions.length > 0 ? (
        <TableWrap>
          <FundTable>
            <caption>{labels.breakdownLabel}</caption>
            <thead>
              <tr>
                <th scope="col">{labels.fundColumnLabel}</th>
                <th scope="col">{labels.amountColumnLabel}</th>
                <th scope="col">{labels.statusColumnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {summary.contributions.map((contribution) => (
                <tr key={fundKey(contribution.fundId, contribution.fundName)}>
                  <FundName>{contribution.fundName}</FundName>
                  <FundAmount>{formatAmount(contribution.amount)}</FundAmount>
                  <td>
                    <StatusPill $status={contribution.status}>
                      {statusLabel(contribution.status, labels)}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </FundTable>
        </TableWrap>
      ) : <EmptyFunding>{labels.emptyLabel}</EmptyFunding>}
    </Root>
  );
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
  background: transparent;
  padding: ${({ theme }) => theme.spacing[4]} 0;
`;

const Totals = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin: 0;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Metric = styled.div`
  min-width: 0;
  padding: 0 ${({ theme }) => theme.spacing[4]};

  &:first-child {
    padding-left: 0;
  }

  &:not(:first-child) {
  }

  @media (max-width: 620px) {
    padding: ${({ theme }) => theme.spacing[3]} 0 0;

    &:first-child {
      padding-top: 0;
    }

  }
`;

const MetricLabel = styled.dt`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;

const MetricValue = styled.dd<{ $tone?: 'confirmed' | 'considering' }>`
  margin: 0;
  color: ${({ $tone, theme }) => (
    $tone === 'confirmed'
      ? theme.colors.status.success
      : $tone === 'considering'
        ? theme.colors.status.warning
        : theme.colors.text.primary
  )};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 800;
`;

const ProgressCopy = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    text-align: right;
  }
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border.subtle};
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${({ $percent }) => `${Math.max(0, Math.min(100, $percent))}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.status.success};
  transition: width ${({ theme }) => theme.transitions.base};
`;

const TableWrap = styled.div`
  min-width: 0;
  overflow-x: auto;
`;

const FundTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  caption {
    padding-bottom: ${({ theme }) => theme.spacing[2]};
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 800;
    text-align: left;
  }

  th,
  td {
    padding: ${({ theme }) => theme.spacing[2]};
    text-align: left;
  }

  th {
    color: ${({ theme }) => theme.colors.text.muted};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 700;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`;

const FundName = styled.td`
  min-width: 140px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const FundAmount = styled.td`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
`;

const StatusPill = styled.span<{ $status: FundingCommitmentStatus }>`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ $status, theme }) => (
    $status === 'approved'
      ? theme.colors.status.successBorder
      : $status === 'rejected'
        ? theme.colors.status.dangerBorder
        : theme.colors.status.warningBorder
  )};
  border-radius: ${({ theme }) => theme.radius.full};
  color: ${({ $status, theme }) => (
    $status === 'approved'
      ? theme.colors.status.success
      : $status === 'rejected'
        ? theme.colors.status.danger
        : theme.colors.status.warning
  )};
  background: ${({ $status, theme }) => (
    $status === 'approved'
      ? theme.colors.status.successBg
      : $status === 'rejected'
        ? theme.colors.status.dangerBg
        : theme.colors.status.warningBg
  )};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 800;
  white-space: nowrap;
`;

const EmptyFunding = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;
