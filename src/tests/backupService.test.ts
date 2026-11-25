import { describe, expect, it } from 'vitest';
import {
  BackupError,
  decodeLedgerHash,
  encodeLedgerHash,
  parseBackup,
  restoreBackup,
  serializeBackup,
} from '../store/backupService';
import { createIponStore, diffLedger } from '../store/useIponStore';
import type { LedgerChange } from '../types/ipon';

const makeStore = () => createIponStore({ storage: null, today: () => '2026-11-23', now: () => 1000 });

describe('backupService', () => {
  it('round-trips a JSON backup', () => {
    const source = makeStore();
    source.applyDefaultImport();
    source.setNote('2026-11', 'Laugh Tale soon');
    const state = parseBackup(serializeBackup(source));

    const target = makeStore();
    restoreBackup(target, state, 'replace');
    expect(target.combinedTotal.value).toBe(26950);
    expect(target.notes.value['2026-11']).toBe('Laugh Tale soon');
  });

  it('rejects non-backup input', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other","days":{}}')).toThrow(BackupError);
    expect(() => parseBackup('{"version":99,"days":{}}')).toThrow(BackupError);
  });

  it('merge restore never removes existing deposits', () => {
    const store = makeStore();
    store.setPaid('2026-03-01', 'j', true);
    store.setNote('2026-03', 'keep me');
    restoreBackup(store, { days: { '2026-03-02': { j: 0, m: 1, ts: 1 } }, notes: { '2026-03': 'other' } });
    expect(store.days.value['2026-03-01']?.j).toBe(1);
    expect(store.days.value['2026-03-02']?.m).toBe(1);
    expect(store.notes.value['2026-03']).toBe('keep me');
  });

  it('encodes the full year into a compact URL hash', () => {
    const store = makeStore();
    store.applyDefaultImport();
    const hash = encodeLedgerHash(store.days.value);
    expect(hash.length).toBeLessThan(140);
    const decoded = decodeLedgerHash(hash, 1)!;
    const target = makeStore();
    restoreBackup(target, { days: decoded, notes: {} });
    expect(target.joelTotal.value).toBe(16300);
    expect(target.claireTotal.value).toBe(10650);
    expect(decodeLedgerHash('#ipon=1.abc')).toBeNull();
    expect(decodeLedgerHash('#other')).toBeNull();
  });
});

describe('store sync hooks', () => {
  it('diffs per-person flags and notes', () => {
    const diff = diffLedger(
      { '2026-01-01': { j: 1, m: 0, ts: 1 } },
      { '2026-01-01': { j: 1, m: 1, ts: 2 }, '2026-01-02': { j: 0, m: 0, ts: 2 } },
      {},
      { '2026-01': 'hi' },
    );
    expect(diff.days).toEqual([{ key: '2026-01-01', person: 'm', value: 1 }]);
    expect(diff.notes).toEqual([{ monthKey: '2026-01', text: 'hi' }]);
  });

  it('emits local changes but never echoes remote merges', () => {
    const store = makeStore();
    const changes: LedgerChange[] = [];
    store.subscribeChanges((c) => changes.push(c));
    store.setPaid('2026-11-23', 'j', true);
    store.applyRemote({ days: { '2026-11-23': { j: 1, m: 1, ts: 5 } }, notes: { '2026-11': 'x' }, lastActor: 'm' });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ actor: 'j', days: [{ key: '2026-11-23', person: 'j', value: 1 }] });
    expect(store.combinedTotal.value).toBe(100);
    expect(store.lastActor.value).toBe('m');
  });
});
