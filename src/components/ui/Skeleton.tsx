import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export const Skeleton = styled.div<{ $variant?: 'rect' | 'circle' | 'text'; $width?: string; $height?: string }>`
  background: ${({ theme }) => theme.colors.bg.skeleton}; /* Base color */
  border-radius: ${({ $variant }) => ($variant === 'circle' ? '50%' : '4px')};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height, $variant }) => $height || ($variant === 'text' ? '1em' : '20px')};
  position: relative;
  overflow: hidden;
  display: inline-block;

  /* Shimmer effect overlay */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${({ theme }) => theme.colors.bg.skeletonHighlight} 50%,
      transparent 100%
    );
    animation: ${shimmer} 1.5s infinite;
  }
`;
