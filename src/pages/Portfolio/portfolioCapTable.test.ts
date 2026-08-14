import { describe, expect, it } from 'vitest';
import {
  readStoredPortfolioRatio,
  resolveFundRoundValuations,
  withPortfolioInvestmentSourceIndices,
} from './portfolioCapTable';

describe('portfolio cap-table persistence helpers', () => {
  it('reads the API ownership override as an already-normalized ratio', () => {
    expect(readStoredPortfolioRatio(0.25, undefined)).toBe(0.25);
    expect(readStoredPortfolioRatio('0.005', undefined)).toBe(0.005);
    expect(readStoredPortfolioRatio(undefined, 0.4)).toBe(0.4);
  });

  it('keeps source investment indices after filtering display rows', () => {
    const indexed = withPortfolioInvestmentSourceIndices([
      { investorName: 'Fund' },
      { investorName: '' },
      { investorName: 'External A' },
      { investorName: 'External B' },
    ]).filter(({ investment }) => investment.investorName.startsWith('External'));

    expect(indexed.map(({ sourceIndex }) => sourceIndex)).toEqual([2, 3]);
  });

  it('keeps the stored pre-money when the syndicated round is larger than the fund cheque', () => {
    expect(resolveFundRoundValuations({
      valuationType: 'pre-money',
      storedValuation: 1_000_000,
      entryPostMoney: 1_500_000,
      fundInvestment: 200_000,
    })).toEqual({
      preMoney: 1_000_000,
      postMoney: 1_500_000,
    });
  });

  it('derives pre-money from the fund cheque for a post-money-only record', () => {
    expect(resolveFundRoundValuations({
      valuationType: 'post-money',
      entryPostMoney: 1_200_000,
      fundInvestment: 200_000,
    })).toEqual({
      preMoney: 1_000_000,
      postMoney: 1_200_000,
    });
  });
});
