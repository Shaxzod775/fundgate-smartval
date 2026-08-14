import { render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it } from 'vitest';
import { darkTheme } from '../../../styles/theme';
import FundingProgress from './FundingProgress';

function renderProgress(props: Partial<ComponentProps<typeof FundingProgress>> = {}) {
  return render(
    <ThemeProvider theme={darkTheme}>
      <FundingProgress
        requestedAmount={200_000}
        currentFundId="fund-current"
        currentFundName="Текущий фонд"
        currentFundAmount={40_000}
        currentFundStatus="considering"
        otherApplications={[]}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('FundingProgress', () => {
  it('deduplicates funds and separates confirmed from considering amounts', () => {
    renderProgress({
      otherApplications: [
        {
          organizationId: 'fund-current',
          organizationName: 'Старое имя текущего фонда',
          status: 'pipeline',
          investmentAmount: 100_000,
          commitmentStatus: 'approved',
        },
        {
          organizationId: 'fund-other',
          organizationName: 'Второй фонд',
          status: 'pipeline',
          investmentAmount: 50_000,
          commitmentStatus: 'approved',
        },
        {
          organizationId: 'fund-other',
          organizationName: 'Второй фонд',
          status: 'pipeline',
          investmentAmount: 75_000,
          commitmentStatus: 'approved',
        },
        {
          organizationId: 'fund-review',
          organizationName: 'Третий фонд',
          status: 'in_review',
          investmentAmount: 25_000,
          commitmentStatus: 'considering',
        },
        {
          organizationId: 'fund-rejected',
          organizationName: 'Отклонивший фонд',
          status: 'rejected',
          investmentAmount: 90_000,
          commitmentStatus: 'rejected',
        },
        {
          organizationId: 'fund-empty',
          organizationName: 'Фонд без суммы',
          status: 'pipeline',
          investmentAmount: 0,
          commitmentStatus: 'approved',
        },
      ],
    });

    expect(screen.getByLabelText('Одобрено фондами: $75K')).toBeTruthy();
    expect(screen.getByLabelText('На рассмотрении: $65K')).toBeTruthy();

    const progressbar = screen.getByRole('progressbar', { name: 'Прогресс финансирования' });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('37.5');
    expect(progressbar.getAttribute('aria-valuetext')).toBe('Одобрено фондами: $75K / $200K');

    const table = screen.getByRole('table', { name: 'Распределение по фондам' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('Текущий фонд')).toBeTruthy();
    expect(within(table).getByText('Второй фонд')).toBeTruthy();
    expect(within(table).getByText('Третий фонд')).toBeTruthy();
    expect(within(table).queryByText('Старое имя текущего фонда')).toBeNull();
    expect(within(table).queryByText('Отклонивший фонд')).toBeNull();
    expect(within(table).queryByText('Фонд без суммы')).toBeNull();
  });

  it('clamps the visual progress at 100 percent while keeping the real total', () => {
    renderProgress({
      requestedAmount: 100_000,
      currentFundAmount: 125_000,
      currentFundStatus: 'approved',
      otherApplications: [
        {
          organizationId: 'fund-other',
          organizationName: 'Второй фонд',
          status: 'portfolio',
          investmentAmount: 125_000,
          commitmentStatus: 'approved',
        },
      ],
    });

    expect(screen.getByLabelText('Одобрено фондами: $250K')).toBeTruthy();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('100');
    expect(progressbar.getAttribute('aria-valuetext')).toBe('Одобрено фондами: $250K / $100K');
  });

  it('shows an empty breakdown when all amounts are invalid or rejected', () => {
    renderProgress({
      requestedAmount: Number.NaN,
      currentFundAmount: -10,
      otherApplications: [
        {
          organizationId: 'fund-rejected',
          organizationName: 'Отклонивший фонд',
          status: 'rejected',
          investmentAmount: 10_000,
          commitmentStatus: 'rejected',
        },
      ],
    });

    expect(screen.getByText('Суммы фондов пока не указаны')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Отклонивший фонд')).toBeNull();
  });
});
