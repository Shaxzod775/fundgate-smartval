import i18n from '../i18n';

const PLAIN_LABELS: Record<string, string> = {
  'metrics.arr': 'ARR',
  'metrics.mrr': 'MRR',
  'metrics.gmv': 'GMV',
  'metrics.arpu': 'ARPU',
  'metrics.ltv': 'LTV',
  'metrics.cac': 'CAC',
  'metrics.burnRate': 'Burn rate',
  'metrics.churnRate': 'Churn rate',
  'metrics.runway': 'Runway',
};

const LABEL_IDS: Record<string, string> = {
  'brief.companyName': 'companyName',
  'brief.name': 'companyName',
  'brief.industry': 'industry',
  'brief.sector': 'sector',
  'brief.stage': 'stage',
  'brief.country': 'country',
  'brief.city': 'city',
  'brief.website': 'website',
  'brief.description': 'description',
  'brief.shortDescription': 'shortDescription',
  'brief.problem': 'problem',
  'brief.solution': 'solution',
  'brief.fundingRequest': 'itpvFundingRequest',
  'brief.itpvFundingRequest': 'itpvFundingRequest',
  'brief.totalRoundSize': 'totalRoundSize',
  'brief.valuation': 'valuation',
  'brief.teamSize': 'teamSize',
  'brief.foundedAt': 'foundedAt',

  portfolioType: 'portfolioType',
  investmentAmount: 'investmentAmount',
  fundConsiderationAmount: 'fundConsiderationAmount',
  valuationType: 'valuationType',
  sourceDate: 'sourceDate',
  'metrics.grossMargin': 'grossMargin',
  'metrics.momGrowth': 'momGrowth',
  'metrics.lastValuation': 'lastValuation',

  'formData.stepA.companyName': 'companyName',
  'formData.stepA.industry': 'industry',
  'formData.stepA.stage': 'stage',
  'formData.stepA.country': 'country',
  'formData.stepA.city': 'city',
  'formData.stepA.website': 'website',
  'formData.stepA.description': 'description',

  'formData.stepB.teamSize': 'teamSize',
  'formData.stepB.founders': 'founders',
  'formData.stepB.traction': 'traction',
  'formData.stepB.revenue': 'revenue',

  'formData.stepC.fundingRequest': 'itpvFundingRequest',
  'formData.stepC.valuation': 'valuation',
  'formData.stepC.useOfFunds': 'useOfFunds',

  status: 'status',
  stage: 'stage',
  industry: 'industry',
  companyName: 'companyName',
  description: 'description',
  website: 'website',
  fundingRequest: 'itpvFundingRequest',
  itpvFundingRequest: 'itpvFundingRequest',
  totalRoundSize: 'totalRoundSize',
  valuation: 'valuation',
};

const LABEL_DEFAULTS: Record<string, string> = {
  companyName: 'Company name',
  industry: 'Industry',
  sector: 'Sector',
  stage: 'Stage',
  country: 'Country',
  city: 'City',
  website: 'Website',
  description: 'Description',
  shortDescription: 'Short description',
  problem: 'Problem',
  solution: 'Solution',
  itpvFundingRequest: 'ITPV funding request',
  totalRoundSize: 'Total round size',
  valuation: 'Valuation',
  teamSize: 'Team size',
  foundedAt: 'Founded on',
  portfolioType: 'Participation type',
  investmentAmount: 'Investment amount',
  fundConsiderationAmount: 'Amount considered by the fund',
  valuationType: 'Valuation type',
  sourceDate: 'Entry date',
  grossMargin: 'Gross margin',
  momGrowth: 'MoM growth',
  lastValuation: 'Current valuation',
  founders: 'Founders',
  traction: 'Traction',
  revenue: 'Revenue',
  useOfFunds: 'Use of funds',
  status: 'Status',
};

export function fieldLabel(field: string): string {
  const plain = PLAIN_LABELS[field];
  if (plain) return plain;

  const id = LABEL_IDS[field];
  if (!id) return field;

  return i18n.t(`fieldLabels.${id}`, LABEL_DEFAULTS[id] ?? field);
}

const MAX_VALUE_LENGTH = 60;

export function formatValue(v: unknown): string {
  if (v == null) return '∅';
  const raw = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (raw.length > MAX_VALUE_LENGTH) {
    return raw.slice(0, MAX_VALUE_LENGTH) + '…';
  }
  return raw;
}
