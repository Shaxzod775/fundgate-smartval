export const PORTFOLIO_SEGMENTS = [
  'marketplace',
  'fintech',
  'saas',
  'ecommerce',
  'services',
  'hardware',
  'other',
] as const;

export type PortfolioSegment = (typeof PORTFOLIO_SEGMENTS)[number];
export type PortfolioSegmentFilter = 'all' | PortfolioSegment;

export function getPortfolioSegmentFilter(search: string): PortfolioSegmentFilter {
  const segment = new URLSearchParams(search).get('segment');
  return PORTFOLIO_SEGMENTS.includes(segment as PortfolioSegment)
    ? segment as PortfolioSegment
    : 'all';
}

export interface PortfolioSegmentThresholds {
  grossMarginGreen: number;
  grossMarginYellow: number;
  ebitdaMarginGreen: number;
  ebitdaMarginYellow: number;
}

export type PortfolioSegmentThresholdSettings = Record<
  PortfolioSegment,
  PortfolioSegmentThresholds
>;

export type PortfolioSegmentThresholdSettingsPatch = Partial<
  Record<PortfolioSegment, Partial<PortfolioSegmentThresholds>>
>;

export interface PortfolioSegmentClassificationInput {
  explicitSegment?: string | null;
  industry?: string | null;
  businessModel?: string | readonly string[] | null;
  valueDeliveryModel?: string | readonly string[] | null;
  description?: string | null;
  tags?: readonly string[] | null;
}

export const DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS: Readonly<
  PortfolioSegmentThresholdSettings
> = {
  marketplace: {
    grossMarginGreen: 0.25,
    grossMarginYellow: 0.15,
    ebitdaMarginGreen: 0.05,
    ebitdaMarginYellow: -0.15,
  },
  fintech: {
    grossMarginGreen: 0.5,
    grossMarginYellow: 0.3,
    ebitdaMarginGreen: 0.1,
    ebitdaMarginYellow: -0.1,
  },
  saas: {
    grossMarginGreen: 0.7,
    grossMarginYellow: 0.5,
    ebitdaMarginGreen: 0.1,
    ebitdaMarginYellow: -0.2,
  },
  ecommerce: {
    grossMarginGreen: 0.35,
    grossMarginYellow: 0.2,
    ebitdaMarginGreen: 0.05,
    ebitdaMarginYellow: -0.1,
  },
  services: {
    grossMarginGreen: 0.45,
    grossMarginYellow: 0.25,
    ebitdaMarginGreen: 0.1,
    ebitdaMarginYellow: 0,
  },
  hardware: {
    grossMarginGreen: 0.4,
    grossMarginYellow: 0.2,
    ebitdaMarginGreen: 0.05,
    ebitdaMarginYellow: -0.1,
  },
  other: {
    grossMarginGreen: 0.4,
    grossMarginYellow: 0.2,
    ebitdaMarginGreen: 0,
    ebitdaMarginYellow: -0.2,
  },
};

const PORTFOLIO_SEGMENT_LABELS: Record<PortfolioSegment, string> = {
  marketplace: 'Marketplace',
  fintech: 'FinTech',
  saas: 'SaaS',
  ecommerce: 'E-commerce',
  services: 'Services',
  hardware: 'Hardware',
  other: 'Other',
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRatio(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const parsed = Number(value.trim().replace('%', '').replace(',', '.'));
  if (!Number.isFinite(parsed)) return undefined;
  return parsed / 100;
}

function mergeThresholdRecord(
  target: PortfolioSegmentThresholds,
  source: unknown,
): PortfolioSegmentThresholds {
  if (!isRecord(source)) return target;

  return {
    grossMarginGreen: toRatio(source.grossMarginGreen) ?? target.grossMarginGreen,
    grossMarginYellow: toRatio(source.grossMarginYellow) ?? target.grossMarginYellow,
    ebitdaMarginGreen: toRatio(source.ebitdaMarginGreen) ?? target.ebitdaMarginGreen,
    ebitdaMarginYellow: toRatio(source.ebitdaMarginYellow) ?? target.ebitdaMarginYellow,
  };
}

function orderThresholds(value: PortfolioSegmentThresholds): PortfolioSegmentThresholds {
  return {
    grossMarginGreen: Math.max(value.grossMarginGreen, value.grossMarginYellow),
    grossMarginYellow: Math.min(value.grossMarginGreen, value.grossMarginYellow),
    ebitdaMarginGreen: Math.max(value.ebitdaMarginGreen, value.ebitdaMarginYellow),
    ebitdaMarginYellow: Math.min(value.ebitdaMarginGreen, value.ebitdaMarginYellow),
  };
}

export function normalizePortfolioSegmentThresholds(
  value: unknown,
): PortfolioSegmentThresholdSettings {
  const root = isRecord(value) ? value : {};
  const containers = [
    root,
    root.segments,
    root.segmentThresholds,
    root.portfolioSegmentThresholds,
  ].filter(isRecord);

  const normalized = {} as PortfolioSegmentThresholdSettings;

  PORTFOLIO_SEGMENTS.forEach((segment) => {
    let thresholds = { ...DEFAULT_PORTFOLIO_SEGMENT_THRESHOLDS[segment] };

    containers.forEach((container) => {
      thresholds = mergeThresholdRecord(thresholds, container);
      thresholds = mergeThresholdRecord(thresholds, container.all);
    });

    containers.forEach((container) => {
      thresholds = mergeThresholdRecord(thresholds, container[segment]);
    });

    normalized[segment] = orderThresholds(thresholds);
  });

  return normalized;
}

function textValue(value: string | readonly string[] | null | undefined): string {
  if (Array.isArray(value)) return value.join(' ');
  return typeof value === 'string' ? value : '';
}

function normalizeClassificationText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en');
}

const SEGMENT_PATTERNS: ReadonlyArray<{
  segment: Exclude<PortfolioSegment, 'other'>;
  pattern: RegExp;
}> = [
  {
    segment: 'marketplace',
    pattern: /\bmarket[\s-]?place\b|two[\s-]+sided[\s-]+platform|маркетплейс|двусторонн\w*\s+платформ|агрегатор/i,
  },
  {
    segment: 'saas',
    pattern: /\bsaas\b|software[\s-]+as[\s-]+a[\s-]+service|cloud[\s-]+software|subscription[\s-]+software|программ\w*\s+по\s+подписк/i,
  },
  {
    segment: 'fintech',
    pattern: /\bfin[\s-]?tech\b|financial[\s-]+technolog|\bpayments?\b|\bbanking\b|\bneobank\b|\blending\b|\binsurtech\b|\bwealthtech\b|\bregtech\b|\bcrypto\b|финтех|плат[её]ж|необанк|кредитован|страхов/i,
  },
  {
    segment: 'ecommerce',
    pattern: /\be[\s-]?commerce\b|online[\s-]+retail|online[\s-]+store|internet[\s-]+shop|электронн\w*\s+коммерц|интернет[\s-]*магазин|онлайн[\s-]*магазин/i,
  },
  {
    segment: 'services',
    pattern: /\bprofessional[\s-]+services?\b|\bservice[\s-]+business\b|\bconsult(?:ing|ancy)?\b|\boutsourc\w*\b|\bagency\b|профессиональн\w*\s+услуг|консалт|аутсорс|агентств/i,
  },
  {
    segment: 'hardware',
    pattern: /\bhardware\b|\biot\b|\bdevices?\b|\bmanufactur\w*\b|\brobotics?\b|\bsensors?\b|\belectronics?\b|оборудован|устройств|производств|робототех|датчик/i,
  },
];

export function classifyPortfolioSegment(
  input: PortfolioSegmentClassificationInput,
): PortfolioSegment {
  const explicitSegment = input.explicitSegment?.trim().toLocaleLowerCase('en');
  if (explicitSegment && PORTFOLIO_SEGMENTS.includes(explicitSegment as PortfolioSegment)) {
    return explicitSegment as PortfolioSegment;
  }

  const classificationSources = [
    textValue(input.valueDeliveryModel),
    textValue(input.businessModel),
    input.industry ?? '',
    textValue(input.tags),
    input.description ?? '',
  ];

  for (const source of classificationSources) {
    const text = normalizeClassificationText(source);
    const match = SEGMENT_PATTERNS.find(({ pattern }) => pattern.test(text));
    if (match) return match.segment;
  }
  return 'other';
}

export function getPortfolioSegmentLabel(segment: PortfolioSegment): string {
  return PORTFOLIO_SEGMENT_LABELS[segment];
}
