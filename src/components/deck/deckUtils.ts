import type { DateKey, IsoDate, MonthNumber } from '../../types/ipon';
import {
  MONTH_ABBR,
  MONTH_NAMES,
  YEAR_END,
  YEAR_START,
  dayOfYear,
  getCalendarDay,
  isValidDateKey,
  parseDateKey,
} from '../../utils/calendar2026';

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

/** e.g. `Aug 2` */
export function formatShortDate(key: DateKey): string {
  const { month, day } = parseDateKey(key);
  const abbr = MONTH_ABBR[month - 1];
  const titleAbbr = abbr[0] + abbr.slice(1).toLowerCase();
  return `${titleAbbr} ${day}`;
}

/** e.g. `Sun, Nov 22, 2026` */
export function formatFullDate(key: DateKey): string {
  const info = getCalendarDay(key);
  const abbr = MONTH_ABBR[info.month - 1];
  const titleAbbr = abbr[0] + abbr.slice(1).toLowerCase();
  return `${info.weekdayName}, ${titleAbbr} ${info.day}, 2026`;
}

/** e.g. `November 2026` */
export function formatMonthYear(month: MonthNumber): string {
  return `${MONTH_NAMES[month - 1]} 2026`;
}

/**
 * Returns true if `key` is strictly more than 7 calendar days before `today`.
 * Used to trigger the confirmation guard before un-marking historical deposits.
 */
export function isOlderThanSevenDays(key: DateKey, today: IsoDate): boolean {
  if (today < YEAR_START) return false;
  if (today > YEAR_END) return true;
  if (!isValidDateKey(today)) return false;
  return dayOfYear(today) - dayOfYear(key) > 7;
}

/** Resolve an initial 2026 month (1..12) from `today` (clamped to 2026). */
export function resolveInitialMonth(today: IsoDate): MonthNumber {
  if (isValidDateKey(today)) return parseDateKey(today).month;
  if (today > YEAR_END) return 12;
  return 1;
}

/** Resolve an initial 2026 date key from `today` (clamped to 2026). */
export function resolveInitialDate(today: IsoDate): DateKey {
  if (isValidDateKey(today)) return today;
  if (today > YEAR_END) return YEAR_END;
  return YEAR_START;
}
