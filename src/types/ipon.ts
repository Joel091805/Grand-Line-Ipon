/**
 * Grand Line Ipon — core domain types.
 *
 * The whole app revolves around one 2026 ledger: for every calendar day,
 * Joel (`j`) and Min Claire (`m`) each either dropped their ₱50 (1) or not (0).
 * The shape mirrors the Firebase RTDB tree (`rooms/{room}/days/{dateKey}`) so the
 * same objects can be persisted locally and synced remotely without mapping.
 */

/** `j` = Joel, `m` = Min Claire. Stored as separate leaf keys for conflict-free writes. */
export type PersonId = 'j' | 'm';

export const PERSON_IDS: readonly PersonId[] = ['j', 'm'];

export interface PersonMeta {
  id: PersonId;
  name: string;
  color: string;
}

export const PEOPLE: Readonly<Record<PersonId, PersonMeta>> = {
  j: { id: 'j', name: 'Joel', color: '#D63826' },
  m: { id: 'm', name: 'Min Claire', color: '#1A7F8E' },
};

/** A deposit flag: 1 = ₱50 dropped, 0 = not yet. */
export type Paid = 0 | 1;

/** ISO date key inside 2026, e.g. `2026-11-23`. Validate with `isValidDateKey`. */
export type DateKey = `2026-${string}-${string}`;

/** ISO month key inside 2026, e.g. `2026-11`. Used for Robin's monthly notes. */
export type MonthKey = `2026-${string}`;

/** Any `YYYY-MM-DD` string — used for "today", which may fall outside 2026. */
export type IsoDate = string;

export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** 0 = Sunday … 6 = Saturday (matches `Date#getUTCDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayRecord {
  j: Paid;
  m: Paid;
  /** Epoch ms of the last change to this day, or null if never touched. */
  ts: number | null;
}

/** Sparse ledger: a missing key means neither person has paid that day. */
export type DaysMap = Partial<Record<DateKey, DayRecord>>;

export type NotesMap = Partial<Record<MonthKey, string>>;

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarDay {
  key: DateKey;
  monthKey: MonthKey;
  year: 2026;
  month: MonthNumber;
  day: number;
  weekday: Weekday;
  weekdayName: string;
  /** 1-based (Jan 1 = 1, Dec 31 = 365). */
  dayOfYear: number;
  isWeekend: boolean;
}

/** One Grand Line island per month of 2026. */
export interface IslandMeta {
  /** 0-based route index (0 = January). */
  index: number;
  month: MonthNumber;
  monthKey: MonthKey;
  monthName: string;
  /** Uppercase 3-letter label, e.g. `NOV`. */
  monthAbbr: string;
  name: string;
  tagline: string;
  daysInMonth: number;
  startKey: DateKey;
  endKey: DateKey;
  startDayOfYear: number;
  endDayOfYear: number;
  /** Weekday of the 1st of the month. */
  firstWeekday: Weekday;
  /** ₱ target for one person this month (days × ₱50). */
  personTarget: number;
  /** ₱ target for both combined this month. */
  combinedTarget: number;
}

// ---------------------------------------------------------------------------
// Habulin (catch-up) engine
// ---------------------------------------------------------------------------

/** Batch-settle presets: oldest 1, oldest 7, or every unpaid day. */
export type SettleCount = 1 | 7 | 'all';

export interface PersonArrears {
  person: PersonId;
  /** Unpaid dates strictly before today, oldest first. */
  dates: DateKey[];
  count: number;
  amount: number;
  oldest: DateKey | null;
  newest: DateKey | null;
}

export interface HabulinArrears {
  asOf: IsoDate;
  j: PersonArrears;
  m: PersonArrears;
  combinedCount: number;
  combinedAmount: number;
  hasArrears: boolean;
}

export interface SettlePlan {
  person: PersonId;
  requested: SettleCount | number;
  /** Dates that will be (or were) marked paid, oldest first. */
  dates: DateKey[];
  amount: number;
  remainingCount: number;
  remainingAmount: number;
  /** Oldest still-unpaid date after this settle, if any. */
  nextOldest: DateKey | null;
}

// ---------------------------------------------------------------------------
// Excel importer
// ---------------------------------------------------------------------------

/** Inclusive date range for one person. */
export interface PersonRange {
  start: DateKey;
  end: DateKey;
}

/** Independent per-person ranges; `null` skips that person entirely. */
export interface ImportPlan {
  j: PersonRange | null;
  m: PersonRange | null;
}

/** `merge` only adds deposits; `replace` also clears that person's days outside the range. */
export type ImportMode = 'merge' | 'replace';

export interface PersonImportSummary {
  person: PersonId;
  range: PersonRange | null;
  days: number;
  amount: number;
  /** Days in range not already paid in the existing ledger. */
  newDays: number;
  newAmount: number;
}

export interface ImportSummary {
  j: PersonImportSummary;
  m: PersonImportSummary;
  totalDays: number;
  totalAmount: number;
  totalNewDays: number;
  totalNewAmount: number;
}

export interface ImportValidation {
  valid: boolean;
  errors: Record<PersonId, string[]> & { general: string[] };
}

// ---------------------------------------------------------------------------
// Store & persistence
// ---------------------------------------------------------------------------

export interface PersistedIponState {
  version: 1;
  days: DaysMap;
  notes: NotesMap;
  updatedAt: number | null;
  lastActor: PersonId | null;
}

export interface IponTotals {
  joelDays: number;
  claireDays: number;
  fullDays: number;
  joelTotal: number;
  claireTotal: number;
  combinedTotal: number;
}

/** Events emitted to the imperative Canvas & Audio engines. */
export type IponEvent =
  | { type: 'deposit'; key: DateKey; person: PersonId; paid: boolean; fullDay: boolean }
  | { type: 'habulin'; person: PersonId; dates: DateKey[] }
  | { type: 'import'; summary: ImportSummary; mode: ImportMode }
  | { type: 'note'; monthKey: MonthKey }
  | { type: 'restore'; mode: ImportMode }
  | { type: 'reset' };

export type IponListener = (event: IponEvent) => void;

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export interface DayChange {
  key: DateKey;
  person: PersonId;
  value: Paid;
}

export interface NoteChange {
  monthKey: MonthKey;
  text: string;
}

/** Local edits to push upstream, emitted once per store commit. */
export interface LedgerChange {
  days: DayChange[];
  notes: NoteChange[];
  actor: PersonId | null;
}

export type LedgerChangeListener = (change: LedgerChange) => void;

/** Remote state to merge into the store; omitted fields are left untouched. */
export interface RemoteLedger {
  days?: unknown;
  notes?: unknown;
  updatedAt?: number | null;
  lastActor?: PersonId | null;
}
