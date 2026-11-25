import { computed, signal, type ReadonlySignal } from '@preact/signals';
import type { DaysMap, LedgerChange, NotesMap, Paid, PersonId } from '../types/ipon';
import { PEOPLE } from '../types/ipon';
import { DAILY_TARGET, IPON_YEAR, isValidDateKey, isValidMonthKey } from '../utils/calendar2026';
import {
  NOTE_MAX_LENGTH,
  getDefaultStorage,
  getIponStore,
  sanitizeDays,
  sanitizeNotes,
  type IponStore,
  type StorageLike,
} from './useIponStore';

export const PAIRING_KEY = 'grand-line-ipon/pairing';
export const OUTBOX_KEY = 'grand-line-ipon/outbox';

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const PIN_PATTERN = /^\d{4}$/;
const PIN_HASH_PATTERN = /^[0-9a-f]{64}$/;
const DAY_PATH = /^days\/(2026-\d{2}-\d{2})\/(j|m)$/;
const NOTE_PATH = /^notes\/(2026-\d{2})$/;

export type SyncStatus = 'disabled' | 'unpaired' | 'connecting' | 'offline' | 'syncing' | 'synced' | 'error';

export type SyncErrorCode =
  | 'invalid-room'
  | 'invalid-pin'
  | 'room-not-found'
  | 'room-taken'
  | 'wrong-pin'
  | 'permission-denied'
  | 'auth-disabled'
  | 'unauthorized-domain'
  | 'offline'
  | 'unavailable'
  | 'unknown';

const RETRYABLE: ReadonlySet<SyncErrorCode> = new Set(['offline', 'unknown']);

export class SyncError extends Error {
  constructor(
    readonly code: SyncErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'SyncError';
  }

  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }
}

/** Minimal database surface used by the sync service (Firebase in prod, fakes in tests). */
export interface SyncBackend {
  signIn(): Promise<string>;
  read(path: string): Promise<unknown>;
  update(path: string, values: Record<string, unknown>): Promise<void>;
  listen(path: string, onData: (value: unknown) => void, onError: (error: unknown) => void): () => void;
  onConnectionChange(listener: (connected: boolean) => void): () => void;
  serverTimestamp(): unknown;
}

export interface Pairing {
  roomCode: string;
  pinHash: string;
}

type PendingValue = Paid | string;
type Entries = Record<string, PendingValue>;

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export const roomPath = (roomCode: string): string => `rooms/${roomCode}`;

export async function hashPin(roomCode: string, pin: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new SyncError('unavailable', 'Secure context (HTTPS) is required to pair.');
  const bytes = new TextEncoder().encode(`grand-line-ipon:${roomCode}:${pin}`);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function toSyncError(err: unknown): SyncError {
  if (err instanceof SyncError) return err;
  const code = String((err as { code?: unknown })?.code ?? '');
  const message = err instanceof Error ? err.message : String(err);
  const text = `${code} ${message}`;
  if (/auth\/(operation-not-allowed|admin-restricted-operation|configuration-not-found)/i.test(text)) {
    return new SyncError('auth-disabled', message);
  }
  if (/auth\/unauthorized-domain/i.test(text)) {
    return new SyncError('unauthorized-domain', message);
  }
  if (/auth\/(invalid-api-key|api-key-not-valid|app-not-authorized)/i.test(text)) {
    return new SyncError('unavailable', message);
  }
  if (/permission[_ -]?denied/i.test(text)) return new SyncError('permission-denied', message);
  if (/offline|network|unavailable|timed? ?out/i.test(text)) return new SyncError('offline', message);
  return new SyncError('unknown', message);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new SyncError('offline', 'Request timed out.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function isValidEntry(path: string, value: unknown): value is PendingValue {
  const day = DAY_PATH.exec(path);
  if (day) return isValidDateKey(day[1]) && (value === 0 || value === 1);
  const note = NOTE_PATH.exec(path);
  return !!note && isValidMonthKey(note[1]) && typeof value === 'string' && value.length <= NOTE_MAX_LENGTH;
}

/** Overlay unacknowledged local writes on top of a remote snapshot. */
export function overlayDays(raw: unknown, entries: Entries): DaysMap {
  const days = sanitizeDays(raw);
  for (const [path, value] of Object.entries(entries)) {
    const match = DAY_PATH.exec(path);
    if (!match || !isValidDateKey(match[1])) continue;
    const key = match[1];
    const rec = { j: days[key]?.j ?? 0, m: days[key]?.m ?? 0, ts: days[key]?.ts ?? null };
    rec[match[2] as PersonId] = value as Paid;
    days[key] = rec;
  }
  return days;
}

export function overlayNotes(raw: unknown, entries: Entries): NotesMap {
  const notes = sanitizeNotes(raw);
  for (const [path, value] of Object.entries(entries)) {
    const match = NOTE_PATH.exec(path);
    if (match && isValidMonthKey(match[1]) && typeof value === 'string') notes[match[1]] = value;
  }
  return notes;
}

/** Local deposits/notes missing remotely, as pending write entries. */
export function localAdditions(days: DaysMap, notes: NotesMap, remoteDays: unknown, remoteNotes: unknown): Entries {
  const rDays = sanitizeDays(remoteDays);
  const rNotes = sanitizeNotes(remoteNotes);
  const entries: Entries = {};
  for (const [key, rec] of Object.entries(sanitizeDays(days))) {
    for (const person of ['j', 'm'] as const) {
      if (rec?.[person] === 1 && rDays[key as keyof DaysMap]?.[person] !== 1) entries[`days/${key}/${person}`] = 1;
    }
  }
  for (const [key, text] of Object.entries(sanitizeNotes(notes))) {
    if (text && !rNotes[key as keyof NotesMap]) entries[`notes/${key}`] = text;
  }
  return entries;
}

export interface CreateSyncServiceOptions {
  store: IponStore;
  backend: () => Promise<SyncBackend | null>;
  storage?: StorageLike | null;
  timeoutMs?: number;
  retryMs?: number;
}

export function createSyncService(options: CreateSyncServiceOptions) {
  const { store } = options;
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const retryMs = options.retryMs ?? 15_000;

  function readJson(key: string): unknown {
    try {
      const raw = storage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function writeJson(key: string, value: unknown): void {
    try {
      if (value == null) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }

  function loadPairing(): Pairing | null {
    const raw = readJson(PAIRING_KEY) as Partial<Pairing> | null;
    if (!raw || typeof raw.roomCode !== 'string' || typeof raw.pinHash !== 'string') return null;
    if (!ROOM_CODE_PATTERN.test(raw.roomCode) || !PIN_HASH_PATTERN.test(raw.pinHash)) return null;
    return { roomCode: raw.roomCode, pinHash: raw.pinHash };
  }

  function loadEntries(roomCode: string | undefined): Entries {
    const raw = readJson(OUTBOX_KEY) as { roomCode?: unknown; entries?: unknown } | null;
    if (!raw || raw.roomCode !== roomCode || typeof raw.entries !== 'object' || raw.entries === null) return {};
    const entries: Entries = {};
    for (const [path, value] of Object.entries(raw.entries)) {
      if (isValidEntry(path, value)) entries[path] = value;
    }
    return entries;
  }

  const pairing = signal<Pairing | null>(loadPairing());
  let entries: Entries = loadEntries(pairing.peek()?.roomCode);

  const enabled = signal<boolean | null>(null);
  const connected = signal(false);
  const hydrated = signal(false);
  const pendingCount = signal(Object.keys(entries).length);
  const inFlight = signal(0);
  const error = signal<SyncError | null>(null);

  const status = computed<SyncStatus>(() => {
    if (enabled.value === false) return 'disabled';
    if (!pairing.value) return 'unpaired';
    if (error.value) return 'error';
    if (enabled.value === null) return 'connecting';
    if (!connected.value) return 'offline';
    if (!hydrated.value) return 'connecting';
    return pendingCount.value > 0 || inFlight.value > 0 ? 'syncing' : 'synced';
  });

  let backend: SyncBackend | null = null;
  let backendPromise: Promise<SyncBackend | null> | null = null;
  function getBackend(): Promise<SyncBackend | null> {
    backendPromise ??= options.backend().then(
      (b) => b,
      (err) => {
        console.error('[sync] backend failed to load', err);
        return null;
      },
    ).then((b) => {
      backend = b;
      enabled.value = b !== null;
      return b;
    });
    return backendPromise;
  }

  function saveEntries(): void {
    const room = pairing.peek();
    const count = Object.keys(entries).length;
    writeJson(OUTBOX_KEY, room && count > 0 ? { roomCode: room.roomCode, entries } : null);
    pendingCount.value = count;
  }

  let session = 0;
  let ready = false;
  let lastUid: string | null = null;
  let detach: Array<() => void> = [];
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let remoteDays: unknown = undefined;
  let remoteNotes: unknown = undefined;

  function clearRetry(): void {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
  }

  function stopSession(): void {
    session++;
    clearRetry();
    for (const fn of detach.splice(0)) fn();
    ready = false;
    remoteDays = undefined;
    remoteNotes = undefined;
    connected.value = false;
    hydrated.value = false;
    inFlight.value = 0;
  }

  function fail(err: unknown, room: Pairing, id: number): void {
    if (id !== session) return;
    const e = toSyncError(err);
    error.value = e;
    if (e.retryable) {
      clearRetry();
      retryTimer = setTimeout(() => {
        if (id === session && pairing.peek() === room) void startSession(room);
      }, retryMs);
    }
  }

  function send(paths: string[], actor: PersonId | null = null): void {
    const room = pairing.peek();
    if (!backend || !room || !ready || paths.length === 0) return;
    const id = session;
    const ts = backend.serverTimestamp();
    const values: Record<string, unknown> = {};
    const sent: Entries = {};
    for (const path of paths) {
      const value = entries[path];
      if (value === undefined) continue;
      values[path] = value;
      sent[path] = value;
      const day = DAY_PATH.exec(path);
      if (day) values[`days/${day[1]}/ts`] = ts;
    }
    if (Object.keys(sent).length === 0) return;
    values['meta/updatedAt'] = ts;
    if (actor) values['meta/lastActor'] = actor;

    inFlight.value++;
    backend
      .update(roomPath(room.roomCode), values)
      .then(() => {
        if (id !== session) return;
        for (const [path, value] of Object.entries(sent)) {
          if (entries[path] === value) delete entries[path];
        }
        saveEntries();
        if (error.value?.code === 'permission-denied') error.value = null;
      })
      .catch((err) => fail(err, room, id))
      .finally(() => {
        if (id === session) inFlight.value = Math.max(0, inFlight.value - 1);
      });
  }

  function applyRemoteDays(): void {
    if (remoteDays !== undefined) store.applyRemote({ days: overlayDays(remoteDays, entries) });
  }
  function applyRemoteNotes(): void {
    if (remoteNotes !== undefined) store.applyRemote({ notes: overlayNotes(remoteNotes, entries) });
  }

  async function startSession(room: Pairing): Promise<void> {
    stopSession();
    const id = session;
    error.value = null;
    const api = await getBackend();
    if (id !== session || !api) return;
    try {
      detach.push(
        api.onConnectionChange((value) => {
          if (id === session) connected.value = value;
        }),
      );
      const uid = await api.signIn();
      if (id !== session) return;
      lastUid = uid;
      await api.update(roomPath(room.roomCode), { [`members/${uid}`]: room.pinHash });
      if (id !== session) return;

      const base = roomPath(room.roomCode);
      const onError = (err: unknown) => fail(err, room, id);
      detach.push(
        api.listen(
          `${base}/days`,
          (raw) => {
            if (id !== session) return;
            remoteDays = raw;
            applyRemoteDays();
            hydrated.value = true;
          },
          onError,
        ),
        api.listen(
          `${base}/notes`,
          (raw) => {
            if (id !== session) return;
            remoteNotes = raw;
            applyRemoteNotes();
          },
          onError,
        ),
        api.listen(
          `${base}/meta`,
          (raw) => {
            if (id !== session || typeof raw !== 'object' || raw === null) return;
            const meta = raw as { updatedAt?: unknown; lastActor?: unknown };
            store.applyRemote({
              updatedAt: typeof meta.updatedAt === 'number' ? meta.updatedAt : undefined,
              lastActor: meta.lastActor === 'j' || meta.lastActor === 'm' ? meta.lastActor : undefined,
            });
          },
          onError,
        ),
      );
      ready = true;
      send(Object.keys(entries));
    } catch (err) {
      fail(err, room, id);
    }
  }

  function onLocalChange(change: LedgerChange): void {
    if (!pairing.peek()) return;
    const paths: string[] = [];
    for (const { key, person, value } of change.days) {
      const path = `days/${key}/${person}`;
      entries[path] = value;
      paths.push(path);
    }
    for (const { monthKey, text } of change.notes) {
      const path = `notes/${monthKey}`;
      entries[path] = text;
      paths.push(path);
    }
    saveEntries();
    send(paths, change.actor);
  }

  async function pair(mode: 'create' | 'join', rawCode: string, pin: string, mergeLocal = true): Promise<Pairing> {
    const roomCode = normalizeRoomCode(rawCode);
    if (!ROOM_CODE_PATTERN.test(roomCode)) throw new SyncError('invalid-room', 'Room code must be 4–12 letters or digits.');
    if (!PIN_PATTERN.test(pin)) throw new SyncError('invalid-pin', 'PIN must be exactly 4 digits.');
    const api = await getBackend();
    if (!api) throw new SyncError('unavailable', 'Firebase is not configured.');
    const pinHash = await hashPin(roomCode, pin);
    const base = roomPath(roomCode);

    try {
      const uid = await withTimeout(api.signIn(), timeoutMs);
      const exists = (await withTimeout(api.read(`${base}/auth/createdAt`), timeoutMs)) != null;
      if (mode === 'join' && !exists) throw new SyncError('room-not-found', `Room ${roomCode} does not exist.`);
      if (mode === 'create' && exists) throw new SyncError('room-taken', `Room ${roomCode} already exists.`);

      const ts = api.serverTimestamp();
      const values: Record<string, unknown> = { [`members/${uid}`]: pinHash };
      if (mode === 'create') {
        Object.assign(values, {
          'auth/pinHash': pinHash,
          'auth/createdAt': ts,
          'meta/year': IPON_YEAR,
          'meta/dailyTarget': DAILY_TARGET,
          'meta/users': {
            j: { name: PEOPLE.j.name, color: PEOPLE.j.color },
            m: { name: PEOPLE.m.name, color: PEOPLE.m.color },
          },
          'meta/updatedAt': ts,
        });
      }
      await withTimeout(api.update(base, values), timeoutMs).catch((err) => {
        const e = toSyncError(err);
        if (e.code !== 'permission-denied') throw e;
        throw mode === 'join'
          ? new SyncError('wrong-pin', 'Incorrect PIN for this room.')
          : new SyncError('room-taken', `Room ${roomCode} already exists.`);
      });
      lastUid = uid;

      const [rDays, rNotes] = await withTimeout(
        Promise.all([api.read(`${base}/days`), api.read(`${base}/notes`)]),
        timeoutMs,
      );
      const room: Pairing = { roomCode, pinHash };
      entries = mergeLocal ? localAdditions(store.days.peek(), store.notes.peek(), rDays, rNotes) : {};
      pairing.value = room;
      writeJson(PAIRING_KEY, room);
      saveEntries();
      void startSession(room);
      return room;
    } catch (err) {
      throw toSyncError(err);
    }
  }

  function unpair(): void {
    const room = pairing.peek();
    if (room && backend && lastUid) {
      backend.update(roomPath(room.roomCode), { [`members/${lastUid}`]: null }).catch(() => undefined);
    }
    stopSession();
    entries = {};
    pairing.value = null;
    error.value = null;
    writeJson(PAIRING_KEY, null);
    saveEntries();
  }

  function retry(): void {
    const room = pairing.peek();
    if (room) void startSession(room);
  }

  const onOnline = () => {
    if (error.peek()?.retryable) retry();
  };

  let started = false;
  let unsubscribeStore: (() => void) | null = null;

  function stop(): void {
    if (!started) return;
    started = false;
    unsubscribeStore?.();
    unsubscribeStore = null;
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    stopSession();
  }

  function start(): () => void {
    if (started) return stop;
    started = true;
    unsubscribeStore = store.subscribeChanges(onLocalChange);
    if (typeof window !== 'undefined') window.addEventListener('online', onOnline);
    const room = pairing.peek();
    if (room) void startSession(room);
    else void getBackend();
    return stop;
  }

  return {
    status,
    pairing: pairing as ReadonlySignal<Pairing | null>,
    error: error as ReadonlySignal<SyncError | null>,
    connected: connected as ReadonlySignal<boolean>,
    pendingCount: pendingCount as ReadonlySignal<number>,
    enabled: enabled as ReadonlySignal<boolean | null>,
    createRoom: (roomCode: string, pin: string, mergeLocal?: boolean) => pair('create', roomCode, pin, mergeLocal),
    joinRoom: (roomCode: string, pin: string, mergeLocal?: boolean) => pair('join', roomCode, pin, mergeLocal),
    unpair,
    retry,
    start,
    stop,
  };
}

export type SyncService = ReturnType<typeof createSyncService>;

let singleton: SyncService | null = null;

export function getSyncService(): SyncService {
  return (singleton ??= createSyncService({
    store: getIponStore(),
    backend: () => import('../config/firebase').then((m) => m.createFirebaseBackend()),
  }));
}

export const useSyncService = getSyncService;
