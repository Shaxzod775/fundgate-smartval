import { describe, expect, it } from 'vitest';
import {
  mapDraftToWizard,
  normalizeBusinessModel,
  normalizeCountry,
  normalizeIndustry,
  normalizeRole,
  normalizeStage,
} from './autofillMapping';

describe('normalizeStage', () => {
  it('maps draft Russian labels to wizard values', () => {
    expect(normalizeStage('Идея')).toBe('Idea');
    expect(normalizeStage('Прототип')).toBe('Prototype');
    expect(normalizeStage('MVP готов')).toBe('MVP');
    expect(normalizeStage('Есть первые клиенты')).toBe('Seed');
    expect(normalizeStage('Растущий бизнес')).toBe('Growth');
  });

  it('passes through wizard-native values case-insensitively', () => {
    expect(normalizeStage('pre-seed')).toBe('Pre-Seed');
    expect(normalizeStage('Series A')).toBe('Series A');
  });

  it('returns empty for unknown stages', () => {
    expect(normalizeStage('unicorn')).toBe('');
  });
});

describe('normalizeIndustry', () => {
  it('matches exact and compound industries', () => {
    expect(normalizeIndustry('FinTech')).toBe('FinTech');
    expect(normalizeIndustry('HealthTech')).toBe('HealthTech & MedTech');
    expect(normalizeIndustry('edtech')).toBe('EdTech');
  });

  it('falls back to Other', () => {
    expect(normalizeIndustry('Quantum Basket Weaving')).toBe('Other');
  });
});

describe('normalizeCountry', () => {
  it('converts ISO codes', () => {
    expect(normalizeCountry('UZ')).toBe('Uzbekistan');
    expect(normalizeCountry('US')).toBe('USA');
    expect(normalizeCountry('GB')).toBe('UK');
  });

  it('accepts full names case-insensitively and falls back to Other', () => {
    expect(normalizeCountry('kazakhstan')).toBe('Kazakhstan');
    expect(normalizeCountry('Atlantis')).toBe('Other');
  });
});

describe('normalizeBusinessModel / normalizeRole', () => {
  it('keeps known models and diverts unknown to Other+custom', () => {
    expect(normalizeBusinessModel('SaaS')).toEqual({ businessModel: 'SaaS' });
    expect(normalizeBusinessModel('Hardware rental')).toEqual({
      businessModel: 'Other',
      customBusinessModel: 'Hardware rental',
    });
  });

  it('extracts canonical founder roles from verbose labels', () => {
    expect(normalizeRole('CEO / Основатель')).toEqual({ role: 'CEO' });
    expect(normalizeRole('Founder')).toEqual({ role: 'CEO' });
    expect(normalizeRole('CTO / Технический директор')).toEqual({ role: 'CTO' });
    expect(normalizeRole('Head of Magic')).toEqual({ role: 'Other', customRole: 'Head of Magic' });
  });
});

describe('mapDraftToWizard', () => {
  it('maps a representative draft end-to-end', () => {
    const mapped = mapDraftToWizard({
      stepA: {
        name: 'Demo Co',
        industry: 'FinTech',
        description: 'x'.repeat(3000),
        stage: 'MVP готов',
        employees: 7,
        hasUsers: true,
        hasPayingCustomers: true,
        revenueFirstMonth: 1200,
        hasTechnology: true,
        technologyDescription: 'ML scoring',
        businessModel: 'B2B',
        foundingDate: '2024-03-01',
        country: 'UZ',
        fundingRequest: 250000,
      },
      stepB: {
        firstName: 'Ali',
        lastName: 'Valiyev',
        role: 'CEO / Основатель',
        email: 'ali@demo.co',
        socialLinks: { linkedin: 'https://linkedin.com/in/ali', telegram: '' },
        teamMembers: [
          { firstName: 'Bek', lastName: 'B', role: 'CTO', type: 'cofounder' },
          { firstName: '', lastName: '', role: 'ghost' },
        ],
      },
      stepC: { futurePlans: 'Scale to KZ', videoLink: '' },
    });

    expect(mapped.stepA.name).toBe('Demo Co');
    expect(mapped.stepA.description).toHaveLength(2500);
    expect(mapped.stepA.stage).toBe('MVP');
    expect(mapped.stepA.country).toBe('Uzbekistan');
    expect(mapped.stepA.foundingDate).toBe('2024');
    expect(mapped.stepA.itpvFundingRequest).toBe('250000');
    expect(mapped.stepA.revenueFirstMonth).toBe('1200');
    expect(mapped.stepB.role).toBe('CEO');
    expect(mapped.stepB.socialLinks).toEqual({ linkedin: 'https://linkedin.com/in/ali' });
    expect(mapped.stepB.teamMembers).toHaveLength(1);
    expect(mapped.stepB.teamMembers?.[0].type).toBe('cofounder');
    expect(mapped.stepC.futurePlans).toBe('Scale to KZ');
    expect(mapped.stepC.videoLink).toBeUndefined();
    expect(mapped.filledCount).toBeGreaterThan(10);
  });

  it('leaves everything untouched for an empty draft', () => {
    const mapped = mapDraftToWizard({});
    expect(mapped.stepA).toEqual({});
    expect(mapped.stepB).toEqual({});
    expect(mapped.stepC).toEqual({});
    expect(mapped.filledCount).toBe(0);
  });

  it('expands magnitude suffixes on money fields instead of truncating them', () => {
    expect(mapDraftToWizard({ stepA: { fundingRequest: '$2.5M' } }).stepA.itpvFundingRequest).toBe('2500000');
    expect(mapDraftToWizard({ stepA: { fundingRequest: '250k' } }).stepA.itpvFundingRequest).toBe('250000');
    expect(mapDraftToWizard({ stepA: { fundingRequest: '1,5 млн' } }).stepA.itpvFundingRequest).toBe('1500000');
    expect(mapDraftToWizard({ stepA: { revenueFirstMonth: '12 000' } }).stepA.revenueFirstMonth).toBe('12000');
    expect(mapDraftToWizard({ stepA: { fundingRequest: 500000 } }).stepA.itpvFundingRequest).toBe('500000');
    expect(mapDraftToWizard({ stepA: { fundingRequest: '750000' } }).stepA.itpvFundingRequest).toBe('750000');
  });
});
