import { describe, expect, it } from 'vitest';
import {
  PORTFOLIO_EXPORT_NUMBER_FORMATS,
  buildPortfolioExportSheet,
  portfolioExportFileName,
  portfolioExportValue,
  type PortfolioExportRow,
} from './portfolioExport';
import { PORTFOLIO_COLUMN_DEFINITIONS, type PortfolioColumnId } from './portfolioColumns';

function row(overrides: Partial<PortfolioExportRow> = {}): PortfolioExportRow {
  return {
    name: 'AITHER',
    number: 1,
    industry: 'PropTech',
    segmentLabel: 'Портфель',
    stage: 'Seed',
    country: 'Uzbekistan',
    reportDate: '2026-06-30',
    entryDate: new Date(2025, 2, 17),
    investmentTypeLabel: 'Equity',
    statusLabel: 'Зелёный',
    responsiblePerson: 'Нарзуллаев',
    values: {},
    ...overrides,
  };
}

const labels = Object.fromEntries(
  PORTFOLIO_COLUMN_DEFINITIONS.map((c) => [c.id, c.id]),
) as Record<PortfolioColumnId, string>;

describe('portfolioExportValue', () => {
  it('оставляет числа числами, а не форматированными строками', () => {
    const r = row({ values: { investedUsd: 250000, mrr: 18400 } });
    expect(portfolioExportValue(r, 'investedUsd')).toBe(250000);
    expect(portfolioExportValue(r, 'mrr')).toBe(18400);
  });

  it('проценты уходят долями — так их понимает формат 0.0%', () => {
    const r = row({ values: { grossMargin: 0.62, ownership: 0.075 } });
    expect(portfolioExportValue(r, 'grossMargin')).toBe(0.62);
    expect(portfolioExportValue(r, 'ownership')).toBe(0.075);
    expect(PORTFOLIO_EXPORT_NUMBER_FORMATS.grossMargin).toBe('0.0%');
  });

  it('прочерк таблицы становится пустой ячейкой, а не текстом "-"', () => {
    expect(portfolioExportValue(row({ industry: '-' }), 'industry')).toBeNull();
    expect(portfolioExportValue(row({ values: {} }), 'mrr')).toBeNull();
  });

  it('дата входа выгружается в ISO, а пустая — пустой ячейкой', () => {
    expect(portfolioExportValue(row(), 'entryDate')).toBe('2025-03-17');
    expect(portfolioExportValue(row({ entryDate: null }), 'entryDate')).toBeNull();
  });

  it('нечисловые значения не подменяются нулём', () => {
    expect(portfolioExportValue(row({ values: { burnRate: 0 } }), 'burnRate')).toBe(0);
    expect(portfolioExportValue(row({ values: { burnRate: undefined } }), 'burnRate')).toBeNull();
    expect(portfolioExportValue(row({ values: { runway: Number.POSITIVE_INFINITY } }), 'runway')).toBeNull();
  });

  it('подхватывает значения, посчитанные в UI и живущие только строкой', () => {
    const r = row({ calculated: { totalScore: '7.4' } });
    expect(portfolioExportValue(r, 'totalScore')).toBe('7.4');
  });
});

describe('buildPortfolioExportSheet', () => {
  const columnIds: PortfolioColumnId[] = ['name', 'investedUsd', 'grossMargin'];

  it('первая строка — заголовки в порядке видимых колонок', () => {
    const sheet = buildPortfolioExportSheet({ rows: [row()], columnIds, labels });
    expect(sheet.aoa[0]).toEqual(['name', 'investedUsd', 'grossMargin']);
  });

  it('выгружает ровно переданные строки и колонки', () => {
    const sheet = buildPortfolioExportSheet({
      rows: [row({ values: { investedUsd: 1000, grossMargin: 0.5 } })],
      columnIds,
      labels,
    });
    expect(sheet.aoa).toHaveLength(2);
    expect(sheet.aoa[1]).toEqual(['AITHER', 1000, 0.5]);
  });

  it('итоговая строка добавляется последней и подписывается в первой колонке', () => {
    const sheet = buildPortfolioExportSheet({
      rows: [row()],
      columnIds,
      labels,
      totals: { investedUsd: 1000, grossMargin: '-' },
      totalsLabel: 'Итого',
    });
    expect(sheet.aoa[sheet.aoa.length - 1]).toEqual(['Итого', 1000, null]);
  });

  it('без totals итоговой строки нет', () => {
    const sheet = buildPortfolioExportSheet({ rows: [row(), row()], columnIds, labels });
    expect(sheet.aoa).toHaveLength(3);
  });

  it('числовые форматы совпадают по индексу с колонками', () => {
    const sheet = buildPortfolioExportSheet({ rows: [row()], columnIds, labels });
    expect(sheet.numberFormats).toEqual([undefined, '$#,##0', '0.0%']);
  });

  it('ширины колонок берутся из тех же значений, что и в таблице', () => {
    const sheet = buildPortfolioExportSheet({ rows: [row()], columnIds, labels });
    expect(sheet.colWidths).toHaveLength(columnIds.length);
    sheet.colWidths.forEach((c) => expect(c.wch).toBeGreaterThanOrEqual(8));
  });

  it('переживает пустой портфель — остаётся только шапка', () => {
    const sheet = buildPortfolioExportSheet({ rows: [], columnIds, labels });
    expect(sheet.aoa).toEqual([['name', 'investedUsd', 'grossMargin']]);
  });

  it('покрывает все колонки таблицы без исключений', () => {
    const all = PORTFOLIO_COLUMN_DEFINITIONS.map((c) => c.id);
    const sheet = buildPortfolioExportSheet({
      rows: [row({ values: Object.fromEntries(all.map((id) => [id, 1])) })],
      columnIds: all,
      labels,
    });
    expect(sheet.aoa[1].filter((v) => v === null)).toHaveLength(0);
  });
});

describe('portfolioExportFileName', () => {
  it('содержит фонд и дату', () => {
    expect(portfolioExportFileName('UC Ventures', new Date(2026, 7, 9)))
      .toBe('UC Ventures_portfolio_2026-08-09.xlsx');
  });

  it('помечает отфильтрованную выгрузку, чтобы её не приняли за полную', () => {
    expect(portfolioExportFileName('UC Ventures', new Date(2026, 7, 9), { filtered: true }))
      .toBe('UC Ventures_portfolio_2026-08-09_filtered.xlsx');
  });

  it('вычищает символы, запрещённые в именах файлов', () => {
    expect(portfolioExportFileName('A/B:C*D?"<>|', new Date(2026, 7, 9)))
      .toBe('A B C D_portfolio_2026-08-09.xlsx');
  });

  it('не падает на пустом имени фонда', () => {
    expect(portfolioExportFileName('', new Date(2026, 7, 9)))
      .toBe('FundGate_portfolio_2026-08-09.xlsx');
  });
});
