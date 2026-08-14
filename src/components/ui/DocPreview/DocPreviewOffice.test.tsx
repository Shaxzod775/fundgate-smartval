import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import { DocPreviewHost, openDocPreview, previewDocument } from './DocPreview';

const OFFICE_VIEWER = 'officeapps.live.com';

function mount() {
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <DocPreviewHost />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

function frameSources(): string[] {
  return Array.from(document.querySelectorAll('iframe')).map((f) => f.getAttribute('src') || '');
}

beforeEach(async () => {
  await i18n.changeLanguage('ru');
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn(),
  });
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { url: 'https://storage.googleapis.com/b/memo.html?X-Goog-Signature=s' } }),
  })));
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('ru');
});

describe('предпросмотр Word-документа', () => {
  it('не уходит в Office Online и не рисует пустой iframe', async () => {
    mount();
    act(() => { openDocPreview('organizations/o/memo.docx', 'memo.docx'); });

    await waitFor(() => {
      expect(screen.getByText(/Word-документ здесь не показать/)).toBeTruthy();
    });
    expect(frameSources().some((src) => src.includes(OFFICE_VIEWER))).toBe(false);
    expect(frameSources()).toHaveLength(0);
  });

  it('вместо пустоты даёт «Скачать» и «Открыть в новой вкладке»', async () => {
    mount();
    act(() => { openDocPreview('organizations/o/memo.docx', 'memo.docx'); });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Скачать' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Открыть в новой вкладке' })).toBeTruthy();
  });

  it('заглушка показывается сразу, без похода за подписью', async () => {
    mount();
    act(() => { openDocPreview('organizations/o/memo.docx', 'memo.docx'); });

    await waitFor(() => expect(screen.getByText(/Word-документ здесь не показать/)).toBeTruthy());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('распознаёт .docx внутри base64 прокси-пути, а не только по имени', async () => {
    const encoded = btoa('organizations/o/memo.docx').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    mount();
    act(() => { openDocPreview(`https://crm-api.example/crm/files/${encoded}`); });

    await waitFor(() => expect(screen.getByText(/Word-документ здесь не показать/)).toBeTruthy());
  });
});

describe('предпросмотр HTML-двойника', () => {
  it('рисуется в iframe напрямую, без Microsoft', async () => {
    mount();
    act(() => { openDocPreview('organizations/o/memo.html', 'memo.html'); });

    await waitFor(() => expect(frameSources()).toHaveLength(1));
    expect(frameSources()[0]).toContain('X-Goog-Signature=');
    expect(frameSources()[0]).not.toContain(OFFICE_VIEWER);
    expect(screen.queryByText(/Word-документ здесь не показать/)).toBeNull();
  });
});

describe('перевод заглушки', () => {
  it.each([
    ['ru', 'Скачать'],
    ['en', 'Download'],
    ['uz', 'Yuklab olish'],
  ])('кнопка «скачать» переведена для %s', async (language, label) => {
    await i18n.changeLanguage(language);
    mount();
    act(() => { openDocPreview('organizations/o/memo.docx', 'memo.docx'); });
    await waitFor(() => expect(screen.getByRole('button', { name: label })).toBeTruthy());
  });
});

describe('previewDocument пускает HTML во встроенное окно', () => {
  it('html-двойник открывается в модалке, а не улетает новой вкладкой', async () => {
    mount();
    act(() => { previewDocument('organizations/o/memo.html', 'memo.html'); });

    await waitFor(() => expect(frameSources()).toHaveLength(1));
    expect(frameSources()[0]).toContain('X-Goog-Signature=');
  });
});
