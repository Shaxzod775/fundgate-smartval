export type PortfolioGrowthPeriod = 'mom' | 'qoq' | 'yoy';

export interface PortfolioHistoryPoint {
  date: string;
  period?: 'monthly' | 'quarterly' | string;
  value?: number | null;
}

export interface RecurringRevenueValues {
  mrr?: number;
  arr?: number;
  mrrDerived: boolean;
  arrDerived: boolean;
}

export interface RunwayValue {
  value?: number;
  infinite: boolean;
}

export interface PortfolioGrossMarginPoint {
  date: string;
  mrr?: number | null;
  cogs?: number | null;
}

export interface PortfolioAnnualGrossMargin {
  value?: number;
  year?: number;
  mrrTotal?: number;
  cogsTotal?: number;
}

const isFiniteNumber = (value: number | null | undefined): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const asNonNegative = (value: number | null | undefined): number | undefined => (
  isFiniteNumber(value) && value >= 0 ? value : undefined
);

export function calculatePostMoneyValuation(
  preMoney?: number | null,
  newMoney?: number | null,
): number | undefined {
  const preMoneyValue = asNonNegative(preMoney);
  const newMoneyValue = asNonNegative(newMoney);
  return preMoneyValue != null && newMoneyValue != null
    ? preMoneyValue + newMoneyValue
    : undefined;
}

export function calculateOwnership(invested?: number | null, postMoney?: number | null): number | undefined {
  const investedValue = asNonNegative(invested);
  const postMoneyValue = asNonNegative(postMoney);
  if (investedValue == null || postMoneyValue == null || postMoneyValue === 0) return undefined;
  return Math.min(1, investedValue / postMoneyValue);
}

export function calculateMoic(positionValue?: number | null, invested?: number | null): number | undefined {
  const positionValueNumber = asNonNegative(positionValue);
  const investedValue = asNonNegative(invested);
  if (positionValueNumber == null || investedValue == null || investedValue === 0) return undefined;
  return positionValueNumber / investedValue;
}

export function deriveRecurringRevenue(input: {
  mrr?: number | null;
  arr?: number | null;
}): RecurringRevenueValues {
  const explicitMrr = asNonNegative(input.mrr);
  const explicitArr = asNonNegative(input.arr);

  if (explicitMrr != null && explicitArr != null) {
    return { mrr: explicitMrr, arr: explicitArr, mrrDerived: false, arrDerived: false };
  }
  if (explicitMrr != null) {
    return { mrr: explicitMrr, arr: explicitMrr * 12, mrrDerived: false, arrDerived: true };
  }
  if (explicitArr != null) {
    return { mrr: explicitArr / 12, arr: explicitArr, mrrDerived: true, arrDerived: false };
  }
  return { mrrDerived: false, arrDerived: false };
}

export function calculateGrowth(current?: number | null, previous?: number | null): number | undefined {
  const currentValue = asNonNegative(current);
  const previousValue = asNonNegative(previous);
  if (currentValue == null || previousValue == null) return undefined;
  if (previousValue === 0) return currentValue === 0 ? 0 : undefined;
  return currentValue / previousValue - 1;
}

type ParsedHistoryPeriod = {
  kind: 'monthly' | 'quarterly';
  index: number;
  endingMonthIndex: number;
};

function parseHistoryPeriod(point: PortfolioHistoryPoint): ParsedHistoryPeriod | undefined {
  const value = String(point.date || '').trim();
  const monthMatch = /^(\d{4})-(0?[1-9]|1[0-2])$/.exec(value);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const index = year * 12 + month - 1;
    return { kind: 'monthly', index, endingMonthIndex: index };
  }

  const quarterMatch = /^(\d{4})-Q([1-4])$/i.exec(value);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    return {
      kind: 'quarterly',
      index: year * 4 + quarter - 1,
      endingMonthIndex: year * 12 + quarter * 3 - 1,
    };
  }
  return undefined;
}

function comparisonDelta(kind: ParsedHistoryPeriod['kind'], comparison: PortfolioGrowthPeriod): number | undefined {
  if (kind === 'monthly') {
    if (comparison === 'mom') return 1;
    if (comparison === 'qoq') return 3;
    return 12;
  }
  if (comparison === 'qoq') return 1;
  if (comparison === 'yoy') return 4;
  return undefined;
}

export function calculateGrowthFromHistory(
  points: readonly PortfolioHistoryPoint[],
  comparison: PortfolioGrowthPeriod,
): number | undefined {
  const byKind: Record<'monthly' | 'quarterly', Map<number, { value: number; endingMonthIndex: number }>> = {
    monthly: new Map(),
    quarterly: new Map(),
  };

  points.forEach((point) => {
    const parsed = parseHistoryPeriod(point);
    const value = asNonNegative(point.value);
    if (!parsed || value == null) return;
    byKind[parsed.kind].set(parsed.index, { value, endingMonthIndex: parsed.endingMonthIndex });
  });

  const candidates: Array<{ growth: number; endingMonthIndex: number; kind: ParsedHistoryPeriod['kind'] }> = [];
  (['monthly', 'quarterly'] as const).forEach((kind) => {
    const delta = comparisonDelta(kind, comparison);
    if (delta == null) return;
    const values = byKind[kind];
    const indices = [...values.keys()].sort((left, right) => right - left);

    for (const index of indices) {
      const current = values.get(index);
      const previous = values.get(index - delta);
      if (!current || !previous) continue;
      const growth = calculateGrowth(current.value, previous.value);
      if (growth == null) continue;
      candidates.push({ growth, endingMonthIndex: current.endingMonthIndex, kind });
      break;
    }
  });

  candidates.sort((left, right) => (
    right.endingMonthIndex - left.endingMonthIndex
    || (left.kind === 'monthly' ? -1 : 1)
  ));
  return candidates[0]?.growth;
}

export function calculateGrossMargin(revenue?: number | null, cogs?: number | null): number | undefined {
  const revenueValue = asNonNegative(revenue);
  const cogsValue = asNonNegative(cogs);
  if (revenueValue == null || revenueValue === 0 || cogsValue == null) return undefined;
  return (revenueValue - cogsValue) / revenueValue;
}

export function calculateAnnualGrossMargin(
  points: readonly PortfolioGrossMarginPoint[],
): PortfolioAnnualGrossMargin {
  const byYear = new Map<number, PortfolioGrossMarginPoint[]>();

  points.forEach((point) => {
    const yearMatch = String(point.date || '').match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
    if (!yearMatch) return;
    const year = Number(yearMatch[1]);
    const values = byYear.get(year) || [];
    values.push(point);
    byYear.set(year, values);
  });

  const years = [...byYear.keys()].sort((left, right) => right - left);
  for (const year of years) {
    const yearPoints = byYear.get(year) || [];
    const mrrValues = yearPoints
      .map((point) => asNonNegative(point.mrr))
      .filter((value): value is number => value != null);
    const cogsValues = yearPoints
      .map((point) => asNonNegative(point.cogs))
      .filter((value): value is number => value != null);
    if (mrrValues.length === 0 || cogsValues.length === 0) continue;

    const mrrTotal = mrrValues.reduce((sum, value) => sum + value, 0);
    const cogsTotal = cogsValues.reduce((sum, value) => sum + value, 0);
    return {
      value: calculateGrossMargin(mrrTotal, cogsTotal),
      year,
      mrrTotal,
      cogsTotal,
    };
  }

  return {};
}

export function calculateEbitdaMargin(
  ebitda?: number | null,
  arr?: number | null,
): number | undefined {
  return calculateProfitMargin(ebitda, arr);
}

export function calculateGrossProfit(revenue?: number | null, cogs?: number | null): number | undefined {
  const revenueValue = asNonNegative(revenue);
  const cogsValue = asNonNegative(cogs);
  if (revenueValue == null || cogsValue == null) return undefined;
  return revenueValue - cogsValue;
}

export function calculateEbitda(
  revenue?: number | null,
  cogs?: number | null,
  operatingExpenses?: number | null,
): number | undefined {
  const grossProfit = calculateGrossProfit(revenue, cogs);
  const expenses = asNonNegative(operatingExpenses);
  if (grossProfit == null || expenses == null) return undefined;
  return grossProfit - expenses;
}

export function calculateNetProfit(
  ebitda?: number | null,
  taxes?: number | null,
  interestExpense?: number | null,
): number | undefined {
  if (!isFiniteNumber(ebitda)) return undefined;
  const taxValue = asNonNegative(taxes) ?? 0;
  const interestValue = asNonNegative(interestExpense) ?? 0;
  return ebitda - taxValue - interestValue;
}

export function calculateNetBurn(
  revenue?: number | null,
  cogs?: number | null,
  operatingExpenses?: number | null,
): number | undefined {
  const ebitda = calculateEbitda(revenue, cogs, operatingExpenses);
  return ebitda == null ? undefined : -ebitda;
}

export function calculateProfitMargin(profit?: number | null, revenue?: number | null): number | undefined {
  if (!isFiniteNumber(profit)) return undefined;
  const revenueValue = asNonNegative(revenue);
  if (revenueValue == null || revenueValue === 0) return undefined;
  return profit / revenueValue;
}

export function calculateRunway(cash?: number | null, monthlyBurn?: number | null): RunwayValue {
  const cashValue = asNonNegative(cash);
  if (cashValue == null || !isFiniteNumber(monthlyBurn)) return { infinite: false };
  if (cashValue === 0 && monthlyBurn === 0) return { infinite: false };
  if (monthlyBurn <= 0) return { infinite: true };
  return { value: cashValue / monthlyBurn, infinite: false };
}

export function calculateCurrentRatio(
  currentAssets?: number | null,
  currentLiabilities?: number | null,
): number | undefined {
  const assets = asNonNegative(currentAssets);
  const liabilities = asNonNegative(currentLiabilities);
  if (assets == null || liabilities == null) return undefined;
  if (liabilities === 0) return assets > 0 ? Number.POSITIVE_INFINITY : undefined;
  return assets / liabilities;
}

export function calculateDebtToEquity(totalDebt?: number | null, equity?: number | null): number | undefined {
  const debt = asNonNegative(totalDebt);
  if (debt == null || !isFiniteNumber(equity) || equity <= 0) return undefined;
  return debt / equity;
}
