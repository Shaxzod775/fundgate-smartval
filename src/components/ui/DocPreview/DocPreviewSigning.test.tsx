import { act, render, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';

const PUBLIC_BUCKET_LINK = 'storage.googleapis.com/fundgate-smartval-v2-storage';
const PUBLIC_DECK = `https://${PUBLIC_BUCKET_LINK}/organizations/o/deck.pdf`;

const resolveCrmFileUrl = vi.fn();
const openCrmFile = vi.fn();

vi.mock('../../../services/api', async () => {
  const { toAuthenticatedCrmFileUrl } = await import('../../../utils/crmFileUrl');
  return {
    normalizeCrmFileUrl: (value?: string | null) =>
      toAuthenticatedCrmFileUrl(value, 'https://crm-api.example'),
    resolveCrmFileUrl: (value?: string | null) => resolveCrmFileUrl(value),
    openCrmFile: (value?: string | null) => openCrmFile(value),
  };
});

const { DocPreviewHost, openDocPreview, previewDocument } = await import('./DocPreview');

function mountHost() {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <DocPreviewHost />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  resolveCrmFileUrl.mockReset();
  openCrmFile.mockReset();
  resolveCrmFileUrl.mockResolvedValue(
    'https://storage.googleapis.com/fundgate-smartval-v2-storage/deck.pdf?X-Goog-Signature=fresh',
  );
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
});

describe('DocPreview переподписывает документ вместо публичной ссылки', () => {
  it('previewDocument уводит публичный URL бакета на авторизованный прокси', async () => {
    mountHost();
    act(() => { previewDocument(PUBLIC_DECK, 'deck.pdf'); });

    await waitFor(() => expect(resolveCrmFileUrl).toHaveBeenCalled());
    const requested = resolveCrmFileUrl.mock.calls[0][0] as string;
    expect(requested).toContain('/crm/files/');
    expect(requested).not.toContain(PUBLIC_BUCKET_LINK);
  });

  it('openDocPreview делает то же самое для голого storagePath', async () => {
    mountHost();
    act(() => { openDocPreview('organizations/o/memo.html', 'memo.html'); });

    await waitFor(() => expect(resolveCrmFileUrl).toHaveBeenCalled());
    const requested = resolveCrmFileUrl.mock.calls[0][0] as string;
    expect(requested).toContain('/crm/files/');
    expect(requested).not.toContain(PUBLIC_BUCKET_LINK);
  });

  it('на мобильном фолбэк идёт через openCrmFile, который сам переподписывает', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });
    mountHost();
    act(() => { previewDocument(PUBLIC_DECK, 'deck.pdf'); });

    expect(openCrmFile).toHaveBeenCalledWith(PUBLIC_DECK);
    expect(resolveCrmFileUrl).not.toHaveBeenCalled();
  });
});
