import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import { darkTheme } from '../../../styles/theme';
import { createEmptyPortfolioQuickFilters, type PortfolioDashboardFilterOptions } from '../portfolioDashboard';
import { PortfolioQuickFilters, type PortfolioQuickFilterLabels } from './PortfolioQuickFilters';

const options: PortfolioDashboardFilterOptions = {
  industries: [{ value: 'fintech', label: 'FinTech', count: 1, isMissing: false }],
  stages: [{ value: 'seed', label: 'Seed', count: 1, isMissing: false }],
  statuses: [],
  portfolioTypes: [],
  managerIds: [],
};

const labels: PortfolioQuickFilterLabels = {
  industries: 'Сектор',
  stages: 'Стадия',
  statuses: 'Статус',
  portfolioTypes: 'Тип портфеля',
  managerIds: 'Менеджер',
  segment: 'Направление',
  filters: 'Фильтры',
  activeFilters: 'Активные фильтры',
  resetAll: 'Сбросить все',
  close: 'Закрыть фильтры',
  noOptions: 'Нет вариантов',
  showCount: (count) => `Показать: ${count}`,
  removeFilter: (group, option) => `Убрать фильтр ${group}: ${option}`,
};

const segmentOptions = [
  { value: 'all', label: 'Все направления', count: 12, isMissing: false },
  { value: 'marketplace', label: 'Marketplace', count: 4, isMissing: false },
  { value: 'saas', label: 'SaaS', count: 8, isMissing: false },
];

function renderFilters(
  onChange = vi.fn(),
  segmentValue = 'all',
  onSegmentChange = vi.fn(),
) {
  function TestHarness() {
    const [drawerTarget, setDrawerTarget] = useState<HTMLElement | null>(null);
    const [selectedSegment, setSelectedSegment] = useState(segmentValue);

    return (
      <>
        <PortfolioQuickFilters
          value={createEmptyPortfolioQuickFilters()}
          options={options}
          segmentFilter={{
            value: selectedSegment,
            allValue: 'all',
            options: segmentOptions,
            onChange: (nextValue) => {
              setSelectedSegment(nextValue);
              onSegmentChange(nextValue);
            },
          }}
          labels={labels}
          resultCount={12}
          onChange={onChange}
          drawerTarget={drawerTarget}
        />
        <aside ref={setDrawerTarget} />
      </>
    );
  }

  return render(
    <ThemeProvider theme={darkTheme}>
      <TestHarness />
    </ThemeProvider>,
  );
}

describe('PortfolioQuickFilters', () => {
  it('opens all filter groups in one panel and closes on Escape', () => {
    renderFilters();
    const trigger = screen.getByRole('button', { name: 'Фильтры' });

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: 'Фильтры' })).not.toBeNull();
    expect(screen.getByText('Сектор')).not.toBeNull();
    expect(screen.getByText('Стадия')).not.toBeNull();
    expect(screen.getByText('Статус')).not.toBeNull();
    expect(screen.getByText('Тип портфеля')).not.toBeNull();
    expect(screen.getByText('Менеджер')).not.toBeNull();
    expect(screen.getByText('Направление')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Показать: 12' })).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Фильтры' })).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('applies checkbox selections immediately', () => {
    const onChange = vi.fn();
    renderFilters(onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /FinTech/ }));

    expect(onChange).toHaveBeenCalledWith({
      ...createEmptyPortfolioQuickFilters(),
      industries: ['fintech'],
    });
  });

  it('keeps the segment as a single-select filter with counts', () => {
    const onSegmentChange = vi.fn();
    renderFilters(vi.fn(), 'all', onSegmentChange);

    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
    const allSegments = screen.getByRole('radio', { name: /Все направления/ }) as HTMLInputElement;
    const saas = screen.getByRole('radio', { name: /SaaS/ }) as HTMLInputElement;
    expect(allSegments.checked).toBe(true);
    fireEvent.click(saas);

    expect(onSegmentChange).toHaveBeenCalledWith('saas');
    expect(saas.checked).toBe(true);
    expect(allSegments.checked).toBe(false);
  });

  it('shows only an active segment chip and clears it back to all', () => {
    const onSegmentChange = vi.fn();
    renderFilters(vi.fn(), 'saas', onSegmentChange);

    expect(screen.getByRole('button', { name: 'Фильтры' }).textContent).toContain('1');
    expect(screen.getByText('Направление: SaaS')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', {
      name: 'Убрать фильтр Направление: SaaS',
    }));

    expect(onSegmentChange).toHaveBeenCalledWith('all');
  });

  it('resets the segment and checkbox filters together', () => {
    const onChange = vi.fn();
    const onSegmentChange = vi.fn();
    renderFilters(onChange, 'saas', onSegmentChange);

    fireEvent.click(screen.getByRole('button', { name: /Фильтры/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить все' }));

    expect(onChange).toHaveBeenCalledWith(createEmptyPortfolioQuickFilters());
    expect(onSegmentChange).toHaveBeenCalledWith('all');
  });
});
