import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type TransitionEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, LockKeyhole, RotateCcw, X } from 'lucide-react';
import styled from 'styled-components';
import {
  DEFAULT_PORTFOLIO_COLUMN_PREFERENCES,
  REQUIRED_PORTFOLIO_COLUMN_ID,
  isPortfolioColumnId,
  normalizePortfolioColumnPreferences,
  type PortfolioColumnId,
  type PortfolioColumnPreferences,
} from '../portfolioColumns';

export interface PortfolioColumnManagerCopy {
  title: string;
  description: string;
  close: string;
  dragColumn: string;
  showColumn: string;
  requiredColumn: string;
  reset: string;
  cancel: string;
  save: string;
  saving: string;
  visibleCount: (visible: number, total: number) => string;
}

const DEFAULT_COPY: PortfolioColumnManagerCopy = {
  title: 'Настройка колонок',
  description: 'Измените порядок и выберите колонки для отображения.',
  close: 'Закрыть настройку колонок',
  dragColumn: 'Переместить колонку',
  showColumn: 'Показывать колонку',
  requiredColumn: 'Обязательная колонка',
  reset: 'Сбросить',
  cancel: 'Отмена',
  save: 'Сохранить',
  saving: 'Сохранение…',
  visibleCount: (visible, total) => `Показано ${visible} из ${total}`,
};

const DRAWER_ENTER_MOTION_MS = 560;
const DRAWER_EXIT_MOTION_MS = 380;
const DRAWER_EXIT_FALLBACK_MS = DRAWER_EXIT_MOTION_MS + 100;

export interface PortfolioColumnManagerProps {
  open: boolean;
  preferences: PortfolioColumnPreferences | unknown;
  columnLabels: Readonly<Partial<Record<PortfolioColumnId, string>>>;
  onCancel: () => void;
  onSave: (preferences: PortfolioColumnPreferences) => void | Promise<void>;
  onPreview?: (preferences: PortfolioColumnPreferences) => void;
  copy?: Partial<PortfolioColumnManagerCopy>;
  isSaving?: boolean;
  error?: string | null;
  isFullscreen?: boolean;
  className?: string;
}

interface SortableColumnRowProps {
  columnId: PortfolioColumnId;
  label: string;
  visible: boolean;
  copy: PortfolioColumnManagerCopy;
  onVisibleChange: (columnId: PortfolioColumnId, visible: boolean) => void;
}

function SortableColumnRow({
  columnId,
  label,
  visible,
  copy,
  onVisibleChange,
}: SortableColumnRowProps) {
  const isRequired = columnId === REQUIRED_PORTFOLIO_COLUMN_ID;
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId, disabled: isRequired });

  return (
    <ColumnRow
      ref={setNodeRef}
      $hidden={!visible}
      $dragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <DragHandle
        ref={setActivatorNodeRef}
        type="button"
        disabled={isRequired}
        aria-label={`${copy.dragColumn}: ${label}`}
        title={isRequired ? copy.requiredColumn : copy.dragColumn}
        {...attributes as ButtonHTMLAttributes<HTMLButtonElement>}
        {...listeners}
      >
        {isRequired ? <LockKeyhole aria-hidden="true" /> : <GripVertical aria-hidden="true" />}
      </DragHandle>

      <ColumnLabel title={label}>{label}</ColumnLabel>

      <VisibilityLabel title={isRequired ? copy.requiredColumn : copy.showColumn}>
        <VisibilityCheckbox
          type="checkbox"
          checked={visible}
          disabled={isRequired}
          onChange={(event) => onVisibleChange(columnId, event.currentTarget.checked)}
          aria-label={`${copy.showColumn}: ${label}`}
        />
        <CheckboxVisual aria-hidden="true">
          {visible ? <Check /> : null}
        </CheckboxVisual>
      </VisibilityLabel>
    </ColumnRow>
  );
}

export function PortfolioColumnManager({
  open,
  preferences,
  columnLabels,
  onCancel,
  onSave,
  onPreview,
  copy: copyOverrides,
  isSaving = false,
  error,
  isFullscreen = false,
  className,
}: PortfolioColumnManagerProps) {
  const copy = useMemo<PortfolioColumnManagerCopy>(() => ({
    ...DEFAULT_COPY,
    ...copyOverrides,
  }), [copyOverrides]);
  const [draft, setDraft] = useState<PortfolioColumnPreferences>(() => (
    normalizePortfolioColumnPreferences(preferences)
  ));
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const enterFrameRef = useRef<number | null>(null);
  const enterPaintFrameRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const initialPreferencesRef = useRef<PortfolioColumnPreferences>(
    normalizePortfolioColumnPreferences(preferences),
  );
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const openRef = useRef(open);
  openRef.current = open;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (enterFrameRef.current !== null) {
      window.cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }
    if (enterPaintFrameRef.current !== null) {
      window.cancelAnimationFrame(enterPaintFrameRef.current);
      enterPaintFrameRef.current = null;
    }
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (open) {
      setPresent(true);
      setEntered(false);
      enterFrameRef.current = window.requestAnimationFrame(() => {
        enterFrameRef.current = null;
        enterPaintFrameRef.current = window.requestAnimationFrame(() => {
          enterPaintFrameRef.current = null;
          if (openRef.current) setEntered(true);
        });
      });
    } else {
      setEntered(false);
      exitTimerRef.current = window.setTimeout(() => {
        exitTimerRef.current = null;
        if (!openRef.current) setPresent(false);
      }, DRAWER_EXIT_FALLBACK_MS);
    }

    return () => {
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }
      if (enterPaintFrameRef.current !== null) {
        window.cancelAnimationFrame(enterPaintFrameRef.current);
        enterPaintFrameRef.current = null;
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [open]);

  const updateDraft = useCallback((nextValue: PortfolioColumnPreferences | unknown) => {
    const normalized = normalizePortfolioColumnPreferences(nextValue);
    setDraft(normalized);
    onPreview?.(normalized);
  }, [onPreview]);

  const restoreFocus = useCallback(() => {
    const returnTarget = returnFocusRef.current;
    if (returnTarget?.isConnected) returnTarget.focus();
    returnFocusRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    restoreFocus();
    onPreview?.(initialPreferencesRef.current);
    onCancel();
  }, [onCancel, onPreview, restoreFocus]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const initialPreferences = normalizePortfolioColumnPreferences(preferencesRef.current);
    initialPreferencesRef.current = initialPreferences;
    if (!returnFocusRef.current?.isConnected) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    setDraft(initialPreferences);
    focusFrameRef.current = window.requestAnimationFrame(() => {
      focusFrameRef.current = window.requestAnimationFrame(() => {
        focusFrameRef.current = null;
        if (openRef.current) closeButtonRef.current?.focus();
      });
    });

    return () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      restoreFocus();
    };
  }, [open, restoreFocus]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [cancel, open]);

  const hiddenIds = useMemo(() => new Set(draft.hiddenColumnIds), [draft.hiddenColumnIds]);
  const visibleCount = draft.columnOrder.length - hiddenIds.size;

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    if (!isPortfolioColumnId(active.id) || !isPortfolioColumnId(over.id)) return;
    if (active.id === REQUIRED_PORTFOLIO_COLUMN_ID) return;

    const oldIndex = draft.columnOrder.indexOf(active.id);
    const overIndex = draft.columnOrder.indexOf(over.id);
    if (oldIndex < 0 || overIndex < 0) return;

    const nextIndex = Math.max(1, overIndex);
    updateDraft({
      ...draft,
      columnOrder: arrayMove([...draft.columnOrder], oldIndex, nextIndex),
    });
  }, [draft, updateDraft]);

  const handleVisibleChange = useCallback((columnId: PortfolioColumnId, visible: boolean) => {
    if (columnId === REQUIRED_PORTFOLIO_COLUMN_ID) return;
    const nextHiddenIds = new Set(draft.hiddenColumnIds);
    if (visible) nextHiddenIds.delete(columnId);
    else nextHiddenIds.add(columnId);

    updateDraft({
      ...draft,
      hiddenColumnIds: [...nextHiddenIds],
    });
  }, [draft, updateDraft]);

  const reset = useCallback(() => {
    updateDraft(DEFAULT_PORTFOLIO_COLUMN_PREFERENCES);
  }, [updateDraft]);

  const save = useCallback(() => {
    const normalized = normalizePortfolioColumnPreferences(draft);
    setDraft(normalized);
    onPreview?.(normalized);
    void onSave(normalized);
  }, [draft, onPreview, onSave]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform' || openRef.current) return;
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setPresent(false);
  };

  if (!present || typeof document === 'undefined') return null;

  const motionState = open
    ? (entered ? 'open' : 'opening')
    : 'closing';

  return createPortal(
    <PortalLayer
      $entered={open && entered}
      $fullscreen={isFullscreen}
      $interactive={open}
      className={className}
      data-state={motionState}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <Panel
        $entered={open && entered}
        $interactive={open}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        inert={!open}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-floating-panel="portfolio-column-manager"
        data-state={motionState}
        onTransitionEnd={handleTransitionEnd}
      >
        <Header>
          <HeadingGroup>
            <Title id={titleId}>{copy.title}</Title>
            <Description id={descriptionId}>{copy.description}</Description>
          </HeadingGroup>
          <CloseButton
            ref={closeButtonRef}
            type="button"
            aria-label={copy.close}
            title={copy.close}
            onClick={cancel}
          >
            <X aria-hidden="true" />
          </CloseButton>
        </Header>

        <Count aria-live="polite">
          {copy.visibleCount(visibleCount, draft.columnOrder.length)}
        </Count>

        <ColumnList>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={[...draft.columnOrder]}
              strategy={verticalListSortingStrategy}
            >
              {draft.columnOrder.map((columnId) => (
                <SortableColumnRow
                  key={columnId}
                  columnId={columnId}
                  label={columnLabels[columnId] ?? columnId}
                  visible={!hiddenIds.has(columnId)}
                  copy={copy}
                  onVisibleChange={handleVisibleChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        </ColumnList>

        {error ? <ErrorMessage role="alert">{error}</ErrorMessage> : null}

        <Footer>
          <ResetButton type="button" onClick={reset} disabled={isSaving}>
            <RotateCcw aria-hidden="true" />
            {copy.reset}
          </ResetButton>
          <FooterActions>
            <SecondaryButton type="button" onClick={cancel} disabled={isSaving}>
              {copy.cancel}
            </SecondaryButton>
            <SaveButton type="button" onClick={save} disabled={isSaving}>
              {isSaving ? copy.saving : copy.save}
            </SaveButton>
          </FooterActions>
        </Footer>
      </Panel>
    </PortalLayer>,
    document.body,
  );
}

const PortalLayer = styled.div<{
  $entered: boolean;
  $fullscreen: boolean;
  $interactive: boolean;
}>`
  position: fixed;
  inset: 0;
  z-index: ${({ $fullscreen }) => ($fullscreen ? 1220 : 1200)};
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
  pointer-events: ${({ $interactive }) => ($interactive ? 'auto' : 'none')};

  &::before {
    position: absolute;
    inset: 0;
    background: linear-gradient(to left, rgba(0, 0, 0, 0.18), transparent 68%);
    backdrop-filter: ${({ $entered }) => ($entered ? 'blur(1.5px)' : 'blur(0)')};
    content: '';
    opacity: ${({ $entered }) => ($entered ? 1 : 0)};
    transition:
      opacity ${({ $entered }) => ($entered ? 440 : 280)}ms ease,
      backdrop-filter ${({ $entered }) => ($entered ? 440 : 280)}ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition-duration: 1ms;
      backdrop-filter: none;
    }
  }
`;

const Panel = styled.aside<{ $entered: boolean; $interactive: boolean }>`
  pointer-events: ${({ $interactive }) => ($interactive ? 'auto' : 'none')};
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  height: 100dvh;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border-left: 1px solid ${({ theme }) => theme.colors.border.primary};
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.34);
  opacity: ${({ $entered }) => ($entered ? 1 : 0.35)};
  transform: translate3d(${({ $entered }) => ($entered ? '0' : 'calc(100% + 32px)')}, 0, 0);
  transition:
    transform ${({ $entered }) => (
      $entered ? DRAWER_ENTER_MOTION_MS : DRAWER_EXIT_MOTION_MS
    )}ms ${({ $entered }) => (
      $entered ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'cubic-bezier(0.4, 0, 1, 1)'
    )},
    opacity ${({ $entered }) => ($entered ? 360 : 240)}ms ease-out;
  backface-visibility: hidden;
  will-change: transform, opacity;

  @media (prefers-reduced-motion: reduce) {
    transition-duration: 1ms;
    opacity: 1;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const HeadingGroup = styled.div`
  min-width: 0;
  flex: 1;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  line-height: 1.3;
`;

const Description = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.45;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  padding: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-color: ${({ theme }) => theme.colors.border.primary};
    outline: none;
  }

  svg {
    width: 19px;
    height: 19px;
  }
`;

const Count = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.primary};
`;

const ColumnList = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
`;

const ColumnRow = styled.div<{ $hidden: boolean; $dragging: boolean }>`
  position: relative;
  z-index: ${({ $dragging }) => ($dragging ? 2 : 1)};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 46px;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  opacity: ${({ $hidden, $dragging }) => ($dragging ? 0.82 : ($hidden ? 0.58 : 1))};
  background: ${({ theme, $dragging }) => (
    $dragging ? theme.colors.bg.tertiary : theme.colors.bg.card
  )};
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ $dragging }) => ($dragging ? '0 8px 22px rgba(0, 0, 0, 0.2)' : 'none')};

  & + & {
    margin-top: ${({ theme }) => theme.spacing[2]};
  }
`;

const DragHandle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  padding: 0;
  color: ${({ theme }) => theme.colors.text.muted};
  background: transparent;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: grab;
  touch-action: none;

  &:hover:not(:disabled),
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
    outline: none;
  }

  &:active:not(:disabled) {
    cursor: grabbing;
  }

  &:disabled {
    cursor: default;
    opacity: 0.62;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ColumnLabel = styled.span`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const VisibilityLabel = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  cursor: pointer;
`;

const VisibilityCheckbox = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;

  &:focus-visible + span {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 2px;
  }

  &:disabled + span {
    cursor: default;
    opacity: 0.65;
  }
`;

const CheckboxVisual = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #ffffff;
  background: ${({ theme }) => theme.colors.accent.primary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: 5px;
  cursor: pointer;

  &:empty {
    background: transparent;
    border-color: ${({ theme }) => theme.colors.border.primary};
  }

  svg {
    width: 14px;
    height: 14px;
    stroke-width: 3;
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]} 0;
  color: ${({ theme }) => theme.colors.status.error};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.primary};

  @media (max-width: 440px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const BaseFooterButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 38px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ResetButton = styled(BaseFooterButton)`
  color: ${({ theme }) => theme.colors.text.muted};
  background: transparent;
  border: 1px solid transparent;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const FooterActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};

  @media (max-width: 440px) {
    & > button {
      flex: 1;
    }
  }
`;

const SecondaryButton = styled(BaseFooterButton)`
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const SaveButton = styled(BaseFooterButton)`
  color: #ffffff;
  background: ${({ theme }) => theme.colors.accent.primary};
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.accent.primaryHover};
  }
`;
