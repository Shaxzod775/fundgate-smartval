import { describe, expect, it } from 'vitest';

import { dateValueToDate, dateValueToTimestamp } from './dateValue';

describe('dateValue', () => {
  it.each([
    ['Date', new Date('2026-07-28T10:00:00.000Z')],
    ['ISO string', '2026-07-28T10:00:00.000Z'],
    ['Firestore _seconds', { _seconds: 1785232800, _nanoseconds: 0 }],
    ['Firestore seconds', { seconds: 1785232800, nanoseconds: 0 }],
    ['Firestore toDate', { toDate: () => new Date('2026-07-28T10:00:00.000Z') }],
    ['Firestore toMillis', { toMillis: () => 1785232800000 }],
  ])('normalizes %s values', (_label, value) => {
    expect(dateValueToDate(value)?.toISOString()).toBe('2026-07-28T10:00:00.000Z');
    expect(dateValueToTimestamp(value)).toBe(1785232800000);
  });

  it.each([undefined, null, '', 'not-a-date', {}, new Date('invalid')])(
    'returns a safe fallback for invalid value %s',
    (value) => {
      expect(dateValueToDate(value)).toBeNull();
      expect(dateValueToTimestamp(value)).toBe(0);
    },
  );
});
