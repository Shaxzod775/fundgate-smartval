import type { PortfolioSegmentThresholds } from './portfolioSegments';

export interface PortfolioScoringInput {
  yoyGrowth?: number;
  qoqGrowth?: number;
  momGrowth?: number;
  grossMargin?: number;
  ebitdaMargin?: number;
  runway?: number;
  runwayInfinite?: boolean;
  currentRatio?: number;
  segmentThresholds?: PortfolioSegmentThresholds;
}

export type PortfolioHealthFlag = 'green' | 'yellow' | 'red';

export interface PortfolioScores {
  yoy?: number;
  qoq?: number;
  mom?: number;
  grossMargin?: number;
  ebitda?: number;
  runway?: number;
  currentRatio?: number;
  total?: number;
  coverage: number;
  availableCount: number;
  status?: PortfolioWorkbookStatus;
  grossMarginStatus?: PortfolioHealthFlag;
  ebitdaMarginStatus?: PortfolioHealthFlag;
  marginStatus?: PortfolioHealthFlag;
}

export type PortfolioWorkbookStatus = 'Strong' | 'Healthy' | 'Need attention' | 'At Risk' | 'Critical';

export const PORTFOLIO_SCORE_DENOMINATOR = 4;

export const PORTFOLIO_SCORE_WEIGHTS = {
  yoy: 0.10,
  qoq: 0.20,
  mom: 0.15,
  grossMargin: 0.15,
  ebitda: 0.10,
  runway: 0.15,
  currentRatio: 0.15,
} as const;

const SCORE_EPSILON = 1e-9;
const meetsThreshold = (value: number, threshold: number): boolean => (
  value >= threshold - SCORE_EPSILON
);
const strictlyExceedsThreshold = (value: number, threshold: number): boolean => (
  value > threshold + SCORE_EPSILON
);
const isAtMostThreshold = (value: number, threshold: number): boolean => (
  value <= threshold + SCORE_EPSILON
);
const normalizeWorkbookTotal = (value: number): number => (
  Math.round(value * 1e12) / 1e12
);

export function classifyPortfolioScore(total?: number): PortfolioWorkbookStatus | undefined {
  if (!isMetric(total)) return undefined;
  if (meetsThreshold(total, 0.80)) return 'Strong';
  if (meetsThreshold(total, 0.50)) return 'Healthy';
  if (meetsThreshold(total, 0.35)) return 'Need attention';
  if (meetsThreshold(total, 0.15)) return 'At Risk';
  return 'Critical';
}

const isMetric = (value: number | undefined): value is number => (
  value != null && Number.isFinite(value)
);

const LEGACY_MARGIN_THRESHOLDS: PortfolioSegmentThresholds = {
  grossMarginGreen: 0.6,
  grossMarginYellow: 0.4,
  ebitdaMarginGreen: 0,
  ebitdaMarginYellow: -0.2,
};

export function classifyHigherIsBetterMargin(
  value: number | undefined,
  greenThreshold: number,
  yellowThreshold: number,
): PortfolioHealthFlag | undefined {
  if (!isMetric(value)) return undefined;
  if (meetsThreshold(value, greenThreshold)) return 'green';
  if (meetsThreshold(value, yellowThreshold)) return 'yellow';
  return 'red';
}

export function classifyLowerIsBetterMetric(
  value: number | undefined,
  greenThreshold: number,
  yellowThreshold: number,
): PortfolioHealthFlag | undefined {
  if (!isMetric(value)) return undefined;
  if (isAtMostThreshold(value, greenThreshold)) return 'green';
  if (isAtMostThreshold(value, Math.max(greenThreshold, yellowThreshold))) return 'yellow';
  return 'red';
}

export function combinePortfolioHealthFlags(
  flags: ReadonlyArray<PortfolioHealthFlag | undefined>,
): PortfolioHealthFlag | undefined {
  const available = flags.filter((flag): flag is PortfolioHealthFlag => flag != null);
  if (available.length === 0) return undefined;
  if (available.includes('red')) return 'red';
  if (available.includes('yellow')) return 'yellow';
  return 'green';
}

export function portfolioScoreStatusToHealthFlag(
  status?: PortfolioWorkbookStatus,
): PortfolioHealthFlag | undefined {
  if (status === 'Strong' || status === 'Healthy') return 'green';
  if (status === 'Need attention') return 'yellow';
  if (status === 'At Risk' || status === 'Critical') return 'red';
  return undefined;
}

export function scoreYoy(value?: number): number | undefined {
  if (!isMetric(value)) return undefined;
  if (strictlyExceedsThreshold(value, 1)) return 5;
  if (meetsThreshold(value, 0.5)) return 4;
  if (meetsThreshold(value, 0.2)) return 3;
  if (meetsThreshold(value, 0)) return 2;
  return -1;
}

export function scoreQoq(value?: number): number | undefined {
  if (!isMetric(value)) return undefined;
  if (strictlyExceedsThreshold(value, 0.5)) return 5;
  if (meetsThreshold(value, 0.25)) return 4;
  if (meetsThreshold(value, 0.1)) return 3;
  if (meetsThreshold(value, 0)) return 2;
  return -1;
}

export function scoreMom(value?: number): number | undefined {
  if (!isMetric(value)) return undefined;
  if (strictlyExceedsThreshold(value, 0.2)) return 5;
  if (meetsThreshold(value, 0.1)) return 4;
  if (meetsThreshold(value, 0.05)) return 3;
  if (meetsThreshold(value, 0)) return 2;
  return -1;
}

export function scoreGrossMargin(
  value?: number,
): number | undefined {
  if (!isMetric(value)) return undefined;
  if (strictlyExceedsThreshold(value, 0.8)) return 5;
  if (meetsThreshold(value, 0.6)) return 4;
  if (meetsThreshold(value, 0.4)) return 3;
  if (meetsThreshold(value, 0.2)) return 2;
  if (!meetsThreshold(value, 0)) return -1;
  return 1;
}

export function scoreEbitdaMargin(
  value?: number,
): number | undefined {
  if (!isMetric(value)) return undefined;
  if (strictlyExceedsThreshold(value, 0.2)) return 5;
  if (meetsThreshold(value, 0)) return 4;
  if (meetsThreshold(value, -0.2)) return 3;
  if (meetsThreshold(value, -0.5)) return 2;
  if (meetsThreshold(value, -0.85)) return 1;
  return -1;
}

export function scoreRunway(value?: number, infinite = false): number | undefined {
  if (infinite) return 5;
  if (!isMetric(value) || !meetsThreshold(value, 0)) return undefined;
  if (strictlyExceedsThreshold(value, 19)) return 5;
  if (meetsThreshold(value, 12)) return 4;
  if (meetsThreshold(value, 6)) return 3;
  if (meetsThreshold(value, 3)) return 2;
  return 1;
}

export function scoreCurrentRatio(value?: number): number | undefined {
  if (value === Number.POSITIVE_INFINITY) return 5;
  if (!isMetric(value) || !meetsThreshold(value, 0)) return undefined;
  if (strictlyExceedsThreshold(value, 2)) return 5;
  if (meetsThreshold(value, 1.5)) return 4;
  if (meetsThreshold(value, 1)) return 3;
  if (meetsThreshold(value, 0.7)) return 2;
  return 1;
}

export function calculatePortfolioScores(input: PortfolioScoringInput): PortfolioScores {
  const marginThresholds = input.segmentThresholds ?? LEGACY_MARGIN_THRESHOLDS;
  const scores = {
    yoy: scoreYoy(input.yoyGrowth),
    qoq: scoreQoq(input.qoqGrowth),
    mom: scoreMom(input.momGrowth),
    grossMargin: scoreGrossMargin(input.grossMargin),
    ebitda: scoreEbitdaMargin(input.ebitdaMargin),
    runway: scoreRunway(input.runway, input.runwayInfinite),
    currentRatio: scoreCurrentRatio(input.currentRatio),
  };
  const grossMarginStatus = classifyHigherIsBetterMargin(
    input.grossMargin,
    marginThresholds.grossMarginGreen,
    marginThresholds.grossMarginYellow,
  );
  const ebitdaMarginStatus = classifyHigherIsBetterMargin(
    input.ebitdaMargin,
    marginThresholds.ebitdaMarginGreen,
    marginThresholds.ebitdaMarginYellow,
  );
  const marginStatus = combinePortfolioHealthFlags([grossMarginStatus, ebitdaMarginStatus]);

  const weightedComponents: Array<{ score?: number; weight: number }> = [
    { score: scores.yoy, weight: PORTFOLIO_SCORE_WEIGHTS.yoy },
    { score: scores.qoq, weight: PORTFOLIO_SCORE_WEIGHTS.qoq },
    { score: scores.mom, weight: PORTFOLIO_SCORE_WEIGHTS.mom },
    { score: scores.grossMargin, weight: PORTFOLIO_SCORE_WEIGHTS.grossMargin },
    { score: scores.ebitda, weight: PORTFOLIO_SCORE_WEIGHTS.ebitda },
    { score: scores.runway, weight: PORTFOLIO_SCORE_WEIGHTS.runway },
    { score: scores.currentRatio, weight: PORTFOLIO_SCORE_WEIGHTS.currentRatio },
  ];
  const available = weightedComponents.filter((component) => component.score != null);
  const coverage = available.reduce((sum, component) => sum + component.weight, 0);
  const availableCount = available.length;
  const total = availableCount > 0
    ? normalizeWorkbookTotal(weightedComponents.reduce(
      (sum, component) => sum + (
        ((component.score ?? 0) / PORTFOLIO_SCORE_DENOMINATOR) * component.weight
      ),
      0,
    ))
    : undefined;

  return {
    ...scores,
    total,
    coverage,
    availableCount,
    status: classifyPortfolioScore(total),
    grossMarginStatus,
    ebitdaMarginStatus,
    marginStatus,
  };
}
