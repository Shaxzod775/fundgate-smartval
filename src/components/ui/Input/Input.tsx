import styled from 'styled-components';
import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

const Label = styled.label<{ $required?: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};

  ${({ $required, theme }) =>
    $required &&
    `
    &::after {
      content: " *";
      color: ${theme.colors.status.error};
    }
  `}
`;

const StyledInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.bg.input};
  border: 1px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.colors.status.danger : theme.colors.border.input};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: all ${({ theme }) => theme.transitions.base};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.status.danger : theme.colors.border.inputFocus};
    background: ${({ theme }) => theme.colors.bg.inputFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.status.error};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className, ...props }, ref) => {
    return (
      <FormGroup className={className}>
        {label && <Label $required={required}>{label}</Label>}
        <StyledInput ref={ref} $hasError={!!error} {...props} />
        {error && <ErrorText>{error}</ErrorText>}
      </FormGroup>
    );
  }
);

Input.displayName = 'Input';

export default Input;
