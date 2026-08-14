import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTFOLIO_COLUMN_ORDER,
  DEFAULT_PORTFOLIO_COLUMN_PREFERENCES,
  PORTFOLIO_COLUMN_DEFINITIONS,
  calculatePortfolioColumnsWidth,
  calculateVisiblePortfolioColumnsWidth,
  getVisiblePortfolioColumnIds,
  normalizePortfolioColumnPreferences,
} from './portfolioColumns';

describe('portfolio column preferences', () => {
  it('defines 44 unique columns with startup name first and row number second', () => {
    expect(PORTFOLIO_COLUMN_DEFINITIONS).toHaveLength(44);
    expect(new Set(DEFAULT_PORTFOLIO_COLUMN_ORDER).size).toBe(44);
    expect(DEFAULT_PORTFOLIO_COLUMN_ORDER.slice(0, 2)).toEqual(['name', 'rowNumber']);
    expect(DEFAULT_PORTFOLIO_COLUMN_PREFERENCES.hiddenColumnIds).toEqual([]);
  });

  it('removes unknown and duplicate IDs, locks name first, and appends missing columns', () => {
    const normalized = normalizePortfolioColumnPreferences({
      version: 999,
      columnOrder: ['moic', 'unknown', 'moic', 'name', 'status'],
      hiddenColumnIds: ['name', 'status', 'unknown', 'status'],
    });

    expect(normalized.version).toBe(1);
    expect(normalized.columnOrder.slice(0, 4)).toEqual([
      'name',
      'moic',
      'status',
      'rowNumber',
    ]);
    expect(normalized.columnOrder).toHaveLength(44);
    expect(new Set(normalized.columnOrder).size).toBe(44);
    expect(normalized.hiddenColumnIds).toEqual(['status']);
  });

  it('uses defaults for malformed or absent preferences', () => {
    expect(normalizePortfolioColumnPreferences(null)).toEqual(
      DEFAULT_PORTFOLIO_COLUMN_PREFERENCES,
    );
    expect(normalizePortfolioColumnPreferences({
      columnOrder: 'name',
      hiddenColumnIds: 5,
    })).toEqual(DEFAULT_PORTFOLIO_COLUMN_PREFERENCES);
  });

  it('returns visible columns in the customized order', () => {
    const visible = getVisiblePortfolioColumnIds({
      columnOrder: ['status', 'name', 'industry'],
      hiddenColumnIds: ['industry', 'rowNumber'],
    });

    expect(visible.slice(0, 3)).toEqual(['name', 'status', 'segment']);
    expect(visible).not.toContain('industry');
    expect(visible).not.toContain('rowNumber');
  });

  it('calculates widths for arbitrary and visible column sets', () => {
    expect(calculatePortfolioColumnsWidth(['name', 'rowNumber', 'moic'])).toBe(305);
    expect(calculateVisiblePortfolioColumnsWidth({
      columnOrder: ['moic'],
      hiddenColumnIds: DEFAULT_PORTFOLIO_COLUMN_ORDER.filter((id) => (
        id !== 'name' && id !== 'moic'
      )),
    })).toBe(255);
  });
});
