import i18n from '../i18n';

export const numberLocale = (language?: string): string => {
  const lang = language ?? (i18n.resolvedLanguage || i18n.language || 'ru');
  return lang.startsWith('en') ? 'en-US' : 'ru-RU';
};

export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
  language?: string,
): string => value.toLocaleString(numberLocale(language), options);
