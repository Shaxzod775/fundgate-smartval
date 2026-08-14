import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS,
  PORTFOLIO_SEGMENTS,
  classifyPortfolioSegment,
  getPortfolioSegmentFilter,
  getPortfolioSegmentLabel,
  normalizePortfolioSegmentThresholds,
} from './portfolioSegments';

describe('portfolio segment filter', () => {
  it.each([
    ['', 'all'],
    ['?segment=saas', 'saas'],
    ['?view=table&segment=marketplace', 'marketplace'],
    ['?segment=unknown', 'all'],
  ] as const)('parses %s as %s', (search, expected) => {
    expect(getPortfolioSegmentFilter(search)).toBe(expected);
  });
});

describe('portfolio segment thresholds', () => {
  it('uses only canonical scoring segments and excludes an all pseudo-segment', () => {
    expect(PORTFOLIO_SEGMENTS).toEqual([
      'marketplace',
      'fintech',
      'saas',
      'ecommerce',
      'services',
      'hardware',
      'other',
    ]);
    expect(PORTFOLIO_SEGMENTS).not.toContain('all');
  });

  it('keeps marketplace and SaaS gross-margin expectations distinct', () => {
    expect(DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.marketplace.grossMarginGreen).toBe(0.25);
    expect(DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.saas.grossMarginGreen).toBe(0.7);
  });

  it('fills missing segments and merges partial settings without mutating defaults', () => {
    const normalized = normalizePortfolioSegmentThresholds({
      marketplace: { grossMarginGreen: 0.3 },
      saas: { ebitdaMarginYellow: -0.25 },
    });

    expect(normalized.marketplace).toMatchObject({
      grossMarginGreen: 0.3,
      grossMarginYellow: 0.15,
    });
    expect(normalized.saas.ebitdaMarginYellow).toBe(-0.25);
    expect(normalized.hardware).toEqual(DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.hardware);

    normalized.marketplace.grossMarginGreen = 0.99;
    expect(DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS.marketplace.grossMarginGreen).toBe(0.25);
  });

  it('normalizes legacy global, all, nested and display-percent settings', () => {
    const normalized = normalizePortfolioSegmentThresholds({
      grossMarginYellow: '10',
      all: { ebitdaMarginGreen: '5' },
      segmentThresholds: {
        all: { ebitdaMarginYellow: '-20' },
        marketplace: { grossMarginGreen: '30,0' },
      },
    });

    expect(normalized.marketplace).toEqual({
      grossMarginGreen: 0.3,
      grossMarginYellow: 0.1,
      ebitdaMarginGreen: 0.05,
      ebitdaMarginYellow: -0.2,
    });
    expect(normalized.fintech.grossMarginYellow).toBe(0.1);
    expect(normalized.fintech.ebitdaMarginGreen).toBe(0.05);
    expect(normalizePortfolioSegmentThresholds({
      all: { grossMarginYellow: '1' },
    }).fintech.grossMarginYellow).toBe(0.01);
    expect(normalized).not.toHaveProperty('all');
  });

  it('preserves modern numeric ratios outside the legacy percentage range', () => {
    const normalized = normalizePortfolioSegmentThresholds({
      marketplace: {
        ebitdaMarginGreen: -1.1,
        ebitdaMarginYellow: -1.5,
      },
    });

    expect(normalized.marketplace.ebitdaMarginGreen).toBe(-1.1);
    expect(normalized.marketplace.ebitdaMarginYellow).toBe(-1.5);
  });

  it('keeps green thresholds at or above yellow thresholds', () => {
    const normalized = normalizePortfolioSegmentThresholds({
      segments: {
        services: {
          grossMarginGreen: 0.1,
          grossMarginYellow: 0.3,
          ebitdaMarginGreen: -0.2,
          ebitdaMarginYellow: 0,
        },
      },
    });

    expect(normalized.services).toMatchObject({
      grossMarginGreen: 0.3,
      grossMarginYellow: 0.1,
      ebitdaMarginGreen: 0,
      ebitdaMarginYellow: -0.2,
    });
  });
});

describe('portfolio segment classification', () => {
  it.each([
    [{ industry: 'FinTech' }, 'fintech'],
    [{ businessModel: 'B2B SaaS subscription' }, 'saas'],
    [{ valueDeliveryModel: 'Two-sided marketplace' }, 'marketplace'],
    [{ description: 'Online retail and e-commerce store' }, 'ecommerce'],
    [{ tags: ['consulting', 'outsourcing'] }, 'services'],
    [{ tags: ['IoT', 'hardware devices'] }, 'hardware'],
    [{ industry: 'HealthTech', description: 'Clinical research platform' }, 'other'],
  ] as const)('classifies %o as %s', (input, expected) => {
    expect(classifyPortfolioSegment(input)).toBe(expected);
  });

  it('prioritizes explicit and unit-economics fields deterministically', () => {
    expect(classifyPortfolioSegment({
      explicitSegment: 'hardware',
      businessModel: 'SaaS marketplace',
    })).toBe('hardware');

    expect(classifyPortfolioSegment({
      industry: 'FinTech',
      businessModel: 'SaaS marketplace for banking teams',
    })).toBe('marketplace');

    expect(classifyPortfolioSegment({
      industry: 'FinTech',
      valueDeliveryModel: 'Marketplace for payment providers',
    })).toBe('marketplace');

    expect(classifyPortfolioSegment({
      industry: 'FinTech',
      businessModel: 'B2B SaaS',
      description: 'Analytics for marketplace sellers and payment teams',
    })).toBe('saas');

    expect(classifyPortfolioSegment({
      industry: 'E-commerce',
      description: 'Online store with integrated payments',
    })).toBe('ecommerce');
  });

  it('recognizes Russian classification text', () => {
    expect(classifyPortfolioSegment({
      description: 'Маркетплейс и агрегатор услуг для малого бизнеса',
    })).toBe('marketplace');
  });

  it('returns stable display labels', () => {
    expect(getPortfolioSegmentLabel('marketplace')).toBe('Marketplace');
    expect(getPortfolioSegmentLabel('fintech')).toBe('FinTech');
    expect(getPortfolioSegmentLabel('saas')).toBe('SaaS');
    expect(getPortfolioSegmentLabel('other')).toBe('Other');
  });
});
