import { describe, expect, it } from 'vitest';
import { estimateChipWidth, packCardChips } from './StartupCard';

const chip = (key: string, label: string, withIcon = false) => ({ key, label, withIcon });

describe('packCardChips — слот чипов фиксированной высоты', () => {
  it('оставляет все чипы, когда они влезают в ряд', () => {
    const chips = [chip('a', 'ИК План'), chip('b', 'Data Room 2/2')];
    const packed = packCardChips(chips, 1);

    expect(packed.visible).toEqual(chips);
    expect(packed.hidden).toEqual([]);
  });

  it('прячет хвост в «+N», оставляя место под сам счётчик', () => {
    const chips = [
      chip('a', 'Data Room 2/2'),
      chip('b', 'ИК План'),
      chip('c', 'Q1 2026: Одобрен', true),
      chip('d', 'Ранее отклонён ×2', true),
    ];
    const packed = packCardChips(chips, 1);

    expect(packed.visible.length).toBeGreaterThan(0);
    expect(packed.visible.length + packed.hidden.length).toBe(chips.length);

    const rowWidth = packed.visible.reduce(
      (sum, c, index) => sum + estimateChipWidth(c.label, c.withIcon) + (index > 0 ? 6 : 0),
      0,
    );
    const counterWidth = estimateChipWidth(`+${packed.hidden.length}`) + 6;
    expect(rowWidth + counterWidth).toBeLessThanOrEqual(200);
  });

  it('держит порядок приоритета: первым остаётся самый важный чип', () => {
    const chips = [
      chip('blocked', 'Инвесткомитет blocked'),
      chip('report', 'Q4 2025: Изменения запрошены', true),
      chip('cross', 'UC Ventures: Пайплайн', true),
    ];
    const packed = packCardChips(chips, 1);

    expect(packed.visible[0]?.key).toBe('blocked');
  });

  it('на двух рядах помещает больше чипов, чем на одном', () => {
    const chips = [
      chip('a', 'Финансы', true),
      chip('b', 'Юристы', true),
      chip('c', 'Технарь', true),
    ];

    expect(packCardChips(chips, 2).hidden).toEqual([]);
    expect(packCardChips(chips, 1).hidden.length).toBeGreaterThan(0);
  });

  it('оставляет главный чип видимым, даже когда он один шире ряда', () => {
    const chips = [
      chip('long', 'Очень длинная подпись чипа, которая не влезает никуда'),
      chip('second', 'ИК План'),
    ];
    const packed = packCardChips(chips, 1);

    expect(packed.visible.map((c) => c.key)).toEqual(['long']);
    expect(packed.hidden.map((c) => c.key)).toEqual(['second']);
  });

  it('никогда не отдаёт пустой ряд, если чипы есть', () => {
    const chips = [chip('a', 'Ранее отклонён ×3', true), chip('b', 'Q1 2026: Изменения запрошены', true)];
    const packed = packCardChips(chips, 1);

    expect(packed.visible.length).toBeGreaterThan(0);
  });
});
