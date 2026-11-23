/**
 * 2026 Excel ("IPON CALENDAR" workbook) importer.
 *
 * Each person gets an independent inclusive date range. The 1-tap default preset
 * mirrors the workbook's state as of the cut-over:
 *   - Joel:       2026-01-01 → 2026-11-22  (326 days = ₱16,300)
 *   - Min Claire: 2026-01-01 → 2026-08-01  (213 days = ₱10,650)
 *   - Total:                                 ₱26,950
 */
import type {
  DateKey,
  DayRecord,
  DaysMap,
  ImportMode,
  ImportPlan,
  ImportSummary,
  ImportValidation,
  Paid,
  PersonId,
  PersonImportSummary,
  PersonRange,
} from '../types/ipon';
import { PEOPLE, PERSON_IDS } from '../types/ipon';
import { DAILY_TARGET, countDaysInclusive, dateRange, isValidDateKey } from './calendar2026';
import { buildFlatDayUpdates, isPaid } from './habulinEngine';

export const DEFAULT_IMPORT_PLAN: Readonly<{ j: Readonly<PersonRange>; m: Readonly<PersonRange> }> = {
  j: { start: '2026-01-01', end: '2026-11-22' },
  m: { start: '2026-01-01', end: '2026-08-01' },
};
Object.freeze(DEFAULT_IMPORT_PLAN.j);
Object.freeze(DEFAULT_IMPORT_PLAN.m);
Object.freeze(DEFAULT_IMPORT_PLAN);

/** Fresh, editable copy of the default preset — what the 1-tap button pre-fills. */
export function createDefaultImportPlan(): ImportPlan {
  return { j: { ...DEFAULT_IMPORT_PLAN.j }, m: { ...DEFAULT_IMPORT_PLAN.m } };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateRange(range: PersonRange): string[] {
  const errors: string[] = [];
  const startOk = isValidDateKey(range.start);
  const endOk = isValidDateKey(range.end);
  if (!startOk) errors.push('Start date must be a valid 2026 date (YYYY-MM-DD).');
  if (!endOk) errors.push('End date must be a valid 2026 date (YYYY-MM-DD).');
  if (startOk && endOk && range.start > range.end) {
    errors.push('Start date must be on or before the end date.');
  }
  return errors;
}

export function validateImportPlan(plan: ImportPlan): ImportValidation {
  const errors: ImportValidation['errors'] = { j: [], m: [], general: [] };
  if (!plan.j && !plan.m) errors.general.push('Choose a date range for at least one person.');
  for (const person of PERSON_IDS) {
    const range = plan[person];
    if (range) errors[person] = validateRange(range).map((e) => `${PEOPLE[person].name}: ${e}`);
  }
  const valid = errors.general.length === 0 && errors.j.length === 0 && errors.m.length === 0;
  return { valid, errors };
}

function assertValidImportPlan(plan: ImportPlan): void {
  const { valid, errors } = validateImportPlan(plan);
  if (!valid) {
    throw new RangeError([...errors.general, ...errors.j, ...errors.m].join(' '));
  }
}

// ---------------------------------------------------------------------------
// Summary (live preview for the import sheet)
// ---------------------------------------------------------------------------

function summarizePerson(person: PersonId, range: PersonRange | null, existing: DaysMap): PersonImportSummary {
  if (!range || validateRange(range).length > 0) {
    return { person, range, days: 0, amount: 0, newDays: 0, newAmount: 0 };
  }
  const days = countDaysInclusive(range.start, range.end);
  const newDays = dateRange(range.start, range.end).filter((k) => !isPaid(existing, k, person)).length;
  return {
    person,
    range,
    days,
    amount: days * DAILY_TARGET,
    newDays,
    newAmount: newDays * DAILY_TARGET,
  };
}

/**
 * Totals for a plan. Invalid or missing ranges count as 0 so this is safe to
 * call on every keystroke. `newDays` is measured against `existing`.
 */
export function summarizeImport(plan: ImportPlan, existing: DaysMap = {}): ImportSummary {
  const j = summarizePerson('j', plan.j, existing);
  const m = summarizePerson('m', plan.m, existing);
  return {
    j,
    m,
    totalDays: j.days + m.days,
    totalAmount: j.amount + m.amount,
    totalNewDays: j.newDays + m.newDays,
    totalNewAmount: j.newAmount + m.newAmount,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function setFlag(map: DaysMap, key: DateKey, person: PersonId, value: Paid, ts: number): void {
  const prev = map[key];
  if ((prev?.[person] ?? 0) === value) return;
  const rec: DayRecord = { j: prev?.j ?? 0, m: prev?.m ?? 0, ts };
  rec[person] = value;
  map[key] = rec;
}

export interface BuildImportOptions {
  ts?: number;
  mode?: ImportMode;
}

/**
 * Return a new ledger with each person's range applied independently.
 * - `merge` (default): only marks days paid; never un-pays anything.
 * - `replace`: also clears that person's deposits outside their range.
 * A person with a `null` range is left completely untouched.
 */
export function buildImportDays(
  plan: ImportPlan,
  existing: DaysMap = {},
  { ts = Date.now(), mode = 'merge' }: BuildImportOptions = {},
): DaysMap {
  assertValidImportPlan(plan);
  const next: DaysMap = { ...existing };
  for (const person of PERSON_IDS) {
    const range = plan[person];
    if (!range) continue;
    const inRange = dateRange(range.start, range.end);
    for (const key of inRange) setFlag(next, key, person, 1, ts);
    if (mode === 'replace') {
      const keep = new Set<string>(inRange);
      for (const key of Object.keys(next)) {
        if (isValidDateKey(key) && !keep.has(key)) setFlag(next, key, person, 0, ts);
      }
    }
  }
  return next;
}

/** Firebase multi-path update map for a merge import (single atomic request). */
export function buildImportFlatUpdates<T>(plan: ImportPlan, ts: T): Record<string, Paid | T> {
  assertValidImportPlan(plan);
  const entries: { key: DateKey; person: PersonId }[] = [];
  for (const person of PERSON_IDS) {
    const range = plan[person];
    if (range) for (const key of dateRange(range.start, range.end)) entries.push({ key, person });
  }
  return buildFlatDayUpdates(entries, ts);
}
