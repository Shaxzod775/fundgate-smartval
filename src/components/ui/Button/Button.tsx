import styled, { css } from 'styled-components';
import { Theme } from '../../../styles/theme';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  icon?: boolean;
  children?: React.ReactNode;
}

interface StyledButtonProps {
  $variant?: ButtonProps['variant'];
  $size?: ButtonProps['size'];
  $icon?: boolean;
}

const getVariantStyles = (variant: ButtonProps['variant'], theme: Theme) => {
  switch (variant) {
    case 'primary':
      return css`
        background: ${theme.colors.accent.primary};
        border-color: ${theme.colors.accent.primary};
        color: white;

        &:hover:not(:disabled) {
          background: ${theme.colors.accent.primaryHover};
          box-shadow: ${theme.shadows.glow};
        }
      `;
    case 'ghost':
      return css`
        background: transparent;
        border-color: ${theme.colors.border.input};
        color: ${theme.colors.text.primary};

        &:hover:not(:disabled) {
          background: ${theme.colors.bg.input};
          border-color: ${theme.colors.border.primary};
        }
      `;
    case 'danger':
      return css`
        background: transparent;
        border-color: ${theme.colors.status.danger};
        color: ${theme.colors.status.danger};

        &:hover:not(:disabled) {
          background: ${theme.colors.status.dangerBg};
        }
      `;
    case 'success':
      return css`
        background: transparent;
        border-color: ${theme.colors.status.success};
        color: ${theme.colors.status.success};

        &:hover:not(:disabled) {
          background: ${theme.colors.status.successBg};
        }
      `;
    case 'outline':
      return css`
        background: transparent;
        border-color: ${theme.colors.border.primary};
        color: ${theme.colors.text.primary};

        &:hover:not(:disabled) {
          background: ${theme.colors.bg.tertiary};
        }
      `;
    default:
      return '';
  }
};

const getSizeStyles = (size: ButtonProps['size'], icon?: boolean, theme?: Theme) => {
  if (icon) {
    return css`
      padding: ${theme?.spacing[2]};
      min-width: 44px;
    `;
  }

  switch (size) {
    case 'xs':
      return css`
        padding: ${theme?.spacing[1]} ${theme?.spacing[3]};
        min-height: 28px;
        font-size: ${theme?.fontSizes.sm};
      `;
    case 'sm':
      return css`
        padding: ${theme?.spacing[2]} ${theme?.spacing[4]};
        min-height: 36px;
        font-size: ${theme?.fontSizes.base};
      `;
    case 'md':
    default:
      return css`
        padding: ${theme?.spacing[3]} ${theme?.spacing[6]};
        min-height: 44px;
        font-size: ${theme?.fontSizes.md};
      `;
  }
};

const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: 500;
  font-family: inherit;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};
  white-space: nowrap;

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $size, $icon, theme }) => getSizeStyles($size, $icon, theme)}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon = false,
  children,
  ...props
}) => {
  return (
    <StyledButton $variant={variant} $size={size} $icon={icon} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;
