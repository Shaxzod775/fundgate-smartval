import i18n from '../i18n';

const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const UZ_MONTHS_SHORT = [
  'yan', 'fev', 'mar', 'apr', 'may', 'iyn',
  'iyl', 'avg', 'sen', 'okt', 'noy', 'dek',
];

const UZ_WEEKDAYS_SHORT = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Jum', 'Sha'];

export const languageLocale = (language?: string): string => {
  const lang = language ?? activeLanguage();
  if (lang?.startsWith('uz')) return 'uz-UZ';
  if (lang?.startsWith('en')) return 'en-US';
  return 'ru-RU';
};

function activeLanguage(): string {
  return i18n.resolvedLanguage || i18n.language || 'ru';
}

const isUz = (language?: string): boolean =>
  (language ?? activeLanguage()).startsWith('uz');

const pad = (value: number): string => String(value).padStart(2, '0');

const isValid = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime());

const intl = (date: Date, language: string | undefined, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(languageLocale(language), options).format(date);

const uzTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatLongDate = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return intl(date, language, { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatMediumDate = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${date.getDate()}-${UZ_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  }
  return intl(date, language, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDayMonth = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${date.getDate()}-${UZ_MONTHS_SHORT[date.getMonth()]}`;
  }
  return intl(date, language, { day: 'numeric', month: 'short' });
};

export const formatDayMonthLong = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${date.getDate()}-${UZ_MONTHS[date.getMonth()]}`;
  }
  return intl(date, language, { day: 'numeric', month: 'long' });
};

export const formatShortDate = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  }
  return intl(date, language, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDayMonthNumeric = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
  }
  return intl(date, language, { day: '2-digit', month: '2-digit' });
};

export const formatWeekdayShort = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) return UZ_WEEKDAYS_SHORT[date.getDay()];
  return intl(date, language, { weekday: 'short' });
};

export const formatMonthYear = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return intl(date, language, { month: 'long', year: 'numeric' });
};

export const formatMonthYearShort = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) {
    return `${UZ_MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
  }
  return intl(date, language, { month: 'short', year: '2-digit' });
};

export const formatTime = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) return uzTime(date);
  return intl(date, language, { hour: '2-digit', minute: '2-digit' });
};

export const formatShortDateTime = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) return `${formatShortDate(date, language)}, ${uzTime(date)}`;
  return intl(date, language, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const formatDayMonthTime = (date: Date, language?: string): string => {
  if (!isValid(date)) return '';
  if (isUz(language)) return `${formatDayMonth(date, language)}, ${uzTime(date)}`;
  return intl(date, language, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};
