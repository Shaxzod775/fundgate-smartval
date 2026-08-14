import type { Startup } from '../../types';

type MetricRecord = Record<string, unknown>;

export interface PortfolioUnitEconomics {
  cac?: number;
  ltv?: number;
  ltvCac?: number;
  ltvCacDerived: boolean;
}

function asMetricRecord(value: unknown): MetricRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as MetricRecord
    : {};
}

export function parsePortfolioMetricNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string') return undefined;

  const compact = value.trim().replace(/\s+/g, '');
  if (!compact) return undefined;

  let numeric = compact.replace(/[^\d,.\-]/g, '');
  if (!numeric || numeric === '-') return undefined;

  const commaIndex = numeric.lastIndexOf(',');
  const dotIndex = numeric.lastIndexOf('.');
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalIndex = Math.max(commaIndex, dotIndex);
    numeric = `${numeric.slice(0, decimalIndex).replace(/[,.]/g, '')}.${numeric.slice(decimalIndex + 1)}`;
  } else if (commaIndex >= 0) {
    const commaDigits = numeric.length - commaIndex - 1;
    numeric = commaDigits === 3 && commaIndex > 0
      ? numeric.replace(/,/g, '')
      : numeric.replace(',', '.');
  } else if ((numeric.match(/\./g) || []).length > 1) {
    numeric = numeric.replace(/\./g, '');
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStoredRatio(value: unknown): number | undefined {
  if (typeof value === 'string') {
    const ratioMatch = value.trim().match(/^(-?[\d\s.,]+)\s*(?::\s*1|[xх×])/i);
    if (ratioMatch) return parsePortfolioMetricNumber(ratioMatch[1]);
  }
  return parsePortfolioMetricNumber(value);
}

function firstMetricNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parsePortfolioMetricNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function firstStoredRatio(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parseStoredRatio(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

export function resolveStartupUnitEconomics(
  startup: Startup,
  metricsOverride?: MetricRecord,
): PortfolioUnitEconomics {
  const metrics = asMetricRecord(metricsOverride);
  const storedMetrics = asMetricRecord(startup.metrics);
  const brief = asMetricRecord(startup.brief);
  const root = asMetricRecord(startup);

  const cac = firstMetricNumber(
    metrics.cac,
    metrics.customerAcquisitionCost,
    storedMetrics.cac,
    storedMetrics.customerAcquisitionCost,
    brief.customerAcquisitionCost,
    brief.cac,
    root.customerAcquisitionCost,
    root.cac,
  );
  const ltv = firstMetricNumber(
    metrics.ltv,
    metrics.lifetimeValue,
    storedMetrics.ltv,
    storedMetrics.lifetimeValue,
    brief.ltv,
    brief.lifetimeValue,
    root.ltv,
    root.lifetimeValue,
  );
  const storedLtvCac = firstStoredRatio(
    metrics.ltvToCac,
    metrics.ltvCac,
    storedMetrics.ltvToCac,
    storedMetrics.ltvCac,
    brief.ltvToCac,
    brief.ltvCac,
    root.ltvToCac,
    root.ltvCac,
  );

  if (storedLtvCac !== undefined) {
    return { cac, ltv, ltvCac: storedLtvCac, ltvCacDerived: false };
  }
  if (ltv !== undefined && cac !== undefined && cac > 0) {
    return { cac, ltv, ltvCac: ltv / cac, ltvCacDerived: true };
  }
  return { cac, ltv, ltvCacDerived: false };
}
