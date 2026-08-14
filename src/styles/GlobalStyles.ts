import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';
import { fadeIn, fadeOut } from './animations';

export const GlobalStyles = createGlobalStyle<{ theme?: Theme }>`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    /* letter-spacing removed */
  }

  body {
    width: 100%;
    font-family: ${({ theme }) => theme.fonts.family};
    font-size: ${({ theme }) => theme.fontSizes.base};
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.primary};
    min-height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: auto;
    color-scheme: ${({ theme }) => theme.mode};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background ${({ theme }) => theme.transitions.base}, color ${({ theme }) => theme.transitions.base};
  }

  button {
    font-family: inherit;
    cursor: pointer;
    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    
    &:active {
      transform: scale(0.96);
    }
  }

  input, textarea, select {
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.bg.secondary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.primary};
    border-radius: ${({ theme }) => theme.radius.sm};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text.muted};
  }

  /* View Transitions disabled - caused mobile freezing */
`;
