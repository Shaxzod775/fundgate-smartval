import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  gap: 0;
`;

const StepCircle = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.3s ease;

  background: ${({ $active, $completed, theme }) =>
    $completed
      ? theme.colors.accent.primary
      : $active
        ? theme.colors.accent.primary
        : theme.colors.bg.tertiary};
  color: ${({ $active, $completed }) =>
    $completed || $active ? '#fff' : '#9CA3AF'};
  border: 2px solid ${({ $active, $completed, theme }) =>
    $completed || $active ? theme.colors.accent.primary : theme.colors.border.secondary};
`;

const StepLine = styled.div<{ $completed: boolean }>`
  width: 60px;
  height: 2px;
  background: ${({ $completed, theme }) =>
    $completed ? theme.colors.accent.primary : theme.colors.border.secondary};
  transition: background 0.3s ease;
`;

const StepWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: 11px;
  color: ${({ $active }) => ($active ? '#fff' : '#9CA3AF')};
  white-space: nowrap;
`;

const LineWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  padding-top: 15px;
`;

interface StepIndicatorProps {
  currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const { t } = useTranslation();

  const steps = [
    t('wizard.stepA.title'),
    t('wizard.stepB.title'),
    t('wizard.stepC.title'),
  ];

  return (
    <Container>
      {steps.map((label, idx) => (
        <React.Fragment key={idx}>
          <StepWrapper>
            <StepCircle
              $active={currentStep === idx}
              $completed={currentStep > idx}
            >
              {currentStep > idx ? <Check size={16} /> : idx + 1}
            </StepCircle>
            <StepLabel $active={currentStep >= idx}>{label}</StepLabel>
          </StepWrapper>
          {idx < steps.length - 1 && (
            <LineWrapper>
              <StepLine $completed={currentStep > idx} />
            </LineWrapper>
          )}
        </React.Fragment>
      ))}
    </Container>
  );
};
