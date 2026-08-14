import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import type { DataRoomBlocker, DataRoomBlockerReasonInput } from '../../../services/api';
import { darkTheme } from '../../../styles/theme';
import DataRoomBlockersDialog from './DataRoomBlockersDialog';

const blockers: DataRoomBlocker[] = [
  {
    startupId: 'startup-1',
    startupName: 'Alpha',
    reasonCode: 'missing_data_room_url',
    message: 'Missing link',
    managerReason: 'Founder is preparing access',
  },
  {
    startupId: 'startup-2',
    startupName: 'Deleted startup',
    reasonCode: 'startup_not_found',
    message: 'Not found',
  },
];

function renderDialog(options: {
  dialogBlockers?: DataRoomBlocker[];
  canEditLink?: (startupId: string) => boolean;
  onSave?: (reasons: DataRoomBlockerReasonInput[]) => void | Promise<void>;
  onSaveLink?: (startupId: string, dataRoomUrl: string) => void | Promise<void>;
  onDone?: () => void | Promise<void>;
  onClose?: () => void;
} = {}) {
  const canEditLink = options.canEditLink || (() => true);
  const onSave = options.onSave || vi.fn<(reasons: DataRoomBlockerReasonInput[]) => void>();
  const onSaveLink = options.onSaveLink || vi.fn<(startupId: string, dataRoomUrl: string) => void>();
  const onDone = options.onDone || vi.fn<() => void>();
  const onClose = options.onClose || vi.fn<() => void>();
  const renderContent = (dialogBlockers: DataRoomBlocker[]) => (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <DataRoomBlockersDialog
          blockers={dialogBlockers}
          canEditLink={canEditLink}
          onSave={onSave}
          onSaveLink={onSaveLink}
          onDone={onDone}
          onClose={onClose}
        />
      </ThemeProvider>
    </I18nextProvider>
  );
  const view = render(renderContent(options.dialogBlockers || blockers));
  return {
    onSave,
    onSaveLink,
    onDone,
    onClose,
    rerenderDialog: (dialogBlockers: DataRoomBlocker[]) => view.rerender(renderContent(dialogBlockers)),
  };
}

describe('DataRoomBlockersDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru');
  });

  it('requires one valid reason per project and has no bypass action', () => {
    const { onSave } = renderDialog();
    const saveButton = screen.getByRole('button', { name: 'Сохранить причины' }) as HTMLButtonElement;
    const reasonInputs = screen.getAllByLabelText('Почему Data Room пока не готов?') as HTMLTextAreaElement[];

    expect(reasonInputs[0].value).toBe('Founder is preparing access');
    expect(saveButton.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /продолжить/i })).toBeNull();

    fireEvent.change(reasonInputs[1], { target: { value: '  New link requested  ' } });
    expect(saveButton.disabled).toBe(false);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith([
      { startupId: 'startup-1', reason: 'Founder is preparing access' },
      { startupId: 'startup-2', reason: 'New link requested' },
    ]);
  });

  it('does not render an open-card link for a missing startup', () => {
    renderDialog();
    const links = screen.getAllByRole('link', { name: /Открыть карточку/i });

    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/startups/startup-1');
    expect(screen.getByText(/Сохранение данных не переводит заседание дальше/)).toBeTruthy();
    expect(screen.getAllByLabelText('Ссылка на Data Room')).toHaveLength(1);
  });

  it('saves a normalized HTTPS link directly from the blocker card', async () => {
    const onSaveLink = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSaveLink });

    fireEvent.change(screen.getByLabelText('Ссылка на Data Room'), {
      target: { value: '  https://notion.so/alpha-room  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить ссылку для Alpha' }));

    await waitFor(() => {
      expect(onSaveLink).toHaveBeenCalledWith(
        'startup-1',
        'https://notion.so/alpha-room',
      );
    });
  });

  it('blocks an invalid link without calling the save callback', () => {
    const { onSaveLink } = renderDialog();

    fireEvent.change(screen.getByLabelText('Ссылка на Data Room'), {
      target: { value: 'http://example.com/data-room' },
    });

    expect(screen.getByRole('alert').textContent).toBe(
      'Укажите полную HTTPS-ссылку, начинающуюся с https://.',
    );
    expect((screen.getByRole('button', { name: 'Сохранить ссылку для Alpha' }) as HTMLButtonElement).disabled).toBe(true);
    expect(onSaveLink).not.toHaveBeenCalled();
  });

  it('keeps the entered link and shows a per-project API error', async () => {
    const onSaveLink = vi.fn().mockRejectedValue(new Error('Недостаточно прав'));
    renderDialog({ onSaveLink });
    const linkInput = screen.getByLabelText('Ссылка на Data Room') as HTMLInputElement;

    fireEvent.change(linkInput, { target: { value: 'https://example.com/data-room' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить ссылку для Alpha' }));

    expect(await screen.findByText('Недостаточно прав')).toBeTruthy();
    expect(linkInput.value).toBe('https://example.com/data-room');
  });

  it('uses the completion callback after the parent removes the saved blocker', () => {
    const { onDone, onClose, rerenderDialog } = renderDialog({ dialogBlockers: [blockers[0]] });

    rerenderDialog([]);

    expect(screen.getByText(/Все ссылки добавлены/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(onDone).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Сохранить причины' })).toBeNull();
  });

  it('does not show the link editor to a user without edit permission', () => {
    renderDialog({ canEditLink: () => false });

    expect(screen.queryByLabelText('Ссылка на Data Room')).toBeNull();
    expect(screen.getByText(/Ссылку может добавить генеральный директор/)).toBeTruthy();
  });
});
