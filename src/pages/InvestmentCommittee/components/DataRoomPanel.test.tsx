import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import type { InvestmentCommitteeMeeting, Startup } from '../../../services/api';
import { ToastProvider } from '../../../components/ui/Toast/ToastProvider';
import DataRoomPanel from './DataRoomPanel';
import { formatAmount } from './shared';

vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api')>('../../../services/api');
  return {
    ...actual,
    investmentCommitteeApi: {
      ...actual.investmentCommitteeApi,
      getDataRoom: vi.fn().mockResolvedValue({
        success: true,
        data: [{
          startupId: 'startup-1',
          name: 'Alpha',
          terms: { investmentAmount: 150_000, requestedAmount: 500_000 },
        }],
      }),
    },
  };
});

const meeting = {
  id: 'meeting-1',
  organizationId: 'org-1',
  title: 'Test committee',
  status: 'draft',
  stage: 'voting',
  committee: { members: [] },
  protocol: {
    presentedProjects: [{ startupId: 'startup-1', startupName: 'Alpha' }],
  },
} as unknown as InvestmentCommitteeMeeting;

const startupWithOtherFunds = {
  id: 'startup-1',
  crossFundApplications: [
    { organizationId: 'org-2', commitmentStatus: 'approved', investmentAmount: 200_000 },
    { organizationId: 'org-3', commitmentStatus: 'considering', investmentAmount: 50_000 },
    { organizationId: 'org-1', commitmentStatus: 'approved', investmentAmount: 999_000 },
  ],
} as unknown as Startup;

const renderPanel = (startups?: Startup[]) => render(
  <I18nextProvider i18n={i18n}>
    <ThemeProvider theme={darkTheme}>
      <ToastProvider>
        <DataRoomPanel meeting={meeting} startups={startups} />
      </ToastProvider>
    </ThemeProvider>
  </I18nextProvider>,
);

beforeAll(async () => {
  await i18n.changeLanguage('ru');
});

describe('DataRoomPanel — покрытие раунда', () => {
  it('показывает вклад других фондов, рассмотрение и остаток', async () => {
    renderPanel([startupWithOtherFunds]);

    await waitFor(() => {
      expect(screen.getByText(i18n.t('investmentCommittee.shortlist.otherFundsFact'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('investmentCommittee.shortlist.consideringFact'))).toBeTruthy();
    expect(screen.getByText(i18n.t('investmentCommittee.shortlist.remainingFact'))).toBeTruthy();
    expect(screen.getByText(formatAmount(300_000))).toBeTruthy();
    expect(screen.getByText(formatAmount(200_000))).toBeTruthy();
    expect(screen.queryByText(formatAmount(1_199_000))).toBeNull();
  });

  it('скрывает плитки покрытия, когда карточек стартапов нет (нет доступа к cross-fund)', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(i18n.t('investmentCommittee.shortlist.askFact'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('investmentCommittee.shortlist.otherFundsFact'))).toBeNull();
    expect(screen.queryByText(i18n.t('investmentCommittee.shortlist.remainingFact'))).toBeNull();
  });
});
