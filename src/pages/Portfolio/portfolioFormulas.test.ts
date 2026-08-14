import { describe, expect, it } from 'vitest';
import {
  calculateAnnualGrossMargin,
  calculateCurrentRatio,
  calculateDebtToEquity,
  calculateEbitda,
  calculateEbitdaMargin,
  calculateGrossProfit,
  calculateGrossMargin,
  calculateGrowth,
  calculateGrowthFromHistory,
  calculateMoic,
  calculateNetBurn,
  calculateNetProfit,
  calculateOwnership,
  calculatePostMoneyValuation,
  calculateProfitMargin,
  calculateRunway,
  deriveRecurringRevenue,
} from './portfolioFormulas';
import { calculatePortfolioScores } from './portfolioScoring';
import { DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS } from './portfolioSegments';

describe('portfolio formulas', () => {
  it('calculates entry post-money, ownership and MOIC from one consistent basis', () => {
    expect(calculatePostMoneyValuation(1_000_000, 500_000)).toBe(1_500_000);
    expect(calculateOwnership(150_000, 1_500_000)).toBeCloseTo(0.1);
    expect(calculateOwnership(2_000_000, 1_500_000)).toBe(1);
    expect(calculateMoic(300_000, 150_000)).toBe(2);
    expect(calculateMoic(300_000, 0)).toBeUndefined();
  });

  it('fills the missing side of the MRR/ARR pair without overwriting reported values', () => {
    expect(deriveRecurringRevenue({ mrr: 10_000 })).toEqual({
      mrr: 10_000,
      arr: 120_000,
      mrrDerived: false,
      arrDerived: true,
    });
    expect(deriveRecurringRevenue({ arr: 240_000 })).toEqual({
      mrr: 20_000,
      arr: 240_000,
      mrrDerived: true,
      arrDerived: false,
    });
    expect(deriveRecurringRevenue({ mrr: 10_000, arr: 150_000 }).arr).toBe(150_000);
  });

  it('uses explicit growth rules for zero denominators', () => {
    expect(calculateGrowth(0, 100)).toBe(-1);
    expect(calculateGrowth(0, 0)).toBe(0);
    expect(calculateGrowth(100, 0)).toBeUndefined();
  });

  it('calculates MoM, QoQ and YoY only from exact comparable periods', () => {
    const monthly = [
      { date: '2025-01', period: 'monthly', value: 100 },
      { date: '2025-10', period: 'monthly', value: 160 },
      { date: '2026-01', period: 'monthly', value: 200 },
      { date: '2026-02', period: 'monthly', value: 220 },
    ];
    expect(calculateGrowthFromHistory(monthly, 'mom')).toBeCloseTo(0.1);
    expect(calculateGrowthFromHistory(monthly, 'qoq')).toBeCloseTo(0.25);
    expect(calculateGrowthFromHistory(monthly, 'yoy')).toBeCloseTo(1);

    expect(calculateGrowthFromHistory([
      { date: '2026-01', period: 'monthly', value: 100 },
      { date: '2026-03', period: 'monthly', value: 150 },
    ], 'mom')).toBeUndefined();
  });

  it('supports approved quarterly comparisons without inventing MoM', () => {
    const quarterly = [
      { date: '2025-Q1', period: 'quarterly', value: 100 },
      { date: '2025-Q4', period: 'quarterly', value: 160 },
      { date: '2026-Q1', period: 'quarterly', value: 200 },
    ];
    expect(calculateGrowthFromHistory(quarterly, 'qoq')).toBeCloseTo(0.25);
    expect(calculateGrowthFromHistory(quarterly, 'yoy')).toBeCloseTo(1);
    expect(calculateGrowthFromHistory(quarterly, 'mom')).toBeUndefined();
  });

  it('calculates margins only with a valid revenue denominator', () => {
    expect(calculateGrossMargin(1_000, 400)).toBeCloseTo(0.6);
    expect(calculateProfitMargin(-100, 1_000)).toBeCloseTo(-0.1);
    expect(calculateGrossMargin(0, 0)).toBeUndefined();
    expect(calculateProfitMargin(100, 0)).toBeUndefined();
  });

  it('matches the EBITDA Margin example from the portfolio specification', () => {
    expect(calculateEbitdaMargin(2_308_947, 3_269_732)).toBeCloseTo(0.7062, 4);
    expect(calculateEbitdaMargin(100, 0)).toBeUndefined();
  });

  it('sums annual MRR and COGS before calculating Gross Margin', () => {
    const result = calculateAnnualGrossMargin([
      { date: '2024-12', mrr: 1_000_000, cogs: 900_000 },
      { date: '2025-01', mrr: 100_000, cogs: 6_000 },
      { date: '2025-02', mrr: 173_729, cogs: 11_820 },
    ]);

    expect(result).toMatchObject({
      year: 2025,
      mrrTotal: 273_729,
      cogsTotal: 17_820,
    });
    expect(result.value).toBeCloseTo(0.9349, 4);
  });

  it('recreates the workbook P&L bridge and net burn', () => {
    expect(calculateGrossProfit(1_000, 400)).toBe(600);
    expect(calculateEbitda(1_000, 400, 450)).toBe(150);
    expect(calculateNetProfit(150, 20, 10)).toBe(120);
    expect(calculateNetBurn(1_000, 400, 700)).toBe(100);
    expect(calculateNetBurn(1_000, 400, 450)).toBe(-150);
  });

  it('calculates runway, liquidity and leverage with business-safe edge cases', () => {
    expect(calculateRunway(120_000, 10_000)).toEqual({ value: 12, infinite: false });
    expect(calculateRunway(120_000, 0)).toEqual({ infinite: true });
    expect(calculateRunway(0, 10_000)).toEqual({ value: 0, infinite: false });
    expect(calculateRunway(0, 0)).toEqual({ infinite: false });
    expect(calculateCurrentRatio(200, 100)).toBe(2);
    expect(calculateCurrentRatio(200, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(calculateCurrentRatio(0, 0)).toBeUndefined();
    expect(calculateDebtToEquity(50, 200)).toBe(0.25);
    expect(calculateDebtToEquity(50, -10)).toBeUndefined();
  });

  it('recalculates the complete dashboard chain whenever an input changes', () => {
    const derive = (input: {
      invested: number;
      entryValuation: number;
      currentValuation: number;
      mrr: number;
      revenue: number;
      cogs: number;
      operatingExpenses: number;
      taxes: number;
      interest: number;
      cash: number;
      currentAssets: number;
      currentLiabilities: number;
      debt: number;
      equity: number;
    }) => {
      const ownership = calculateOwnership(input.invested, input.entryValuation);
      const positionValue = ownership == null ? undefined : input.currentValuation * ownership;
      const moic = calculateMoic(positionValue, input.invested);
      const recurring = deriveRecurringRevenue({ mrr: input.mrr });
      const grossMargin = calculateGrossMargin(input.revenue, input.cogs);
      const ebitda = calculateEbitda(input.revenue, input.cogs, input.operatingExpenses);
      const ebitdaMargin = calculateEbitdaMargin(ebitda, recurring.arr);
      const netProfit = calculateNetProfit(ebitda, input.taxes, input.interest);
      const netMargin = calculateProfitMargin(netProfit, input.revenue);
      const burn = calculateNetBurn(input.revenue, input.cogs, input.operatingExpenses);
      const runway = calculateRunway(input.cash, burn);
      const currentRatio = calculateCurrentRatio(input.currentAssets, input.currentLiabilities);
      const debtToEquity = calculateDebtToEquity(input.debt, input.equity);
      return {
        ownership,
        positionValue,
        moic,
        recurring,
        grossMargin,
        ebitda,
        ebitdaMargin,
        netProfit,
        netMargin,
        burn,
        runway,
        currentRatio,
        debtToEquity,
        scores: calculatePortfolioScores({
          yoyGrowth: 1,
          qoqGrowth: 0.25,
          momGrowth: 1 / 9,
          grossMargin,
          ebitdaMargin,
          runway: runway.value,
          runwayInfinite: runway.infinite,
          currentRatio,
          segmentThresholds: DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.marketplace,
        }),
      };
    };

    const baseInputs = {
      invested: 200_000,
      entryValuation: 1_000_000,
      currentValuation: 2_000_000,
      mrr: 100_000,
      revenue: 1_000_000,
      cogs: 400_000,
      operatingExpenses: 700_000,
      taxes: 20_000,
      interest: 10_000,
      cash: 600_000,
      currentAssets: 300,
      currentLiabilities: 200,
      debt: 50_000,
      equity: 200_000,
    };
    const base = derive(baseInputs);
    expect(base).toMatchObject({
      ownership: 0.2,
      positionValue: 400_000,
      moic: 2,
      recurring: { mrr: 100_000, arr: 1_200_000, arrDerived: true },
      grossMargin: 0.6,
      ebitda: -100_000,
      ebitdaMargin: -1 / 12,
      netProfit: -130_000,
      netMargin: -0.13,
      burn: 100_000,
      runway: { value: 6, infinite: false },
      currentRatio: 1.5,
      debtToEquity: 0.25,
    });
    expect(base.scores.total).toBeCloseTo(0.9375);

    const investmentChanged = derive({ ...baseInputs, invested: 250_000 });
    expect(investmentChanged.ownership).toBe(0.25);
    expect(investmentChanged.positionValue).toBe(500_000);
    expect(investmentChanged.moic).toBe(2);

    const valuationChanged = derive({ ...baseInputs, currentValuation: 3_000_000 });
    expect(valuationChanged.positionValue).toBe(600_000);
    expect(valuationChanged.moic).toBe(3);

    const mrrChanged = derive({ ...baseInputs, mrr: 120_000 });
    expect(mrrChanged.recurring.arr).toBe(1_440_000);

    const pnlChanged = derive({
      ...baseInputs,
      revenue: 1_200_000,
      cogs: 300_000,
      operatingExpenses: 600_000,
      cash: 900_000,
    });
    expect(pnlChanged.grossMargin).toBe(0.75);
    expect(pnlChanged.ebitda).toBe(300_000);
    expect(pnlChanged.burn).toBe(-300_000);
    expect(pnlChanged.runway).toEqual({ infinite: true });
    expect(pnlChanged.scores.grossMarginStatus).toBe('green');
  });
});
