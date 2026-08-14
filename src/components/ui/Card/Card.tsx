import styled from 'styled-components';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const StyledCard = styled.div<{ $hoverable?: boolean }>`
  background: ${({ theme }) => theme.colors.bg.card};
  backdrop-filter: blur(10px);
  border: 1px solid ${({ theme }) => theme.colors.border.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  transition: all ${({ theme }) => theme.transitions.base};
  overflow: hidden;
  box-sizing: border-box;
  max-width: 100%;
  box-shadow: ${({ theme }) => (theme.mode === 'light' ? theme.shadows.sm : 'none')};

  @media (max-width: 640px) {
    padding: ${({ theme }) => theme.spacing[4]};
  }

  ${({ $hoverable, theme }) =>
    $hoverable &&
    `
    cursor: pointer;

    &:hover {
      background: ${theme.colors.bg.cardHover};
      transform: translateY(-2px);
      box-shadow: ${theme.mode === 'light' ? theme.shadows.md : theme.shadows.sm};
    }
  `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

export const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const CardSubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

export const CardBody = styled.div`
  /* Body content */
`;

export const Card: React.FC<CardProps> = ({ children, className, hoverable, onClick, ...props }) => {
  return (
    <StyledCard className={className} $hoverable={hoverable} onClick={onClick} {...props}>
      {children}
    </StyledCard>
  );
};

export default Card;
