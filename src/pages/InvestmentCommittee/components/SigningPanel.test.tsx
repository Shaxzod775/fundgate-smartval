import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import SigningPanel from './SigningPanel';

function renderPanel(
  canUpload: boolean,
  meeting: InvestmentCommitteeMeeting = {
    id: 'meeting-1',
    stage: 'signing',
    signatures: {},
  } as InvestmentCommitteeMeeting,
) {
  const result = render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <SigningPanel
          meeting={meeting}
          canUpload={canUpload}
          readOnly={false}
          busy={false}
          onUploadProtocol={vi.fn().mockResolvedValue(undefined)}
          onComplete={vi.fn()}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return result;
}

describe('SigningPanel protocol permissions', () => {
  it('shows committee members a read-only waiting state', () => {
    const { container } = renderPanel(false);
    expect(screen.queryByRole('heading', {
      name: i18n.t('investmentCommittee.signing.sharedTitle'),
    })).toBeNull();
    expect(screen.getByText(i18n.t('investmentCommittee.signing.memberHint'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('investmentCommittee.signing.sharedHint'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('investmentCommittee.signing.uploadShared'),
    })).toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('investmentCommittee.signing.sign'),
    })).toBeNull();
  });

  it('lets committee members preview an uploaded protocol without completing it', () => {
    renderPanel(false, {
      id: 'meeting-1',
      stage: 'signing',
      signatures: {
        sharedProtocol: { url: 'https://example.com/final.pdf', fileName: 'final.pdf' },
      },
    } as InvestmentCommitteeMeeting);

    expect(screen.getByText(i18n.t('investmentCommittee.signing.memberFileAvailable'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.signing.preview'),
    })).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('investmentCommittee.signing.complete'),
    })).toBeNull();
  });

  it('shows upload controls to fund leadership', () => {
    renderPanel(true);
    expect(screen.queryByRole('heading', {
      name: i18n.t('investmentCommittee.signing.sharedTitle'),
    })).toBeNull();
    expect(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.signing.uploadShared'),
    })).toBeTruthy();
  });

  it('lets fund leadership complete an uploaded shared protocol', () => {
    renderPanel(true, {
      id: 'meeting-1',
      stage: 'signing',
      signatures: {
        sharedProtocol: { url: 'https://example.com/final.pdf', fileName: 'final.pdf' },
      },
    } as InvestmentCommitteeMeeting);

    expect(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.signing.complete'),
    })).toBeTruthy();
  });
});
