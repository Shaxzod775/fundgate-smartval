import { describe, expect, it } from 'vitest';
import {
  calculatePortfolioScores,
  classifyLowerIsBetterMetric,
  classifyPortfolioScore,
  combinePortfolioHealthFlags,
  portfolioScoreStatusToHealthFlag,
  scoreCurrentRatio,
  scoreEbitdaMargin,
  scoreGrossMargin,
  scoreMom,
  scoreQoq,
  scoreRunway,
  scoreYoy,
} from './portfolioScoring';
import { DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS } from './portfolioSegments';

describe('portfolio scoring matrix', () => {
  it('matches the workbook growth thresholds', () => {
    expect(scoreYoy(1.01)).toBe(5);
    expect(scoreYoy(0.5)).toBe(4);
    expect(scoreYoy(-0.01)).toBe(-1);
    expect(scoreQoq(0.25)).toBe(4);
    expect(scoreMom(0.05)).toBe(3);
  });

  it('matches the workbook margin, runway and liquidity thresholds', () => {
    expect(scoreGrossMargin(0.81)).toBe(5);
    expect(scoreGrossMargin(0.8)).toBe(4);
    expect(scoreGrossMargin(0.6)).toBe(4);
    expect(scoreGrossMargin(0.4)).toBe(3);
    expect(scoreGrossMargin(0.2)).toBe(2);
    expect(scoreGrossMargin(-0.01)).toBe(-1);
    expect(scoreEbitdaMargin(0.2)).toBe(4);
    expect(scoreEbitdaMargin(0)).toBe(4);
    expect(scoreEbitdaMargin(-0.2)).toBe(3);
    expect(scoreEbitdaMargin(-0.5)).toBe(2);
    expect(scoreEbitdaMargin(-0.85)).toBe(1);
    expect(scoreRunway(18.3)).toBe(4);
    expect(scoreRunway(19.1)).toBe(5);
    expect(scoreRunway(undefined, true)).toBe(5);
    expect(scoreCurrentRatio(1.5)).toBe(4);
  });

  it('uses segment-specific margin thresholds and flags', () => {
    const marketplace = calculatePortfolioScores({
      grossMargin: 0.25,
      segmentThresholds: DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.marketplace,
    });
    const saas = calculatePortfolioScores({
      grossMargin: 0.25,
      segmentThresholds: DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.saas,
    });

    expect(marketplace.grossMargin).toBe(2);
    expect(marketplace.grossMarginStatus).toBe('green');
    expect(marketplace.marginStatus).toBe('green');
    expect(saas.grossMargin).toBe(2);
    expect(saas.grossMarginStatus).toBe('red');
    expect(saas.marginStatus).toBe('red');
  });

  it('combines health signals conservatively', () => {
    expect(combinePortfolioHealthFlags([])).toBeUndefined();
    expect(combinePortfolioHealthFlags(['green', undefined])).toBe('green');
    expect(combinePortfolioHealthFlags(['green', 'yellow'])).toBe('yellow');
    expect(combinePortfolioHealthFlags(['green', 'red', 'yellow'])).toBe('red');
    expect(classifyLowerIsBetterMetric(0.02, 0.02, 0.05)).toBe('green');
    expect(classifyLowerIsBetterMetric(0.04, 0.02, 0.05)).toBe('yellow');
    expect(classifyLowerIsBetterMetric(0.08, 0.02, 0.05)).toBe('red');
    expect(portfolioScoreStatusToHealthFlag('Healthy')).toBe('green');
    expect(portfolioScoreStatusToHealthFlag('Need attention')).toBe('yellow');
    expect(portfolioScoreStatusToHealthFlag('Critical')).toBe('red');
  });

  it('applies the specification weights and four-point denominator', () => {
    const scores = calculatePortfolioScores({
      yoyGrowth: 0.5,
      qoqGrowth: 0.25,
      momGrowth: 0.1,
      grossMargin: 0.6,
      ebitdaMargin: 0,
      runway: 12,
      currentRatio: 1.5,
    });

    expect(scores.total).toBe(1);
    expect(scores.coverage).toBe(1);
    expect(scores.availableCount).toBe(7);
  });

  it('matches the Total Score example from the portfolio specification', () => {
    const scores = calculatePortfolioScores({
      yoyGrowth: 0.5,
      qoqGrowth: 0.1,
      momGrowth: 0,
      grossMargin: 0.4,
      ebitdaMargin: -0.85,
      runway: 3,
      currentRatio: 0.7,
    });

    expect(scores).toMatchObject({
      yoy: 4,
      qoq: 3,
      mom: 2,
      grossMargin: 3,
      ebitda: 1,
      runway: 2,
      currentRatio: 2,
      status: 'Healthy',
    });
    expect(scores.total).toBe(0.6125);
  });

  it('keeps exact workbook boundaries stable across floating-point artifacts', () => {
    expect(scoreGrossMargin(0.4 - Number.EPSILON)).toBe(3);
    expect(scoreEbitdaMargin(-0.85 - Number.EPSILON)).toBe(1);
    expect(classifyPortfolioScore(0.8 - Number.EPSILON)).toBe('Strong');
    expect(scoreYoy(1 + Number.EPSILON)).toBe(4);
  });

  it('keeps the existing score-5 tier as a bonus above 100%', () => {
    const scores = calculatePortfolioScores({
      yoyGrowth: 1.1,
      qoqGrowth: 0.6,
      momGrowth: 0.21,
      grossMargin: 0.81,
      ebitdaMargin: 0.21,
      runwayInfinite: true,
      currentRatio: 2.1,
    });

    expect(scores.total).toBe(1.25);
    expect(scores.status).toBe('Strong');
  });

  it('matches the workbook rule where missing metrics contribute zero', () => {
    const insufficient = calculatePortfolioScores({
      yoyGrowth: 0.5,
      runway: 12,
    });
    expect(insufficient.yoy).toBe(4);
    expect(insufficient.qoq).toBeUndefined();
    expect(insufficient.total).toBeCloseTo(0.25);
    expect(insufficient.status).toBe('At Risk');
    expect(insufficient.coverage).toBeCloseTo(0.25);

    const partial = calculatePortfolioScores({
      yoyGrowth: 0.2,
      grossMargin: 0.4,
      ebitdaMargin: 0,
      runway: 12,
    });
    expect(partial.coverage).toBeCloseTo(0.5);
    expect(partial.availableCount).toBe(4);
    expect(partial.total).toBeCloseTo(0.4375);
    expect(partial.status).toBe('Need attention');
  });

  it('classifies the exact specification score bands', () => {
    expect(classifyPortfolioScore(0.8)).toBe('Strong');
    expect(classifyPortfolioScore(0.79)).toBe('Healthy');
    expect(classifyPortfolioScore(0.5)).toBe('Healthy');
    expect(classifyPortfolioScore(0.49)).toBe('Need attention');
    expect(classifyPortfolioScore(0.35)).toBe('Need attention');
    expect(classifyPortfolioScore(0.34)).toBe('At Risk');
    expect(classifyPortfolioScore(0.15)).toBe('At Risk');
    expect(classifyPortfolioScore(0.14)).toBe('Critical');
  });

  it('scores an infinite current ratio as the strongest liquidity signal', () => {
    expect(scoreCurrentRatio(Number.POSITIVE_INFINITY)).toBe(5);
  });
});
