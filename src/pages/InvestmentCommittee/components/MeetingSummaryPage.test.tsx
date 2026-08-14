import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import { StageStrip } from './MeetingSummaryPage';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function renderStageStrip(viewerRole: 'committee_member' | 'manager_investment') {
  return render(
    <ThemeProvider theme={darkTheme}>
      <StageStrip stage="legal_review" viewerRole={viewerRole} />
    </ThemeProvider>,
  );
}

describe('StageStrip role visibility', () => {
  it('hides the terminal stage from committee members', () => {
    renderStageStrip('committee_member');

    expect(screen.getByText('Shortlist')).toBeTruthy();
    expect(screen.getByText('Final protocol')).toBeTruthy();
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('keeps the full workflow for fund staff', () => {
    renderStageStrip('manager_investment');

    expect(screen.getByText('Final protocol')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it.each(['committee_member', 'manager_investment'] as const)(
    'does not show the retired review stages to %s',
    (role) => {
      renderStageStrip(role);

      expect(screen.queryByText('Lawyer')).toBeNull();
      expect(screen.queryByText('Deputy')).toBeNull();
      expect(screen.queryByText('Director')).toBeNull();
    },
  );
});
