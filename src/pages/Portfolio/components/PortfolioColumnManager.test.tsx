import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { darkTheme } from '../../../styles/theme';
import { DEFAULT_PORTFOLIO_COLUMN_PREFERENCES } from '../portfolioColumns';
import { PortfolioColumnManager } from './PortfolioColumnManager';

function renderManager(open: boolean) {
  return (
    <ThemeProvider theme={darkTheme}>
      <PortfolioColumnManager
        open={open}
        preferences={DEFAULT_PORTFOLIO_COLUMN_PREFERENCES}
        columnLabels={{}}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />
    </ThemeProvider>
  );
}

function FocusHarness() {
  const [open, setOpen] = useState(false);

  return (
    <ThemeProvider theme={darkTheme}>
      <button type="button" onClick={() => setOpen(true)}>Открыть колонки</button>
      <PortfolioColumnManager
        open={open}
        preferences={DEFAULT_PORTFOLIO_COLUMN_PREFERENCES}
        columnLabels={{}}
        onCancel={() => setOpen(false)}
        onSave={vi.fn()}
      />
    </ThemeProvider>
  );
}

afterEach(() => vi.useRealTimers());

describe('PortfolioColumnManager', () => {
  it('renders the drawer on an opaque dark-theme surface', () => {
    render(renderManager(true));

    const dialog = screen.getByRole('dialog', { name: 'Настройка колонок' });
    expect(window.getComputedStyle(dialog).backgroundColor).toBe('rgb(24, 24, 24)');
  });

  it('keeps the drawer mounted until the slide-out finishes', () => {
    vi.useFakeTimers();
    const view = render(renderManager(true));

    act(() => vi.advanceTimersByTime(40));
    const openedPanel = document.querySelector<HTMLElement>('[data-floating-panel="portfolio-column-manager"]');
    expect(openedPanel?.dataset.state).toBe('open');

    view.rerender(renderManager(false));
    const closingPanel = document.querySelector<HTMLElement>('[data-floating-panel="portfolio-column-manager"]');
    expect(closingPanel).not.toBeNull();
    expect(closingPanel?.dataset.state).toBe('closing');
    expect(closingPanel?.getAttribute('aria-hidden')).toBe('true');
    expect(closingPanel?.hasAttribute('inert')).toBe(true);

    act(() => vi.advanceTimersByTime(600));
    expect(document.querySelector('[data-floating-panel="portfolio-column-manager"]')).toBeNull();

    view.unmount();
    vi.useRealTimers();
  });

  it('does not unmount when reopened during the slide-out', () => {
    vi.useFakeTimers();
    const view = render(renderManager(true));

    act(() => vi.advanceTimersByTime(40));
    view.rerender(renderManager(false));
    act(() => vi.advanceTimersByTime(100));
    view.rerender(renderManager(true));
    act(() => vi.advanceTimersByTime(400));

    const reopenedPanel = document.querySelector<HTMLElement>('[data-floating-panel="portfolio-column-manager"]');
    expect(reopenedPanel).not.toBeNull();
    expect(reopenedPanel?.dataset.state).toBe('open');

    view.unmount();
    vi.useRealTimers();
  });

  it('uses distinct opening and closing motion states', () => {
    vi.useFakeTimers();
    const view = render(renderManager(true));

    const openingPanel = document.querySelector<HTMLElement>('[data-floating-panel="portfolio-column-manager"]');
    expect(openingPanel?.dataset.state).toBe('opening');

    act(() => vi.advanceTimersByTime(40));
    expect(openingPanel?.dataset.state).toBe('open');

    view.rerender(renderManager(false));
    expect(openingPanel?.dataset.state).toBe('closing');

    view.unmount();
    vi.useRealTimers();
  });

  it('closes when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ThemeProvider theme={darkTheme}>
        <PortfolioColumnManager
          open
          preferences={DEFAULT_PORTFOLIO_COLUMN_PREFERENCES}
          columnLabels={{}}
          onCancel={onCancel}
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Настройка колонок' });
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();

    fireEvent.mouseDown(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('unmounts on the transform transition end', () => {
    vi.useFakeTimers();
    const view = render(renderManager(true));

    act(() => vi.advanceTimersByTime(40));
    view.rerender(renderManager(false));
    const closingPanel = document.querySelector<HTMLElement>('[data-floating-panel="portfolio-column-manager"]');
    expect(closingPanel).not.toBeNull();

    fireEvent.transitionEnd(closingPanel!, { propertyName: 'opacity' });
    expect(document.querySelector('[data-floating-panel="portfolio-column-manager"]')).not.toBeNull();

    fireEvent.transitionEnd(closingPanel!, { propertyName: 'transform' });
    expect(document.querySelector('[data-floating-panel="portfolio-column-manager"]')).toBeNull();

    view.unmount();
    vi.useRealTimers();
  });

  it('returns focus to the opener before the drawer slides out', () => {
    vi.useFakeTimers();
    const view = render(<FocusHarness />);
    const opener = screen.getByRole('button', { name: 'Открыть колонки' });

    opener.focus();
    fireEvent.click(opener);
    act(() => vi.advanceTimersByTime(40));
    const closeButton = screen.getByRole('button', { name: 'Закрыть настройку колонок' });
    expect(document.activeElement).toBe(closeButton);

    act(() => fireEvent.click(closeButton));
    expect(document.activeElement).toBe(opener);

    view.unmount();
    vi.useRealTimers();
  });
});
