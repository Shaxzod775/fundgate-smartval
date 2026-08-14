import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const PUBLIC_BUCKET_LINK = 'storage.googleapis.com/fundgate-smartval-v2-storage';

const resolveCrmFileUrl = vi.fn();

vi.mock('../../services/api', async () => {
  const { toAuthenticatedCrmFileUrl } = await import('../../utils/crmFileUrl');
  return {
    normalizeCrmFileUrl: (value?: string | null) =>
      toAuthenticatedCrmFileUrl(value, 'https://crm-api.example'),
    resolveCrmFileUrl: (value?: string | null) => resolveCrmFileUrl(value),
  };
});

const { CrmImage } = await import('./CrmImage');
const { renderToStaticMarkup } = await import('react-dom/server');

beforeEach(() => {
  resolveCrmFileUrl.mockReset();
  resolveCrmFileUrl.mockImplementation(async (url: string) =>
    url.includes('/crm/files/')
      ? 'https://storage.googleapis.com/fundgate-smartval-v2-storage/logo.png?X-Goog-Signature=fresh'
      : url,
  );
});

describe('CrmImage', () => {
  it.each([
    ['публичный URL', 'https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png'],
    ['голый storagePath', 'organizations/o/logo.png'],
    ['gs://', 'gs://fundgate-smartval-v2-storage/organizations/o/logo.png'],
  ])('переподписывает %s через прокси, а не отдаёт публичную ссылку', async (_label, src) => {
    render(<CrmImage src={src} alt="logo" />);

    await waitFor(() => expect(resolveCrmFileUrl).toHaveBeenCalled());
    const requested = resolveCrmFileUrl.mock.calls[0][0] as string;
    expect(requested).toContain('/crm/files/');
    expect(requested).not.toContain(PUBLIC_BUCKET_LINK);

    const image = await screen.findByAltText<HTMLImageElement>('logo');
    expect(image.getAttribute('src')).toContain('X-Goog-Signature=');
  });

  it('не рендерит картинку, пока ссылка не переподписана, и зовёт onError при отказе', async () => {
    resolveCrmFileUrl.mockResolvedValue(null);
    const onError = vi.fn();
    render(
      <CrmImage
        src="https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png"
        alt="logo"
        onError={onError}
      />,
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.queryByAltText('logo')).toBeNull();
  });

  it('пропускает data: и внешние ссылки без похода на прокси', async () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    render(<CrmImage src={dataUri} alt="inline" />);
    const image = await screen.findByAltText<HTMLImageElement>('inline');
    expect(image.getAttribute('src')).toBe(dataUri);
    expect(resolveCrmFileUrl).not.toHaveBeenCalled();
  });
});

describe('первый кадр', () => {

  const freshSignature = 'https://storage.googleapis.com/fundgate-smartval-v2-storage/organizations/o/logo.png'
    + `?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Date=${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`
    + '&X-Goog-Expires=21600&X-Goog-Signature=fresh';

  it.each([
    ['готовая v4-подпись', freshSignature],
    ['data:', 'data:image/png;base64,iVBORw0KGgo='],
    ['внешний URL', 'https://example.com/logo.png'],
  ])('%s уже стоит в src до всяких эффектов', (_label, src) => {
    const inMarkup = src.replace(/&/g, '&amp;');
    expect(renderToStaticMarkup(<CrmImage src={src} alt="logo" />)).toContain(`src="${inMarkup}"`);
  });

  it('приватному объекту без подписи в первом кадре взяться неоткуда', () => {
    const markup = renderToStaticMarkup(
      <CrmImage src="organizations/o/logo.png" alt="logo" />,
    );
    expect(markup).toBe('');
  });
});
