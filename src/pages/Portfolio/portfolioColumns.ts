export const PORTFOLIO_COLUMN_PREFERENCES_VERSION = 1 as const;

export const PORTFOLIO_COLUMN_DEFINITIONS = [
  { id: 'name', width: 170, required: true },
  { id: 'rowNumber', width: 50 },
  { id: 'segment', width: 120 },
  { id: 'industry', width: 115 },
  { id: 'country', width: 110 },
  { id: 'reportDate', width: 110 },
  { id: 'stage', width: 110 },
  { id: 'entryDate', width: 110 },
  { id: 'investmentType', width: 110 },
  { id: 'investedUsd', width: 125 },
  { id: 'investedUzs', width: 125 },
  { id: 'ownership', width: 90 },
  { id: 'entryValuation', width: 140 },
  { id: 'currentValuation', width: 140 },
  { id: 'moic', width: 85 },
  { id: 'mrr', width: 120 },
  { id: 'arr', width: 120 },
  { id: 'cac', width: 110 },
  { id: 'ltvCac', width: 95 },
  { id: 'yoyGrowth', width: 90 },
  { id: 'qoqGrowth', width: 90 },
  { id: 'momGrowth', width: 90 },
  { id: 'grossMargin', width: 110 },
  { id: 'ebitdaMargin', width: 115 },
  { id: 'runway', width: 100 },
  { id: 'currentRatio', width: 110 },
  { id: 'ebitda', width: 120 },
  { id: 'payingCustomers', width: 115 },
  { id: 'netProfit', width: 120 },
  { id: 'netMargin', width: 100 },
  { id: 'burnRate', width: 120 },
  { id: 'cashAtBank', width: 120 },
  { id: 'totalDebt', width: 120 },
  { id: 'debtToEquity', width: 105 },
  { id: 'yoyScore', width: 85 },
  { id: 'qoqScore', width: 85 },
  { id: 'momScore', width: 85 },
  { id: 'grossMarginScore', width: 95 },
  { id: 'ebitdaScore', width: 90 },
  { id: 'runwayScore', width: 90 },
  { id: 'currentRatioScore', width: 105 },
  { id: 'totalScore', width: 100 },
  { id: 'status', width: 135 },
  { id: 'responsiblePerson', width: 150 },
] as const;

export type PortfolioColumnId = (typeof PORTFOLIO_COLUMN_DEFINITIONS)[number]['id'];

export interface PortfolioColumnPreferences {
  version: typeof PORTFOLIO_COLUMN_PREFERENCES_VERSION;
  columnOrder: readonly PortfolioColumnId[];
  hiddenColumnIds: readonly PortfolioColumnId[];
}

export const REQUIRED_PORTFOLIO_COLUMN_ID: PortfolioColumnId = 'name';

export const DEFAULT_PORTFOLIO_COLUMN_ORDER: readonly PortfolioColumnId[] =
  PORTFOLIO_COLUMN_DEFINITIONS.map(({ id }) => id);

export const DEFAULT_PORTFOLIO_COLUMN_PREFERENCES: PortfolioColumnPreferences = {
  version: PORTFOLIO_COLUMN_PREFERENCES_VERSION,
  columnOrder: DEFAULT_PORTFOLIO_COLUMN_ORDER,
  hiddenColumnIds: [],
};

const PORTFOLIO_COLUMN_ID_SET = new Set<string>(DEFAULT_PORTFOLIO_COLUMN_ORDER);

const PORTFOLIO_COLUMN_WIDTHS: Readonly<Record<PortfolioColumnId, number>> =
  Object.fromEntries(
    PORTFOLIO_COLUMN_DEFINITIONS.map(({ id, width }) => [id, width]),
  ) as Record<PortfolioColumnId, number>;

export function isPortfolioColumnId(value: unknown): value is PortfolioColumnId {
  return typeof value === 'string' && PORTFOLIO_COLUMN_ID_SET.has(value);
}

function uniqueKnownColumnIds(value: unknown): PortfolioColumnId[] {
  if (!Array.isArray(value)) return [];

  const result: PortfolioColumnId[] = [];
  const seen = new Set<PortfolioColumnId>();

  value.forEach((candidate) => {
    if (!isPortfolioColumnId(candidate) || seen.has(candidate)) return;
    seen.add(candidate);
    result.push(candidate);
  });

  return result;
}

export function normalizePortfolioColumnPreferences(
  value: unknown,
): PortfolioColumnPreferences {
  const candidate = value && typeof value === 'object'
    ? value as { columnOrder?: unknown; hiddenColumnIds?: unknown }
    : {};

  const persistedOrder = uniqueKnownColumnIds(candidate.columnOrder)
    .filter((id) => id !== REQUIRED_PORTFOLIO_COLUMN_ID);
  const persistedIds = new Set<PortfolioColumnId>([
    REQUIRED_PORTFOLIO_COLUMN_ID,
    ...persistedOrder,
  ]);
  const appendedIds = DEFAULT_PORTFOLIO_COLUMN_ORDER.filter((id) => !persistedIds.has(id));
  const columnOrder: PortfolioColumnId[] = [
    REQUIRED_PORTFOLIO_COLUMN_ID,
    ...persistedOrder,
    ...appendedIds,
  ];
  const hiddenColumnIds = uniqueKnownColumnIds(candidate.hiddenColumnIds)
    .filter((id) => id !== REQUIRED_PORTFOLIO_COLUMN_ID);

  return {
    version: PORTFOLIO_COLUMN_PREFERENCES_VERSION,
    columnOrder,
    hiddenColumnIds,
  };
}

export function getVisiblePortfolioColumnIds(
  preferences: unknown,
): PortfolioColumnId[] {
  const normalized = normalizePortfolioColumnPreferences(preferences);
  const hiddenIds = new Set(normalized.hiddenColumnIds);
  return normalized.columnOrder.filter((id) => !hiddenIds.has(id));
}

export function getPortfolioColumnWidth(columnId: PortfolioColumnId): number {
  return PORTFOLIO_COLUMN_WIDTHS[columnId];
}

export function calculatePortfolioColumnsWidth(
  columnIds: readonly PortfolioColumnId[],
): number {
  return columnIds.reduce((total, id) => total + getPortfolioColumnWidth(id), 0);
}

export function calculateVisiblePortfolioColumnsWidth(preferences: unknown): number {
  return calculatePortfolioColumnsWidth(getVisiblePortfolioColumnIds(preferences));
}
