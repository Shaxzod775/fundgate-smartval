import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import i18n from '../../../i18n';
import { startupsApi } from '../../../services/api';
import { darkTheme } from '../../../styles/theme';
import { DataRoomLinkCard, type DataRoomLinkCardProps } from './DataRoomLinkCard';

const renderCard = (props: Partial<DataRoomLinkCardProps> = {}) => {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <DataRoomLinkCard
          startupId="startup-1"
          canEdit
          onChange={onChange}
          {...props}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
  return { onChange };
};

beforeAll(async () => {
  await i18n.changeLanguage('ru');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataRoomLinkCard', () => {
  it('shows the editor immediately for a missing link in compact mode', () => {
    renderCard({ compact: true, ariaLabel: 'Data Room — Alpha' });

    expect(screen.getByRole('region', { name: 'Data Room — Alpha' })).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: i18n.t('common.add') })).toBeNull();
  });

  it('disables compact editor controls during an external action', () => {
    renderCard({ compact: true, disabled: true });

    expect(screen.queryByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel'))).toBeNull();
    expect((screen.getByRole('button', {
      name: i18n.t('common.add'),
    }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps compact mode free of the raw URL but still links to it', () => {
    const dataRoomUrl = 'https://drive.google.com/folder/123';
    renderCard({ dataRoomUrl, compact: true, canEdit: true });

    expect(screen.queryByText(dataRoomUrl)).toBeNull();
    const openLink = screen.getByRole('link', { name: i18n.t('startupDetail.dataRoomLink.open') });
    expect(openLink.getAttribute('href')).toBe(dataRoomUrl);
    expect(openLink.textContent?.trim()).toBe(i18n.t('startupDetail.dataRoomLink.openShort'));
    expect(openLink.getAttribute('data-tooltip')).toBe(i18n.t('startupDetail.dataRoomLink.open'));
    expect(screen.queryByText(i18n.t('startupDetail.dataRoomLink.description'))).toBeNull();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('startupDetail.dataRoomLink.submit'),
    })).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('common.delete') })).toBeNull();
  });

  it('opens a validated saved link safely', () => {
    renderCard({ dataRoomUrl: 'https://drive.google.com/folder/123', canEdit: false });

    const link = screen.getByRole('link', { name: i18n.t('startupDetail.dataRoomLink.open') });
    expect(link.getAttribute('href')).toBe('https://drive.google.com/folder/123');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).toBeNull();
  });

  it('blocks a non-HTTPS link before calling the API', () => {
    const update = vi.spyOn(startupsApi, 'updateDataRoomUrl');
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.add') }));
    fireEvent.change(screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel')), {
      target: { value: 'http://example.com/folder' },
    });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));

    expect(screen.getByRole('alert').textContent).toBe(i18n.t('startupDetail.dataRoomLink.errors.httpsRequired'));
    expect(update).not.toHaveBeenCalled();
  });

  it('saves a normalized link and reports it to the parent', async () => {
    const onSavingChange = vi.fn();
    vi.spyOn(startupsApi, 'updateDataRoomUrl').mockResolvedValue({
      success: true,
      data: { dataRoomUrl: 'https://notion.so/project-room' },
    } as never);
    const { onChange } = renderCard({ onSavingChange });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.add') }));
    fireEvent.change(screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel')), {
      target: { value: '  https://notion.so/project-room  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));

    await waitFor(() => {
      expect(startupsApi.updateDataRoomUrl).toHaveBeenCalledWith(
        'startup-1',
        'https://notion.so/project-room',
      );
      expect(onChange).toHaveBeenCalledWith('https://notion.so/project-room');
      expect(onSavingChange.mock.calls).toEqual([[true], [false]]);
    });
  });

  it('keeps the editor open and shows the backend error', async () => {
    vi.spyOn(startupsApi, 'updateDataRoomUrl').mockResolvedValue({
      success: false,
      error: 'Недостаточно прав',
    });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.add') }));
    fireEvent.change(screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel')), {
      target: { value: 'https://example.com/data-room' },
    });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));

    expect(await screen.findByText('Недостаточно прав')).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('startupDetail.dataRoomLink.fieldLabel'))).toBeTruthy();
  });

  it('removes a saved link only after inline confirmation', async () => {
    vi.spyOn(startupsApi, 'updateDataRoomUrl').mockResolvedValue({ success: true } as never);
    const { onChange } = renderCard({ dataRoomUrl: 'https://example.com/data-room' });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.delete') }));
    fireEvent.click(screen.getByRole('button', {
      name: i18n.t('startupDetail.dataRoomLink.removeConfirmAction'),
    }));

    await waitFor(() => {
      expect(startupsApi.updateDataRoomUrl).toHaveBeenCalledWith('startup-1', null);
      expect(onChange).toHaveBeenCalledWith(undefined);
    });
  });
});
