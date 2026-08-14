function numericRatioValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().replace(/[%\s]/g, '').replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseStoredPortfolioRatio(value: unknown): number | undefined {
  return numericRatioValue(value);
}

export function parseLegacyPortfolioRatio(value: unknown): number | undefined {
  const numeric = numericRatioValue(value);
  if (numeric == null) return undefined;
  const explicitlyPercent = typeof value === 'string' && value.includes('%');
  return explicitlyPercent || Math.abs(numeric) > 1 ? numeric / 100 : numeric;
}

export function firstStoredPortfolioRatio(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parseStoredPortfolioRatio(value);
    if (parsed != null) return parsed;
  }
  return undefined;
}
