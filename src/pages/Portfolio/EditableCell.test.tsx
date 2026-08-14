// @vitest-environment jsdom

import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import { darkTheme } from '../../styles/theme';
import { EditableCell } from './Portfolio';

function ControlledCell({
  initial,
  type = 'text',
  onSave = vi.fn(),
}: {
  initial: string;
  type?: 'text' | 'number' | 'select';
  onSave?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ThemeProvider theme={darkTheme}>
      <EditableCell
        value={value}
        displayValue={value}
        type={type}
        options={type === 'select' ? [
          { value: 'marketplace', label: 'Marketplace' },
          { value: 'saas', label: 'SaaS' },
        ] : undefined}
        onSave={async (next) => {
          onSave(next);
          setValue(next);
        }}
      />
    </ThemeProvider>
  );
}

describe('Portfolio EditableCell', () => {
  it('edits a numeric cell and rerenders the saved value after Enter', async () => {
    const onSave = vi.fn();
    render(<ControlledCell initial="200000" type="number" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '200000' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '250000' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('250000'));
    expect(await screen.findByRole('button', { name: '250000' })).not.toBeNull();
  });

  it('preserves sub-one-percent input instead of multiplying it', async () => {
    const onSave = vi.fn();
    render(<ControlledCell initial="25" type="number" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '25' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '0.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('0.5'));
  });

  it('saves a segment select and reflects the selected value', async () => {
    const onSave = vi.fn();
    render(<ControlledCell initial="marketplace" type="select" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'marketplace' }));
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'saas' } });
    fireEvent.keyDown(select, { key: 'Enter' });

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('saas'));
    expect(await screen.findByRole('button', { name: 'saas' })).not.toBeNull();
  });

  it('keeps formula cells read-only and exposes their formula source', () => {
    const { container } = render(
      <ThemeProvider theme={darkTheme}>
        <EditableCell
          value="1200000"
          displayValue="$1 200 000"
          disabled
          formula="MRR × 12"
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[data-formula="MRR × 12"]')?.textContent).toBe('$1 200 000');
  });
});
