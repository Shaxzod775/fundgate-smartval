import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  aiRecommendationKind,
  aiRecommendationTone,
  displayCountry,
  fileExtension,
  memoDecisionMeta,
  projectVoteStats,
} from './dossierMeta';

const t = ((_key: string, defaultValue?: string) => defaultValue || '') as unknown as TFunction;

describe('aiRecommendationKind', () => {
  it('распознаёт известные enum-значения', () => {
    expect(aiRecommendationKind('buy')).toBe('enum');
    expect(aiRecommendationKind('strong_buy')).toBe('enum');
    expect(aiRecommendationKind('hold')).toBe('enum');
    expect(aiRecommendationKind('sell')).toBe('enum');
  });

  it('свободный текст модели — text, а не бейдж', () => {
    expect(aiRecommendationKind('Critical blockers must be resolved: upload a valid pitch deck.')).toBe('text');
  });

  it('пусто/пробелы — none', () => {
    expect(aiRecommendationKind(undefined)).toBe('none');
    expect(aiRecommendationKind('   ')).toBe('none');
  });
});

describe('aiRecommendationTone', () => {
  it('маппит тона по значению', () => {
    expect(aiRecommendationTone('strong_buy')).toBe('green');
    expect(aiRecommendationTone('buy')).toBe('green');
    expect(aiRecommendationTone('hold')).toBe('amber');
    expect(aiRecommendationTone('sell')).toBe('red');
  });
});

describe('memoDecisionMeta', () => {
  it('insufficient_data — amber и человекочитаемый фолбэк', () => {
    const meta = memoDecisionMeta('insufficient_data', t);
    expect(meta.tone).toBe('amber');
    expect(meta.label).toBe('Insufficient data');
  });

  it('invest — green, pass — red', () => {
    expect(memoDecisionMeta('invest', t).tone).toBe('green');
    expect(memoDecisionMeta('pass', t).tone).toBe('red');
  });

  it('неизвестное значение — blue и капитализация без подчёркиваний', () => {
    const meta = memoDecisionMeta('some_new_status', t);
    expect(meta.tone).toBe('blue');
    expect(meta.label).toBe('Some new status');
  });
});

describe('fileExtension', () => {
  it('берёт расширение из имени файла', () => {
    expect(fileExtension(undefined, 'deck.pdf')).toBe('PDF');
    expect(fileExtension(undefined, 'model.XLSX')).toBe('XLSX');
  });

  it('режет query/hash подписанных URL', () => {
    expect(fileExtension('https://storage.googleapis.com/b/deck.pdf?X-Goog-Signature=abc#page=2')).toBe('PDF');
  });

  it('без расширения или с числовым хвостом — undefined', () => {
    expect(fileExtension('https://example.com/files/12345')).toBe(undefined);
    expect(fileExtension('https://example.com/archive.2024')).toBe(undefined);
    expect(fileExtension(undefined, undefined)).toBe(undefined);
  });
});

describe('displayCountry', () => {
  it('капитализирует сырое значение с маленькой буквы', () => {
    expect(displayCountry('uzbekistan')).toBe('Uzbekistan');
    expect(displayCountry('узбекистан')).toBe('Узбекистан');
  });

  it('не трогает уже нормальные значения', () => {
    expect(displayCountry('UAE')).toBe('UAE');
    expect(displayCountry('Uzbekistan')).toBe('Uzbekistan');
  });

  it('пусто — undefined', () => {
    expect(displayCountry(undefined)).toBe(undefined);
    expect(displayCountry('  ')).toBe(undefined);
  });
});

describe('projectVoteStats', () => {
  const members = [
    { managerId: 'cm-1', name: 'Член ИК 1' },
    { managerId: 'cm-2', name: 'Член ИК 2' },
    { managerId: 'cm-3', name: 'Член ИК 3' },
  ];

  it('считает голоса только актуального состава', () => {
    const stats = projectVoteStats(
      {
        startupId: 's-1',
        memberVotes: [
          { memberId: 'cm-1', vote: 'for' },
          { memberId: 'cm-2', vote: 'against' },
          { memberId: 'ghost', vote: 'for' },
        ],
      },
      members,
    );
    expect(stats).toEqual({ for: 1, against: 1, pending: 1, total: 3 });
  });

  it('без проекта или голосов — все в ожидании', () => {
    expect(projectVoteStats(undefined, members)).toEqual({ for: 0, against: 0, pending: 3, total: 3 });
  });

  it('pending не уходит в минус при голосах сверх состава', () => {
    const stats = projectVoteStats(
      {
        startupId: 's-1',
        memberVotes: [
          { memberId: 'cm-1', vote: 'for' },
          { memberId: 'cm-2', vote: 'for' },
          { memberId: 'cm-3', vote: 'for' },
        ],
      },
      [{ managerId: 'cm-1' }, { managerId: 'cm-2' }],
    );
    expect(stats.pending).toBe(0);
  });
});
