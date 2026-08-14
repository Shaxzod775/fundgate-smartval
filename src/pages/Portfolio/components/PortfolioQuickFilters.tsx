import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import styled from 'styled-components';
import {
  createEmptyPortfolioQuickFilters,
  type PortfolioDashboardFilterOption,
  type PortfolioDashboardFilterOptions,
  type PortfolioQuickFilters as PortfolioQuickFiltersValue,
} from '../portfolioDashboard';

type PortfolioQuickFilterKey = keyof PortfolioQuickFiltersValue;

export interface PortfolioQuickFilterLabels {
  industries: string;
  stages: string;
  statuses: string;
  portfolioTypes: string;
  managerIds: string;
  segment: string;
  filters: string;
  activeFilters: string;
  resetAll: string;
  close: string;
  noOptions: string;
  showCount: (count: number) => string;
  removeFilter: (groupLabel: string, optionLabel: string) => string;
}

export interface PortfolioSegmentFilterControl {
  value: string;
  allValue: string;
  options: readonly PortfolioDashboardFilterOption[];
  onChange: (value: string) => void;
}

export interface PortfolioQuickFiltersProps {
  value: PortfolioQuickFiltersValue;
  options: PortfolioDashboardFilterOptions;
  segmentFilter?: PortfolioSegmentFilterControl;
  labels: PortfolioQuickFilterLabels;
  resultCount: number;
  onChange: (nextValue: PortfolioQuickFiltersValue) => void;
  drawerTarget?: HTMLElement | null;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const FILTER_KEYS: readonly PortfolioQuickFilterKey[] = [
  'industries',
  'stages',
  'statuses',
  'portfolioTypes',
  'managerIds',
];

const Root = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
`;

const TriggerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterButton = styled.button<{ $open: boolean }>`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid ${({ $open, theme }) => $open ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $open, theme }) => $open ? theme.colors.accent.primary : theme.colors.bg.card};
  color: ${({ $open, theme }) => $open ? '#ffffff' : theme.colors.text.primary};
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  svg {
    width: 15px;
    height: 15px;
  }

  .chevron {
    transition: transform 160ms ease;
    transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
  }
`;

const SelectedCount = styled.span<{ $inverted?: boolean }>`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${({ $inverted, theme }) => $inverted ? 'rgba(255, 255, 255, 0.2)' : theme.colors.accent.primary};
  color: #ffffff;
  font-size: 10px;
  line-height: 1;
  font-weight: 900;
`;

const FilterPanel = styled.div<{ $open: boolean }>`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.bg.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  opacity: ${({ $open }) => $open ? 1 : 0};
  transform: translateX(${({ $open }) => $open ? '0' : '24px'});
  pointer-events: ${({ $open }) => $open ? 'auto' : 'none'};
  transition:
    opacity 180ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const PanelHeader = styled.div`
  flex: 0 0 auto;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;
  font-weight: 900;

  svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 1px;
  }

  svg { width: 16px; height: 16px; }
`;

const OptionsGrid = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.fieldset<{ $wide?: boolean; $rightColumn?: boolean }>`
  min-width: 0;
  margin: 0;
  padding: 16px;
  border: 0;
  border-right: ${({ $rightColumn, $wide, theme }) =>
    $rightColumn || $wide ? '0' : `1px solid ${theme.colors.border.subtle}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  grid-column: ${({ $wide }) => $wide ? '1 / -1' : 'auto'};

  @media (max-width: 680px) {
    grid-column: auto;
    border-right: 0;
  }
`;

const GroupTitle = styled.legend`
  width: 100%;
  margin: 0 0 8px;
  padding: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 900;
`;

const OptionsList = styled.div<{ $wide?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $wide }) => $wide ? 'repeat(2, minmax(0, 1fr))' : '1fr'};
  gap: 2px 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const OptionLabel = styled.label`
  min-width: 0;
  min-height: 34px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: -2px;
  }

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const OptionText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OptionCount = styled.span`
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 10px;
  font-weight: 800;
  text-align: center;
`;

const EmptyOptions = styled.div`
  padding: 12px 7px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
`;

const PanelFooter = styled.div`
  flex: 0 0 auto;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.card};
`;

const ResetButton = styled.button`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  svg { width: 14px; height: 14px; }
`;

const ShowButton = styled.button`
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.accent.primary};
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;

  &:hover { filter: brightness(1.08); }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const ActiveFilters = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
`;

const ActiveChip = styled.span`
  min-width: 0;
  max-width: 280px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 5px 3px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
`;

const ChipText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveChipButton = styled.button`
  width: 21px;
  height: 21px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent.primary};
    outline-offset: 1px;
  }

  svg { width: 13px; height: 13px; }
`;

interface ActiveFilter {
  key: PortfolioQuickFilterKey;
  value: string;
  optionLabel: string;
  groupLabel: string;
}

function getOptionLabel(options: readonly PortfolioDashboardFilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function PortfolioQuickFilters({
  value,
  options,
  segmentFilter,
  labels,
  resultCount,
  onChange,
  drawerTarget,
  onOpenChange,
  className,
}: PortfolioQuickFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const triggerId = useId();
  const activeFilters: ActiveFilter[] = FILTER_KEYS.flatMap((key) =>
    value[key].map((selectedValue) => ({
      key,
      value: selectedValue,
      optionLabel: getOptionLabel(options[key], selectedValue),
      groupLabel: labels[key],
    })),
  );
  const activeSegment = segmentFilter && segmentFilter.value !== segmentFilter.allValue
    ? {
        optionLabel: getOptionLabel(segmentFilter.options, segmentFilter.value),
        groupLabel: labels.segment,
      }
    : null;
  const selectedFilterCount = activeFilters.length + (activeSegment ? 1 : 0);
  const closePanel = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
    triggerRef.current?.focus();
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closePanel, isOpen, onOpenChange]);

  useEffect(() => () => onOpenChange?.(false), [onOpenChange]);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const toggleOption = (key: PortfolioQuickFilterKey, selectedValue: string) => {
    const currentValues = value[key];
    const nextValues = currentValues.includes(selectedValue)
      ? currentValues.filter((item) => item !== selectedValue)
      : [...currentValues, selectedValue];

    onChange({ ...value, [key]: nextValues });
  };

  const removeFilter = (key: PortfolioQuickFilterKey, selectedValue: string) => {
    onChange({
      ...value,
      [key]: value[key].filter((item) => item !== selectedValue),
    });
  };

  const resetAll = () => {
    onChange(createEmptyPortfolioQuickFilters());
    segmentFilter?.onChange(segmentFilter.allValue);
  };

  return (
    <Root ref={rootRef} className={className}>
      <TriggerRow>
        <FilterButton
          ref={triggerRef}
          id={triggerId}
          type="button"
          $open={isOpen}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpen(!isOpen)}
        >
          <SlidersHorizontal aria-hidden="true" />
          {labels.filters}
          {selectedFilterCount > 0 && (
            <SelectedCount $inverted={isOpen} aria-hidden="true">{selectedFilterCount}</SelectedCount>
          )}
          <ChevronDown className="chevron" aria-hidden="true" />
        </FilterButton>
      </TriggerRow>

      {drawerTarget && createPortal(
        <FilterPanel
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          aria-hidden={!isOpen}
          inert={!isOpen}
          $open={isOpen}
        >
          <PanelHeader>
            <PanelTitle>
              <SlidersHorizontal aria-hidden="true" />
              {labels.filters}
            </PanelTitle>
            <CloseButton type="button" aria-label={labels.close} onClick={closePanel}>
              <X aria-hidden="true" />
            </CloseButton>
          </PanelHeader>

          <OptionsGrid>
            {segmentFilter && (
              <FilterGroup $wide>
                <GroupTitle>{labels.segment}</GroupTitle>
                <OptionsList $wide>
                  {segmentFilter.options.map((option) => (
                    <OptionLabel key={option.value}>
                      <input
                        type="radio"
                        name={`${panelId}-segment`}
                        checked={segmentFilter.value === option.value}
                        onChange={() => segmentFilter.onChange(option.value)}
                      />
                      <OptionText title={option.label}>{option.label}</OptionText>
                      <OptionCount aria-label={String(option.count)}>{option.count}</OptionCount>
                    </OptionLabel>
                  ))}
                </OptionsList>
              </FilterGroup>
            )}
            {FILTER_KEYS.map((key, index) => {
              const selectedValues = value[key];
              const isWide = key === 'managerIds';
              return (
                <FilterGroup
                  key={key}
                  $wide={isWide}
                  $rightColumn={!isWide && index % 2 === 1}
                >
                  <GroupTitle>{labels[key]}</GroupTitle>
                  <OptionsList $wide={isWide}>
                    {options[key].length > 0 ? options[key].map((option) => (
                      <OptionLabel key={option.value}>
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option.value)}
                          onChange={() => toggleOption(key, option.value)}
                        />
                        <OptionText title={option.label}>{option.label}</OptionText>
                        <OptionCount aria-label={String(option.count)}>{option.count}</OptionCount>
                      </OptionLabel>
                    )) : (
                      <EmptyOptions>{labels.noOptions}</EmptyOptions>
                    )}
                  </OptionsList>
                </FilterGroup>
              );
            })}
          </OptionsGrid>

          <PanelFooter>
            <ResetButton
              type="button"
              disabled={selectedFilterCount === 0}
              onClick={resetAll}
            >
              <RotateCcw aria-hidden="true" />
              {labels.resetAll}
            </ResetButton>
            <ShowButton type="button" onClick={closePanel}>
              {labels.showCount(resultCount)}
            </ShowButton>
          </PanelFooter>
        </FilterPanel>,
        drawerTarget,
      )}

      {selectedFilterCount > 0 && (
        <ActiveFilters aria-label={labels.activeFilters}>
          {activeSegment && segmentFilter && (
            <ActiveChip>
              <ChipText>{activeSegment.groupLabel}: {activeSegment.optionLabel}</ChipText>
              <RemoveChipButton
                type="button"
                aria-label={labels.removeFilter(activeSegment.groupLabel, activeSegment.optionLabel)}
                onClick={() => segmentFilter.onChange(segmentFilter.allValue)}
              >
                <X aria-hidden="true" />
              </RemoveChipButton>
            </ActiveChip>
          )}
          {activeFilters.map((filter) => (
            <ActiveChip key={`${filter.key}:${filter.value}`}>
              <ChipText>{filter.groupLabel}: {filter.optionLabel}</ChipText>
              <RemoveChipButton
                type="button"
                aria-label={labels.removeFilter(filter.groupLabel, filter.optionLabel)}
                onClick={() => removeFilter(filter.key, filter.value)}
              >
                <X aria-hidden="true" />
              </RemoveChipButton>
            </ActiveChip>
          ))}
        </ActiveFilters>
      )}
    </Root>
  );
}
