type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'blocked' | string;

type StartupAnalysisLike = {
  score?: number | null;
  analysisStatus?: AnalysisStatus | null;
  analysisError?: string | null;
  aiAnalysis?: {
    score?: number | null;
    valuation?: number | null;
    generatedAt?: unknown;
  } | null;
  fundGateScores?: {
    total?: number | null;
  } | null;
  smartValDetails?: {
    method?: string | null;
    final_valuation?: number | null;
    valuation_low?: number | null;
    valuation_high?: number | null;
  } | null;
  aiRecommendations?: {
    overall_comment?: string | null;
    detailed_comment?: string | null;
    recommendation?: string | null;
  } | null;
};

const finiteNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

export function getStartupAnalysisDisplay(startup: StartupAnalysisLike) {
  const status = startup.analysisStatus;
  const isPending = status === 'queued' || status === 'processing';
  const isFailed = status === 'failed';
  const isBlocked = status === 'blocked';
  const rawScore =
    finiteNumber(startup.aiAnalysis?.score) ??
    finiteNumber(startup.fundGateScores?.total) ??
    finiteNumber(startup.score);
  const score = !isPending && !isFailed && !isBlocked && rawScore !== undefined && rawScore > 0
    ? Math.round(rawScore)
    : undefined;
  const hasResultEvidence = Boolean(
    score !== undefined ||
    status === 'completed' ||
    startup.aiAnalysis?.generatedAt ||
    (finiteNumber(startup.fundGateScores?.total) !== undefined && finiteNumber(startup.fundGateScores?.total)! > 0) ||
    startup.smartValDetails?.method ||
    finiteNumber(startup.smartValDetails?.final_valuation) ||
    finiteNumber(startup.smartValDetails?.valuation_low) ||
    finiteNumber(startup.smartValDetails?.valuation_high) ||
    startup.aiRecommendations?.overall_comment ||
    startup.aiRecommendations?.detailed_comment ||
    startup.aiRecommendations?.recommendation
  );

  return {
    status,
    isPending,
    isFailed,
    isBlocked,
    blockReason: isBlocked ? (startup.analysisError ?? undefined) : undefined,
    score,
    hasScore: score !== undefined,
    hasResultEvidence,
    isScoreMissing: !isPending && !isFailed && !isBlocked && hasResultEvidence && score === undefined,
  };
}
