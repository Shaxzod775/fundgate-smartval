import { act, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import { DocPreviewHost, openDocPreview } from './DocPreview';

afterEach(async () => {
  await i18n.changeLanguage('ru');
});

describe('DocPreviewHost translations', () => {
  it.each([
    ['ru', 'Открыть'],
    ['en', 'Open'],
    ['uz', 'Ochish'],
  ])('translates the open button for %s', async (language, label) => {
    await i18n.changeLanguage(language);
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <DocPreviewHost />
        </ThemeProvider>
      </I18nextProvider>,
    );

    act(() => {
      openDocPreview('https://example.com/document.pdf', 'document.pdf');
    });

    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });
});
