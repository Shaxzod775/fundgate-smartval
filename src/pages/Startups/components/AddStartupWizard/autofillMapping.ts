import {
  BUSINESS_MODELS,
  COUNTRIES_EN,
  FOUNDER_ROLES,
  INDUSTRIES,
  STAGES,
} from './constants';
import type { StepAData, StepBData, StepCData, TeamMember } from './types';

export interface AutofillDraft {
  stepA?: Record<string, unknown>;
  stepB?: Record<string, unknown>;
  stepC?: Record<string, unknown>;
  fieldMeta?: Record<string, unknown>;
  missingFields?: string[];
  warnings?: string[];
  slideCount?: number;
}

export interface MappedAutofill {
  stepA: Partial<StepAData>;
  stepB: Partial<StepBData>;
  stepC: Partial<StepCData>;
  filledCount: number;
}

const STAGE_MAP: Record<string, string> = {
  'идея': 'Idea',
  'idea': 'Idea',
  'прототип': 'Prototype',
  'prototype': 'Prototype',
  'mvp готов': 'MVP',
  'mvp': 'MVP',
  'есть первые клиенты': 'Seed',
  'first clients': 'Seed',
  'pre-seed': 'Pre-Seed',
  'seed': 'Seed',
  'растущий бизнес': 'Growth',
  'growth': 'Growth',
  'series a': 'Series A',
  'series b': 'Series B',
  'series c': 'Series C',
};

const ISO_TO_COUNTRY: Record<string, string> = {
  UZ: 'Uzbekistan', RU: 'Russia', KZ: 'Kazakhstan', KG: 'Kyrgyzstan',
  TJ: 'Tajikistan', TM: 'Turkmenistan', AZ: 'Azerbaijan', AM: 'Armenia',
  GE: 'Georgia', BY: 'Belarus', UA: 'Ukraine', MD: 'Moldova',
  US: 'USA', GB: 'UK', AE: 'UAE', TR: 'Turkey', DE: 'Germany',
  FR: 'France', IN: 'India', CN: 'China', SG: 'Singapore', KR: 'South Korea',
  SA: 'Saudi Arabia', IL: 'Israel', PL: 'Poland', NL: 'Netherlands',
  ES: 'Spain', IT: 'Italy', JP: 'Japan', CA: 'Canada', BR: 'Brazil',
};

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const MAGNITUDE: Array<[RegExp, number]> = [
  [/(млрд|миллиард|billion|bn|b)\.?$/i, 1e9],
  [/(млн|миллион|million|mln|mn|m)\.?$/i, 1e6],
  [/(тыс|тысяч|thousand|k|к)\.?$/i, 1e3],
];

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0 ? v : undefined;
  if (typeof v !== 'string') return undefined;
  const raw = v.trim();
  if (!raw) return undefined;
  let multiplier = 1;
  for (const [re, mult] of MAGNITUDE) {
    if (re.test(raw)) { multiplier = mult; break; }
  }
  let core = raw.replace(/[^\d.,-]/g, '');
  if (core.includes(',') && core.includes('.')) {
    core = core.replace(/,/g, '');
  } else if (core.includes(',')) {
    const lastGroup = core.split(',').pop() ?? '';
    core = lastGroup.length <= 2
      ? core.replace(/,(?=[^,]*$)/, '.').replace(/,/g, '')
      : core.replace(/,/g, '');
  }
  const n = Number(core);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return n * multiplier;
};
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

export function normalizeStage(raw: unknown): string {
  const value = str(raw);
  if (!value) return '';
  const direct = STAGES.find(s => s.value.toLowerCase() === value.toLowerCase());
  if (direct) return direct.value;
  return STAGE_MAP[value.toLowerCase()] || '';
}

export function normalizeIndustry(raw: unknown): string {
  const value = str(raw);
  if (!value) return '';
  const lower = value.toLowerCase();
  const exact = INDUSTRIES.find(i => i.toLowerCase() === lower);
  if (exact) return exact;
  const partial = INDUSTRIES.find(
    i => i.toLowerCase().startsWith(lower) || i.toLowerCase().includes(lower) || lower.includes(i.toLowerCase())
  );
  return partial || 'Other';
}

export function normalizeBusinessModel(raw: unknown): { businessModel: string; customBusinessModel?: string } {
  const value = str(raw);
  if (!value) return { businessModel: '' };
  const exact = BUSINESS_MODELS.find(m => m.value.toLowerCase() === value.toLowerCase());
  if (exact) return { businessModel: exact.value };
  return { businessModel: 'Other', customBusinessModel: value };
}

export function normalizeCountry(raw: unknown): string {
  const value = str(raw);
  if (!value) return '';
  if (value.length === 2 && ISO_TO_COUNTRY[value.toUpperCase()]) {
    return ISO_TO_COUNTRY[value.toUpperCase()];
  }
  const exact = COUNTRIES_EN.find(c => c.toLowerCase() === value.toLowerCase());
  return exact || 'Other';
}

export function normalizeRole(raw: unknown): { role: string; customRole?: string } {
  const value = str(raw);
  if (!value) return { role: '' };
  const lower = value.toLowerCase();
  const direct = FOUNDER_ROLES.find(r => r.value.toLowerCase() === lower);
  if (direct) return { role: direct.value };
  const contained = FOUNDER_ROLES.find(r => r.value !== 'Other' && lower.includes(r.value.toLowerCase()));
  if (contained) return { role: contained.value };
  if (lower.includes('основатель') || lower.includes('founder')) return { role: 'CEO' };
  return { role: 'Other', customRole: value };
}

function yearFromDate(raw: unknown): string {
  const value = str(raw);
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '';
}

export function mapDraftToWizard(draft: AutofillDraft): MappedAutofill {
  const a = draft.stepA || {};
  const b = draft.stepB || {};
  const c = draft.stepC || {};

  const stepA: Partial<StepAData> = {};
  const stepB: Partial<StepBData> = {};
  const stepC: Partial<StepCData> = {};

  const setA = <K extends keyof StepAData>(key: K, value: StepAData[K] | undefined | '') => {
    if (value !== undefined && value !== '' && value !== null) stepA[key] = value as StepAData[K];
  };
  const setB = <K extends keyof StepBData>(key: K, value: StepBData[K] | undefined | '') => {
    if (value !== undefined && value !== '' && value !== null) stepB[key] = value as StepBData[K];
  };
  const setC = <K extends keyof StepCData>(key: K, value: StepCData[K] | undefined | '') => {
    if (value !== undefined && value !== '' && value !== null) stepC[key] = value as StepCData[K];
  };

  setA('name', str(a.name));
  setA('industry', normalizeIndustry(a.industry));
  setA('description', str(a.description).slice(0, 2500));
  setA('stage', normalizeStage(a.stage));
  setA('employees', num(a.employees));

  const hasUsers = bool(a.hasUsers);
  if (hasUsers !== undefined) setA('hasUsers', hasUsers);
  setA('userCount', str(a.userCount));

  const hasPaying = bool(a.hasPayingCustomers);
  if (hasPaying !== undefined) setA('hasPayingCustomers', hasPaying);
  const revenue = num(a.revenueFirstMonth);
  if (revenue !== undefined) setA('revenueFirstMonth', String(revenue));

  const hasTech = bool(a.hasTechnology);
  if (hasTech !== undefined) setA('hasTechnology', hasTech);
  setA('technologyDescription', str(a.technologyDescription));

  const model = normalizeBusinessModel(a.businessModel);
  setA('businessModel', model.businessModel);
  if (model.customBusinessModel) setA('customBusinessModel', model.customBusinessModel);
  setA('businessModelDescription', str(a.businessModelDescription));

  setA('foundingDate', yearFromDate(a.foundingDate));
  setA('country', normalizeCountry(a.country));

  const ask = num(a.fundingRequest);
  if (ask !== undefined) setA('itpvFundingRequest', String(ask));

  setB('firstName', str(b.firstName));
  setB('lastName', str(b.lastName));
  const role = normalizeRole(b.role);
  setB('role', role.role);
  if (role.customRole) setB('customRole', role.customRole);
  setB('email', str(b.email));
  setB('phone', str(b.phone));
  setB('website', str(b.website));
  setB('background', str(b.background));

  const links = (b.socialLinks || {}) as Record<string, unknown>;
  const socialLinks: Record<string, string> = {};
  for (const key of ['linkedin', 'facebook', 'telegram', 'twitter', 'instagram'] as const) {
    const url = str(links[key]);
    if (url) socialLinks[key] = url;
  }
  if (Object.keys(socialLinks).length) setB('socialLinks', socialLinks);

  const rawTeam = Array.isArray(b.teamMembers) ? b.teamMembers : [];
  const teamMembers: TeamMember[] = rawTeam
    .map((m): TeamMember | null => {
      const member = (m || {}) as Record<string, unknown>;
      const firstName = str(member.firstName);
      const lastName = str(member.lastName);
      if (!firstName && !lastName) return null;
      return {
        firstName,
        lastName,
        role: str(member.role),
        email: str(member.email),
        phone: str(member.phone),
        background: str(member.background),
        type: member.type === 'cofounder' ? 'cofounder' : 'member',
      };
    })
    .filter((m): m is TeamMember => m !== null);
  if (teamMembers.length) setB('teamMembers', teamMembers);

  setC('futurePlans', str(c.futurePlans));
  setC('videoLink', str(c.videoLink));

  const filledCount =
    Object.keys(stepA).length + Object.keys(stepB).length + Object.keys(stepC).length;

  return { stepA, stepB, stepC, filledCount };
}
