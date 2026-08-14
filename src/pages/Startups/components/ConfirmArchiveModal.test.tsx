import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { darkTheme } from '../../../styles/theme';
import { ConfirmArchiveModal } from './ConfirmArchiveModal';

const renderModal = (props: Partial<React.ComponentProps<typeof ConfirmArchiveModal>> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={darkTheme}>
        <ConfirmArchiveModal
          isOpen
          startupName="Demo Co"
          onConfirm={onConfirm}
          onCancel={onCancel}
          {...props}
        />
      </ThemeProvider>
    </I18nextProvider>
  );
  return { onConfirm, onCancel };
};

describe('ConfirmArchiveModal', () => {
  it('blocks confirmation until a reason is provided', () => {
    renderModal();
    const confirm = screen.getByRole('button', { name: i18n.t('startups.archive.deleteButton') }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('fills the reason from a preset and confirms with it', () => {
    const { onConfirm } = renderModal();
    const presetText = i18n.t('startups.rejection.reasons.weak_team');
    fireEvent.click(screen.getByRole('button', { name: presetText }));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(presetText);

    fireEvent.click(screen.getByRole('button', { name: i18n.t('startups.archive.deleteButton') }));
    expect(onConfirm).toHaveBeenCalledWith(presetText);
  });

  it('confirms with trimmed custom text', () => {
    const { onConfirm } = renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  своя причина  ' } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('startups.archive.deleteButton') }));
    expect(onConfirm).toHaveBeenCalledWith('своя причина');
  });

  it('does not render when closed', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={darkTheme}>
          <ConfirmArchiveModal isOpen={false} startupName="X" onConfirm={vi.fn()} onCancel={vi.fn()} />
        </ThemeProvider>
      </I18nextProvider>
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
