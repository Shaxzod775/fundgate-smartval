export type ThemeMode = 'dark' | 'light';

const designTokens = {
  accent: {
    primary: '#10b981',
    primaryHover: '#16c694',
    primaryLight: 'rgba(16, 185, 129, 0.15)',
    primaryGlow: 'rgba(16, 185, 129, 0.3)',
  },

  status: {
    success: '#10b981',
    successLight: '#a7f3d0',
    successBg: 'rgba(16, 185, 129, 0.1)',
    successBorder: 'rgba(16, 185, 129, 0.3)',

    warning: '#f59e0b',
    warningLight: '#fcd34d',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',

    error: '#ff7a7a',
    danger: '#ef4444',
    dangerBg: 'rgba(239, 68, 68, 0.1)',
    dangerBorder: 'rgba(239, 68, 68, 0.3)',

    info: '#3b82f6',
    infoBg: 'rgba(59, 130, 246, 0.1)',
    infoBorder: 'rgba(59, 130, 246, 0.3)',
  },

  chart: {
    green: '#10b981',
    blue: '#3b82f6',
    amber: '#f59e0b',
    purple: '#8b5cf6',
    pink: '#ec4899',
    cyan: '#06b6d4',
  },

  fonts: {
    family: `-apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif`,
  },

  fontSizes: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    '4xl': '28px',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '999px',
  },

  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },
};

export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    bg: {
      primary: '#0b0b0b',
      secondary: 'rgba(255, 255, 255, 0.05)',
      tertiary: 'rgba(255, 255, 255, 0.04)',
      card: 'rgba(255, 255, 255, 0.05)',
      cardHover: 'rgba(255, 255, 255, 0.06)',
      navbar: 'rgba(10, 10, 10, 0.72)',
      dropdown: '#181818',
      input: 'rgba(255, 255, 255, 0.06)',
      inputFocus: 'rgba(255, 255, 255, 0.08)',
      overlay: 'rgba(0, 0, 0, 0.8)',
      skeleton: 'rgba(255, 255, 255, 0.08)',
      skeletonHighlight: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
      muted: 'rgba(255, 255, 255, 0.6)',
      mutedLight: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.4)',
      inverse: '#ffffff',
    },
    border: {
      primary: 'rgba(255, 255, 255, 0.1)',
      secondary: 'rgba(255, 255, 255, 0.08)',
      subtle: 'rgba(255, 255, 255, 0.06)',
      input: 'rgba(255, 255, 255, 0.12)',
      inputFocus: 'rgba(63, 181, 96, 0.5)',
    },
    accent: designTokens.accent,
    status: designTokens.status,
    chart: designTokens.chart,
  },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 8px 24px rgba(0, 0, 0, 0.2)',
    lg: '0 16px 48px rgba(0, 0, 0, 0.25)',
    xl: '0 24px 64px rgba(0, 0, 0, 0.3)',
    focus: '0 0 0 3px rgba(16, 185, 129, 0.15)',
    glow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
  },
  ...designTokens,
};

export const lightTheme = {
  mode: 'light' as const,
  colors: {
    bg: {
      primary: '#f5f7f9',
      secondary: '#ffffff',
      tertiary: '#eef4f1',
      card: '#ffffff',
      cardHover: '#f8fbfa',
      navbar: 'rgba(255, 255, 255, 0.9)',
      dropdown: '#ffffff',
      input: '#ffffff',
      inputFocus: '#f8fbfa',
      overlay: 'rgba(15, 23, 42, 0.42)',
      skeleton: '#e4e9ef',
      skeletonHighlight: 'rgba(15, 23, 42, 0.06)',
    },
    text: {
      primary: '#15211c',
      secondary: '#3f5149',
      muted: '#63736c',
      mutedLight: '#52655d',
      tertiary: '#87948e',
      inverse: '#ffffff',
    },
    border: {
      primary: '#cfdbd6',
      secondary: '#dae4df',
      subtle: '#e6eeea',
      input: '#c6d4ce',
      inputFocus: 'rgba(16, 185, 129, 0.45)',
    },
    accent: designTokens.accent,
    status: designTokens.status,
    chart: designTokens.chart,
  },
  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 22px rgba(15, 23, 42, 0.07)',
    md: '0 2px 6px rgba(15, 23, 42, 0.05), 0 14px 34px rgba(15, 23, 42, 0.09)',
    lg: '0 4px 12px rgba(15, 23, 42, 0.07), 0 22px 52px rgba(15, 23, 42, 0.12)',
    xl: '0 8px 20px rgba(15, 23, 42, 0.08), 0 32px 72px rgba(15, 23, 42, 0.16)',
    focus: '0 0 0 3px rgba(16, 185, 129, 0.18)',
    glow: '0 0 0 2px rgba(16, 185, 129, 0.28)',
  },
  ...designTokens,
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
};

export const theme = darkTheme;

export type Theme = Omit<typeof darkTheme, 'mode'> & { mode: ThemeMode };
