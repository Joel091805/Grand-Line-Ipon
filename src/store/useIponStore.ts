/**
 * Grand Line Ipon store — Preact Signals, unidirectional.
 *
 * - Signals hold the ledger (`days`), monthly notes, and "today".
 * - Computed selectors derive totals, voyage %, crew count, Habulin arrears, streak.
 * - Actions apply optimistic updates, persist to localStorage (schema-versioned),
 *   and emit events for the Canvas / Audio engines.
 *
 * Use `useIponStore()` in components, or `createIponStore()` for tests / isolation.
 */
import { batch, computed, signal, type ReadonlySignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import type {
  DateKey,
  DayRecord,
  DaysMap,
  ImportMode,
  ImportPlan,
  ImportSummary,
  IponEvent,
  IponListener,
  IponTotals,
  IsoDate,
  LedgerChange,
  LedgerChangeListener,
  MonthKey,
  NotesMap,
  Paid,
  PersistedIponState,
  PersonId,
  RemoteLedger,
  SettleCount,
  SettlePlan,
} from '../types/ipon';
import { PERSON_IDS } from '../types/ipon';
import {
  COMBINED_YEAR_GOAL,
  DAILY_TARGET,
  YEAR_END,
  YEAR_START,
  addDays,
  assertDateKey,
  dateKeyFromDate,
  isValidDateKey,
  isValidMonthKey,
} from '../utils/calendar2026';
import {
  computeArrears,
  isFullDay,
  isPaid,
  settleOldest as settleOldestDays,
  settleOldestForBoth as settleOldestForBothDays,
} from '../utils/habulinEngine';
import { buildImportDays, createDefaultImportPlan, summarizeImport } from '../utils/excelImporter';

export const STORAGE_KEY = 'grand-line-ipon/state';
export const SCHEMA_VERSION = 1 as const;
export const NOTE_MAX_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Crew milestones — every +₱3,650 (10% of goal) recruits a Straw Hat.
// Luffy & Nami start on deck; Jinbe joins at Laugh Tale (₱36,500).
// ---------------------------------------------------------------------------

export const CREW_STEP = COMBINED_YEAR_GOAL / 10; // ₱3,650

export const CREW_MILESTONES: ReadonlyArray<{ id: string; name: string; threshold: number }> = [
  { id: 'luffy', name: 'Luffy', threshold: 0 },
  { id: 'nami', name: 'Nami', threshold: 0 },
  { id: 'zoro', name: 'Zoro', threshold: CREW_STEP * 1 },
  { id: 'usopp', name: 'Usopp', threshold: CREW_STEP * 2 },
  { id: 'sanji', name: 'Sanji', threshold: CREW_STEP * 3 },
  { id: 'chopper', name: 'Chopper', threshold: CREW_STEP * 4 },
  { id: 'robin', name: 'Robin', threshold: CREW_STEP * 5 },
  { id: 'franky', name: 'Franky', threshold: CREW_STEP * 6 },
  { id: 'brook', name: 'Brook', threshold: CREW_STEP * 7 },
  { id: 'jinbe', name: 'Jinbe', threshold: CREW_STEP * 10 },
];

// ---------------------------------------------------------------------------
// Pure selectors (exported for unit tests and non-reactive callers)
// ---------------------------------------------------------------------------

export function computeTotals(days: DaysMap): IponTotals {
  let joelDays = 0;
  let claireDays = 0;
  let fullDays = 0;
  for (const [key, rec] of Object.entries(days)) {
    if (!rec || !isValidDateKey(key)) continue;
    if (rec.j === 1) joelDays++;
    if (rec.m === 1) claireDays++;
    if (rec.j === 1 && rec.m === 1) fullDays++;
  }
  return {
    joelDays,
    claireDays,
    fullDays,
    joelTotal: joelDays * DAILY_TARGET,
    claireTotal: claireDays * DAILY_TARGET,
    combinedTotal: (joelDays + claireDays) * DAILY_TARGET,
  };
}

/** Percent of the ₱36,500 goal, one decimal place, capped at 100. */
export function computeVoyagePercent(combinedTotal: number): number {
  return Math.min(100, Math.round((combinedTotal / COMBINED_YEAR_GOAL) * 1000) / 10);
}

/** Number of Straw Hats on deck (2–10). */
export function computeUnlockedCrewCount(combinedTotal: number): number {
  return CREW_MILESTONES.filter((c) => combinedTotal >= c.threshold).length;
}

/**
 * Consecutive full (₱100) days ending today — or ending yesterday if today
 * isn't full yet, so the streak doesn't "break" until a day is actually missed.
 */
export function computeCurrentStreak(days: DaysMap, today: IsoDate): number {
  let cursor: DateKey | null;
  if (today < YEAR_START) return 0;
  if (today > YEAR_END) cursor = YEAR_END;
  else if (!isValidDateKey(today)) return 0;
  else cursor = isFullDay(days, today) ? today : addDays(today, -1);

  let streak = 0;
  while (cursor && isFullDay(days, cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

const dateKeysOf = (...maps: DaysMap[]): DateKey[] =>
  [...new Set(maps.flatMap((m) => Object.keys(m)))].filter(isValidDateKey).sort();

const monthKeysOf = (...maps: NotesMap[]): MonthKey[] =>
  [...new Set(maps.flatMap((m) => Object.keys(m)))].filter(isValidMonthKey).sort();

/** Per-person paid flags that differ between two ledgers, plus changed notes. */
export function diffLedger(
  prevDays: DaysMap,
  nextDays: DaysMap,
  prevNotes: NotesMap,
  nextNotes: NotesMap,
): Pick<LedgerChange, 'days' | 'notes'> {
  const days: LedgerChange['days'] = [];
  if (prevDays !== nextDays) {
    for (const key of dateKeysOf(prevDays, nextDays)) {
      for (const person of PERSON_IDS) {
        const value = nextDays[key]?.[person] ?? 0;
        if ((prevDays[key]?.[person] ?? 0) !== value) days.push({ key, person, value });
      }
    }
  }
  const notes: LedgerChange['notes'] = [];
  if (prevNotes !== nextNotes) {
    for (const monthKey of monthKeysOf(prevNotes, nextNotes)) {
      const text = nextNotes[monthKey] ?? '';
      if ((prevNotes[monthKey] ?? '') !== text) notes.push({ monthKey, text });
    }
  }
  return { days, notes };
}

export function daysEqual(a: DaysMap, b: DaysMap): boolean {
  if (a === b) return true;
  return dateKeysOf(a, b).every((k) => (a[k]?.j ?? 0) === (b[k]?.j ?? 0) && (a[k]?.m ?? 0) === (b[k]?.m ?? 0));
}

export function notesEqual(a: NotesMap, b: NotesMap): boolean {
  if (a === b) return true;
  return monthKeysOf(a, b).every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

/** Union of paid flags: never un-pays a deposit present in either ledger. */
export function mergeDays(base: DaysMap, incoming: DaysMap, ts: number): DaysMap {
  const next: DaysMap = { ...base };
  for (const key of dateKeysOf(incoming)) {
    const prev = next[key];
    const rec = incoming[key];
    const j: Paid = prev?.j === 1 || rec?.j === 1 ? 1 : 0;
    const m: Paid = prev?.m === 1 || rec?.m === 1 ? 1 : 0;
    if (j !== (prev?.j ?? 0) || m !== (prev?.m ?? 0)) next[key] = { j, m, ts };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Persistence (localStorage, schema-versioned)
// ---------------------------------------------------------------------------

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const toPaid = (v: unknown): Paid => (v === 1 || v === true ? 1 : 0);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keep only valid 2026 keys with well-formed records. */
export function sanitizeDays(raw: unknown): DaysMap {
  const out: DaysMap = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!isValidDateKey(key) || !isRecord(value)) continue;
    const ts = typeof value.ts === 'number' && Number.isFinite(value.ts) ? value.ts : null;
    out[key] = { j: toPaid(value.j), m: toPaid(value.m), ts };
  }
  return out;
}

export function sanitizeNotes(raw: unknown): NotesMap {
  const out: NotesMap = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (isValidMonthKey(key) && typeof value === 'string') out[key] = value.slice(0, NOTE_MAX_LENGTH);
  }
  return out;
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: PersistedIponState; migrated: boolean }
  | { status: 'unsupported' | 'corrupt' };

/** Parse a stored payload, migrating legacy (unversioned) data to v1. */
export function deserializeState(raw: string | null): LoadResult {
  if (raw == null || raw === '') return { status: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt' };
  }
  if (!isRecord(parsed)) return { status: 'corrupt' };

  const version = parsed.version;
  if (version !== undefined && version !== SCHEMA_VERSION) return { status: 'unsupported' };

  const actor = parsed.lastActor;
  const state: PersistedIponState = {
    version: SCHEMA_VERSION,
    days: sanitizeDays(parsed.days),
    notes: sanitizeNotes(parsed.notes),
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
    lastActor: actor === 'j' || actor === 'm' ? actor : null,
  };
  return { status: 'ok', state, migrated: version === undefined };
}

export function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // e.g. Safari with storage disabled
  }
}

function loadState(storage: StorageLike | null, key: string): PersistedIponState | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  const result = deserializeState(raw);
  if (result.status === 'ok') return result.state;
  if (result.status === 'corrupt' || result.status === 'unsupported') {
    // Never silently destroy data we can't read — stash it before we overwrite.
    try {
      if (raw != null) storage.setItem(`${key}.backup`, raw);
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

export interface CreateIponStoreOptions {
  /** Defaults to `localStorage` when available; pass `null` for in-memory only. */
  storage?: StorageLike | null;
  storageKey?: string;
  /** Returns today's local `YYYY-MM-DD`. Injectable for tests. */
  today?: () => IsoDate;
  now?: () => number;
  /** The person using this device (recorded as `lastActor` for shared actions). */
  actor?: PersonId | null;
}

export function createIponStore(options: CreateIponStoreOptions = {}) {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const readToday = options.today ?? (() => dateKeyFromDate(new Date()));
  const now = options.now ?? (() => Date.now());
  const deviceActor = options.actor ?? null;

  const loaded = loadState(storage, storageKey);

  const days = signal<DaysMap>(loaded?.days ?? {});
  const notes = signal<NotesMap>(loaded?.notes ?? {});
  const updatedAt = signal<number | null>(loaded?.updatedAt ?? null);
  const lastActor = signal<PersonId | null>(loaded?.lastActor ?? null);
  const today = signal<IsoDate>(readToday());

  // --- computed selectors ---------------------------------------------------
  const totals = computed(() => computeTotals(days.value));
  const joelTotal = computed(() => totals.value.joelTotal);
  const claireTotal = computed(() => totals.value.claireTotal);
  const combinedTotal = computed(() => totals.value.combinedTotal);
  const voyagePercent = computed(() => computeVoyagePercent(combinedTotal.value));
  const unlockedCrewCount = computed(() => computeUnlockedCrewCount(combinedTotal.value));
  const habulinArrears = computed(() => computeArrears(days.value, today.value));
  const currentStreak = computed(() => computeCurrentStreak(days.value, today.value));

  // --- events ---------------------------------------------------------------
  const listeners = new Set<IponListener>();
  function emit(event: IponEvent): void {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[iponStore] listener failed', err);
      }
    }
  }
  function subscribe(listener: IponListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // --- persistence ----------------------------------------------------------
  function persist(): void {
    if (!storage) return;
    const state: PersistedIponState = {
      version: SCHEMA_VERSION,
      days: days.peek(),
      notes: notes.peek(),
      updatedAt: updatedAt.peek(),
      lastActor: lastActor.peek(),
    };
    try {
      storage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode — in-memory state remains authoritative */
    }
  }

  const changeListeners = new Set<LedgerChangeListener>();
  function subscribeChanges(listener: LedgerChangeListener): () => void {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  function commit(patch: { days?: DaysMap; notes?: NotesMap }, actor: PersonId | null): void {
    const prevDays = days.peek();
    const prevNotes = notes.peek();
    batch(() => {
      if (patch.days) days.value = patch.days;
      if (patch.notes) notes.value = patch.notes;
      updatedAt.value = now();
      if (actor) lastActor.value = actor;
    });
    persist();
    const diff = diffLedger(prevDays, days.peek(), prevNotes, notes.peek());
    if (diff.days.length === 0 && diff.notes.length === 0) return;
    const change: LedgerChange = { ...diff, actor };
    for (const listener of changeListeners) {
      try {
        listener(change);
      } catch (err) {
        console.error('[iponStore] change listener failed', err);
      }
    }
  }

  /** Merge authoritative remote state without echoing it back as local changes. */
  function applyRemote(remote: RemoteLedger): void {
    const nextDays = remote.days === undefined ? null : sanitizeDays(remote.days);
    const nextNotes = remote.notes === undefined ? null : sanitizeNotes(remote.notes);
    const daysChanged = nextDays !== null && !daysEqual(days.peek(), nextDays);
    const notesChanged = nextNotes !== null && !notesEqual(notes.peek(), nextNotes);
    const updatedChanged = remote.updatedAt !== undefined && remote.updatedAt !== updatedAt.peek();
    const actorChanged = remote.lastActor !== undefined && remote.lastActor !== lastActor.peek();
    if (!daysChanged && !notesChanged && !updatedChanged && !actorChanged) return;
    batch(() => {
      if (daysChanged) days.value = nextDays;
      if (notesChanged) notes.value = nextNotes;
      if (updatedChanged) updatedAt.value = remote.updatedAt ?? null;
      if (actorChanged) lastActor.value = remote.lastActor ?? null;
    });
    persist();
  }

  /** Restore a backup. `merge` only adds deposits and fills empty notes. */
  function restoreState(state: { days: DaysMap; notes: NotesMap }, mode: ImportMode = 'merge'): void {
    const incomingDays = sanitizeDays(state.days);
    const incomingNotes = sanitizeNotes(state.notes);
    if (mode === 'replace') {
      commit({ days: incomingDays, notes: incomingNotes }, deviceActor);
    } else {
      const currentNotes = notes.peek();
      const mergedNotes: NotesMap = { ...currentNotes };
      for (const key of monthKeysOf(incomingNotes)) {
        if (!currentNotes[key] && incomingNotes[key]) mergedNotes[key] = incomingNotes[key];
      }
      commit({ days: mergeDays(days.peek(), incomingDays, now()), notes: mergedNotes }, deviceActor);
    }
    emit({ type: 'restore', mode });
  }

  // --- actions --------------------------------------------------------------
  function setPaid(key: DateKey, person: PersonId, paid: boolean): void {
    assertDateKey(key);
    const current = days.peek();
    const value: Paid = paid ? 1 : 0;
    const prev = current[key];
    if ((prev?.[person] ?? 0) === value) return;
    const rec: DayRecord = { j: prev?.j ?? 0, m: prev?.m ?? 0, ts: now() };
    rec[person] = value;
    commit({ days: { ...current, [key]: rec } }, person);
    emit({ type: 'deposit', key, person, paid, fullDay: rec.j === 1 && rec.m === 1 });
  }

  /** Flip one person's ₱50 on a date. Returns the new paid state. */
  function togglePaid(key: DateKey, person: PersonId): boolean {
    const next = !isPaid(days.peek(), key, person);
    setPaid(key, person, next);
    return next;
  }

  /** Set both halves of a date in a single commit. */
  function setBoth(key: DateKey, paid: boolean): void {
    assertDateKey(key);
    const current = days.peek();
    const value: Paid = paid ? 1 : 0;
    const prev = current[key];
    const changed = (['j', 'm'] as const).filter((p) => (prev?.[p] ?? 0) !== value);
    if (changed.length === 0) return;
    const rec: DayRecord = { j: value, m: value, ts: now() };
    commit({ days: { ...current, [key]: rec } }, deviceActor);
    for (const person of changed) {
      emit({ type: 'deposit', key, person, paid, fullDay: paid });
    }
  }

  /** "Drop Both Today (₱100)". Returns false if today is outside 2026. */
  function dropBothToday(): boolean {
    const t = today.peek();
    if (!isValidDateKey(t)) return false;
    setBoth(t, true);
    return true;
  }

  /** Habulin: pay one person's oldest N unpaid dates (before today). */
  function settleOldest(person: PersonId, count: SettleCount | number): SettlePlan {
    const result = settleOldestDays(days.peek(), person, count, today.peek(), now());
    if (result.plan.dates.length > 0) {
      commit({ days: result.days }, person);
      emit({ type: 'habulin', person, dates: result.plan.dates });
    }
    return result.plan;
  }

  /** Habulin for both, each independently from their own oldest gap. */
  function settleOldestForBoth(count: SettleCount | number): { j: SettlePlan; m: SettlePlan } {
    const result = settleOldestForBothDays(days.peek(), count, today.peek(), now());
    if (result.j.dates.length + result.m.dates.length > 0) {
      commit({ days: result.days }, deviceActor);
      if (result.j.dates.length) emit({ type: 'habulin', person: 'j', dates: result.j.dates });
      if (result.m.dates.length) emit({ type: 'habulin', person: 'm', dates: result.m.dates });
    }
    return { j: result.j, m: result.m };
  }

  /** Apply an Excel import plan. Throws RangeError if the plan is invalid. */
  function applyImport(plan: ImportPlan, mode: ImportMode = 'merge'): ImportSummary {
    const before = days.peek();
    const summary = summarizeImport(plan, before);
    const next = buildImportDays(plan, before, { ts: now(), mode });
    commit({ days: next }, deviceActor);
    emit({ type: 'import', summary, mode });
    return summary;
  }

  /** 1-tap default: Joel Jan 1–Nov 22, Min Claire Jan 1–Aug 1. */
  function applyDefaultImport(mode: ImportMode = 'merge'): ImportSummary {
    return applyImport(createDefaultImportPlan(), mode);
  }

  function setNote(monthKey: MonthKey, text: string): void {
    if (!isValidMonthKey(monthKey)) throw new RangeError(`Not a valid 2026 month key: ${monthKey}`);
    const value = text.slice(0, NOTE_MAX_LENGTH);
    const current = notes.peek();
    if ((current[monthKey] ?? '') === value) return;
    commit({ notes: { ...current, [monthKey]: value } }, deviceActor);
    emit({ type: 'note', monthKey });
  }

  /** Re-read the clock (call on visibility change / midnight rollover). */
  function refreshToday(): void {
    const t = readToday();
    if (t !== today.peek()) today.value = t;
  }

  function reset(): void {
    commit({ days: {}, notes: {} }, null);
    emit({ type: 'reset' });
  }

  return {
    // state
    days: days as ReadonlySignal<DaysMap>,
    notes: notes as ReadonlySignal<NotesMap>,
    today: today as ReadonlySignal<IsoDate>,
    updatedAt: updatedAt as ReadonlySignal<number | null>,
    lastActor: lastActor as ReadonlySignal<PersonId | null>,
    // computed
    totals,
    joelTotal,
    claireTotal,
    combinedTotal,
    voyagePercent,
    unlockedCrewCount,
    habulinArrears,
    currentStreak,
    // actions
    setPaid,
    togglePaid,
    setBoth,
    dropBothToday,
    settleOldest,
    settleOldestForBoth,
    applyImport,
    applyDefaultImport,
    setNote,
    refreshToday,
    reset,
    restoreState,
    applyRemote,
    subscribe,
    subscribeChanges,
  };
}

export type IponStore = ReturnType<typeof createIponStore>;

let singleton: IponStore | null = null;

/** App-wide store instance (lazily created so tests/SSR never touch localStorage). */
export function getIponStore(): IponStore {
  return (singleton ??= createIponStore());
}

/**
 * Component hook. Reading `.value` on any returned signal inside render
 * auto-subscribes the component (via @preact/signals). Also keeps "today"
 * fresh across app resumes and midnight rollovers.
 */
export function useIponStore(): IponStore {
  const store = getIponStore();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.refreshToday();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(store.refreshToday, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [store]);
  return store;
}
