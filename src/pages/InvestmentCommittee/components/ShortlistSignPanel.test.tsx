import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import type { InvestmentCommitteeMeeting } from '../../../services/api';
import { DocPreviewHost } from '../../../components/ui/DocPreview/DocPreview';
import { ToastProvider } from '../../../components/ui/Toast/ToastProvider';
import ShortlistSignPanel from './ShortlistSignPanel';

const meetingWithConfirmedAmounts = {
  id: 'meeting-1',
  organizationId: 'org-1',
  title: 'Test committee',
  status: 'draft',
  stage: 'shortlist_signing',
  protocol: {
    presentedProjects: [{
      startupId: 'startup-1',
      startupName: 'Alpha',
      terms: { requestedAmount: 200_000, investmentAmount: 150_000 },
    }],
  },
  shortlist: {
    status: 'generated',
    latestExport: {
      id: 'shortlist-export-1',
      htmlUrl: 'https://example.com/shortlist.html',
    },
    amountsConfirmedExportId: 'shortlist-export-1',
  },
} as InvestmentCommitteeMeeting;

const FETCHED_KEY = 'ic-shortlist-doc-fetched';
const FETCHED_EXPORT_ID = 'shortlist-export-1';

beforeAll(async () => {
  await i18n.changeLanguage('ru');
});

beforeEach(() => {
  window.localStorage.clear();
});

const renderPanel = (meeting: InvestmentCommitteeMeeting, busy = false) => render(
  <I18nextProvider i18n={i18n}>
    <ThemeProvider theme={darkTheme}>
    <ToastProvider>
      <ShortlistSignPanel
        meeting={meeting}
        startups={[]}
        currentOrganizationId="org-1"
        currentOrganizationName="Test Fund"
        canReview
        canReopen={false}
        busy={busy}
        onSaveAmounts={vi.fn().mockResolvedValue(true)}
        onUploadSigned={vi.fn().mockResolvedValue(undefined)}
        onReview={vi.fn().mockResolvedValue(undefined)}
        onReopen={vi.fn().mockResolvedValue(undefined)}
      />
    </ToastProvider>
    </ThemeProvider>
  </I18nextProvider>,
);

describe('ShortlistSignPanel', () => {
  it('keeps only the next available action green', () => {
    const saveName = i18n.t('investmentCommittee.shortlistSign.saveAmounts');
    const openName = i18n.t('investmentCommittee.shortlistSign.openDocument');
    const uploadName = i18n.t('investmentCommittee.shortlistSign.uploadSigned');
    const accentColor = 'rgb(16, 185, 129)';

    const unconfirmed = renderPanel({
      ...meetingWithConfirmedAmounts,
      shortlist: {
        ...meetingWithConfirmedAmounts.shortlist,
        amountsConfirmedExportId: undefined,
      },
    });
    const activeSave = screen.getByRole('button', { name: saveName }) as HTMLButtonElement;
    const inactiveUpload = screen.getByRole('button', { name: uploadName }) as HTMLButtonElement;
    expect(activeSave.disabled).toBe(false);
    expect(inactiveUpload.disabled).toBe(true);
    expect(getComputedStyle(activeSave).backgroundColor).toBe(accentColor);
    expect(getComputedStyle(inactiveUpload).backgroundColor).not.toBe(accentColor);
    unconfirmed.unmount();

    const confirmed = renderPanel(meetingWithConfirmedAmounts);
    expect(screen.queryByRole('button', { name: saveName })).toBeNull();
    const activeOpen = screen.getByRole('button', { name: openName }) as HTMLButtonElement;
    const waitingUpload = screen.getByRole('button', { name: uploadName }) as HTMLButtonElement;
    expect(getComputedStyle(activeOpen).backgroundColor).toBe(accentColor);
    expect(getComputedStyle(waitingUpload).backgroundColor).not.toBe(accentColor);
    expect(waitingUpload.disabled).toBe(false);
    confirmed.unmount();

    window.localStorage.setItem(FETCHED_KEY, FETCHED_EXPORT_ID);
    renderPanel(meetingWithConfirmedAmounts);
    const doneOpen = screen.getByRole('button', { name: openName }) as HTMLButtonElement;
    const activeUpload = screen.getByRole('button', { name: uploadName }) as HTMLButtonElement;
    expect(getComputedStyle(doneOpen).backgroundColor).not.toBe(accentColor);
    expect(activeUpload.disabled).toBe(false);
    expect(getComputedStyle(activeUpload).backgroundColor).toBe(accentColor);
  });

  it('does not roll finished steps back while a request is in flight', () => {
    window.localStorage.setItem(FETCHED_KEY, FETCHED_EXPORT_ID);
    const stepTitleColor = () => getComputedStyle(
      screen.getByText(i18n.t('investmentCommittee.shortlistSign.step2Title')),
    ).color;

    const idle = renderPanel(meetingWithConfirmedAmounts);
    const idleColor = stepTitleColor();
    idle.unmount();

    renderPanel(meetingWithConfirmedAmounts, true);
    expect(stepTitleColor()).toBe(idleColor);
    const openButton = screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.openDocument'),
    }) as HTMLButtonElement;
    expect(openButton.disabled).toBe(true);
  });

  it('ignores the fetched flag left from an older shortlist version', () => {
    window.localStorage.setItem(FETCHED_KEY, 'shortlist-export-OLD');
    renderPanel(meetingWithConfirmedAmounts);
    const accentColor = 'rgb(16, 185, 129)';
    const openButton = screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.openDocument'),
    });
    expect(getComputedStyle(openButton).backgroundColor).toBe(accentColor);
  });

  it('uploads after the director selects a signed file', async () => {
    const onUploadSigned = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <ShortlistSignPanel
            meeting={meetingWithConfirmedAmounts}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={false}
            onSaveAmounts={vi.fn().mockResolvedValue(true)}
            onUploadSigned={onUploadSigned}
            onReview={vi.fn().mockResolvedValue(undefined)}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['signed shortlist'], 'signed-shortlist.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onUploadSigned).toHaveBeenCalledTimes(1));
    expect(onUploadSigned).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'signed-shortlist.pdf',
      contentType: 'application/pdf',
      fileBase64: expect.stringMatching(/^data:application\/pdf;base64,/),
      shortlistExportId: 'shortlist-export-1',
    }));
  });

  it('moves to voting only after preview confirmation', async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <DocPreviewHost />
          <ShortlistSignPanel
            meeting={{
              ...meetingWithConfirmedAmounts,
              shortlist: {
                ...meetingWithConfirmedAmounts.shortlist,
                status: 'pending_review' as const,
                pendingDocument: {
                  url: 'https://example.com/signed-shortlist.pdf',
                  fileName: 'signed-shortlist.pdf',
                  sourceExportId: 'shortlist-export-1',
                },
              },
            }}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={false}
            onSaveAmounts={vi.fn().mockResolvedValue(true)}
            onUploadSigned={vi.fn().mockResolvedValue(undefined)}
            onReview={onReview}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.previewAndConfirm'),
    }));
    expect(onReview).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.confirmAndContinue'),
    }));
    expect(onReview).toHaveBeenCalledWith('approve');
  });

  it('shows both amounts and regenerates a legacy export before upload', async () => {
    const onSaveAmounts = vi.fn().mockResolvedValue(true);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <ShortlistSignPanel
            meeting={{
              ...meetingWithConfirmedAmounts,
              shortlist: {
                status: 'generated',
                latestExport: {
                  id: 'legacy-export',
                  htmlUrl: 'https://example.com/legacy-shortlist.html',
                },
              },
            }}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={false}
            onSaveAmounts={onSaveAmounts}
            onUploadSigned={vi.fn().mockResolvedValue(undefined)}
            onReview={vi.fn().mockResolvedValue(undefined)}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect(screen.getByText('$200 000')).toBeTruthy();
    expect((screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.fundAmountLabel'),
    ) as HTMLInputElement).value).toBe('150 000');

    fireEvent.click(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.saveAmounts'),
    }));

    await waitFor(() => expect(onSaveAmounts).toHaveBeenCalledWith({
      expectedShortlistExportId: 'legacy-export',
      amounts: { 'startup-1': 150_000 },
    }));
  });

  it('blocks upload while an edited amount is unsaved and saves against the current export', async () => {
    const onSaveAmounts = vi.fn().mockResolvedValue(true);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <ShortlistSignPanel
            meeting={meetingWithConfirmedAmounts}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={false}
            onSaveAmounts={onSaveAmounts}
            onUploadSigned={vi.fn().mockResolvedValue(undefined)}
            onReview={vi.fn().mockResolvedValue(undefined)}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );

    const amountInput = screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.fundAmountLabel'),
    ) as HTMLInputElement;
    const uploadButton = screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.uploadSigned'),
    }) as HTMLButtonElement;

    fireEvent.change(amountInput, { target: { value: '50 000' } });
    expect(uploadButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.saveAmounts'),
    }));
    await waitFor(() => expect(onSaveAmounts).toHaveBeenCalledWith({
      expectedShortlistExportId: 'shortlist-export-1',
      amounts: { 'startup-1': 50_000 },
    }));
  });

  it('opens only a confirmed, unchanged export outside a busy action', () => {
    const renderPanel = (meeting: InvestmentCommitteeMeeting, busy = false) => render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <ShortlistSignPanel
            meeting={meeting}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={busy}
            onSaveAmounts={vi.fn().mockResolvedValue(true)}
            onUploadSigned={vi.fn().mockResolvedValue(undefined)}
            onReview={vi.fn().mockResolvedValue(undefined)}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );
    const openDocumentName = i18n.t('investmentCommittee.shortlistSign.openDocument');

    const confirmed = renderPanel(meetingWithConfirmedAmounts);
    const confirmedButton = screen.getByRole('button', { name: openDocumentName }) as HTMLButtonElement;
    expect(confirmedButton.disabled).toBe(false);

    fireEvent.change(screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.fundAmountLabel'),
    ), { target: { value: '50 000' } });
    expect(confirmedButton.disabled).toBe(true);
    confirmed.unmount();

    const unconfirmed = renderPanel({
      ...meetingWithConfirmedAmounts,
      shortlist: {
        ...meetingWithConfirmedAmounts.shortlist,
        amountsConfirmedExportId: undefined,
      },
    });
    expect((screen.getByRole('button', { name: openDocumentName }) as HTMLButtonElement).disabled).toBe(true);
    unconfirmed.unmount();

    renderPanel(meetingWithConfirmedAmounts, true);
    expect((screen.getByRole('button', { name: openDocumentName }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the pending file name and allows replacing it before confirmation', async () => {
    const onUploadSigned = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
        <ToastProvider>
          <ShortlistSignPanel
            meeting={{
              ...meetingWithConfirmedAmounts,
              shortlist: {
                ...meetingWithConfirmedAmounts.shortlist,
                status: 'pending_review',
                pendingDocument: {
                  url: 'https://example.com/signed-shortlist.pdf',
                  fileName: 'signed-shortlist.pdf',
                  sourceExportId: 'shortlist-export-1',
                },
              },
            }}
            startups={[]}
            currentOrganizationId="org-1"
            currentOrganizationName="Test Fund"
            canReview
            canReopen={false}
            busy={false}
            onSaveAmounts={vi.fn().mockResolvedValue(true)}
            onUploadSigned={onUploadSigned}
            onReview={vi.fn().mockResolvedValue(undefined)}
            onReopen={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>
        </ThemeProvider>
      </I18nextProvider>,
    );

    expect((screen.getByLabelText(
      i18n.t('investmentCommittee.shortlist.fundAmountLabel'),
    ) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('signed-shortlist.pdf')).toBeTruthy();

    const replaceButton = screen.getByRole('button', {
      name: i18n.t('investmentCommittee.shortlistSign.uploadAnotherSigned'),
    }) as HTMLButtonElement;
    expect(replaceButton.disabled).toBe(false);
    expect(getComputedStyle(replaceButton).backgroundColor).not.toBe('rgb(16, 185, 129)');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const replacement = new File(['replacement shortlist'], 'replacement.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [replacement] } });
    await waitFor(() => expect(onUploadSigned).toHaveBeenCalledWith(expect.objectContaining({
      fileName: 'replacement.pdf',
      shortlistExportId: 'shortlist-export-1',
    })));
  });
});
