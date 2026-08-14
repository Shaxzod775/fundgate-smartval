type FirestoreDateValue = {
  _seconds?: unknown;
  seconds?: unknown;
  toDate?: unknown;
  toMillis?: unknown;
};

export function dateValueToDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object') {
    const timestamp = value as FirestoreDateValue;

    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    if (typeof timestamp.toMillis === 'function') {
      const millis = timestamp.toMillis();
      if (typeof millis === 'number' && Number.isFinite(millis)) {
        return new Date(millis);
      }
    }

    const seconds = timestamp._seconds ?? timestamp.seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      return new Date(seconds * 1000);
    }
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateValueToTimestamp(value: unknown): number {
  return dateValueToDate(value)?.getTime() ?? 0;
}
