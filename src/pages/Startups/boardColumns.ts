import type {
  Startup,
  StartupBoardColumn,
  StartupBoardColumnStage,
  StartupBoardLifecycleStatus,
  StartupBoardSettings,
} from '../../types';

export const DEFAULT_BOARD_COLUMNS: StartupBoardColumn[] = [
  { id: 'sys_new', kind: 'system', label: 'Новые заявки', color: '#3b82f6', order: 0, lifecycleStatus: 'new', systemStatus: 'new', locked: true },
  { id: 'sys_in_review', kind: 'system', label: 'На проверке', color: '#f59e0b', order: 100, lifecycleStatus: 'in_review', systemStatus: 'in_review' },
  { id: 'sys_pipeline', kind: 'system', label: 'Пайплайн', color: '#8b5cf6', order: 200, lifecycleStatus: 'pipeline', systemStatus: 'pipeline' },
  { id: 'sys_portfolio', kind: 'system', label: 'Портфель', color: '#10b981', order: 300, lifecycleStatus: 'portfolio', systemStatus: 'portfolio', locked: true },
];

export const BOARD_COLUMN_LABEL_KEYS: Record<string, string> = {
  sys_new: 'startups.status.new',
  sys_in_review: 'startups.status.in_review',
  sys_pipeline: 'startups.status.pipeline',
  sys_portfolio: 'startups.status.portfolio',
};

export const REQUIRED_BOARD_COLUMN_IDS = new Set(['sys_new', 'sys_portfolio']);
export const CUSTOM_COLUMN_LIFECYCLES: StartupBoardLifecycleStatus[] = ['in_review', 'pipeline'];

export interface BoardStagePreset {
  id: string;
  label: string;
  description: string;
}

export const BOARD_STAGE_PRESETS: BoardStagePreset[] = [
  { id: 'incoming', label: 'Входящий канал', description: 'Источник проекта: сайт, акселератор, мероприятие, встреча или поручение руководства.' },
  { id: 'pitch', label: 'Pitch', description: 'Получить питч-дек и провести первичную оценку продукта, рынка и команды.' },
  { id: 'kyc', label: 'KYC', description: 'Собрать базовую форму и контактные данные для проверки.' },
  { id: 'data_room', label: 'Data Room', description: 'Запросить и проверить презентацию, финансы, legal, команду, продукт и бренд-материалы.' },
  { id: 'screening', label: 'Внутренний скрининг', description: 'Подготовить краткую справку по продукту, рынку, traction и условиям сделки.' },
  { id: 'ic_prep', label: 'Подготовка к ИК', description: 'Собрать инвестмемо, презентацию для защиты и структурированный Data Room.' },
  { id: 'investment_committee', label: 'Инвесткомитет', description: 'Назначить заседание, провести защиту и зафиксировать решение.' },
  { id: 'closing', label: 'Closing / Legal', description: 'Согласовать финальные условия, подписать документы и подготовить перевод средств.' },
  { id: 'portfolio', label: 'Портфель', description: 'Стартап принят в портфель как инвестиция или программный участник.' },
  { id: 'due_diligence', label: 'Due Diligence', description: 'Финансовая, юридическая и техническая проверка перед сделкой.' },
  { id: 'term_sheet', label: 'Term Sheet', description: 'Согласовать ключевые условия сделки с фаундерами.' },
  { id: 'onboarding', label: 'Онбординг', description: 'Передать компанию портфельной команде: доступы, контакты, план работы.' },
  { id: 'monitoring', label: 'Мониторинг', description: 'Регулярная отчётность, метрики и сопровождение портфельной компании.' },
];

const PRESETS_BY_ID = new Map(BOARD_STAGE_PRESETS.map((preset) => [preset.id, preset]));
export const BOARD_STAGE_PRESET_IDS = new Set(BOARD_STAGE_PRESETS.map((preset) => preset.id));
const REMOVED_BOARD_STAGE_IDS = new Set(['pitch']);
export const AVAILABLE_BOARD_STAGE_PRESETS = BOARD_STAGE_PRESETS.filter(
  (preset) => !REMOVED_BOARD_STAGE_IDS.has(preset.id)
);

export const stagePreset = (id: string): BoardStagePreset | undefined => PRESETS_BY_ID.get(id);

const DEFAULT_STAGE_IDS_BY_LIFECYCLE: Record<StartupBoardLifecycleStatus, string[]> = {
  new: ['incoming'],
  in_review: ['kyc', 'data_room', 'screening'],
  pipeline: ['ic_prep', 'investment_committee', 'closing'],
  portfolio: ['portfolio'],
};

export const defaultStagesForLifecycle = (lifecycle: StartupBoardLifecycleStatus): StartupBoardColumnStage[] =>
  DEFAULT_STAGE_IDS_BY_LIFECYCLE[lifecycle].map((id) => {
    const preset = PRESETS_BY_ID.get(id)!;
    return { id: preset.id, label: preset.label, description: preset.description, presetId: preset.id };
  });

export const stagesForColumn = (column: StartupBoardColumn): StartupBoardColumnStage[] =>
  (column.stages !== undefined ? column.stages : defaultStagesForLifecycle(column.lifecycleStatus))
    .filter((stage) => (
      !REMOVED_BOARD_STAGE_IDS.has(stage.id) &&
      !REMOVED_BOARD_STAGE_IDS.has(stage.presetId || '')
    ));

export const normalizeBoardColumns = (settings?: StartupBoardSettings | null): StartupBoardColumn[] => {
  const inputColumns = Array.isArray(settings?.columns) ? settings.columns : DEFAULT_BOARD_COLUMNS;
  const byId = new Map(inputColumns.map((column) => [column.id, column]));
  const requiredColumns = DEFAULT_BOARD_COLUMNS
    .filter((column) => REQUIRED_BOARD_COLUMN_IDS.has(column.id))
    .map((column) => ({
      ...column,
      ...(byId.get(column.id) || {}),
      locked: true,
      kind: 'system' as const,
      systemStatus: column.systemStatus,
      lifecycleStatus: column.lifecycleStatus,
    }));
  const optionalColumns = inputColumns
    .filter((column) => !REQUIRED_BOARD_COLUMN_IDS.has(column.id))
    .filter((column) => CUSTOM_COLUMN_LIFECYCLES.includes(column.lifecycleStatus))
    .map((column) => ({
      ...column,
      kind: column.kind || 'custom',
      color: column.color || '#8b5cf6',
      order: Number.isFinite(Number(column.order)) ? Number(column.order) : 150,
      locked: false,
    }));

  return [...requiredColumns, ...optionalColumns]
    .sort((a, b) => {
      if (a.lifecycleStatus === 'new') return -1;
      if (b.lifecycleStatus === 'new') return 1;
      if (a.lifecycleStatus === 'portfolio') return 1;
      if (b.lifecycleStatus === 'portfolio') return -1;
      return a.order - b.order;
    })
    .map((column, index) => ({ ...column, order: index * 100 }));
};

export const buildBoardSettings = (columns: StartupBoardColumn[]): StartupBoardSettings => ({
  version: 1,
  columns: normalizeBoardColumns({ version: 1, columns }),
});

export const columnIdForStartup = (startup: Startup, columns: StartupBoardColumn[]): string => {
  if (startup.boardColumnId && columns.some((column) => column.id === startup.boardColumnId && column.lifecycleStatus === startup.status)) {
    return startup.boardColumnId;
  }
  return columns.find((column) => column.systemStatus === startup.status)?.id ||
    columns.find((column) => column.lifecycleStatus === startup.status)?.id ||
    'sys_new';
};

export const columnForStartup = (startup: Startup, columns: StartupBoardColumn[]): StartupBoardColumn | undefined => {
  const id = columnIdForStartup(startup, columns);
  return columns.find((column) => column.id === id);
};
