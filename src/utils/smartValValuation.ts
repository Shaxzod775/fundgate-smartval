import type { SmartValDetails } from '../types';
import { numberLocale } from './formatNumber';

type UnknownRecord = Record<string, unknown>;

export interface SmartValValuation {
  low?: number;
  high?: number;
  final?: number;
}

const asRecord = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
);

const positiveNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const number = positiveNumber(value);
    if (number !== undefined) return number;
  }
  return undefined;
};

const sourceRecords = (sources: unknown[]): UnknownRecord[] => sources.flatMap((source) => {
  const root = asRecord(source);
  return [root, asRecord(root.result), asRecord(root.aiAnalysis), asRecord(root.ai_analysis)];
});

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

export function resolveSmartValValuation(...sources: unknown[]): SmartValValuation {
  const records = sourceRecords(sources);

  const ranges = records.map((record) => asRecord(
    record.valuation_range || record.valuationRange || record.range
  ));

  const low = firstNumber(
    ...records.flatMap((record, index) => [
      record.valuation_low,
      record.valuationLow,
      ranges[index].low,
      ranges[index].min,
    ])
  );
  const high = firstNumber(
    ...records.flatMap((record, index) => [
      record.valuation_high,
      record.valuationHigh,
      ranges[index].high,
      ranges[index].max,
    ])
  );
  const final = firstNumber(
    ...records.flatMap((record) => [
      record.final_valuation,
      record.finalValuation,
      record.valuation,
      record.total_berkus_score,
    ])
  );

  return { low, high, final };
}

export function normalizeSmartValDetails(...sources: unknown[]): SmartValDetails | undefined {
  const records = sourceRecords(sources);
  const valuation = resolveSmartValValuation(...sources);
  const method = firstString(...records.flatMap((record) => [
    record.method,
    record.valuation_method,
    record.valuationMethod,
  ]));
  const confidenceScore = firstNumber(...records.flatMap((record) => [
    record.confidence_score,
    record.confidenceScore,
  ]));
  const breakdown = records
    .map((record) => asRecord(record.breakdown))
    .find((value) => Object.keys(value).length > 0) as SmartValDetails['breakdown'] | undefined;
  const recommendations = records
    .map((record) => record.recommendations)
    .find((value): value is string[] => Array.isArray(value));

  const normalized: SmartValDetails = {};
  if (method) normalized.method = method;
  if (confidenceScore !== undefined) normalized.confidence_score = confidenceScore;
  if (breakdown) normalized.breakdown = breakdown;
  if (recommendations) normalized.recommendations = recommendations;
  if (valuation.final !== undefined) normalized.final_valuation = valuation.final;
  if (valuation.low !== undefined) normalized.valuation_low = valuation.low;
  if (valuation.high !== undefined) normalized.valuation_high = valuation.high;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function formatSmartValAmount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(millions >= 10 || Number.isInteger(millions) ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands.toFixed(thousands >= 100 || Number.isInteger(thousands) ? 0 : 1)}K`;
  }
  return `$${Math.round(value).toLocaleString(numberLocale())}`;
}

export function formatSmartValValuation(...sources: unknown[]): string {
  const valuation = resolveSmartValValuation(...sources);
  if (valuation.low && valuation.high) {
    return `${formatSmartValAmount(valuation.low)} – ${formatSmartValAmount(valuation.high)}`;
  }
  return valuation.final ? formatSmartValAmount(valuation.final) : '';
}
