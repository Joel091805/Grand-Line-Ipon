import { describe, expect, it } from 'vitest';
import type { IponEvent } from '../types/ipon';
import {
  STORAGE_KEY,
  createIponStore,
  deserializeState,
  type StorageLike,
} from '../store/useIponStore';

function memoryStorage(seed: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

const makeStore = (storage = memoryStorage()) =>
  createIponStore({ storage, today: () => '2026-11-23', now: () => 1000 });

describe('useIponStore', () => {
  it('applies the default import and derives totals, crew and voyage %', () => {
    const store = makeStore();
    const summary = store.applyDefaultImport();
    expect(summary.totalAmount).toBe(26950);
    expect(store.joelTotal.value).toBe(16300);
    expect(store.claireTotal.value).toBe(10650);
    expect(store.combinedTotal.value).toBe(26950);
    expect(store.voyagePercent.value).toBe(73.8);
    expect(store.unlockedCrewCount.value).toBe(9);
    expect(store.habulinArrears.value.j.count).toBe(0);
    expect(store.habulinArrears.value.m.count).toBe(113);
  });

  it('batch-settles Min Claire incrementally and emits habulin events', () => {
    const store = makeStore();
    const events: IponEvent[] = [];
    store.subscribe((e) => events.push(e));
    store.applyDefaultImport();

    expect(store.settleOldest('m', 7).dates[0]).toBe('2026-08-02');
    expect(store.claireTotal.value).toBe(11000);
    expect(store.habulinArrears.value.m.oldest).toBe('2026-08-09');
    expect(store.joelTotal.value).toBe(16300);
    expect(events.at(-1)).toMatchObject({ type: 'habulin', person: 'm' });

    store.settleOldest('m', 'all');
    expect(store.habulinArrears.value.hasArrears).toBe(false);
    expect(store.combinedTotal.value).toBe(32600);
  });

  it('tracks the ₱100 streak, including dropping both today', () => {
    const store = makeStore();
    store.applyDefaultImport();
    expect(store.currentStreak.value).toBe(0); // Nov 22 is Joel-only
    store.settleOldest('m', 'all');
    expect(store.currentStreak.value).toBe(326);
    expect(store.dropBothToday()).toBe(true);
    expect(store.currentStreak.value).toBe(327);
  });

  it('toggles a single half and emits a deposit event', () => {
    const store = makeStore();
    const events: IponEvent[] = [];
    store.subscribe((e) => events.push(e));
    expect(store.togglePaid('2026-11-23', 'j')).toBe(true);
    expect(store.days.value['2026-11-23']).toEqual({ j: 1, m: 0, ts: 1000 });
    expect(events).toEqual([{ type: 'deposit', key: '2026-11-23', person: 'j', paid: true, fullDay: false }]);
    expect(store.lastActor.value).toBe('j');
    expect(() => store.setPaid('2026-02-29' as never, 'j', true)).toThrow(RangeError);
  });

  it('persists to storage and rehydrates with schema version', () => {
    const storage = memoryStorage();
    const a = makeStore(storage);
    a.applyDefaultImport();
    a.setNote('2026-11', 'Final stretch to Laugh Tale.');
    expect(JSON.parse(storage.data[STORAGE_KEY]).version).toBe(1);

    const b = makeStore(storage);
    expect(b.combinedTotal.value).toBe(26950);
    expect(b.notes.value['2026-11']).toBe('Final stretch to Laugh Tale.');
  });

  it('migrates legacy data and backs up unreadable payloads', () => {
    const legacy = deserializeState(JSON.stringify({ days: { '2026-01-01': { j: true, m: 1 }, bogus: {} } }));
    expect(legacy).toMatchObject({ status: 'ok', migrated: true });
    if (legacy.status === 'ok') expect(legacy.state.days).toEqual({ '2026-01-01': { j: 1, m: 1, ts: null } });

    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
    const store = makeStore(storage);
    expect(store.combinedTotal.value).toBe(0);
    expect(storage.data[`${STORAGE_KEY}.backup`]).toBe('{not json');
    expect(deserializeState(JSON.stringify({ version: 99 })).status).toBe('unsupported');
  });
});
