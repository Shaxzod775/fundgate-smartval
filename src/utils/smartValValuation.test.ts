import { describe, expect, it } from 'vitest';
import {
  formatSmartValValuation,
  normalizeSmartValDetails,
  resolveSmartValValuation,
} from './smartValValuation';

describe('SmartVal valuation display', () => {
  it('shows the stored valuation range instead of the point estimate', () => {
    const source = {
      final_valuation: 525_000,
      valuation_low: 500_000,
      valuation_high: 550_000,
    };

    expect(resolveSmartValValuation(source)).toEqual({
      low: 500_000,
      high: 550_000,
      final: 525_000,
    });
    expect(formatSmartValValuation(source)).toBe('$500K – $550K');
  });

  it('reads nested and camel-case range variants', () => {
    expect(formatSmartValValuation({
      result: {
        valuationRange: { low: 1_200_000, high: 1_800_000 },
      },
    })).toBe('$1.2M – $1.8M');
  });

  it('falls back to a point estimate when no range exists', () => {
    expect(formatSmartValValuation({ finalValuation: 2_000_000 })).toBe('$2M');
  });

  it('hydrates a range saved in the raw SmartVal result', () => {
    const normalized = normalizeSmartValDetails(
      {
        method: 'berkus',
        final_valuation: 400_000,
        confidence_score: 80,
      },
      {
        method: 'berkus',
        result: {
          final_valuation: 400_000,
          valuation_low: 390_000,
          valuation_high: 410_000,
        },
      },
    );

    expect(normalized).toEqual({
      method: 'berkus',
      confidence_score: 80,
      final_valuation: 400_000,
      valuation_low: 390_000,
      valuation_high: 410_000,
    });
    expect(formatSmartValValuation(normalized)).toBe('$390K – $410K');
  });
});
