import styled, { keyframes } from 'styled-components';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const StyledSpinner = styled.div<{ $size: SpinnerProps['size'] }>`
  border: 2px solid ${({ theme }) => theme.colors.border.primary};
  border-top-color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;

  ${({ $size }) => {
    switch ($size) {
      case 'sm':
        return `
          width: 16px;
          height: 16px;
        `;
      case 'lg':
        return `
          width: 40px;
          height: 40px;
          border-width: 3px;
        `;
      case 'md':
      default:
        return `
          width: 24px;
          height: 24px;
        `;
    }
  }}
`;

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return <StyledSpinner $size={size} className={className} />;
};

export default Spinner;
