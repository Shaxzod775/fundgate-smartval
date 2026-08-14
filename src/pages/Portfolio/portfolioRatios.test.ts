import { describe, expect, it } from 'vitest';
import {
  firstStoredPortfolioRatio,
  parseLegacyPortfolioRatio,
  parseStoredPortfolioRatio,
} from './portfolioRatios';

describe('portfolio ratio contracts', () => {
  it('preserves normalized API ratios above 100 percent', () => {
    expect(parseStoredPortfolioRatio(1.5)).toBe(1.5);
    expect(firstStoredPortfolioRatio(undefined, '1,5')).toBe(1.5);
  });

  it('normalizes legacy percentage fields without changing ratio fields', () => {
    expect(parseLegacyPortfolioRatio('150%')).toBe(1.5);
    expect(parseLegacyPortfolioRatio(150)).toBe(1.5);
    expect(parseLegacyPortfolioRatio(67)).toBe(0.67);
    expect(parseLegacyPortfolioRatio(3)).toBe(0.03);
    expect(parseLegacyPortfolioRatio(0.25)).toBe(0.25);
  });
});
