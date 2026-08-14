import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { darkTheme } from '../../styles/theme';

const resolveCrmFileUrl = vi.fn();

vi.mock('../../services/api', async () => {
  const { toAuthenticatedCrmFileUrl } = await import('../../utils/crmFileUrl');
  return {
    normalizeCrmFileUrl: (value?: string | null, startupId?: string | null) =>
      toAuthenticatedCrmFileUrl(value, 'https://crm-api.example', startupId),
    resolveCrmFileUrl: (value?: string | null) => resolveCrmFileUrl(value),
  };
});

const { StartupLogo } = await import('./StartupLogo');

const freshSignature = 'https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png'
  + `?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`
  + '&X-Goog-Expires=21600&X-Goog-Signature=fresh';

function firstPaint(node: React.ReactElement): string {
  return renderToStaticMarkup(<ThemeProvider theme={darkTheme}>{node}</ThemeProvider>);
}

beforeEach(() => {
  resolveCrmFileUrl.mockReset();
  resolveCrmFileUrl.mockResolvedValue(freshSignature);
});

describe('StartupLogo', () => {
  it('готовая подпись от бэкенда стоит в src сразу, вместе с карточкой', () => {
    const markup = firstPaint(<StartupLogo src={freshSignature} name="AITHER" />);
    expect(markup).toContain(`src="${freshSignature.replace(/&/g, '&amp;')}"`);
    expect(resolveCrmFileUrl).not.toHaveBeenCalled();
  });

  it('без логотипа в первом кадре стоит буква, а не пустое место', () => {
    const markup = firstPaint(<StartupLogo src={null} name="AITHER" />);
    expect(markup).toContain('>A<');
    expect(markup).not.toContain('<img');
  });

  it('приватный объект без подписи всё ещё идёт через прокси', () => {
    const markup = firstPaint(<StartupLogo src="organizations/o/logo.png" name="AITHER" />);
    expect(markup).not.toContain('<img');
    expect(markup).toContain('>A<');
  });

  it('протухшая подпись не выдаётся за готовую ссылку', () => {
    const stale = freshSignature.replace(/X-Goog-Date=\d{8}T\d{6}Z/, 'X-Goog-Date=20200101T000000Z');
    expect(firstPaint(<StartupLogo src={stale} name="AITHER" />)).not.toContain('<img');
  });

  it('никогда не отдаёт неподписанную ссылку на приватный бакет', () => {
    const markup = firstPaint(
      <StartupLogo
        src="https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png"
        name="AITHER"
      />,
    );
    expect(markup).not.toContain('storage.googleapis.com');
  });
});
