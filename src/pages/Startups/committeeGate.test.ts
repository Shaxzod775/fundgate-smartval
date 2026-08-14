import { describe, expect, it } from 'vitest';

import { committeeGateFor } from './committeeGate';

describe('committeeGateFor', () => {
  it('пропускает карточку, переведённую в портфель самим комитетом', () => {
    const gate = committeeGateFor({
      portfolioPromotion: { committeeId: 'ic-1', at: '2026-08-01T10:00:00.000Z' },
    } as any);
    expect(gate).toMatchObject({ state: 'approved', blocked: false });
  });

  it('пропускает завершённый per-startup процесс ИК', () => {
    expect(committeeGateFor({ investmentCommitteeStatus: 'completed' } as any))
      .toMatchObject({ state: 'approved', blocked: false });
    expect(committeeGateFor({ investmentCommittee: { status: 'completed' } } as any))
      .toMatchObject({ state: 'approved', blocked: false });
  });

  it('считает ИК идущим, когда проект направлен директором', () => {
    const gate = committeeGateFor({
      sentToCommittee: { at: '2026-08-05T09:00:00.000Z', byName: 'Director' },
    } as any);
    expect(gate.state).toBe('in_progress');
    expect(gate.blocked).toBe(true);
    expect(gate.sentAt).toBe('2026-08-05T09:00:00.000Z');
  });

  it('считает ИК идущим, пока рабочий процесс не завершён', () => {
    expect(committeeGateFor({ investmentCommitteeStatus: 'signing' } as any))
      .toMatchObject({ state: 'in_progress', blocked: true });
  });

  it('отменённый процесс ИК не считается начатым', () => {
    expect(committeeGateFor({ investmentCommitteeStatus: 'cancelled' } as any))
      .toMatchObject({ state: 'not_started', blocked: true });
  });

  it('блокирует карточку без единого следа ИК', () => {
    expect(committeeGateFor({ id: 'x', status: 'pipeline' } as any))
      .toMatchObject({ state: 'not_started', blocked: true });
    expect(committeeGateFor(null)).toMatchObject({ state: 'not_started', blocked: true });
  });
});
