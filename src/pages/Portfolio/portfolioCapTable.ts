export type PortfolioWorkbookCellValue = string | number | null;

export function readStoredPortfolioRatio(
  value: PortfolioWorkbookCellValue | undefined,
  fallback: number | undefined,
): number | undefined {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function withPortfolioInvestmentSourceIndices<T>(
  investments: readonly T[],
): Array<{ investment: T; sourceIndex: number }> {
  return investments.map((investment, sourceIndex) => ({
    investment,
    sourceIndex,
  }));
}

export function resolveFundRoundValuations(input: {
  valuationType?: string | null;
  storedValuation?: number;
  entryPostMoney?: number;
  fundInvestment?: number;
}): { preMoney?: number; postMoney?: number } {
  if (
    input.valuationType === 'pre-money'
    && input.storedValuation != null
    && Number.isFinite(input.storedValuation)
  ) {
    return {
      preMoney: input.storedValuation,
      postMoney: input.entryPostMoney,
    };
  }

  return {
    preMoney: input.entryPostMoney != null && input.fundInvestment != null
      ? Math.max(0, input.entryPostMoney - input.fundInvestment)
      : undefined,
    postMoney: input.entryPostMoney,
  };
}
