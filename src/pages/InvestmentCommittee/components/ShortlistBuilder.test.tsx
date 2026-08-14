import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import {
  startupsApi,
  type InvestmentCommitteeMeeting,
  type Startup,
} from '../../../services/api';
import { darkTheme } from '../../../styles/theme';
import ShortlistBuilder from './ShortlistBuilder';

const savedDataRoomUrl = 'https://drive.google.com/folder/alpha';

const meeting = {
  id: 'meeting-1',
  organizationId: 'org-1',
  title: 'Test committee',
  status: 'draft',
  stage: 'draft',
  meetingDate: '2026-07-15',
  protocol: {
    presentedProjects: [
      {
        startupId: 'startup-1',
        startupName: 'Alpha',
        terms: { requestedAmount: 200_000, investmentAmount: 50_000 },
      },
      {
        startupId: 'startup-2',
        startupName: 'Beta',
        terms: { requestedAmount: 150_000, investmentAmount: 40_000 },
      },
    ],
  },
} as InvestmentCommitteeMeeting;

const candidates = [
  {
    id: 'startup-1',
    organizationId: 'org-1',
    brief: { companyName: 'Alpha' },
    status: 'active',
    source: 'test',
    dataRoomUrl: savedDataRoomUrl,
  },
  {
    id: 'startup-2',
    organizationId: 'org-1',
    brief: { companyName: 'Beta' },
    status: 'active',
    source: 'test',
  },
] as unknown as Startup[];

beforeAll(async () => {
  await i18n.changeLanguage('ru');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShortlistBuilder Data Room links', () => {
  it('shows saved links and saves a missing link without racing finalize', async () => {
    let resolveUpdate: ((value: never) => void) | undefined;
    vi.spyOn(startupsApi, 'updateDataRoomUrl').mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve;
    }));
    const onDataRoomLinkChange = vi.fn();

    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={meeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={candidates}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={vi.fn(async () => undefined)}
            canEditDataRoomLink={(startupId) => startupId === 'startup-2'}
            onDataRoomLinkChange={onDataRoomLinkChange}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect(screen.queryByText(savedDataRoomUrl)).toBeNull();
    expect(screen.getByRole('link', { name: i18n.t('startupDetail.dataRoomLink.open') })
      .getAttribute('href')).toBe(savedDataRoomUrl);
    expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('common.delete') })).toBeNull();
    expect((screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlist.finalize'),
    }) as HTMLButtonElement).disabled).toBe(true);

    const input = screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel'));
    fireEvent.change(input, { target: { value: ' https://notion.so/beta-room ' } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));

    await waitFor(() => {
      expect((screen.getByRole('button', {
        name: i18n.t('investmentCommittee.shortlist.finalize'),
      }) as HTMLButtonElement).disabled).toBe(true);
    });
    expect(startupsApi.updateDataRoomUrl).toHaveBeenCalledWith(
      'startup-2',
      'https://notion.so/beta-room',
    );

    resolveUpdate?.({
      success: true,
      data: { dataRoomUrl: 'https://notion.so/beta-room' },
    } as never);

    await waitFor(() => {
      expect(onDataRoomLinkChange).toHaveBeenCalledWith(
        'startup-2',
        'https://notion.so/beta-room',
      );
    });

    rerender(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={meeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={candidates.map((startup) => startup.id === 'startup-2'
              ? { ...startup, dataRoomUrl: 'https://notion.so/beta-room' }
              : startup)}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={vi.fn(async () => undefined)}
            canEditDataRoomLink={(startupId) => startupId === 'startup-2'}
            onDataRoomLinkChange={onDataRoomLinkChange}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect((screen.getByRole('button', {
        name: i18n.t('investmentCommittee.shortlist.finalize'),
      }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('prefills the startup request, keeps it editable and requires an explicit fund amount', async () => {
    const onFinalize = vi.fn(async () => undefined);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={{
              id: 'meeting-amounts',
              organizationId: 'org-1',
              stage: 'draft',
              protocol: {
                presentedProjects: [{
                  startupId: 'startup-amounts',
                  startupName: 'Gamma',
                  terms: { requestedAmount: 200_000 },
                }],
              },
            } as unknown as InvestmentCommitteeMeeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={[{
              id: 'startup-amounts',
              organizationId: 'org-1',
              brief: { companyName: 'Gamma', fundingRequest: 200_000 },
              dataRoomUrl: 'https://drive.google.com/folder/gamma',
            } as unknown as Startup]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={onFinalize}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    const askInput = screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.askFact'),
    ) as HTMLInputElement;
    expect(askInput.value).toBe('$200 000');
    const fundAmountInput = screen.getByPlaceholderText('500 000') as HTMLInputElement;
    expect(fundAmountInput.value).toBe('');

    const finalize = screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlist.finalize'),
    }) as HTMLButtonElement;
    expect(finalize.disabled).toBe(true);

    fireEvent.change(fundAmountInput, { target: { value: '50 000' } });
    expect(finalize.disabled).toBe(false);
    fireEvent.click(finalize);

    await waitFor(() => expect(onFinalize).toHaveBeenCalledWith(expect.objectContaining({
      amounts: { 'startup-amounts': '50000' },
    })));
  });

  it('prefills the fund amount saved in the startup card', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={{
              id: 'meeting-prefilled-amount',
              organizationId: 'org-1',
              stage: 'draft',
              protocol: {
                presentedProjects: [{
                  startupId: 'startup-prefilled',
                  startupName: 'Delta',
                  terms: { requestedAmount: 200_000 },
                }],
              },
            } as unknown as InvestmentCommitteeMeeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={[{
              id: 'startup-prefilled',
              organizationId: 'org-1',
              brief: { companyName: 'Delta', fundingRequest: 200_000 },
              fundConsiderationAmount: 75_000,
              dataRoomUrl: 'https://drive.google.com/folder/delta',
            } as unknown as Startup]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={vi.fn(async () => undefined)}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect((screen.getByPlaceholderText('500 000') as HTMLInputElement).value).toBe('$75 000');
  });

  it('keeps an explicitly cleared meeting amount empty', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={{
              id: 'meeting-cleared-amount',
              organizationId: 'org-1',
              stage: 'draft',
              protocol: {
                presentedProjects: [{
                  startupId: 'startup-cleared',
                  startupName: 'Epsilon',
                  terms: { requestedAmount: 200_000, investmentAmount: 0 },
                }],
              },
            } as unknown as InvestmentCommitteeMeeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={[{
              id: 'startup-cleared',
              organizationId: 'org-1',
              brief: { companyName: 'Epsilon', fundingRequest: 200_000 },
              fundConsiderationAmount: 75_000,
              dataRoomUrl: 'https://drive.google.com/folder/epsilon',
            } as unknown as Startup]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={vi.fn(async () => undefined)}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect((screen.getByPlaceholderText('500 000') as HTMLInputElement).value).toBe('');
  });

  it('sends edited request and round size into the meeting terms', async () => {
    const onFinalize = vi.fn(async () => undefined);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={{
              id: 'meeting-terms',
              organizationId: 'org-1',
              stage: 'draft',
              protocol: {
                presentedProjects: [{
                  startupId: 'startup-terms',
                  startupName: 'Eta',
                  terms: { requestedAmount: 100_000 },
                }],
              },
            } as unknown as InvestmentCommitteeMeeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={[{
              id: 'startup-terms',
              organizationId: 'org-1',
              brief: { companyName: 'Eta' },
              dataRoomUrl: 'https://drive.google.com/folder/eta',
            } as unknown as Startup]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={onFinalize}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    fireEvent.change(screen.getByLabelText(i18n.t('investmentCommittee.shortlist.askFact')), {
      target: { value: '250 000' },
    });
    fireEvent.change(screen.getByLabelText(i18n.t('investmentCommittee.shortlist.roundFact')), {
      target: { value: '1 000 000' },
    });
    fireEvent.change(screen.getByPlaceholderText('500 000'), { target: { value: '50 000' } });
    fireEvent.click(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlist.finalize'),
    }));

    await waitFor(() => expect(onFinalize).toHaveBeenCalledWith(expect.objectContaining({
      requestedAmounts: { 'startup-terms': '250000' },
      roundSizes: { 'startup-terms': '1000000' },
    })));
  });

  it('shows the funding picture from other funds and the remainder', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ShortlistBuilder
            meeting={{
              id: 'meeting-funding',
              organizationId: 'org-1',
              stage: 'draft',
              protocol: {
                presentedProjects: [{
                  startupId: 'startup-funding',
                  startupName: 'Zeta',
                  terms: { requestedAmount: 500_000 },
                }],
              },
            } as unknown as InvestmentCommitteeMeeting}
            draftTitle=""
            draftMeetingDate=""
            candidates={[{
              id: 'startup-funding',
              organizationId: 'org-1',
              brief: { companyName: 'Zeta' },
              dataRoomUrl: 'https://drive.google.com/folder/zeta',
              crossFundApplications: [
                { organizationId: 'org-1', organizationName: 'Test Fund', investmentAmount: 90_000, commitmentStatus: 'approved' },
                { organizationId: 'org-2', organizationName: 'Fund B', investmentAmount: 120_000, commitmentStatus: 'approved' },
                { organizationId: 'org-3', organizationName: 'Fund C', investmentAmount: 80_000, commitmentStatus: 'considering' },
                { organizationId: 'org-4', organizationName: 'Fund D', investmentAmount: 50_000, commitmentStatus: 'rejected' },
              ],
            } as unknown as Startup]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            saving={false}
            onSave={vi.fn(async () => undefined)}
            onFinalize={vi.fn(async () => undefined)}
          />
        </ThemeProvider>
      </I18nextProvider>,
    );

    const askInput = screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.askFact'),
    ) as HTMLInputElement;
    expect(askInput.value).toBe('$500 000');

    const coverage = screen.getByText(i18n.t('investmentCommittee.shortlist.otherFundsFact')).closest('dl');
    expect(coverage).toBeTruthy();
    const text = (coverage as HTMLElement).textContent || '';
    expect(text).toContain('$120K');
    expect(text).toContain('$80K');
    expect(text).toContain('$380K');
  });
});
