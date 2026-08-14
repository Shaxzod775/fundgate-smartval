import styled from 'styled-components';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'primary';
}

const StyledBadge = styled.span<{ $variant: BadgeProps['variant'] }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  border-radius: ${({ theme }) => theme.radius.sm};
  white-space: nowrap;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.accent.primaryLight};
          color: ${theme.colors.accent.primary};
          border: 1px solid ${theme.colors.accent.primary}30;
        `;
      case 'success':
        return `
          background: ${theme.colors.status.successBg};
          color: ${theme.colors.status.success};
        `;
      case 'warning':
        return `
          background: ${theme.colors.status.warningBg};
          color: ${theme.colors.status.warning};
        `;
      case 'danger':
        return `
          background: ${theme.colors.status.dangerBg};
          color: ${theme.colors.status.danger};
        `;
      case 'info':
        return `
          background: ${theme.colors.status.infoBg};
          color: ${theme.colors.status.info};
        `;
      case 'purple':
        return `
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        `;
      case 'neutral':
      default:
        return `
          background: ${theme.colors.bg.secondary};
          color: ${theme.colors.text.muted};
        `;
    }
  }}
`;

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className, ...props }) => {
  return (
    <StyledBadge $variant={variant} className={className} {...props}>
      {children}
    </StyledBadge>
  );
};

export default Badge;
