/**
 * Nami's Habulin (catch-up) engine.
 *
 * Arrears are computed per person, independently, over every 2026 date strictly
 * before "today". Settling always pays the OLDEST unpaid dates first, in batches
 * of 1, 7, or 'all' — so e.g. Min Claire can catch up incrementally from
 * 2026-08-02 forward without touching Joel's ledger.
 *
 * All functions are pure: they never mutate the `DaysMap` passed in.
 */
import type {
  DateKey,
  DayRecord,
  DaysMap,
  HabulinArrears,
  IsoDate,
  Paid,
  PersonArrears,
  PersonId,
  SettleCount,
  SettlePlan,
} from '../types/ipon';
import {
  DAILY_TARGET,
  YEAR_END,
  YEAR_START,
  addDays,
  assertDateKey,
  dateRange,
  isIsoDate,
  isValidDateKey,
} from './calendar2026';

export const SETTLE_PRESETS: readonly SettleCount[] = [1, 7, 'all'];

export function isPaid(days: DaysMap, key: DateKey, person: PersonId): boolean {
  return days[key]?.[person] === 1;
}

export function isFullDay(days: DaysMap, key: DateKey): boolean {
  const rec = days[key];
  return rec?.j === 1 && rec.m === 1;
}

/**
 * Last date that can be in arrears for a given "today" (i.e. yesterday),
 * clamped to 2026. Returns null when no 2026 day has passed yet.
 */
export function lastArrearsDate(today: IsoDate): DateKey | null {
  if (!isIsoDate(today)) throw new RangeError(`Invalid today date: ${today}`);
  if (today <= YEAR_START) return null;
  if (today > YEAR_END) return YEAR_END;
  assertDateKey(today);
  return addDays(today, -1);
}

/** Unpaid dates for one person, strictly before `today`, oldest first. */
export function getUnpaidDates(
  days: DaysMap,
  person: PersonId,
  today: IsoDate,
  from: DateKey = YEAR_START,
): DateKey[] {
  const last = lastArrearsDate(today);
  if (!last) return [];
  return dateRange(from, last).filter((key) => !isPaid(days, key, person));
}

function toPersonArrears(person: PersonId, dates: DateKey[]): PersonArrears {
  return {
    person,
    dates,
    count: dates.length,
    amount: dates.length * DAILY_TARGET,
    oldest: dates[0] ?? null,
    newest: dates[dates.length - 1] ?? null,
  };
}

export function computePersonArrears(days: DaysMap, person: PersonId, today: IsoDate): PersonArrears {
  return toPersonArrears(person, getUnpaidDates(days, person, today));
}

/** Independent arrears for Joel and Min Claire as of `today`. */
export function computeArrears(days: DaysMap, today: IsoDate): HabulinArrears {
  const j = computePersonArrears(days, 'j', today);
  const m = computePersonArrears(days, 'm', today);
  const combinedCount = j.count + m.count;
  return {
    asOf: today,
    j,
    m,
    combinedCount,
    combinedAmount: combinedCount * DAILY_TARGET,
    hasArrears: combinedCount > 0,
  };
}

/** Resolve a settle request to a concrete number of days (never more than available). */
export function resolveSettleCount(count: SettleCount | number, available: number): number {
  if (count === 'all') return available;
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`Settle count must be a positive integer or 'all', got ${String(count)}`);
  }
  return Math.min(count, available);
}

/** Pick the oldest N dates from an unpaid list. */
export function selectOldest(unpaid: readonly DateKey[], count: SettleCount | number): DateKey[] {
  const sorted = [...unpaid].sort();
  return sorted.slice(0, resolveSettleCount(count, sorted.length));
}

/** Preview which dates a settle would pay, without changing anything. */
export function planSettle(
  days: DaysMap,
  person: PersonId,
  count: SettleCount | number,
  today: IsoDate,
): SettlePlan {
  const unpaid = getUnpaidDates(days, person, today);
  const dates = selectOldest(unpaid, count);
  const remaining = unpaid.length - dates.length;
  return {
    person,
    requested: count,
    dates,
    amount: dates.length * DAILY_TARGET,
    remainingCount: remaining,
    remainingAmount: remaining * DAILY_TARGET,
    nextOldest: unpaid[dates.length] ?? null,
  };
}

/** Return a new ledger with `person` marked paid on every date in `dates`. */
export function applyPayments(
  days: DaysMap,
  person: PersonId,
  dates: readonly DateKey[],
  ts: number,
): DaysMap {
  if (dates.length === 0) return days;
  const next: DaysMap = { ...days };
  for (const key of dates) {
    assertDateKey(key);
    const prev = next[key];
    if (prev?.[person] === 1) continue;
    const rec: DayRecord = { j: prev?.j ?? 0, m: prev?.m ?? 0, ts };
    rec[person] = 1;
    next[key] = rec;
  }
  return next;
}

export interface SettleResult {
  days: DaysMap;
  plan: SettlePlan;
}

/** Pay the oldest N (1, 7, 'all', or any positive integer) unpaid dates for one person. */
export function settleOldest(
  days: DaysMap,
  person: PersonId,
  count: SettleCount | number,
  today: IsoDate,
  ts: number = Date.now(),
): SettleResult {
  const plan = planSettle(days, person, count, today);
  return { days: applyPayments(days, person, plan.dates, ts), plan };
}

/** Settle the oldest N for each person independently (each from their own oldest gap). */
export function settleOldestForBoth(
  days: DaysMap,
  count: SettleCount | number,
  today: IsoDate,
  ts: number = Date.now(),
): { days: DaysMap; j: SettlePlan; m: SettlePlan } {
  const jResult = settleOldest(days, 'j', count, today, ts);
  const mResult = settleOldest(jResult.days, 'm', count, today, ts);
  return { days: mResult.days, j: jResult.plan, m: mResult.plan };
}

/**
 * Flat multi-path update map for Firebase RTDB batch writes, e.g.
 * `{ 'days/2026-08-02/m': 1, 'days/2026-08-02/ts': ts }`.
 * `ts` is generic so callers can pass `serverTimestamp()`.
 */
export function buildFlatDayUpdates<T>(
  entries: Iterable<{ key: DateKey; person: PersonId; value?: Paid }>,
  ts: T,
): Record<string, Paid | T> {
  const updates: Record<string, Paid | T> = {};
  for (const { key, person, value = 1 } of entries) {
    if (!isValidDateKey(key)) throw new RangeError(`Not a valid 2026 date key: ${key}`);
    updates[`days/${key}/${person}`] = value;
    updates[`days/${key}/ts`] = ts;
  }
  return updates;
}
