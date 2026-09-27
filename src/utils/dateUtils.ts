/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

/**
 * Parses various sale date formats into a standard JS Date object.
 * Supported formats:
 * - Date instance
 * - Unix timestamp (ms or seconds)
 * - 'Just Now' -> refDate (current instant)
 * - 'MMM DD, YYYY, HH:mm' or 'MMM DD, YYYY HH:mm' (e.g. 'Oct 24, 2026, 19:42')
 * - 'MMM DD, HH:mm' (e.g. 'Oct 24, 19:42') -> defaults to refDate.getFullYear()
 * - ISO string: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss...'
 */
export function parseSaleDate(
  input: string | Date | number | undefined | null,
  refDate: Date = new Date()
): Date | null {
  if (input === undefined || input === null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : new Date(input.getTime());
  if (typeof input === 'number') {
    const ms = input < 10000000000 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = input.trim();
  if (str.toLowerCase() === 'just now') {
    return new Date(refDate.getTime());
  }

  // Format: 'MMM D, YYYY, HH:mm' or 'MMM DD, YYYY, HH:mm'
  const withYearMatch = str.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})[,\s]+(\d{1,2}):(\d{2})/);
  if (withYearMatch) {
    const [, mStr, dStr, yStr, hStr, minStr] = withYearMatch;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.indexOf(mStr.toLowerCase());
    if (mIdx !== -1) {
      return new Date(parseInt(yStr, 10), mIdx, parseInt(dStr, 10), parseInt(hStr, 10), parseInt(minStr, 10), 0, 0);
    }
  }

  // Format: 'MMM DD, HH:mm' (e.g. 'Oct 24, 19:42')
  const noYearMatch = str.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{1,2}):(\d{2})/);
  if (noYearMatch) {
    const [, mStr, dStr, hStr, minStr] = noYearMatch;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.indexOf(mStr.toLowerCase());
    if (mIdx !== -1) {
      return new Date(refDate.getFullYear(), mIdx, parseInt(dStr, 10), parseInt(hStr, 10), parseInt(minStr, 10), 0, 0);
    }
  }

  // Fallback to standard JS Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Parses YYYY-MM-DD input string to a Date object set to either start-of-day (00:00:00.000)
 * or end-of-day (23:59:59.999).
 */
export function parseDateBoundary(dateStr: string, isEndOfDay: boolean = false): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  if (isEndOfDay) {
    return new Date(year, month, day, 23, 59, 59, 999);
  }
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD for HTML5 date inputs
 */
export function formatDateToInputString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DateRangeOptions {
  customStart?: string;
  customEnd?: string;
  refDate?: Date;
}

/**
 * Calculates start and end Date boundaries for presets:
 * - today: 00:00:00.000 to 23:59:59.999 of refDate
 * - yesterday: 00:00:00.000 to 23:59:59.999 of refDate - 1 day
 * - week: Monday 00:00:00.000 to Sunday 23:59:59.999 of the current week
 * - month: 1st day 00:00:00.000 to last day 23:59:59.999 of refDate's month
 * - custom: customStart (start-of-day) to customEnd (end-of-day)
 * - all: null (no bounding range)
 */
export function getDateRangeForPreset(
  preset: string,
  options: DateRangeOptions = {}
): DateRange | null {
  const ref = options.refDate ? new Date(options.refDate) : new Date();

  switch (preset) {
    case 'today': {
      const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
      const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'yesterday': {
      const y = new Date(ref);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'week':
    case '7days': {
      const start = new Date(ref);
      const day = start.getDay(); // 0 is Sunday, 1 is Monday...
      const diff = (day === 0 ? -6 : 1) - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'custom': {
      if (!options.customStart && !options.customEnd) return null;
      const start = options.customStart
        ? parseDateBoundary(options.customStart, false)
        : new Date(1970, 0, 1, 0, 0, 0, 0);
      const end = options.customEnd
        ? parseDateBoundary(options.customEnd, true)
        : new Date(2099, 11, 31, 23, 59, 59, 999);

      if (!start || !end) return null;
      return { start, end };
    }
    case 'all':
    default:
      return null;
  }
}

/**
 * Determines whether a given transaction date falls within the specified DateRange.
 * Handles boundary conditions:
 * - Sale exactly at start boundary -> included (>=)
 * - Sale exactly at end boundary -> included (<=)
 * - Range with start > end -> returns false (invalid range / no matches)
 */
export function isDateInRange(
  dateInput: string | Date | number | undefined | null,
  range: DateRange | null,
  refDate: Date = new Date()
): boolean {
  if (!range) return true;
  if (range.start.getTime() > range.end.getTime()) return false;

  const parsed = parseSaleDate(dateInput, refDate);
  if (!parsed) return false;

  const timestamp = parsed.getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}
