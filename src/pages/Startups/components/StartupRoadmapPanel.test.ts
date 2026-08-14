import { describe, expect, it } from 'vitest';
import type { Startup } from '../../../types';
import { DEFAULT_BOARD_COLUMNS } from '../boardColumns';
import { resolveActiveStageView, unfinishedStageCountFor } from './StartupRoadmapPanel';

const startup = (overrides: Partial<Startup> = {}): Startup => ({
  id: 'startup-1',
  status: 'new',
  brief: {
    companyName: 'Flowa',
    industry: 'EdTech',
    description: '',
    stage: 'Pre-Seed',
    foundedYear: 2026,
    teamSize: 1,
    fundingRequest: 0,
    useOfFunds: '',
  },
  ...overrides,
} as Startup);

describe('startup roadmap without the retired Pitch stage', () => {
  it('shows only Incoming channel for new applications', () => {
    const item = startup({
      fileUrls: { pitchDeck: 'https://files.example/flowa-pitch.pdf' },
      roadmap: {
        steps: {
          incoming: { id: 'incoming', status: 'done' },
          pitch: { id: 'pitch', status: 'in_progress' },
        },
      },
    });

    expect(resolveActiveStageView(item, DEFAULT_BOARD_COLUMNS).stages.map((stage) => stage.id))
      .toEqual(['incoming']);
    expect(unfinishedStageCountFor(item, DEFAULT_BOARD_COLUMNS)).toMatchObject({
      unfinished: 0,
      total: 1,
    });
  });

  it('filters Pitch out of previously saved board settings', () => {
    const item = startup({
      roadmap: {
        steps: {
          incoming: { id: 'incoming', status: 'done' },
          pitch: { id: 'pitch', status: 'blocked' },
        },
      },
    });
    const savedColumns = DEFAULT_BOARD_COLUMNS.map((column) => (
      column.id === 'sys_new'
        ? {
          ...column,
          stages: [
            { id: 'incoming', label: 'Incoming channel' },
            { id: 'pitch', label: 'Pitch', presetId: 'pitch' },
          ],
        }
        : column
    ));

    expect(resolveActiveStageView(item, savedColumns).stages.map((stage) => stage.id))
      .toEqual(['incoming']);
    expect(unfinishedStageCountFor(item, savedColumns)).toMatchObject({
      unfinished: 0,
      total: 1,
    });
  });
});
