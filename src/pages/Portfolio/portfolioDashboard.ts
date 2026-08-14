export const PORTFOLIO_FILTER_MISSING = '__portfolio_filter_missing__';

export interface PortfolioQuickFilters {
  industries: readonly string[];
  stages: readonly string[];
  statuses: readonly string[];
  portfolioTypes: readonly string[];
  managerIds: readonly string[];
}

export interface PortfolioDashboardRowLike {
  name?: string | null;
  industry?: string | null;
  stage?: string | null;
  status?: string | null;
  portfolioType?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  investedUsd?: number | null;
  reportedValuationUsd?: number | null;
  ownership?: number | null;
  explicitMoic?: number | null;
}

export interface PortfolioDashboardFilterOption {
  value: string;
  label: string;
  count: number;
  isMissing: boolean;
}

export interface PortfolioDashboardFilterOptions {
  industries: PortfolioDashboardFilterOption[];
  stages: PortfolioDashboardFilterOption[];
  statuses: PortfolioDashboardFilterOption[];
  portfolioTypes: PortfolioDashboardFilterOption[];
  managerIds: PortfolioDashboardFilterOption[];
}

export interface PortfolioDashboardSummary {
  total: number;
  direct: number;
  program: number;
  totalInvestedUsd: number;
  totalPositionNavUsd: number;
  weightedMoic?: number;
}

export function createEmptyPortfolioQuickFilters(): PortfolioQuickFilters {
  return {
    industries: [],
    stages: [],
    statuses: [],
    portfolioTypes: [],
    managerIds: [],
  };
}

function cleanFilterValue(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const cleaned = value.trim();
  return cleaned && cleaned !== '-' ? cleaned : undefined;
}

function asFilterValue(value: string | null | undefined): string {
  return cleanFilterValue(value) ?? PORTFOLIO_FILTER_MISSING;
}

function buildOptions<Row extends PortfolioDashboardRowLike>(
  rows: readonly Row[],
  getValue: (row: Row) => string | null | undefined,
  getLabel: (row: Row, value: string) => string | null | undefined,
  missingLabel: string,
): PortfolioDashboardFilterOption[] {
  const options = new Map<string, PortfolioDashboardFilterOption>();

  rows.forEach((row) => {
    const value = asFilterValue(getValue(row));
    const isMissing = value === PORTFOLIO_FILTER_MISSING;
    const label = isMissing
      ? missingLabel
      : cleanFilterValue(getLabel(row, value)) ?? value;
    const existing = options.get(value);

    if (existing) {
      existing.count += 1;
      if (!isMissing && existing.label === value && label !== value) existing.label = label;
      return;
    }

    options.set(value, { value, label, count: 1, isMissing });
  });

  return [...options.values()].sort((left, right) => {
    if (left.isMissing !== right.isMissing) return left.isMissing ? 1 : -1;
    return left.label.localeCompare(right.label, 'ru', { sensitivity: 'base' });
  });
}

export function getPortfolioDashboardFilterOptions<Row extends PortfolioDashboardRowLike>(
  rows: readonly Row[],
  missingLabel = 'Не указано',
): PortfolioDashboardFilterOptions {
  const values = (
    getValue: (row: Row) => string | null | undefined,
  ) => buildOptions(rows, getValue, (_row, value) => value, missingLabel);

  return {
    industries: values((row) => row.industry),
    stages: values((row) => row.stage),
    statuses: values((row) => row.status),
    portfolioTypes: values((row) => row.portfolioType),
    managerIds: buildOptions(
      rows,
      (row) => row.managerId,
      (row, value) => row.managerName ?? value,
      missingLabel,
    ),
  };
}

function matchesSelection(value: string | null | undefined, selection: readonly string[]): boolean {
  return selection.length === 0 || selection.includes(asFilterValue(value));
}

export function filterPortfolioDashboardRows<Row extends PortfolioDashboardRowLike>(
  rows: readonly Row[],
  filters: PortfolioQuickFilters,
  nameSearch = '',
): Row[] {
  const query = nameSearch.trim().toLocaleLowerCase('ru');

  return rows.filter((row) => {
    if (query && !String(row.name ?? '').toLocaleLowerCase('ru').includes(query)) return false;
    if (!matchesSelection(row.industry, filters.industries)) return false;
    if (!matchesSelection(row.stage, filters.stages)) return false;
    if (!matchesSelection(row.status, filters.statuses)) return false;
    if (!matchesSelection(row.portfolioType, filters.portfolioTypes)) return false;
    return matchesSelection(row.managerId, filters.managerIds);
  });
}

function nonNegativeNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function isProgram(row: PortfolioDashboardRowLike): boolean {
  return cleanFilterValue(row.portfolioType)?.toLocaleLowerCase('en') === 'program';
}

export function getPortfolioPositionNavUsd(row: PortfolioDashboardRowLike): number {
  const investedUsd = nonNegativeNumber(row.investedUsd) ?? 0;
  const reportedValuationUsd = nonNegativeNumber(row.reportedValuationUsd);
  const ownership = nonNegativeNumber(row.ownership);

  if (reportedValuationUsd != null && ownership != null && ownership <= 1) {
    return reportedValuationUsd * ownership;
  }

  const explicitMoic = nonNegativeNumber(row.explicitMoic);
  if (explicitMoic != null) return explicitMoic * investedUsd;
  return investedUsd;
}

export function calculatePortfolioDashboardSummary(
  rows: readonly PortfolioDashboardRowLike[],
): PortfolioDashboardSummary {
  let direct = 0;
  let program = 0;
  let totalInvestedUsd = 0;
  let totalPositionNavUsd = 0;

  rows.forEach((row) => {
    if (isProgram(row)) {
      program += 1;
      return;
    }

    direct += 1;
    totalInvestedUsd += nonNegativeNumber(row.investedUsd) ?? 0;
    totalPositionNavUsd += getPortfolioPositionNavUsd(row);
  });

  return {
    total: rows.length,
    direct,
    program,
    totalInvestedUsd,
    totalPositionNavUsd,
    weightedMoic: totalInvestedUsd > 0
      ? totalPositionNavUsd / totalInvestedUsd
      : undefined,
  };
}
