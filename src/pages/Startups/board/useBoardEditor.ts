import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import type {
  Organization,
  Startup,
  StartupBoardColumn,
  StartupBoardColumnStage,
  StartupBoardSettings,
} from '../../../types';
import { organizationApi, startupsApi } from '../../../services/api';
import {
  buildBoardSettings,
  columnIdForStartup,
  normalizeBoardColumns,
} from '../boardColumns';
import type { ToastApi } from '../../../components/ui/Toast';

type UndoFrame =
  | { kind: 'columns'; prevSettings: StartupBoardSettings }
  | {
      kind: 'delete';
      prevSettings: StartupBoardSettings;
      column: StartupBoardColumn;
      movedStartupIds: string[];
    };

interface PendingCommit {
  settings: StartupBoardSettings;
  prevSettings: StartupBoardSettings;
  toastKey: string;
}

interface UseBoardEditorArgs {
  organizationId: string;
  columns: StartupBoardColumn[];
  setColumns: (columns: StartupBoardColumn[]) => void;
  updateOrganization: (patch: Partial<Organization>) => void;
  startups: Startup[];
  setStartups: React.Dispatch<React.SetStateAction<Startup[]>>;
  toast: ToastApi;
  t: TFunction;
  onEditingChange?: (editing: boolean) => void;
}

export interface BoardEditorApi {
  rename: (columnId: string, label: string) => void;
  recolor: (columnId: string, color: string) => void;
  reorder: (fromId: string, toIndex: number) => void;
  addColumn: () => string;
  editStages: (columnId: string, stages: StartupBoardColumnStage[]) => void;
  deleteColumn: (column: StartupBoardColumn, targetColumnId: string) => Promise<void>;
  isSaving: boolean;
}

const RENAME_DEBOUNCE_MS = 700;
const RECOLOR_DEBOUNCE_MS = 400;

const findLabelError = (settings: StartupBoardSettings): 'empty' | 'duplicate' | null => {
  const seen = new Set<string>();
  for (const column of settings.columns) {
    const label = column.label.trim();
    if (!label) return 'empty';
    const key = label.toLocaleLowerCase('ru');
    if (seen.has(key)) return 'duplicate';
    seen.add(key);
  }
  return null;
};

export const useBoardEditor = ({
  organizationId,
  columns,
  setColumns,
  updateOrganization,
  startups,
  setStartups,
  toast,
  t,
  onEditingChange,
}: UseBoardEditorArgs): BoardEditorApi => {
  const [isSaving, setIsSaving] = useState(false);

  const columnsRef = useRef(columns);
  const startupsRef = useRef(startups);
  const pendingRef = useRef<PendingCommit | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { startupsRef.current = startups; }, [startups]);

  const setEditing = useCallback((editing: boolean) => {
    onEditingChange?.(editing);
  }, [onEditingChange]);

  const performUndo = useCallback(async (frame: UndoFrame) => {
    setIsSaving(true);
    setEditing(true);
    try {
      setColumns(normalizeBoardColumns(frame.prevSettings));
      const response = await organizationApi.updateStartupBoardSettings(organizationId, frame.prevSettings);
      if (!response.success || !response.data) {
        toast.error(t('startups.boardEditor.toast.error'));
        return;
      }
      const saved = response.data.startupBoardSettings || frame.prevSettings;
      updateOrganization({ startupBoardSettings: saved });
      setColumns(normalizeBoardColumns(saved));

      if (frame.kind === 'delete' && frame.movedStartupIds.length) {
        const { column, movedStartupIds } = frame;
        const boardColumnId = column.kind === 'custom' ? column.id : undefined;
        await Promise.all(movedStartupIds.map((id) =>
          startupsApi.update(id, { status: column.lifecycleStatus, boardColumnId } as Parameters<typeof startupsApi.update>[1]),
        ));
        const movedSet = new Set(movedStartupIds);
        setStartups((prev) => prev.map((startup) => (
          movedSet.has(startup.id)
            ? { ...startup, status: column.lifecycleStatus, boardColumnId }
            : startup
        )));
        toast.success(t('startups.boardEditor.toast.deleteUndone', { count: movedStartupIds.length }));
      } else {
        toast.success(t('startups.boardEditor.toast.undone'));
      }
    } catch {
      toast.error(t('startups.boardEditor.toast.error'));
    } finally {
      setIsSaving(false);
      setEditing(false);
    }
  }, [organizationId, setColumns, updateOrganization, setStartups, toast, t, setEditing]);

  const flushCommit = useCallback(async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    const labelError = findLabelError(pending.settings);
    if (labelError) {
      setColumns(normalizeBoardColumns(pending.prevSettings));
      toast.error(t(`startups.boardEditor.toast.${labelError === 'empty' ? 'emptyLabel' : 'duplicateLabel'}`));
      setEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const response = await organizationApi.updateStartupBoardSettings(organizationId, pending.settings);
      if (!response.success || !response.data) {
        setColumns(normalizeBoardColumns(pending.prevSettings));
        toast.error(response.error || t('startups.boardEditor.toast.error'));
        return;
      }
      const saved = response.data.startupBoardSettings || pending.settings;
      updateOrganization({ startupBoardSettings: saved });
      setColumns(normalizeBoardColumns(saved));
      const frame: UndoFrame = { kind: 'columns', prevSettings: pending.prevSettings };
      toast.success(t(pending.toastKey), {
        action: { label: t('startups.boardEditor.toast.undo'), onAction: () => void performUndo(frame) },
      });
    } catch (error) {
      setColumns(normalizeBoardColumns(pending.prevSettings));
      toast.error(error instanceof Error ? error.message : t('startups.boardEditor.toast.error'));
    } finally {
      setIsSaving(false);
      setEditing(false);
    }
  }, [organizationId, setColumns, updateOrganization, toast, t, performUndo, setEditing]);

  const commit = useCallback((
    nextColumns: StartupBoardColumn[],
    opts: { toastKey: string; debounceMs?: number },
  ) => {
    const normalized = normalizeBoardColumns({ version: 1, columns: nextColumns });
    const prevSettings = pendingRef.current
      ? pendingRef.current.prevSettings
      : buildBoardSettings(columnsRef.current);

    setColumns(normalized);
    setEditing(true);
    pendingRef.current = {
      settings: buildBoardSettings(normalized),
      prevSettings,
      toastKey: opts.toastKey,
    };
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (opts.debounceMs && opts.debounceMs > 0) {
      timerRef.current = window.setTimeout(() => void flushCommit(), opts.debounceMs);
    } else {
      void flushCommit();
    }
  }, [setColumns, flushCommit, setEditing]);

  const rename = useCallback((columnId: string, label: string) => {
    const next = columnsRef.current.map((column) => (
      column.id === columnId ? { ...column, label } : column
    ));
    commit(next, { toastKey: 'startups.boardEditor.toast.renamed', debounceMs: RENAME_DEBOUNCE_MS });
  }, [commit]);

  const recolor = useCallback((columnId: string, color: string) => {
    const next = columnsRef.current.map((column) => (
      column.id === columnId ? { ...column, color } : column
    ));
    commit(next, { toastKey: 'startups.boardEditor.toast.recolored', debounceMs: RECOLOR_DEBOUNCE_MS });
  }, [commit]);

  const reorder = useCallback((fromId: string, toIndex: number) => {
    const current = columnsRef.current;
    const fromIndex = current.findIndex((column) => column.id === fromId);
    if (fromIndex < 0) return;
    const clamped = Math.min(Math.max(toIndex, 1), current.length - 2);
    if (fromIndex === clamped || current[fromIndex]?.locked) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(clamped, 0, moved);
    next.forEach((column, index) => { column.order = index * 100; });
    commit(next, { toastKey: 'startups.boardEditor.toast.reordered' });
  }, [commit]);

  const addColumn = useCallback((): string => {
    const current = columnsRef.current;
    const nextIndex = current.filter((column) => column.kind === 'custom').length + 1;
    const id = `custom_${Date.now().toString(36)}`;
    const next: StartupBoardColumn[] = [
      ...current,
      {
        id,
        kind: 'custom',
        label: `${t('startups.boardEditor.addColumn')} ${nextIndex}`,
        color: '#06b6d4',
        order: 150 + nextIndex * 10,
        lifecycleStatus: 'pipeline',
      },
    ];
    commit(next, { toastKey: 'startups.boardEditor.toast.added' });
    return id;
  }, [commit, t]);

  const editStages = useCallback((columnId: string, stages: StartupBoardColumnStage[]) => {
    const next = columnsRef.current.map((column) => (
      column.id === columnId ? { ...column, stages } : column
    ));
    commit(next, { toastKey: 'startups.boardEditor.toast.saved' });
  }, [commit]);

  const deleteColumn = useCallback(async (column: StartupBoardColumn, targetColumnId: string) => {
    if (column.locked || !organizationId) return;
    const prevSettings = buildBoardSettings(columnsRef.current);
    const movedStartupIds = startupsRef.current
      .filter((startup) => columnIdForStartup(startup, columnsRef.current) === column.id)
      .map((startup) => startup.id);

    setIsSaving(true);
    setEditing(true);
    try {
      const response = await organizationApi.deleteStartupBoardColumn(organizationId, column.id, targetColumnId);
      if (!response.success || !response.data?.organization) {
        toast.error(response.error || t('startups.boardEditor.toast.error'));
        return;
      }
      const saved = response.data.organization.startupBoardSettings || prevSettings;
      const movedCount = response.data.movedCount ?? movedStartupIds.length;
      updateOrganization({ startupBoardSettings: saved });
      const normalized = normalizeBoardColumns(saved);
      setColumns(normalized);
      const target = normalized.find((candidate) => candidate.id === targetColumnId);
      const movedSet = new Set(movedStartupIds);
      setStartups((prev) => prev.map((startup) => (
        movedSet.has(startup.id)
          ? {
              ...startup,
              status: target?.lifecycleStatus || startup.status,
              boardColumnId: targetColumnId.startsWith('sys_') ? undefined : targetColumnId,
            }
          : startup
      )));
      const frame: UndoFrame = { kind: 'delete', prevSettings, column, movedStartupIds };
      toast.success(t('startups.boardEditor.toast.deleted', { count: movedCount }), {
        action: { label: t('startups.boardEditor.toast.undo'), onAction: () => void performUndo(frame) },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('startups.boardEditor.toast.error'));
    } finally {
      setIsSaving(false);
      setEditing(false);
    }
  }, [organizationId, setColumns, updateOrganization, setStartups, toast, t, performUndo, setEditing]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return { rename, recolor, reorder, addColumn, editStages, deleteColumn, isSaving };
};
