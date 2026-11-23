/**
 * 2026 calendar math — all 365 days (2026-01-01 → 2026-12-31), weekday offsets
 * and the 12-island Grand Line route (one island per month).
 *
 * All date math is done in UTC so results never shift with the device timezone.
 * 2026 is not a leap year: Feb = 28 days, Jan 1 = Thursday, Dec 31 = Thursday.
 */
import type {
  CalendarDay,
  DateKey,
  IslandMeta,
  IsoDate,
  MonthKey,
  MonthNumber,
  Weekday,
} from '../types/ipon';

export const IPON_YEAR = 2026;
export const DAILY_TARGET = 50;
export const DAYS_IN_YEAR = 365;
/** ₱18,250 per person. */
export const PERSON_YEAR_GOAL = DAILY_TARGET * DAYS_IN_YEAR;
/** ₱36,500 combined. */
export const COMBINED_YEAR_GOAL = PERSON_YEAR_GOAL * 2;

export const YEAR_START: DateKey = '2026-01-01';
export const YEAR_END: DateKey = '2026-12-31';

export const MONTH_LENGTHS_2026 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MS_PER_DAY = 86_400_000;
const YEAR_START_UTC = Date.UTC(IPON_YEAR, 0, 1);
const DATE_KEY_PATTERN = /^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_KEY_PATTERN = /^2026-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number): string => String(n).padStart(2, '0');

function assertMonth(month: number): asserts month is MonthNumber {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid 2026 month: ${month}`);
  }
}

// ---------------------------------------------------------------------------
// Key construction & validation
// ---------------------------------------------------------------------------

export function toDateKey(month: number, day: number): DateKey {
  assertMonth(month);
  const len = MONTH_LENGTHS_2026[month - 1];
  if (!Number.isInteger(day) || day < 1 || day > len) {
    throw new RangeError(`Invalid day ${day} for 2026-${pad2(month)}`);
  }
  return `2026-${pad2(month)}-${pad2(day)}`;
}

export function toMonthKey(month: number): MonthKey {
  assertMonth(month);
  return `2026-${pad2(month)}`;
}

export function isValidDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;
  return Number(match[2]) <= MONTH_LENGTHS_2026[Number(match[1]) - 1];
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  return typeof value === 'string' && MONTH_KEY_PATTERN.test(value);
}

/** Any well-formed `YYYY-MM-DD` string (year not restricted). */
export function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value);
}

export function assertDateKey(value: unknown): asserts value is DateKey {
  if (!isValidDateKey(value)) {
    throw new RangeError(`Not a valid 2026 date key: ${String(value)}`);
  }
}

export function parseDateKey(key: DateKey): { year: 2026; month: MonthNumber; day: number } {
  assertDateKey(key);
  return {
    year: IPON_YEAR,
    month: Number(key.slice(5, 7)) as MonthNumber,
    day: Number(key.slice(8, 10)),
  };
}

/** Local-time `YYYY-MM-DD` for a JS Date (what the user sees as "today"). */
export function dateKeyFromDate(date: Date = new Date()): IsoDate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** ISO strings sort lexicographically, so plain comparison is chronological. */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// 365-day table
// ---------------------------------------------------------------------------

function buildCalendar(): readonly CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let i = 0; i < DAYS_IN_YEAR; i++) {
    const d = new Date(YEAR_START_UTC + i * MS_PER_DAY);
    const month = (d.getUTCMonth() + 1) as MonthNumber;
    const day = d.getUTCDate();
    const weekday = d.getUTCDay() as Weekday;
    days.push(
      Object.freeze({
        key: toDateKey(month, day),
        monthKey: toMonthKey(month),
        year: IPON_YEAR,
        month,
        day,
        weekday,
        weekdayName: WEEKDAY_SHORT[weekday],
        dayOfYear: i + 1,
        isWeekend: weekday === 0 || weekday === 6,
      }),
    );
  }
  // Integrity guard: Jan 1, 2026 is a Thursday and the year ends on Dec 31.
  if (days[0].weekday !== 4 || days[DAYS_IN_YEAR - 1].key !== YEAR_END) {
    throw new Error('2026 calendar failed integrity check');
  }
  return Object.freeze(days);
}

/** All 365 days of 2026 in order. Index `n` = day-of-year `n + 1`. */
export const CALENDAR_2026: readonly CalendarDay[] = buildCalendar();

export const DATE_KEYS_2026: readonly DateKey[] = Object.freeze(CALENDAR_2026.map((d) => d.key));

export function getCalendarDay(key: DateKey): CalendarDay {
  return CALENDAR_2026[dayOfYear(key) - 1];
}

/** 1-based day of year (Jan 1 = 1, Nov 22 = 326, Dec 31 = 365). */
export function dayOfYear(key: DateKey): number {
  const { month, day } = parseDateKey(key);
  let n = day;
  for (let i = 0; i < month - 1; i++) n += MONTH_LENGTHS_2026[i];
  return n;
}

export function dateKeyFromDayOfYear(n: number): DateKey {
  if (!Number.isInteger(n) || n < 1 || n > DAYS_IN_YEAR) {
    throw new RangeError(`Day of year out of range: ${n}`);
  }
  return CALENDAR_2026[n - 1].key;
}

/** Shift a 2026 key by `delta` days; returns null if the result leaves 2026. */
export function addDays(key: DateKey, delta: number): DateKey | null {
  const n = dayOfYear(key) + delta;
  return n >= 1 && n <= DAYS_IN_YEAR ? CALENDAR_2026[n - 1].key : null;
}

/** Inclusive list of keys from `start` to `end`. Empty if start > end. */
export function dateRange(start: DateKey, end: DateKey): DateKey[] {
  const s = dayOfYear(start);
  const e = dayOfYear(end);
  if (s > e) return [];
  return DATE_KEYS_2026.slice(s - 1, e);
}

/** Inclusive day count between two 2026 keys (0 if start > end). */
export function countDaysInclusive(start: DateKey, end: DateKey): number {
  const s = dayOfYear(start);
  const e = dayOfYear(end);
  return s > e ? 0 : e - s + 1;
}

// ---------------------------------------------------------------------------
// 12 Grand Line islands (one per month)
// ---------------------------------------------------------------------------

const ISLAND_ROUTE: ReadonlyArray<{ name: string; tagline: string }> = [
  { name: 'Reverse Mountain', tagline: 'Entrance to the Grand Line' },
  { name: 'Whisky Peak', tagline: 'Town of welcoming bounty hunters' },
  { name: 'Little Garden', tagline: 'Prehistoric island of giants' },
  { name: 'Drum Island', tagline: 'Winter kingdom of cherry blossoms' },
  { name: 'Alabasta', tagline: 'Desert kingdom of sand' },
  { name: 'Jaya', tagline: 'Pirate port where dreams are laughed at' },
  { name: 'Skypiea', tagline: 'Island in the sky' },
  { name: 'Water 7', tagline: 'City of shipwrights' },
  { name: 'Enies Lobby', tagline: 'Island of the judiciary' },
  { name: 'Thriller Bark', tagline: 'Ghost ship of the Florian Triangle' },
  { name: 'Sabaody Archipelago', tagline: 'Gateway to the New World' },
  { name: 'Laugh Tale', tagline: 'The final island — the ₱36,500 treasure' },
];

function buildIslands(): readonly IslandMeta[] {
  return Object.freeze(
    ISLAND_ROUTE.map((island, index): IslandMeta => {
      const month = (index + 1) as MonthNumber;
      const daysInMonth = MONTH_LENGTHS_2026[index];
      const startKey = toDateKey(month, 1);
      const endKey = toDateKey(month, daysInMonth);
      return Object.freeze({
        index,
        month,
        monthKey: toMonthKey(month),
        monthName: MONTH_NAMES[index],
        monthAbbr: MONTH_ABBR[index],
        name: island.name,
        tagline: island.tagline,
        daysInMonth,
        startKey,
        endKey,
        startDayOfYear: dayOfYear(startKey),
        endDayOfYear: dayOfYear(endKey),
        firstWeekday: getCalendarDay(startKey).weekday,
        personTarget: daysInMonth * DAILY_TARGET,
        combinedTarget: daysInMonth * DAILY_TARGET * 2,
      });
    }),
  );
}

export const ISLANDS_2026: readonly IslandMeta[] = buildIslands();

export function getIsland(month: number): IslandMeta {
  assertMonth(month);
  return ISLANDS_2026[month - 1];
}

export function getIslandForDate(key: DateKey): IslandMeta {
  return getIsland(parseDateKey(key).month);
}

export function getMonthDays(month: number): readonly CalendarDay[] {
  const island = getIsland(month);
  return CALENDAR_2026.slice(island.startDayOfYear - 1, island.endDayOfYear);
}

/**
 * 7-column month grid with leading/trailing `null` padding.
 * `weekStartsOn` 0 = Sunday-first (default), 1 = Monday-first.
 */
export function getMonthGrid(month: number, weekStartsOn: 0 | 1 = 0): (CalendarDay | null)[][] {
  const days = getMonthDays(month);
  const leading = (days[0].weekday - weekStartsOn + 7) % 7;
  const cells: (CalendarDay | null)[] = [...Array<null>(leading).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
