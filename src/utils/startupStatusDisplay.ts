import type { StartupStatus } from '../types';

export const STARTUP_STATUS_LABELS_RU: Record<StartupStatus, string> = {
  new: 'Новые заявки',
  in_review: 'На проверке',
  pipeline: 'Пайплайн',
  portfolio: 'Портфель',
  rejected: 'Отклонено',
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => unknown;

export function formatStartupStatusLabel(status?: string, t?: TranslateFn): string {
  if (!status) return '';
  if (t && status in STARTUP_STATUS_LABELS_RU) {
    const fallback = STARTUP_STATUS_LABELS_RU[status as StartupStatus];
    const value = t(`startups.status.${status}`, { defaultValue: fallback });
    return typeof value === 'string' ? value : fallback;
  }
  return STARTUP_STATUS_LABELS_RU[status as StartupStatus] || status;
}
