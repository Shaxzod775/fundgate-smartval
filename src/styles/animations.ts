import { keyframes, css } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const dissolveIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

export const PageTransition = css`
  /* Smooth dissolve effect */
  animation: ${dissolveIn} 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
`;

export const StaggeredList = css`
  & > * {
    animation: ${slideInUp} 0.5s ease-out forwards;
    opacity: 0; // Start hidden
  }

  & > *:nth-child(1) { animation-delay: 0.05s; }
  & > *:nth-child(2) { animation-delay: 0.1s; }
  & > *:nth-child(3) { animation-delay: 0.15s; }
  & > *:nth-child(4) { animation-delay: 0.2s; }
  & > *:nth-child(5) { animation-delay: 0.25s; }
  & > *:nth-child(6) { animation-delay: 0.3s; }
  & > *:nth-child(7) { animation-delay: 0.35s; }
  & > *:nth-child(8) { animation-delay: 0.4s; }
  & > *:nth-child(9) { animation-delay: 0.45s; }
  & > *:nth-child(10) { animation-delay: 0.5s; }
`;

export const Clickable = css`
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  
  &:active {
    transform: scale(0.97);
  }
  
  &:hover {
    opacity: 0.9;
  }
`;
