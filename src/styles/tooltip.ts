import { css } from 'styled-components';

export interface HoverTooltipOptions {
  placement?: 'top' | 'bottom';
  align?: 'left' | 'right';
  delayMs?: number;
  wrap?: boolean;
}

export const hoverTooltip = ({
  placement = 'top',
  align = 'left',
  delayMs = 400,
  wrap = false,
}: HoverTooltipOptions = {}) => css`
  position: relative;

  /* Без атрибута подсказки не рисуем пустую плашку — один и тот же компонент
     может использоваться и с ней, и без. */
  &:not([data-tooltip])::after { display: none; }

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    ${placement === 'top' ? 'bottom: calc(100% + 6px);' : 'top: calc(100% + 6px);'}
    ${align === 'left' ? 'left: 0;' : 'right: 0;'}
    z-index: 5;
    padding: 4px ${({ theme }) => theme.spacing[2]};
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.bg.dropdown};
    color: ${({ theme }) => theme.colors.text.primary};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 500;
    line-height: 1.35;
    text-align: left;
    ${wrap ? 'white-space: normal; width: max-content; max-width: 220px;' : 'white-space: nowrap;'}
    opacity: 0;
    pointer-events: none;
    transition: opacity ${({ theme }) => theme.transitions.base} ${delayMs}ms;
  }

  &:hover:not(:disabled)::after,
  &:focus-visible::after {
    opacity: 1;
  }
`;
