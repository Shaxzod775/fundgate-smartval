import { describe, expect, it } from 'vitest';
import {
  PORTFOLIO_FILTER_MISSING,
  calculatePortfolioDashboardSummary,
  createEmptyPortfolioQuickFilters,
  filterPortfolioDashboardRows,
  getPortfolioDashboardFilterOptions,
  getPortfolioPositionNavUsd,
  type PortfolioDashboardRowLike,
} from './portfolioDashboard';

interface TestRow extends PortfolioDashboardRowLike {
  id: string;
}

const rows: TestRow[] = [
  {
    id: 'alpha',
    name: 'Alpha Pay',
    industry: 'Fintech',
    stage: 'Seed',
    status: 'green',
    portfolioType: 'direct',
    managerId: 'manager-1',
    managerName: 'Aziza',
  },
  {
    id: 'beta',
    name: 'Beta Bank',
    industry: 'Fintech',
    stage: 'Series A',
    status: 'yellow',
    portfolioType: 'program',
    managerId: 'manager-2',
    managerName: 'Bek',
  },
  {
    id: 'gamma',
    name: 'Gamma Health',
    industry: 'Healthtech',
    stage: 'Seed',
    status: 'green',
    portfolioType: 'direct',
    managerId: 'manager-2',
    managerName: 'Bek',
  },
];

describe('portfolio dashboard quick filters', () => {
  it('uses OR within a dimension and AND across dimensions and name search', () => {
    const result = filterPortfolioDashboardRows(rows, {
      industries: ['Fintech', 'Healthtech'],
      stages: [],
      statuses: ['green'],
      portfolioTypes: [],
      managerIds: [],
    }, 'a');

    expect(result.map((row) => row.id)).toEqual(['alpha', 'gamma']);
  });

  it('generates and filters a dedicated missing-value option', () => {
    const rowsWithMissing: TestRow[] = [
      ...rows,
      {
        id: 'missing',
        name: 'Unknown Co',
        industry: '-',
        stage: undefined,
        status: '',
        portfolioType: null,
        managerId: undefined,
      },
    ];
    const options = getPortfolioDashboardFilterOptions(rowsWithMissing);

    expect(options.industries[options.industries.length - 1]).toMatchObject({
      value: PORTFOLIO_FILTER_MISSING,
      label: 'Не указано',
      count: 1,
      isMissing: true,
    });
    expect(options.stages[options.stages.length - 1]?.value).toBe(PORTFOLIO_FILTER_MISSING);
    expect(options.statuses[options.statuses.length - 1]?.value).toBe(PORTFOLIO_FILTER_MISSING);
    expect(options.portfolioTypes[options.portfolioTypes.length - 1]?.value).toBe(PORTFOLIO_FILTER_MISSING);
    expect(options.managerIds[options.managerIds.length - 1]?.value).toBe(PORTFOLIO_FILTER_MISSING);

    const filters = createEmptyPortfolioQuickFilters();
    const result = filterPortfolioDashboardRows(rowsWithMissing, {
      ...filters,
      industries: [PORTFOLIO_FILTER_MISSING],
    });
    expect(result.map((row) => row.id)).toEqual(['missing']);
  });
});

describe('portfolio dashboard financial summary', () => {
  it('excludes program rows from invested capital and NAV', () => {
    const summary = calculatePortfolioDashboardSummary([
      { portfolioType: 'direct', investedUsd: 100, explicitMoic: 2 },
      { portfolioType: 'program', investedUsd: 1_000, explicitMoic: 10 },
    ]);

    expect(summary).toMatchObject({
      total: 2,
      direct: 1,
      program: 1,
      totalInvestedUsd: 100,
      totalPositionNavUsd: 200,
      weightedMoic: 2,
    });
  });

  it('treats legacy rows without portfolioType as direct investments', () => {
    const summary = calculatePortfolioDashboardSummary([
      { investedUsd: 250 },
    ]);

    expect(summary).toMatchObject({
      direct: 1,
      program: 0,
      totalInvestedUsd: 250,
      totalPositionNavUsd: 250,
      weightedMoic: 1,
    });
  });

  it('calculates NAV from reported valuation, then explicit MOIC, then cost', () => {
    const summary = calculatePortfolioDashboardSummary([
      { investedUsd: 100_000, reportedValuationUsd: 2_000_000, ownership: 0.1, explicitMoic: 99 },
      { investedUsd: 200_000, explicitMoic: 1.5 },
      { investedUsd: 50_000 },
    ]);

    expect(summary.totalInvestedUsd).toBe(350_000);
    expect(summary.totalPositionNavUsd).toBe(550_000);
  });

  it('calculates portfolio MOIC as invested-capital-weighted NAV', () => {
    const summary = calculatePortfolioDashboardSummary([
      { investedUsd: 100, explicitMoic: 2 },
      { investedUsd: 300 },
    ]);

    expect(summary.weightedMoic).toBe(1.25);
  });

  it('does not use an AI valuation as a NAV input', () => {
    const row = {
      investedUsd: 100,
      aiValuationUsd: 1_000_000,
    };

    expect(getPortfolioPositionNavUsd(row)).toBe(100);
  });
});
