import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import DecisionPanel from './DecisionPanel';

const callbacks = {
  onUpload: vi.fn().mockResolvedValue(undefined),
  onDecide: vi.fn().mockResolvedValue(undefined),
};

function renderPanel(canUpload: boolean, canDecide: boolean, withDocument = false) {
  const meeting = {
    id: 'meeting-1',
    stage: 'director_review',
    approvalFlow: {
      director: {
        status: 'pending',
        ...(withDocument ? { pendingDocument: { url: 'https://example.com/decision.pdf', fileName: 'decision.pdf' } } : {}),
      },
    },
  } as InvestmentCommitteeMeeting;
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <DecisionPanel
          meeting={meeting}
          step="director"
          canDecide={canDecide}
          canUpload={canUpload}
          active
          busy={false}
          {...callbacks}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

describe('DecisionPanel role separation', () => {
  it('shows document upload only to the investment manager', () => {
    renderPanel(true, false);
    expect(screen.getByRole('button', { name: i18n.t('investmentCommittee.approvalDoc.choose') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('investmentCommittee.decision.sign') })).toBeNull();
  });

  it('shows signing to leadership without a file input', () => {
    const { container } = renderPanel(false, true, true);
    expect(screen.getByRole('button', { name: i18n.t('investmentCommittee.decision.sign') })).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
