import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTFOLIO_SETTINGS,
  buildPortfolioRow,
  getMomGrowth,
  applyStagedToRow,
  committedCellRaw,
  safeStagedNumber,
  safeStagedRatio,
  type PortfolioRow,
} from './Portfolio';
import type { Startup } from '../../types';

const settings = { ...DEFAULT_PORTFOLIO_SETTINGS, usdToUzs: 12_700 };

function makeStartup(overrides: Record<string, unknown> = {}): Startup {
  return {
    id: 's-test',
    brief: { companyName: 'Test', industry: 'AI', stage: 'Seed', country: 'UZ' },
    metrics: {},
    metricsHistory: [],
    ...overrides,
  } as unknown as Startup;
}

describe('buildPortfolioRow — MOIC honesty', () => {
  it('does NOT fabricate MOIC from entry valuation when there is no real current mark', () => {
    const row = buildPortfolioRow(
      makeStartup({ investmentAmount: 100_000, valuation: 500_000, valuationType: 'post-money' }),
      0,
      settings
    );
    expect(row.currentValuation).toBe(500_000);
    expect(row.moic).toBeUndefined();
  });

  it('computes MOIC from an explicit current valuation', () => {
    const row = buildPortfolioRow(
      makeStartup({ investmentAmount: 100_000, metrics: { lastValuation: 300_000 } }),
      0,
      settings
    );
    expect(row.moic).toBeCloseTo(3, 5);
    expect(row.currentValuation).toBe(300_000);
  });
});

describe('buildPortfolioRow — status (Total Score)', () => {
  it('is NOT green when only one signal is present (rest blank)', () => {
    const row = buildPortfolioRow(makeStartup({ metrics: { runway: 24 } }), 0, settings);
    expect(row.autoStatus).not.toBe('green');
    expect(row.autoStatus).toBe('red');
  });

  it('does not let MOIC alone paint the traffic light', () => {
    const withMoic = buildPortfolioRow(makeStartup({ metrics: { moic: 3, runway: 24 } }), 0, settings);
    const withoutMoic = buildPortfolioRow(makeStartup({ metrics: { runway: 24 } }), 0, settings);
    expect(withMoic.autoStatus).toBe(withoutMoic.autoStatus);
  });

  it('is green when enough scored metrics are healthy (Total Score ≥ 0.5)', () => {
    const row = buildPortfolioRow(
      makeStartup({ metrics: { runway: 24, currentRatio: 3, grossMargin: 0.9, ebitdaMargin: 0.3 } }),
      0,
      settings
    );
    expect(row.scores.status).toBe('Healthy');
    expect(row.autoStatus).toBe('green');
  });

  it('is yellow in the "Need attention" band', () => {
    const row = buildPortfolioRow(
      makeStartup({ metrics: { runway: 24, currentRatio: 1.2, grossMargin: 0.5, ebitdaMargin: -0.1 } }),
      0,
      settings
    );
    expect(row.scores.status).toBe('Need attention');
    expect(row.autoStatus).toBe('yellow');
  });

  it('is red when the only present signal scores low', () => {
    const row = buildPortfolioRow(makeStartup({ metrics: { runway: 2 } }), 0, settings);
    expect(row.autoStatus).toBe('red');
  });

  it('stays gray when no scored metric exists', () => {
    const row = buildPortfolioRow(makeStartup({ investmentAmount: 50_000 }), 0, settings);
    expect(row.scores.status).toBeUndefined();
    expect(row.autoStatus).toBe('gray');
  });
});

describe('getMomGrowth — baseline guard', () => {
  it('returns undefined for a non-positive baseline (no inverted growth)', () => {
    const startup = makeStartup({
      metricsHistory: [
        { date: '2026-01', metrics: { mrr: -50 } },
        { date: '2026-02', metrics: { mrr: 50 } },
      ],
    });
    expect(getMomGrowth(startup)).toBeUndefined();
  });

  it('computes MoM from a positive baseline', () => {
    const startup = makeStartup({
      metricsHistory: [
        { date: '2026-01', metrics: { mrr: 100 } },
        { date: '2026-02', metrics: { mrr: 150 } },
      ],
    });
    expect(getMomGrowth(startup)).toBeCloseTo(0.5, 5);
  });
});

describe('staging overlay', () => {
  const baseRow = {
    investedUsd: 50_000,
    investedUzs: 50_000 * 12_700,
    ownership: 0.05,
    name: 'Acme',
  } as unknown as PortfolioRow;

  it('overlays investedUsd and recomputes investedUzs at the fund rate', () => {
    const next = applyStagedToRow(baseRow, { investedUsd: '200000' }, 12_700);
    expect(next.investedUsd).toBe(200_000);
    expect(next.investedUzs).toBe(200_000 * 12_700);
  });

  it('parses an ownership percent into a ratio', () => {
    const next = applyStagedToRow(baseRow, { ownership: '7.5' }, 12_700);
    expect(next.ownership).toBeCloseTo(0.075, 6);
  });

  it('overlays the columns added by the portfolio workbook (segment, cac, churnRate)', () => {
    const next = applyStagedToRow(
      { ...baseRow, segment: 'services' } as unknown as PortfolioRow,
      { segment: 'saas', cac: '1 200', churnRate: '3.5' },
      12_700
    );
    expect(next.segment).toBe('saas');
    expect(next.segmentOverride).toBe('saas');
    expect(next.cac).toBe(1_200);
    expect(next.churnRate).toBeCloseTo(0.035, 6);
  });

  it('ignores an unknown segment value instead of corrupting the row', () => {
    const next = applyStagedToRow(
      { ...baseRow, segment: 'services' } as unknown as PortfolioRow,
      { segment: 'not-a-segment' },
      12_700
    );
    expect(next.segment).toBe('services');
    expect(next.segmentOverride).toBeUndefined();
  });
});

describe('committedCellRaw / parsers', () => {
  it('renders ownership ratio back as a percent string', () => {
    expect(committedCellRaw({ ownership: 0.05 } as PortfolioRow, 'ownership')).toBe('5');
  });

  it('treats a dash name as empty', () => {
    expect(committedCellRaw({ name: '-' } as PortfolioRow, 'name')).toBe('');
  });

  it('safeStagedRatio converts >1 to a fraction, keeps ≤1 as-is', () => {
    expect(safeStagedRatio('12')).toBeCloseTo(0.12, 6);
    expect(safeStagedRatio('0.3')).toBeCloseTo(0.3, 6);
    expect(safeStagedNumber('1 250 000')).toBe(1_250_000);
    expect(safeStagedNumber('')).toBeNull();
  });
});
