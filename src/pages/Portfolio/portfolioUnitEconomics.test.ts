import { describe, expect, it } from 'vitest';
import type { Startup } from '../../types';
import {
  parsePortfolioMetricNumber,
  resolveStartupUnitEconomics,
} from './portfolioUnitEconomics';

function startup(value: Partial<Startup>): Startup {
  return {
    id: 'startup-1',
    brief: {
      companyName: 'Unit Economics Co',
      industry: 'SaaS',
      description: '',
      stage: 'seed',
      foundedYear: 2024,
      teamSize: 5,
      fundingRequest: 0,
      useOfFunds: '',
      ...(value.brief || {}),
    },
    status: 'portfolio',
    source: 'manual',
    organizationId: 'org-1',
    ...value,
  } as Startup;
}

describe('portfolio unit economics', () => {
  it('uses CAC from the backend application brief and derives LTV/CAC', () => {
    const result = resolveStartupUnitEconomics(startup({
      brief: {
        customerAcquisitionCost: 120,
      } as Startup['brief'],
      metrics: { ltv: 600 },
    }));

    expect(result).toEqual({
      cac: 120,
      ltv: 600,
      ltvCac: 5,
      ltvCacDerived: true,
    });
  });

  it('accepts backend aliases and prefers an explicitly stored ratio', () => {
    const result = resolveStartupUnitEconomics(startup({
      metrics: {
        cac: 0,
        ltv: 900,
        ltvCac: '3:1',
      } as never,
    }));

    expect(result.cac).toBe(0);
    expect(result.ltvCac).toBe(3);
    expect(result.ltvCacDerived).toBe(false);
  });

  it('does not divide by zero and parses formatted currency values', () => {
    expect(resolveStartupUnitEconomics(startup({
      metrics: { cac: 0, ltv: 900 },
    })).ltvCac).toBeUndefined();
    expect(parsePortfolioMetricNumber('$1,200')).toBe(1200);
    expect(parsePortfolioMetricNumber('1 200,50 USD')).toBe(1200.5);
  });
});
