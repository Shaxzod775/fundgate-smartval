import { describe, expect, it } from 'vitest';
import type { Startup, StartupBoardColumn } from '../../types';
import {
  BOARD_STAGE_PRESETS,
  DEFAULT_BOARD_COLUMNS,
  columnIdForStartup,
  defaultStagesForLifecycle,
  normalizeBoardColumns,
  stagesForColumn,
} from './boardColumns';

const startup = (overrides: Partial<Startup>): Startup => ({
  id: 's1',
  status: 'in_review',
  ...overrides,
} as Startup);

describe('board stage presets', () => {
  it('keeps the nine legacy roadmap step ids so old roadmap data still matches', () => {
    const presetIds = new Set(BOARD_STAGE_PRESETS.map((preset) => preset.id));
    for (const legacyId of ['incoming', 'pitch', 'kyc', 'data_room', 'screening', 'ic_prep', 'investment_committee', 'closing', 'portfolio']) {
      expect(presetIds.has(legacyId)).toBe(true);
    }
  });

  it('default lifecycle stages mirror the legacy per-status groups', () => {
    expect(defaultStagesForLifecycle('new').map((stage) => stage.id)).toEqual(['incoming']);
    expect(defaultStagesForLifecycle('in_review').map((stage) => stage.id)).toEqual(['kyc', 'data_room', 'screening']);
    expect(defaultStagesForLifecycle('pipeline').map((stage) => stage.id)).toEqual(['ic_prep', 'investment_committee', 'closing']);
    expect(defaultStagesForLifecycle('portfolio').map((stage) => stage.id)).toEqual(['portfolio']);
  });
});

describe('stagesForColumn', () => {
  const base = DEFAULT_BOARD_COLUMNS.find((column) => column.id === 'sys_in_review')!;

  it('falls back to lifecycle defaults when stages are not configured', () => {
    expect(stagesForColumn(base).map((stage) => stage.id)).toEqual(['kyc', 'data_room', 'screening']);
  });

  it('uses explicit stages verbatim, including the explicitly-empty list', () => {
    const custom: StartupBoardColumn = { ...base, stages: [{ id: 'legal', label: 'Legal' }] };
    expect(stagesForColumn(custom).map((stage) => stage.id)).toEqual(['legal']);
    expect(stagesForColumn({ ...base, stages: [] })).toEqual([]);
  });

  it('removes the retired Pitch stage from saved column settings', () => {
    expect(stagesForColumn({
      ...base,
      lifecycleStatus: 'new',
      stages: [
        { id: 'incoming', label: 'Incoming' },
        { id: 'pitch', label: 'Pitch', presetId: 'pitch' },
      ],
    }).map((stage) => stage.id)).toEqual(['incoming']);
  });
});

describe('normalizeBoardColumns + columnIdForStartup', () => {
  it('keeps stages through normalization and resolves custom columns', () => {
    const columns = normalizeBoardColumns({
      version: 1,
      columns: [
        ...DEFAULT_BOARD_COLUMNS,
        {
          id: 'col_legal',
          kind: 'custom',
          label: 'Legal Review',
          color: '#14b8a6',
          order: 150,
          lifecycleStatus: 'in_review',
          stages: [{ id: 'legal_check', label: 'Проверка юристов' }],
        },
      ],
    });

    const legal = columns.find((column) => column.id === 'col_legal');
    expect(legal?.stages?.map((stage) => stage.id)).toEqual(['legal_check']);

    expect(columnIdForStartup(startup({ status: 'in_review', boardColumnId: 'col_legal' }), columns)).toBe('col_legal');
    expect(columnIdForStartup(startup({ status: 'in_review' }), columns)).toBe('sys_in_review');
    expect(columnIdForStartup(startup({ status: 'pipeline', boardColumnId: 'col_legal' }), columns)).toBe('sys_pipeline');
  });
});
