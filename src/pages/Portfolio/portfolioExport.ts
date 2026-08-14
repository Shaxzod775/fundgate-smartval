import {
  getPortfolioColumnWidth,
  type PortfolioColumnId,
} from './portfolioColumns';

export type PortfolioExportValue = string | number | null;

export interface PortfolioExportRow {
  name: string;
  number: number;
  industry: string;
  segmentLabel: string;
  stage: string;
  country: string;
  reportDate: string;
  entryDate: Date | null;
  investmentTypeLabel: string;
  statusLabel: string;
  responsiblePerson: string;
  values: Partial<Record<PortfolioColumnId, number | undefined>>;
  calculated?: Partial<Record<PortfolioColumnId, string>>;
}

export interface PortfolioExportSheet {
  aoa: PortfolioExportValue[][];
  colWidths: { wch: number }[];
  numberFormats: (string | undefined)[];
}

const CURRENCY_USD = '$#,##0';
const CURRENCY_UZS = '#,##0';
const PERCENT = '0.0%';
const MULTIPLE = '0.00"x"';
const DECIMAL = '0.0';
const INTEGER = '#,##0';

export const PORTFOLIO_EXPORT_NUMBER_FORMATS: Partial<Record<PortfolioColumnId, string>> = {
  investedUsd: CURRENCY_USD,
  investedUzs: CURRENCY_UZS,
  entryValuation: CURRENCY_USD,
  currentValuation: CURRENCY_USD,
  mrr: CURRENCY_USD,
  arr: CURRENCY_USD,
  cac: CURRENCY_USD,
  ebitda: CURRENCY_USD,
  netProfit: CURRENCY_USD,
  burnRate: CURRENCY_USD,
  cashAtBank: CURRENCY_USD,
  totalDebt: CURRENCY_USD,
  ownership: PERCENT,
  yoyGrowth: PERCENT,
  qoqGrowth: PERCENT,
  momGrowth: PERCENT,
  grossMargin: PERCENT,
  ebitdaMargin: PERCENT,
  netMargin: PERCENT,
  moic: MULTIPLE,
  ltvCac: MULTIPLE,
  currentRatio: DECIMAL,
  debtToEquity: DECIMAL,
  runway: DECIMAL,
  payingCustomers: INTEGER,
  rowNumber: INTEGER,
  yoyScore: DECIMAL,
  qoqScore: DECIMAL,
  momScore: DECIMAL,
  grossMarginScore: DECIMAL,
  ebitdaScore: DECIMAL,
  runwayScore: DECIMAL,
  currentRatioScore: DECIMAL,
  totalScore: DECIMAL,
};

const TEXT_COLUMN_READERS: Partial<Record<PortfolioColumnId, (row: PortfolioExportRow) => PortfolioExportValue>> = {
  name: (row) => row.name,
  rowNumber: (row) => row.number,
  segment: (row) => row.segmentLabel,
  industry: (row) => row.industry,
  country: (row) => row.country,
  reportDate: (row) => row.reportDate,
  stage: (row) => row.stage,
  entryDate: (row) => (row.entryDate ? formatIsoDate(row.entryDate) : null),
  investmentType: (row) => row.investmentTypeLabel,
  status: (row) => row.statusLabel,
  responsiblePerson: (row) => row.responsiblePerson,
};

function formatIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function portfolioExportValue(
  row: PortfolioExportRow,
  columnId: PortfolioColumnId,
): PortfolioExportValue {
  const reader = TEXT_COLUMN_READERS[columnId];
  if (reader) {
    const value = reader(row);
    return value === '-' || value === '' ? null : value;
  }

  const numeric = row.values[columnId];
  if (typeof numeric === 'number' && Number.isFinite(numeric)) return numeric;

  const calculated = row.calculated?.[columnId];
  return calculated && calculated !== '-' ? calculated : null;
}

export interface BuildPortfolioExportSheetInput {
  rows: PortfolioExportRow[];
  columnIds: PortfolioColumnId[];
  labels: Record<PortfolioColumnId, string>;
  totals?: Partial<Record<PortfolioColumnId, PortfolioExportValue>>;
  totalsLabel?: string;
}

export function buildPortfolioExportSheet({
  rows,
  columnIds,
  labels,
  totals,
  totalsLabel = 'Итого / среднее',
}: BuildPortfolioExportSheetInput): PortfolioExportSheet {
  const header = columnIds.map((columnId) => labels[columnId] ?? columnId);
  const body = rows.map((row) => columnIds.map((columnId) => portfolioExportValue(row, columnId)));

  const aoa: PortfolioExportValue[][] = [header, ...body];

  if (totals) {
    aoa.push(columnIds.map((columnId, index) => {
      if (index === 0) return totalsLabel;
      const value = totals[columnId];
      return value === undefined || value === '-' ? null : value;
    }));
  }

  return {
    aoa,
    colWidths: columnIds.map((columnId) => ({
      wch: Math.max(8, Math.round(getPortfolioColumnWidth(columnId) / 7)),
    })),
    numberFormats: columnIds.map((columnId) => PORTFOLIO_EXPORT_NUMBER_FORMATS[columnId]),
  };
}

export function portfolioExportFileName(
  fundName: string,
  date: Date,
  options: { filtered?: boolean } = {},
): string {
  const safeFund = (fundName || 'FundGate')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'FundGate';
  const suffix = options.filtered ? '_filtered' : '';
  return `${safeFund}_portfolio_${formatIsoDate(date)}${suffix}.xlsx`;
}
