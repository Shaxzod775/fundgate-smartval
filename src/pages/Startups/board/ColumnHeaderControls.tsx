import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Layers, MoreVertical, Trash2 } from 'lucide-react';
import type { StartupBoardColumn } from '../../../types';
import type { BoardEditorApi } from './useBoardEditor';
import { ColorPalette } from './ColorPalette';

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex: 1;
  min-width: 0;
`;

const ColorDot = styled.button<{ $color: string }>`
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: none;
  padding: 0;
  cursor: pointer;
`;

const NameInput = styled.input`
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 2px 6px;
  margin: -2px -6px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  font-family: inherit;
  outline: none;
  transition: border-color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast};

  &:hover { border-color: ${({ theme }) => theme.colors.border.secondary}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.input};
  }
`;

const MenuButton = styled.button`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const Menu = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 1050;
  width: 220px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MenuLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.secondary};
  margin: ${({ theme }) => theme.spacing[1]} 0;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2]}`};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.status.danger : theme.colors.text.primary)};
  text-align: left;

  &:hover {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.status.dangerBg : theme.colors.bg.tertiary)};
  }
`;

interface ColumnHeaderControlsProps {
  column: StartupBoardColumn;
  editor: BoardEditorApi;
  canDelete: boolean;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  onRequestDelete: (column: StartupBoardColumn) => void;
  onEditStages: (column: StartupBoardColumn) => void;
  dragHandle?: React.ReactNode;
}

export const ColumnHeaderControls = ({
  column,
  editor,
  canDelete,
  autoFocus,
  onAutoFocusDone,
  onRequestDelete,
  onEditStages,
  dragHandle,
}: ColumnHeaderControlsProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(column.label);
  const [focused, setFocused] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setValue(column.label);
  }, [column.label, focused]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      onAutoFocusDone?.();
    }
  }, [autoFocus, onAutoFocusDone]);

  useEffect(() => {
    if (!menuPos) return;
    const close = (event: MouseEvent) => {
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) return;
      setMenuPos(null);
    };
    const onEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuPos(null); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menuPos]);

  const toggleMenu = () => {
    if (menuPos) { setMenuPos(null); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 220) });
  };

  const handleChange = (next: string) => {
    setValue(next);
    editor.rename(column.id, next);
  };

  return (
    <Wrap>
      {dragHandle}
      <ColorDot
        type="button"
        $color={column.color}
        onClick={toggleMenu}
        title={t('startups.boardEditor.menu.recolor')}
      />
      <NameInput
        ref={inputRef}
        value={value}
        placeholder={t('startups.boardEditor.renamePlaceholder')}
        maxLength={40}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      />
      <MenuButton ref={buttonRef} type="button" onClick={toggleMenu} aria-label={t('startups.boardEditor.menu.columnMenu')}>
        <MoreVertical size={16} />
      </MenuButton>

      {menuPos && createPortal(
        <Menu $top={menuPos.top} $left={menuPos.left} onMouseDown={(event) => event.stopPropagation()}>
          <MenuLabel>{t('startups.boardEditor.menu.recolor')}</MenuLabel>
          <ColorPalette value={column.color} onPick={(color) => editor.recolor(column.id, color)} />
          <Divider />
          <MenuItem type="button" onClick={() => { setMenuPos(null); onEditStages(column); }}>
            <Layers size={16} />
            {t('startups.boardEditor.menu.stages')}
          </MenuItem>
          {canDelete && (
            <MenuItem type="button" $danger onClick={() => { setMenuPos(null); onRequestDelete(column); }}>
              <Trash2 size={16} />
              {t('startups.boardEditor.menu.delete')}
            </MenuItem>
          )}
        </Menu>,
        document.body,
      )}
    </Wrap>
  );
};
